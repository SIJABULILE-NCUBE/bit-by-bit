import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { resetFakeDb, seedLayby } from './fakeLaybyRepo.js'
import type { PaymentRecord } from '../src/repositories/laybyRepo.js'

vi.mock('../src/lib/supabase.js', async () => {
  const { fakeSupabase } = await import('./fakeSupabase.js')
  return { getSupabaseAdmin: () => fakeSupabase }
})
vi.mock('../src/repositories/laybyRepo.js', async () => {
  const { fakeLaybyRepo } = await import('./fakeLaybyRepo.js')
  return { laybyRepo: fakeLaybyRepo }
})
vi.mock('../src/repositories/paymentRepo.js', async () => {
  const { fakePaymentRepo } = await import('./fakeLaybyRepo.js')
  return { paymentRepo: fakePaymentRepo }
})

const app = createApp()
const as = (token: string) => (req: request.Test) => req.set('Authorization', `Bearer ${token}`)
const asOwner = as('owner-token')

function payment(amount: number, status: PaymentRecord['status']): PaymentRecord {
  return {
    id: `p-${Math.random()}`,
    amount,
    method: 'eft',
    status,
    createdBy: 'user-customer',
    createdAt: '2026-11-24T08:00:00Z',
    reviewedAt: null,
    rejectReason: null,
    proofPath: null,
  }
}

const mine = { shopId: 'shop-1', customerId: 'user-customer' }

beforeEach(() => {
  resetFakeDb()
  vi.useFakeTimers({ toFake: ['Date'] })
  // after the first instalment (24 Dec) was due
  vi.setSystemTime(new Date('2026-12-30T08:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/dashboard', () => {
  it('is for shop owners only', async () => {
    expect((await request(app).get('/api/dashboard')).status).toBe(401)
    expect((await as('customer-token')(request(app).get('/api/dashboard'))).status).toBe(403)
  })

  it("adds up only my shop's lay-bys, from the real data", async () => {
    // on track (owes R600)
    seedLayby({ ...mine, payments: [payment(100, 'confirmed'), payment(300, 'confirmed')] })
    // overdue (owes R900) with a slip waiting
    seedLayby({ ...mine, itemName: 'Late blazer', payments: [payment(100, 'confirmed'), payment(300, 'pending')] })
    // ready to collect
    seedLayby({ ...mine, itemName: 'Paid shoes', status: 'completed', payments: [payment(1000, 'confirmed')] })
    // another shop's lay-by never counts
    seedLayby({ shopId: 'shop-2', customerId: 'user-customer-2', payments: [payment(100, 'pending')] })

    const res = await asOwner(request(app).get('/api/dashboard'))

    expect(res.status).toBe(200)
    expect(res.body.shop).toMatchObject({ name: 'Kasi Kids Wear' })
    expect(res.body.totals).toEqual({
      active: 2,
      overdue: 1,
      readyToCollect: 1,
      paymentsToReview: 1,
      totalOutstanding: 1500,
    })
    // the lay-bys that need the owner today
    expect(res.body.overdueLaybys.map((l: { itemName: string }) => l.itemName)).toEqual(['Late blazer'])
    expect(res.body.readyLaybys.map((l: { itemName: string }) => l.itemName)).toEqual(['Paid shoes'])
  })
})

describe('PATCH /api/laybys/:id (collect or cancel)', () => {
  it('is for the shop owner only', async () => {
    const layby = seedLayby({ ...mine, status: 'completed' })
    const customer = await as('customer-token')(request(app).patch(`/api/laybys/${layby.id}`)).send({ action: 'collect' })
    expect(customer.status).toBe(403)
    const otherShop = await as('owner2-token')(request(app).patch(`/api/laybys/${layby.id}`)).send({ action: 'collect' })
    expect(otherShop.status).toBe(404)
    expect(layby.status).toBe('completed')
  })

  it('marks a paid-up lay-by as collected', async () => {
    const layby = seedLayby({ ...mine, status: 'completed', payments: [payment(1000, 'confirmed')] })
    const res = await asOwner(request(app).patch(`/api/laybys/${layby.id}`)).send({ action: 'collect' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('collected')
    expect(layby.status).toBe('collected')
  })

  it("won't collect a lay-by that isn't fully paid", async () => {
    const layby = seedLayby({ ...mine, payments: [payment(100, 'confirmed')] })
    const res = await asOwner(request(app).patch(`/api/laybys/${layby.id}`)).send({ action: 'collect' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/fully paid/)
    expect(layby.status).toBe('active')
  })

  it('cancels with a reason, and needs one', async () => {
    const layby = seedLayby({ ...mine })
    const noReason = await asOwner(request(app).patch(`/api/laybys/${layby.id}`)).send({ action: 'cancel' })
    expect(noReason.status).toBe(400)

    const res = await asOwner(request(app).patch(`/api/laybys/${layby.id}`)).send({
      action: 'cancel',
      reason: 'Customer asked to cancel',
    })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'cancelled', cancelReason: 'Customer asked to cancel' })
  })

  it("can't change a lay-by once it's collected", async () => {
    const layby = seedLayby({ ...mine, status: 'collected' })
    const res = await asOwner(request(app).patch(`/api/laybys/${layby.id}`)).send({ action: 'cancel', reason: 'x' })
    expect(res.status).toBe(400)
    expect(layby.status).toBe('collected')
  })

  it('asks for collect or cancel', async () => {
    const layby = seedLayby({ ...mine })
    const res = await asOwner(request(app).patch(`/api/laybys/${layby.id}`)).send({ action: 'delete' })
    expect(res.status).toBe(400)
  })
})
