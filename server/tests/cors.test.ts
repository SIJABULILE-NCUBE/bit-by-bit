import { describe, it, expect, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'

// CORS decides which websites may call my API from the browser
const original = process.env.CLIENT_URL

afterEach(() => {
  if (original === undefined) delete process.env.CLIENT_URL
  else process.env.CLIENT_URL = original
})

// asks the API as if the browser was on `origin`, and returns the CORS header it got back
async function allowOriginHeader(origin: string) {
  const res = await request(createApp()).get('/api/health').set('Origin', origin)
  return res.headers['access-control-allow-origin']
}

describe('CORS', () => {
  it('allows my local React app when CLIENT_URL is not set', async () => {
    delete process.env.CLIENT_URL
    expect(await allowOriginHeader('http://localhost:5173')).toBe('http://localhost:5173')
  })

  it('allows the site in CLIENT_URL', async () => {
    process.env.CLIENT_URL = 'https://bitbybit.vercel.app'
    expect(await allowOriginHeader('https://bitbybit.vercel.app')).toBe('https://bitbybit.vercel.app')
  })

  it('does not mind a trailing slash in CLIENT_URL', async () => {
    process.env.CLIENT_URL = 'https://bitbybit.vercel.app/'
    expect(await allowOriginHeader('https://bitbybit.vercel.app')).toBe('https://bitbybit.vercel.app')
  })

  it('allows a comma-separated list of sites', async () => {
    process.env.CLIENT_URL = 'https://bitbybit.vercel.app, http://localhost:5173'
    expect(await allowOriginHeader('http://localhost:5173')).toBe('http://localhost:5173')
    expect(await allowOriginHeader('https://bitbybit.vercel.app')).toBe('https://bitbybit.vercel.app')
  })

  it('does not allow any other site', async () => {
    process.env.CLIENT_URL = 'https://bitbybit.vercel.app'
    expect(await allowOriginHeader('https://evil.example.com')).toBeUndefined()
  })
})
