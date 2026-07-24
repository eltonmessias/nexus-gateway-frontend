'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Organization } from '@nexus/types'
import { cn } from '@/lib/utils'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'

interface OrgSelectProps {
  value: string
  onChange: (id: string) => void
  placeholder?: string
  disabled?: boolean
}

export function OrgSelect({ value, onChange, placeholder = 'Select organisation…', disabled }: OrgSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const isAuth = useAuthStore((s) => s.status === 'authenticated')

  const { data, isLoading } = useQuery({
    queryKey: ['organizations-all'],
    queryFn: () => nexus.client.organizations.list({ page: 0, size: 100 }),
    enabled: isAuth,
    staleTime: 30_000,
  })

  const orgs = data?.content ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orgs
    return orgs.filter((o: Organization) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q))
  }, [orgs, search])

  const selected = orgs.find((o: Organization) => o.id === value)

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch('') }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        {/* Search */}
        <div className="flex items-center border-b px-3 py-2 gap-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <Input
            className="h-7 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* List */}
        <div className="max-h-56 overflow-y-auto py-1" role="listbox">
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {search ? 'No results.' : 'No organisations found.'}
            </p>
          )}

          {filtered.map((org: Organization) => (
            <button
              key={org.id}
              type="button"
              role="option"
              aria-selected={org.id === value}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left',
                org.id === value && 'bg-accent/50',
              )}
              onClick={() => { onChange(org.id); setOpen(false); setSearch('') }}
            >
              <Check className={cn('h-4 w-4 shrink-0', org.id === value ? 'opacity-100' : 'opacity-0')} aria-hidden />
              <div className="min-w-0">
                <p className="truncate font-medium">{org.name}</p>
                <p className="truncate text-xs text-muted-foreground">{org.slug}</p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
