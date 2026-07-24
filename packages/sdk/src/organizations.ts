import type { Organization, OrganizationRequest, PagedResult, PageParams } from '@nexus/types'
import { NexusHttpClient } from './client'

export class OrganizationsResource extends NexusHttpClient {
  list({ page = 0, size = 20 }: PageParams = {}) {
    return this.get<PagedResult<Organization>>(`/api/iam/organizations?page=${page}&size=${size}`)
  }

  findById(id: string) {
    return this.get<Organization>(`/api/iam/organizations/${id}`)
  }

  create(body: OrganizationRequest) {
    return this.post<Organization>('/api/iam/organizations', body)
  }

  update(id: string, body: Partial<OrganizationRequest>) {
    return this.put<Organization>(`/api/iam/organizations/${id}`, body)
  }

  delete(id: string) {
    return this.del<void>(`/api/iam/organizations/${id}`)
  }
}
