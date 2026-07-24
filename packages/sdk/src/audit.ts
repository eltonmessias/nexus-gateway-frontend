import type { AuditLog, PagedResult, PageParams } from '@nexus/types'
import { NexusHttpClient } from './client'

export class AuditResource extends NexusHttpClient {
  list({ page = 0, size = 20 }: PageParams = {}) {
    return this.get<PagedResult<AuditLog>>(`/api/iam/audit?page=${page}&size=${size}`)
  }

  byOrganization(organizationId: string, { page = 0, size = 20 }: PageParams = {}) {
    return this.get<PagedResult<AuditLog>>(
      `/api/iam/audit/organization/${organizationId}?page=${page}&size=${size}`,
    )
  }

  byActor(actorId: string, { page = 0, size = 20 }: PageParams = {}) {
    return this.get<PagedResult<AuditLog>>(
      `/api/iam/audit/actor/${actorId}?page=${page}&size=${size}`,
    )
  }
}
