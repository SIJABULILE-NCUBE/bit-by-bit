import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../lib/api'
import { renderApp, fakeAuth, fakeSession, owner, customer } from '../../test/renderWithAuth'
import { makeLayby } from '../../test/fixtures'

// I keep the real ApiError but fake the network calls
vi.mock(import('../../lib/api'), async (importOriginal) => ({
  ...(await importOriginal()),
  listLaybys: vi.fn(),
  createLayby: vi.fn(),
}))

const asOwner = () => fakeAuth({ session: fakeSession, profile: owner })

async function fillForm(user: ReturnType<typeof userEvent.setup>, deposit = '100') {
  await user.type(screen.getByLabelText(/customer email/i), 'thandi@example.com')
  await user.type(screen.getByLabelText(/item name/i), 'School blazer')
  await user.type(screen.getByLabelText(/price/i), '1000')
  await user.clear(screen.getByLabelText(/^deposit/i))
  await user.type(screen.getByLabelText(/^deposit/i), deposit)
  await user.click(screen.getByRole('radio', { name: '3 months' }))
}

beforeEach(() => {
  // "today" is 24 Nov 2026, so the first instalment is due 24 Dec 2026
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-24T08:00:00Z'))
  vi.mocked(api.listLaybys).mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('New lay-by form', () => {
  it('shows a live schedule preview as I type', async () => {
    const user = userEvent.setup()
    renderApp('/owner/laybys/new', asOwner())

    await fillForm(user)

    const preview = screen.getByRole('region', { name: /schedule preview/i })
    expect(within(preview).getByText('R 100,00', { selector: '[data-deposit]' })).toBeInTheDocument()
    expect(within(preview).getByText(/3 × R 300,00/)).toBeInTheDocument()
    const rows = within(preview).getAllByRole('listitem')
    // deposit today + 3 instalments
    expect(rows).toHaveLength(4)
    expect(rows[1]).toHaveTextContent('24 Dec 2026')
    expect(rows[3]).toHaveTextContent('24 Feb 2027')
  })

  it('fills in a 10% deposit with one tap', async () => {
    const user = userEvent.setup()
    renderApp('/owner/laybys/new', asOwner())

    await user.type(screen.getByLabelText(/price/i), '1250')
    await user.click(screen.getByRole('button', { name: /10%/ }))

    expect(screen.getByLabelText(/^deposit/i)).toHaveValue('125.00')
  })

  it('explains the 10% rule and does not save a low deposit', async () => {
    const user = userEvent.setup()
    renderApp('/owner/laybys/new', asOwner())

    await fillForm(user, '50')
    expect(screen.getByText(/at least 10% of the price \(R 100,00\)/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /create lay-by/i }))
    expect(api.createLayby).not.toHaveBeenCalled()
  })

  it('asks for the customer email and item name', async () => {
    const user = userEvent.setup()
    renderApp('/owner/laybys/new', asOwner())

    await user.click(screen.getByRole('button', { name: /create lay-by/i }))

    expect(screen.getByText(/enter the customer's email/i)).toBeInTheDocument()
    expect(screen.getByText(/enter the item name/i)).toBeInTheDocument()
    expect(api.createLayby).not.toHaveBeenCalled()
  })

  it('saves the lay-by and goes back to the list', async () => {
    const user = userEvent.setup()
    vi.mocked(api.createLayby).mockResolvedValue(makeLayby({ itemName: 'School blazer' }))
    vi.mocked(api.listLaybys).mockResolvedValue([makeLayby({ itemName: 'School blazer' })])
    renderApp('/owner/laybys/new', asOwner())

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /create lay-by/i }))

    expect(api.createLayby).toHaveBeenCalledWith('test-token', {
      customerEmail: 'thandi@example.com',
      itemName: 'School blazer',
      price: 1000,
      deposit: 100,
      termMonths: 3,
    })
    expect(await screen.findByRole('heading', { name: /all lay-bys/i })).toBeInTheDocument()
    expect(screen.getByText(/lay-by for school blazer created/i)).toBeInTheDocument()
  })

  it("shows the server's message when the customer hasn't signed up", async () => {
    const user = userEvent.setup()
    vi.mocked(api.createLayby).mockRejectedValue(
      new api.ApiError('No customer has signed up with thandi@example.com yet.', 404),
    )
    renderApp('/owner/laybys/new', asOwner())

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /create lay-by/i }))

    expect(await screen.findByText(/no customer has signed up/i)).toBeInTheDocument()
  })

  it('is not available to customers', () => {
    renderApp('/owner/laybys/new', fakeAuth({ session: fakeSession, profile: customer }))
    expect(screen.queryByRole('heading', { name: /new lay-by/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /my lay-bys/i })).toBeInTheDocument()
  })
})
