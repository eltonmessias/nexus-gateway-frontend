import type { ApiClient, ApiClientCreated, ApiClientRequest, ApiKeyRotatedResponse, PagedResult, PageParams } from '@nexus/types'
import { NexusHttpClient } from './client'

export class ApiClientsResource extends NexusHttpClient {
  list({ page = 0, size = 20 }: PageParams = {}) {
    return this.get<PagedResult<ApiClient>>(`/api/iam/clients?page=${page}&size=${size}`)
  }

  findById(id: string) {
    return this.get<ApiClient>(`/api/iam/clients/${id}`)
  }

  findByOrganization(organizationId: string) {
    return this.get<ApiClient[]>(`/api/iam/clients/organization/${organizationId}`)
  }

  create(body: ApiClientRequest) {
    return this.post<ApiClientCreated>('/api/iam/clients', body)
  }

  deactivate(id: string) {
    return this.patch<void>(`/api/iam/clients/${id}/deactivate`)
  }

  rotateKey(id: string) {
    return this.post<ApiKeyRotatedResponse>(`/api/iam/clients/${id}/rotate-key`)
  }

  delete(id: string) {
    return this.del<void>(`/api/iam/clients/${id}`)
  }
}
