'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { usePortalStore, canDo } from '@/store/portal'
import { nexus, resetNexusClient } from '@/lib/nexus'
import { routes } from '@/lib/routes'
import { portalNav, isNavItemActive, type NavItem } from '@/lib/nav'
import { toast } from 'sonner'

const ROLE_STYLE: Record<string, string> = {
  OWNER:     'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-transparent',
  ADMIN:     'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent',
  DEVELOPER: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent',
  VIEWER:    'bg-secondary text-secondary-foreground border-transparent',
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const isActive = isNavItemActive(pathname, item)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {item.label}
      {isActive && <ChevronRight className="ml-auto h-3 w-3" aria-hidden />}
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/40">
      {children}
    </p>
  )
}

export function PortalSidebar() {
  const router   = useRouter()
  const clearToken = useAuthStore((s) => s.clearToken)
  const userEmail  = useAuthStore((s) => s.userEmail)
  const { orgName, userRole } = usePortalStore()

  const orgInitial = orgName?.[0]?.toUpperCase() ?? 'O'

  async function handleLogout() {
    try { await nexus.client.auth.logout() } catch {}
    try { await fetch('/api/auth/session', { method: 'DELETE' }) } catch {}
    clearToken()
    resetNexusClient()
    toast.success('Signed out')
    router.push(routes.auth.login)
  }

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary shrink-0">
          <span className="text-xs font-bold text-sidebar-primary-foreground">N</span>
        </div>
        <span className="font-semibold text-sidebar-foreground">Nexus</span>
      </div>

      {/* Org identity block */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent font-semibold text-sidebar-accent-foreground text-sm">
          {orgInitial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{orgName}</p>
          <Badge className={cn('text-[10px] px-1.5 py-0 mt-0.5', ROLE_STYLE[userRole])}>
            {userRole}
          </Badge>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Portal navigation">
        {portalNav.map((group, i) => (
          <div key={group.label ?? `group-${i}`}>
            {group.label && (
              <>
                <Separator className="my-3 bg-sidebar-border" />
                <SectionLabel>{group.label}</SectionLabel>
              </>
            )}
            {group.items.map((item) => <NavLink key={item.href} item={item} />)}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        {userEmail && (
          <p className="px-3 py-1 text-xs text-sidebar-foreground/50 truncate">{userEmail}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
