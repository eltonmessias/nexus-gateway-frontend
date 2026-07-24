'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Search, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Project } from '@nexus/types'
import { cn } from '@/lib/utils'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'

interface ProjectSelectProps {
  value: string
  onChange: (id: string) => void
  organizationId?: string
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
}

export function ProjectSelect({ value, onChange, organizationId, placeholder = 'Select project…', disabled, allowClear }: ProjectSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const isAuth = useAuthStore((s) => s.status === 'authenticated')

  const { data, isLoading } = useQuery({
    queryKey: ['projects-all', organizationId],
    queryFn: () => nexus.client.projects.list({ page: 0, size: 100 }, organizationId),
    enabled: isAuth,
    staleTime: 30_000,
  })

  const projects = data?.content ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p: Project) => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q))
  }, [projects, search])

  const selected = projects.find((p: Project) => p.id === value)

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
          {allowClear && selected ? (
            <X
              className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
              aria-hidden
              onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false) }}
            />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
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

        <div className="max-h-56 overflow-y-auto py-1" role="listbox">
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {search ? 'No results.' : 'No projects found.'}
            </p>
          )}

          {filtered.map((proj: Project) => (
            <button
              key={proj.id}
              type="button"
              role="option"
              aria-selected={proj.id === value}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left',
                proj.id === value && 'bg-accent/50',
              )}
              onClick={() => { onChange(proj.id); setOpen(false); setSearch('') }}
            >
              <Check className={cn('h-4 w-4 shrink-0', proj.id === value ? 'opacity-100' : 'opacity-0')} aria-hidden />
              <div className="min-w-0">
                <p className="truncate font-medium">{proj.name}</p>
                <p className="truncate text-xs text-muted-foreground">{proj.key}</p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
