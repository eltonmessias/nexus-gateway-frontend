import type { NexusClientConfig } from './client'
import { AuthResource } from './auth'
import { OrganizationsResource } from './organizations'
import { UsersResource } from './users'
import { TeamsResource } from './teams'
import { ProjectsResource } from './projects'
import { ApiClientsResource } from './api-clients'
import { FlagsResource } from './flags'
import { JobsResource } from './jobs'
import { SearchResource } from './search'
import { AuditResource } from './audit'
import { MembersResource } from './members'
import { InvitationsResource } from './invitations'

export class NexusSDK {
  readonly auth: AuthResource
  readonly organizations: OrganizationsResource
  readonly users: UsersResource
  readonly teams: TeamsResource
  readonly projects: ProjectsResource
  readonly apiClients: ApiClientsResource
  readonly flags: FlagsResource
  readonly jobs: JobsResource
  readonly search: SearchResource
  readonly audit: AuditResource
  readonly members: MembersResource
  readonly invitations: InvitationsResource

  constructor(config: NexusClientConfig) {
    this.auth = new AuthResource(config)
    this.organizations = new OrganizationsResource(config)
    this.users = new UsersResource(config)
    this.teams = new TeamsResource(config)
    this.projects = new ProjectsResource(config)
    this.apiClients = new ApiClientsResource(config)
    this.flags = new FlagsResource(config)
    this.jobs = new JobsResource(config)
    this.search = new SearchResource(config)
    this.audit = new AuditResource(config)
    this.members = new MembersResource(config)
    this.invitations = new InvitationsResource(config)
  }
}

export function createNexusClient(config: NexusClientConfig): NexusSDK {
  return new NexusSDK(config)
}
