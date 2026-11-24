import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from './lib/api'
import { renderApp, fakeAuth, fakeSession, customer, owner } from './test/renderWithAuth'

// the customer home now loads lay-bys, so I fake that call (no real network in tests)
vi.mock(import('./lib/api'), async (importOriginal) => ({
  ...(await importOriginal()),
  listLaybys: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(api.listLaybys).mockResolvedValue([])
})

// logged-in helpers
const asCustomer = () => fakeAuth({ session: fakeSession, profile: customer })
const asOwner = () => fakeAuth({ session: fakeSession, profile: owner })

describe('protected routes and role redirect', () => {
  it('sends logged-out people to log in', () => {
    renderApp('/customer')
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
  })

  it('shows a loading message while I check who is logged in', () => {
    renderApp('/owner', fakeAuth({ loading: true }))
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows the customer their name and role', () => {
    renderApp('/customer', asCustomer())
    expect(screen.getByRole('heading', { name: /my lay-bys/i })).toBeInTheDocument()
    expect(screen.getByText(/thandi mokoena/i)).toBeInTheDocument()
    expect(screen.getByText(/customer/i, { selector: '[data-role]' })).toBeInTheDocument()
  })

  it('shows the owner their name and role', () => {
    renderApp('/owner', asOwner())
    expect(screen.getByRole('heading', { name: /shop dashboard/i })).toBeInTheDocument()
    expect(screen.getByText(/sipho dlamini/i)).toBeInTheDocument()
    expect(screen.getByText(/shop owner/i, { selector: '[data-role]' })).toBeInTheDocument()
  })

  it('sends a customer away from owner pages to their own home', () => {
    renderApp('/owner', asCustomer())
    expect(screen.getByRole('heading', { name: /my lay-bys/i })).toBeInTheDocument()
  })

  it('sends an owner away from customer pages to their own home', () => {
    renderApp('/customer', asOwner())
    expect(screen.getByRole('heading', { name: /shop dashboard/i })).toBeInTheDocument()
  })

  it('redirects a logged-in owner from log in to /owner', () => {
    renderApp('/login', asOwner())
    expect(screen.getByRole('heading', { name: /shop dashboard/i })).toBeInTheDocument()
  })

  it('redirects a logged-in customer from sign up to /customer', () => {
    renderApp('/signup', asCustomer())
    expect(screen.getByRole('heading', { name: /my lay-bys/i })).toBeInTheDocument()
  })

  it('shows an error if my profile could not be loaded', () => {
    renderApp('/customer', fakeAuth({ session: fakeSession, profileError: 'Could not load your profile' }))
    expect(screen.getByText(/could not load your profile/i)).toBeInTheDocument()
  })

  it('logs out from the dashboard', async () => {
    const user = userEvent.setup()
    const auth = renderApp('/customer', asCustomer())
    await user.click(screen.getByRole('button', { name: /log out/i }))
    expect(auth.logOut).toHaveBeenCalled()
  })
})
