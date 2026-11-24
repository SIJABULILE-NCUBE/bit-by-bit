import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../lib/api'
import * as upload from '../../lib/uploadProof'
import { renderApp, fakeAuth, fakeSession, customer } from '../../test/renderWithAuth'
import { makeLayby } from '../../test/fixtures'
import type { LaybyDetail } from '../../types'

vi.mock(import('../../lib/api'), async (importOriginal) => ({
  ...(await importOriginal()),
  getLayby: vi.fn(),
  addPayment: vi.fn(),
}))
vi.mock('../../lib/uploadProof', () => ({ uploadProof: vi.fn() }))

const asCustomer = () => fakeAuth({ session: fakeSession, profile: customer })
const detail: LaybyDetail = { ...makeLayby(), schedule: [], payments: [] }

const slip = () => new File(['%PDF'], 'slip.pdf', { type: 'application/pdf' })

afterEach(() => {
  vi.clearAllMocks()
})

describe('Upload proof of payment', () => {
  it('suggests the next amount due and shows the balance', async () => {
    vi.mocked(api.getLayby).mockResolvedValue(detail)
    renderApp('/customer/laybys/layby-1/pay', asCustomer())

    expect(await screen.findByLabelText(/amount paid/i)).toHaveValue('300.00')
    expect(screen.getByText(/balance: r 600,00/i)).toBeInTheDocument()
  })

  it('uploads the slip, saves the payment and goes back to the lay-by', async () => {
    const user = userEvent.setup()
    vi.mocked(api.getLayby).mockResolvedValue(detail)
    vi.mocked(upload.uploadProof).mockResolvedValue('layby-1/1-slip.pdf')
    vi.mocked(api.addPayment).mockResolvedValue({
      payment: { id: 'p1', amount: 300, method: 'eft', status: 'pending', createdAt: '', reviewedAt: null, rejectReason: null, hasProof: true },
      layby: makeLayby(),
    })
    renderApp('/customer/laybys/layby-1/pay', asCustomer())

    await user.upload(await screen.findByLabelText(/proof of payment/i), slip())
    await user.click(screen.getByRole('button', { name: /send proof/i }))

    expect(upload.uploadProof).toHaveBeenCalledWith('layby-1', expect.any(File))
    expect(api.addPayment).toHaveBeenCalledWith('test-token', 'layby-1', { amount: 300, proofPath: 'layby-1/1-slip.pdf' })
    // back on the detail page with a thank-you message
    expect(await screen.findByText(/sent to kasi kids wear/i)).toBeInTheDocument()
  })

  it('needs a file, and refuses files that are too big or the wrong type', async () => {
    const user = userEvent.setup({ applyAccept: false })
    vi.mocked(api.getLayby).mockResolvedValue(detail)
    renderApp('/customer/laybys/layby-1/pay', asCustomer())

    await user.click(await screen.findByRole('button', { name: /send proof/i }))
    expect(screen.getByText(/choose your proof of payment/i)).toBeInTheDocument()

    await user.upload(screen.getByLabelText(/proof of payment/i), new File(['x'], 'notes.txt', { type: 'text/plain' }))
    expect(screen.getByText(/photo .*or a pdf/i)).toBeInTheDocument()

    const big = slip()
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
    await user.upload(screen.getByLabelText(/proof of payment/i), big)
    expect(screen.getByText(/too big/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /send proof/i }))
    expect(upload.uploadProof).not.toHaveBeenCalled()
  })

  it('suggests everything that is overdue when payments are late', async () => {
    vi.mocked(api.getLayby).mockResolvedValue({ ...detail, overdue: true, overdueDue: { amount: 540, since: '2026-10-09' } })
    renderApp('/customer/laybys/layby-1/pay', asCustomer())
    expect(await screen.findByLabelText(/amount paid/i)).toHaveValue('540.00')
  })

  it("won't let me pay more than the balance", async () => {
    const user = userEvent.setup()
    vi.mocked(api.getLayby).mockResolvedValue(detail)
    renderApp('/customer/laybys/layby-1/pay', asCustomer())

    const amount = await screen.findByLabelText(/amount paid/i)
    await user.clear(amount)
    await user.type(amount, '700')
    await user.upload(screen.getByLabelText(/proof of payment/i), slip())
    await user.click(screen.getByRole('button', { name: /send proof/i }))

    expect(screen.getByText(/more than the r 600,00 still owed/i)).toBeInTheDocument()
    expect(upload.uploadProof).not.toHaveBeenCalled()
  })

  it("shows the server's message if it says no", async () => {
    const user = userEvent.setup()
    vi.mocked(api.getLayby).mockResolvedValue(detail)
    vi.mocked(upload.uploadProof).mockResolvedValue('layby-1/1-slip.pdf')
    vi.mocked(api.addPayment).mockRejectedValue(new api.ApiError('That is more than the R 100,00 still owed', 400))
    renderApp('/customer/laybys/layby-1/pay', asCustomer())

    await user.upload(await screen.findByLabelText(/proof of payment/i), slip())
    await user.click(screen.getByRole('button', { name: /send proof/i }))

    expect(await screen.findByText(/r 100,00 still owed/i)).toBeInTheDocument()
  })
})
