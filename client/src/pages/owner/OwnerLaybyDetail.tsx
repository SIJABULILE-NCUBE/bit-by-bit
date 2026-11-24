import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell'
import LaybyProgress from '../../components/LaybyProgress'
import PaymentHistory from '../../components/PaymentHistory'
import PaymentSchedule from '../../components/PaymentSchedule'
import StatusBadge from '../../components/StatusBadge'
import TextField from '../../components/TextField'
import { useAuth } from '../../context/AuthContext'
import { useLayby } from '../../hooks/useLayby'
import { ApiError, addPayment, updateLaybyStatus } from '../../lib/api'
import { formatMoney, parseMoney } from '../../lib/money'
import { openProof } from '../../lib/openProof'
import { checkPaymentAmount } from '../../lib/paymentRules'
import type { LaybyDetail } from '../../types'

// the owner takes cash at the counter, so it's confirmed straight away
function RecordCash({ layby, onRecorded }: { layby: LaybyDetail; onRecorded: (message: string) => void }) {
  const { session } = useAuth()
  const [amountText, setAmountText] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = parseMoney(amountText)
    const problem = amount === null ? 'Enter the cash amount, e.g. 300 or 300,50' : checkPaymentAmount(amount, layby.balance)
    setError(problem ?? undefined)
    if (problem || amount === null) return

    setSaving(true)
    try {
      await addPayment(session!.access_token, layby.id, { amount })
      setAmountText('')
      onRecorded(`Cash payment of ${formatMoney(amount)} recorded.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong, please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <TextField
        id="cash"
        label="Cash received"
        inputMode="decimal"
        prefix="R"
        placeholder={layby.nextDue ? layby.nextDue.amount.toFixed(2) : '0,00'}
        hint={`Balance: ${formatMoney(layby.balance)}`}
        value={amountText}
        onChange={(e) => {
          setAmountText(e.target.value)
          setError(undefined)
        }}
        error={error}
      />
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Record cash payment'}
      </button>
    </form>
  )
}

// "Mark as collected" (only once it's paid up) and "Cancel lay-by" (always with a reason)
function StatusControls({ layby, onChanged }: { layby: LaybyDetail; onChanged: (message: string) => void }) {
  const { session } = useAuth()
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function change(action: 'collect' | 'cancel') {
    setError(null)
    setBusy(true)
    try {
      await updateLaybyStatus(
        session!.access_token,
        layby.id,
        action === 'collect' ? { action } : { action, reason: reason.trim() },
      )
      onChanged(action === 'collect' ? 'Marked as collected. Enjoy the sale!' : 'Lay-by cancelled.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong, please try again.')
    } finally {
      setBusy(false)
    }
  }

  function submitCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reason.trim()) {
      setReasonError('Give a reason, so you both have a record of why')
      return
    }
    void change('cancel')
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {layby.status === 'completed' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void change('collect')}
          className="w-full rounded-xl bg-gold px-6 py-3 font-semibold text-brand-dark hover:brightness-95 disabled:opacity-60"
        >
          Mark as collected
        </button>
      )}

      {cancelling ? (
        <form onSubmit={submitCancel} noValidate className="space-y-3 rounded-xl bg-red-50 p-4">
          <label htmlFor="cancel-reason" className="block font-semibold text-red-900">
            Reason for cancelling
          </label>
          <textarea
            id="cancel-reason"
            rows={2}
            maxLength={300}
            placeholder="e.g. The customer asked to cancel"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setReasonError(undefined)
            }}
            className="w-full rounded-xl border border-red-200 bg-white p-3 outline-none focus:ring-2 focus:ring-red-700"
          />
          {reasonError && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {reasonError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCancelling(false)}
              className="rounded-xl bg-white px-4 py-3 font-semibold text-gray-700"
            >
              Keep it
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
            >
              Yes, cancel it
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCancelling(true)}
          className="w-full rounded-xl bg-gray-100 px-6 py-3 font-semibold text-red-800 hover:bg-red-50"
        >
          Cancel lay-by
        </button>
      )}
    </div>
  )
}

// one lay-by from the shop's side, based on my "10. Owner lay-by detail" Stitch screen
function OwnerLaybyDetail() {
  const { id } = useParams()
  const state = useLayby(id)
  const { session } = useAuth()
  const [message, setMessage] = useState<string | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)

  const backLink = (
    <Link to="/owner/laybys" className="text-sm font-semibold text-brand hover:underline">
      ← Back to lay-bys
    </Link>
  )

  if (state.status !== 'ready') {
    return (
      <DashboardShell title="Lay-by details" showGreeting={false}>
        {backLink}
        <div className="mt-4">
          {state.status === 'loading' && <p className="text-gray-600">Loading…</p>}
          {state.status === 'not-found' && (
            <p className="rounded-2xl bg-white p-6 text-gray-700 shadow-sm">We couldn't find that lay-by at your shop.</p>
          )}
          {state.status === 'error' && (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
              {state.message}
            </p>
          )}
        </div>
      </DashboardShell>
    )
  }

  const { layby, reload } = state
  const canTakePayments = layby.status === 'active' && layby.balance > 0

  function changed(text: string) {
    setMessage(text)
    reload()
  }

  function viewProof(paymentId: string) {
    setProofError(null)
    openProof(session!.access_token, paymentId).catch(() => setProofError("We couldn't open the proof. Please try again."))
  }

  return (
    <DashboardShell title="Lay-by details" showGreeting={false}>
      {backLink}

      {message && (
        <p role="status" className="mt-4 rounded-xl bg-brand-light p-4 font-medium text-brand">
          ✓ {message}
        </p>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* who the customer is, and how to reach them */}
          <section aria-label="Customer" className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-lg font-bold">{layby.customer.fullName ?? layby.customer.email}</p>
            <p className="text-sm text-gray-600">{layby.customer.email}</p>
            {layby.customer.phone && (
              <a href={`tel:${layby.customer.phone}`} className="mt-1 inline-block font-semibold text-brand hover:underline">
                {layby.customer.phone}
              </a>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-bold">{layby.itemName}</h2>
              <StatusBadge layby={layby} />
            </div>
            <div className="mt-4">
              <LaybyProgress layby={layby} />
            </div>
            {layby.cancelReason && <p className="mt-3 text-sm text-gray-700">Cancelled: {layby.cancelReason}</p>}
          </section>

          {/* what the owner can do at the counter */}
          {/* collected and cancelled lay-bys are finished, so there's nothing to change */}
          {(layby.status === 'active' || layby.status === 'completed') && (
            <section aria-label="Shop controls" className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Shop controls</h2>
              {canTakePayments && <RecordCash layby={layby} onRecorded={changed} />}
              <StatusControls layby={layby} onChanged={changed} />
            </section>
          )}

          <PaymentSchedule layby={layby} />
        </div>

        <div className="space-y-3">
          {proofError && (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
              {proofError}
            </p>
          )}
          <PaymentHistory payments={layby.payments} onViewProof={viewProof} />
        </div>
      </div>
    </DashboardShell>
  )
}

export default OwnerLaybyDetail
