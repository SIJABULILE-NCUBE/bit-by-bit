import { describe, it, expect } from 'vitest'
import { daysBetween, riskFactors, riskLevel, riskScore, type RiskLayby } from '../src/services/riskScore.js'

// R1 000 lay-by, R100 deposit on 1 Sep, then 3 × R300 due 1 Oct, 1 Nov, 1 Dec
function layby(payments: RiskLayby['payments'], overrides: Partial<RiskLayby> = {}): RiskLayby {
  return {
    status: 'active',
    price: 1000,
    deposit: 100,
    createdAt: '2026-09-01T09:00:00+02:00',
    instalments: [
      { seq: 1, dueDate: '2026-10-01', amount: 300 },
      { seq: 2, dueDate: '2026-11-01', amount: 300 },
      { seq: 3, dueDate: '2026-12-01', amount: 300 },
    ],
    payments,
    ...overrides,
  }
}

const deposit = { amount: 100, status: 'confirmed' as const, createdAt: '2026-09-01T09:00:00+02:00' }
const paid = (amount: number, date: string) => ({ amount, status: 'confirmed' as const, createdAt: `${date}T10:00:00+02:00` })

describe('daysBetween', () => {
  it('counts whole days between two dates', () => {
    expect(daysBetween('2026-11-01', '2026-11-24')).toBe(23)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2026-11-24', '2026-11-24')).toBe(0)
  })
})

describe('riskFactors', () => {
  it('works out days overdue, missed instalments, % paid and days since the last payment', () => {
    // paid the deposit and instalment 1, then nothing: instalment 2 (1 Nov) is missed
    const factors = riskFactors(layby([deposit, paid(300, '2026-10-01')]), '2026-11-24')
    expect(factors).toEqual({
      daysOverdue: 23,
      missedInstalments: 1,
      percentPaid: 40,
      daysSinceLastPayment: 54,
    })
  })

  it('ignores pending and rejected payments', () => {
    const factors = riskFactors(
      layby([
        deposit,
        { amount: 300, status: 'pending', createdAt: '2026-11-20T10:00:00+02:00' },
        { amount: 300, status: 'rejected', createdAt: '2026-11-21T10:00:00+02:00' },
      ]),
      '2026-11-24',
    )
    expect(factors.missedInstalments).toBe(2)
    expect(factors.percentPaid).toBe(10)
    expect(factors.daysSinceLastPayment).toBe(84)
  })

  it('counts from the start of the lay-by when there are no confirmed payments', () => {
    expect(riskFactors(layby([]), '2026-09-11').daysSinceLastPayment).toBe(10)
  })
})

describe('riskLevel', () => {
  const ok = { daysOverdue: 0, missedInstalments: 0, percentPaid: 40, daysSinceLastPayment: 10 }

  it('is High with 2 or more missed instalments, whatever else is true', () => {
    expect(riskLevel({ ...ok, missedInstalments: 2, daysOverdue: 1 })).toBe('high')
    expect(riskLevel({ ...ok, missedInstalments: 3, percentPaid: 85 })).toBe('high')
  })

  it('is Low when over 80% is paid and nothing is missed, even after a long gap', () => {
    expect(riskLevel({ ...ok, percentPaid: 81, daysSinceLastPayment: 90 })).toBe('low')
  })

  it('is Low for a lay-by that is on track', () => {
    expect(riskLevel(ok)).toBe('low')
  })

  it('is Medium for one missed instalment that is only a few days late', () => {
    expect(riskLevel({ ...ok, missedInstalments: 1, daysOverdue: 3 })).toBe('medium')
  })

  it('is High when only the deposit was paid and the first instalment is missed (first payment default)', () => {
    expect(riskLevel({ daysOverdue: 3, missedInstalments: 1, percentPaid: 10, daysSinceLastPayment: 33 })).toBe('high')
  })

  it('is High for one missed instalment that is weeks late', () => {
    expect(riskLevel({ ...ok, missedInstalments: 1, daysOverdue: 20 })).toBe('high')
  })

  it('is Medium when nothing is missed but there has been no payment for a while', () => {
    expect(riskLevel({ ...ok, daysSinceLastPayment: 50 })).toBe('medium')
  })

  it('treats a small amount paid as extra risk only when something is already wrong', () => {
    expect(riskLevel({ ...ok, percentPaid: 10 })).toBe('low')
    expect(riskLevel({ ...ok, percentPaid: 10, daysSinceLastPayment: 50, missedInstalments: 1, daysOverdue: 2 })).toBe('high')
  })
})

describe('riskScore', () => {
  it('only scores active lay-bys', () => {
    expect(riskScore(layby([deposit], { status: 'completed' }), '2026-11-24')).toBeNull()
    expect(riskScore(layby([deposit], { status: 'cancelled' }), '2026-11-24')).toBeNull()
  })

  it('gives the level and the reasons behind it', () => {
    expect(riskScore(layby([deposit]), '2026-11-24')).toEqual({
      level: 'high',
      reasons: ['2 instalments missed', '54 days overdue', 'No payment in 84 days', 'Only 10% paid'],
    })
  })

  it('gives no reasons when the risk is low', () => {
    expect(riskScore(layby([deposit], { instalments: [] }), '2026-09-10')).toEqual({ level: 'low', reasons: [] })
  })

  it('gives the same answer for the same inputs every time', () => {
    const input = layby([deposit, paid(300, '2026-10-01')])
    expect(riskScore(input, '2026-11-24')).toEqual(riskScore(input, '2026-11-24'))
  })
})
