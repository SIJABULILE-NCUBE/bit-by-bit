import type { LaybySummary } from '../types'

// the filter buttons on the owner's lay-by list
export const laybyFilters = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'risk', label: 'High risk' },
  { key: 'ready', label: 'Ready to collect' },
  { key: 'collected', label: 'Collected' },
  { key: 'cancelled', label: 'Cancelled' },
] as const

export type LaybyFilterKey = (typeof laybyFilters)[number]['key']

export function isFilterKey(value: string | null): value is LaybyFilterKey {
  return laybyFilters.some((f) => f.key === value)
}

function matchesFilter(layby: LaybySummary, filter: LaybyFilterKey): boolean {
  if (filter === 'all') return true
  if (filter === 'overdue') return layby.overdue
  if (filter === 'risk') return layby.risk?.level === 'high'
  // "ready to collect" = fully paid (my status for that is 'completed')
  if (filter === 'ready') return layby.status === 'completed'
  return layby.status === filter
}

// filter by status, then search the customer's name and email
export function filterLaybys(laybys: LaybySummary[], filter: LaybyFilterKey, search: string): LaybySummary[] {
  const words = search.trim().toLowerCase()
  return laybys.filter((layby) => {
    if (!matchesFilter(layby, filter)) return false
    if (!words) return true
    const who = `${layby.customer.fullName ?? ''} ${layby.customer.email}`.toLowerCase()
    return who.includes(words)
  })
}
