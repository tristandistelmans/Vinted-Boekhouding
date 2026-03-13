import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('instellingen').select('*')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mask het wachtwoord in de response
  const masked = (data || []).map((row: { sleutel: string; waarde: string; bijgewerkt_op: string }) =>
    row.sleutel === 'vinted_password'
      ? { ...row, waarde: row.waarde ? '••••••••' : '' }
      : row
  )

  return NextResponse.json({ instellingen: masked })
}

export async function POST(req: NextRequest) {
  const { sleutel, waarde } = await req.json()

  if (!sleutel || waarde === undefined) {
    return NextResponse.json({ error: 'sleutel en waarde zijn verplicht' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { error } = await supabase.from('instellingen').upsert(
    { sleutel, waarde, bijgewerkt_op: new Date().toISOString() },
    { onConflict: 'sleutel' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
