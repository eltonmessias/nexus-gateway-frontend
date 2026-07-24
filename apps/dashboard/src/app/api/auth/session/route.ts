import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'nexus-refresh'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  }
}

/** POST /api/auth/session — store refresh token in httpOnly cookie */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const refreshToken: string | undefined = body?.refreshToken
  if (!refreshToken) {
    return NextResponse.json({ error: 'Missing refreshToken' }, { status: 400 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, refreshToken, cookieOptions(60 * 60 * 24 * 30))
  return res
}

/** GET /api/auth/session — exchange httpOnly refresh cookie for new access token */
export async function GET(req: NextRequest) {
  const refreshToken = req.cookies.get(COOKIE_NAME)?.value
  if (!refreshToken) {
    return NextResponse.json({ error: 'No session' }, { status: 401 })
  }

  try {
    const backendRes = await fetch(`${API_URL}/api/iam/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    })

    if (!backendRes.ok) {
      const res = NextResponse.json({ error: 'Session expired' }, { status: 401 })
      res.cookies.set(COOKIE_NAME, '', cookieOptions(0))
      return res
    }

    const data = await backendRes.json()
    const response = NextResponse.json({
      accessToken: data.accessToken as string,
      expiresIn: (data.expiresIn ?? 900) as number,
    })

    // Rotate refresh token if backend issues a new one
    if (data.refreshToken) {
      response.cookies.set(COOKIE_NAME, data.refreshToken as string, cookieOptions(60 * 60 * 24 * 30))
    }

    return response
  } catch {
    return NextResponse.json({ error: 'Failed to reach auth service' }, { status: 503 })
  }
}

/** DELETE /api/auth/session — clear the httpOnly cookie */
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, '', cookieOptions(0))
  return res
}
