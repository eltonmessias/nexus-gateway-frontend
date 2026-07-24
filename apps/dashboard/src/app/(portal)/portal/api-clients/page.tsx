'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, RotateCcw, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { ApiClient } from '@nexus/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ProjectSelect } from '@/components/project-select'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'
import { usePortalStore, canDo } from '@/store/portal'

const PAGE_SIZE = 10

const createSchema = z.object({
  name:      z.string().min(2, 'Name required'),
  projectId: z.string().uuid('Select a project'),
})
type CreateForm = z.infer<typeof createSchema>

export default function PortalApiClientsPage() {
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const qc             = useQueryClient()
  const isAuth         = useAuthStore((s) => s.status === 'authenticated')
  const organizationId = useAuthStore((s) => s.organizationId)
  const { userRole }   = usePortalStore()
  const canWrite       = canDo(userRole, 'ADMIN')

  const { data, isLoading } = useQuery({
    queryKey: ['portal-api-clients', organizationId],
    queryFn:  () => organizationId
      ? nexus.client.apiClients.findByOrganization(organizationId)
      : Promise.resolve([]),
    enabled:  isAuth && !!organizationId,
    staleTime: 15_000,
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateForm) =>
      nexus.client.apiClients.create({
        name:           body.name,
        projectId:      body.projectId,
        organizationId: organizationId!,
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['portal-api-clients'] })
      setOpen(false)
      setApiKey(result.apiKey)
      toast.success('API client created — save your key!')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed'),
  })

  const rotateMutation = useMutation({
    mutationFn: (id: string) => nexus.client.apiClients.rotateKey(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['portal-api-clients'] })
      setApiKey(result.apiKey)
      toast.success('Key rotated — save your new key!')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nexus.client.apiClients.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-api-clients'] })
      toast.success('Client deleted')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed'),
  })

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const columns: Column<ApiClient>[] = [
    { key: 'name',     header: 'Name',     cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'clientId', header: 'Client ID', cell: (r) => <code className="font-mono text-xs text-muted-foreground">{r.clientId}</code> },
    {
      key: 'rateLimitRpm', header: 'Rate Limit',
      cell: (r) => (
        <span className="text-sm text-muted-foreground">{r.rateLimitRpm} rpm / {r.rateLimitBurst} burst</span>
      ),
    },
    {
      key: 'status', header: 'Status',
      cell: (r) => <Badge variant={r.active ? 'success' : 'secondary'}>{r.active ? 'Active' : 'Revoked'}</Badge>,
    },
    {
      key: 'createdAt', header: 'Created',
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.createdAt ? format(new Date(r.createdAt.replace(/(\.\d{3})\d+/, '$1')), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'actions', header: '', className: 'w-24',
      cell: (r) => canWrite ? (
        <div className="flex gap-1">
          <ConfirmDialog
            title="Rotate API key"
            description="The current key stops working immediately. The new key is shown once."
            confirmLabel="Rotate"
            onConfirm={() => rotateMutation.mutate(r.id)}
          >
            <Button variant="ghost" size="icon" aria-label={`Rotate key for ${r.name}`}>
              <RotateCcw className="h-4 w-4" aria-hidden />
            </Button>
          </ConfirmDialog>
          <ConfirmDialog
            title="Delete API client"
            description={`Delete "${r.name}"? Services using this key will lose access immediately.`}
            onConfirm={() => deleteMutation.mutate(r.id)}
          >
            <Button variant="ghost" size="icon" aria-label={`Delete ${r.name}`} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </ConfirmDialog>
        </div>
      ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Clients</h2>
          <p className="text-muted-foreground">Machine-to-machine credentials for your services.</p>
        </div>
        {canWrite && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" aria-hidden />New Client</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Client</DialogTitle>
                <DialogDescription>The API key is shown only once after creation.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit((d) => createMutation.mutate(d))}>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="cl-name">Client Name</Label>
                    <Input id="cl-name" placeholder="billing-service" {...register('name')} />
                    {errors.name && <p className="text-xs text-destructive" role="alert">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Controller name="projectId" control={control} render={({ field }) => (
                      <ProjectSelect
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        organizationId={organizationId ?? undefined}
                      />
                    )} />
                    {errors.projectId && <p className="text-xs text-destructive" role="alert">{errors.projectId.message}</p>}
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending}>Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {apiKey && (
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-4">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
            Save your API key — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background rounded px-3 py-2 border font-mono break-all">{apiKey}</code>
            <Button size="icon" variant="outline" aria-label="Copy API key"
              onClick={() => { navigator.clipboard.writeText(apiKey); toast.success('Copied!') }}>
              <Copy className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setApiKey(null)}>Dismiss</Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data ?? []}
        loading={isLoading}
        page={0}
        pageSize={data?.length ?? PAGE_SIZE}
        totalElements={data?.length ?? 0}
        onPageChange={() => {}}
        rowKey={(r) => r.id}
      />
    </div>
  )
}
