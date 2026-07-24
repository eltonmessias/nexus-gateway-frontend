'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { Flag } from '@nexus/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ProjectSelect } from '@/components/project-select'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'

const PAGE_SIZE = 10

const createSchema = z.object({
  key:         z.string().min(1, 'Key required').regex(/^[a-z0-9-_]+$/, 'Lowercase letters, numbers, dashes or underscores only'),
  description: z.string().optional(),
  projectId:   z.string().uuid('Select a project'),
})
type CreateForm = z.infer<typeof createSchema>

const editSchema = z.object({
  description: z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

export default function FlagsPage() {
  const [page, setPage]             = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [editFlag, setEditFlag]     = useState<Flag | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const qc     = useQueryClient()
  const isAuth = useAuthStore((s) => s.status === 'authenticated')

  const { data, isLoading } = useQuery({
    queryKey: ['flags', page, PAGE_SIZE],
    queryFn:  () => nexus.client.flags.list({ page, size: PAGE_SIZE }),
    enabled:  isAuth,
    staleTime: 15_000,
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateForm) =>
      nexus.client.flags.create({ key: body.key, description: body.description || undefined, projectId: body.projectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flags'] })
      setCreateOpen(false)
      toast.success('Flag created')
    },
    onError: () => toast.error('Failed to create flag'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: EditForm }) =>
      nexus.client.flags.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flags'] })
      setEditFlag(null)
      toast.success('Flag updated')
    },
    onError: () => toast.error('Failed to update flag'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      enabled ? nexus.client.flags.enable(id) : nexus.client.flags.disable(id),
    onMutate: ({ id }) => setPendingIds((s) => new Set(s).add(id)),
    onSettled: (_, __, { id }) => setPendingIds((s) => { const n = new Set(s); n.delete(id); return n }),
    onError:   () => toast.error('Failed to toggle flag'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flags'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nexus.client.flags.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flags'] }); toast.success('Flag deleted') },
    onError:   () => toast.error('Failed to delete flag'),
  })

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) })
  const editForm   = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  function openEdit(flag: Flag) {
    setEditFlag(flag)
    editForm.reset({ description: flag.description ?? '' })
  }

  const columns: Column<Flag>[] = [
    { key: 'key', header: 'Key', cell: (r) => <code className="font-mono text-sm">{r.key}</code> },
    { key: 'description', header: 'Description', cell: (r) => <span className="text-muted-foreground text-sm">{r.description ?? '—'}</span> },
    {
      key: 'enabled', header: 'Enabled',
      cell: (r) => (
        <Switch
          checked={r.enabled}
          aria-label={`Toggle flag ${r.key}`}
          onCheckedChange={(enabled) => toggleMutation.mutate({ id: r.id, enabled })}
          disabled={pendingIds.has(r.id)}
        />
      ),
    },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={r.enabled ? 'success' : 'secondary'}>{r.enabled ? 'On' : 'Off'}</Badge> },
    {
      key: 'updatedAt', header: 'Last Updated',
      cell: (r) => <span className="text-sm text-muted-foreground">{r.updatedAt ? format(new Date(r.updatedAt.replace(/(\.\d{3})\d+/, '$1')), 'MMM d, yyyy') : '—'}</span>,
    },
    {
      key: 'actions', header: '', className: 'w-20',
      cell: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label={`Edit flag ${r.key}`} onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <ConfirmDialog
            title="Delete flag"
            description={`Delete flag "${r.key}"? Any code evaluating this flag will receive the default value.`}
            onConfirm={() => deleteMutation.mutate(r.id)}
          >
            <Button variant="ghost" size="icon" aria-label={`Delete flag ${r.key}`} className="text-destructive hover:text-destructive">
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
          <h2 className="text-2xl font-bold tracking-tight">Feature Flags</h2>
          <p className="text-muted-foreground">Toggle features on and off without redeploying.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) createForm.reset() }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" aria-hidden />New Flag</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Feature Flag</DialogTitle>
              <DialogDescription>Add a new flag to a project.</DialogDescription>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="flag-key">Flag Key</Label>
                  <Input id="flag-key" placeholder="new-checkout-flow" {...createForm.register('key')} />
                  {createForm.formState.errors.key && <p role="alert" className="text-xs text-destructive">{createForm.formState.errors.key.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flag-desc">Description (optional)</Label>
                  <Input id="flag-desc" placeholder="Enables the redesigned checkout" {...createForm.register('description')} />
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Controller name="projectId" control={createForm.control} render={({ field }) => (
                    <ProjectSelect value={field.value ?? ''} onChange={field.onChange} />
                  )} />
                  {createForm.formState.errors.projectId && <p role="alert" className="text-xs text-destructive">{createForm.formState.errors.projectId.message}</p>}
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit description dialog */}
      <Dialog open={!!editFlag} onOpenChange={(v) => { if (!v) setEditFlag(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Flag</DialogTitle>
            <DialogDescription>
              Update the description for <code className="font-mono text-sm">{editFlag?.key}</code>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit((d) => editFlag && updateMutation.mutate({ id: editFlag.id, body: d }))}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-flag-desc">Description</Label>
                <Input id="edit-flag-desc" placeholder="What does this flag control?" {...editForm.register('description')} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setEditFlag(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DataTable columns={columns} data={data?.content ?? []} loading={isLoading} page={page} pageSize={PAGE_SIZE} totalElements={data?.totalElements ?? 0} onPageChange={setPage} rowKey={(r) => r.id} />
    </div>
  )
}
