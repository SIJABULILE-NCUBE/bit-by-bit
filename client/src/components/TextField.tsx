import { useState, type InputHTMLAttributes, type ReactNode } from 'react'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  error?: string
  hint?: string
  // something to show at the start of the box, like the +27 for phone numbers
  prefix?: ReactNode
}

// one labelled input with its hint and error message
// for type="password" I add a Show/Hide button so people can check what they typed
function TextField({ id, label, error, hint, prefix, type = 'text', ...inputProps }: TextFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  // screen readers read the hint and the error after the label
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className="block font-semibold text-gray-900">
        {label}
      </label>

      <div
        className={`mt-2 flex items-center rounded-xl border bg-white focus-within:ring-2 focus-within:ring-brand ${
          error ? 'border-red-600' : 'border-gray-200'
        }`}
      >
        {prefix && (
          <span className="flex items-center self-stretch rounded-l-xl border-r border-gray-200 bg-gray-100 px-4 font-semibold">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="w-full min-w-0 rounded-xl bg-transparent px-4 py-3 text-base outline-none"
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="px-4 py-3 text-sm font-semibold text-brand"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-gray-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export default TextField
