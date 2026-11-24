import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// the server's Supabase client uses the service role key
// that key skips RLS, so it must ONLY ever live on the server (never in the client)
let client: SupabaseClient | null = null

// I create it the first time it's needed, so tests (and imports) don't need real keys
export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in server/.env')
    }
    client = createClient(url, key, {
      // the server doesn't keep a login session of its own
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}
