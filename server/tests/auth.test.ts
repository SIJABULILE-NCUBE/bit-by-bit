import { describe, it, expect, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { requireAuth } from '../src/middleware/requireAuth.js'
import { requireRole } from '../src/middleware/requireRole.js'

// I swap the real Supabase client for my fake one
vi.mock('../src/lib/supabase.js', async () => {
  const { fakeSupabase } = await import('./fakeSupabase.js')
  return { getSupabaseAdmin: () => fakeSupabase }
})

// a tiny app with one owner-only route, just for testing the middleware
function makeApp() {
  const app = express()
  app.get('/owner-only', requireAuth, requireRole('owner'), (req, res) => {
    res.json({ ok: true, role: req.user?.role })
  })
  app.get('/customer-only', requireAuth, requireRole('customer'), (_req, res) => {
    res.json({ ok: true })
  })
  return app
}

describe('requireAuth', () => {
  it('gives 401 when there is no token', async () => {
    const res = await request(makeApp()).get('/owner-only')
    expect(res.status).toBe(401)
  })

  it('gives 401 when the header is not a Bearer token', async () => {
    const res = await request(makeApp()).get('/owner-only').set('Authorization', 'owner-token')
    expect(res.status).toBe(401)
  })

  it('gives 401 when the token is not valid', async () => {
    const res = await request(makeApp())
      .get('/owner-only')
      .set('Authorization', 'Bearer made-up-token')
    expect(res.status).toBe(401)
  })

  it('gives 401 when the user has no profile', async () => {
    const res = await request(makeApp())
      .get('/owner-only')
      .set('Authorization', 'Bearer no-profile-token')
    expect(res.status).toBe(401)
  })
})

describe('requireRole', () => {
  it('gives 403 when a customer tries an owner route', async () => {
    const res = await request(makeApp())
      .get('/owner-only')
      .set('Authorization', 'Bearer customer-token')
    expect(res.status).toBe(403)
  })

  it('gives 403 when an owner tries a customer route', async () => {
    const res = await request(makeApp())
      .get('/customer-only')
      .set('Authorization', 'Bearer owner-token')
    expect(res.status).toBe(403)
  })

  it('lets an owner through to an owner route', async () => {
    const res = await request(makeApp())
      .get('/owner-only')
      .set('Authorization', 'Bearer owner-token')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, role: 'owner' })
  })

  it('lets a customer through to a customer route', async () => {
    const res = await request(makeApp())
      .get('/customer-only')
      .set('Authorization', 'Bearer customer-token')
    expect(res.status).toBe(200)
  })
})
