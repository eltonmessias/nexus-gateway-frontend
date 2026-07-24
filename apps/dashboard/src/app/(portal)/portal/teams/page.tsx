'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Pencil, UsersRound, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Team, TeamMember, OrgMember } from '@nexus/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { DataTable, type Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'
import { usePortalStore, canDo } from '@/store/portal'

const PAGE_SIZE = 20

const ROLE_STYLE: Record<string, string> = {
  OWNER:     'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-transparent',
  ADMIN:     'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent',
  DEVELOPER: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent',
  VIEWER:    'bg-secondary text-secondary-foreground border-transparent',
}

const createSchema = z.object({
  name:        z.string().min(1, 'Name required'),
  description: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

// ─── Members dialog ───────────────────────────────────────────────────────────

function TeamMembersDialog({
  team, orgMembers, canWrite,
}: {
  team: Team
  orgMembers: OrgMember[]
  canWrite: boolean
}) {
  const [open, setOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const qc = useQueryClient()

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['team-members', team.id],
    queryFn:  () => nexus.client.teams.listMembers(team.id),
    enabled:  open,
  })

  const addMutation = useMutation({
    mutationFn: (orgMemberId: string) =>
      nexus.client.teams.addMember(team.id, { orgMemberId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members', team.id] })
      setSelectedMemberId('')
      toast.success('Member added')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed to add member'),
  })

  const removeMutation = useMutation({
    mutationFn: (orgMemberId: string) =>
      nexus.client.teams.removeMember(team.id, orgMemberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members', team.id] })
      toast.success('Member removed')
    },
    onError: () => toast.error('Failed to remove member'),
  })

  const memberIds = new Set(members.map((m) => m.orgMemberId))
  const available = orgMembers.filter((m) => !memberIds.has(m.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <UsersRound className="h-3.5 w-3.5" aria-hidden />
          Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{team.name} — Members</DialogTitle>
          <DialogDescription>Manage who has access to this team.</DialogDescription>
        </DialogHeader>

        {canWrite && (
          <div className="flex gap-2">
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={available.length ? 'Add a member…' : 'All org members already added'} />
              </SelectTrigger>
              <SelectContent>
                {available.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{m.email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!selectedMemberId || addMutation.isPending}
              onClick={() => addMutation.mutate(selectedMemberId)}
            >
              <UserPlus className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        )}

        <Separator />

        <div className="space-y-1 max-h-72 overflow-y-auto">
          {isLoading && (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
          )}
          {!isLoading && members.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No members yet.</p>
          )}
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs">{m.memberName?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none">{m.memberName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.memberEmail}</p>
              </div>
              <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', ROLE_STYLE[m.memberRole])}>
                {m.memberRole}
              </Badge>
              {canWrite && (
                <ConfirmDialog
                  title="Remove member"
                  description={`Remove ${m.memberName} from ${team.name}?`}
                  onConfirm={() => removeMutation.mutate(m.orgMemberId)}
                >
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0">
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </ConfirmDialog>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortalTeamsPage() {
  const [page, setPage]             = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTeam, setEditTeam]     = useState<Team | null>(null)
  const qc                          = useQueryClient()
  const isAuth                      = useAuthStore((s) => s.status === 'authenticated')
  const organizationId              = useAuthStore((s) => s.organizationId)
  const { userRole }                = usePortalStore()
  const canWrite                    = canDo(userRole, 'ADMIN')

  const { data, isLoading } = useQuery({
    queryKey: ['portal-teams', organizationId, page, PAGE_SIZE],
    queryFn:  () => nexus.client.teams.list({ page, size: PAGE_SIZE }, organizationId ?? undefined),
    enabled:  isAuth && !!organizationId,
    staleTime: 30_000,
  })

  const { data: orgMembers = [] } = useQuery({
    queryKey: ['portal-org-members', organizationId],
    queryFn:  () => nexus.client.members.list(organizationId!),
    enabled:  isAuth && !!organizationId,
    staleTime: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateForm) =>
      nexus.client.teams.create({ name: body.name, description: body.description || undefined, organizationId: organizationId! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-teams'] })
      setCreateOpen(false)
      toast.success('Team created')
    },
    onError: () => toast.error('Failed to create team'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreateForm }) =>
      nexus.client.teams.update(id, { name: body.name, description: body.description || undefined, organizationId: organizationId! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-teams'] })
      setEditTeam(null)
      toast.success('Team updated')
    },
    onError: () => toast.error('Failed to update team'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nexus.client.teams.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-teams'] })
      toast.success('Team deleted')
    },
    onError: () => toast.error('Failed to delete team'),
  })

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) })
  const editForm   = useForm<CreateForm>({ resolver: zodResolver(createSchema) })

  function openEdit(team: Team) {
    setEditTeam(team)
    editForm.reset({ name: team.name, description: team.description ?? '' })
  }

  const columns: Column<Team>[] = [
    {
      key: 'name', header: 'Team',
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
            <UsersRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          </div>
          <div>
            <p className="font-medium text-sm leading-none">{r.name}</p>
            {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'active', header: 'Status',
      cell: (r) => <Badge variant={r.active ? 'success' : 'secondary'}>{r.active ? 'Active' : 'Inactive'}</Badge>,
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
      key: 'actions', header: '', className: 'w-36',
      cell: (r) => (
        <div className="flex items-center gap-1">
          <TeamMembersDialog team={r} orgMembers={orgMembers} canWrite={canWrite} />
          {canWrite && (
            <>
              <Button variant="ghost" size="icon" aria-label={`Edit ${r.name}`} onClick={() => openEdit(r)}>
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
              <ConfirmDialog
                title="Delete team"
                description={`Delete "${r.name}"? Members will be unassigned.`}
                onConfirm={() => deleteMutation.mutate(r.id)}
              >
                <Button variant="ghost" size="icon" aria-label={`Delete ${r.name}`} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </ConfirmDialog>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Teams</h2>
          <p className="text-muted-foreground">Organise members into teams and assign projects to each team.</p>
        </div>
        {canWrite && (
          <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) createForm.reset() }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" aria-hidden />New Team</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Team</DialogTitle>
                <DialogDescription>Add a new team to your organisation.</DialogDescription>
              </DialogHeader>
              <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Name</Label>
                    <Input id="team-name" placeholder="Frontend Team" {...createForm.register('name')} />
                    {createForm.formState.errors.name && (
                      <p role="alert" className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team-desc">Description (optional)</Label>
                    <Input id="team-desc" placeholder="What does this team work on?" {...createForm.register('description')} />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Dialog open={!!editTeam} onOpenChange={(v) => { if (!v) setEditTeam(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Update details for <strong>{editTeam?.name}</strong>.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit((d) => editTeam && updateMutation.mutate({ id: editTeam.id, body: d }))}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" {...editForm.register('name')} />
                {editForm.formState.errors.name && (
                  <p role="alert" className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Input id="edit-desc" {...editForm.register('description')} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setEditTeam(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
    </div>
  )
}
