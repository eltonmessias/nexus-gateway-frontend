'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Skeleton } from '@/components/ui/skeleton'
import { routes } from '@/lib/routes'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  // Subscribe to reactive state values, not the function reference (finding #4)
  const status = useAuthStore((s) => s.status)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(routes.auth.login)
    }
  }, [status, router])

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

  if (status === 'unauthenticated') return null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
