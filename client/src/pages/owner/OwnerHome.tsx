import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { getDashboard } from '../../lib/api'
import { formatMoney } from '../../lib/money'
import type { Dashboard, LaybySummary } from '../../types'

type DashboardState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: Dashboard }

// one of the four number cards; the whole card is a link to the right list
function StatCard({ to, count, label, tone }: { to: string; count: number; label: string; tone: string }) {
  return (
    <Link to={to} className="rounded-2xl bg-white p-5 shadow-sm hover:ring-2 hover:ring-brand">
      <span className={`block text-3xl font-extrabold ${tone}`}>{count}</span>{' '}
      <span className="block text-sm font-semibold text-gray-700">{label}</span>
    </Link>
  )
}

// a lay-by in the "Needs attention" list
function AttentionRow({ layby, note }: { layby: LaybySummary; note: string }) {
  return (
    <li className="relative flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
      <span className="min-w-0">
        <Link to={`/owner/laybys/${layby.id}`} className="block truncate font-semibold after:absolute after:inset-0">
          {layby.itemName}
        </Link>
        <span className="block truncate text-sm text-gray-600">
          {layby.customer.fullName ?? layby.customer.email} · {note}
        </span>
      </span>
      <StatusBadge layby={layby} />
    </li>
  )
}

// the owner's home page, based on my "7. Owner dashboard" Stitch screen
// every number comes from GET /api/dashboard (the real database)
function OwnerHome() {
  const { session } = useAuth()
  const token = session?.access_token
  const [state, setState] = useState<DashboardState>({ status: 'loading' })

  useEffect(() => {
    if (!token) return
    let cancelled = false
    getDashboard(token)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <DashboardShell title="Shop dashboard">
      {state.status === 'loading' && <p className="text-gray-600">Loading your dashboard…</p>}
      {state.status === 'error' && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          We couldn't load your dashboard. Please refresh the page.
        </p>
      )}

      {state.status === 'ready' && (
        <div className="space-y-6">
          {state.data.shop && (
            <p className="text-gray-700">
              <span aria-hidden>🏪 </span>
              {state.data.shop.name}
              {state.data.shop.area ? `, ${state.data.shop.area}` : ''}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            {/* the big green "how much is still owed to me" card */}
            <section className="rounded-2xl bg-brand p-6 text-white shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-gold">Total outstanding</p>
              <p className="mt-2 text-4xl font-extrabold">{formatMoney(state.data.totals.totalOutstanding)}</p>
              <p className="mt-2 text-sm text-white/80">Still to be paid on your active lay-bys</p>
            </section>
            <Link
              to="/owner/laybys/new"
              className="flex items-center justify-center rounded-2xl bg-gold p-6 text-lg font-bold text-brand-dark shadow-sm hover:brightness-95"
            >
              + New lay-by
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard to="/owner/laybys" count={state.data.totals.active} label="Active lay-bys" tone="text-brand" />
            <StatCard
              to="/owner/payments"
              count={state.data.totals.paymentsToReview}
              label="Payments to review"
              tone="text-brand-dark"
            />
            <StatCard to="/owner/laybys" count={state.data.totals.overdue} label="Overdue" tone="text-red-700" />
            <StatCard
              to="/owner/laybys"
              count={state.data.totals.readyToCollect}
              label="Ready to collect"
              tone="text-brand"
            />
          </div>

          <section aria-label="Needs attention" className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">Needs attention today</h2>
            {state.data.overdueLaybys.length === 0 && state.data.readyLaybys.length === 0 ? (
              <p className="mt-3 text-gray-700">Nothing needs your attention right now. Everyone is on track.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {state.data.overdueLaybys.map((layby) => (
                  <AttentionRow key={layby.id} layby={layby} note={`owes ${formatMoney(layby.nextDue?.amount ?? 0)}`} />
                ))}
                {state.data.readyLaybys.map((layby) => (
                  <AttentionRow key={layby.id} layby={layby} note="paid up, ready to collect" />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </DashboardShell>
  )
}

export default OwnerHome
