import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { berekenWinst, PRODUCTEN } from '@/lib/constants'

export async function GET() {
  const [{ data: verkopen, error: vError }, { data: inkopen, error: iError }] =
    await Promise.all([
      supabase.from('verkopen').select('*'),
      supabase.from('inkopen').select('*'),
    ])

  if (vError || iError) {
    return NextResponse.json({ error: 'Kon stats niet ophalen' }, { status: 500 })
  }

  const gemKostByProduct = berekenGemKost(inkopen || [])

  const verkopenMetWinst = (verkopen || []).map((v) => {
    const aankoopprijs = gemKostByProduct[v.product] ?? 0
    return {
      ...v,
      aankoopprijs,
      winst: berekenWinst(v.status, v.verkoopprijs, aankoopprijs),
    }
  })

  const now = new Date()
  const ditJaar = now.getFullYear()
  const dezeMaand = now.getMonth()

  const verkopenDitJaar = verkopenMetWinst.filter(
    (v) => new Date(v.verkoopdatum).getFullYear() === ditJaar
  )
  const verkopenDezeMaand = verkopenMetWinst.filter((v) => {
    const d = new Date(v.verkoopdatum)
    return d.getFullYear() === ditJaar && d.getMonth() === dezeMaand
  })

  const sommeerWinst = (arr: typeof verkopenMetWinst) =>
    arr.reduce((sum, v) => sum + (v.winst ?? 0), 0)

  // Voorraad per product
  const inkopenArr = inkopen || []
  const voorraad = PRODUCTEN.map((product) => {
    const ingekocht = inkopenArr
      .filter((i) => i.product === product && i.status === 'In Huis')
      .reduce((s: number, i: { aantal: number }) => s + i.aantal, 0)
    const onderweg = inkopenArr
      .filter((i) => i.product === product && i.status === 'Onderweg')
      .reduce((s: number, i: { aantal: number }) => s + i.aantal, 0)
    const actief = verkopenMetWinst.filter(
      (v) =>
        v.product === product &&
        (v.status === 'Verkocht - Nog niet verzonden' || v.status === 'Onderweg')
    ).length
    return {
      product,
      in_huis: Math.max(0, ingekocht - actief),
      onderweg,
    }
  })

  // Winst per maand (dit jaar)
  const maandnamen = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
  const winstPerMaand = maandnamen.map((naam, i) => {
    const verkopen = verkopenDitJaar.filter((v) => new Date(v.verkoopdatum).getMonth() === i)
    return { naam, winst: sommeerWinst(verkopen) }
  })

  // Winst per product (dit jaar)
  const winstPerProduct = PRODUCTEN.map((product) => {
    const verkopen = verkopenDitJaar.filter((v) => v.product === product)
    return { product, winst: sommeerWinst(verkopen), aantal: verkopen.length }
  }).sort((a, b) => b.winst - a.winst)

  return NextResponse.json({
    winstDitJaar: sommeerWinst(verkopenDitJaar),
    winstDezeMaand: sommeerWinst(verkopenDezeMaand),
    aantalDezeMaand: verkopenDezeMaand.length,
    aantalDitJaar: verkopenDitJaar.length,
    voorraad,
    winstPerMaand,
    winstPerProduct,
  })
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
