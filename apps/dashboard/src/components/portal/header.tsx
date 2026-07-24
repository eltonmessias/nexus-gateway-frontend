'use client'

import { usePathname } from 'next/navigation'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { usePortalStore, ENVIRONMENTS, envDotClass } from '@/store/portal'
import { portalNav, titleForPath } from '@/lib/nav'

export function PortalHeader() {
  const pathname   = usePathname()
  const title      = titleForPath(pathname, portalNav, 'Portal')
  const userEmail  = useAuthStore((s) => s.userEmail)
  const { activeEnv, setActiveEnv } = usePortalStore()
  const initials   = userEmail ? userEmail[0]!.toUpperCase() : '?'

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6 gap-4">
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Environment selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-8 text-xs font-medium">
              <span className={cn('h-2 w-2 rounded-full shrink-0', envDotClass(activeEnv))} />
              {activeEnv.name}
              <ChevronDown className="h-3 w-3 opacity-50" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {ENVIRONMENTS.map((env) => (
              <DropdownMenuItem
                key={env.key}
                onClick={() => setActiveEnv(env)}
                className="flex items-center gap-2 text-sm"
              >
                <span className={cn('h-2 w-2 rounded-full shrink-0', envDotClass(env))} />
                {env.name}
                {env.key === activeEnv.key && (
                  <Check className="ml-auto h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User avatar */}
        <Avatar className="h-8 w-8" aria-label={userEmail ?? 'User'}>
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
