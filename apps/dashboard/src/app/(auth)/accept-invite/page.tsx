'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { nexus } from '@/lib/nexus'
import { useAuthStore } from '@/store/auth'
import { routes } from '@/lib/routes'

function Shell({ children }: { children: React.ReactNode }) {
  return <Card className="w-full max-w-md">{children}</Card>
}

function AcceptInviteInner() {
  const router   = useRouter()
  const params   = useSearchParams()
  const token    = params.get('token') ?? ''
  const setToken = useAuthStore((s) => s.setToken)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const { data: invite, isLoading, isError } = useQuery({
    queryKey: ['invitation', token],
    queryFn:  () => nexus.client.invitations.getByToken(token),
    enabled:  !!token,
    retry:    false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError('')
    try {
      const result = await nexus.client.invitations.accept(token, { password })
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: result.refreshToken }),
      })
      setToken(result.accessToken, result.expiresIn, invite?.email)
      router.push(routes.portal.overview)
    } catch {
      setError('Could not accept the invitation — it may have expired or already been used.')
      setLoading(false)
    }
  }

  if (!token || isError || (!isLoading && !invite)) {
    return (
      <Shell>
        <CardHeader>
          <CardTitle className="text-xl">Invitation not valid</CardTitle>
          <CardDescription>This invitation link is invalid, has expired, or was already used.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline"><Link href={routes.auth.login}>Go to sign in</Link></Button>
        </CardFooter>
      </Shell>
    )
  }

  if (isLoading || !invite) {
    return (
      <Shell>
        <CardHeader>
          <CardTitle className="text-xl">Loading invitation…</CardTitle>
        </CardHeader>
      </Shell>
    )
  }

  return (
    <Shell>
      <CardHeader className="space-y-1">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">N</span>
          </div>
          <span className="text-xl font-bold">Nexus</span>
        </div>
        <CardTitle className="text-2xl">Join {invite.organizationName}</CardTitle>
        <CardDescription>
          You&apos;ve been invited as <span className="font-medium capitalize">{invite.role.toLowerCase()}</span>. Set a
          password to activate <span className="font-medium">{invite.email}</span>.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password" type="password" placeholder="Min. 8 characters" autoComplete="new-password"
              required value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm" type="password" placeholder="Repeat password" autoComplete="new-password"
              required value={confirm} onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Activating…' : 'Set password & join'}
          </Button>
        </CardFooter>
      </form>
    </Shell>
  )
}

export default function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense fallback={<Shell><CardHeader><CardTitle className="text-xl">Loading…</CardTitle></CardHeader></Shell>}>
        <AcceptInviteInner />
      </Suspense>
    </div>
  )
}
