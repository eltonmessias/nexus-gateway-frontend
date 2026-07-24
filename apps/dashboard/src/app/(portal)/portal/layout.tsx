'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { usePortalStore } from '@/store/portal'
import type { MemberRole } from '@/store/portal'
import { PortalSidebar } from '@/components/portal/sidebar'
import { PortalHeader } from '@/components/portal/header'
import { Skeleton } from '@/components/ui/skeleton'
import { nexus } from '@/lib/nexus'
import { routes } from '@/lib/routes'

// Maps the platform User.role carried in the JWT to the portal's member-role
// model. This is the same authority the backend enforces on member/team
// management, so the UI gate always matches server-side authorisation.
// Platform ADMIN is intentionally absent — a platform admin has no single-org
// context and is redirected to the dashboard instead of entering the portal.
const USER_ROLE_MAP: Record<string, MemberRole> = {
  ORG_OWNER:   'OWNER',
  TEAM_ADMIN:  'ADMIN',
  TEAM_MEMBER: 'DEVELOPER',
  VIEWER:      'VIEWER',
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router         = useRouter()
  const status         = useAuthStore((s) => s.status)
  const organizationId = useAuthStore((s) => s.organizationId)
  const userEmail      = useAuthStore((s) => s.userEmail)
  const userRole       = useAuthStore((s) => s.userRole)
  const { setOrgName, setUserRole } = usePortalStore()

  // The org portal is per-company. A platform admin (no org) belongs in the
  // admin console; a signed-in user without any organisation cannot use it.
  const isPlatformAdmin = userRole === 'ADMIN'
  const hasNoOrg        = status === 'authenticated' && !isPlatformAdmin && !organizationId

  useEffect(() => {
    if (status !== 'authenticated' || isPlatformAdmin || !organizationId) return

    // Authorisation role comes from the JWT — no network round-trip, and it
    // works even for an owner who has no org_members row of their own.
    setUserRole(userRole ? (USER_ROLE_MAP[userRole] ?? 'VIEWER') : 'VIEWER')

    nexus.client.organizations.findById(organizationId)
      .then((org) => setOrgName(org.name))
      .catch(() => {
        // fallback: derive from email domain
        if (userEmail) {
          const domain = userEmail.split('@')[1]?.split('.')[0] ?? 'My Org'
          setOrgName(domain.charAt(0).toUpperCase() + domain.slice(1))
        }
      })
  }, [status, organizationId, userEmail, userRole, isPlatformAdmin, setOrgName, setUserRole])

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace(routes.auth.login); return }
    if (status === 'authenticated' && isPlatformAdmin) router.replace(routes.dashboard.overview)
  }, [status, isPlatformAdmin, router])

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || isPlatformAdmin) return null

  if (hasNoOrg) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-center p-8">
        <p className="text-lg font-semibold">No organisation assigned</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your account isn&apos;t linked to an organisation yet. Ask an administrator to add you to one.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <PortalSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
