import type { Route } from 'next'
import type { ComponentType } from 'react'
import {
  LayoutDashboard, ToggleLeft, Briefcase, KeyRound, Users, UsersRound,
  FolderKanban, ScrollText, Settings, Building2, Search,
} from 'lucide-react'
import { routes } from './routes'

export interface NavItem {
  href: Route
  label: string
  icon: ComponentType<{ className?: string }>
  /** Match the path exactly rather than by prefix (for index routes). */
  exact?: boolean
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

/** Portal (organisation) navigation. */
export const portalNav: NavGroup[] = [
  { items: [
    { href: routes.portal.overview, label: 'Overview', icon: LayoutDashboard, exact: true },
  ] },
  { label: 'Platform', items: [
    { href: routes.portal.flags,      label: 'Feature Flags', icon: ToggleLeft },
    { href: routes.portal.jobs,       label: 'Job Queue',     icon: Briefcase },
    { href: routes.portal.apiClients, label: 'API Clients',   icon: KeyRound },
  ] },
  { label: 'Organisation', items: [
    { href: routes.portal.members,  label: 'Members',  icon: Users },
    { href: routes.portal.teams,    label: 'Teams',    icon: UsersRound },
    { href: routes.portal.projects, label: 'Projects', icon: FolderKanban },
  ] },
  { label: 'Account', items: [
    { href: routes.portal.auditLog, label: 'Audit Log', icon: ScrollText },
    { href: routes.portal.settings, label: 'Settings',  icon: Settings },
  ] },
]

/** Admin console navigation. */
export const dashboardNav: NavGroup[] = [
  { items: [
    { href: routes.dashboard.overview, label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: routes.dashboard.search,   label: 'Search',   icon: Search },
  ] },
  { label: 'Identity & Access', items: [
    { href: routes.dashboard.organizations, label: 'Organizations', icon: Building2 },
    { href: routes.dashboard.users,         label: 'Users',         icon: Users },
    { href: routes.dashboard.teams,         label: 'Teams',         icon: UsersRound },
    { href: routes.dashboard.projects,      label: 'Projects',      icon: FolderKanban },
    { href: routes.dashboard.apiClients,    label: 'API Clients',   icon: KeyRound },
  ] },
  { label: 'Platform', items: [
    { href: routes.dashboard.flags, label: 'Feature Flags', icon: ToggleLeft },
    { href: routes.dashboard.jobs,  label: 'Job Queue',     icon: Briefcase },
  ] },
  { label: 'System', items: [
    { href: routes.dashboard.audit, label: 'Audit Log', icon: ScrollText },
  ] },
]

/** Whether a nav item is active for the current pathname. */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + '/')
}

/**
 * Resolve the page title for a pathname from a nav tree. Falls back to the
 * parent section for detail sub-routes (e.g. /portal/projects/:id → "Projects").
 */
export function titleForPath(pathname: string, nav: NavGroup[], fallback: string): string {
  const all = nav.flatMap((g) => g.items)
  const exact = all.find((i) => i.href === pathname)
  if (exact) return exact.label
  const parent = all.find((i) => !i.exact && pathname.startsWith(i.href + '/'))
  return parent?.label ?? fallback
}
