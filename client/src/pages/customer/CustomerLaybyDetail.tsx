import { Link, useLocation, useParams } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell'
import LaybyProgress from '../../components/LaybyProgress'
import StatusBadge from '../../components/StatusBadge'
import { useLayby } from '../../hooks/useLayby'
import { formatMoney } from '../../lib/money'
import PaymentHistory from '../../components/PaymentHistory'
import PaymentSchedule from '../../components/PaymentSchedule'

// one lay-by with its schedule and payment history, based on my "5. Customer lay-by detail" Stitch screen
function CustomerLaybyDetail() {
  const { id } = useParams()
  const state = useLayby(id)
  // the upload page sends me back here after a slip is sent
  const sent = (useLocation().state as { sent?: boolean } | null)?.sent

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

  return (
    <DashboardShell title="Lay-by details" showGreeting={false}>
      {backLink}

      {sent && (
        <p role="status" className="mt-4 rounded-xl bg-brand-light p-4 font-medium text-brand">
          ✓ Your proof of payment was sent to {layby.shop.name}. It counts once they confirm it.
        </p>
      )}

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
            {layby.balance > 0 && layby.status === 'active' && (
              <Link
                to={`/customer/laybys/${layby.id}/pay`}
                className="mt-4 block rounded-xl bg-brand px-6 py-3 text-center font-semibold text-white hover:bg-brand-dark"
              >
                Upload proof of payment
              </Link>
            )}
            {layby.status === 'completed' && (
              <p className="mt-4 rounded-xl bg-gold-light p-4 font-semibold text-brand-dark">
                🎉 It's yours! Collect it at {layby.shop.name}.
              </p>
            )}
          </section>

          <PaymentSchedule layby={layby} />
        </div>

        {/* every payment, newest first */}
        <PaymentHistory payments={layby.payments} />
      </div>
    </DashboardShell>
  )
}

export default CustomerLaybyDetail
