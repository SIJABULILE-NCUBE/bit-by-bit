import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { db, resetFakeDb, seedLayby, findFakePayment } from './fakeLaybyRepo.js'
import type { PaymentRecord } from '../src/repositories/laybyRepo.js'

// fake login, fake database and fake file storage
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
const asCustomer = as('customer-token')
const asOwner = as('owner-token')

function payment(id: string, amount: number, status: PaymentRecord['status'], extra: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    id,
    amount,
    method: 'eft',
    status,
    createdBy: 'user-customer',
    createdAt: '2026-11-24T08:00:00Z',
    reviewedAt: null,
    rejectReason: null,
    proofPath: null,
    ...extra,
  }
}

// Thandi's R1 000 blazer at Sipho's shop: R100 deposit paid, so R900 is left
function thandisLayby(extraPayments: PaymentRecord[] = [], overrides = {}) {
  return seedLayby({
    shopId: 'shop-1',
    customerId: 'user-customer',
    payments: [payment('deposit-1', 100, 'confirmed', { method: 'deposit', createdBy: 'user-owner' }), ...extraPayments],
    ...overrides,
  })
}

beforeEach(() => {
  resetFakeDb()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-24T08:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('POST /api/laybys/:id/payments (customer uploads proof)', () => {
  it('gives 401 without a token', async () => {
    const layby = thandisLayby()
    const res = await request(app).post(`/api/laybys/${layby.id}/payments`).send({ amount: 300 })
    expect(res.status).toBe(401)
  })

  it('saves a pending EFT payment that does not change the balance yet', async () => {
    const layby = thandisLayby()
    db.proofFiles.push(`${layby.id}/slip.pdf`)

    const res = await asCustomer(request(app).post(`/api/laybys/${layby.id}/payments`)).send({
      amount: 300,
      proofPath: `${layby.id}/slip.pdf`,
    })

    expect(res.status).toBe(201)
    expect(res.body.payment).toMatchObject({ amount: 300, method: 'eft', status: 'pending' })
    // only confirmed payments count
    expect(res.body.layby.balance).toBe(900)
    expect(layby.payments.at(-1)).toMatchObject({ proofPath: `${layby.id}/slip.pdf`, createdBy: 'user-customer' })
  })

  it('needs a proof file that was really uploaded to this lay-by', async () => {
    const layby = thandisLayby()
    db.proofFiles.push(`${layby.id}/slip.pdf`, 'other-layby/slip.pdf')
    const post = (body: object) => asCustomer(request(app).post(`/api/laybys/${layby.id}/payments`)).send(body)

    expect((await post({ amount: 300 })).body.error).toMatch(/proof of payment/i)
    expect((await post({ amount: 300, proofPath: 'other-layby/slip.pdf' })).status).toBe(400)
    expect((await post({ amount: 300, proofPath: `${layby.id}/never-uploaded.pdf` })).status).toBe(400)
    expect(layby.payments).toHaveLength(1)
  })

  it("gives 404 for someone else's lay-by", async () => {
    const layby = seedLayby({ shopId: 'shop-1', customerId: 'user-customer-2' })
    db.proofFiles.push(`${layby.id}/slip.pdf`)
    const res = await asCustomer(request(app).post(`/api/laybys/${layby.id}/payments`)).send({
      amount: 100,
      proofPath: `${layby.id}/slip.pdf`,
    })
    expect(res.status).toBe(404)
    expect(layby.payments).toHaveLength(0)
  })

  it('refuses to overpay, counting slips that are still waiting for review', async () => {
    // R900 left, but R700 is already waiting, so at most R200 more
    const layby = thandisLayby([payment('p-wait', 700, 'pending')])
    db.proofFiles.push(`${layby.id}/slip.pdf`)
    const post = (amount: number) =>
      asCustomer(request(app).post(`/api/laybys/${layby.id}/payments`)).send({ amount, proofPath: `${layby.id}/slip.pdf` })

    const tooMuch = await post(200.01)
    expect(tooMuch.status).toBe(400)
    expect(tooMuch.body.error).toMatch(/R 200,00/)
    expect((await post(200)).status).toBe(201)
  })

  it("can't pay a lay-by that is no longer active", async () => {
    const layby = thandisLayby([], { status: 'cancelled' })
    db.proofFiles.push(`${layby.id}/slip.pdf`)
    const res = await asCustomer(request(app).post(`/api/laybys/${layby.id}/payments`)).send({
      amount: 100,
      proofPath: `${layby.id}/slip.pdf`,
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/cancelled/i)
  })
})

describe('POST /api/laybys/:id/payments (owner records cash)', () => {
  it('saves cash as confirmed straight away', async () => {
    const layby = thandisLayby()
    const res = await asOwner(request(app).post(`/api/laybys/${layby.id}/payments`)).send({ amount: 300 })

    expect(res.status).toBe(201)
    expect(res.body.payment).toMatchObject({ amount: 300, method: 'cash', status: 'confirmed' })
    expect(res.body.layby).toMatchObject({ paid: 400, balance: 600, status: 'active' })
  })

  it('marks the lay-by completed when the cash pays it off', async () => {
    const layby = thandisLayby()
    const res = await asOwner(request(app).post(`/api/laybys/${layby.id}/payments`)).send({ amount: 900 })

    expect(res.status).toBe(201)
    expect(res.body.layby).toMatchObject({ balance: 0, progress: 100, status: 'completed' })
    expect(layby.status).toBe('completed')
  })

  it('refuses cash that is more than the balance', async () => {
    const layby = thandisLayby()
    const res = await asOwner(request(app).post(`/api/laybys/${layby.id}/payments`)).send({ amount: 900.01 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/R 900,00/)
  })

  it("gives 404 to another shop's owner", async () => {
    const layby = thandisLayby()
    const res = await as('owner2-token')(request(app).post(`/api/laybys/${layby.id}/payments`)).send({ amount: 100 })
    expect(res.status).toBe(404)
    expect(layby.payments).toHaveLength(1)
  })
})

describe('GET /api/payments (payments to review)', () => {
  it('is for shop owners only', async () => {
    const res = await asCustomer(request(app).get('/api/payments'))
    expect(res.status).toBe(403)
  })

  it("lists only my shop's pending payments, oldest first, with the item and customer", async () => {
    thandisLayby([
      payment('p-new', 200, 'pending', { createdAt: '2026-11-24T10:00:00Z', proofPath: 'x/new.pdf' }),
      payment('p-old', 100, 'pending', { createdAt: '2026-11-23T10:00:00Z', proofPath: 'x/old.pdf' }),
      payment('p-done', 50, 'confirmed'),
    ])
    seedLayby({ shopId: 'shop-2', customerId: 'user-customer-2', payments: [payment('p-other-shop', 80, 'pending')] })

    const res = await asOwner(request(app).get('/api/payments'))

    expect(res.status).toBe(200)
    expect(res.body.map((p: { id: string }) => p.id)).toEqual(['p-old', 'p-new'])
    expect(res.body[0]).toMatchObject({
      amount: 100,
      hasProof: true,
      layby: { itemName: 'School blazer', balance: 850 },
      customer: { fullName: 'Thandi Mokoena', phone: '0821234567' },
    })
    // I never send the storage path itself
    expect(res.body[0].proofPath).toBeUndefined()
  })
})

describe('GET /api/payments/:id/proof (view proof)', () => {
  it("gives the shop's owner and the customer a short-lived link", async () => {
    thandisLayby([payment('p1', 300, 'pending', { proofPath: 'layby-1/slip.pdf' })])

    const owner = await asOwner(request(app).get('/api/payments/p1/proof'))
    expect(owner.status).toBe(200)
    expect(owner.body.url).toBe('https://storage.test/signed/layby-1/slip.pdf?token=abc')

    const customer = await asCustomer(request(app).get('/api/payments/p1/proof'))
    expect(customer.status).toBe(200)
  })

  it('gives 404 to anyone else, and for payments without a file', async () => {
    thandisLayby([payment('p1', 300, 'pending', { proofPath: 'layby-1/slip.pdf' })])
    expect((await as('owner2-token')(request(app).get('/api/payments/p1/proof'))).status).toBe(404)
    expect((await as('customer2-token')(request(app).get('/api/payments/p1/proof'))).status).toBe(404)
    expect((await asOwner(request(app).get('/api/payments/deposit-1/proof'))).status).toBe(404)
  })
})

describe('PATCH /api/payments/:id (confirm or reject)', () => {
  it('only lets owners review payments', async () => {
    thandisLayby([payment('p1', 300, 'pending')])
    const res = await asCustomer(request(app).patch('/api/payments/p1')).send({ action: 'confirm' })
    expect(res.status).toBe(403)
    expect(findFakePayment('p1')!.payment.status).toBe('pending')
  })

  it("gives 404 to another shop's owner", async () => {
    thandisLayby([payment('p1', 300, 'pending')])
    const res = await as('owner2-token')(request(app).patch('/api/payments/p1')).send({ action: 'confirm' })
    expect(res.status).toBe(404)
    expect(findFakePayment('p1')!.payment.status).toBe('pending')
  })

  it('confirming counts the payment towards the balance', async () => {
    thandisLayby([payment('p1', 300, 'pending')])
    const res = await asOwner(request(app).patch('/api/payments/p1')).send({ action: 'confirm' })

    expect(res.status).toBe(200)
    expect(res.body.payment).toMatchObject({ id: 'p1', status: 'confirmed' })
    expect(res.body.layby).toMatchObject({ paid: 400, balance: 600, status: 'active' })
  })

  it('confirming the last payment completes the lay-by', async () => {
    const layby = thandisLayby([payment('p1', 900, 'pending')])
    const res = await asOwner(request(app).patch('/api/payments/p1')).send({ action: 'confirm' })

    expect(res.status).toBe(200)
    expect(res.body.layby.status).toBe('completed')
    expect(layby.status).toBe('completed')
  })

  it('needs a reason to reject, and saves it', async () => {
    const layby = thandisLayby([payment('p1', 300, 'pending')])

    const noReason = await asOwner(request(app).patch('/api/payments/p1')).send({ action: 'reject', reason: '  ' })
    expect(noReason.status).toBe(400)

    const res = await asOwner(request(app).patch('/api/payments/p1')).send({ action: 'reject', reason: 'Blurry slip' })
    expect(res.status).toBe(200)
    expect(res.body.payment).toMatchObject({ status: 'rejected', rejectReason: 'Blurry slip' })
    expect(res.body.layby.balance).toBe(900)
    expect(layby.status).toBe('active')
  })

  it("can't review the same payment twice", async () => {
    thandisLayby([payment('p1', 300, 'pending')])
    await asOwner(request(app).patch('/api/payments/p1')).send({ action: 'confirm' })
    const again = await asOwner(request(app).patch('/api/payments/p1')).send({ action: 'confirm' })
    expect(again.status).toBe(409)
  })

  it("won't confirm a slip that would now overpay (cash was paid in the meantime)", async () => {
    thandisLayby([payment('cash', 800, 'confirmed', { method: 'cash' }), payment('p1', 300, 'pending')])
    const res = await asOwner(request(app).patch('/api/payments/p1')).send({ action: 'confirm' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/R 100,00/)
    expect(findFakePayment('p1')!.payment.status).toBe('pending')
  })

  it('asks for confirm or reject', async () => {
    thandisLayby([payment('p1', 300, 'pending')])
    const res = await asOwner(request(app).patch('/api/payments/p1')).send({ action: 'maybe' })
    expect(res.status).toBe(400)
  })
})
