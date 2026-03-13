import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const currentUser = request.cookies.get('user')?.value || 'tristan'
  const isJasmijn = currentUser === 'jasmijn'

  // Jasmijn mag alleen haar eigen verkopen aanpassen
  if (isJasmijn) {
    const { data: existing } = await supabase
      .from('verkopen')
      .select('account')
      .eq('id', id)
      .single()
    if (!existing || existing.account !== '3-jasmijn') {
      return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
    }
  }

  const body = await request.json()
  const updateData: Record<string, unknown> = {}
  if (body.status !== undefined) updateData.status = body.status
  if (body.verkoopprijs !== undefined) updateData.verkoopprijs = Number(body.verkoopprijs)
  if (body.naam_koper !== undefined) updateData.naam_koper = body.naam_koper
  if (body.verkoopdatum !== undefined) updateData.verkoopdatum = body.verkoopdatum
  if (body.notitie !== undefined) updateData.notitie = body.notitie || null
  if (body.uitbetaald !== undefined && !isJasmijn) updateData.uitbetaald = Boolean(body.uitbetaald)

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const currentUser = request.cookies.get('user')?.value || 'tristan'
  const isJasmijn = currentUser === 'jasmijn'

  if (isJasmijn) {
    const { data: existing } = await supabase
      .from('verkopen')
      .select('account')
      .eq('id', id)
      .single()
    if (!existing || existing.account !== '3-jasmijn') {
      return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
    }
  }

  const { error } = await supabase.from('verkopen').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Kon verkoop niet verwijderen' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
