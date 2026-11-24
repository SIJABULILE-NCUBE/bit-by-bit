import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, fakeAuth } from '../../test/renderWithAuth'

describe('Log in page', () => {
  it('shows errors when the form is empty', async () => {
    const user = userEvent.setup()
    const auth = renderApp('/login')

    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument()
    expect(screen.getByText(/enter your password/i)).toBeInTheDocument()
    expect(auth.logIn).not.toHaveBeenCalled()
  })

  it('logs in with the email and password', async () => {
    const user = userEvent.setup()
    const auth = renderApp('/login')

    await user.type(screen.getByLabelText(/email/i), 'thandi@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(auth.logIn).toHaveBeenCalledWith('thandi@example.com', 'secret123')
  })

  it('shows a friendly message when the details are wrong', async () => {
    const user = userEvent.setup()
    renderApp(
      '/login',
      fakeAuth({
        logIn: async () => {
          throw new Error('Invalid login credentials')
        },
      }),
    )

    await user.type(screen.getByLabelText(/email/i), 'thandi@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'wrong-one')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/email or password is wrong/i)).toBeInTheDocument()
  })
})
