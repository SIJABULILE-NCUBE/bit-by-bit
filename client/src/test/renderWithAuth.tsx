import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, type AuthValue, type Profile } from '../context/AuthContext'
import App from '../App'

// pretend users for my tests
export const customer: Profile = {
  id: 'user-customer',
  email: 'thandi@example.com',
  fullName: 'Thandi Mokoena',
  phone: '+27821234567',
  role: 'customer',
}

export const owner: Profile = {
  id: 'user-owner',
  email: 'sipho@example.com',
  fullName: 'Sipho Dlamini',
  phone: '+27831234567',
  role: 'owner',
}

// a fake "logged in" session (my pages only check that it exists)
export const fakeSession = { access_token: 'test-token' } as Session

// a fake auth that starts logged out; each test overrides what it needs
export function fakeAuth(overrides: Partial<AuthValue> = {}): AuthValue {
  return {
    session: null,
    profile: null,
    loading: false,
    profileError: null,
    signUp: vi.fn(async () => ({ needsEmailConfirmation: false })),
    logIn: vi.fn(async () => {}),
    logOut: vi.fn(async () => {}),
    ...overrides,
  }
}

// renders my whole app at a route, with my fake auth instead of real Supabase
export function renderApp(route: string, auth: AuthValue = fakeAuth()) {
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return auth
}
