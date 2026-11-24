import type { RequestHandler } from 'express'
import { getSupabaseAdmin } from '../lib/supabase.js'
import type { AuthUser } from '../types.js'

// checks the "Authorization: Bearer <token>" header on every protected request
// if the token is real, I load the user's profile (with their role) onto req.user
export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization ?? ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Please log in' })
    return
  }

  const supabase = getSupabaseAdmin()

  // Supabase checks the token for me (signature + expiry)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    res.status(401).json({ error: 'Your session has expired, please log in again' })
    return
  }

  // I always read the role from my profiles table, never from the token's
  // user_metadata, because users can edit their own metadata
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    next(profileError)
    return
  }
  if (!profile) {
    res.status(401).json({ error: 'No profile found for this account' })
    return
  }

  const user: AuthUser = {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    phone: profile.phone,
    role: profile.role,
  }
  req.user = user
  next()
}
