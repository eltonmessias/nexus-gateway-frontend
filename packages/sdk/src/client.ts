import type { NexusError } from '@nexus/types'

export interface NexusClientConfig {
  baseUrl: string
  getAccessToken?: () => string | null
  getTokenExpiry?: () => number | null
  setAccessToken?: (token: string) => void
  setTokenExpiry?: (expiresAt: number) => void
  /** Custom refresh function — if provided, called instead of built-in refresh */
  refreshFn?: () => Promise<{ accessToken: string; expiresIn: number }>
  onUnauthorized?: () => void
  /** For M2M: supply clientId + apiKey */
  clientId?: string
  apiKey?: string
}

export class NexusHttpClient {
  protected readonly config: NexusClientConfig

  constructor(config: NexusClientConfig) {
    this.config = config
  }

  private isExpired(): boolean {
    // Only attempt refresh if we previously had a token. A null token means
    // unauthenticated (not expired), so we skip refresh and let the request
    // proceed without an Authorization header — or fail with a backend 401.
    const token = this.config.getAccessToken?.()
    if (!token) return false
    const expiry = this.config.getTokenExpiry?.()
    if (expiry == null) return true
    return Date.now() > expiry - 60_000
  }

  private async refreshToken(): Promise<boolean> {
    try {
      if (this.config.refreshFn) {
        const data = await this.config.refreshFn()
        this.config.setAccessToken?.(data.accessToken)
        this.config.setTokenExpiry?.(Date.now() + data.expiresIn * 1000)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (this.config.getAccessToken && this.isExpired()) {
      const ok = await this.refreshToken()
      if (!ok) {
        this.config.onUnauthorized?.()
        throw { status: 401, code: 'TOKEN_EXPIRED', message: 'Session expired' } as NexusError
      }
    }

    const token = this.config.getAccessToken?.()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    }

    const res = await fetch(`${this.config.baseUrl}${path}`, { ...options, headers })

    if (res.status === 401) {
      this.config.onUnauthorized?.()
      const error: NexusError = await res.json().catch(() => ({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
        timestamp: new Date().toISOString(),
      }))
      throw error
    }

    if (!res.ok) {
      const error: NexusError = await res.json().catch(() => ({
        status: res.status,
        code: 'UNKNOWN_ERROR',
        message: `HTTP ${res.status}`,
        timestamp: new Date().toISOString(),
      }))
      throw error
    }

    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  get<T>(path: string) {
    return this.request<T>(path)
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : null,
    })
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : null,
    })
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : null,
    })
  }

  del<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }
}
