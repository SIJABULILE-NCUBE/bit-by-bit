import type { LaybyRecord, PaymentRecord } from '../repositories/laybyRepo.js'
import { balance, isOverdue, nextDue, paidAmount, progressPercent } from './laybyMath.js'
import { riskScore } from './riskScore.js'

// what the client gets for each lay-by in a list: the basics plus the worked-out numbers
export function summariseLayby(layby: LaybyRecord, today: string) {
  return {
    id: layby.id,
    itemName: layby.itemName,
    itemPhotoPath: layby.itemPhotoPath,
    price: layby.price,
    deposit: layby.deposit,
    termMonths: layby.termMonths,
    status: layby.status,
    cancelReason: layby.cancelReason,
    createdAt: layby.createdAt,
    shop: layby.shop,
    customer: layby.customer,
    // these all use confirmed payments only
    paid: paidAmount(layby.payments),
    balance: balance(layby.price, layby.payments),
    progress: progressPercent(layby.price, layby.payments),
    // only active lay-bys have something due
    nextDue: layby.status === 'active' ? nextDue(layby.deposit, layby.instalments, layby.payments) : null,
    overdue: isOverdue(layby, layby.instalments, layby.payments, today),
  }
}

export type LaybySummary = ReturnType<typeof summariseLayby>

// owners also get the risk score; customers never see their own score
export function ownerSummary(layby: LaybyRecord, today: string) {
  return { ...summariseLayby(layby, today), risk: riskScore(layby, today) }
}

// picks the right view for whoever is asking
export function summaryFor(role: 'customer' | 'owner', layby: LaybyRecord, today: string) {
  return role === 'owner' ? ownerSummary(layby, today) : summariseLayby(layby, today)
}

// one payment as the client sees it: I never send the storage path or who created it,
// just whether there's a proof file to look at
export function paymentJson(p: PaymentRecord) {
  return {
    id: p.id,
    amount: p.amount,
    method: p.method,
    status: p.status,
    createdAt: p.createdAt,
    reviewedAt: p.reviewedAt,
    rejectReason: p.rejectReason,
    hasProof: p.proofPath !== null,
  }
}
