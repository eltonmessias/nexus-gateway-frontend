import type { OrgMember, OrgMemberInviteRequest, OrgMemberRoleRequest } from '@nexus/types'
import { NexusHttpClient } from './client'

export class MembersResource extends NexusHttpClient {
  list(organizationId: string) {
    return this.get<OrgMember[]>(`/api/iam/members/organization/${organizationId}`)
  }

  invite(organizationId: string, body: OrgMemberInviteRequest) {
    return this.post<OrgMember>(`/api/iam/members/organization/${organizationId}/invite`, body)
  }

  changeRole(memberId: string, body: OrgMemberRoleRequest) {
    return this.put<OrgMember>(`/api/iam/members/${memberId}/role`, body)
  }

  remove(memberId: string) {
    return this.del<void>(`/api/iam/members/${memberId}`)
  }
}
