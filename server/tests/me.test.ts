import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'

vi.mock('../src/lib/supabase.js', async () => {
  const { fakeSupabase } = await import('./fakeSupabase.js')
  return { getSupabaseAdmin: () => fakeSupabase }
})

// GET /api/me tells the client who is logged in and what their role is
describe('GET /api/me', () => {
  it('gives 401 without a token', async () => {
    const res = await request(createApp()).get('/api/me')
    expect(res.status).toBe(401)
  })

  it('returns the customer profile', async () => {
    const res = await request(createApp())
      .get('/api/me')
      .set('Authorization', 'Bearer customer-token')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      id: 'user-customer',
      email: 'thandi@example.com',
      fullName: 'Thandi Mokoena',
      phone: '0821234567',
      role: 'customer',
    })
  })

  it('returns the owner profile', async () => {
    const res = await request(createApp())
      .get('/api/me')
      .set('Authorization', 'Bearer owner-token')
    expect(res.status).toBe(200)
    expect(res.body.role).toBe('owner')
    expect(res.body.fullName).toBe('Sipho Dlamini')
  })
})
