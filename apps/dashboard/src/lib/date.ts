import { format } from 'date-fns'

export function parseTs(ts: string | null | undefined): Date | null {
  if (!ts) return null
  const d = new Date(ts.replace(/(\.\d{3})\d+/, '$1'))
  return isNaN(d.getTime()) ? null : d
}

export function formatTs(ts: string | null | undefined, fmt: string): string {
  const d = parseTs(ts)
  return d ? format(d, fmt) : '—'
}
