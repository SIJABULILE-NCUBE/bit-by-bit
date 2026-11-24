import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeFor } from '../lib/roles'
import type { Role } from '../types'

// wraps pages that need a logged-in user with a certain role
// logged out → log in page; wrong role → their own home page
function ProtectedRoute({ role }: { role: Role }) {
  const { session, profile, loading, profileError, logOut } = useAuth()

  if (loading) {
    return <p className="p-8 text-center text-gray-600">Loading…</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // logged in, but my server couldn't tell me who they are
  if (profileError || !profile) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p role="alert" className="text-red-700">
          {profileError ?? 'Could not load your profile.'}
        </p>
        <button
          type="button"
          onClick={() => void logOut()}
          className="mt-4 rounded-xl border-2 border-brand px-6 py-3 font-semibold text-brand"
        >
          Log out
        </button>
      </div>
    )
  }

  if (profile.role !== role) {
    return <Navigate to={homeFor(profile.role)} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
