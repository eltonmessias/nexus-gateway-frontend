'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { Organization } from '@nexus/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'

const PAGE_SIZE = 10

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function OrganizationsPage() {
  const [page, setPage] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOrg, setEditOrg] = useState<Organization | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [editName, setEditName] = useState('')
  const [formError, setFormError] = useState('')
  const qc = useQueryClient()
  const isAuth = useAuthStore((s) => s.status === 'authenticated')

  useEffect(() => {
    if (!slugTouched) setSlug(toSlug(name))
  }, [name, slugTouched])

  const { data, isLoading } = useQuery({
    queryKey: ['organizations', page, PAGE_SIZE],
    queryFn: () => nexus.client.organizations.list({ page, size: PAGE_SIZE }),
    enabled: isAuth,
  })

  const createMutation = useMutation({
    mutationFn: () => nexus.client.organizations.create({ name, slug }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] })
      setCreateOpen(false); setName(''); setSlug(''); setSlugTouched(false)
      toast.success('Organization created')
    },
    onError: () => toast.error('Failed to create organization'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      nexus.client.organizations.update(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] })
      setEditOrg(null)
      toast.success('Organization updated')
    },
    onError: () => toast.error('Failed to update organization'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nexus.client.organizations.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] })
      toast.success('Organization deleted')
    },
    onError: () => toast.error('Failed to delete organization'),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!name.trim() || !slug.trim()) { setFormError('All fields are required.'); return }
    if (!/^[a-z0-9-]+$/.test(slug)) { setFormError('Slug must be lowercase, numbers and dashes only.'); return }
    createMutation.mutate()
  }

  const columns: Column<Organization>[] = [
    { key: 'name', header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'slug', header: 'Slug', cell: (r) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.slug}</code> },
    {
      key: 'status', header: 'Status',
      cell: (r) => <Badge variant={r.active ? 'success' : 'secondary'}>{r.active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'createdAt', header: 'Created',
      cell: (r) => <span className="text-sm text-muted-foreground">{r.createdAt ? format(new Date(r.createdAt.replace(/(\.\d{3})\d+/, '$1')), 'MMM d, yyyy') : '—'}</span>,
    },
    {
      key: 'actions', header: '', className: 'w-20',
      cell: (r) => (
        <div className="flex gap-1">
          <Button
            variant="ghost" size="icon"
            aria-label={`Edit ${r.name}`}
            onClick={() => { setEditOrg(r); setEditName(r.name) }}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <ConfirmDialog
            title="Delete organization"
            description={`Delete "${r.name}"? This cannot be undone.`}
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
          <h2 className="text-2xl font-bold tracking-tight">Organizations</h2>
          <p className="text-muted-foreground">Manage platform organizations.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) { setName(''); setSlug(''); setSlugTouched(false); setFormError('') } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" aria-hidden />New Organization</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>Add a new organization to the platform.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-2">
                {formError && <p role="alert" className="text-xs text-destructive">{formError}</p>}
                <div className="space-y-2">
                  <Label htmlFor="org-name">Name</Label>
                  <Input id="org-name" placeholder="Acme Corp" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-slug">Slug <span className="text-xs text-muted-foreground">(auto-generated)</span></Label>
                  <Input id="org-slug" placeholder="acme-corp" required value={slug}
                    onChange={(e) => { setSlugTouched(true); setSlug(e.target.value) }} />
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
      <Dialog open={!!editOrg} onOpenChange={(v) => { if (!v) setEditOrg(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update the organization name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-org-name">Name</Label>
              <Input id="edit-org-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrg(null)}>Cancel</Button>
            <Button
              disabled={updateMutation.isPending || !editName.trim()}
              onClick={() => editOrg && updateMutation.mutate({ id: editOrg.id, name: editName })}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DataTable columns={columns} data={data?.content ?? []} loading={isLoading} page={page} pageSize={PAGE_SIZE} totalElements={data?.totalElements ?? 0} onPageChange={setPage} rowKey={(r) => r.id} />
    </div>
  )
}
