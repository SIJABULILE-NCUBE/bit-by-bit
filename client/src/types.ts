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
