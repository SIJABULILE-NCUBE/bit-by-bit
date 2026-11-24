import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { laybyRepo } from '../repositories/laybyRepo.js'
import { paymentRepo } from '../repositories/paymentRepo.js'
import { findLaybyFor } from '../lib/access.js'
import { balance, buildSchedule, isCompleted, scheduleWithStatus, todayInSA, validateLaybyTerms } from '../services/laybyMath.js'
import { checkPaymentAmount, isProofPathForLayby, pendingAmount } from '../services/paymentRules.js'
import { paymentJson, summariseLayby, summaryFor } from '../services/laybySummary.js'
import { completeIfPaidUp } from './payments.js'
import { checkStatusChange } from '../services/dashboard.js'

export const laybysRouter = Router()

// every lay-by route needs a logged-in user
laybysRouter.use(requireAuth)

type CreateLaybyInput = {
  customerEmail: string
  itemName: string
  price: number
  deposit: number
  termMonths: number
}

// checks the shape of what the client sent, before I look at the lay-by rules
function readCreateBody(body: unknown): { input?: CreateLaybyInput; errors: string[] } {
  const b = (body ?? {}) as Record<string, unknown>
  const errors: string[] = []

  const customerEmail = typeof b.customerEmail === 'string' ? b.customerEmail.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) errors.push("Enter the customer's email address")

  const itemName = typeof b.itemName === 'string' ? b.itemName.trim() : ''
  if (!itemName) errors.push('Enter the item name')
  else if (itemName.length > 120) errors.push('Keep the item name under 120 characters')

  // numbers must really be numbers (not "lots")
  const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
  if (!isNumber(b.price)) errors.push('The price must be a number')
  if (!isNumber(b.deposit)) errors.push('The deposit must be a number')
  if (!isNumber(b.termMonths)) errors.push('The term must be a number of months')

  if (errors.length > 0) return { errors }
  return {
    input: {
      customerEmail,
      itemName,
      price: b.price as number,
      deposit: b.deposit as number,
      termMonths: b.termMonths as number,
    },
    errors,
  }
}

// GET /api/laybys
// customers get their own lay-bys, owners get their shop's lay-bys (never anyone else's)
laybysRouter.get('/', async (req, res) => {
  const user = req.user!
  let laybys

  if (user.role === 'customer') {
    laybys = await laybyRepo.listLaybys({ customerId: user.id })
  } else {
    const shop = await laybyRepo.findShopByOwner(user.id)
    laybys = shop ? await laybyRepo.listLaybys({ shopId: shop.id }) : []
  }

  const today = todayInSA()
  res.json(laybys.map((layby) => summaryFor(user.role, layby, today)))
})

// POST /api/laybys (shop owners only)
// creates the lay-by, its monthly instalments and the deposit as a confirmed payment
laybysRouter.post('/', requireRole('owner'), async (req, res) => {
  const { input, errors } = readCreateBody(req.body)
  if (!input) {
    res.status(400).json({ error: errors.join('. '), details: errors })
    return
  }

  // my lay-by rules: deposit at least 10%, term 1 to 6 months, and so on
  const ruleErrors = validateLaybyTerms(input)
  if (ruleErrors.length > 0) {
    res.status(400).json({ error: ruleErrors.join('. '), details: ruleErrors })
    return
  }

  const shop = await laybyRepo.findShopByOwner(req.user!.id)
  if (!shop) {
    res.status(400).json({ error: "Your account doesn't have a shop yet" })
    return
  }

  const customer = await laybyRepo.findProfileByEmail(input.customerEmail)
  if (!customer) {
    res.status(404).json({
      error: `No customer has signed up with ${input.customerEmail} yet. Ask them to sign up on Bit by Bit first, then try again.`,
    })
    return
  }
  if (customer.role !== 'customer') {
    res.status(400).json({ error: 'That email belongs to a shop owner account, not a customer' })
    return
  }

  // the first instalment is due a month from today
  const today = todayInSA()
  const instalments = buildSchedule(input.price, input.deposit, input.termMonths, today)

  // if the deposit covers the whole price, it's already paid off
  const depositOnly = [{ amount: input.deposit, status: 'confirmed' as const }]
  const status = isCompleted(input.price, depositOnly) ? 'completed' : 'active'

  const id = await laybyRepo.createLayby({
    shopId: shop.id,
    customerId: customer.id,
    itemName: input.itemName,
    price: input.price,
    deposit: input.deposit,
    termMonths: input.termMonths,
    status,
    instalments,
    createdBy: req.user!.id,
  })

  const created = await laybyRepo.getLayby(id)
  res.status(201).json(summariseLayby(created!, today))
})

// GET /api/laybys/:id
// one lay-by with its schedule and payment history, for its customer or its shop's owner only
// anyone else gets a 404, so they can't even tell whether the lay-by exists
laybysRouter.get('/:id', async (req, res) => {
  const layby = await findLaybyFor(req.user!, req.params.id)
  if (!layby) {
    res.status(404).json({ error: 'Lay-by not found' })
    return
  }

  const today = todayInSA()
  res.json({
    ...summaryFor(req.user!.role, layby, today),
    schedule: scheduleWithStatus(layby.deposit, layby.instalments, layby.payments, today, layby.status === 'active'),
    // newest first
    payments: [...layby.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(paymentJson),
  })
})

// POST /api/laybys/:id/payments
// customer: { amount, proofPath } after uploading the slip to storage → a PENDING EFT payment
// owner:    { amount } for cash at the counter → CONFIRMED straight away
laybysRouter.post('/:id/payments', async (req, res) => {
  const user = req.user!
  const layby = await findLaybyFor(user, req.params.id)
  if (!layby) {
    res.status(404).json({ error: 'Lay-by not found' })
    return
  }
  if (layby.status !== 'active') {
    res.status(400).json({ error: `This lay-by is ${layby.status}, so it can't take more payments` })
    return
  }

  const body = (req.body ?? {}) as { amount?: unknown; proofPath?: unknown }
  const amount = body.amount as number
  const owed = balance(layby.price, layby.payments)
  const isCustomer = user.role === 'customer'

  // a customer's slips that are still waiting count as "already promised",
  // so two slips can't add up to more than what's owed
  const problem = checkPaymentAmount(amount, isCustomer ? owed - pendingAmount(layby.payments) : owed)
  if (problem) {
    res.status(400).json({ error: problem })
    return
  }

  let proofPath: string | null = null
  if (isCustomer) {
    proofPath = typeof body.proofPath === 'string' ? body.proofPath : ''
    if (!isProofPathForLayby(proofPath, layby.id) || !(await paymentRepo.proofExists(proofPath))) {
      res.status(400).json({ error: 'Please upload your proof of payment (a photo or PDF) first' })
      return
    }
  }

  const id = await paymentRepo.addPayment({
    laybyId: layby.id,
    amount,
    method: isCustomer ? 'eft' : 'cash',
    status: isCustomer ? 'pending' : 'confirmed',
    proofPath,
    createdBy: user.id,
  })

  const fresh = await completeIfPaidUp(layby.id)
  const payment = fresh.payments.find((p) => p.id === id)!
  res.status(201).json({ payment: paymentJson(payment), layby: summariseLayby(fresh, todayInSA()) })
})

// PATCH /api/laybys/:id  { action: 'collect' }  or  { action: 'cancel', reason: '...' }
// shop owners only: hand over a paid-up item, or cancel a lay-by
laybysRouter.patch('/:id', requireRole('owner'), async (req, res) => {
  const body = (req.body ?? {}) as { action?: unknown; reason?: unknown }
  if (body.action !== 'collect' && body.action !== 'cancel') {
    res.status(400).json({ error: 'Choose collect or cancel' })
    return
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (reason.length > 300) {
    res.status(400).json({ error: 'Keep the reason under 300 characters' })
    return
  }

  const layby = await findLaybyFor(req.user!, String(req.params.id))
  if (!layby) {
    res.status(404).json({ error: 'Lay-by not found' })
    return
  }

  const problem = checkStatusChange(layby.status, body.action, reason)
  if (problem) {
    res.status(400).json({ error: problem })
    return
  }

  if (body.action === 'collect') await laybyRepo.setLaybyStatus(layby.id, 'collected')
  else await laybyRepo.setLaybyStatus(layby.id, 'cancelled', reason)

  const fresh = await laybyRepo.getLayby(layby.id)
  res.json(summariseLayby(fresh!, todayInSA()))
})
