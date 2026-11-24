import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listLaybys } from '../lib/api'
import type { LaybySummary } from '../types'

type LaybysState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; laybys: LaybySummary[] }

// loads the logged-in user's lay-bys (the server decides which ones they may see)
export function useLaybys(): LaybysState {
  const { session } = useAuth()
  const token = session?.access_token
  const [state, setState] = useState<LaybysState>({ status: 'loading' })

  useEffect(() => {
    if (!token) return
    let cancelled = false

    listLaybys(token)
      .then((laybys) => {
        if (!cancelled) setState({ status: 'ready', laybys })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', message: "We couldn't load your lay-bys. Please try again." })
      })

    // if the page closes before the answer arrives, I ignore it
    return () => {
      cancelled = true
    }
  }, [token])

  return state
}
