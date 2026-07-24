import type { Job, JobRequest, PagedResult, PageParams } from '@nexus/types'
import { NexusHttpClient } from './client'

export class JobsResource extends NexusHttpClient {
  list({ page = 0, size = 20 }: PageParams = {}, organizationId?: string, status?: string) {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (organizationId) params.set('organizationId', organizationId)
    if (status) params.set('status', status)
    return this.get<PagedResult<Job>>(`/api/jobs?${params}`)
  }

  stats() {
    return this.get<Record<string, number>>('/api/jobs/stats')
  }

  findById(id: string) {
    return this.get<Job>(`/api/jobs/${id}`)
  }

  submit(body: JobRequest) {
    return this.post<Job>('/api/jobs', body)
  }

  retry(id: string) {
    return this.post<Job>(`/api/jobs/${id}/retry`)
  }

  cancel(id: string) {
    return this.del<void>(`/api/jobs/${id}`)
  }
}
