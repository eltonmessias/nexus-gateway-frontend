'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { Team, Organization } from '@nexus/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { OrgSelect } from '@/components/org-select'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'

const PAGE_SIZE = 10

const createSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  organizationId: z.string().uuid('Select an organisation'),
})
type CreateForm = z.infer<typeof createSchema>

const editSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

export default function TeamsPage() {
  const [page, setPage] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const qc     = useQueryClient()
  const isAuth = useAuthStore((s) => s.status === 'authenticated')

  const { data, isLoading } = useQuery({
    queryKey: ['teams', page, PAGE_SIZE],
    queryFn:  () => nexus.client.teams.list({ page, size: PAGE_SIZE }),
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
    mutationFn: (body: CreateForm) => nexus.client.teams.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      setCreateOpen(false)
      toast.success('Team created')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed to create'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: EditForm }) =>
      nexus.client.teams.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      setEditTeam(null)
      toast.success('Team updated')
    },
    onError: () => toast.error('Failed to update team'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nexus.client.teams.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team deleted')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed to delete'),
  })

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) })
  const editForm   = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  function openEdit(team: Team) {
    setEditTeam(team)
    editForm.reset({ name: team.name, description: team.description ?? '' })
  }

  const columns: Column<Team>[] = [
    { key: 'name', header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'description', header: 'Description', cell: (r) => <span className="text-sm text-muted-foreground">{r.description ?? '—'}</span> },
    {
      key: 'orgId', header: 'Organization',
      cell: (r) => <span className="text-sm">{orgMap[r.organizationId] ?? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.organizationId}</code>}</span>,
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
      key: 'actions', header: '', className: 'w-20',
      cell: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label={`Edit team ${r.name}`} onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <ConfirmDialog
            title="Delete team"
            description={`Delete team "${r.name}"? This action cannot be undone.`}
            onConfirm={() => deleteMutation.mutate(r.id)}
          >
            <Button variant="ghost" size="icon" aria-label={`Delete team ${r.name}`} className="text-destructive hover:text-destructive">
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
          <h2 className="text-2xl font-bold tracking-tight">Teams</h2>
          <p className="text-muted-foreground">Manage teams within your organizations.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) createForm.reset() }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" aria-hidden />New Team</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Team</DialogTitle>
              <DialogDescription>Add a new team to an organization.</DialogDescription>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input id="team-name" placeholder="Engineering" {...createForm.register('name')} />
                  {createForm.formState.errors.name && <p className="text-xs text-destructive" role="alert">{createForm.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-desc">Description (optional)</Label>
                  <Input id="team-desc" placeholder="Responsible for the core platform" {...createForm.register('description')} />
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
                <Button type="submit" disabled={createForm.formState.isSubmitting || createMutation.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editTeam} onOpenChange={(v) => { if (!v) setEditTeam(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Update the team name and description.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit((d) => editTeam && updateMutation.mutate({ id: editTeam.id, body: d }))}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-team-name">Name</Label>
                <Input id="edit-team-name" {...editForm.register('name')} />
                {editForm.formState.errors.name && <p className="text-xs text-destructive" role="alert">{editForm.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-team-desc">Description</Label>
                <Input id="edit-team-desc" {...editForm.register('description')} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setEditTeam(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DataTable columns={columns} data={data?.content ?? []} loading={isLoading} page={page} pageSize={PAGE_SIZE} totalElements={data?.totalElements ?? 0} onPageChange={setPage} rowKey={(r) => r.id} />
    </div>
  )
}
