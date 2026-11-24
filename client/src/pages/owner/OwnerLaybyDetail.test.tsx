import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../lib/api'
import { renderApp, fakeAuth, fakeSession, owner } from '../../test/renderWithAuth'
import { makeLayby } from '../../test/fixtures'
import type { LaybyDetail } from '../../types'

vi.mock(import('../../lib/api'), async (importOriginal) => ({
  ...(await importOriginal()),
  getLayby: vi.fn(),
  addPayment: vi.fn(),
}))

const asOwner = () => fakeAuth({ session: fakeSession, profile: owner })

const detail = (overrides: Partial<LaybyDetail> = {}): LaybyDetail => ({
  ...makeLayby(),
  schedule: [{ seq: 1, dueDate: '2026-12-24', amount: 900, paid: 300, status: 'next' }],
  payments: [
    { id: 'p0', amount: 100, method: 'deposit', status: 'confirmed', createdAt: '2026-11-24T08:00:00Z', reviewedAt: null, rejectReason: null, hasProof: false },
  ],
  ...overrides,
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Owner lay-by detail', () => {
  it('shows the customer, the item and the balance', async () => {
    vi.mocked(api.getLayby).mockResolvedValue(detail())
    renderApp('/owner/laybys/layby-1', asOwner())

    expect(await screen.findByRole('heading', { name: 'School blazer + 2 shirts' })).toBeInTheDocument()
    expect(screen.getByText('Thandi Mokoena')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /\+27821234567/ })).toHaveAttribute('href', 'tel:+27821234567')
    expect(screen.getByRole('region', { name: /payment schedule/i })).toBeInTheDocument()
  })

  it('records a cash payment and shows the new balance', async () => {
    const user = userEvent.setup()
    vi.mocked(api.getLayby).mockResolvedValueOnce(detail()).mockResolvedValueOnce(detail({ ...makeLayby({ paid: 700, balance: 300, progress: 70 }) }))
    vi.mocked(api.addPayment).mockResolvedValue({
      payment: { id: 'p9', amount: 300, method: 'cash', status: 'confirmed', createdAt: '', reviewedAt: null, rejectReason: null, hasProof: false },
      layby: makeLayby({ balance: 300 }),
    })
    renderApp('/owner/laybys/layby-1', asOwner())

    await user.type(await screen.findByLabelText(/cash received/i), '300')
    await user.click(screen.getByRole('button', { name: /record cash payment/i }))

    expect(api.addPayment).toHaveBeenCalledWith('test-token', 'layby-1', { amount: 300 })
    expect(await screen.findByText(/cash payment of r 300,00 recorded/i)).toBeInTheDocument()
    expect(await screen.findByText('R 300,00', { selector: 'span' })).toBeInTheDocument()
  })

  it("won't record more cash than the balance", async () => {
    const user = userEvent.setup()
    vi.mocked(api.getLayby).mockResolvedValue(detail())
    renderApp('/owner/laybys/layby-1', asOwner())

    await user.type(await screen.findByLabelText(/cash received/i), '600.01')
    await user.click(screen.getByRole('button', { name: /record cash payment/i }))

    expect(screen.getByText(/more than the r 600,00 still owed/i)).toBeInTheDocument()
    expect(api.addPayment).not.toHaveBeenCalled()
  })

  it('hides the cash form once the lay-by is paid up', async () => {
    vi.mocked(api.getLayby).mockResolvedValue(detail({ status: 'completed', balance: 0, paid: 1000, progress: 100, nextDue: null }))
    renderApp('/owner/laybys/layby-1', asOwner())

    expect(await screen.findByRole('heading', { name: 'School blazer + 2 shirts' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/cash received/i)).not.toBeInTheDocument()
  })
})
