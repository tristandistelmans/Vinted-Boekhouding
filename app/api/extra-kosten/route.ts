import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('extra_kosten')
    .select('*')
    .order('datum', { ascending: false })

  if (error) return NextResponse.json({ error: 'Kon extra kosten niet laden' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { datum, omschrijving, bedrag } = body

  if (!datum || !omschrijving || !bedrag) {
    return NextResponse.json({ error: 'Alle velden zijn verplicht' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('extra_kosten')
    .insert([{ datum, omschrijving, bedrag: Number(bedrag) }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Kon kost niet opslaan' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
