import type { Flag, FlagRequest, FlagEvaluateResponse, PagedResult, PageParams } from '@nexus/types'
import { NexusHttpClient } from './client'

export class FlagsResource extends NexusHttpClient {
  list({ page = 0, size = 20 }: PageParams = {}, organizationId?: string, projectId?: string) {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (projectId) params.set('projectId', projectId)
    else if (organizationId) params.set('organizationId', organizationId)
    return this.get<PagedResult<Flag>>(`/api/flags?${params}`)
  }

  findById(id: string) {
    return this.get<Flag>(`/api/flags/${id}`)
  }

  evaluate(flagKey: string, environment: string) {
    return this.get<FlagEvaluateResponse>(`/api/flags/${flagKey}/${environment}`)
  }

  create(body: FlagRequest) {
    return this.post<Flag>('/api/flags', body)
  }

  enable(id: string) {
    return this.patch<Flag>(`/api/flags/${id}/enable`)
  }

  disable(id: string) {
    return this.patch<Flag>(`/api/flags/${id}/disable`)
  }

  update(id: string, body: Partial<FlagRequest>) {
    return this.put<Flag>(`/api/flags/${id}`, body)
  }

  delete(id: string) {
    return this.del<void>(`/api/flags/${id}`)
  }
}
