import { Link, useLocation } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell'
import LaybyProgress from '../../components/LaybyProgress'
import StatusBadge from '../../components/StatusBadge'
import { useLaybys } from '../../hooks/useLaybys'

// the owner's list of every lay-by at their shop, based on my "8. All lay-bys" Stitch screen
function OwnerLaybys() {
  const state = useLaybys()
  // the New lay-by page sends me here with the item name, so I can say it worked
  const created = (useLocation().state as { created?: string } | null)?.created

  return (
    <DashboardShell title="All lay-bys" showGreeting={false}>
      {created && (
        <p role="status" className="mb-4 rounded-xl bg-brand-light p-4 font-medium text-brand">
          ✓ Lay-by for {created} created.
        </p>
      )}

      <Link
        to="/owner/laybys/new"
        className="inline-block rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
      >
        + New lay-by
      </Link>

      <div className="mt-6">
        {state.status === 'loading' && <p className="text-gray-600">Loading your lay-bys…</p>}

        {state.status === 'error' && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
            {state.message}
          </p>
        )}

        {state.status === 'ready' && state.laybys.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-gray-700 shadow-sm">
            No lay-bys yet. Tap “New lay-by” to start one for a customer.
          </p>
        )}

        {state.status === 'ready' && state.laybys.length > 0 && (
          <ul className="grid gap-4 md:grid-cols-2">
            {state.laybys.map((layby) => (
              <li key={layby.id} className="relative rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">
                      {/* the whole card is clickable through this link */}
                      <Link to={`/owner/laybys/${layby.id}`} className="after:absolute after:inset-0 hover:underline">
                        {layby.itemName}
                      </Link>
                    </h2>
                    <p className="truncate text-sm text-gray-600">{layby.customer.fullName ?? layby.customer.email}</p>
                  </div>
                  <StatusBadge layby={layby} />
                </div>
                <div className="mt-4">
                  <LaybyProgress layby={layby} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  )
}

export default OwnerLaybys
