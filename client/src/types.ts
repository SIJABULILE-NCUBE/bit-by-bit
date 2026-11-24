import type { LaybyStatus } from './lib/laybyMath'

// the two kinds of users in Bit by Bit
export type Role = 'customer' | 'owner'

// what GET /api/me sends back about the logged-in user
export type Profile = {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  role: Role
}

// one lay-by as GET /api/laybys sends it (the numbers are already worked out by the server)
export type LaybySummary = {
  id: string
  itemName: string
  itemPhotoPath: string | null
  price: number
  deposit: number
  termMonths: number
  status: LaybyStatus
  cancelReason: string | null
  createdAt: string
  shop: { id: string; name: string; area: string | null }
  customer: { id: string; fullName: string | null; email: string; phone: string | null }
  paid: number
  balance: number
  progress: number
  nextDue: { dueDate: string; amount: number } | null
  overdue: boolean
  // everything that's late right now, and the due date of the oldest late instalment
  overdueDue: { amount: number; since: string } | null
  // owners only: Low / Medium / High and why (null when the lay-by isn't active)
  risk?: Risk | null
}

export type Risk = { level: 'low' | 'medium' | 'high'; reasons: string[] }

// what the New lay-by form sends to POST /api/laybys
export type NewLaybyInput = {
  customerEmail: string
  itemName: string
  price: number
  deposit: number
  termMonths: number
}

// one row of the schedule on the detail page (the server works out the status)
export type ScheduledInstalment = {
  seq: number
  dueDate: string
  amount: number
  paid: number
  status: 'paid' | 'next' | 'upcoming' | 'overdue' | 'unpaid'
}

// one payment in the history list
export type PaymentItem = {
  id: string
  amount: number
  method: 'deposit' | 'cash' | 'eft'
  status: 'pending' | 'confirmed' | 'rejected'
  createdAt: string
  reviewedAt: string | null
  rejectReason: string | null
  // true when the customer uploaded a slip I can look at
  hasProof: boolean
}

// what GET /api/laybys/:id sends back: the summary plus the schedule and payments
export type LaybyDetail = LaybySummary & {
  schedule: ScheduledInstalment[]
  payments: PaymentItem[]
}

// what the server sends back after a payment is added, confirmed or rejected
export type PaymentResult = { payment: PaymentItem; layby: LaybySummary }

// one slip in the owner's "Payments to review" list
export type PendingPayment = PaymentItem & {
  layby: { id: string; itemName: string; price: number; balance: number; status: LaybyStatus }
  customer: { id: string; fullName: string | null; email: string; phone: string | null }
}

// what GET /api/dashboard sends back (all worked out from the real database)
export type Dashboard = {
  shop: { id: string; name: string; area: string | null } | null
  totals: {
    active: number
    overdue: number
    readyToCollect: number
    paymentsToReview: number
    totalOutstanding: number
    highRisk: number
  }
  overdueLaybys: LaybySummary[]
  readyLaybys: LaybySummary[]
}
