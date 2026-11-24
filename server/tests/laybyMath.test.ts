import { describe, it, expect } from 'vitest'
import {
  buildSchedule,
  validateLaybyTerms,
  paidAmount,
  balance,
  progressPercent,
  isCompleted,
  isOverdue,
  nextDue,
  todayInSA,
  scheduleWithStatus,
  type Instalment,
  type PaymentLike,
} from '../src/services/laybyMath.js'

// adds up instalment amounts in cents, so my test doesn't have float problems
function totalCents(instalments: Instalment[]) {
  return instalments.reduce((sum, i) => sum + Math.round(i.amount * 100), 0)
}

const confirmed = (amount: number): PaymentLike => ({ amount, status: 'confirmed' })
const pending = (amount: number): PaymentLike => ({ amount, status: 'pending' })
const rejected = (amount: number): PaymentLike => ({ amount, status: 'rejected' })

describe('validateLaybyTerms', () => {
  it('accepts a normal lay-by', () => {
    expect(validateLaybyTerms({ price: 1000, deposit: 100, termMonths: 3 })).toEqual([])
  })

  it('accepts a deposit of exactly 10%', () => {
    expect(validateLaybyTerms({ price: 1250, deposit: 125, termMonths: 6 })).toEqual([])
  })

  it('rejects a deposit under 10%', () => {
    const errors = validateLaybyTerms({ price: 1000, deposit: 99.99, termMonths: 3 })
    expect(errors).toEqual(['The deposit must be at least 10% of the price (R 100,00)'])
  })

  it('shows the minimum deposit in SA money format', () => {
    const errors = validateLaybyTerms({ price: 12500, deposit: 1000, termMonths: 3 })
    expect(errors).toEqual(['The deposit must be at least 10% of the price (R 1 250,00)'])
  })

  it('rejects a deposit bigger than the price', () => {
    const errors = validateLaybyTerms({ price: 500, deposit: 600, termMonths: 3 })
    expect(errors).toEqual(["The deposit can't be more than the price"])
  })

  it('rejects a term outside 1 to 6 whole months', () => {
    const message = 'The term must be 1 to 6 whole months'
    expect(validateLaybyTerms({ price: 1000, deposit: 100, termMonths: 0 })).toEqual([message])
    expect(validateLaybyTerms({ price: 1000, deposit: 100, termMonths: 7 })).toEqual([message])
    expect(validateLaybyTerms({ price: 1000, deposit: 100, termMonths: 2.5 })).toEqual([message])
  })

  it('rejects a price of R0 or less', () => {
    expect(validateLaybyTerms({ price: 0, deposit: 0, termMonths: 3 })).toContain(
      'The price must be more than R0',
    )
  })

  it('rejects amounts with more than 2 decimals', () => {
    expect(validateLaybyTerms({ price: 100.001, deposit: 20, termMonths: 3 })).toContain(
      'Amounts can only have 2 decimals (cents)',
    )
  })

  it('rejects a balance too small to split over the term', () => {
    // R0.05 left to pay can't become 6 instalments of at least 1c each
    expect(validateLaybyTerms({ price: 10, deposit: 9.95, termMonths: 6 })).toContain(
      'The amount left after the deposit is too small to split over 6 months',
    )
  })
})

describe('buildSchedule', () => {
  it('splits the balance evenly when it divides nicely', () => {
    expect(buildSchedule(1000, 100, 3, '2026-11-24')).toEqual([
      { seq: 1, dueDate: '2026-12-24', amount: 300 },
      { seq: 2, dueDate: '2027-01-24', amount: 300 },
      { seq: 3, dueDate: '2027-02-24', amount: 300 },
    ])
  })

  it('puts the rounding on the last instalment', () => {
    // R850 over 6 months = R141.666..., so 5 x R141.66 and the last one is R141.70
    const schedule = buildSchedule(1000, 150, 6, '2026-11-24')
    expect(schedule.map((i) => i.amount)).toEqual([141.66, 141.66, 141.66, 141.66, 141.66, 141.7])
  })

  it('always adds up to exactly price minus deposit', () => {
    const cases: [number, number, number][] = [
      [999.99, 100, 6],
      [1250, 125, 4],
      [349.5, 35, 3],
      [100, 10, 1],
      [12345.67, 1234.57, 5],
    ]
    for (const [price, deposit, term] of cases) {
      const schedule = buildSchedule(price, deposit, term, '2026-11-24')
      expect(schedule).toHaveLength(term)
      expect(totalCents(schedule)).toBe(Math.round(price * 100) - Math.round(deposit * 100))
    }
  })

  it('keeps month-end due dates sensible', () => {
    // 31 Jan + 1 month is the last day of Feb, but March goes back to the 31st
    const dates = buildSchedule(400, 100, 3, '2026-01-31').map((i) => i.dueDate)
    expect(dates).toEqual(['2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('handles leap years', () => {
    expect(buildSchedule(200, 100, 1, '2028-01-31')[0].dueDate).toBe('2028-02-29')
  })

  it('has no instalments when the deposit pays the full price', () => {
    expect(buildSchedule(500, 500, 3, '2026-11-24')).toEqual([])
  })

  it('refuses to build a schedule for invalid terms', () => {
    expect(() => buildSchedule(1000, 50, 3, '2026-11-24')).toThrow(/at least 10%/)
    expect(() => buildSchedule(1000, 100, 7, '2026-11-24')).toThrow(/1 to 6/)
  })

  it('refuses a start date that is not YYYY-MM-DD', () => {
    expect(() => buildSchedule(1000, 100, 3, '24/11/2026')).toThrow(/YYYY-MM-DD/)
  })
})

describe('paid amount and balance', () => {
  const payments = [confirmed(100), confirmed(250.5), pending(300), rejected(80)]

  it('only counts confirmed payments as paid', () => {
    expect(paidAmount(payments)).toBe(350.5)
  })

  it('works out the balance from confirmed payments only', () => {
    expect(balance(1000, payments)).toBe(649.5)
  })

  it('never shows a negative balance', () => {
    expect(balance(100, [confirmed(120)])).toBe(0)
  })

  it('avoids floating point mistakes', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in JavaScript
    expect(paidAmount([confirmed(0.1), confirmed(0.2)])).toBe(0.3)
    expect(balance(1, [confirmed(0.1), confirmed(0.2)])).toBe(0.7)
  })
})

describe('progressPercent', () => {
  it('rounds down so it only shows 100% when fully paid', () => {
    expect(progressPercent(1000, [confirmed(999.99)])).toBe(99)
    expect(progressPercent(1000, [confirmed(1000)])).toBe(100)
  })

  it('ignores pending payments and caps at 100', () => {
    expect(progressPercent(1000, [confirmed(250), pending(500)])).toBe(25)
    expect(progressPercent(100, [confirmed(150)])).toBe(100)
  })
})

describe('isCompleted', () => {
  it('is completed only when confirmed payments reach the price', () => {
    expect(isCompleted(1000, [confirmed(100), confirmed(900)])).toBe(true)
    expect(isCompleted(1000, [confirmed(100), confirmed(899.99)])).toBe(false)
    expect(isCompleted(1000, [confirmed(100), pending(900)])).toBe(false)
  })
})

describe('isOverdue and nextDue', () => {
  // R1000 item, R100 deposit, 3 x R300 on 24 Dec, 24 Jan, 24 Feb
  const deposit = 100
  const schedule = buildSchedule(1000, deposit, 3, '2026-11-24')
  const layby = { deposit, status: 'active' as const }

  it('is not overdue before the first due date', () => {
    expect(isOverdue(layby, schedule, [confirmed(100)], '2026-12-01')).toBe(false)
  })

  it('is not overdue on the due date itself', () => {
    expect(isOverdue(layby, schedule, [confirmed(100)], '2026-12-24')).toBe(false)
  })

  it('is overdue the day after an unpaid due date', () => {
    expect(isOverdue(layby, schedule, [confirmed(100)], '2026-12-25')).toBe(true)
  })

  it('is not overdue when the instalment was paid', () => {
    expect(isOverdue(layby, schedule, [confirmed(100), confirmed(300)], '2026-12-25')).toBe(false)
  })

  it('still counts as overdue while the payment is only pending', () => {
    expect(isOverdue(layby, schedule, [confirmed(100), pending(300)], '2026-12-25')).toBe(true)
  })

  it('is overdue when only part of the instalment was paid', () => {
    expect(isOverdue(layby, schedule, [confirmed(100), confirmed(299.99)], '2026-12-25')).toBe(true)
  })

  it('is never overdue once a lay-by is not active', () => {
    for (const status of ['completed', 'collected', 'cancelled'] as const) {
      expect(isOverdue({ deposit, status }, schedule, [confirmed(100)], '2027-06-01')).toBe(false)
    }
  })

  it('gives the next due date and what is still owed on it', () => {
    expect(nextDue(deposit, schedule, [confirmed(100)])).toEqual({ dueDate: '2026-12-24', amount: 300 })
    // paying extra early eats into the next instalment
    expect(nextDue(deposit, schedule, [confirmed(100), confirmed(400)])).toEqual({
      dueDate: '2027-01-24',
      amount: 200,
    })
  })

  it('has no next due date when everything is paid', () => {
    expect(nextDue(deposit, schedule, [confirmed(1000)])).toBeNull()
  })
})

describe('todayInSA', () => {
  it('uses South African time, which is 2 hours ahead of UTC', () => {
    // 23:30 UTC on the 23rd is already 01:30 on the 24th in Johannesburg
    expect(todayInSA(new Date('2026-11-23T23:30:00Z'))).toBe('2026-11-24')
    expect(todayInSA(new Date('2026-11-23T12:00:00Z'))).toBe('2026-11-23')
  })
})

describe('scheduleWithStatus', () => {
  // R1000 item, R100 deposit, 3 x R300 on 24 Dec, 24 Jan, 24 Feb
  const deposit = 100
  const schedule = buildSchedule(1000, deposit, 3, '2026-11-24')
  const statuses = (payments: PaymentLike[], today: string, active = true) =>
    scheduleWithStatus(deposit, schedule, payments, today, active).map((i) => i.status)

  it('marks the first unpaid instalment as next and the rest as upcoming', () => {
    expect(statuses([confirmed(100)], '2026-11-30')).toEqual(['next', 'upcoming', 'upcoming'])
  })

  it('marks covered instalments as paid', () => {
    expect(statuses([confirmed(100), confirmed(300)], '2026-12-30')).toEqual(['paid', 'next', 'upcoming'])
  })

  it('marks unpaid instalments past their due date as overdue', () => {
    expect(statuses([confirmed(100)], '2027-01-25')).toEqual(['overdue', 'overdue', 'next'])
  })

  it('shows how much of each instalment is covered', () => {
    const result = scheduleWithStatus(deposit, schedule, [confirmed(100), confirmed(450)], '2026-12-01', true)
    expect(result.map((i) => i.paid)).toEqual([300, 150, 0])
    expect(result.map((i) => i.status)).toEqual(['paid', 'next', 'upcoming'])
  })

  it('ignores pending payments', () => {
    expect(statuses([confirmed(100), pending(300)], '2026-12-01')).toEqual(['next', 'upcoming', 'upcoming'])
  })

  it('says unpaid (not overdue) once a lay-by is no longer active', () => {
    expect(statuses([confirmed(100), confirmed(300)], '2027-06-01', false)).toEqual(['paid', 'unpaid', 'unpaid'])
  })
})
