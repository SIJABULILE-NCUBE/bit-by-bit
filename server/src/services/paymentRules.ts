// my payment rules as plain functions (no database), so they're easy to test
// see tests/paymentRules.test.ts
import { formatRand, fromCents, toCents, type PaymentLike } from './laybyMath.js'

// money a customer has sent proof for, but the shop hasn't checked yet
export function pendingAmount(payments: PaymentLike[]): number {
  const cents = payments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + toCents(p.amount), 0)
  return fromCents(cents)
}

// is this a sensible amount to pay, when at most `maxAllowed` may still be paid?
// gives a friendly message if not, or null if it's fine
export function checkPaymentAmount(amount: number, maxAllowed: number): string | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return 'The amount must be a number'
  if (amount <= 0) return 'The amount must be more than R0'
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) return 'Amounts can only have 2 decimals (cents)'

  const maxCents = toCents(maxAllowed)
  if (maxCents <= 0) return 'Nothing is owed on this lay-by'
  // no overpaying: the balance can never go below R0
  if (toCents(amount) > maxCents) return `That is more than the ${formatRand(maxCents)} still owed`
  return null
}

// proofs are saved as <layby_id>/<file name>, so I check the path really is in THIS lay-by's folder
// (one level only, and no ".." tricks)
export function isProofPathForLayby(path: string, laybyId: string): boolean {
  const parts = path.split('/')
  if (parts.length !== 2) return false
  const [folder, file] = parts
  return folder === laybyId && file.length > 0 && file !== '.' && file !== '..'
}
