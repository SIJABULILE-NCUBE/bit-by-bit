import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import * as api from '../../lib/api'
import { renderApp, fakeAuth, fakeSession, owner } from '../../test/renderWithAuth'
import { makeLayby } from '../../test/fixtures'

vi.mock(import('../../lib/api'), async (importOriginal) => ({
  ...(await importOriginal()),
  listLaybys: vi.fn(),
}))

const asOwner = () => fakeAuth({ session: fakeSession, profile: owner })

afterEach(() => {
  vi.clearAllMocks()
})

describe("Owner's lay-by list", () => {
  it("shows each lay-by with the customer, what's paid and the balance", async () => {
    vi.mocked(api.listLaybys).mockResolvedValue([
      makeLayby(),
      makeLayby({ id: 'layby-2', itemName: 'Couch', customer: { ...makeLayby().customer, fullName: 'Vusi Cele' }, overdue: true }),
    ])
    renderApp('/owner/laybys', asOwner())

    expect(await screen.findByText('School blazer + 2 shirts')).toBeInTheDocument()
    expect(screen.getByText('Thandi Mokoena')).toBeInTheDocument()
    expect(screen.getAllByText(/paid r 400,00 of r 1 000,00/i)).toHaveLength(2)
    expect(screen.getAllByText('R 600,00')).toHaveLength(2)
    expect(screen.getAllByRole('progressbar')[0]).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByText('Overdue')).toBeInTheDocument()
    expect(api.listLaybys).toHaveBeenCalledWith('test-token')
  })

  it('has a button to start a new lay-by', async () => {
    vi.mocked(api.listLaybys).mockResolvedValue([])
    renderApp('/owner/laybys', asOwner())
    expect(await screen.findByRole('link', { name: /new lay-by/i })).toHaveAttribute('href', '/owner/laybys/new')
  })

  it('says so when there are no lay-bys yet', async () => {
    vi.mocked(api.listLaybys).mockResolvedValue([])
    renderApp('/owner/laybys', asOwner())
    expect(await screen.findByText(/no lay-bys yet/i)).toBeInTheDocument()
  })

  it('shows an error when the list could not load', async () => {
    vi.mocked(api.listLaybys).mockRejectedValue(new Error('Network down'))
    renderApp('/owner/laybys', asOwner())
    expect(await screen.findByText(/couldn't load your lay-bys/i)).toBeInTheDocument()
  })
})
