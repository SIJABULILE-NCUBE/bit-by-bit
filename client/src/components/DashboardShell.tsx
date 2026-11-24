import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { roleLabel } from '../lib/roles'

// the frame around both dashboards: logo, who's logged in, and a log out button
function DashboardShell({ title, children }: { title: string; children: ReactNode }) {
  const { profile, logOut } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <span className="text-xl font-bold text-brand">
          Bit by Bit <span aria-hidden>🛍️</span>
        </span>
        <button
          type="button"
          onClick={() => void logOut()}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-light"
        >
          Log out
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-12">
        <h1 className="text-3xl font-extrabold text-brand">{title}</h1>
        {profile && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-gray-700">Hi, {profile.fullName ?? profile.email}</p>
            <span data-role className="rounded-full bg-gold-light px-3 py-1 text-xs font-semibold text-brand-dark">
              {roleLabel(profile.role)}
            </span>
          </div>
        )}
        <div className="mt-6">{children}</div>
      </main>
    </div>
  )
}

export default DashboardShell
