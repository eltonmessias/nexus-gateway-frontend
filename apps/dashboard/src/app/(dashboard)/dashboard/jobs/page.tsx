'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Eye, XCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import type { Job } from '@nexus/types'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, type Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'
import { routes } from '@/lib/routes'

const PAGE_SIZE = 20

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  PENDING:   'warning',
  RUNNING:   'default',
  COMPLETED: 'success',
  FAILED:    'destructive',
  CANCELLED: 'secondary',
}

const TABS = [
  { value: 'ALL',       label: 'All' },
  { value: 'PENDING',   label: 'Pending' },
  { value: 'RUNNING',   label: 'Running' },
  { value: 'FAILED',    label: 'Failed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function JobsPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const initialTab   = searchParams.get('status') ?? 'ALL'

  const [activeTab, setActiveTab] = useState(initialTab)
  const [page, setPage]           = useState(0)
  const [payloadJob, setPayloadJob] = useState<Job | null>(null)
  const qc     = useQueryClient()
  const isAuth = useAuthStore((s) => s.status === 'authenticated')

  const statusFilter = activeTab === 'ALL' ? undefined : activeTab

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', activeTab, page, PAGE_SIZE],
    queryFn:  () => nexus.client.jobs.list({ page, size: PAGE_SIZE }, undefined, statusFilter),
    enabled:  isAuth,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  })

  const { data: stats } = useQuery({
    queryKey: ['dash-job-stats'],
    queryFn:  () => nexus.client.jobs.stats(),
    enabled:  isAuth,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  })

  const retryMutation = useMutation({
    mutationFn: (id: string) => nexus.client.jobs.retry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['dash-job-stats'] })
      toast.success('Job requeued')
    },
    onError: () => toast.error('Failed to retry job'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => nexus.client.jobs.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['dash-job-stats'] })
      toast.success('Job cancelled')
    },
    onError: () => toast.error('Failed to cancel job'),
  })

  function handleTabChange(value: string) {
    setActiveTab(value)
    setPage(0)
    router.replace(value === 'ALL' ? routes.dashboard.jobs : routes.dashboard.jobsByStatus(value))
  }

  const columns: Column<Job>[] = [
    { key: 'type',   header: 'Type',    cell: (r) => <code className="text-sm font-mono">{r.type}</code> },
    { key: 'status', header: 'Status',  cell: (r) => <Badge variant={STATUS_VARIANT[r.status] ?? 'secondary'}>{r.status}</Badge> },
    { key: 'retries', header: 'Retries', cell: (r) => <span className="tabular-nums text-sm text-muted-foreground">{r.retries} / {r.maxRetries}</span> },
    {
      key: 'createdAt', header: 'Queued',
      cell: (r) => <span className="text-sm text-muted-foreground font-mono whitespace-nowrap">{r.createdAt ? format(new Date(r.createdAt.replace(/(\.\d{3})\d+/, '$1')), 'MMM d, HH:mm:ss') : '—'}</span>,
    },
    {
      key: 'updatedAt', header: 'Last update',
      cell: (r) => <span className="text-sm text-muted-foreground font-mono whitespace-nowrap">{r.updatedAt ? format(new Date(r.updatedAt.replace(/(\.\d{3})\d+/, '$1')), 'MMM d, HH:mm:ss') : '—'}</span>,
    },
    {
      key: 'actions', header: '', className: 'w-24',
      cell: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="View payload" onClick={() => setPayloadJob(r)} disabled={!r.payload}>
            <Eye className="h-4 w-4" aria-hidden />
          </Button>
          {r.status === 'FAILED' && (
            <ConfirmDialog
              title="Retry job"
              description={`Requeue this ${r.type} job from the beginning?`}
              confirmLabel="Retry"
              onConfirm={() => retryMutation.mutate(r.id)}
            >
              <Button variant="ghost" size="icon" aria-label="Retry job" className="text-orange-500 hover:text-orange-600">
                <RotateCcw className="h-4 w-4" aria-hidden />
              </Button>
            </ConfirmDialog>
          )}
          {r.status === 'PENDING' && (
            <ConfirmDialog
              title="Cancel job"
              description={`Cancel this ${r.type} job?`}
              confirmLabel="Cancel"
              onConfirm={() => cancelMutation.mutate(r.id)}
            >
              <Button variant="ghost" size="icon" aria-label="Cancel job" className="text-destructive hover:text-destructive">
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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Job Queue</h2>
          <p className="text-muted-foreground">Monitor and manage background jobs. Auto-refreshes every 5s.</p>
        </div>
        {stats && (
          <div className="flex gap-3 text-sm">
            {['PENDING', 'RUNNING', 'FAILED'].map((s) => stats[s] ? (
              <span key={s} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{
                  background: s === 'FAILED' ? 'hsl(0 84% 60%)' : s === 'RUNNING' ? 'hsl(142 71% 45%)' : 'hsl(217 91% 60%)'
                }} />
                <span className="text-muted-foreground">{stats[s].toLocaleString()} {s.toLowerCase()}</span>
              </span>
            ) : null)}
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {TABS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="relative">
              {label}
              {stats?.[value] != null && stats[value] > 0 && value !== 'ALL' && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">
                  {stats[value]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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

      <Dialog open={!!payloadJob} onOpenChange={(v) => { if (!v) setPayloadJob(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Job Payload</DialogTitle>
            <DialogDescription>
              <code className="font-mono">{payloadJob?.type}</code> · <code className="font-mono text-xs">{payloadJob?.id}</code>
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs font-mono leading-relaxed">
            {payloadJob?.payload ? JSON.stringify(payloadJob.payload, null, 2) : 'No payload'}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
