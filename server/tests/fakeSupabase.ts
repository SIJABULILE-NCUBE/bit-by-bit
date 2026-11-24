import { vi } from 'vitest'

// a pretend Supabase so my tests never touch the real database
// each "token" maps to a pretend user, and each user to a pretend profile

const users: Record<string, { id: string; email: string }> = {
  'customer-token': { id: 'user-customer', email: 'thandi@example.com' },
  'owner-token': { id: 'user-owner', email: 'sipho@example.com' },
  'no-profile-token': { id: 'user-ghost', email: 'ghost@example.com' },
}

const profiles: Record<string, object> = {
  'user-customer': {
    id: 'user-customer',
    email: 'thandi@example.com',
    full_name: 'Thandi Mokoena',
    phone: '0821234567',
    role: 'customer',
  },
  'user-owner': {
    id: 'user-owner',
    email: 'sipho@example.com',
    full_name: 'Sipho Dlamini',
    phone: '0831234567',
    role: 'owner',
  },
}

export const fakeSupabase = {
  auth: {
    // like the real getUser: a known token gives a user, anything else gives an error
    getUser: vi.fn(async (token: string) => {
      const user = users[token]
      return user
        ? { data: { user }, error: null }
        : { data: { user: null }, error: { message: 'invalid JWT' } }
    }),
  },
  // just enough of from('profiles').select(...).eq('id', x).maybeSingle()
  from: vi.fn(() => ({
    select: () => ({
      eq: (_column: string, id: string) => ({
        maybeSingle: async () => ({ data: profiles[id] ?? null, error: null }),
      }),
    }),
  })),
}
