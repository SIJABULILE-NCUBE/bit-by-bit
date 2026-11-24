import type { Role } from '../types'

// everything the sign up form collects
export type SignUpValues = {
  fullName: string
  phone: string
  email: string
  password: string
  role: Role
  shopName: string
  shopArea: string
}

export type LogInValues = {
  email: string
  password: string
}

// one message per field that has a problem (no key = that field is fine)
export type FieldErrors<T> = Partial<Record<keyof T, string>>

// good enough to catch typos; Supabase does the real check
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Supabase's minimum (see supabase/config.toml)
export const MIN_PASSWORD_LENGTH = 6

// I accept 082 123 4567, 82 123 4567, +27 82 123 4567 or 27821234567
// and always save it as +27821234567 (handy for WhatsApp links later)
// SA cell numbers start with 6, 7 or 8 after the 0
export function normaliseSaPhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, '').replace(/^\+/, '')

  let local: string
  if (/^27\d{9}$/.test(digits)) local = digits.slice(2)
  else if (/^0\d{9}$/.test(digits)) local = digits.slice(1)
  else if (/^\d{9}$/.test(digits)) local = digits
  else return null

  if (!/^[6-8]/.test(local)) return null
  return `+27${local}`
}

export function validateSignUp(values: SignUpValues): FieldErrors<SignUpValues> {
  const errors: FieldErrors<SignUpValues> = {}

  // at least two words, so I get a first AND last name
  if (values.fullName.trim().split(/\s+/).filter(Boolean).length < 2) {
    errors.fullName = 'Enter your first and last name'
  }
  if (!normaliseSaPhone(values.phone)) {
    errors.phone = 'Enter a valid SA cell number, e.g. 082 123 4567'
  }
  if (!emailPattern.test(values.email.trim())) {
    errors.email = 'Enter a valid email address'
  }
  if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Your password needs at least ${MIN_PASSWORD_LENGTH} characters`
  }

  // only shop owners need to tell me about their shop
  if (values.role === 'owner') {
    if (!values.shopName.trim()) errors.shopName = 'Enter your shop name'
    if (!values.shopArea.trim()) errors.shopArea = 'Enter the area your shop is in'
  }

  return errors
}

export function validateLogIn(values: LogInValues): FieldErrors<LogInValues> {
  const errors: FieldErrors<LogInValues> = {}
  if (!emailPattern.test(values.email.trim())) errors.email = 'Enter a valid email address'
  if (!values.password) errors.password = 'Enter your password'
  return errors
}
