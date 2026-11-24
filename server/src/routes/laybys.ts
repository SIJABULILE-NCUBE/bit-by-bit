import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { laybyRepo } from '../repositories/laybyRepo.js'
import { buildSchedule, isCompleted, scheduleWithStatus, todayInSA, validateLaybyTerms } from '../services/laybyMath.js'
import { summariseLayby } from '../services/laybySummary.js'

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
  res.json(laybys.map((layby) => summariseLayby(layby, today)))
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
  const user = req.user!
  const layby = await laybyRepo.getLayby(req.params.id)

  let allowed = false
  if (layby && user.role === 'customer') {
    allowed = layby.customerId === user.id
  } else if (layby && user.role === 'owner') {
    const shop = await laybyRepo.findShopByOwner(user.id)
    allowed = shop !== null && layby.shopId === shop.id
  }

  if (!layby || !allowed) {
    res.status(404).json({ error: 'Lay-by not found' })
    return
  }

  const today = todayInSA()
  res.json({
    ...summariseLayby(layby, today),
    schedule: scheduleWithStatus(layby.deposit, layby.instalments, layby.payments, today, layby.status === 'active'),
    // newest first; I leave out who created each payment
    payments: [...layby.payments]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        createdAt: p.createdAt,
        reviewedAt: p.reviewedAt,
        rejectReason: p.rejectReason,
      })),
  })
})
