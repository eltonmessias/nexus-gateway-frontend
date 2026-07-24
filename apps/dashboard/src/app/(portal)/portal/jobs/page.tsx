'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Eye, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Job } from '@nexus/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'
import { usePortalStore, envDotClass, canDo } from '@/store/portal'

const PAGE_SIZE = 10

const STATUS_VARIANT: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  COMPLETED: 'success',
  FAILED:    'destructive',
  RUNNING:   'warning',
  PENDING:   'secondary',
}

export default function PortalJobsPage() {
  const [page, setPage]             = useState(0)
  const [payloadJob, setPayloadJob] = useState<Job | null>(null)
  const qc                          = useQueryClient()
  const isAuth                      = useAuthStore((s) => s.status === 'authenticated')
  const organizationId              = useAuthStore((s) => s.organizationId)
  const { activeEnv, userRole }     = usePortalStore()
  const canCancel                   = canDo(userRole, 'DEVELOPER')

  const { data, isLoading } = useQuery({
    queryKey: ['portal-jobs', organizationId, page, PAGE_SIZE],
    queryFn:  () => nexus.client.jobs.list({ page, size: PAGE_SIZE }, organizationId ?? undefined),
    enabled:  isAuth && !!organizationId,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => nexus.client.jobs.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-jobs'] })
      toast.success('Job cancelled')
    },
    onError: () => toast.error('Failed to cancel job'),
  })

  const columns: Column<Job>[] = [
    {
      key: 'type', header: 'Job Type',
      cell: (r) => <code className="font-mono text-sm">{r.type}</code>,
    },
    {
      key: 'status', header: 'Status',
      cell: (r) => <Badge variant={STATUS_VARIANT[r.status] ?? 'secondary'}>{r.status}</Badge>,
    },
    {
      key: 'createdAt', header: 'Created',
      cell: (r) => (
        <span className="text-sm text-muted-foreground font-mono">
          {r.createdAt ? format(new Date(r.createdAt.replace(/(\.\d{3})\d+/, '$1')), 'MMM d, HH:mm') : '—'}
        </span>
      ),
    },
    {
      key: 'updatedAt', header: 'Last Update',
      cell: (r) => (
        <span className="text-sm text-muted-foreground font-mono">
          {r.updatedAt ? format(new Date(r.updatedAt.replace(/(\.\d{3})\d+/, '$1')), 'MMM d, HH:mm') : '—'}
        </span>
      ),
    },
    {
      key: 'retries', header: 'Retries',
      cell: (r) => <span className="text-sm text-muted-foreground">{r.retries}/{r.maxRetries}</span>,
    },
    {
      key: 'actions', header: '', className: 'w-20',
      cell: (r) => (
        <div className="flex gap-1">
          <Button
            variant="ghost" size="icon"
            aria-label={`View payload for job ${r.id}`}
            onClick={() => setPayloadJob(r)}
            disabled={!r.payload}
          >
            <Eye className="h-4 w-4" aria-hidden />
          </Button>
          {canCancel && r.status === 'PENDING' && (
            <ConfirmDialog
              title="Cancel job"
              description={`Cancel this ${r.type} job? It will be removed from the queue.`}
              confirmLabel="Cancel job"
              onConfirm={() => cancelMutation.mutate(r.id)}
            >
              <Button variant="ghost" size="icon" aria-label={`Cancel job ${r.id}`} className="text-destructive hover:text-destructive">
                <XCircle className="h-4 w-4" aria-hidden />
              </Button>
            </ConfirmDialog>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Job Queue</h2>
          <p className="text-muted-foreground flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', envDotClass(activeEnv))} />
            Jobs in <strong>{activeEnv.name}</strong>
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        loading={isLoading}
        page={page}
        pageSize={PAGE_SIZE}
        totalElements={data?.totalElements ?? 0}
        onPageChange={setPage}
        rowKey={(r) => r.id}
      />

      {/* Payload viewer */}
      <Dialog open={!!payloadJob} onOpenChange={(v) => { if (!v) setPayloadJob(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Job Payload</DialogTitle>
            <DialogDescription>
              <code className="font-mono">{payloadJob?.type}</code> · {payloadJob?.id}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs font-mono leading-relaxed">
            {payloadJob?.payload
              ? JSON.stringify(payloadJob.payload, null, 2)
              : 'No payload'}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
