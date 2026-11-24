import { formatDate, formatMoney } from '../lib/money'
import type { PaymentItem } from '../types'

const methodLabels: Record<PaymentItem['method'], string> = {
  deposit: 'Deposit',
  cash: 'Cash at the shop',
  eft: 'EFT',
}

const paymentStatusStyles: Record<PaymentItem['status'], { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-brand-light text-brand' },
  pending: { label: 'Waiting for the shop to check', className: 'bg-gold-light text-brand-dark' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
}

type PaymentHistoryProps = {
  payments: PaymentItem[]
  // owners get a "View proof" button on payments that have a slip
  onViewProof?: (paymentId: string) => void
}

// every payment, newest first (used by the customer AND the owner detail pages)
function PaymentHistory({ payments, onViewProof }: PaymentHistoryProps) {
  return (
    <section aria-label="Payment history" className="h-fit rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Payment history</h2>
      <ul className="mt-4 space-y-2">
        {payments.map((payment) => {
          const status = paymentStatusStyles[payment.status]
          return (
            <li key={payment.id} className={`rounded-xl p-3 ${payment.status === 'rejected' ? 'bg-red-50' : 'bg-gray-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-semibold">{methodLabels[payment.method]}</span>
                  <span className="block text-sm text-gray-600">{formatDate(payment.createdAt)}</span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold">{formatMoney(payment.amount)}</span>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}>
                    {status.label}
                  </span>
                </span>
              </div>
              {payment.rejectReason && <p className="mt-2 text-sm text-red-800">Reason: {payment.rejectReason}</p>}
              {onViewProof && payment.hasProof && (
                <button
                  type="button"
                  onClick={() => onViewProof(payment.id)}
                  className="mt-2 text-sm font-semibold text-brand hover:underline"
                >
                  View proof
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default PaymentHistory
