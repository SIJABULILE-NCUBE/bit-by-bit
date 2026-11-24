import type { LaybySummary } from '../types'

// the little coloured label on each lay-by card
// overdue wins over the status, because that's what the owner needs to see first
function StatusBadge({ layby }: { layby: Pick<LaybySummary, 'status' | 'overdue'> }) {
  if (layby.overdue) {
    return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">Overdue</span>
  }

  const styles = {
    active: { label: 'Active', className: 'bg-brand-light text-brand' },
    completed: { label: 'Paid up', className: 'bg-gold-light text-brand-dark' },
    collected: { label: 'Collected', className: 'bg-gray-100 text-gray-700' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
  }[layby.status]

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles.className}`}>{styles.label}</span>
}

export default StatusBadge
