import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabase.from('extra_kosten').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Kon kost niet verwijderen' }, { status: 500 })
  return NextResponse.json({ success: true })
}
