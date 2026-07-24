'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, ChevronRight, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/store/auth'
import { nexus, resetNexusClient } from '@/lib/nexus'
import { routes } from '@/lib/routes'
import { dashboardNav, isNavItemActive, type NavItem } from '@/lib/nav'
import { toast } from 'sonner'

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
          : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {item.label}
      {isActive && <ChevronRight className="ml-auto h-3 w-3 opacity-60" aria-hidden />}
    </Link>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35">
      {label}
    </p>
  )
}

export function Sidebar() {
  const router     = useRouter()
  const clearToken = useAuthStore((s) => s.clearToken)
  const email      = useAuthStore((s) => s.userEmail)
  const role       = useAuthStore((s) => s.userRole)

  async function handleLogout() {
    try { await nexus.client.auth.logout() } catch {}
    try { await fetch('/api/auth/session', { method: 'DELETE' }) } catch {}
    clearToken()
    resetNexusClient()
    toast.success('Signed out')
    router.push(routes.auth.login)
  }

  return (
    <aside className="flex h-full w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary">
          <span className="text-xs font-bold text-sidebar-primary-foreground">N</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-sidebar-foreground leading-none">Nexus Gateway</p>
          <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">Admin Console</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" aria-label="Admin navigation">
        {dashboardNav.map((group, i) => (
          <div key={group.label ?? `group-${i}`}>
            {group.label && (
              <>
                <Separator className="my-2 bg-sidebar-border" />
                <SectionLabel label={group.label} />
              </>
            )}
            {group.items.map((item) => <NavLink key={item.href} item={item} />)}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-accent shrink-0">
            <Shield className="h-3.5 w-3.5 text-sidebar-accent-foreground" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{email ?? 'Admin'}</p>
            <p className="text-[10px] text-sidebar-foreground/40">{role ?? 'ADMIN'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
