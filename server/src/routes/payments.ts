import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { findLaybyFor } from '../lib/access.js'
import { laybyRepo, type LaybyRecord } from '../repositories/laybyRepo.js'
import { paymentRepo } from '../repositories/paymentRepo.js'
import { balance, isCompleted, todayInSA } from '../services/laybyMath.js'
import { checkPaymentAmount } from '../services/paymentRules.js'
import { paymentJson, summariseLayby } from '../services/laybySummary.js'
import type { AuthUser } from '../types.js'

export const paymentsRouter = Router()

paymentsRouter.use(requireAuth)

// finds a payment and its lay-by, but only if this user may see that lay-by
async function findPaymentFor(user: AuthUser, paymentId: string) {
  const ref = await paymentRepo.findPayment(paymentId)
  if (!ref) return null
  const layby = await findLaybyFor(user, ref.laybyId)
  const payment = layby?.payments.find((p) => p.id === ref.id)
  return layby && payment ? { layby, payment } : null
}

// once the confirmed payments cover the price, the lay-by is done
// (I return the fresh lay-by so the client can show the new balance)
export async function completeIfPaidUp(laybyId: string): Promise<LaybyRecord> {
  const layby = (await laybyRepo.getLayby(laybyId))!
  if (layby.status === 'active' && isCompleted(layby.price, layby.payments)) {
    await laybyRepo.setLaybyStatus(layby.id, 'completed')
    layby.status = 'completed'
  }
  return layby
}

// GET /api/payments: the owner's "Payments to review" list
// every pending payment at their shop, oldest first (so nobody waits too long)
paymentsRouter.get('/', requireRole('owner'), async (req, res) => {
  const shop = await laybyRepo.findShopByOwner(req.user!.id)
  if (!shop) {
    res.json([])
    return
  }

  const today = todayInSA()
  const laybys = await laybyRepo.listLaybys({ shopId: shop.id })
  const pending = laybys.flatMap((layby) =>
    layby.payments
      .filter((p) => p.status === 'pending')
      .map((p) => {
        const summary = summariseLayby(layby, today)
        return {
          ...paymentJson(p),
          layby: { id: layby.id, itemName: layby.itemName, price: layby.price, balance: summary.balance, status: layby.status },
          customer: layby.customer,
        }
      }),
  )
  pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  res.json(pending)
})

// GET /api/payments/:id/proof: a short-lived link to the proof file
// for the lay-by's customer and the shop's owner only
paymentsRouter.get('/:id/proof', async (req, res) => {
  const found = await findPaymentFor(req.user!, String(req.params.id))
  if (!found || !found.payment.proofPath) {
    res.status(404).json({ error: 'No proof of payment found' })
    return
  }
  const url = await paymentRepo.signedProofUrl(found.payment.proofPath)
  res.json({ url })
})

// PATCH /api/payments/:id  { action: 'confirm' }  or  { action: 'reject', reason: '...' }
paymentsRouter.patch('/:id', requireRole('owner'), async (req, res) => {
  const body = (req.body ?? {}) as { action?: unknown; reason?: unknown }
  if (body.action !== 'confirm' && body.action !== 'reject') {
    res.status(400).json({ error: 'Choose confirm or reject' })
    return
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (body.action === 'reject' && !reason) {
    res.status(400).json({ error: 'Say why you are rejecting it, so the customer knows what to fix' })
    return
  }
  if (reason.length > 300) {
    res.status(400).json({ error: 'Keep the reason under 300 characters' })
    return
  }

  const found = await findPaymentFor(req.user!, String(req.params.id))
  if (!found) {
    res.status(404).json({ error: 'Payment not found' })
    return
  }
  const { layby, payment } = found
  if (payment.status !== 'pending') {
    res.status(409).json({ error: `This payment was already ${payment.status}` })
    return
  }

  if (body.action === 'confirm') {
    if (layby.status !== 'active') {
      res.status(400).json({ error: `This lay-by is ${layby.status}, so it can't take more payments` })
      return
    }
    // the balance might have dropped since the slip came in (e.g. cash at the counter)
    const problem = checkPaymentAmount(payment.amount, balance(layby.price, layby.payments))
    if (problem) {
      res.status(400).json({ error: `${problem}. Reject this slip instead.` })
      return
    }
  }

  const updated = await paymentRepo.reviewPayment(payment.id, {
    status: body.action === 'confirm' ? 'confirmed' : 'rejected',
    rejectReason: body.action === 'reject' ? reason : null,
  })
  if (!updated) {
    res.status(409).json({ error: 'Someone already reviewed this payment' })
    return
  }

  const fresh = await completeIfPaidUp(layby.id)
  const freshPayment = fresh.payments.find((p) => p.id === payment.id)!
  res.json({ payment: paymentJson(freshPayment), layby: summariseLayby(fresh, todayInSA()) })
})
