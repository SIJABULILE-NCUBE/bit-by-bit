import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell'
import { useAuth } from '../../context/AuthContext'
import { ApiError, listPendingPayments, reviewPayment } from '../../lib/api'
import { formatDate, formatMoney } from '../../lib/money'
import { openProof } from '../../lib/openProof'
import type { PendingPayment } from '../../types'

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; payments: PendingPayment[] }

const nameOf = (p: PendingPayment) => p.customer.fullName ?? p.customer.email

// one slip: who paid, how much, for what, plus View proof / Reject / Confirm
function SlipCard({ payment, onDone }: { payment: PendingPayment; onDone: (message: string) => void }) {
  const { session } = useAuth()
  const token = session!.access_token
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function review(action: 'confirm' | 'reject') {
    setError(null)
    setBusy(true)
    try {
      await reviewPayment(token, payment.id, action === 'confirm' ? { action } : { action, reason: reason.trim() })
      const verb = action === 'confirm' ? 'Confirmed' : 'Rejected'
      onDone(`${verb} ${formatMoney(payment.amount)} from ${nameOf(payment)}.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong, please try again.')
      setBusy(false)
    }
  }

  function submitReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reason.trim()) {
      setReasonError('Say why, so the customer knows what to fix')
      return
    }
    void review('reject')
  }

  function viewProof() {
    setError(null)
    openProof(token, payment.id).catch(() => setError("We couldn't open the proof. Please try again."))
  }

  const headingId = `slip-${payment.id}`

  return (
    <article aria-labelledby={headingId} className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="truncate text-lg font-bold">
            {nameOf(payment)}
          </h2>
          {payment.customer.phone && <p className="text-sm text-gray-600">{payment.customer.phone}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase text-gray-500">Claimed</p>
          <p className="text-2xl font-extrabold text-brand">{formatMoney(payment.amount)}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-gray-50 p-4 text-sm">
        <dt className="text-gray-600">Lay-by item</dt>
        <dd className="text-right font-semibold">
          <Link to={`/owner/laybys/${payment.layby.id}`} className="hover:underline">
            {payment.layby.itemName}
          </Link>
        </dd>
        <dt className="text-gray-600">Balance now</dt>
        <dd className="text-right font-semibold">{formatMoney(payment.layby.balance)}</dd>
        <dt className="text-gray-600">Received</dt>
        <dd className="text-right font-semibold">{formatDate(payment.createdAt)}</dd>
      </dl>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {rejecting ? (
        <form onSubmit={submitReject} noValidate className="mt-4 space-y-3">
          <label htmlFor={`reason-${payment.id}`} className="block font-semibold">
            Reason for rejecting
          </label>
          <textarea
            id={`reason-${payment.id}`}
            rows={2}
            maxLength={300}
            placeholder="e.g. The slip is blurry, please upload a clearer photo"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setReasonError(undefined)
            }}
            className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-brand"
          />
          {reasonError && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {reasonError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="rounded-xl bg-gray-100 px-4 py-3 font-semibold text-gray-700"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
            >
              Reject payment
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 grid grid-cols-[1fr_1fr_1.5fr] gap-2">
          <button
            type="button"
            onClick={viewProof}
            disabled={!payment.hasProof}
            className="rounded-xl bg-gray-100 px-3 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-50"
          >
            View proof
          </button>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="rounded-xl bg-red-50 px-3 py-3 text-sm font-semibold text-red-800 hover:bg-red-100"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => void review('confirm')}
            disabled={busy}
            className="rounded-xl bg-brand px-3 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            Confirm payment
          </button>
        </div>
      )}
    </article>
  )
}

// the owner's list of slips to check, based on my "11. Payments to review" Stitch screen
function PaymentsToReview() {
  const { session } = useAuth()
  const token = session?.access_token
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    listPendingPayments(token)
      .then((payments) => {
        if (!cancelled) setState({ status: 'ready', payments })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', message: "We couldn't load the payments. Please try again." })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  // once a slip is confirmed or rejected, it's off the list
  function done(paymentId: string, text: string) {
    setMessage(text)
    setState((current) =>
      current.status === 'ready' ? { ...current, payments: current.payments.filter((p) => p.id !== paymentId) } : current,
    )
  }

  return (
    <DashboardShell title="Payments to review" showGreeting={false}>
      {message && (
        <p role="status" className="mb-4 rounded-xl bg-brand-light p-4 font-medium text-brand">
          ✓ {message}
        </p>
      )}

      {state.status === 'loading' && <p className="text-gray-600">Loading payments…</p>}
      {state.status === 'error' && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {state.message}
        </p>
      )}

      {state.status === 'ready' && state.payments.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-gray-700 shadow-sm">
          You're all caught up. New proof of payment slips from customers will show up here.
        </p>
      )}

      {state.status === 'ready' && state.payments.length > 0 && (
        <>
          <p className="mb-4 inline-block rounded-full bg-gold-light px-4 py-1 text-sm font-semibold text-brand-dark">
            {state.payments.length} slip{state.payments.length === 1 ? '' : 's'} waiting
          </p>
          <p className="mb-4 text-gray-700">
            Check each slip against your bank account before you confirm it. Only confirmed payments count.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {state.payments.map((payment) => (
              <SlipCard key={payment.id} payment={payment} onDone={(text) => done(payment.id, text)} />
            ))}
          </div>
        </>
      )}
    </DashboardShell>
  )
}

export default PaymentsToReview
