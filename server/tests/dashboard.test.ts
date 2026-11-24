import { describe, it, expect } from 'vitest'
import { dashboardTotals, checkStatusChange, type DashboardLayby } from '../src/services/dashboard.js'

const today = '2026-12-30'

// a R1 000 lay-by with R100 deposit and 3 × R300 instalments due 24 Dec, 24 Jan, 24 Feb
function layby(overrides: Partial<DashboardLayby> = {}): DashboardLayby {
  return {
    price: 1000,
    deposit: 100,
    status: 'active',
    instalments: [
      { seq: 1, dueDate: '2026-12-24', amount: 300 },
      { seq: 2, dueDate: '2027-01-24', amount: 300 },
      { seq: 3, dueDate: '2027-02-24', amount: 300 },
    ],
    payments: [{ amount: 100, status: 'confirmed' }],
    ...overrides,
  }
}

describe('dashboardTotals', () => {
  it('is all zeros for a shop with no lay-bys', () => {
    expect(dashboardTotals([], today)).toEqual({
      active: 0,
      overdue: 0,
      readyToCollect: 0,
      paymentsToReview: 0,
      totalOutstanding: 0,
    })
  })

  it('counts each kind of lay-by and adds up what is still owed on active ones', () => {
    const totals = dashboardTotals(
      [
        // on track: paid the deposit and the first instalment → owes R600
        layby({ payments: [{ amount: 100, status: 'confirmed' }, { amount: 300, status: 'confirmed' }] }),
        // overdue: missed 24 Dec, and has a slip waiting → owes R900
        layby({ payments: [{ amount: 100, status: 'confirmed' }, { amount: 300, status: 'pending' }] }),
        // fully paid, waiting to be collected (owes nothing)
        layby({ status: 'completed', payments: [{ amount: 1000, status: 'confirmed' }] }),
        // collected and cancelled don't count towards anything
        layby({ status: 'collected', payments: [{ amount: 1000, status: 'confirmed' }] }),
        layby({ status: 'cancelled' }),
      ],
      today,
    )

    expect(totals).toEqual({
      active: 2,
      overdue: 1,
      readyToCollect: 1,
      paymentsToReview: 1,
      totalOutstanding: 1500,
    })
  })

  it('adds money up in cents so there are no rounding errors', () => {
    const odd = layby({ price: 100.1, deposit: 10.01, instalments: [], payments: [{ amount: 10.01, status: 'confirmed' }] })
    expect(dashboardTotals([odd, odd, odd], '2026-11-24').totalOutstanding).toBe(270.27)
  })
})

describe('checkStatusChange', () => {
  it('only collects lay-bys that are fully paid', () => {
    expect(checkStatusChange('completed', 'collect', '')).toBeNull()
    expect(checkStatusChange('active', 'collect', '')).toMatch(/fully paid/)
    expect(checkStatusChange('collected', 'collect', '')).toMatch(/already collected/)
  })

  it('cancels active or paid-up lay-bys, but only with a reason', () => {
    expect(checkStatusChange('active', 'cancel', 'Customer moved away')).toBeNull()
    expect(checkStatusChange('completed', 'cancel', 'Item damaged')).toBeNull()
    expect(checkStatusChange('active', 'cancel', '   ')).toMatch(/reason/)
  })

  it("can't cancel a lay-by that is already collected or cancelled", () => {
    expect(checkStatusChange('collected', 'cancel', 'oops')).toMatch(/already collected/)
    expect(checkStatusChange('cancelled', 'cancel', 'oops')).toMatch(/already cancelled/)
  })
})
