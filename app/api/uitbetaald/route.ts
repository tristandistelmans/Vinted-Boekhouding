import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const currentUser = request.cookies.get('user')?.value
  if (currentUser !== 'jasmijn') {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const { error } = await supabase
    .from('verkopen')
    .update({ uitbetaald: true })
    .eq('account', '3-jasmijn')
    .eq('status', 'Afgerond (geld binnen)')
    .neq('uitbetaald', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
