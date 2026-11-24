import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, fakeAuth } from '../../test/renderWithAuth'

// fills in the fields every user needs
async function fillBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), 'Sipho Dlamini')
  await user.type(screen.getByLabelText(/cell number/i), '083 123 4567')
  await user.type(screen.getByLabelText(/email/i), 'sipho@example.com')
  await user.type(screen.getByLabelText(/^password/i), 'secret123')
}

describe('Sign up page', () => {
  it('shows errors and does not sign up when the form is empty', async () => {
    const user = userEvent.setup()
    const auth = renderApp('/signup')

    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText(/enter your first and last name/i)).toBeInTheDocument()
    expect(screen.getByText(/enter a valid sa cell number/i)).toBeInTheDocument()
    expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument()
    expect(screen.getByText(/at least 6 characters/i, { selector: '[role="alert"]' })).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('only asks for shop details when Shop owner is chosen', async () => {
    const user = userEvent.setup()
    renderApp('/signup')

    expect(screen.getByRole('radio', { name: /customer/i })).toBeChecked()
    expect(screen.queryByLabelText(/shop name/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /shop owner/i }))

    expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/area/i)).toBeInTheDocument()
  })

  it('sends the owner details (with a +27 phone) to signUp', async () => {
    const user = userEvent.setup()
    const auth = renderApp('/signup')

    await user.click(screen.getByRole('radio', { name: /shop owner/i }))
    await fillBasics(user)
    await user.type(screen.getByLabelText(/shop name/i), 'Kasi Kids Wear')
    await user.type(screen.getByLabelText(/area/i), 'Soweto')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(auth.signUp).toHaveBeenCalledWith({
      fullName: 'Sipho Dlamini',
      phone: '+27831234567',
      email: 'sipho@example.com',
      password: 'secret123',
      role: 'owner',
      shopName: 'Kasi Kids Wear',
      shopArea: 'Soweto',
    })
  })

  it('tells me to check my email when Supabase wants a confirmation', async () => {
    const user = userEvent.setup()
    renderApp('/signup', fakeAuth({ signUp: async () => ({ needsEmailConfirmation: true }) }))

    await fillBasics(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })

  it('shows the error when sign up fails', async () => {
    const user = userEvent.setup()
    renderApp(
      '/signup',
      fakeAuth({
        signUp: async () => {
          throw new Error('User already registered')
        },
      }),
    )

    await fillBasics(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/user already registered/i)).toBeInTheDocument()
  })
})
