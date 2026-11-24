import type { Risk } from '../types'

const styles = {
  low: { label: 'Low risk', className: 'bg-brand-light text-brand' },
  medium: { label: 'Medium risk', className: 'bg-gold-light text-brand-dark' },
  high: { label: 'High risk', className: 'bg-red-600 text-white' },
}

// the coloured Low / Medium / High badge the owner sees on each active lay-by
// the reasons (like "2 instalments missed") show when you hover or long-press it
function RiskBadge({ risk }: { risk: Risk | null | undefined }) {
  if (!risk) return null
  const style = styles[risk.level]
  const why = risk.reasons.join(', ') || 'On track'

  return (
    <span title={why} className={`rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  )
}

export default RiskBadge
