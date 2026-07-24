'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Pencil, Power } from 'lucide-react'
import { toast } from 'sonner'
import type { Project, Organization } from '@nexus/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { OrgSelect } from '@/components/org-select'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'

const PAGE_SIZE = 10

const createSchema = z.object({
  name:           z.string().min(2, 'Name required'),
  key:            z.string().min(2, 'Key required').regex(/^[A-Z0-9_]+$/, 'Uppercase, numbers and underscores only'),
  organizationId: z.string().uuid('Select an organisation'),
})
type CreateForm = z.infer<typeof createSchema>

const editSchema = z.object({
  name: z.string().min(2, 'Name required'),
})
type EditForm = z.infer<typeof editSchema>

export default function ProjectsPage() {
  const [page, setPage]       = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const qc     = useQueryClient()
  const isAuth = useAuthStore((s) => s.status === 'authenticated')

  const { data, isLoading } = useQuery({
    queryKey: ['projects', page, PAGE_SIZE],
    queryFn:  () => nexus.client.projects.list({ page, size: PAGE_SIZE }),
    enabled:  isAuth,
    staleTime: 15_000,
  })

  const { data: orgsData } = useQuery({
    queryKey: ['organizations-all'],
    queryFn:  () => nexus.client.organizations.list({ page: 0, size: 200 }),
    enabled:  isAuth,
    staleTime: 60_000,
  })

  const orgMap = useMemo(() => {
    const map: Record<string, string> = {}
    orgsData?.content.forEach((o: Organization) => { map[o.id] = o.name })
    return map
  }, [orgsData])

  const createMutation = useMutation({
    mutationFn: (body: CreateForm) => nexus.client.projects.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setCreateOpen(false)
      toast.success('Project created')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateForm & { active: boolean }> }) =>
      nexus.client.projects.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setEditProject(null)
      toast.success('Project updated')
    },
    onError: () => toast.error('Failed to update project'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nexus.client.projects.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project deleted')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed'),
  })

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) })
  const editForm   = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  function openEdit(project: Project) {
    setEditProject(project)
    editForm.reset({ name: project.name })
  }

  const columns: Column<Project>[] = [
    { key: 'name', header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'key',  header: 'Key',  cell: (r) => <code className="text-xs bg-muted px-1 rounded">{r.key}</code> },
    {
      key: 'organization', header: 'Organization',
      cell: (r) => <span className="text-sm text-muted-foreground">{orgMap[r.organizationId] ?? '—'}</span>,
    },
    {
      key: 'status', header: 'Status',
      cell: (r) => <Badge variant={r.active ? 'success' : 'secondary'}>{r.active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'createdAt', header: 'Created',
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.createdAt ? new Date(r.createdAt.replace(/(\.\d{3})\d+/, '$1')).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions', header: '', className: 'w-24',
      cell: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label={`Edit ${r.name}`} onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <ConfirmDialog
            title={r.active ? 'Deactivate project' : 'Activate project'}
            description={r.active
              ? `Deactivate "${r.name}"? SDK clients will stop receiving flag evaluations.`
              : `Activate "${r.name}"?`}
            onConfirm={() => updateMutation.mutate({ id: r.id, body: { active: !r.active } })}
          >
            <Button
              variant="ghost" size="icon"
              aria-label={r.active ? `Deactivate ${r.name}` : `Activate ${r.name}`}
              className={r.active ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'}
            >
              <Power className="h-4 w-4" aria-hidden />
            </Button>
          </ConfirmDialog>
          <ConfirmDialog
            title="Delete project"
            description={`Delete "${r.name}"? All associated flags and data will be removed.`}
            onConfirm={() => deleteMutation.mutate(r.id)}
          >
            <Button variant="ghost" size="icon" aria-label={`Delete ${r.name}`} className="text-destructive hover:text-destructive">
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
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">Manage projects scoped to your organizations.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) createForm.reset() }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" aria-hidden />New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>Add a new project to an organization.</DialogDescription>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="proj-name">Name</Label>
                  <Input id="proj-name" placeholder="My Project" {...createForm.register('name')} />
                  {createForm.formState.errors.name && <p className="text-xs text-destructive" role="alert">{createForm.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proj-key">Key</Label>
                  <Input id="proj-key" placeholder="MY_PROJECT" {...createForm.register('key')} />
                  {createForm.formState.errors.key && <p className="text-xs text-destructive" role="alert">{createForm.formState.errors.key.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Controller name="organizationId" control={createForm.control} render={({ field }) => (
                    <OrgSelect value={field.value ?? ''} onChange={field.onChange} />
                  )} />
                  {createForm.formState.errors.organizationId && <p className="text-xs text-destructive" role="alert">{createForm.formState.errors.organizationId.message}</p>}
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

      {/* Edit dialog */}
      <Dialog open={!!editProject} onOpenChange={(v) => { if (!v) setEditProject(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update the project name. The key cannot be changed after creation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit((d) => editProject && updateMutation.mutate({ id: editProject.id, body: d }))}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-proj-name">Name</Label>
                <Input id="edit-proj-name" {...editForm.register('name')} />
                {editForm.formState.errors.name && <p className="text-xs text-destructive" role="alert">{editForm.formState.errors.name.message}</p>}
              </div>
              {editProject && (
                <div className="space-y-2">
                  <Label>Key <span className="text-xs text-muted-foreground">(read-only)</span></Label>
                  <code className="block text-sm bg-muted px-3 py-2 rounded text-muted-foreground">{editProject.key}</code>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setEditProject(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DataTable columns={columns} data={data?.content ?? []} loading={isLoading} page={page} pageSize={PAGE_SIZE} totalElements={data?.totalElements ?? 0} onPageChange={setPage} rowKey={(r) => r.id} />
    </div>
  )
}
