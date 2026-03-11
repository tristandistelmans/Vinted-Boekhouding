import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const updateData: Record<string, unknown> = {}
  if (body.status !== undefined) updateData.status = body.status
  if (body.verkoopprijs !== undefined) updateData.verkoopprijs = Number(body.verkoopprijs)
  if (body.naam_koper !== undefined) updateData.naam_koper = body.naam_koper
  if (body.verkoopdatum !== undefined) updateData.verkoopdatum = body.verkoopdatum

  const { data, error } = await supabase
    .from('verkopen')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Kon verkoop niet bijwerken' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { error } = await supabase.from('verkopen').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Kon verkoop niet verwijderen' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
