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
}

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
}

// what GET /api/laybys/:id sends back: the summary plus the schedule and payments
export type LaybyDetail = LaybySummary & {
  schedule: ScheduledInstalment[]
  payments: PaymentItem[]
}
