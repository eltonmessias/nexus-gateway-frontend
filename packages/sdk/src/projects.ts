import type { Project, ProjectRequest, PagedResult, PageParams } from '@nexus/types'
import { NexusHttpClient } from './client'

export class ProjectsResource extends NexusHttpClient {
  list({ page = 0, size = 20 }: PageParams = {}, organizationId?: string, teamId?: string) {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (teamId) params.set('teamId', teamId)
    else if (organizationId) params.set('organizationId', organizationId)
    return this.get<PagedResult<Project>>(`/api/iam/projects?${params}`)
  }

  findById(id: string) {
    return this.get<Project>(`/api/iam/projects/${id}`)
  }

  create(body: ProjectRequest) {
    return this.post<Project>('/api/iam/projects', body)
  }

  update(id: string, body: Partial<ProjectRequest>) {
    return this.put<Project>(`/api/iam/projects/${id}`, body)
  }

  delete(id: string) {
    return this.del<void>(`/api/iam/projects/${id}`)
  }
}
