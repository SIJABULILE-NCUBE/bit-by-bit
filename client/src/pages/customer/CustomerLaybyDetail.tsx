import { Link, useParams } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell'
import LaybyProgress from '../../components/LaybyProgress'
import StatusBadge from '../../components/StatusBadge'
import { useLayby } from '../../hooks/useLayby'
import { formatDate, formatMoney } from '../../lib/money'
import type { PaymentItem, ScheduledInstalment } from '../../types'

// how each instalment status looks
const instalmentStyles: Record<ScheduledInstalment['status'], { label: string; dot: string; row: string }> = {
  paid: { label: 'Paid', dot: 'bg-brand text-white', row: 'bg-gray-50' },
  next: { label: 'Next', dot: 'bg-gold text-brand-dark', row: 'bg-gold-light' },
  upcoming: { label: 'Upcoming', dot: 'bg-gray-200 text-gray-700', row: 'bg-gray-50' },
  overdue: { label: 'Overdue', dot: 'bg-red-600 text-white', row: 'bg-red-50' },
  unpaid: { label: 'Not paid', dot: 'bg-gray-200 text-gray-700', row: 'bg-gray-50' },
}

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

// one lay-by with its schedule and payment history, based on my "5. Customer lay-by detail" Stitch screen
function CustomerLaybyDetail() {
  const { id } = useParams()
  const state = useLayby(id)

  const backLink = (
    <Link to="/customer" className="text-sm font-semibold text-brand hover:underline">
      ← Back to my lay-bys
    </Link>
  )

  if (state.status !== 'ready') {
    return (
      <DashboardShell title="Lay-by details" showGreeting={false}>
        {backLink}
        <div className="mt-4">
          {state.status === 'loading' && <p className="text-gray-600">Loading…</p>}
          {state.status === 'not-found' && (
            <p className="rounded-2xl bg-white p-6 text-gray-700 shadow-sm">
              We couldn't find that lay-by. It may have been removed, or it belongs to another account.
            </p>
          )}
          {state.status === 'error' && (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
              {state.message}
            </p>
          )}
        </div>
      </DashboardShell>
    )
  }

  const { layby } = state
  const lastSeq = layby.schedule.length

  return (
    <DashboardShell title="Lay-by details" showGreeting={false}>
      {backLink}

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* the item and how far along I am */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-600">
              <span aria-hidden>🏪 </span>
              {layby.shop.name}
              {layby.shop.area ? `, ${layby.shop.area}` : ''}
            </p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <h2 className="text-2xl font-bold">{layby.itemName}</h2>
              <StatusBadge layby={layby} />
            </div>

            <div className="mt-4">
              <LaybyProgress layby={layby} />
            </div>

            {layby.balance > 0 && layby.status === 'active' && (
              <p className="mt-4 inline-block rounded-full bg-gold-light px-4 py-2 text-sm font-semibold text-brand-dark">
                {formatMoney(layby.balance)} left to own it!
              </p>
            )}
            {layby.status === 'completed' && (
              <p className="mt-4 rounded-xl bg-gold-light p-4 font-semibold text-brand-dark">
                🎉 It's yours! Collect it at {layby.shop.name}.
              </p>
            )}
          </section>

          {/* the monthly instalments */}
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
        </div>

        {/* every payment, newest first */}
        <section aria-label="Payment history" className="h-fit rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Payment history</h2>
          <ul className="mt-4 space-y-2">
            {layby.payments.map((payment) => {
              const status = paymentStatusStyles[payment.status]
              return (
                <li
                  key={payment.id}
                  className={`rounded-xl p-3 ${payment.status === 'rejected' ? 'bg-red-50' : 'bg-gray-50'}`}
                >
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
                  {payment.rejectReason && (
                    <p className="mt-2 text-sm text-red-800">Reason: {payment.rejectReason}</p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </DashboardShell>
  )
}

export default CustomerLaybyDetail
