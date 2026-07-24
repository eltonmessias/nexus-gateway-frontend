'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ToggleLeft, KeyRound, Plus } from 'lucide-react'
import type { Flag, ApiClient } from '@nexus/types'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'
import { ENVIRONMENTS, envDotClass } from '@/store/portal'
import { routes } from '@/lib/routes'

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const isAuth = useAuthStore((s) => s.status === 'authenticated')

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn:  () => nexus.client.projects.findById(id),
    enabled:  isAuth,
    staleTime: 30_000,
  })

  const { data: flagsData, isLoading: flagsLoading } = useQuery({
    queryKey: ['flags-by-project', id],
    queryFn:  () => nexus.client.flags.list({ page: 0, size: 500 }, undefined, id),
    enabled:  isAuth && !!project,
    staleTime: 30_000,
  })

  const { data: orgClients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-by-org', project?.organizationId],
    queryFn:  () => nexus.client.apiClients.findByOrganization(project!.organizationId),
    enabled:  isAuth && !!project?.organizationId,
    staleTime: 30_000,
  })

  const projectFlags  = flagsData?.content ?? []
  const totalFlags    = projectFlags.length
  const activeFlags   = projectFlags.filter((f: Flag) => f.enabled).length
  const projectClients = (orgClients ?? []).filter((c: ApiClient) => c.projectId === id)
  const totalClients   = projectClients.length

  const isLoading = projectLoading || flagsLoading || clientsLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium">Project not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={routes.portal.projects}>Back to projects</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href={routes.portal.projects} aria-label="Back to projects">
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
            <code className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">{project.key}</code>
            <Badge variant={project.active ? 'success' : 'secondary'}>
              {project.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">Environments and connection status</p>
        </div>
      </div>

      {/* Project stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ToggleLeft className="h-4 w-4" aria-hidden />
              Feature Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalFlags}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeFlags} active · {totalFlags - activeFlags} disabled</p>
            {totalFlags > 0 && (
              <div className="mt-3 space-y-1">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.round((activeFlags / totalFlags) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((activeFlags / totalFlags) * 100)}% enabled
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <KeyRound className="h-4 w-4" aria-hidden />
              API Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground mt-1">project credentials</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Environments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            {ENVIRONMENTS.map((env) => (
              <div key={env.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', envDotClass(env))} />
                  <span className="text-sm">{env.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Operational</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href={routes.portal.flags}>
            <ToggleLeft className="mr-2 h-4 w-4" aria-hidden />
            Manage Flags
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={routes.portal.apiClients}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            New API Client
          </Link>
        </Button>
      </div>
    </div>
  )
}
