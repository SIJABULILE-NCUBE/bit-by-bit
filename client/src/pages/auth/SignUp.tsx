import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import TextField from '../../components/TextField'
import { homeFor } from '../../lib/roles'
import { normaliseSaPhone, validateSignUp, type FieldErrors, type SignUpValues } from '../../lib/validation'
import type { Role } from '../../types'

// the two role cards at the top of the form
const roleOptions: { value: Role; title: string; text: string; icon: string }[] = [
  {
    value: 'customer',
    title: 'Customer',
    text: 'I want to lay-by and pay off items bit by bit, without debt.',
    icon: '🛍️',
  },
  {
    value: 'owner',
    title: 'Shop owner',
    text: 'I want to sell items on lay-by and manage customer payments.',
    icon: '🏪',
  },
]

const emptyForm: SignUpValues = {
  fullName: '',
  phone: '',
  email: '',
  password: '',
  role: 'customer',
  shopName: '',
  shopArea: '',
}

// sign up page, based on my "2. Sign up (role choice)" Stitch screen
function SignUp() {
  const { profile, signUp } = useAuth()
  const [values, setValues] = useState<SignUpValues>(emptyForm)
  const [errors, setErrors] = useState<FieldErrors<SignUpValues>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // set when Supabase wants them to confirm their email first
  const [sentTo, setSentTo] = useState<string | null>(null)

  // already logged in? go straight to the right dashboard
  if (profile) {
    return <Navigate to={homeFor(profile.role)} replace />
  }

  // updates one field, and clears its error as soon as they start fixing it
  function update(field: keyof SignUpValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const found = validateSignUp(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const isOwner = values.role === 'owner'
      const result = await signUp({
        fullName: values.fullName.trim(),
        // validation already checked this, so it's never null here
        phone: normaliseSaPhone(values.phone) ?? values.phone,
        email: values.email.trim(),
        password: values.password,
        role: values.role,
        // only owners send shop details
        ...(isOwner ? { shopName: values.shopName.trim(), shopArea: values.shopArea.trim() } : {}),
      })
      if (result.needsEmailConfirmation) {
        setSentTo(values.email.trim())
      }
      // otherwise they're logged in, and the redirect above kicks in once their profile loads
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong, please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // success screen when they still need to click the email link
  if (sentTo) {
    return (
      <main className="mx-auto max-w-md px-5 py-12 text-center">
        <div className="text-5xl" aria-hidden>
          📬
        </div>
        <h1 className="mt-4 text-3xl font-extrabold text-brand">Check your email</h1>
        <p className="mt-3 text-gray-700">
          We sent a link to <strong>{sentTo}</strong>. Click it to confirm your account, then log in.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-block rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
        >
          Go to log in
        </Link>
      </main>
    )
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

      <h1 className="mt-8 text-4xl font-extrabold text-brand">Join Bit by Bit</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
        {/* role choice: two big cards that work like radio buttons */}
        <fieldset>
          <legend className="text-gray-700">Choose how you want to use Bit by Bit</legend>
          <div className="mt-4 space-y-3">
            {roleOptions.map((option) => {
              const checked = values.role === option.value
              return (
                <label
                  key={option.value}
                  className={`relative flex cursor-pointer gap-4 rounded-2xl border-2 p-5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
                    checked ? 'border-gold bg-white shadow-sm' : 'border-transparent bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={checked}
                    onChange={() => update('role', option.value)}
                    aria-labelledby={`role-${option.value}-title`}
                    aria-describedby={`role-${option.value}-text`}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-light text-2xl"
                  >
                    {option.icon}
                  </span>
                  <span>
                    <span id={`role-${option.value}-title`} className="block text-lg font-bold text-brand">
                      {option.title}
                    </span>
                    <span id={`role-${option.value}-text`} className="block text-sm text-gray-700">
                      {option.text}
                    </span>
                  </span>
                  {checked && (
                    <span
                      aria-hidden
                      className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gold font-bold text-brand-dark"
                    >
                      ✓
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        </fieldset>

        <TextField
          id="fullName"
          label="Full name"
          placeholder="e.g. Thabo Mthembu"
          autoComplete="name"
          hint="As on your ID, so the shop can check it's you when you collect."
          value={values.fullName}
          onChange={(e) => update('fullName', e.target.value)}
          error={errors.fullName}
        />

        <TextField
          id="phone"
          label="Cell number"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="082 000 0000"
          prefix="+27"
          hint="Shops use this to remind you about payments."
          value={values.phone}
          onChange={(e) => update('phone', e.target.value)}
          error={errors.phone}
        />

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
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={values.password}
          onChange={(e) => update('password', e.target.value)}
          error={errors.password}
        />

        {/* only shop owners see these */}
        {values.role === 'owner' && (
          <div className="space-y-6 rounded-2xl bg-brand-light p-5">
            <TextField
              id="shopName"
              label="Shop name"
              placeholder="e.g. Kasi Kids Wear"
              autoComplete="organization"
              value={values.shopName}
              onChange={(e) => update('shopName', e.target.value)}
              error={errors.shopName}
            />
            <TextField
              id="shopArea"
              label="Shop area"
              placeholder="e.g. Soweto, Zone 6"
              value={values.shopArea}
              onChange={(e) => update('shopArea', e.target.value)}
              error={errors.shopArea}
            />
          </div>
        )}

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
          {submitting ? 'Creating your account…' : 'Create account →'}
        </button>

        <p className="text-center text-sm text-gray-600">Always 0% interest • No hidden fees</p>
      </form>

      <p className="mt-8 text-center text-gray-700">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-brand hover:underline">
          Log in here
        </Link>
      </p>
    </main>
  )
}

export default SignUp
