import type { Profile } from '../types'

// where my Express server lives (set in client/.env)
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

// asks my server "who am I?" using the Supabase login token
export async function getMe(token: string): Promise<Profile> {
  const res = await fetch(`${API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`GET /api/me failed with status ${res.status}`)
  }
  return res.json()
}
