import DashboardShell from '../../components/DashboardShell'

// placeholder customer home: the real lay-by list comes in M3
function CustomerHome() {
  return (
    <DashboardShell title="My lay-bys">
      <div className="rounded-2xl bg-white p-6 text-gray-700 shadow-sm">
        You don't have any lay-bys yet. When a shop starts a lay-by for you, it will show up here.
      </div>
    </DashboardShell>
  )
}

export default CustomerHome
