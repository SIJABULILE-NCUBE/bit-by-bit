import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import * as api from '../../lib/api'
import { renderApp, fakeAuth, fakeSession, owner } from '../../test/renderWithAuth'
import { makeLayby } from '../../test/fixtures'
import type { Dashboard } from '../../types'

vi.mock(import('../../lib/api'), async (importOriginal) => ({
  ...(await importOriginal()),
  getDashboard: vi.fn(),
}))

const asOwner = () => fakeAuth({ session: fakeSession, profile: owner })

const dashboard: Dashboard = {
  shop: { id: 'shop-1', name: 'Kasi Kids Wear', area: 'Soweto' },
  totals: { active: 24, overdue: 3, readyToCollect: 4, paymentsToReview: 5, totalOutstanding: 48650, highRisk: 2 },
  overdueLaybys: [
    makeLayby({ id: 'late-1', itemName: 'Winter jacket', overdue: true, risk: { level: 'high', reasons: ['2 instalments missed'] } }),
  ],
  readyLaybys: [makeLayby({ id: 'ready-1', itemName: 'School shoes', status: 'completed', balance: 0 })],
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('Owner dashboard', () => {
  it('shows the real totals from the server', async () => {
    vi.mocked(api.getDashboard).mockResolvedValue(dashboard)
    renderApp('/owner', asOwner())

    expect(await screen.findByText('R 48 650,00')).toBeInTheDocument()
    const stat = (name: RegExp) => screen.getByRole('link', { name })
    expect(stat(/24 active lay-bys/i)).toHaveAttribute('href', '/owner/laybys?show=active')
    expect(stat(/5 payments to review/i)).toHaveAttribute('href', '/owner/payments')
    expect(stat(/3 overdue/i)).toHaveAttribute('href', '/owner/laybys?show=overdue')
    expect(stat(/4 ready to collect/i)).toHaveAttribute('href', '/owner/laybys?show=ready')
    expect(screen.getByText(/kasi kids wear/i)).toBeInTheDocument()
  })

  it('lists what needs attention today', async () => {
    vi.mocked(api.getDashboard).mockResolvedValue(dashboard)
    renderApp('/owner', asOwner())

    const attention = await screen.findByRole('region', { name: /needs attention/i })
    expect(within(attention).getByRole('link', { name: /winter jacket/i })).toHaveAttribute('href', '/owner/laybys/late-1')
    expect(within(attention).getByRole('link', { name: /school shoes/i })).toHaveAttribute('href', '/owner/laybys/ready-1')
  })

  it('shows how many lay-bys are at high risk, with their risk badges', async () => {
    vi.mocked(api.getDashboard).mockResolvedValue(dashboard)
    renderApp('/owner', asOwner())

    expect(await screen.findByRole('link', { name: /2 lay-bys at high risk/i })).toHaveAttribute(
      'href',
      '/owner/laybys?show=risk',
    )
    expect(screen.getByText('High risk')).toBeInTheDocument()
  })

  it('hides the high-risk banner when there are none', async () => {
    vi.mocked(api.getDashboard).mockResolvedValue({ ...dashboard, totals: { ...dashboard.totals, highRisk: 0 } })
    renderApp('/owner', asOwner())
    await screen.findByText('R 48 650,00')
    expect(screen.queryByRole('link', { name: /at high risk/i })).not.toBeInTheDocument()
  })

  it('says when everything is on track', async () => {
    vi.mocked(api.getDashboard).mockResolvedValue({ ...dashboard, overdueLaybys: [], readyLaybys: [] })
    renderApp('/owner', asOwner())
    expect(await screen.findByText(/nothing needs your attention/i)).toBeInTheDocument()
  })

  it('shows an error if the dashboard fails to load', async () => {
    vi.mocked(api.getDashboard).mockRejectedValue(new Error('offline'))
    renderApp('/owner', asOwner())
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load/i)
  })
})
