'use client'

import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import {
  Building2, Users, KeyRound, ToggleLeft, Briefcase,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Loader2,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'
import { routes } from '@/lib/routes'
import type { AuditLog } from '@nexus/types'

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  title, value, description, icon: Icon, loading, accent,
}: {
  title: string; value?: number | string; description: string
  icon: React.ComponentType<{ className?: string }>; loading: boolean; accent?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-md p-1.5 ${accent ?? 'bg-muted'}`}>
          <Icon className="h-4 w-4 text-foreground/70" aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <Skeleton className="h-8 w-20" />
          : <div className="text-3xl font-bold tracking-tight">{value?.toLocaleString() ?? '—'}</div>}
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

// ─── Jobs donut ───────────────────────────────────────────────────────────────
const JOB_COLORS: Record<string, string> = {
  PENDING:   'hsl(var(--chart-1, 217 91% 60%))',
  RUNNING:   'hsl(var(--chart-2, 142 71% 45%))',
  COMPLETED: 'hsl(var(--chart-3, 160 84% 39%))',
  FAILED:    'hsl(var(--chart-4, 0 84% 60%))',
  CANCELLED: 'hsl(var(--chart-5, 215 16% 47%))',
}

function JobsDonut({ stats, loading }: { stats?: Record<string, number>; loading: boolean }) {
  const data = stats
    ? Object.entries(stats).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v }))
    : []
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Job Queue</CardTitle>
        <CardDescription>Current status breakdown across all jobs</CardDescription>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          : total === 0
          ? <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No jobs yet</div>
          : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={200} height={180}>
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={JOB_COLORS[entry.name] ?? '#888'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v.toLocaleString(), '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {data.map(({ name, value }) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: JOB_COLORS[name] ?? '#888' }} />
                      <span className="text-muted-foreground capitalize">{name.toLowerCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium tabular-nums">{value.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {((value / total) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between text-sm font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )
        }
      </CardContent>
    </Card>
  )
}

// ─── Audit feed ───────────────────────────────────────────────────────────────
const ACTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  USER_LOGIN:       CheckCircle2,
  USER_LOGIN_FAILED: AlertTriangle,
  USER_REGISTERED:  TrendingUp,
}

function AuditFeed({ logs, loading }: { logs?: AuditLog[]; loading: boolean }) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <CardDescription>Live audit trail — refreshes every 30s</CardDescription>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          : !logs?.length
          ? <p className="py-4 text-center text-sm text-muted-foreground">No activity yet</p>
          : (
            <div className="space-y-0 divide-y">
              {logs.map((log) => {
                const Icon = ACTION_ICON[log.action] ?? Clock
                return (
                  <div key={log.id} className="flex items-start gap-3 py-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm leading-tight flex flex-wrap items-center gap-1">
                        <span className="font-medium">{log.actorName ?? log.actorId}</span>
                        <span className="text-muted-foreground">·</span>
                        <Badge variant="secondary" className="text-xs">{log.action}</Badge>
                        <span className="text-muted-foreground">on</span>
                        <span className="text-muted-foreground">{log.resourceType}</span>
                      </div>
                      {log.ipAddress && (
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{log.ipAddress}</p>
                      )}
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {log.timestamp
                        ? formatDistanceToNow(new Date(log.timestamp.replace(/(\.\d{3})\d+/, '$1')), { addSuffix: true })
                        : '—'}
                    </time>
                  </div>
                )
              })}
            </div>
          )
        }
      </CardContent>
    </Card>
  )
}

// ─── Failed jobs alert ─────────────────────────────────────────────────────────
function FailedJobsAlert({ count, loading }: { count?: number; loading: boolean }) {
  if (loading || !count) return null
  return (
    <div className="col-span-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      <span>
        <strong>{count}</strong> failed {count === 1 ? 'job' : 'jobs'} —
        <Link href={routes.dashboard.jobsByStatus('FAILED')} className="ml-1 underline underline-offset-2 font-medium">view and retry</Link>
      </span>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const isAuth = useAuthStore((s) => s.status === 'authenticated')

  const { data: orgs,    isLoading: orgsLoading    } = useQuery({ queryKey: ['dash-orgs'],    queryFn: () => nexus.client.organizations.list({ page: 0, size: 1 }), enabled: isAuth })
  const { data: users,   isLoading: usersLoading   } = useQuery({ queryKey: ['dash-users'],   queryFn: () => nexus.client.users.list({ page: 0, size: 1 }),         enabled: isAuth })
  const { data: clients, isLoading: clientsLoading } = useQuery({ queryKey: ['dash-clients'], queryFn: () => nexus.client.apiClients.list({ page: 0, size: 1 }),    enabled: isAuth })
  const { data: flags,   isLoading: flagsLoading   } = useQuery({ queryKey: ['dash-flags'],   queryFn: () => nexus.client.flags.list({ page: 0, size: 1 }),         enabled: isAuth })

  const { data: jobStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dash-job-stats'],
    queryFn:  () => nexus.client.jobs.stats(),
    enabled:  isAuth,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['dash-audit-feed'],
    queryFn:  () => nexus.client.audit.list({ page: 0, size: 8 }),
    enabled:  isAuth,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  })

  const failedCount = jobStats?.FAILED

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">Platform at a glance — live data.</p>
      </div>

      {/* Alert strip */}
      <div className="grid grid-cols-4 gap-4">
        <FailedJobsAlert count={failedCount} loading={statsLoading} />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Organizations"  value={orgs?.totalElements}    description="Registered on platform" icon={Building2}   loading={orgsLoading}    accent="bg-blue-500/10" />
        <StatCard title="Users"          value={users?.totalElements}   description="Across all orgs"        icon={Users}       loading={usersLoading}   accent="bg-purple-500/10" />
        <StatCard title="API Clients"    value={clients?.totalElements} description="Active M2M credentials" icon={KeyRound}    loading={clientsLoading} accent="bg-orange-500/10" />
        <StatCard title="Feature Flags"  value={flags?.totalElements}   description="Total flags defined"    icon={ToggleLeft}  loading={flagsLoading}   accent="bg-green-500/10" />
      </div>

      {/* Charts + feed */}
      <div className="grid gap-4 lg:grid-cols-4">
        <JobsDonut stats={jobStats} loading={statsLoading} />
        <AuditFeed logs={auditData?.content} loading={auditLoading} />
      </div>
    </div>
  )
}
