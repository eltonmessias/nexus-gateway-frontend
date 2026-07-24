import type { Team, TeamRequest, TeamMember, TeamMemberRequest, PagedResult, PageParams } from '@nexus/types'
import { NexusHttpClient } from './client'

export class TeamsResource extends NexusHttpClient {
  list({ page = 0, size = 20 }: PageParams = {}, organizationId?: string) {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (organizationId) params.set('organizationId', organizationId)
    return this.get<PagedResult<Team>>(`/api/iam/teams?${params}`)
  }

  findById(id: string) {
    return this.get<Team>(`/api/iam/teams/${id}`)
  }

  create(body: TeamRequest) {
    return this.post<Team>('/api/iam/teams', body)
  }

  update(id: string, body: Partial<TeamRequest>) {
    return this.put<Team>(`/api/iam/teams/${id}`, body)
  }

  delete(id: string) {
    return this.del<void>(`/api/iam/teams/${id}`)
  }

  // ─── Members ───────────────────────────────────────────────────────────────

  listMembers(teamId: string) {
    return this.get<TeamMember[]>(`/api/iam/teams/${teamId}/members`)
  }

  addMember(teamId: string, body: TeamMemberRequest) {
    return this.post<TeamMember>(`/api/iam/teams/${teamId}/members`, body)
  }

  removeMember(teamId: string, orgMemberId: string) {
    return this.del<void>(`/api/iam/teams/${teamId}/members/${orgMemberId}`)
  }
}
