'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { UserPlus, MoreHorizontal, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { OrgMember, OrgMemberRole } from '@nexus/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'
import { canDo, usePortalStore } from '@/store/portal'

const ROLE_STYLE: Record<OrgMemberRole, string> = {
  OWNER:     'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-transparent',
  ADMIN:     'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent',
  DEVELOPER: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent',
  VIEWER:    'bg-secondary text-secondary-foreground border-transparent',
}

const ROLE_LABELS: OrgMemberRole[] = ['ADMIN', 'DEVELOPER', 'VIEWER']

const inviteSchema = z.object({
  name:  z.string().optional(),
  email: z.string().email('Invalid email address'),
  role:  z.enum(['ADMIN', 'DEVELOPER', 'VIEWER'] as const),
})
type InviteForm = z.infer<typeof inviteSchema>

export default function MembersPage() {
  const qc             = useQueryClient()
  const isAuth         = useAuthStore((s) => s.status === 'authenticated')
  const organizationId = useAuthStore((s) => s.organizationId)
  const { userRole }   = usePortalStore()
  const canManage      = canDo(userRole, 'ADMIN')

  const [inviteOpen, setInviteOpen] = useState(false)

  const { data: members = [], isLoading } = useQuery<OrgMember[]>({
    queryKey: ['portal-members', organizationId],
    queryFn:  () => nexus.client.members.list(organizationId!),
    enabled:  isAuth && !!organizationId,
    staleTime: 30_000,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'DEVELOPER' },
  })

  const inviteMutation = useMutation({
    mutationFn: (body: InviteForm) =>
      nexus.client.members.invite(organizationId!, { name: body.name || undefined, email: body.email, role: body.role }),
    onSuccess: (newMember) => {
      qc.setQueryData<OrgMember[]>(['portal-members', organizationId], (prev = []) => [...prev, newMember])
      toast.success(`Invitation sent to ${newMember.email}`)
      setInviteOpen(false)
      reset()
    },
    onError: () => toast.error('Failed to send invitation'),
  })

  const changeRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: OrgMemberRole }) =>
      nexus.client.members.changeRole(memberId, { role }),
    onSuccess: (updated) => {
      qc.setQueryData<OrgMember[]>(['portal-members', organizationId], (prev = []) =>
        prev.map((m) => m.id === updated.id ? updated : m)
      )
      toast.success('Role updated')
    },
    onError: () => toast.error('Failed to update role'),
  })

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => nexus.client.members.remove(memberId),
    onSuccess: (_result, memberId) => {
      qc.setQueryData<OrgMember[]>(['portal-members', organizationId], (prev = []) =>
        prev.filter((m) => m.id !== memberId)
      )
      toast.success('Member removed')
    },
    onError: () => toast.error('Failed to remove member'),
  })

  const active  = members.filter((m) => m.status === 'ACTIVE').length
  const pending = members.filter((m) => m.status === 'INVITED').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Members</h2>
          <p className="text-muted-foreground">{active} active · {pending} pending</p>
        </div>
        {canManage && (
          <Dialog open={inviteOpen} onOpenChange={(v) => { setInviteOpen(v); if (!v) reset() }}>
            <DialogTrigger asChild>
              <Button><UserPlus className="mr-2 h-4 w-4" aria-hidden />Invite Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>They will receive an email to join your organisation.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit((d) => inviteMutation.mutate(d))}>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="inv-name">Name (optional)</Label>
                    <Input id="inv-name" placeholder="Jane Smith" {...register('name')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-email">Email address</Label>
                    <Input id="inv-email" type="email" placeholder="colleague@company.com" {...register('email')} />
                    {errors.email && <p className="text-xs text-destructive" role="alert">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-role">Role</Label>
                    <Select value={watch('role')} onValueChange={(v) => setValue('role', v as 'ADMIN' | 'DEVELOPER' | 'VIEWER')}>
                      <SelectTrigger id="inv-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin — manage members &amp; projects</SelectItem>
                        <SelectItem value="DEVELOPER">Developer — manage flags &amp; jobs</SelectItem>
                        <SelectItem value="VIEWER">Viewer — read only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting || inviteMutation.isPending}>
                    <Mail className="mr-2 h-4 w-4" aria-hidden />Send Invite
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Member</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Joined</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              {canManage && <th className="px-4 py-3 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-muted-foreground">
                  Loading members…
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-muted-foreground">
                  No members yet. Invite someone to get started.
                </td>
              </tr>
            ) : members.map((member) => (
              <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {member.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge className={cn('text-xs', ROLE_STYLE[member.role])}>
                    {member.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  {member.joinedAt ? format(new Date(member.joinedAt.replace(/(\.\d{3})\d+/, '$1')), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-4 py-3">
                  {member.status === 'INVITED'
                    ? <Badge variant="warning">Pending</Badge>
                    : <Badge variant="success">Active</Badge>}
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    {member.role !== 'OWNER' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${member.name}`}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Change role</p>
                          {ROLE_LABELS.filter((r) => r !== member.role).map((role) => (
                            <DropdownMenuItem
                              key={role}
                              onClick={() => changeRoleMutation.mutate({ memberId: member.id, role })}
                            >
                              <Badge className={cn('text-xs mr-2', ROLE_STYLE[role])}>{role}</Badge>
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <ConfirmDialog
                            title="Remove member"
                            description={`Remove ${member.name} from the organisation? They will lose all access immediately.`}
                            confirmLabel="Remove"
                            onConfirm={() => removeMutation.mutate(member.id)}
                          >
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              Remove member
                            </DropdownMenuItem>
                          </ConfirmDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
