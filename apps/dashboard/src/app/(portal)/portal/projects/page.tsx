'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Plus, Trash2, FolderKanban, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Project } from '@nexus/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'
import { usePortalStore, ENVIRONMENTS, envDotClass, canDo } from '@/store/portal'
import { routes } from '@/lib/routes'

const createSchema = z.object({
  name: z.string().min(2, 'Name required'),
  key:  z.string().min(2, 'Key required').regex(/^[A-Z0-9_]+$/, 'Uppercase, numbers and underscores only'),
  description: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

export default function PortalProjectsPage() {
  const [page, setPage]   = useState(0)
  const [open, setOpen]   = useState(false)
  const qc                = useQueryClient()
  const isAuth            = useAuthStore((s) => s.status === 'authenticated')
  const organizationId    = useAuthStore((s) => s.organizationId)
  const { userRole }      = usePortalStore()
  const canCreate         = canDo(userRole, 'ADMIN')

  const { data, isLoading } = useQuery({
    queryKey: ['projects', organizationId, page, 20],
    queryFn:  () => nexus.client.projects.list({ page, size: 20 }, organizationId ?? undefined),
    enabled:  isAuth && !!organizationId,
    staleTime: 15_000,
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateForm) => nexus.client.projects.create({
      ...body,
      organizationId: organizationId!,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setOpen(false)
      toast.success('Project created')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nexus.client.projects.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project deleted')
    },
    onError: (err) => toast.error((err as { message?: string }).message ?? 'Failed'),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const projects: Project[] = data?.content ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" aria-hidden />New Project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
                <DialogDescription>Projects namespace your flags and jobs across environments.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit((d) => createMutation.mutate(d))}>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="proj-name">Name</Label>
                    <Input id="proj-name" placeholder="Mobile App" {...register('name')} />
                    {errors.name && <p className="text-xs text-destructive" role="alert">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proj-key">Key</Label>
                    <Input id="proj-key" placeholder="MOBILE_APP" {...register('key')} />
                    {errors.key && <p className="text-xs text-destructive" role="alert">{errors.key.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proj-desc">Description (optional)</Label>
                    <Input id="proj-desc" placeholder="Describe this project…" {...register('description')} />
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

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FolderKanban className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No projects yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first project to start managing flags.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardContent className="pt-5 flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold">{project.name}</p>
                    <code className="text-xs text-muted-foreground">{project.key}</code>
                  </div>
                  <Badge variant={project.active ? 'success' : 'secondary'} className="shrink-0">
                    {project.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {/* Environments */}
                <div className="space-y-1.5">
                  {ENVIRONMENTS.map((env) => (
                    <div key={env.key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', envDotClass(env))} />
                        <span className="text-muted-foreground">{env.name}</span>
                      </div>
                      <span className="text-muted-foreground">—</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-3 pb-3 flex items-center justify-between">
                <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground px-2">
                  <Link href={routes.portal.projectDetail(project.id)}>
                    View details <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </Button>
                {canCreate && (
                  <ConfirmDialog
                    title="Delete project"
                    description={`Delete "${project.name}"? All flags and data in this project will be removed permanently.`}
                    onConfirm={() => deleteMutation.mutate(project.id)}
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" aria-label={`Delete ${project.name}`}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </ConfirmDialog>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {data.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages - 1}>Next</Button>
        </div>
      )}
    </div>
  )
}
