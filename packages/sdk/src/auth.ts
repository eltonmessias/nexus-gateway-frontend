import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  AuthResponse,
  RefreshTokenRequest,
  ApiClientTokenRequest,
  ApiClientTokenResponse,
  BootstrapRequest,
  BootstrapStatusResponse,
} from '@nexus/types'
import { NexusHttpClient } from './client'

export class AuthResource extends NexusHttpClient {
  setupStatus() {
    return this.get<BootstrapStatusResponse>('/api/iam/auth/setup/status')
  }

  setup(body: BootstrapRequest) {
    return this.post<AuthResponse>('/api/iam/auth/setup', body)
  }

  register(body: RegisterRequest) {
    return this.post<RegisterResponse>('/api/iam/auth/register', body)
  }

  login(body: LoginRequest) {
    return this.post<AuthResponse>('/api/iam/auth/login', body)
  }

  logout() {
    return this.post<void>('/api/iam/auth/logout')
  }

  refresh(body: RefreshTokenRequest) {
    return this.post<AuthResponse>('/api/iam/auth/refresh', body)
  }

  clientToken(body: ApiClientTokenRequest) {
    return this.post<ApiClientTokenResponse>('/api/iam/auth/token', body)
  }

  clientTokenRefresh(body: RefreshTokenRequest) {
    return this.post<ApiClientTokenResponse>('/api/iam/auth/token/refresh', body)
  }
}
