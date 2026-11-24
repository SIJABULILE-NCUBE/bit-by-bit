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

export const db: { shops: FakeShop[]; profiles: ProfileRecord[]; laybys: LaybyRecord[] } = {
  shops: [],
  profiles: [],
  laybys: [],
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
