'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import type { AuditLog } from '@nexus/types'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/data-table'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'

const PAGE_SIZE = 20

const actionVariant: Record<string, 'default' | 'success' | 'destructive' | 'secondary'> = {
  CREATE: 'success',
  UPDATE: 'default',
  DELETE: 'destructive',
  LOGIN: 'secondary',
  LOGOUT: 'secondary',
}

export default function AuditPage() {
  const [page, setPage] = useState(0)
  const isAuth = useAuthStore((s) => s.status === 'authenticated')

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, PAGE_SIZE],
    queryFn: () => nexus.client.audit.list({ page, size: PAGE_SIZE }),
    enabled: isAuth,
    staleTime: 0, // Audit log must always be fresh
  })

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp', header: 'Timestamp',
      cell: (r) => (
        <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
          {r.timestamp ? format(new Date(r.timestamp.replace(/(\.\d{3})\d+/, '$1')), 'MMM d, HH:mm:ss') : '—'}
        </span>
      ),
    },
    {
      key: 'actor', header: 'Actor',
      cell: (r) => (
        <div>
          <p className="text-sm font-medium">{r.actorName ?? r.actorId}</p>
          <p className="text-xs text-muted-foreground">{r.actorType}</p>
        </div>
      ),
    },
    { key: 'action', header: 'Action', cell: (r) => <Badge variant={actionVariant[r.action] ?? 'secondary'}>{r.action}</Badge> },
    {
      key: 'resource', header: 'Resource',
      cell: (r) => (
        <div>
          <p className="text-sm">{r.resourceType}</p>
          {r.resourceId && <code className="text-xs text-muted-foreground">{r.resourceId}</code>}
        </div>
      ),
    },
    {
      key: 'ip', header: 'IP',
      cell: (r) => <span className="text-sm font-mono text-muted-foreground">{r.ipAddress ?? '—'}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-muted-foreground">Immutable record of all platform actions.</p>
      </div>
      <DataTable columns={columns} data={data?.content ?? []} loading={isLoading} page={page} pageSize={PAGE_SIZE} totalElements={data?.totalElements ?? 0} onPageChange={setPage} rowKey={(r) => r.id} />
    </div>
  )
}
