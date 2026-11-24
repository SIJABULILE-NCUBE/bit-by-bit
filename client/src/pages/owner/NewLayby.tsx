import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell'
import TextField from '../../components/TextField'
import { useAuth } from '../../context/AuthContext'
import { ApiError, createLayby } from '../../lib/api'
import {
  MAX_TERM_MONTHS,
  MIN_TERM_MONTHS,
  buildSchedule,
  toCents,
  todayInSA,
  validateLaybyTerms,
  type Instalment,
} from '../../lib/laybyMath'
import { formatDate, formatMoney, parseMoney } from '../../lib/money'

type FormValues = {
  customerEmail: string
  itemName: string
  price: string
  deposit: string
  termMonths: number
}

type FieldErrors = Partial<Record<'customerEmail' | 'itemName' | 'price' | 'deposit', string>>

// 1 to 6, for the term buttons
const termOptions = Array.from({ length: MAX_TERM_MONTHS - MIN_TERM_MONTHS + 1 }, (_, i) => i + MIN_TERM_MONTHS)

// quick deposit buttons, like the Stitch design
const depositPercents = [10, 25, 50]

// "3 × R 300,00", or "5 × R 141,66 + R 141,70" when the last one has the rounding
function describeInstalments(schedule: Instalment[]): string {
  const first = schedule[0].amount
  const last = schedule[schedule.length - 1].amount
  if (first === last) return `${schedule.length} × ${formatMoney(first)}`
  return `${schedule.length - 1} × ${formatMoney(first)} + ${formatMoney(last)}`
}

// the owner's "New lay-by" form with a live schedule preview, based on my "9. Create lay-by" Stitch screen
function NewLayby() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState<FormValues>({
    customerEmail: '',
    itemName: '',
    price: '',
    deposit: '',
    termMonths: 3,
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  // the preview is worked out fresh on every keystroke, with the same maths the server uses
  const price = parseMoney(values.price)
  const deposit = parseMoney(values.deposit)
  const today = todayInSA()
  const ruleErrors =
    price !== null && deposit !== null ? validateLaybyTerms({ price, deposit, termMonths: values.termMonths }) : []
  const schedule =
    price !== null && deposit !== null && ruleErrors.length === 0
      ? buildSchedule(price, deposit, values.termMonths, today)
      : null

  // sets the deposit to a % of the price, rounded UP to the next cent so it never dips under 10%
  function setDepositPercent(percent: number) {
    if (price === null) return
    const cents = Math.ceil((toCents(price) * percent) / 100)
    update('deposit', (cents / 100).toFixed(2))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const found: FieldErrors = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.customerEmail.trim())) {
      found.customerEmail = "Enter the customer's email address"
    }
    if (!values.itemName.trim()) found.itemName = 'Enter the item name'
    if (price === null) found.price = 'Enter the price, e.g. 1250 or 1250,50'
    if (deposit === null) found.deposit = 'Enter the deposit, e.g. 125'
    setErrors(found)

    // the lay-by rule messages are already showing in the preview
    if (Object.keys(found).length > 0 || ruleErrors.length > 0 || price === null || deposit === null) return

    setSaving(true)
    try {
      const itemName = values.itemName.trim()
      await createLayby(session!.access_token, {
        customerEmail: values.customerEmail.trim(),
        itemName,
        price,
        deposit,
        termMonths: values.termMonths,
      })
      navigate('/owner/laybys', { state: { created: itemName } })
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong, please try again.')
      setSaving(false)
    }
  }

  return (
    <DashboardShell title="New lay-by" showGreeting={false}>
      <Link to="/owner/laybys" className="text-sm font-semibold text-brand hover:underline">
        ← Back to lay-bys
      </Link>

      <form onSubmit={handleSubmit} noValidate className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">Customer</h2>
            <TextField
              id="customerEmail"
              label="Customer email"
              type="email"
              autoComplete="off"
              placeholder="the email they signed up with"
              hint="They need a Bit by Bit customer account first."
              value={values.customerEmail}
              onChange={(e) => update('customerEmail', e.target.value)}
              error={errors.customerEmail}
            />
          </section>

          <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">Item</h2>
            <TextField
              id="itemName"
              label="Item name"
              placeholder="e.g. Defy 210L chest freezer"
              value={values.itemName}
              onChange={(e) => update('itemName', e.target.value)}
              error={errors.itemName}
            />
            <TextField
              id="price"
              label="Price"
              inputMode="decimal"
              prefix="R"
              placeholder="0,00"
              value={values.price}
              onChange={(e) => update('price', e.target.value)}
              error={errors.price}
            />
          </section>

          <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">Payment terms</h2>
            <TextField
              id="deposit"
              label="Deposit"
              inputMode="decimal"
              prefix="R"
              placeholder="0,00"
              hint="At least 10% of the price, paid today."
              value={values.deposit}
              onChange={(e) => update('deposit', e.target.value)}
              error={errors.deposit}
            />
            <div className="grid grid-cols-3 gap-2">
              {depositPercents.map((percent) => (
                <button
                  key={percent}
                  type="button"
                  disabled={price === null}
                  onClick={() => setDepositPercent(percent)}
                  className="rounded-xl bg-gray-100 px-2 py-3 text-sm font-semibold hover:bg-gold-light disabled:opacity-50"
                >
                  {percent}%
                  {price !== null && (
                    <span className="block text-xs font-normal">
                      {formatMoney(Math.ceil((toCents(price) * percent) / 100) / 100)}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <fieldset>
              <legend className="font-semibold text-gray-900">Term</legend>
              <div className="mt-2 grid grid-cols-6 gap-1 rounded-xl bg-gray-100 p-1">
                {termOptions.map((months) => (
                  <label
                    key={months}
                    className={`cursor-pointer rounded-lg py-2 text-center text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
                      values.termMonths === months ? 'bg-brand text-white' : 'text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="termMonths"
                      value={months}
                      checked={values.termMonths === months}
                      onChange={() => update('termMonths', months)}
                      aria-label={`${months} month${months === 1 ? '' : 's'}`}
                      className="sr-only"
                    />
                    {months}M
                  </label>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-600">0% interest, always.</p>
            </fieldset>
          </section>
        </div>

        {/* the live preview: updates as the owner types */}
        <section aria-label="Schedule preview" className="h-fit rounded-2xl bg-brand-light p-5 lg:sticky lg:top-4">
          <h2 className="text-lg font-bold text-brand">Instalment schedule preview</h2>

          {ruleErrors.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800">
              {ruleErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}

          {!schedule && ruleErrors.length === 0 && (
            <p className="mt-3 text-gray-700">Fill in the price and deposit to see the payment schedule.</p>
          )}

          {schedule && price !== null && deposit !== null && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white p-4">
                  <p className="text-sm text-gray-600">Deposit today</p>
                  <p data-deposit className="text-xl font-bold">
                    {formatMoney(deposit)}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <p className="text-sm text-gray-600">Still to pay</p>
                  <p className="text-xl font-bold text-brand">{formatMoney(price - deposit)}</p>
                  {schedule.length > 0 && <p className="text-xs text-gray-600">{describeInstalments(schedule)}</p>}
                </div>
              </div>

              <ol className="mt-4 space-y-2">
                <li className="flex items-center justify-between rounded-xl bg-white p-3">
                  <span>
                    <span className="font-semibold">Today ({formatDate(today)})</span>
                    <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">Deposit</span>
                  </span>
                  <span className="font-semibold">{formatMoney(deposit)}</span>
                </li>
                {schedule.map((instalment, index) => {
                  const isLast = index === schedule.length - 1
                  return (
                    <li
                      key={instalment.seq}
                      className={`flex items-center justify-between rounded-xl p-3 ${isLast ? 'bg-gold-light' : 'bg-white'}`}
                    >
                      <span>
                        <span className="font-semibold">{formatDate(instalment.dueDate)}</span>
                        {isLast && (
                          <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-brand-dark">
                            Final &amp; collect
                          </span>
                        )}
                      </span>
                      <span className="font-semibold">{formatMoney(instalment.amount)}</span>
                    </li>
                  )
                })}
              </ol>
            </>
          )}

          {formError && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-5 w-full rounded-xl bg-brand py-4 text-lg font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? 'Creating lay-by…' : 'Create lay-by →'}
          </button>
        </section>
      </form>
    </DashboardShell>
  )
}

export default NewLayby
