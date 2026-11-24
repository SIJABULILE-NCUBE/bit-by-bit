import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ApiError, getLayby } from '../lib/api'
import type { LaybyDetail } from '../types'

type LaybyState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; layby: LaybyDetail }

// loads one lay-by for the detail page
export function useLayby(id: string | undefined): LaybyState {
  const { session } = useAuth()
  const token = session?.access_token
  const [state, setState] = useState<LaybyState>({ status: 'loading' })

  useEffect(() => {
    if (!token || !id) return
    let cancelled = false

    getLayby(token, id)
      .then((layby) => {
        if (!cancelled) setState({ status: 'ready', layby })
      })
      .catch((err) => {
        if (cancelled) return
        // 404 means it doesn't exist OR it isn't theirs (the server doesn't say which)
        if (err instanceof ApiError && err.status === 404) setState({ status: 'not-found' })
        else setState({ status: 'error', message: "We couldn't load this lay-by. Please try again." })
      })

    return () => {
      cancelled = true
    }
  }, [token, id])

  return state
}
