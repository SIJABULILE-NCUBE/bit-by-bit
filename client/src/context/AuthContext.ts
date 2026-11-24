import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile, Role } from '../types'

// what the sign up page hands to signUp()
export type SignUpData = {
  fullName: string
  phone: string
  email: string
  password: string
  role: Role
  shopName?: string
  shopArea?: string
}

// everything my pages can get from useAuth()
export type AuthValue = {
  session: Session | null
  profile: Profile | null
  // true while I'm still finding out who is logged in
  loading: boolean
  profileError: string | null
  signUp: (data: SignUpData) => Promise<{ needsEmailConfirmation: boolean }>
  logIn: (email: string, password: string) => Promise<void>
  logOut: () => Promise<void>
}

// the real value comes from <AuthProvider> (and a fake one in my tests)
export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return value
}
