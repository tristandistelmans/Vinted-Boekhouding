import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const updateData: Record<string, unknown> = {}
  if (body.besteldatum !== undefined) updateData.besteldatum = body.besteldatum
  if (body.product !== undefined) updateData.product = body.product
  if (body.aantal !== undefined) updateData.aantal = Number(body.aantal)
  if (body.status !== undefined) updateData.status = body.status
  if (body.totale_aankoopprijs !== undefined) {
    const totaal = Number(body.totale_aankoopprijs)
    const aantal = Number(body.aantal ?? 1)
    updateData.totale_aankoopprijs = totaal
    updateData.prijs_per_stuk = aantal > 0 ? totaal / aantal : 0
  }

  const { data, error } = await supabase
    .from('inkopen')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Kon inkoop niet bijwerken' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabase.from('inkopen').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Kon inkoop niet verwijderen' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
