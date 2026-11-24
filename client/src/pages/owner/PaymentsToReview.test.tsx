import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../lib/api'
import { renderApp, fakeAuth, fakeSession, owner } from '../../test/renderWithAuth'
import { makeLayby } from '../../test/fixtures'
import type { PendingPayment } from '../../types'

vi.mock(import('../../lib/api'), async (importOriginal) => ({
  ...(await importOriginal()),
  listPendingPayments: vi.fn(),
  reviewPayment: vi.fn(),
  getProofUrl: vi.fn(),
}))

const asOwner = () => fakeAuth({ session: fakeSession, profile: owner })

const slip: PendingPayment = {
  id: 'p1',
  amount: 300,
  method: 'eft',
  status: 'pending',
  createdAt: '2026-11-24T09:30:00Z',
  reviewedAt: null,
  rejectReason: null,
  hasProof: true,
  layby: { id: 'layby-1', itemName: 'School blazer', price: 1000, balance: 600, status: 'active' },
  customer: { id: 'user-customer', fullName: 'Thandi Mokoena', email: 'thandi@example.com', phone: '0821234567' },
}

const result = (status: 'confirmed' | 'rejected') => ({
  payment: { ...slip, status },
  layby: makeLayby({ balance: status === 'confirmed' ? 300 : 600 }),
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Payments to review', () => {
  it('lists every slip waiting for me, with who paid and for what', async () => {
    vi.mocked(api.listPendingPayments).mockResolvedValue([slip])
    renderApp('/owner/payments', asOwner())

    const card = await screen.findByRole('article', { name: /thandi mokoena/i })
    expect(card).toHaveTextContent(/r 300,00/i)
    expect(card).toHaveTextContent(/school blazer/i)
    expect(card).toHaveTextContent(/24 nov 2026/i)
    expect(screen.getByText(/1 slip waiting/i)).toBeInTheDocument()
  })

  it('says so when there is nothing to check', async () => {
    vi.mocked(api.listPendingPayments).mockResolvedValue([])
    renderApp('/owner/payments', asOwner())
    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument()
  })

  it('confirms a slip and takes it off the list', async () => {
    const user = userEvent.setup()
    vi.mocked(api.listPendingPayments).mockResolvedValue([slip])
    vi.mocked(api.reviewPayment).mockResolvedValue(result('confirmed'))
    renderApp('/owner/payments', asOwner())

    await user.click(await screen.findByRole('button', { name: /confirm payment/i }))

    expect(api.reviewPayment).toHaveBeenCalledWith('test-token', 'p1', { action: 'confirm' })
    expect(await screen.findByText(/confirmed r 300,00 from thandi mokoena/i)).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('needs a reason to reject a slip', async () => {
    const user = userEvent.setup()
    vi.mocked(api.listPendingPayments).mockResolvedValue([slip])
    vi.mocked(api.reviewPayment).mockResolvedValue(result('rejected'))
    renderApp('/owner/payments', asOwner())

    await user.click(await screen.findByRole('button', { name: /^reject$/i }))
    const card = screen.getByRole('article')
    await user.click(within(card).getByRole('button', { name: /reject payment/i }))
    expect(within(card).getByText(/say why/i)).toBeInTheDocument()
    expect(api.reviewPayment).not.toHaveBeenCalled()

    await user.type(within(card).getByLabelText(/reason/i), 'Blurry slip')
    await user.click(within(card).getByRole('button', { name: /reject payment/i }))

    expect(api.reviewPayment).toHaveBeenCalledWith('test-token', 'p1', { action: 'reject', reason: 'Blurry slip' })
    expect(await screen.findByText(/rejected r 300,00 from thandi mokoena/i)).toBeInTheDocument()
  })

  it("shows the server's message when it can't confirm", async () => {
    const user = userEvent.setup()
    vi.mocked(api.listPendingPayments).mockResolvedValue([slip])
    vi.mocked(api.reviewPayment).mockRejectedValue(new api.ApiError('That is more than the R 100,00 still owed', 400))
    renderApp('/owner/payments', asOwner())

    await user.click(await screen.findByRole('button', { name: /confirm payment/i }))
    expect(await screen.findByText(/r 100,00 still owed/i)).toBeInTheDocument()
    expect(screen.getByRole('article')).toBeInTheDocument()
  })

  it('opens the proof in a new tab', async () => {
    const user = userEvent.setup()
    const tab = { location: { href: '' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    vi.mocked(api.listPendingPayments).mockResolvedValue([slip])
    vi.mocked(api.getProofUrl).mockResolvedValue({ url: 'https://storage.test/signed/slip.pdf' })
    renderApp('/owner/payments', asOwner())

    await user.click(await screen.findByRole('button', { name: /view proof/i }))

    expect(open).toHaveBeenCalled()
    expect(api.getProofUrl).toHaveBeenCalledWith('test-token', 'p1')
    await vi.waitFor(() => expect(tab.location.href).toBe('https://storage.test/signed/slip.pdf'))
    open.mockRestore()
  })
})
