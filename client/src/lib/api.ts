import type { Dashboard, LaybyDetail, LaybySummary, NewLaybyInput, PaymentResult, PendingPayment, Profile } from '../types'

// where my Express server lives (set in client/.env)
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

// when my server says no, I keep its message so the page can show it
export class ApiError extends Error {
  status: number
  details: string[]

  constructor(message: string, status: number, details: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

// one helper for every call: adds the login token, sends JSON, and turns errors into ApiError
async function apiRequest<T>(
  path: string,
  token: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  // some errors have no JSON body, so I don't crash if it's missing
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed with status ${res.status}`, res.status, data?.details ?? [])
  }
  return data as T
}

// "who am I?" (used by AuthProvider after log in)
export function getMe(token: string): Promise<Profile> {
  return apiRequest<Profile>('/api/me', token)
}

// a customer gets their own lay-bys, an owner gets their shop's
export function listLaybys(token: string): Promise<LaybySummary[]> {
  return apiRequest<LaybySummary[]>('/api/laybys', token)
}

// shop owners only
export function createLayby(token: string, input: NewLaybyInput): Promise<LaybySummary> {
  return apiRequest<LaybySummary>('/api/laybys', token, { method: 'POST', body: input })
}

// one lay-by with its schedule and payment history (only its customer or its shop's owner)
export function getLayby(token: string, id: string): Promise<LaybyDetail> {
  return apiRequest<LaybyDetail>(`/api/laybys/${encodeURIComponent(id)}`, token)
}

// customer: { amount, proofPath } after uploading the slip; owner: { amount } for cash
export function addPayment(
  token: string,
  laybyId: string,
  body: { amount: number; proofPath?: string },
): Promise<PaymentResult> {
  return apiRequest<PaymentResult>(`/api/laybys/${encodeURIComponent(laybyId)}/payments`, token, {
    method: 'POST',
    body,
  })
}

// shop owners only: every slip waiting to be checked
export function listPendingPayments(token: string): Promise<PendingPayment[]> {
  return apiRequest<PendingPayment[]>('/api/payments', token)
}

// a link to the proof file that only works for a few minutes
export function getProofUrl(token: string, paymentId: string): Promise<{ url: string }> {
  return apiRequest<{ url: string }>(`/api/payments/${encodeURIComponent(paymentId)}/proof`, token)
}

// shop owners only: confirm a slip, or reject it with a reason
export function reviewPayment(
  token: string,
  paymentId: string,
  review: { action: 'confirm' } | { action: 'reject'; reason: string },
): Promise<PaymentResult> {
  return apiRequest<PaymentResult>(`/api/payments/${encodeURIComponent(paymentId)}`, token, {
    method: 'PATCH',
    body: review,
  })
}

// shop owners only: the dashboard totals
export function getDashboard(token: string): Promise<Dashboard> {
  return apiRequest<Dashboard>('/api/dashboard', token)
}

// shop owners only: hand over a paid-up item, or cancel with a reason
export function updateLaybyStatus(
  token: string,
  laybyId: string,
  change: { action: 'collect' } | { action: 'cancel'; reason: string },
): Promise<LaybySummary> {
  return apiRequest<LaybySummary>(`/api/laybys/${encodeURIComponent(laybyId)}`, token, { method: 'PATCH', body: change })
}
