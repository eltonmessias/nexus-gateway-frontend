'use client'

import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/auth'
import { dashboardNav, titleForPath } from '@/lib/nav'

export function Header() {
  const pathname = usePathname()
  const title = titleForPath(pathname, dashboardNav, 'Dashboard')
  const userEmail = useAuthStore((s) => s.userEmail)
  const initials = userEmail ? userEmail[0]!.toUpperCase() : '?'

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <Avatar className="h-8 w-8" aria-label={userEmail ?? 'User'}>
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
      </Avatar>
    </header>
  )
}
