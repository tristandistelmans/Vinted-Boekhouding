import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('inkopen')
    .select('*')
    .order('besteldatum', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Kon inkopen niet ophalen' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { besteldatum, product, aantal, status, totale_aankoopprijs } = body

  if (!besteldatum || !product || !aantal || !status) {
    return NextResponse.json({ error: 'Alle velden zijn verplicht' }, { status: 400 })
  }

  const aantalNum = Number(aantal)
  const totaalNum = Number(totale_aankoopprijs) || 0
  const prijsPerStuk = aantalNum > 0 ? totaalNum / aantalNum : 0

  const { data, error } = await supabase
    .from('inkopen')
    .insert([{
      besteldatum,
      product,
      aantal: aantalNum,
      status,
      totale_aankoopprijs: totaalNum,
      prijs_per_stuk: prijsPerStuk,
    }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Kon inkoop niet opslaan' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
