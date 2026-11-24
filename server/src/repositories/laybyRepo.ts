import { getSupabaseAdmin } from '../lib/supabase.js'
import type { Instalment, LaybyStatus, PaymentStatus } from '../services/laybyMath.js'
import type { Role } from '../types.js'

// every database call for lay-bys lives here, so my routes stay simple
// (and my tests can swap this whole file for an in-memory fake)

export type ShopRecord = { id: string; name: string; area: string | null }

export type ProfileRecord = {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  role: Role
}

export type PaymentRecord = {
  id: string
  amount: number
  method: 'deposit' | 'cash' | 'eft'
  status: PaymentStatus
  createdBy: string
  createdAt: string
  reviewedAt: string | null
  rejectReason: string | null
}

// a lay-by with everything I need to show it: shop, customer, schedule and payments
export type LaybyRecord = {
  id: string
  shopId: string
  customerId: string
  itemName: string
  itemPhotoPath: string | null
  price: number
  deposit: number
  termMonths: number
  status: LaybyStatus
  cancelReason: string | null
  createdAt: string
  shop: ShopRecord
  customer: { id: string; fullName: string | null; email: string; phone: string | null }
  instalments: Instalment[]
  payments: PaymentRecord[]
}

export type NewLayby = {
  shopId: string
  customerId: string
  itemName: string
  price: number
  deposit: number
  termMonths: number
  status: LaybyStatus
  instalments: Instalment[]
  // the owner who created it (saved on the deposit payment)
  createdBy: string
}

// either one customer's lay-bys, or one shop's lay-bys
export type LaybyFilter = { customerId: string } | { shopId: string }

// one query that pulls in the shop, customer, instalments and payments too
// (the !..._fkey bits tell Supabase which link to follow)
const laybySelect = `
  id, shop_id, customer_id, item_name, item_photo_path, price, deposit, term_months,
  status, cancel_reason, created_at,
  shop:shops!laybys_shop_id_fkey ( id, name, area ),
  customer:profiles!laybys_customer_id_fkey ( id, full_name, email, phone ),
  instalments ( seq, due_date, amount ),
  payments ( id, amount, method, status, created_by, created_at, reviewed_at, reject_reason )
`

// the shape Supabase sends back (snake_case, and numeric columns can come back as strings)
type LaybyRow = {
  id: string
  shop_id: string
  customer_id: string
  item_name: string
  item_photo_path: string | null
  price: number | string
  deposit: number | string
  term_months: number
  status: LaybyStatus
  cancel_reason: string | null
  created_at: string
  shop: { id: string; name: string; area: string | null }
  customer: { id: string; full_name: string | null; email: string; phone: string | null }
  instalments: { seq: number; due_date: string; amount: number | string }[]
  payments: {
    id: string
    amount: number | string
    method: PaymentRecord['method']
    status: PaymentStatus
    created_by: string
    created_at: string
    reviewed_at: string | null
    reject_reason: string | null
  }[]
}

// turns a database row into the camelCase shape the rest of my code uses
function toRecord(row: LaybyRow): LaybyRecord {
  return {
    id: row.id,
    shopId: row.shop_id,
    customerId: row.customer_id,
    itemName: row.item_name,
    itemPhotoPath: row.item_photo_path,
    price: Number(row.price),
    deposit: Number(row.deposit),
    termMonths: row.term_months,
    status: row.status,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at,
    shop: row.shop,
    customer: {
      id: row.customer.id,
      fullName: row.customer.full_name,
      email: row.customer.email,
      phone: row.customer.phone,
    },
    instalments: row.instalments
      .map((i) => ({ seq: i.seq, dueDate: i.due_date, amount: Number(i.amount) }))
      .sort((a, b) => a.seq - b.seq),
    payments: row.payments
      .map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        createdBy: p.created_by,
        createdAt: p.created_at,
        reviewedAt: p.reviewed_at,
        rejectReason: p.reject_reason,
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  }
}

async function findShopByOwner(ownerId: string): Promise<ShopRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('shops')
    .select('id, name, area')
    .eq('owner_id', ownerId)
    .order('created_at')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// Supabase saves emails in lowercase, so I look them up in lowercase too
async function findProfileByEmail(email: string): Promise<ProfileRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, email, full_name, phone, role')
    .eq('email', email)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return { id: data.id, email: data.email, fullName: data.full_name, phone: data.phone, role: data.role }
}

// saves the lay-by, then its instalments, then the deposit as a confirmed payment
// if a later step fails I delete the lay-by again (that also deletes anything linked to it),
// so I never leave a half-made lay-by behind
async function createLayby(input: NewLayby): Promise<string> {
  const supabase = getSupabaseAdmin()

  const { data: layby, error } = await supabase
    .from('laybys')
    .insert({
      shop_id: input.shopId,
      customer_id: input.customerId,
      item_name: input.itemName,
      price: input.price,
      deposit: input.deposit,
      term_months: input.termMonths,
      status: input.status,
    })
    .select('id')
    .single()
  if (error) throw error

  try {
    if (input.instalments.length > 0) {
      const { error: instalmentError } = await supabase.from('instalments').insert(
        input.instalments.map((i) => ({
          layby_id: layby.id,
          seq: i.seq,
          due_date: i.dueDate,
          amount: i.amount,
        })),
      )
      if (instalmentError) throw instalmentError
    }

    const { error: paymentError } = await supabase.from('payments').insert({
      layby_id: layby.id,
      amount: input.deposit,
      method: 'deposit',
      status: 'confirmed',
      created_by: input.createdBy,
      reviewed_at: new Date().toISOString(),
    })
    if (paymentError) throw paymentError
  } catch (err) {
    await supabase.from('laybys').delete().eq('id', layby.id)
    throw err
  }

  return layby.id
}

async function listLaybys(filter: LaybyFilter): Promise<LaybyRecord[]> {
  let query = getSupabaseAdmin().from('laybys').select(laybySelect)
  query = 'customerId' in filter ? query.eq('customer_id', filter.customerId) : query.eq('shop_id', filter.shopId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as LaybyRow[]).map(toRecord)
}

async function getLayby(id: string): Promise<LaybyRecord | null> {
  const { data, error } = await getSupabaseAdmin().from('laybys').select(laybySelect).eq('id', id).maybeSingle()
  if (error) throw error
  return data ? toRecord(data as unknown as LaybyRow) : null
}

export const laybyRepo = { findShopByOwner, findProfileByEmail, createLayby, listLaybys, getLayby }
