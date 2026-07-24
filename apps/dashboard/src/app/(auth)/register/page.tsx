'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'
import { usePortalStore } from '@/store/portal'
import { routes } from '@/lib/routes'

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function RegisterPage() {
  const router      = useRouter()
  const setToken    = useAuthStore((s) => s.setToken)
  const setOrgName  = usePortalStore((s) => s.setOrgName)

  const [form, setForm] = useState({
    organizationName: '',
    organizationSlug: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    confirmPassword: '',
  })
  const [slugTouched, setSlugTouched] = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // Auto-generate slug from org name unless user has manually edited it
  useEffect(() => {
    if (!slugTouched) {
      setForm((prev) => ({ ...prev, organizationSlug: toSlug(prev.organizationName) }))
    }
  }, [form.organizationName, slugTouched])

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      if (field === 'organizationSlug') setSlugTouched(true)
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.ownerPassword !== form.confirmPassword) {
      setError("Passwords don't match.")
      return
    }
    if (form.ownerPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!/^[a-z0-9-]+$/.test(form.organizationSlug)) {
      setError('Slug must contain only lowercase letters, numbers and dashes.')
      return
    }

    setLoading(true)
    try {
      const result = await nexus.client.auth.register({
        organizationName: form.organizationName,
        organizationSlug: form.organizationSlug,
        ownerName:        form.ownerName,
        ownerEmail:       form.ownerEmail,
        ownerPassword:    form.ownerPassword,
      })
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: result.refreshToken }),
      })
      setToken(result.accessToken, result.expiresIn, form.ownerEmail)
      setOrgName(form.organizationName)
      router.push(routes.portal.overview)
    } catch {
      setError('Registration failed. The email or slug may already be in use.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">N</span>
            </div>
            <span className="text-xl font-bold">Nexus</span>
          </div>
          <CardTitle className="text-2xl">Create your workspace</CardTitle>
          <CardDescription>Set up your organisation and owner account</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="orgName">Organisation Name</Label>
              <Input id="orgName" placeholder="Acme Corp" required value={form.organizationName} onChange={set('organizationName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgSlug">
                Slug
                <span className="ml-1 text-xs text-muted-foreground">(auto-generated)</span>
              </Label>
              <div className="flex items-center rounded-md border bg-muted/40 px-3 focus-within:ring-2 focus-within:ring-ring">
                <span className="text-sm text-muted-foreground shrink-0">nexus.io/</span>
                <input
                  id="orgSlug"
                  className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="acme-corp"
                  required
                  value={form.organizationSlug}
                  onChange={set('organizationSlug')}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="ownerName">Your Name</Label>
              <Input id="ownerName" placeholder="Jane Smith" required value={form.ownerName} onChange={set('ownerName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Email</Label>
              <Input id="ownerEmail" type="email" placeholder="you@example.com" autoComplete="email" required value={form.ownerEmail} onChange={set('ownerEmail')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerPassword">Password</Label>
              <Input id="ownerPassword" type="password" placeholder="min. 8 characters" autoComplete="new-password" required value={form.ownerPassword} onChange={set('ownerPassword')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" autoComplete="new-password" required value={form.confirmPassword} onChange={set('confirmPassword')} />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating workspace…' : 'Create workspace'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href={routes.auth.login} className="text-primary hover:underline">Sign in</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
