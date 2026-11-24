import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getMe } from '../lib/api'
import type { Profile } from '../types'
import { AuthContext, type AuthValue, type SignUpData } from './AuthContext'

// I remember whose profile I loaded, so I never show the wrong person's details
type LoadedProfile = { userId: string; profile: Profile }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Supabase tells me the current session straight away,
  // then again every time someone logs in, logs out or the token refreshes
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setSessionReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // whenever I get a (new) token, I ask my server who this user is and what their role is
  const token = session?.access_token
  const userId = session?.user.id
  useEffect(() => {
    if (!token || !userId) return
    let cancelled = false

    getMe(token)
      .then((profile) => {
        if (cancelled) return
        setLoaded({ userId, profile })
        setProfileError(null)
      })
      .catch(() => {
        if (!cancelled) setProfileError('Could not load your profile. Please try again.')
      })

    // if the token changes before the answer comes back, I ignore the old answer
    return () => {
      cancelled = true
    }
  }, [token, userId])

  // only use the loaded profile if it belongs to the person logged in right now
  const profile = loaded && loaded.userId === userId ? loaded.profile : null
  const loading = !sessionReady || (session !== null && profile === null && profileError === null)

  async function signUp(data: SignUpData) {
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        // my database trigger reads these to create the profile (and the shop for owners)
        data: {
          full_name: data.fullName,
          phone: data.phone,
          role: data.role,
          shop_name: data.shopName,
          shop_area: data.shopArea,
        },
        // the "confirm your email" link brings people back to my log in page
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    if (error) throw error
    // when email confirmation is switched on, there's no session until they click the link
    return { needsEmailConfirmation: result.session === null }
  }

  async function logIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logOut() {
    setProfileError(null)
    await supabase.auth.signOut()
  }

  const value: AuthValue = { session, profile, loading, profileError, signUp, logIn, logOut }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
