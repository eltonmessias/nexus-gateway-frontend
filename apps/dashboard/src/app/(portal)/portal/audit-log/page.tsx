'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { AuditLog } from '@nexus/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'

const PAGE_SIZE = 50

const ACTION_STYLE: Record<string, string> = {
  FLAG_UPDATED:       'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent',
  FLAG_CREATED:       'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent',
  FLAG_EVALUATED:     'bg-secondary text-secondary-foreground border-transparent',
  MEMBER_INVITED:     'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-transparent',
  PROJECT_CREATED:    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent',
  API_CLIENT_CREATED: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent',
  JOB_EXECUTED:       'bg-secondary text-secondary-foreground border-transparent',
  ORG_UPDATED:        'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent',
  USER_LOGIN:         'bg-secondary text-secondary-foreground border-transparent',
}

const ACTOR_TYPE_STYLE: Record<string, string> = {
  USER:       'bg-primary/10 text-primary',
  API_CLIENT: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  SYSTEM:     'bg-muted text-muted-foreground',
}

function safeFormat(ts: string | null | undefined): string {
  if (!ts) return '—'
  // Java Instant uses nanosecond precision (.887124600Z) — JS Date only handles ms (.887Z)
  const normalized = ts.replace(/(\.\d{3})\d+/, '$1')
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? '—' : format(d, 'MMM d, yyyy · HH:mm:ss')
}

function resolveActor(log: AuditLog): string {
  if (log.actorType === 'SYSTEM') return 'System'
  if (log.actorName) return log.actorName
  const email = log.metadata?.email as string | undefined
  if (email) return email
  return log.actorId
}

function resolveResource(log: AuditLog): string | null {
  if (!log.resourceType) return null
  // For USER resources, prefer email from metadata over raw UUID
  if (log.resourceType === 'USER') {
    const email = log.metadata?.email as string | undefined
    if (email) return email
  }
  return log.resourceId ?? null
}

function actorInitial(log: AuditLog): string {
  if (log.actorType === 'SYSTEM') return '⚙'
  const label = resolveActor(log)
  return label[0]?.toUpperCase() ?? '?'
}

function actorLabel(log: AuditLog): string {
  return resolveActor(log)
}

export default function AuditLogPage() {
  const isAuth         = useAuthStore((s) => s.status === 'authenticated')
  const organizationId = useAuthStore((s) => s.organizationId)

  const [search, setSearch] = useState('')
  const [action, setAction] = useState('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['portal-audit', organizationId],
    queryFn:  () => organizationId
      ? nexus.client.audit.byOrganization(organizationId, { page: 0, size: PAGE_SIZE })
      : nexus.client.audit.list({ page: 0, size: PAGE_SIZE }),
    enabled:   isAuth,
    staleTime: 0,
  })

  const logs: AuditLog[] = data?.content ?? []

  const allActions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))),
    [logs]
  )

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (action !== 'ALL' && log.action !== action) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          actorLabel(log).toLowerCase().includes(q) ||
          log.resourceType?.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [logs, search, action])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-muted-foreground">Immutable record of every action in your organisation.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          className="h-9 w-64"
          placeholder="Search actor or resource…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All actions</SelectItem>
            {allActions.map((a) => (
              <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative space-y-0">
        {isLoading && (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading audit log…</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No events match the current filters.</p>
        )}
        {filtered.map((log, i) => (
          <div key={log.id} className="flex gap-4 group">
            <div className="flex flex-col items-center">
              <Avatar className="h-8 w-8 shrink-0 z-10">
                <AvatarFallback className={cn('text-xs', ACTOR_TYPE_STYLE[log.actorType] ?? ACTOR_TYPE_STYLE.USER)}>
                  {actorInitial(log)}
                </AvatarFallback>
              </Avatar>
              {i < filtered.length - 1 && (
                <div className="w-px flex-1 bg-border my-1" />
              )}
            </div>

            <div className="pb-5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="text-sm font-medium">{actorLabel(log)}</span>
                <Badge className={cn('text-[10px] px-1.5 py-0', ACTION_STYLE[log.action] ?? 'bg-secondary border-transparent text-secondary-foreground')}>
                  {log.action.replace(/_/g, ' ')}
                </Badge>
                {log.resourceType && (
                  <span className="text-sm text-muted-foreground">
                    {log.resourceType}{resolveResource(log) ? ` · ${resolveResource(log)}` : ''}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono">{safeFormat(log.timestamp)}</span>
                {log.ipAddress && (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{log.ipAddress}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
