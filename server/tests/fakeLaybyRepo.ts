import type { NewPayment, PaymentRef } from '../src/repositories/paymentRepo.js'
import type { LaybyStatus } from '../src/services/laybyMath.js'
import type {
  LaybyFilter,
  LaybyRecord,
  NewLayby,
  ProfileRecord,
  ShopRecord,
} from '../src/repositories/laybyRepo.js'

// an in-memory pretend database for my lay-by tests
// it behaves like the real laybyRepo, but just uses arrays

type FakeShop = ShopRecord & { ownerId: string }

// proofFiles = the paths of files "uploaded" to the proofs bucket
export const db: { shops: FakeShop[]; profiles: ProfileRecord[]; laybys: LaybyRecord[]; proofFiles: string[] } = {
  shops: [],
  profiles: [],
  laybys: [],
  proofFiles: [],
}

let nextId = 1

// same people as fakeSupabase.ts, plus one shop per owner
export function resetFakeDb() {
  nextId = 1
  db.shops = [
    { id: 'shop-1', ownerId: 'user-owner', name: 'Kasi Kids Wear', area: 'Soweto' },
    { id: 'shop-2', ownerId: 'user-owner-2', name: 'Lerato Furniture', area: 'Tembisa' },
  ]
  db.profiles = [
    { id: 'user-customer', email: 'thandi@example.com', fullName: 'Thandi Mokoena', phone: '0821234567', role: 'customer' },
    { id: 'user-customer-2', email: 'vusi@example.com', fullName: 'Vusi Cele', phone: '0721234567', role: 'customer' },
    { id: 'user-owner', email: 'sipho@example.com', fullName: 'Sipho Dlamini', phone: '0831234567', role: 'owner' },
    { id: 'user-owner-2', email: 'lerato@example.com', fullName: 'Lerato Khumalo', phone: '0841234567', role: 'owner' },
  ]
  db.laybys = []
  db.proofFiles = []
}

function shopDetails(shopId: string) {
  const shop = db.shops.find((s) => s.id === shopId)
  if (!shop) throw new Error(`fake db: no shop ${shopId}`)
  return { id: shop.id, name: shop.name, area: shop.area }
}

function customerDetails(customerId: string) {
  const p = db.profiles.find((x) => x.id === customerId)
  if (!p) throw new Error(`fake db: no profile ${customerId}`)
  return { id: p.id, fullName: p.fullName, email: p.email, phone: p.phone }
}

export const fakeLaybyRepo = {
  async findShopByOwner(ownerId: string): Promise<ShopRecord | null> {
    const shop = db.shops.find((s) => s.ownerId === ownerId)
    return shop ? { id: shop.id, name: shop.name, area: shop.area } : null
  },

  async findProfileByEmail(email: string): Promise<ProfileRecord | null> {
    return db.profiles.find((p) => p.email === email) ?? null
  },

  async createLayby(input: NewLayby): Promise<string> {
    const id = `layby-${nextId++}`
    db.laybys.push({
      id,
      shopId: input.shopId,
      customerId: input.customerId,
      itemName: input.itemName,
      itemPhotoPath: null,
      price: input.price,
      deposit: input.deposit,
      termMonths: input.termMonths,
      status: input.status,
      cancelReason: null,
      createdAt: '2026-11-24T08:00:00Z',
      shop: shopDetails(input.shopId),
      customer: customerDetails(input.customerId),
      instalments: input.instalments,
      payments: [
        {
          id: `payment-${nextId++}`,
          amount: input.deposit,
          method: 'deposit',
          status: 'confirmed',
          createdBy: input.createdBy,
          createdAt: '2026-11-24T08:00:00Z',
          reviewedAt: '2026-11-24T08:00:00Z',
          rejectReason: null,
          proofPath: null,
        },
      ],
    })
    return id
  },

  async listLaybys(filter: LaybyFilter): Promise<LaybyRecord[]> {
    return db.laybys.filter((l) =>
      'customerId' in filter ? l.customerId === filter.customerId : l.shopId === filter.shopId,
    )
  },

  async getLayby(id: string): Promise<LaybyRecord | null> {
    return db.laybys.find((l) => l.id === id) ?? null
  },

  async setLaybyStatus(id: string, status: LaybyStatus, cancelReason: string | null = null): Promise<void> {
    const layby = db.laybys.find((l) => l.id === id)
    if (!layby) throw new Error(`fake db: no layby ${id}`)
    layby.status = status
    layby.cancelReason = cancelReason
  },
}

// finds a payment anywhere in the fake db, with the lay-by it belongs to
export function findFakePayment(id: string) {
  for (const layby of db.laybys) {
    const payment = layby.payments.find((p) => p.id === id)
    if (payment) return { layby, payment }
  }
  return null
}

export const fakePaymentRepo = {
  async addPayment(input: NewPayment): Promise<string> {
    const layby = db.laybys.find((l) => l.id === input.laybyId)
    if (!layby) throw new Error(`fake db: no layby ${input.laybyId}`)
    const id = `payment-${nextId++}`
    layby.payments.push({
      id,
      amount: input.amount,
      method: input.method,
      status: input.status,
      createdBy: input.createdBy,
      createdAt: '2026-11-24T09:00:00Z',
      reviewedAt: input.status === 'confirmed' ? '2026-11-24T09:00:00Z' : null,
      rejectReason: null,
      proofPath: input.proofPath,
    })
    return id
  },

  async findPayment(id: string): Promise<PaymentRef | null> {
    const found = findFakePayment(id)
    return found ? { id, laybyId: found.layby.id } : null
  },

  async reviewPayment(
    id: string,
    review: { status: 'confirmed' | 'rejected'; rejectReason: string | null },
  ): Promise<boolean> {
    const found = findFakePayment(id)
    if (!found || found.payment.status !== 'pending') return false
    found.payment.status = review.status
    found.payment.rejectReason = review.rejectReason
    found.payment.reviewedAt = '2026-11-24T10:00:00Z'
    return true
  },

  async proofExists(path: string): Promise<boolean> {
    return db.proofFiles.includes(path)
  },

  async signedProofUrl(path: string): Promise<string> {
    return `https://storage.test/signed/${path}?token=abc`
  },
}

// handy for GET tests: puts a lay-by straight into the fake db
export function seedLayby(overrides: Partial<LaybyRecord> & { shopId: string; customerId: string }) {
  const record: LaybyRecord = {
    id: `layby-${nextId++}`,
    itemName: 'School blazer',
    itemPhotoPath: null,
    price: 1000,
    deposit: 100,
    termMonths: 3,
    status: 'active',
    cancelReason: null,
    createdAt: '2026-11-24T08:00:00Z',
    shop: shopDetails(overrides.shopId),
    customer: customerDetails(overrides.customerId),
    instalments: [
      { seq: 1, dueDate: '2026-12-24', amount: 300 },
      { seq: 2, dueDate: '2027-01-24', amount: 300 },
      { seq: 3, dueDate: '2027-02-24', amount: 300 },
    ],
    payments: [],
    ...overrides,
  }
  db.laybys.push(record)
  return record
}
