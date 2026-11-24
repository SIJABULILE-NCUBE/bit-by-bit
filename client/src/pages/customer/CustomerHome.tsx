import { Link } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell'
import LaybyProgress from '../../components/LaybyProgress'
import StatusBadge from '../../components/StatusBadge'
import { useLaybys } from '../../hooks/useLaybys'
import { toCents } from '../../lib/laybyMath'
import { formatDate, formatMoney } from '../../lib/money'
import type { LaybySummary } from '../../types'

// the soonest payment across all my active lay-bys
function soonestDue(laybys: LaybySummary[]) {
  return laybys
    .flatMap((l) => (l.nextDue ? [l.nextDue] : []))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
}

// customer home, based on my "4. Customer my lay-bys" Stitch screen
function CustomerHome() {
  const state = useLaybys()

  return (
    <DashboardShell title="My lay-bys">
      {state.status === 'loading' && <p className="text-gray-600">Loading your lay-bys…</p>}

      {state.status === 'error' && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {state.message}
        </p>
      )}

      {state.status === 'ready' && state.laybys.length === 0 && (
        <div className="rounded-2xl bg-white p-6 text-gray-700 shadow-sm">
          You don't have any lay-bys yet. When a shop starts a lay-by for you, it will show up here.
        </div>
      )}

      {state.status === 'ready' && state.laybys.length > 0 && (
        <>
          <MyProgress laybys={state.laybys} />

          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {state.laybys.map((layby) => (
              <li key={layby.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{layby.itemName}</h2>
                    <p className="truncate text-sm text-gray-600">
                      <span aria-hidden>🏪 </span>
                      {layby.shop.name}
                      {layby.shop.area ? ` (${layby.shop.area})` : ''}
                    </p>
                  </div>
                  <StatusBadge layby={layby} />
                </div>

                <div className="mt-4">
                  <LaybyProgress layby={layby} />
                </div>

                <Link
                  to={`/customer/laybys/${layby.id}`}
                  className="mt-4 inline-block font-semibold text-brand hover:underline"
                >
                  View details →
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardShell>
  )
}

// the green summary box at the top: total paid, how many are active, and the next payment
function MyProgress({ laybys }: { laybys: LaybySummary[] }) {
  // I add up in cents so the total is exact
  const totalPaid = laybys.reduce((sum, l) => sum + toCents(l.paid), 0) / 100
  const active = laybys.filter((l) => l.status === 'active').length
  const next = soonestDue(laybys)

  return (
    <section aria-label="My progress" className="rounded-2xl bg-brand p-5 text-white">
      <p className="text-sm text-brand-light">Total paid so far</p>
      <p className="text-3xl font-extrabold">{formatMoney(totalPaid)}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-brand-dark p-4 text-sm">
        <p>
          <span className="block text-brand-light">Lay-bys</span>
          <span className="font-bold">{active} active</span>
        </p>
        <p>
          <span className="block text-gold">Next payment</span>
          <span className="font-bold">
            {next ? `${formatMoney(next.amount)} (${formatDate(next.dueDate)})` : 'Nothing due'}
          </span>
        </p>
      </div>
    </section>
  )
}

export default CustomerHome
