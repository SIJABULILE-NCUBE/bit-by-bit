import { createClient } from '@supabase/supabase-js'

// the browser's Supabase client
// the anon key is fine to ship to the browser: my RLS policies protect the data
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in client/.env')
}

export const supabase = createClient(url, anonKey)
