import { create } from 'zustand'

export type EnvKey = 'production' | 'staging' | 'development'
export type MemberRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER'

export interface Environment {
  id: string
  key: EnvKey
  name: string
  color: 'red' | 'amber' | 'emerald'
}

export const ENVIRONMENTS: Environment[] = [
  { id: 'env-prod', key: 'production',  name: 'Production',  color: 'red'     },
  { id: 'env-stg',  key: 'staging',     name: 'Staging',     color: 'amber'   },
  { id: 'env-dev',  key: 'development', name: 'Development', color: 'emerald' },
]

const ENV_DOT: Record<Environment['color'], string> = {
  red:     'bg-red-500',
  amber:   'bg-amber-500',
  emerald: 'bg-emerald-500',
}

export function envDotClass(env: Environment) {
  return ENV_DOT[env.color]
}

const ROLE_ORDER: Record<MemberRole, number> = { VIEWER: 0, DEVELOPER: 1, ADMIN: 2, OWNER: 3 }

export function canDo(userRole: MemberRole, minRole: MemberRole): boolean {
  return ROLE_ORDER[userRole] >= ROLE_ORDER[minRole]
}

interface PortalState {
  activeEnv: Environment
  userRole: MemberRole
  orgName: string
  setActiveEnv: (env: Environment) => void
  setOrgName:   (name: string)    => void
  setUserRole:  (role: MemberRole) => void
}

export const usePortalStore = create<PortalState>()((set) => ({
  activeEnv: ENVIRONMENTS[2]!,   // Development is the safe default
  userRole:  'VIEWER',
  orgName:   'My Organisation',  // TODO: derive from session endpoint
  setActiveEnv: (env)      => set({ activeEnv: env }),
  setOrgName:   (orgName)  => set({ orgName }),
  setUserRole:  (userRole) => set({ userRole }),
}))
