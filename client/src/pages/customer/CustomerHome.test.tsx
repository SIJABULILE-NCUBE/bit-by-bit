import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import * as api from '../../lib/api'
import { renderApp, fakeAuth, fakeSession, customer } from '../../test/renderWithAuth'
import { makeLayby } from '../../test/fixtures'

vi.mock(import('../../lib/api'), async (importOriginal) => ({
  ...(await importOriginal()),
  listLaybys: vi.fn(),
}))

const asCustomer = () => fakeAuth({ session: fakeSession, profile: customer })

afterEach(() => {
  vi.clearAllMocks()
})

describe('Customer "My lay-bys"', () => {
  it('shows a card per lay-by with the shop, progress, paid, balance and next due date', async () => {
    vi.mocked(api.listLaybys).mockResolvedValue([
      makeLayby(),
      makeLayby({
        id: 'layby-2',
        itemName: 'Couch',
        shop: { id: 'shop-2', name: 'Lerato Furniture', area: 'Tembisa' },
        price: 2400,
        paid: 1200,
        balance: 1200,
        progress: 50,
        nextDue: { dueDate: '2026-12-15', amount: 600 },
      }),
    ])
    renderApp('/customer', asCustomer())

    const card = (await screen.findByRole('heading', { name: 'School blazer + 2 shirts' })).closest('li')!
    expect(within(card).getByText(/kasi kids wear/i)).toBeInTheDocument()
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
    expect(within(card).getByText(/paid r 400,00 of r 1 000,00/i)).toBeInTheDocument()
    expect(within(card).getByText('R 600,00')).toBeInTheDocument()
    expect(within(card).getByText(/r 300,00 due 24 jan 2027/i)).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /view details/i })).toHaveAttribute('href', '/customer/laybys/layby-1')

    expect(screen.getByRole('heading', { name: 'Couch' })).toBeInTheDocument()
  })

  it('adds up what I have paid across all my lay-bys', async () => {
    vi.mocked(api.listLaybys).mockResolvedValue([makeLayby({ paid: 400 }), makeLayby({ id: 'layby-2', paid: 850.5 })])
    renderApp('/customer', asCustomer())

    const summary = await screen.findByRole('region', { name: /my progress/i })
    expect(within(summary).getByText('R 1 250,50')).toBeInTheDocument()
    expect(within(summary).getByText(/2 active/i)).toBeInTheDocument()
  })

  it('shows when a lay-by is overdue', async () => {
    vi.mocked(api.listLaybys).mockResolvedValue([makeLayby({ overdue: true })])
    renderApp('/customer', asCustomer())
    expect(await screen.findByText('Overdue')).toBeInTheDocument()
  })

  it('puts everything that is overdue in the summary, not just the first missed instalment', async () => {
    vi.mocked(api.listLaybys).mockResolvedValue([
      makeLayby({ overdue: true, nextDue: { dueDate: '2026-10-09', amount: 270 }, overdueDue: { amount: 540, since: '2026-10-09' } }),
      makeLayby({ id: 'b', overdue: true, nextDue: { dueDate: '2026-11-01', amount: 100 }, overdueDue: { amount: 100, since: '2026-11-01' } }),
      makeLayby({ id: 'c' }),
    ])
    renderApp('/customer', asCustomer())

    const summary = await screen.findByRole('region', { name: /my progress/i })
    expect(summary).toHaveTextContent(/overdue now\s*r 640,00/i)
    expect(summary).not.toHaveTextContent(/next payment/i)
  })

  it('explains what happens when I have no lay-bys', async () => {
    vi.mocked(api.listLaybys).mockResolvedValue([])
    renderApp('/customer', asCustomer())
    expect(await screen.findByText(/you don't have any lay-bys yet/i)).toBeInTheDocument()
  })

  it('shows an error when my lay-bys could not load', async () => {
    vi.mocked(api.listLaybys).mockRejectedValue(new Error('Network down'))
    renderApp('/customer', asCustomer())
    expect(await screen.findByText(/couldn't load your lay-bys/i)).toBeInTheDocument()
  })
})
