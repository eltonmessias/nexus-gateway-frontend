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
import { OrgSelect } from '@/components/org-select'
import { ProjectSelect } from '@/components/project-select'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'

const PAGE_SIZE = 10

const createSchema = z.object({
  name:           z.string().min(2, 'Name must be at least 2 characters'),
  organizationId: z.string().uuid('Select an organisation'),
  projectId:      z.string().uuid('Select a project'),
})

type CreateForm = z.infer<typeof createSchema>

export default function ApiClientsPage() {
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const qc = useQueryClient()
  const isAuth = useAuthStore((s) => s.status === 'authenticated')

  const { data, isLoading } = useQuery({
    queryKey: ['api-clients', page, PAGE_SIZE],
    queryFn: () => nexus.client.apiClients.list({ page, size: PAGE_SIZE }),
    enabled: isAuth,
    staleTime: 15_000,
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateForm) =>
      nexus.client.apiClients.create({ name: body.name, organizationId: body.organizationId, projectId: body.projectId }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['api-clients'] })
      setOpen(false)
      setApiKey(result.apiKey)
      toast.success('API client created — save your key now!')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed'),
  })

  const rotateMutation = useMutation({
    mutationFn: (id: string) => nexus.client.apiClients.rotateKey(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['api-clients'] })
      setApiKey(result.apiKey)
      toast.success('API key rotated — save your new key!')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nexus.client.apiClients.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-clients'] })
      toast.success('Client deleted')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed'),
  })

  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const watchedOrgId = watch('organizationId')

  function onOpenChange(val: boolean) {
    setOpen(val)
    if (!val) reset()
  }

  const columns: Column<ApiClient>[] = [
    { key: 'name', header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> },
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
      cell: (r) => (
        <div className="flex gap-1">
          <ConfirmDialog
            title="Rotate API key"
            description="The current key will stop working immediately. A new key will be shown once."
            confirmLabel="Rotate"
            onConfirm={() => rotateMutation.mutate(r.id)}
          >
            <Button variant="ghost" size="icon" aria-label={`Rotate key for ${r.name}`}>
              <RotateCcw className="h-4 w-4" aria-hidden />
            </Button>
          </ConfirmDialog>
          <ConfirmDialog
            title="Delete API client"
            description={`Delete client "${r.name}"? Any services using this key will lose access immediately.`}
            onConfirm={() => deleteMutation.mutate(r.id)}
          >
            <Button variant="ghost" size="icon" aria-label={`Delete client ${r.name}`} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </ConfirmDialog>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Clients</h2>
          <p className="text-muted-foreground">Machine-to-machine credentials for your services.</p>
        </div>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" aria-hidden />New Client</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Client</DialogTitle>
              <DialogDescription>Create an M2M client. The API key is shown once.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Client Name</Label>
                  <Input id="client-name" placeholder="billing-service" {...register('name')} />
                  {errors.name && <p className="text-xs text-destructive" role="alert">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Controller
                    name="organizationId"
                    control={control}
                    render={({ field }) => (
                      <OrgSelect value={field.value ?? ''} onChange={field.onChange} />
                    )}
                  />
                  {errors.organizationId && <p className="text-xs text-destructive" role="alert">{errors.organizationId.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Controller
                    name="projectId"
                    control={control}
                    render={({ field }) => (
                      <ProjectSelect value={field.value ?? ''} onChange={field.onChange} organizationId={watchedOrgId} />
                    )}
                  />
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
      </div>

      {apiKey && (
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-4">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
            Save your API key — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background rounded px-3 py-2 border font-mono break-all">{apiKey}</code>
            <Button
              size="icon"
              variant="outline"
              aria-label="Copy API key"
              onClick={() => { navigator.clipboard.writeText(apiKey); toast.success('Copied!') }}
            >
              <Copy className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setApiKey(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <DataTable columns={columns} data={data?.content ?? []} loading={isLoading} page={page} pageSize={PAGE_SIZE} totalElements={data?.totalElements ?? 0} onPageChange={setPage} rowKey={(r) => r.id} />
    </div>
  )
}
