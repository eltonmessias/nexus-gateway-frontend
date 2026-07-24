'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuthInit } from '@/hooks/use-auth-init'

function AuthInitializer({ children }: { children: ReactNode }) {
  useAuthInit()
  return <>{children}</>
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              if ((error as { status?: number }).status === 401) return false
              return failureCount < 2
            },
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthInitializer>{children}</AuthInitializer>
        <Toaster position="top-right" richColors />
        {process.env.NODE_ENV === 'development' && (
          <DevtoolsLoader queryClient={queryClient} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  )
}

// Lazy-load devtools so they are tree-shaken in production
function DevtoolsLoader({ queryClient }: { queryClient: QueryClient }) {
  const [Devtools, setDevtools] = useState<React.ComponentType<{ client: QueryClient }> | null>(null)

  useState(() => {
    import('@tanstack/react-query-devtools').then((m) => {
      setDevtools(() => m.ReactQueryDevtools as unknown as React.ComponentType<{ client: QueryClient }>)
    })
  })

  if (!Devtools) return null
  return <Devtools client={queryClient} />
}
