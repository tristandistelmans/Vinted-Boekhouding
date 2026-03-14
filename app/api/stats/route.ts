import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { berekenWinst, berekenCommissie, PRODUCTEN, ACTIEVE_STATUSSEN, DEFAULT_COMMISSIE_REGELS, CommissieRegels } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
  const currentUser = request.cookies.get('user')?.value || 'tristan'
  const isJasmijn = currentUser === 'jasmijn'

  const [
    { data: alleVerkopen, error: vError },
    { data: inkopen, error: iError },
    { data: extraKostenData },
    { data: instellingenData },
  ] = await Promise.all([
    supabase.from('verkopen').select('*'),
    supabase.from('inkopen').select('*'),
    supabase.from('extra_kosten').select('*'),
    supabase.from('instellingen').select('sleutel, waarde').eq('sleutel', 'commissie_regels'),
  ])

  // Commissie regels ophalen (of default gebruiken)
  let commissieRegels: CommissieRegels = DEFAULT_COMMISSIE_REGELS
  try {
    const regelRow = (instellingenData || []).find((r: { sleutel: string }) => r.sleutel === 'commissie_regels')
    if (regelRow?.waarde) {
      commissieRegels = { ...DEFAULT_COMMISSIE_REGELS, ...JSON.parse(regelRow.waarde) }
    }
  } catch { /* gebruik default */ }

  const comm = (prijs: number) => berekenCommissie(prijs, commissieRegels)

  if (vError || iError) {
    return NextResponse.json({ error: 'Kon stats niet ophalen' }, { status: 500 })
  }

  // Jasmijn ziet alleen haar eigen verkopen; Tristan ziet alles
  const verkopen = isJasmijn
    ? (alleVerkopen || []).filter((v) => v.account === '3-jasmijn')
    : (alleVerkopen || [])

  const gemKostByProduct = berekenGemKost(inkopen || [])

  const verkopenMetWinst = verkopen.map((v) => {
    const aankoopprijs = gemKostByProduct[v.product] ?? 0
    const basisWinst = berekenWinst(v.status, v.verkoopprijs, aankoopprijs)
    // Voor CEO: Jasmijn's commissie gaat van Tristans winst af
    const winst =
      !isJasmijn && v.account === '3-jasmijn' && basisWinst !== null && ACTIEVE_STATUSSEN.includes(v.status)
        ? basisWinst - comm(v.verkoopprijs)
        : basisWinst
    return { ...v, aankoopprijs, winst }
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

  // Voorraad per product — altijd globaal (gedeeld)
  const inkopenArr = inkopen || []
  const alleVerkopenArr = alleVerkopen || []
  const voorraad = PRODUCTEN.map((product) => {
    const beginsaldoEntries = inkopenArr
      .filter((i) => i.product === product && i.status === 'Beginsaldo')
      .sort((a: { besteldatum: string }, b: { besteldatum: string }) =>
        b.besteldatum.localeCompare(a.besteldatum)
      )
    const beginsaldo = beginsaldoEntries[0] as { aantal: number; besteldatum: string } | undefined

    if (beginsaldo) {
      const snapDatum = beginsaldo.besteldatum
      const nieuweInkopen = inkopenArr
        .filter((i) => i.product === product && i.status === 'In Huis' && i.besteldatum > snapDatum)
        .reduce((s: number, i: { aantal: number }) => s + i.aantal, 0)
      const onderweg = inkopenArr
        .filter((i) => i.product === product && i.status === 'Onderweg' && i.besteldatum > snapDatum)
        .reduce((s: number, i: { aantal: number }) => s + i.aantal, 0)
      const nieuweVerkopen = alleVerkopenArr.filter(
        (v) => v.product === product && v.status !== 'Retour ontvangen' && v.verkoopdatum > snapDatum
      ).length
      return {
        product,
        in_huis: Math.max(0, beginsaldo.aantal + nieuweInkopen - nieuweVerkopen),
        onderweg,
      }
    }

    const ingekocht = inkopenArr
      .filter((i) => i.product === product && i.status === 'In Huis')
      .reduce((s: number, i: { aantal: number }) => s + i.aantal, 0)
    const onderweg = inkopenArr
      .filter((i) => i.product === product && i.status === 'Onderweg')
      .reduce((s: number, i: { aantal: number }) => s + i.aantal, 0)
    const verkocht = alleVerkopenArr.filter(
      (v) => v.product === product && v.status !== 'Retour ontvangen'
    ).length
    return {
      product,
      in_huis: Math.max(0, ingekocht - verkocht),
      onderweg,
    }
  }).sort((a, b) => b.in_huis - a.in_huis)

  // Winst per maand (dit jaar)
  const maandnamen = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
  const winstPerMaand = maandnamen.map((naam, i) => {
    const vk = verkopenDitJaar.filter((v) => new Date(v.verkoopdatum).getMonth() === i)
    return { naam, winst: sommeerWinst(vk) }
  })

  // Winst per product (dit jaar)
  const winstPerProduct = PRODUCTEN.map((product) => {
    const vk = verkopenDitJaar.filter((v) => v.product === product)
    const afgerond = vk.filter((v) =>
      v.status === 'Afgerond (geld binnen)' || v.status === 'Verkocht - Nog niet verzonden' || v.status === 'Onderweg'
    )
    const gemVerkoopprijs = afgerond.length > 0
      ? afgerond.reduce((s, v) => s + v.verkoopprijs, 0) / afgerond.length
      : 0
    return { product, winst: sommeerWinst(vk), aantal: vk.length, gemVerkoopprijs }
  }).sort((a, b) => b.winst - a.winst)

  // Totale waarde in voorraad
  const totaleVoorraadWaarde = voorraad.reduce((sum, item) => {
    const gemKost = gemKostByProduct[item.product] ?? 0
    return sum + item.in_huis * gemKost
  }, 0)

  // Winst per account (dit jaar)
  const accounts = [...new Set((alleVerkopen || []).map((v) => v.account))].sort()
  const winstPerAccount = accounts.map((account) => {
    const v = verkopenDitJaar.filter((v) => v.account === account)
    return { account, winst: sommeerWinst(v), aantal: v.length }
  })

  const actieveStatussen = ['Afgerond (geld binnen)', 'Verkocht - Nog niet verzonden', 'Onderweg']
  const actieveVerkopen = verkopenDitJaar.filter((v) => actieveStatussen.includes(v.status))

  const omzetDitJaar = actieveVerkopen.reduce((s, v) => s + v.verkoopprijs, 0)
  const kostenProductDitJaar = actieveVerkopen.reduce((s, v) => s + v.aankoopprijs, 0)

  // Commissies betaald aan Jasmijn (actieve Jasmijn verkopen)
  const jasmijnActiefDitJaar = actieveVerkopen.filter((v) => v.account === '3-jasmijn')
  const commissiesDitJaar = jasmijnActiefDitJaar.reduce((s, v) => s + comm(v.verkoopprijs), 0)
  const commissiesBinnenDitJaar = jasmijnActiefDitJaar
    .filter((v) => v.status === 'Afgerond (geld binnen)')
    .reduce((s, v) => s + comm(v.verkoopprijs), 0)
  const commissiesOnderwegDitJaar = jasmijnActiefDitJaar
    .filter((v) => v.status !== 'Afgerond (geld binnen)')
    .reduce((s, v) => s + comm(v.verkoopprijs), 0)

  const kostenInkopenDitJaar = inkopenArr
    .filter((i: { besteldatum: string; status: string; totale_aankoopprijs: number }) =>
      new Date(i.besteldatum).getFullYear() === ditJaar && i.status !== 'Beginsaldo'
    )
    .reduce((s: number, i: { totale_aankoopprijs: number }) => s + i.totale_aankoopprijs, 0)

  const kostenInkopenDezeMaand = inkopenArr
    .filter((i: { besteldatum: string; status: string; totale_aankoopprijs: number }) => {
      const d = new Date(i.besteldatum)
      return d.getFullYear() === ditJaar && d.getMonth() === dezeMaand && i.status !== 'Beginsaldo'
    })
    .reduce((s: number, i: { totale_aankoopprijs: number }) => s + i.totale_aankoopprijs, 0)

  const extraKostenDitJaar = (extraKostenData || [])
    .filter((e: { datum: string }) => new Date(e.datum).getFullYear() === ditJaar)
    .reduce((s: number, e: { bedrag: number }) => s + e.bedrag, 0)

  const geldBinnen = verkopenDitJaar
    .filter((v) => v.status === 'Afgerond (geld binnen)')
    .reduce((s, v) => s + (v.winst ?? 0), 0)

  const geldVerwacht = verkopenDitJaar
    .filter((v) => v.status === 'Verkocht - Nog niet verzonden' || v.status === 'Onderweg')
    .reduce((s, v) => s + v.verkoopprijs, 0)

  const actieveVerkopenDezeMaand = verkopenDezeMaand.filter((v) => actieveStatussen.includes(v.status))
  const omzetDezeMaand = actieveVerkopenDezeMaand.reduce((s, v) => s + v.verkoopprijs, 0)
  const kostenProductDezeMaand = actieveVerkopenDezeMaand.reduce((s, v) => s + v.aankoopprijs, 0)
  const jasmijnActiefDezeMaand = actieveVerkopenDezeMaand.filter((v) => v.account === '3-jasmijn')
  const commissiesDezeMaand = jasmijnActiefDezeMaand.reduce((s, v) => s + comm(v.verkoopprijs), 0)
  const commissiesBinnenDezeMaand = jasmijnActiefDezeMaand
    .filter((v) => v.status === 'Afgerond (geld binnen)')
    .reduce((s, v) => s + comm(v.verkoopprijs), 0)
  const commissiesOnderwegDezeMaand = jasmijnActiefDezeMaand
    .filter((v) => v.status !== 'Afgerond (geld binnen)')
    .reduce((s, v) => s + comm(v.verkoopprijs), 0)
  const extraKostenDezeMaand = (extraKostenData || [])
    .filter((e: { datum: string }) => {
      const d = new Date(e.datum)
      return d.getFullYear() === ditJaar && d.getMonth() === dezeMaand
    })
    .reduce((s: number, e: { bedrag: number }) => s + e.bedrag, 0)

  const geldBinnenDezeMaand = verkopenDezeMaand
    .filter((v) => v.status === 'Afgerond (geld binnen)')
    .reduce((s, v) => s + (v.winst ?? 0), 0)

  const geldVerwachtDezeMaand = verkopenDezeMaand
    .filter((v) => v.status === 'Verkocht - Nog niet verzonden' || v.status === 'Onderweg')
    .reduce((s, v) => s + v.verkoopprijs, 0)

  const winstPerProductDezeMaand = PRODUCTEN.map((product) => {
    const vk = verkopenDezeMaand.filter((v) => v.product === product)
    const afgerond = vk.filter((v) => actieveStatussen.includes(v.status))
    const gemVerkoopprijs = afgerond.length > 0
      ? afgerond.reduce((s, v) => s + v.verkoopprijs, 0) / afgerond.length
      : 0
    return { product, winst: sommeerWinst(vk), aantal: vk.length, gemVerkoopprijs }
  }).sort((a, b) => b.winst - a.winst)

  const winstPerAccountDezeMaand = accounts
    .map((account) => {
      const v = verkopenDezeMaand.filter((v) => v.account === account)
      return { account, winst: sommeerWinst(v), aantal: v.length }
    })
    .filter((a) => a.aantal > 0)

  // Te verzenden: voor Jasmijn alleen haar eigen, voor CEO alle
  const teVerzenden = (isJasmijn ? verkopen : (alleVerkopen || [])).filter(
    (v) => v.status === 'Verkocht - Nog niet verzonden'
  ).length

  // === Jasmijn-specifieke commissiedata ===
  let jasmijnStats = undefined
  if (isJasmijn) {
    // Omzet binnen (afgeronde verkopen — alle tijden)
    const afgerondAlleT = verkopenMetWinst.filter((v) => v.status === 'Afgerond (geld binnen)')
    const omzetBinnenAlleT = afgerondAlleT.reduce((s, v) => s + v.verkoopprijs, 0)
    const commissieAlleT = afgerondAlleT.reduce((s, v) => s + comm(v.verkoopprijs), 0)

    // Commissie dit jaar
    const actieveJaar = verkopenDitJaar.filter((v) => actieveStatussen.includes(v.status))
    const commissieDitJaar = actieveJaar.reduce((s, v) => s + comm(v.verkoopprijs), 0)

    // Commissie deze maand
    const actiefMaand = verkopenDezeMaand.filter((v) => actieveStatussen.includes(v.status))
    const commissieDezeMaand = actiefMaand.reduce((s, v) => s + comm(v.verkoopprijs), 0)

    // Omzet dit jaar / deze maand (voor KPI's)
    const omzetBinnenDitJaar = verkopenDitJaar
      .filter((v) => v.status === 'Afgerond (geld binnen)')
      .reduce((s, v) => s + v.verkoopprijs, 0)
    const omzetBinnenDezeMaand = verkopenDezeMaand
      .filter((v) => v.status === 'Afgerond (geld binnen)')
      .reduce((s, v) => s + v.verkoopprijs, 0)

    // Commissie op afgeronde verkopen dit jaar / deze maand
    const commissieBinnenDitJaar = verkopenDitJaar
      .filter((v) => v.status === 'Afgerond (geld binnen)')
      .reduce((s, v) => s + comm(v.verkoopprijs), 0)
    const commissieBinnenDezeMaand = verkopenDezeMaand
      .filter((v) => v.status === 'Afgerond (geld binnen)')
      .reduce((s, v) => s + comm(v.verkoopprijs), 0)

    // Commissie onderweg (verwacht) dit jaar / deze maand
    const commissieOnderwegDitJaar = verkopenDitJaar
      .filter((v) => v.status === 'Verkocht - Nog niet verzonden' || v.status === 'Onderweg')
      .reduce((s, v) => s + comm(v.verkoopprijs), 0)
    const commissieOnderwegDezeMaand = verkopenDezeMaand
      .filter((v) => v.status === 'Verkocht - Nog niet verzonden' || v.status === 'Onderweg')
      .reduce((s, v) => s + comm(v.verkoopprijs), 0)

    // Te betalen = som van (verkoopprijs - commissie) voor afgeronde, nog niet uitbetaalde verkopen
    const afgerondNietUitbetaald = verkopenMetWinst.filter(
      (v) => v.status === 'Afgerond (geld binnen)' && !v.uitbetaald
    )
    const teBetalen = afgerondNietUitbetaald.reduce(
      (s, v) => s + v.verkoopprijs - comm(v.verkoopprijs),
      0
    )
    const teBetalenVerkopen = afgerondNietUitbetaald.map((v) => ({
      id: v.id,
      product: v.product,
      verkoopdatum: v.verkoopdatum,
      verkoopprijs: v.verkoopprijs,
      commissie: comm(v.verkoopprijs),
      teStorten: v.verkoopprijs - comm(v.verkoopprijs),
    }))

    // Omzet onderweg (verwacht) deze maand / dit jaar
    const omzetOnderweg = verkopenDitJaar
      .filter((v) => v.status === 'Verkocht - Nog niet verzonden' || v.status === 'Onderweg')
      .reduce((s, v) => s + v.verkoopprijs, 0)
    const omzetOnderwegDezeMaand = verkopenDezeMaand
      .filter((v) => v.status === 'Verkocht - Nog niet verzonden' || v.status === 'Onderweg')
      .reduce((s, v) => s + v.verkoopprijs, 0)

    // Omzet per maand (voor grafiek)
    const omzetPerMaand = maandnamen.map((naam, i) => {
      const vk = verkopenDitJaar.filter(
        (v) => new Date(v.verkoopdatum).getMonth() === i && actieveStatussen.includes(v.status)
      )
      return { naam, omzet: vk.reduce((s, v) => s + v.verkoopprijs, 0) }
    })

    // Omzet per product (dit jaar, voor grafiek)
    const omzetPerProduct = PRODUCTEN.map((product) => {
      const vk = verkopenDitJaar.filter(
        (v) => v.product === product && actieveStatussen.includes(v.status)
      )
      return { product, omzet: vk.reduce((s, v) => s + v.verkoopprijs, 0), aantal: vk.length }
    }).sort((a, b) => b.omzet - a.omzet)

    // Omzet per product deze maand
    const omzetPerProductDezeMaand = PRODUCTEN.map((product) => {
      const vk = verkopenDezeMaand.filter(
        (v) => v.product === product && actieveStatussen.includes(v.status)
      )
      return { product, omzet: vk.reduce((s, v) => s + v.verkoopprijs, 0), aantal: vk.length }
    }).sort((a, b) => b.omzet - a.omzet)

    jasmijnStats = {
      commissieDitJaar,
      commissieDezeMaand,
      commissieBinnenDitJaar,
      commissieBinnenDezeMaand,
      commissieOnderwegDitJaar,
      commissieOnderwegDezeMaand,
      omzetBinnenDitJaar,
      omzetBinnenDezeMaand,
      omzetOnderweg,
      omzetOnderwegDezeMaand,
      teBetalen,
      teBetalenVerkopen,
      omzetPerMaand,
      omzetPerProduct,
      omzetPerProductDezeMaand,
    }
  }

  // Voor CEO: hoeveel moet Jasmijn nog storten?
  let jasmijnOpenstaand: number | undefined = undefined
  if (!isJasmijn) {
    const jasmijnAfgerondNietUitbetaald = (alleVerkopen || []).filter(
      (v) => v.account === '3-jasmijn' && v.status === 'Afgerond (geld binnen)' && !v.uitbetaald
    )
    jasmijnOpenstaand = jasmijnAfgerondNietUitbetaald.reduce(
      (s: number, v: { verkoopprijs: number }) =>
        s + v.verkoopprijs - comm(v.verkoopprijs),
      0
    )
  }

  return NextResponse.json({
    winstDitJaar: sommeerWinst(verkopenDitJaar),
    winstDezeMaand: sommeerWinst(verkopenDezeMaand),
    aantalDezeMaand: verkopenDezeMaand.length,
    aantalDitJaar: verkopenDitJaar.length,
    totaleVoorraadWaarde,
    omzetDitJaar,
    kostenProductDitJaar,
    commissiesDitJaar,
    commissiesBinnenDitJaar,
    commissiesOnderwegDitJaar,
    extraKostenDitJaar,
    geldBinnen,
    geldVerwacht,
    kostenInkopenDitJaar,
    kostenInkopenDezeMaand,
    omzetDezeMaand,
    kostenProductDezeMaand,
    commissiesDezeMaand,
    commissiesBinnenDezeMaand,
    commissiesOnderwegDezeMaand,
    extraKostenDezeMaand,
    geldBinnenDezeMaand,
    geldVerwachtDezeMaand,
    winstPerProductDezeMaand,
    winstPerAccountDezeMaand,
    teVerzenden,
    voorraad,
    winstPerMaand,
    winstPerProduct,
    winstPerAccount,
    jasmijnStats,
    jasmijnOpenstaand,
    commissieRegels,
  })
  } catch (err) {
    console.error('Stats route error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
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
