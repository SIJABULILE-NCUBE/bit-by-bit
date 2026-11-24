import type { LaybyRecord } from '../repositories/laybyRepo.js'
import { balance, isOverdue, nextDue, paidAmount, progressPercent } from './laybyMath.js'

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
