import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import TextField from '../../components/TextField'
import { homeFor } from '../../lib/roles'
import { validateLogIn, type FieldErrors, type LogInValues } from '../../lib/validation'

// Supabase's error messages are a bit techy, so I swap the common ones for friendlier words
function friendlyError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return 'Your email or password is wrong. Please try again.'
  }
  if (/email not confirmed/i.test(message)) {
    return 'Please confirm your email first (check your inbox for our link).'
  }
  return message
}

// log in page, based on my "3. Log in" Stitch screen
function LogIn() {
  const { profile, logIn } = useAuth()
  const [values, setValues] = useState<LogInValues>({ email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors<LogInValues>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // once I know who they are, send them to their own dashboard
  if (profile) {
    return <Navigate to={homeFor(profile.role)} replace />
  }

  function update(field: keyof LogInValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const found = validateLogIn(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      await logIn(values.email.trim(), values.password)
      // the redirect above happens as soon as their profile has loaded
    } catch (err) {
      setFormError(friendlyError(err instanceof Error ? err.message : 'Something went wrong, please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-brand">
          Bit by Bit <span aria-hidden>🛍️</span>
        </Link>
        <span className="rounded-full bg-gold-light px-3 py-1 text-xs font-semibold text-brand-dark">
          Safe &amp; debt-free
        </span>
      </div>

      <h1 className="mt-8 text-4xl font-extrabold text-gray-900">Welcome back!</h1>
      <p className="mt-2 text-lg text-gray-700">Log in to track your lay-bys and make payments.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-6 rounded-2xl bg-white p-6 shadow-sm">
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
        />

        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => update('password', e.target.value)}
          error={errors.password}
        />

        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand py-4 text-lg font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-8 text-center text-gray-700">
        Don't have an account?{' '}
        <Link to="/signup" className="font-bold text-brand hover:underline">
          Sign up now →
        </Link>
      </p>
    </main>
  )
}

export default LogIn
