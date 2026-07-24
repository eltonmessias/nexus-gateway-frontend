import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'

// Module-level flag survives React 18 Strict Mode's simulated unmount/remount,
// which resets useRef to its initial value. This ensures we only ever fire one
// session-restore fetch per JS session (i.e. per full page load).
let _sessionInitStarted = false

export function useAuthInit() {
  const setToken = useAuthStore((s) => s.setToken)
  const clearToken = useAuthStore((s) => s.clearToken)
  const setStatus = useAuthStore((s) => s.setStatus)

  useEffect(() => {
    if (_sessionInitStarted) return
    _sessionInitStarted = true

    // If we already have a valid in-memory token (e.g. navigating back after login),
    // don't hit the network — just confirm authenticated status.
    const { accessToken, expiresAt } = useAuthStore.getState()
    if (accessToken && expiresAt && Date.now() < expiresAt - 30_000) {
      setStatus('authenticated')
      return
    }

    setStatus('loading')

    const ac = new AbortController()
    fetch('/api/auth/session', { cache: 'no-store', signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) { clearToken(); return }
        const data = await res.json() as { accessToken: string; expiresIn: number }
        setToken(data.accessToken, data.expiresIn)
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== 'AbortError') clearToken()
      })

    return () => { ac.abort() }
  // Actions from the store are stable references — safe to omit from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
