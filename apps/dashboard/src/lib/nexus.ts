import { createNexusClient } from '@nexus/sdk'
import { useAuthStore } from '@/store/auth'

let _client: ReturnType<typeof createNexusClient> | null = null

export function getNexusClient() {
  if (_client) return _client

  _client = createNexusClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
    getAccessToken: () => useAuthStore.getState().accessToken,
    getTokenExpiry: () => useAuthStore.getState().expiresAt,
    setAccessToken: (token: string) => useAuthStore.setState({ accessToken: token }),
    setTokenExpiry: (expiresAt: number) => useAuthStore.setState({ expiresAt }),
    refreshFn: async () => {
      const res = await fetch('/api/auth/session', { cache: 'no-store' })
      if (!res.ok) throw new Error('Session expired')
      return res.json() as Promise<{ accessToken: string; expiresIn: number }>
    },
    onUnauthorized: () => {
      useAuthStore.getState().clearToken()
      resetNexusClient()
      // Signal via store — React components react with router.replace('/login')
      useAuthStore.setState({ status: 'unauthenticated' })
    },
  })

  return _client
}

export function resetNexusClient() {
  _client = null
}

export const nexus = {
  get client() {
    return getNexusClient()
  },
}
