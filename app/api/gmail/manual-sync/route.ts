// Wrapper rond /api/gmail/sync zodat de UI handmatige sync kan triggeren
// zonder CRON_SECRET in de browser te tonen. De middleware-cookie auth beschermt deze route.

import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET niet ingesteld in env' }, { status: 500 })
  }

  const origin = new URL(req.url).origin
  const res = await fetch(`${origin}/api/gmail/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cronSecret}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
