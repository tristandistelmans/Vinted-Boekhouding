import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const user = request.cookies.get('user')?.value || 'tristan'
  const isCEO = user !== 'jasmijn'
  const account = user === 'jasmijn' ? '3-jasmijn' : null

  return NextResponse.json({ user, isCEO, account })
}
