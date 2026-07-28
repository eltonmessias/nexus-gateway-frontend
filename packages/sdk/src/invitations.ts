import type { InvitationDetails, AcceptInvitationRequest, AuthResponse } from '@nexus/types'
import { NexusHttpClient } from './client'

export class InvitationsResource extends NexusHttpClient {
  // Not named `get` — that would shadow the base HTTP helper and recurse.
  getByToken(token: string) {
    return this.get<InvitationDetails>(`/api/iam/invitations/${token}`)
  }

  accept(token: string, body: AcceptInvitationRequest) {
    return this.post<AuthResponse>(`/api/iam/invitations/${token}/accept`, body)
  }
}
