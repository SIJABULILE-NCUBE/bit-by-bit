// the owner dashboard numbers and the collect / cancel rules, as plain functions
// (no database), so they're easy to test. See tests/dashboard.test.ts
import { balance, fromCents, isOverdue, toCents, type Instalment, type LaybyStatus, type PaymentLike } from './laybyMath.js'

// the bits of a lay-by the dashboard needs
export type DashboardLayby = {
  price: number
  deposit: number
  status: LaybyStatus
  instalments: Instalment[]
  payments: PaymentLike[]
}

export type DashboardTotals = {
  active: number
  overdue: number
  readyToCollect: number
  paymentsToReview: number
  totalOutstanding: number
}

export function dashboardTotals(laybys: DashboardLayby[], today: string): DashboardTotals {
  const active = laybys.filter((l) => l.status === 'active')

  // I add the balances in cents so R0.10 + R0.20 really is R0.30
  const outstandingCents = active.reduce((sum, l) => sum + toCents(balance(l.price, l.payments)), 0)

  return {
    active: active.length,
    overdue: active.filter((l) => isOverdue(l, l.instalments, l.payments, today)).length,
    // fully paid, so the customer can come and fetch it
    readyToCollect: laybys.filter((l) => l.status === 'completed').length,
    paymentsToReview: laybys.reduce((sum, l) => sum + l.payments.filter((p) => p.status === 'pending').length, 0),
    totalOutstanding: fromCents(outstandingCents),
  }
}

// what the owner can do to a lay-by's status
export type StatusAction = 'collect' | 'cancel'

// my status rules: active → completed (when fully paid) → collected, or cancelled
// gives a friendly message if the change isn't allowed, or null if it's fine
export function checkStatusChange(current: LaybyStatus, action: StatusAction, reason: string): string | null {
  if (current === 'collected') return 'This lay-by was already collected'
  if (current === 'cancelled') return 'This lay-by was already cancelled'

  if (action === 'collect') {
    return current === 'completed' ? null : 'Only fully paid lay-bys can be collected'
  }

  return reason.trim() ? null : 'Give a reason for cancelling'
}
