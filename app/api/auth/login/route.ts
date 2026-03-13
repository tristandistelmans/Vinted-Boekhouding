import { NextRequest, NextResponse } from 'next/server'

const USERS = [
  {
    username: process.env.AUTH_USERNAME,
    password: process.env.AUTH_PASSWORD,
    token: process.env.AUTH_TOKEN,
    user: 'tristan',
  },
  {
    username: process.env.AUTH_USERNAME_JASMIJN,
    password: process.env.AUTH_PASSWORD_JASMIJN,
    token: process.env.AUTH_TOKEN_JASMIJN,
    user: 'jasmijn',
  },
]

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const match = USERS.find(
    (u) => u.username && u.password && username === u.username && password === u.password
  )

  if (!match) {
    return NextResponse.json({ error: 'Ongeldige gegevens' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30, // 30 dagen
    path: '/',
  }

  response.cookies.set('auth_token', match.token!, cookieOptions)
  response.cookies.set('user', match.user, cookieOptions)

  return response
}
