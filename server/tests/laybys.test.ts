import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { db, resetFakeDb, seedLayby } from './fakeLaybyRepo.js'
import type { PaymentRecord } from '../src/repositories/laybyRepo.js'

// fake login (who is calling) and a fake database (what's stored)
vi.mock('../src/lib/supabase.js', async () => {
  const { fakeSupabase } = await import('./fakeSupabase.js')
  return { getSupabaseAdmin: () => fakeSupabase }
})
vi.mock('../src/repositories/laybyRepo.js', async () => {
  const { fakeLaybyRepo } = await import('./fakeLaybyRepo.js')
  return { laybyRepo: fakeLaybyRepo }
})

const app = createApp()

// a good request body; each test changes what it needs
const goodLayby = {
  customerEmail: 'thandi@example.com',
  itemName: 'School blazer + 2 shirts',
  price: 1000,
  deposit: 100,
  termMonths: 3,
}

const asOwner = (req: request.Test) => req.set('Authorization', 'Bearer owner-token')

function payment(amount: number, status: PaymentRecord['status']): PaymentRecord {
  return {
    id: `p-${amount}-${status}`,
    amount,
    method: 'eft',
    status,
    createdBy: 'user-customer',
    createdAt: '2026-11-24T08:00:00Z',
    reviewedAt: null,
    rejectReason: null,
  }
}

beforeEach(() => {
  resetFakeDb()
  // I freeze "today" so the due dates and overdue checks are predictable
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-24T08:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('POST /api/laybys', () => {
  it('gives 401 without a token', async () => {
    const res = await request(app).post('/api/laybys').send(goodLayby)
    expect(res.status).toBe(401)
  })

  it('does not let a customer create a lay-by', async () => {
    const res = await request(app)
      .post('/api/laybys')
      .set('Authorization', 'Bearer customer-token')
      .send(goodLayby)
    expect(res.status).toBe(403)
    expect(db.laybys).toHaveLength(0)
  })

  it('lets an owner create a lay-by with its schedule and deposit', async () => {
    const res = await asOwner(request(app).post('/api/laybys')).send(goodLayby)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      itemName: 'School blazer + 2 shirts',
      price: 1000,
      deposit: 100,
      termMonths: 3,
      status: 'active',
      shop: { id: 'shop-1', name: 'Kasi Kids Wear' },
      customer: { id: 'user-customer', fullName: 'Thandi Mokoena' },
      paid: 100,
      balance: 900,
      progress: 10,
      nextDue: { dueDate: '2026-12-24', amount: 300 },
      overdue: false,
    })

    // what got saved
    expect(db.laybys).toHaveLength(1)
    const saved = db.laybys[0]
    expect(saved.shopId).toBe('shop-1')
    expect(saved.instalments.map((i) => i.dueDate)).toEqual(['2026-12-24', '2027-01-24', '2027-02-24'])
    expect(saved.instalments.reduce((sum, i) => sum + i.amount, 0)).toBe(900)
    expect(saved.payments).toEqual([
      expect.objectContaining({ amount: 100, method: 'deposit', status: 'confirmed', createdBy: 'user-owner' }),
    ])
  })

  it('finds the customer even with different capitals and spaces in the email', async () => {
    const res = await asOwner(request(app).post('/api/laybys')).send({
      ...goodLayby,
      customerEmail: '  Thandi@Example.COM ',
    })
    expect(res.status).toBe(201)
    expect(res.body.customer.id).toBe('user-customer')
  })

  it("gives a clear 404 when the customer hasn't signed up", async () => {
    const res = await asOwner(request(app).post('/api/laybys')).send({
      ...goodLayby,
      customerEmail: 'nobody@example.com',
    })
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/nobody@example.com/)
    expect(res.body.error).toMatch(/sign up/i)
    expect(db.laybys).toHaveLength(0)
  })

  it('refuses to put a lay-by on a shop owner account', async () => {
    const res = await asOwner(request(app).post('/api/laybys')).send({
      ...goodLayby,
      customerEmail: 'lerato@example.com',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/shop owner/i)
  })

  it('rejects a deposit under 10% with a clear message', async () => {
    const res = await asOwner(request(app).post('/api/laybys')).send({ ...goodLayby, deposit: 50 })
    expect(res.status).toBe(400)
    expect(res.body.details).toContain('The deposit must be at least 10% of the price (R 100,00)')
    expect(db.laybys).toHaveLength(0)
  })

  it('rejects a term outside 1 to 6 months', async () => {
    const res = await asOwner(request(app).post('/api/laybys')).send({ ...goodLayby, termMonths: 7 })
    expect(res.status).toBe(400)
    expect(res.body.details).toContain('The term must be 1 to 6 whole months')
  })

  it('needs an item name, an email and real numbers', async () => {
    const res = await asOwner(request(app).post('/api/laybys')).send({
      customerEmail: 'not-an-email',
      itemName: '   ',
      price: 'lots',
      deposit: 100,
      termMonths: 3,
    })
    expect(res.status).toBe(400)
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        "Enter the customer's email address",
        'Enter the item name',
        'The price must be a number',
      ]),
    )
  })

  it('marks the lay-by completed straight away if the deposit is the full price', async () => {
    const res = await asOwner(request(app).post('/api/laybys')).send({ ...goodLayby, deposit: 1000 })
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('completed')
    expect(res.body.balance).toBe(0)
    expect(res.body.nextDue).toBeNull()
  })
})

describe('GET /api/laybys', () => {
  beforeEach(() => {
    // Thandi has one lay-by at each shop, Vusi has one at shop 1
    seedLayby({ id: 'thandi-shop1', shopId: 'shop-1', customerId: 'user-customer' })
    seedLayby({ id: 'thandi-shop2', shopId: 'shop-2', customerId: 'user-customer' })
    seedLayby({ id: 'vusi-shop1', shopId: 'shop-1', customerId: 'user-customer-2' })
  })

  const ids = (body: { id: string }[]) => body.map((l) => l.id).sort()

  it('gives 401 without a token', async () => {
    const res = await request(app).get('/api/laybys')
    expect(res.status).toBe(401)
  })

  it("shows a customer only their own lay-bys (from every shop)", async () => {
    const res = await request(app).get('/api/laybys').set('Authorization', 'Bearer customer-token')
    expect(res.status).toBe(200)
    expect(ids(res.body)).toEqual(['thandi-shop1', 'thandi-shop2'])
  })

  it("shows an owner only their own shop's lay-bys", async () => {
    const res = await asOwner(request(app).get('/api/laybys'))
    expect(ids(res.body)).toEqual(['thandi-shop1', 'vusi-shop1'])
  })

  it("never shows an owner another shop's lay-bys", async () => {
    const res = await request(app).get('/api/laybys').set('Authorization', 'Bearer owner2-token')
    expect(ids(res.body)).toEqual(['thandi-shop2'])
  })

  it('works out paid, balance and progress from confirmed payments only', async () => {
    seedLayby({
      id: 'with-payments',
      shopId: 'shop-1',
      customerId: 'user-customer-2',
      payments: [payment(100, 'confirmed'), payment(300, 'confirmed'), payment(300, 'pending'), payment(50, 'rejected')],
    })
    const res = await asOwner(request(app).get('/api/laybys'))
    const layby = res.body.find((l: { id: string }) => l.id === 'with-payments')
    expect(layby).toMatchObject({
      paid: 400,
      balance: 600,
      progress: 40,
      nextDue: { dueDate: '2027-01-24', amount: 300 },
      overdue: false,
    })
  })

  it('flags a lay-by as overdue after an unpaid due date', async () => {
    vi.setSystemTime(new Date('2026-12-26T08:00:00Z'))
    seedLayby({ id: 'late', shopId: 'shop-1', customerId: 'user-customer-2', payments: [payment(100, 'confirmed')] })
    const res = await asOwner(request(app).get('/api/laybys'))
    expect(res.body.find((l: { id: string }) => l.id === 'late').overdue).toBe(true)
  })
})
