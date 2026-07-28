// ─── Auth ────────────────────────────────────────────────────────────────────

export interface BootstrapRequest {
  name: string
  email: string
  password: string
}

export interface BootstrapStatusResponse {
  setupRequired: boolean
}

export interface RegisterRequest {
  organizationName: string
  organizationSlug: string
  ownerName: string
  ownerEmail: string
  ownerPassword: string
}

export interface RegisterResponse {
  organizationId: string
  organizationName: string
  ownerId: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  refreshExpiresIn: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
  refreshExpiresIn: number
}

export interface RefreshTokenRequest {
  refreshToken: string
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PagedResult<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PageParams {
  page?: number
  size?: number
}

// ─── Organization ─────────────────────────────────────────────────────────────

export interface OrganizationRequest {
  name: string
  slug: string
  description?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type Role = 'ORG_OWNER' | 'TEAM_ADMIN' | 'TEAM_MEMBER' | 'VIEWER' | 'ADMIN'

export interface UserRequest {
  name: string
  email: string
  password: string
  organizationId?: string
  role?: Role
}

export interface User {
  id: string
  name: string
  email: string
  organizationId?: string
  role: Role
  active: boolean
  createdAt: string
  updatedAt: string
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface TeamRequest {
  name: string
  description?: string
  organizationId: string
}

export interface Team {
  id: string
  name: string
  description?: string
  organizationId: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface TeamMemberRequest {
  orgMemberId: string
}

export interface TeamMember {
  id: string
  teamId: string
  orgMemberId: string
  memberName: string
  memberEmail: string
  memberRole: 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER'
  joinedAt: string
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface ProjectRequest {
  name: string
  key: string
  description?: string
  organizationId: string
  teamId?: string
}

export interface Project {
  id: string
  name: string
  key: string
  description?: string
  organizationId: string
  teamId?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

// ─── ApiClient ────────────────────────────────────────────────────────────────

export interface ApiClientRequest {
  name: string
  projectId: string
  organizationId: string
  rateLimitRpm?: number
  rateLimitBurst?: number
}

export interface ApiClient {
  id: string
  name: string
  projectId: string
  organizationId: string
  clientId: string
  rateLimitRpm: number
  rateLimitBurst: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiClientCreated extends ApiClient {
  apiKey: string
}

export interface ApiClientTokenRequest {
  clientId: string
  apiKey: string
}

export interface ApiClientTokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  refreshExpiresIn: number
}

export interface ApiKeyRotatedResponse {
  clientId: string
  apiKey: string
  message: string
}

// ─── Org Members ─────────────────────────────────────────────────────────────

export type OrgMemberRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER'
export type OrgMemberStatus = 'ACTIVE' | 'INVITED'

export interface OrgMemberInviteRequest {
  name?: string
  email: string
  role: OrgMemberRole
}

export interface OrgMemberRoleRequest {
  role: OrgMemberRole
}

export interface OrgMember {
  id: string
  organizationId: string
  userId?: string
  name: string
  email: string
  role: OrgMemberRole
  status: OrgMemberStatus
  joinedAt: string
  updatedAt: string
}

/** Returned when a member is invited — carries the one-time invite token. */
export interface OrgMemberInvited {
  id: string
  organizationId: string
  name: string
  email: string
  role: OrgMemberRole
  status: OrgMemberStatus
  joinedAt: string
  inviteToken: string
}

export interface InvitationDetails {
  organizationName: string
  email: string
  name: string
  role: string
}

export interface AcceptInvitationRequest {
  password: string
}

// ─── Feature Flags ────────────────────────────────────────────────────────────

export interface FlagRequest {
  key: string
  description?: string
  projectId: string
  enabled?: boolean
}

export interface Flag {
  id: string
  key: string
  description?: string
  projectId: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface FlagEvaluateResponse {
  key: string
  enabled: boolean
  reason: 'FLAG_ENABLED' | 'FLAG_DISABLED' | 'FLAG_NOT_FOUND'
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface JobRequest {
  type: string
  payload: Record<string, unknown>
  priority?: number
  organizationId?: string
}

export interface Job {
  id: string
  type: string
  status: JobStatus
  payload?: Record<string, unknown>
  organizationId?: string
  retries: number
  maxRetries: number
  createdAt: string
  updatedAt: string
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchRequest {
  query: string
  page?: number
  size?: number
  entityTypes?: string[]
}

export interface SearchDocumentRequest {
  entityId: string
  entityType: string
  title: string
  excerpt?: string
  organizationId?: string
}

export interface SearchDocument {
  id: string
  entityId: string
  entityType: string
  title: string
  excerpt?: string
  organizationId?: string
  createdAt: string
  updatedAt: string
}

export interface SearchResponse {
  results: SearchDocument[]
  totalElements: number
  page: number
  size: number
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  timestamp: string
  actorId: string
  actorName?: string
  actorType: 'USER' | 'API_CLIENT' | 'SYSTEM'
  action: string
  resourceType: string
  resourceId?: string
  organizationId?: string
  ipAddress?: string
  metadata?: Record<string, unknown>
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export interface NexusError {
  status: number
  code: string
  message: string
  timestamp: string
}

export type NexusErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'TOKEN_REVOKED'
  | 'ACCESS_DENIED'
  | 'ACCOUNT_DISABLED'
  | 'NOT_FOUND'
  | 'EMAIL_ALREADY_EXISTS'
  | 'SLUG_ALREADY_EXISTS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
