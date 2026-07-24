'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { usePortalStore, canDo } from '@/store/portal'
import { useAuthStore } from '@/store/auth'
import { nexus } from '@/lib/nexus'

export default function SettingsPage() {
  const isAuth         = useAuthStore((s) => s.status === 'authenticated')
  const organizationId = useAuthStore((s) => s.organizationId)
  const { userRole, setOrgName } = usePortalStore()
  const canManage = canDo(userRole, 'ADMIN')
  const isOwner   = userRole === 'OWNER'

  const [name,   setName]   = useState('')
  const [copied, setCopied] = useState(false)

  const { data: org, isLoading } = useQuery({
    queryKey: ['portal-org', organizationId],
    queryFn:  () => nexus.client.organizations.findById(organizationId!),
    enabled:  isAuth && !!organizationId,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (org) setName(org.name)
  }, [org])

  const saveMutation = useMutation({
    mutationFn: () => nexus.client.organizations.update(organizationId!, { name }),
    onSuccess: (updated) => {
      setOrgName(updated.name)
      toast.success('Settings saved')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  function copySlug() {
    if (!org) return
    navigator.clipboard.writeText(org.slug)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your organisation configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic information about your organisation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organisation Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage || isLoading}
              placeholder={isLoading ? 'Loading…' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug</Label>
            <div className="flex gap-2">
              <Input
                id="org-slug"
                value={org?.slug ?? ''}
                readOnly
                className="font-mono bg-muted"
                placeholder={isLoading ? 'Loading…' : ''}
              />
              <Button variant="outline" size="icon" aria-label="Copy slug" onClick={copySlug} disabled={!org}>
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Slug is permanent and cannot be changed.</p>
          </div>
          {org && (
            <div className="space-y-1">
              <Label>Member since</Label>
              <p className="text-sm text-muted-foreground">
                {org.createdAt ? format(new Date(org.createdAt.replace(/(\.\d{3})\d+/, '$1')), 'MMMM d, yyyy') : '—'}
              </p>
            </div>
          )}
        </CardContent>
        {canManage && (
          <CardFooter className="border-t pt-4">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !org || name === org.name}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </CardFooter>
        )}
      </Card>

      <Separator />

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions. These cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
            <div>
              <p className="font-medium text-sm">Delete organisation</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently deletes all projects, flags, jobs and API clients.
              </p>
            </div>
            {isOwner ? (
              <ConfirmDialog
                title="Delete organisation"
                description="This will permanently delete your organisation and all associated data. This action cannot be undone."
                confirmLabel="Delete permanently"
                onConfirm={() => toast.error('Not implemented — contact support.')}
              >
                <Button variant="destructive" size="sm">Delete organisation</Button>
              </ConfirmDialog>
            ) : (
              <Button variant="destructive" size="sm" disabled>Delete organisation</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
