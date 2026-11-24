import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleLabel } from '../lib/roles'

// the menu links for each kind of user
const navLinks = {
  owner: [
    { to: '/owner', label: 'Dashboard' },
    { to: '/owner/laybys', label: 'Lay-bys' },
  ],
  customer: [{ to: '/customer', label: 'My lay-bys' }],
}

type DashboardShellProps = {
  title: string
  children: ReactNode
  // the "Hi, name" line only shows on the home pages
  showGreeting?: boolean
}

// the frame around every logged-in page: logo, menu, who's logged in, and a log out button
function DashboardShell({ title, children, showGreeting = true }: DashboardShellProps) {
  const { profile, logOut } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
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

      {profile && navLinks[profile.role].length > 1 && (
        <nav aria-label="Main" className="mx-auto flex max-w-5xl gap-2 px-5 pb-4">
          {navLinks[profile.role].map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-semibold ${
                  isActive ? 'bg-brand text-white' : 'bg-white text-brand shadow-sm hover:bg-brand-light'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}

      <main className="mx-auto max-w-5xl px-5 pb-12">
        <h1 className="text-3xl font-extrabold text-brand">{title}</h1>
        {showGreeting && profile && (
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
