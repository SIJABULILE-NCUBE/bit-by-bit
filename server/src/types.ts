// the two kinds of users in Bit by Bit
export type Role = 'customer' | 'owner'

// what I know about the logged-in user after requireAuth runs
export type AuthUser = {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  role: Role
}

// this tells TypeScript that req.user exists on every Express request
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser
  }
}
