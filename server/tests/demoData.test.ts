import { describe, it, expect } from 'vitest'
import { demoLaybys } from '../scripts/demoData.js'
import { isCompleted, isOverdue, toCents } from '../src/services/laybyMath.js'

const today = '2026-11-24'

describe('demoLaybys (the seed data)', () => {
  const laybys = demoLaybys(today)
  const byName = (name: string) => laybys.find((l) => l.itemName === name)!

  it('makes three demo lay-bys: on track, overdue and completed', () => {
    expect(laybys.map((l) => l.label)).toEqual(['on track', 'overdue', 'completed'])
  })

  it('every schedule adds up exactly to the price', () => {
    for (const l of laybys) {
      const total = toCents(l.deposit) + l.instalments.reduce((sum, i) => sum + toCents(i.amount), 0)
      expect(total).toBe(toCents(l.price))
    }
  })

  it('the on-track one is not overdue and has a slip waiting for review', () => {
    const l = byName('School blazer + 2 shirts')
    expect(l.status).toBe('active')
    expect(isOverdue(l, l.instalments, l.payments, today)).toBe(false)
    expect(l.payments.filter((p) => p.status === 'pending')).toHaveLength(1)
    expect(l.payments.find((p) => p.status === 'pending')!.withProof).toBe(true)
  })

  it('the overdue one really is overdue, with 2 instalments missed', () => {
    const l = byName('Winter school jacket')
    expect(l.status).toBe('active')
    expect(isOverdue(l, l.instalments, l.payments, today)).toBe(true)
    expect(l.instalments.filter((i) => i.dueDate < today)).toHaveLength(2)
  })

  it('the completed one is fully paid by confirmed payments', () => {
    const l = byName('School shoes + backpack')
    expect(l.status).toBe('completed')
    expect(isCompleted(l.price, l.payments)).toBe(true)
  })

  it('never puts a payment in the future', () => {
    for (const l of laybys) {
      for (const p of l.payments) expect(p.date <= today).toBe(true)
    }
  })
})
