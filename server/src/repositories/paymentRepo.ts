import { getSupabaseAdmin } from '../lib/supabase.js'
import type { PaymentStatus } from '../services/laybyMath.js'

// every database (and storage) call for payments lives here
// my tests swap this whole file for an in-memory fake (tests/fakeLaybyRepo.ts)

export const PROOFS_BUCKET = 'proofs'

export type NewPayment = {
  laybyId: string
  amount: number
  method: 'cash' | 'eft'
  status: PaymentStatus
  proofPath: string | null
  createdBy: string
}

// just enough to find which lay-by a payment belongs to
export type PaymentRef = { id: string; laybyId: string }

async function addPayment(input: NewPayment): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from('payments')
    .insert({
      layby_id: input.laybyId,
      amount: input.amount,
      method: input.method,
      status: input.status,
      proof_path: input.proofPath,
      created_by: input.createdBy,
      // cash is confirmed the moment the owner records it
      reviewed_at: input.status === 'confirmed' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function findPayment(id: string): Promise<PaymentRef | null> {
  if (!uuidPattern.test(id)) return null
  const { data, error } = await getSupabaseAdmin().from('payments').select('id, layby_id').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? { id: data.id, laybyId: data.layby_id } : null
}

// confirm or reject, but ONLY if it's still pending (so the same slip can't be confirmed twice)
// gives false if someone else got there first
async function reviewPayment(
  id: string,
  review: { status: 'confirmed' | 'rejected'; rejectReason: string | null },
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('payments')
    .update({ status: review.status, reject_reason: review.rejectReason, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
  if (error) throw error
  return data.length > 0
}

// did the customer's upload really land in storage?
async function proofExists(path: string): Promise<boolean> {
  const [folder, file] = path.split('/')
  const { data, error } = await getSupabaseAdmin().storage.from(PROOFS_BUCKET).list(folder, { search: file })
  if (error) throw error
  return data.some((f) => f.name === file)
}

// the bucket is private, so I hand out a link that only works for 5 minutes
async function signedProofUrl(path: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin().storage.from(PROOFS_BUCKET).createSignedUrl(path, 60 * 5)
  if (error) throw error
  return data.signedUrl
}

export const paymentRepo = { addPayment, findPayment, reviewPayment, proofExists, signedProofUrl }
