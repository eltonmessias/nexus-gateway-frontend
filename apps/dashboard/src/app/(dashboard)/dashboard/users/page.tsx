'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { MoreHorizontal, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { User, Role } from '@nexus/types'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DataTable, type Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { OrgSelect } from '@/components/org-select'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'

const ALL_ROLES: Role[] = ['ADMIN', 'ORG_OWNER', 'TEAM_ADMIN', 'TEAM_MEMBER', 'VIEWER']

const createSchema = z.object({
  name:           z.string().min(2, 'Name must be at least 2 characters'),
  email:          z.string().email('Invalid email'),
  password:       z.string().min(8, 'Password must be at least 8 characters'),
  role:           z.enum(['ADMIN', 'ORG_OWNER', 'TEAM_ADMIN', 'TEAM_MEMBER', 'VIEWER'] as const).optional(),
  organizationId: z.string().uuid().optional().or(z.literal('')),
})
type CreateForm = z.infer<typeof createSchema>

const PAGE_SIZE = 10

const ROLE_VARIANT: Record<Role, 'default' | 'secondary'> = {
  ADMIN:       'default',
  ORG_OWNER:   'default',
  TEAM_ADMIN:  'default',
  TEAM_MEMBER: 'secondary',
  VIEWER:      'secondary',
}

function safeInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.trim().split(/\s+/).map((n) => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

export default function UsersPage() {
  const [page, setPage]       = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const qc     = useQueryClient()
  const isAuth = useAuthStore((s) => s.status === 'authenticated')

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) })

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, PAGE_SIZE],
    queryFn:  () => nexus.client.users.list({ page, size: PAGE_SIZE }),
    enabled:  isAuth,
    staleTime: 15_000,
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateForm) =>
      nexus.client.users.create({
        name:           body.name,
        email:          body.email,
        password:       body.password,
        role:           body.role,
        organizationId: body.organizationId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setCreateOpen(false)
      createForm.reset()
      toast.success('User created')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed to create user'),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      nexus.client.users.update(id, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Role updated')
    },
    onError: () => toast.error('Failed to update role'),
  })

  const setActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      nexus.client.users.setActive(id, active),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(vars.active ? 'User activated' : 'User deactivated')
    },
    onError: () => toast.error('Failed to update user status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nexus.client.users.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted')
    },
    onError: () => toast.error('Failed to delete user'),
  })

  const columns: Column<User>[] = [
    {
      key: 'user', header: 'User',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {safeInitials(r.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium leading-none">{r.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role',
      cell: (r) => (
        <Badge variant={ROLE_VARIANT[r.role] ?? 'secondary'} className="capitalize">
          {r.role.toLowerCase().replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'status', header: 'Status',
      cell: (r) => <Badge variant={r.active ? 'success' : 'secondary'}>{r.active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'createdAt', header: 'Joined',
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.createdAt ? format(new Date(r.createdAt.replace(/(\.\d{3})\d+/, '$1')), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'actions', header: '', className: 'w-10',
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${r.name}`}>
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Change role</p>
            {ALL_ROLES.filter((role) => role !== r.role).map((role) => (
              <DropdownMenuItem key={role} onClick={() => updateRoleMutation.mutate({ id: r.id, role })}>
                {role.toLowerCase().replace(/_/g, ' ')}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {r.active ? (
              <ConfirmDialog
                title="Deactivate user"
                description={`Deactivate ${r.name}? They will no longer be able to log in.`}
                confirmLabel="Deactivate"
                onConfirm={() => setActiveMutation.mutate({ id: r.id, active: false })}
              >
                <DropdownMenuItem
                  className="text-muted-foreground"
                  onSelect={(e) => e.preventDefault()}
                >
                  Deactivate
                </DropdownMenuItem>
              </ConfirmDialog>
            ) : (
              <DropdownMenuItem onClick={() => setActiveMutation.mutate({ id: r.id, active: true })}>
                Activate
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <ConfirmDialog
              title="Delete user"
              description={`Permanently delete ${r.name}? This cannot be undone.`}
              onConfirm={() => deleteMutation.mutate(r.id)}
            >
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => e.preventDefault()}
              >
                Delete user
              </DropdownMenuItem>
            </ConfirmDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">Manage platform users and their roles.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) createForm.reset() }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" aria-hidden />New User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>Add a new user to the platform.</DialogDescription>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="u-name">Name</Label>
                  <Input id="u-name" placeholder="Jane Smith" {...createForm.register('name')} />
                  {createForm.formState.errors.name && <p className="text-xs text-destructive" role="alert">{createForm.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-email">Email</Label>
                  <Input id="u-email" type="email" placeholder="jane@company.com" {...createForm.register('email')} />
                  {createForm.formState.errors.email && <p className="text-xs text-destructive" role="alert">{createForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-password">Password</Label>
                  <Input id="u-password" type="password" placeholder="Min. 8 characters" {...createForm.register('password')} />
                  {createForm.formState.errors.password && <p className="text-xs text-destructive" role="alert">{createForm.formState.errors.password.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Role <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Controller
                    name="role"
                    control={createForm.control}
                    render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role…" />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r.toLowerCase().replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Organisation <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Controller
                    name="organizationId"
                    control={createForm.control}
                    render={({ field }) => (
                      <OrgSelect value={field.value ?? ''} onChange={field.onChange} />
                    )}
                  />
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
      <DataTable columns={columns} data={data?.content ?? []} loading={isLoading} page={page} pageSize={PAGE_SIZE} totalElements={data?.totalElements ?? 0} onPageChange={setPage} rowKey={(r) => r.id} />
    </div>
  )
}
