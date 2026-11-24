import { Link } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell'

// owner home: the real dashboard cards come in M5, for now it links to the lay-by pages
function OwnerHome() {
  return (
    <DashboardShell title="Shop dashboard">
      <div className="rounded-2xl bg-white p-6 text-gray-700 shadow-sm">
        <p>Your totals, overdue lay-bys and payments to review will show up here.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/owner/laybys/new"
            className="rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            + New lay-by
          </Link>
          <Link
            to="/owner/laybys"
            className="rounded-xl border-2 border-brand px-5 py-3 font-semibold text-brand hover:bg-brand-light"
          >
            See all lay-bys
          </Link>
        </div>
      </div>
    </DashboardShell>
  )
}

export default OwnerHome
