import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell'
import TextField from '../../components/TextField'
import { useAuth } from '../../context/AuthContext'
import { useLayby } from '../../hooks/useLayby'
import { addPayment } from '../../lib/api'
import { formatMoney, parseMoney } from '../../lib/money'
import { checkPaymentAmount, pendingAmount } from '../../lib/paymentRules'
import { PROOF_ACCEPT, checkProofFile } from '../../lib/proof'
import { uploadProof } from '../../lib/uploadProof'

// the customer sends a photo or PDF of their EFT slip, based on my "6. Upload proof of payment" Stitch screen
function UploadProof() {
  const { id } = useParams()
  const state = useLayby(id)
  const { session } = useAuth()
  const navigate = useNavigate()

  // undefined = "not touched yet", so I can fill in the suggested amount
  const [amountText, setAmountText] = useState<string | undefined>(undefined)
  const [file, setFile] = useState<File | null>(null)
  const [amountError, setAmountError] = useState<string>()
  const [fileError, setFileError] = useState<string>()
  const [formError, setFormError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const backLink = (
    <Link to={`/customer/laybys/${id}`} className="text-sm font-semibold text-brand hover:underline">
      ← Back to the lay-by
    </Link>
  )

  if (state.status !== 'ready') {
    return (
      <DashboardShell title="Upload proof of payment" showGreeting={false}>
        {backLink}
        <p className="mt-4 text-gray-600">
          {state.status === 'loading' ? 'Loading…' : "We couldn't load this lay-by. Please go back and try again."}
        </p>
      </DashboardShell>
    )
  }

  const { layby } = state
  // slips that are still waiting count too, so I can't send more than I owe
  const canStillPay = Math.max(0, layby.balance - pendingAmount(layby.payments))
  const suggested = Math.min(layby.nextDue?.amount ?? canStillPay, canStillPay)
  const shownAmount = amountText ?? (suggested > 0 ? suggested.toFixed(2) : '')

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null
    setFormError(null)
    if (!chosen) return
    const problem = checkProofFile(chosen)
    setFileError(problem ?? undefined)
    setFile(problem ? null : chosen)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const amount = parseMoney(shownAmount)
    const amountProblem =
      amount === null ? 'Enter the amount you paid, e.g. 300 or 300,50' : checkPaymentAmount(amount, canStillPay)
    setAmountError(amountProblem ?? undefined)
    if (!file && !fileError) setFileError('Choose your proof of payment (a photo or PDF)')
    if (amountProblem || !file || amount === null) return

    setSending(true)
    try {
      const path = await uploadProof(layby.id, file)
      await addPayment(session!.access_token, layby.id, { amount, proofPath: path })
      navigate(`/customer/laybys/${layby.id}`, { state: { sent: true } })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong, please try again.')
      setSending(false)
    }
  }

  return (
    <DashboardShell title="Upload proof of payment" showGreeting={false}>
      {backLink}

      <form onSubmit={handleSubmit} noValidate className="mt-4 max-w-xl space-y-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600">{layby.shop.name}</p>
          <h2 className="text-xl font-bold">{layby.itemName}</h2>
          <p className="mt-1 font-semibold text-brand">Balance: {formatMoney(layby.balance)}</p>
          {canStillPay < layby.balance && (
            <p className="mt-1 text-sm text-gray-600">
              {formatMoney(layby.balance - canStillPay)} is already waiting for the shop to check.
            </p>
          )}
        </section>

        <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
          <TextField
            id="amount"
            label="Amount paid"
            inputMode="decimal"
            prefix="R"
            value={shownAmount}
            onChange={(e) => {
              setAmountText(e.target.value)
              setAmountError(undefined)
            }}
            error={amountError}
          />

          <div>
            <label htmlFor="proof" className="block font-semibold text-gray-900">
              Proof of payment
            </label>
            <p id="proof-hint" className="mt-1 text-sm text-gray-600">
              A photo or PDF of your bank slip or EFT confirmation, up to 5 MB.
            </p>
            <input
              id="proof"
              type="file"
              accept={PROOF_ACCEPT}
              onChange={chooseFile}
              aria-describedby="proof-hint"
              aria-invalid={fileError ? true : undefined}
              className="mt-2 block w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:font-semibold file:text-white"
            />
            {file && <p className="mt-2 text-sm text-gray-700">✓ {file.name}</p>}
            {fileError && (
              <p role="alert" className="mt-1 text-sm font-medium text-red-700">
                {fileError}
              </p>
            )}
          </div>
        </section>

        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-xl bg-brand px-6 py-4 text-lg font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Send proof'}
        </button>
        <p className="text-center text-sm text-gray-600">
          The shop checks your slip, and then it counts towards your balance.
        </p>
      </form>
    </DashboardShell>
  )
}

export default UploadProof
