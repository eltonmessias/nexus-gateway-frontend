import { create } from 'zustand'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    if (!payload) return {}
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      payload.length + (4 - (payload.length % 4)) % 4, '='
    )
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return {}
  }
}

interface AuthState {
  accessToken: string | null
  expiresAt: number | null
  userEmail: string | null
  userId: string | null
  organizationId: string | null
  userRole: string | null
  status: AuthStatus
  setToken: (accessToken: string, expiresIn: number, email?: string) => void
  clearToken: () => void
  setStatus: (status: AuthStatus) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  expiresAt: null,
  userEmail: null,
  userId: null,
  organizationId: null,
  userRole: null,
  status: 'idle',

  setToken: (accessToken, expiresIn, email) => {
    const claims = decodeJwtPayload(accessToken)
    set({
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      status: 'authenticated',
      userId: typeof claims.userId === 'string' ? claims.userId : null,
      organizationId: typeof claims.organizationId === 'string' ? claims.organizationId : null,
      userRole: typeof claims.role === 'string' ? claims.role : null,
      ...(email !== undefined && { userEmail: email }),
    })
  },

  clearToken: () =>
    set({
      accessToken: null,
      expiresAt: null,
      status: 'unauthenticated',
      userEmail: null,
      userId: null,
      organizationId: null,
      userRole: null,
    }),

  setStatus: (status) => set({ status }),
}))
