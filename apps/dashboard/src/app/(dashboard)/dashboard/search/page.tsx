'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import Link from 'next/link'
import type { SearchDocument } from '@nexus/types'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'
import { useDebounce } from '@/hooks/use-debounce'
import { routes } from '@/lib/routes'
import type { Route } from 'next'

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <span>{text}</span>
  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'i'))
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 !== 0 ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}

const entityColors: Record<string, string> = {
  ORGANIZATION: 'bg-blue-500/10 text-blue-600',
  USER: 'bg-purple-500/10 text-purple-600',
  PROJECT: 'bg-green-500/10 text-green-600',
  TEAM: 'bg-orange-500/10 text-orange-600',
  FLAG: 'bg-pink-500/10 text-pink-600',
}

function entityHref(doc: SearchDocument): Route | null {
  switch (doc.entityType) {
    case 'ORGANIZATION': return routes.dashboard.organizations
    case 'USER':         return routes.dashboard.users
    case 'PROJECT':      return routes.dashboard.projects
    case 'TEAM':         return routes.dashboard.teams
    case 'FLAG':         return routes.dashboard.flags
    default:             return null
  }
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 400)
  const isAuth = useAuthStore((s) => s.status === 'authenticated')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => nexus.client.search.query({ query: debouncedQuery, page: 0, size: 20 }),
    enabled: isAuth && debouncedQuery.length >= 2,
    staleTime: 10_000,
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Search</h2>
        <p className="text-muted-foreground">Full-text search across all entities.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
        <Input
          className="pl-10"
          placeholder="Search organizations, users, projects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          aria-label="Search"
        />
        {isFetching && debouncedQuery.length >= 2 && (
          <div
            role="status"
            aria-label="Searching…"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
          />
        )}
      </div>

      {isLoading && debouncedQuery.length >= 2 && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {data && data.results.length === 0 && (
        <p className="text-muted-foreground text-sm">No results for &quot;{debouncedQuery}&quot;.</p>
      )}

      {data && data.results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {data.totalElements} result{data.totalElements !== 1 ? 's' : ''} for &quot;{debouncedQuery}&quot;
          </p>
          {data.results.map((doc: SearchDocument) => {
            const href = entityHref(doc)
            const inner = (
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardContent className="py-3 px-4 flex items-start justify-between gap-4">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      <HighlightedText text={doc.title} highlight={debouncedQuery} />
                    </p>
                    {doc.excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        <HighlightedText text={doc.excerpt} highlight={debouncedQuery} />
                      </p>
                    )}
                  </div>
                  <Badge className={`shrink-0 text-xs ${entityColors[doc.entityType] ?? ''}`} variant="outline">
                    {doc.entityType.toLowerCase()}
                  </Badge>
                </CardContent>
              </Card>
            )
            return href
              ? <Link key={doc.id} href={href} className="block">{inner}</Link>
              : <div key={doc.id}>{inner}</div>
          })}
        </div>
      )}

      {!query && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden />
          <p className="text-muted-foreground text-sm">Type at least 2 characters to search</p>
        </div>
      )}
    </div>
  )
}
