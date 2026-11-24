import { formatDate, formatMoney } from '../lib/money'
import type { LaybySummary } from '../types'

// "Paid R 400,00 of R 1 000,00", the progress bar, the balance and when the next payment is due
function LaybyProgress({ layby }: { layby: LaybySummary }) {
  const barColour = layby.overdue ? 'bg-red-600' : layby.progress >= 100 ? 'bg-gold' : 'bg-brand'

  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-gray-700">
          Paid {formatMoney(layby.paid)} of {formatMoney(layby.price)}
        </p>
        <p className={`text-lg font-bold ${layby.overdue ? 'text-red-700' : 'text-brand'}`}>{layby.progress}%</p>
      </div>

      <div
        role="progressbar"
        aria-label={`${layby.itemName} paid`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={layby.progress}
        className="mt-2 h-3 rounded-full bg-gray-200"
      >
        <div className={`h-3 rounded-full ${barColour}`} style={{ width: `${layby.progress}%` }} />
      </div>

      <div className="mt-3 flex justify-between text-sm">
        <span className="text-gray-600">Balance</span>
        <span className={`font-semibold ${layby.overdue ? 'text-red-700' : 'text-gray-900'}`}>
          {formatMoney(layby.balance)}
        </span>
      </div>

      {layby.nextDue && (
        <p className="mt-1 text-sm text-gray-600">
          Next: {formatMoney(layby.nextDue.amount)} due {formatDate(layby.nextDue.dueDate)}
        </p>
      )}
    </div>
  )
}

export default LaybyProgress
