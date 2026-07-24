'use client'

import { useQuery } from '@tanstack/react-query'
import { ToggleLeft, FolderKanban, KeyRound, Users, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { AuditLog, OrgMember } from '@nexus/types'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'
import { usePortalStore, ENVIRONMENTS, envDotClass } from '@/store/portal'

const ACTION_STYLE: Record<string, string> = {
  FLAG_UPDATED:      'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent',
  FLAG_CREATED:      'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent',
  FLAG_EVALUATED:    'bg-secondary text-secondary-foreground border-transparent',
  MEMBER_INVITED:    'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-transparent',
  PROJECT_CREATED:   'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent',
  API_CLIENT_CREATED:'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent',
  JOB_EXECUTED:      'bg-secondary text-secondary-foreground border-transparent',
  ORG_UPDATED:       'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent',
  USER_LOGIN:        'bg-secondary text-secondary-foreground border-transparent',
}

function actorLabel(log: AuditLog) {
  if (log.actorType === 'SYSTEM') return 'System'
  return log.actorName ?? log.actorId
}

function actorInitial(log: AuditLog) {
  if (log.actorType === 'SYSTEM') return '⚙'
  const name = log.actorName ?? log.actorId
  return name[0]?.toUpperCase() ?? '?'
}

function StatCard({
  title, value, sub, icon: Icon, loading, accent,
}: {
  title: string; value?: string | number; sub: string
  icon: React.ComponentType<{ className?: string }>
  loading: boolean; accent?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accent ?? 'bg-muted')}>
          <Icon className="h-4 w-4 text-foreground/70" aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-20 mb-1" /> : (
          <div className="text-3xl font-bold tracking-tight">{value ?? '—'}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}

export default function PortalOverviewPage() {
  const isAuth         = useAuthStore((s) => s.status === 'authenticated')
  const organizationId = useAuthStore((s) => s.organizationId)
  const activeEnv      = usePortalStore((s) => s.activeEnv)
  const orgName        = usePortalStore((s) => s.orgName)

  // Every card is scoped to the signed-in member's organisation — the portal
  // must never surface platform-wide totals.
  const { data: flags,   isLoading: flagsLoading   } = useQuery({
    queryKey: ['portal-flags-count', organizationId],
    queryFn:  () => nexus.client.flags.list({ page: 0, size: 1 }, organizationId!),
    enabled:  isAuth && !!organizationId,
  })
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['portal-projects-count', organizationId],
    queryFn:  () => nexus.client.projects.list({ page: 0, size: 1 }, organizationId!),
    enabled:  isAuth && !!organizationId,
  })
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['portal-clients', organizationId],
    queryFn:  () => nexus.client.apiClients.findByOrganization(organizationId!),
    enabled:  isAuth && !!organizationId,
  })
  const { data: members, isLoading: membersLoading } = useQuery<OrgMember[]>({
    queryKey: ['portal-members', organizationId],
    queryFn:  () => nexus.client.members.list(organizationId!),
    enabled:  isAuth && !!organizationId,
    staleTime: 30_000,
  })
  const { data: auditData, isLoading: auditLoading } = useQuery<{ content: AuditLog[] }>({
    queryKey: ['portal-audit-recent', organizationId],
    queryFn:  () => organizationId
      ? nexus.client.audit.byOrganization(organizationId, { page: 0, size: 6 })
      : nexus.client.audit.list({ page: 0, size: 6 }),
    enabled:  isAuth,
    staleTime: 0,
  })

  const memberCount    = members?.filter((m) => m.status === 'ACTIVE').length
  const recentActivity = auditData?.content ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{orgName}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Platform overview · {activeEnv.name}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={cn('h-2 w-2 rounded-full', envDotClass(activeEnv))} />
          {activeEnv.name}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Feature Flags"  value={flags?.totalElements}    sub="in this organisation"  icon={ToggleLeft}   loading={flagsLoading}    accent="bg-violet-500/10" />
        <StatCard title="Projects"       value={projects?.totalElements} sub="in this organisation"  icon={FolderKanban} loading={projectsLoading}  accent="bg-blue-500/10" />
        <StatCard title="Members"        value={memberCount}             sub="active team members"   icon={Users}        loading={membersLoading}   accent="bg-emerald-500/10" />
        <StatCard title="API Clients"    value={clients?.length}         sub="machine credentials"   icon={KeyRound}     loading={clientsLoading}   accent="bg-amber-500/10" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Environments</CardTitle>
            <CardDescription>Status per deployment tier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ENVIRONMENTS.map((env) => (
              <div key={env.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', envDotClass(env))} />
                  <span className="text-sm font-medium">{env.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Operational</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" aria-hidden />
              Recent Activity
            </CardTitle>
            <CardDescription>Last actions across your organisation</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {actorInitial(log)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 text-sm leading-tight">
                        <span className="font-medium">{actorLabel(log)}</span>
                        <Badge className={cn('text-[10px] px-1.5 py-0', ACTION_STYLE[log.action] ?? 'bg-secondary border-transparent text-secondary-foreground')}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                        {log.resourceType && (
                          <span className="text-muted-foreground">{log.resourceType}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {log.timestamp ? formatDistanceToNow(new Date(log.timestamp.replace(/(\.\d{3})\d+/, '$1')), { addSuffix: true }) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
