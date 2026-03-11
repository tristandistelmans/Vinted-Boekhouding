import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { berekenWinst } from '@/lib/constants'

export async function GET() {
  const [{ data: verkopen, error: verkoopError }, { data: inkopen, error: inkoopError }] =
    await Promise.all([
      supabase.from('verkopen').select('*').order('verkoopdatum', { ascending: false }),
      supabase.from('inkopen').select('*'),
    ])

  if (verkoopError || inkoopError) {
    return NextResponse.json({ error: 'Kon data niet ophalen' }, { status: 500 })
  }

  const gemKostByProduct = berekenGemKost(inkopen || [])

  const verkopenMetWinst = (verkopen || []).map((v) => {
    const aankoopprijs = gemKostByProduct[v.product] ?? 0
    const winst = berekenWinst(v.status, v.verkoopprijs, aankoopprijs)
    return { ...v, aankoopprijs, winst }
  })

  return NextResponse.json(verkopenMetWinst)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { verkoopdatum, product, naam_koper, verkoopprijs, status, account } = body

  if (!verkoopdatum || !product || !naam_koper || !verkoopprijs || !status || !account) {
    return NextResponse.json({ error: 'Alle velden zijn verplicht' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('verkopen')
    .insert([{ verkoopdatum, product, naam_koper, verkoopprijs: Number(verkoopprijs), status, account }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Kon verkoop niet opslaan' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

function berekenGemKost(inkopen: { product: string; totale_aankoopprijs: number; aantal: number }[]) {
  const byProduct: Record<string, { totalCost: number; totalAantal: number }> = {}
  inkopen.forEach((i) => {
    if (i.totale_aankoopprijs > 0 && i.aantal > 0) {
      if (!byProduct[i.product]) byProduct[i.product] = { totalCost: 0, totalAantal: 0 }
      byProduct[i.product].totalCost += i.totale_aankoopprijs
      byProduct[i.product].totalAantal += i.aantal
    }
  })
  const result: Record<string, number> = {}
  Object.entries(byProduct).forEach(([product, { totalCost, totalAantal }]) => {
    result[product] = totalAantal > 0 ? totalCost / totalAantal : 0
  })
  return result
}
