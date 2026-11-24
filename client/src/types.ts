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
