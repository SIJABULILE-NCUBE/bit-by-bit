import type { Role } from '../types'

// where each kind of user lands after logging in
export function homeFor(role: Role): string {
  return role === 'owner' ? '/owner' : '/customer'
}

// the friendly name I show on screen for each role
export function roleLabel(role: Role): string {
  return role === 'owner' ? 'Shop owner' : 'Customer'
}
