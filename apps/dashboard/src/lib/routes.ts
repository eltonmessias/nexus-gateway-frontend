import type { Route } from 'next'

/**
 * Single source of truth for every application route.
 *
 * Import these instead of hard-coding path strings. Values are typed as
 * `Route`, so `next/link` and `router.push/replace` accept them without the
 * `as never` casts that `experimental.typedRoutes` otherwise forces on
 * dynamically-typed strings.
 */
export const routes = {
  home: '/' as Route,

  auth: {
    login:    '/login' as Route,
    register: '/register' as Route,
    setup:    '/setup' as Route,
  },

  /** Organisation portal — scoped to the signed-in member's organisation. */
  portal: {
    overview:      '/portal' as Route,
    flags:         '/portal/flags' as Route,
    jobs:          '/portal/jobs' as Route,
    apiClients:    '/portal/api-clients' as Route,
    members:       '/portal/members' as Route,
    teams:         '/portal/teams' as Route,
    projects:      '/portal/projects' as Route,
    projectDetail: (id: string) => `/portal/projects/${id}` as Route,
    auditLog:      '/portal/audit-log' as Route,
    settings:      '/portal/settings' as Route,
  },

  /** Admin console — platform-wide, ADMIN only. */
  dashboard: {
    overview:      '/dashboard' as Route,
    search:        '/dashboard/search' as Route,
    organizations: '/dashboard/organizations' as Route,
    users:         '/dashboard/users' as Route,
    teams:         '/dashboard/teams' as Route,
    projects:      '/dashboard/projects' as Route,
    apiClients:    '/dashboard/api-clients' as Route,
    flags:         '/dashboard/flags' as Route,
    jobs:          '/dashboard/jobs' as Route,
    jobsByStatus:  (status: string) => `/dashboard/jobs?status=${status}` as Route,
    audit:         '/dashboard/audit' as Route,
  },
} as const

/** Landing route for a user after auth, based on their platform role. */
export function homeForRole(role: string | null | undefined): Route {
  return role === 'ADMIN' ? routes.dashboard.overview : routes.portal.overview
}
