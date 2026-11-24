import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import * as api from '../../lib/api'
import { renderApp, fakeAuth, fakeSession, customer } from '../../test/renderWithAuth'
import { makeLayby } from '../../test/fixtures'
import type { LaybyDetail } from '../../types'

vi.mock(import('../../lib/api'), async (importOriginal) => ({
  ...(await importOriginal()),
  getLayby: vi.fn(),
}))

const asCustomer = () => fakeAuth({ session: fakeSession, profile: customer })

const detail: LaybyDetail = {
  ...makeLayby(),
  schedule: [
    { seq: 1, dueDate: '2026-12-24', amount: 300, paid: 300, status: 'paid' },
    { seq: 2, dueDate: '2027-01-24', amount: 300, paid: 0, status: 'next' },
    { seq: 3, dueDate: '2027-02-24', amount: 300, paid: 0, status: 'upcoming' },
  ],
  payments: [
    { id: 'p3', amount: 300, method: 'eft', status: 'pending', createdAt: '2027-01-20T09:30:00Z', reviewedAt: null, rejectReason: null },
    { id: 'p2', amount: 50, method: 'eft', status: 'rejected', createdAt: '2026-12-10T09:30:00Z', reviewedAt: null, rejectReason: 'Blurry slip' },
    { id: 'p1', amount: 300, method: 'cash', status: 'confirmed', createdAt: '2026-12-20T09:30:00Z', reviewedAt: null, rejectReason: null },
    { id: 'p0', amount: 100, method: 'deposit', status: 'confirmed', createdAt: '2026-11-24T08:00:00Z', reviewedAt: null, rejectReason: null },
  ],
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('Customer lay-by detail', () => {
  it('loads the lay-by from the address', async () => {
    vi.mocked(api.getLayby).mockResolvedValue(detail)
    renderApp('/customer/laybys/layby-1', asCustomer())

    expect(await screen.findByRole('heading', { name: 'School blazer + 2 shirts' })).toBeInTheDocument()
    expect(api.getLayby).toHaveBeenCalledWith('test-token', 'layby-1')
    expect(screen.getByText(/kasi kids wear/i)).toBeInTheDocument()
    expect(screen.getByText(/r 600,00 left to own it/i)).toBeInTheDocument()
  })

  it('shows the payment schedule with what is paid, next and upcoming', async () => {
    vi.mocked(api.getLayby).mockResolvedValue(detail)
    renderApp('/customer/laybys/layby-1', asCustomer())

    const schedule = await screen.findByRole('region', { name: /payment schedule/i })
    const rows = within(schedule).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent(/instalment 1.*24 dec 2026.*r 300,00.*paid/i)
    expect(rows[1]).toHaveTextContent(/instalment 2.*next/i)
    expect(rows[2]).toHaveTextContent(/instalment 3 \(final\).*upcoming/i)
  })

  it('shows every payment with its status, and why one was rejected', async () => {
    vi.mocked(api.getLayby).mockResolvedValue(detail)
    renderApp('/customer/laybys/layby-1', asCustomer())

    const history = await screen.findByRole('region', { name: /payment history/i })
    const rows = within(history).getAllByRole('listitem')
    expect(rows).toHaveLength(4)
    expect(rows[0]).toHaveTextContent(/eft.*r 300,00.*waiting for the shop/i)
    expect(rows[1]).toHaveTextContent(/rejected.*blurry slip/i)
    expect(rows[2]).toHaveTextContent(/cash.*confirmed/i)
    expect(rows[3]).toHaveTextContent(/deposit.*r 100,00.*confirmed/i)
  })

  it("says so when the lay-by can't be found", async () => {
    vi.mocked(api.getLayby).mockRejectedValue(new api.ApiError('Lay-by not found', 404))
    renderApp('/customer/laybys/nope', asCustomer())
    expect(await screen.findByText(/couldn't find that lay-by/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to my lay-bys/i })).toHaveAttribute('href', '/customer')
  })
})
