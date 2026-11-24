import DashboardShell from '../../components/DashboardShell'

// placeholder owner home: the real dashboard cards come in M5
function OwnerHome() {
  return (
    <DashboardShell title="Shop dashboard">
      <div className="rounded-2xl bg-white p-6 text-gray-700 shadow-sm">
        Your totals, overdue lay-bys and payments to review will show up here.
      </div>
    </DashboardShell>
  )
}

export default OwnerHome
