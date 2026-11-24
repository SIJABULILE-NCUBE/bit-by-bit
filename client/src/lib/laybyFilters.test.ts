import { describe, it, expect } from 'vitest'
import { filterLaybys } from './laybyFilters'
import { makeLayby } from '../test/fixtures'

const thandi = makeLayby({ id: 'a' })
const late = makeLayby({ id: 'b', overdue: true, customer: { ...thandi.customer, fullName: 'Vusi Cele', email: 'vusi@example.com' } })
const paid = makeLayby({ id: 'c', status: 'completed' })
const gone = makeLayby({ id: 'd', status: 'collected' })
const stopped = makeLayby({ id: 'e', status: 'cancelled' })
const all = [thandi, late, paid, gone, stopped]

const ids = (list: { id: string }[]) => list.map((l) => l.id)

describe('filterLaybys', () => {
  it('shows everything by default', () => {
    expect(ids(filterLaybys(all, 'all', ''))).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('filters by status, with overdue as its own group', () => {
    expect(ids(filterLaybys(all, 'active', ''))).toEqual(['a', 'b'])
    expect(ids(filterLaybys(all, 'overdue', ''))).toEqual(['b'])
    expect(ids(filterLaybys(all, 'ready', ''))).toEqual(['c'])
    expect(ids(filterLaybys(all, 'collected', ''))).toEqual(['d'])
    expect(ids(filterLaybys(all, 'cancelled', ''))).toEqual(['e'])
  })

  it('searches customer names and emails, ignoring capitals and extra spaces', () => {
    expect(ids(filterLaybys(all, 'all', '  vusi '))).toEqual(['b'])
    expect(ids(filterLaybys(all, 'all', 'VUSI@example'))).toEqual(['b'])
    expect(ids(filterLaybys(all, 'active', 'thandi'))).toEqual(['a'])
  })
})
