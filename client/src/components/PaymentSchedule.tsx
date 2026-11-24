import { formatDate, formatMoney } from '../lib/money'
import type { LaybyDetail, ScheduledInstalment } from '../types'

// how each instalment status looks
const instalmentStyles: Record<ScheduledInstalment['status'], { label: string; dot: string; row: string }> = {
  paid: { label: 'Paid', dot: 'bg-brand text-white', row: 'bg-gray-50' },
  next: { label: 'Next', dot: 'bg-gold text-brand-dark', row: 'bg-gold-light' },
  upcoming: { label: 'Upcoming', dot: 'bg-gray-200 text-gray-700', row: 'bg-gray-50' },
  overdue: { label: 'Overdue', dot: 'bg-red-600 text-white', row: 'bg-red-50' },
  unpaid: { label: 'Not paid', dot: 'bg-gray-200 text-gray-700', row: 'bg-gray-50' },
}

// the monthly instalments with paid / next / overdue (used by the customer AND the owner detail pages)
function PaymentSchedule({ layby }: { layby: LaybyDetail }) {
  const lastSeq = layby.schedule.length

  return (
    <section aria-label="Payment schedule" className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Payment schedule</h2>
      <p className="text-sm text-gray-600">
        Deposit of {formatMoney(layby.deposit)}, then {layby.termMonths} monthly payment
        {layby.termMonths === 1 ? '' : 's'}
      </p>
      {layby.schedule.length === 0 ? (
        <p className="mt-4 text-gray-700">The deposit paid for everything, so there are no instalments.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {layby.schedule.map((instalment) => {
            const style = instalmentStyles[instalment.status]
            const isFinal = instalment.seq === lastSeq
            return (
              <li key={instalment.seq} className={`flex items-center gap-3 rounded-xl p-3 ${style.row}`}>
                <span
                  aria-hidden
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${style.dot}`}
                >
                  {instalment.status === 'paid' ? '✓' : instalment.seq}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    Instalment {instalment.seq}
                    {isFinal ? ' (Final)' : ''}
                  </span>
                  <span className="block text-sm text-gray-600">Due {formatDate(instalment.dueDate)}</span>
                  {instalment.paid > 0 && instalment.status !== 'paid' && (
                    <span className="block text-sm text-gray-600">{formatMoney(instalment.paid)} paid so far</span>
                  )}
                </span>
                <span className="text-right">
                  <span className="block font-semibold">{formatMoney(instalment.amount)}</span>
                  <span className="block text-xs font-semibold">{style.label}</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default PaymentSchedule
