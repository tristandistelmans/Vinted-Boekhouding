import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/gmail/queue/[id]
// Acties:
//   - 'akkoord' (verkoop-mail) — maak nieuwe verkoop met de geparseerde velden
//   - 'akkoord-bundel' (bundel-verkoop) — split in N verkopen
//   - 'afwijzen' — geen DB-actie, log status='rejected'
//   - 'koppel-verkoop' (afgerond/retour) — koppel deze mail aan een bestaande verkoop (verkoop_id meegeven)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await req.json()
  const { actie, overrides, regels, verkoop_id } = body as {
    actie: 'akkoord' | 'afwijzen' | 'akkoord-bundel' | 'koppel-verkoop'
    overrides?: {
      product?: string
      naam_koper?: string
      verkoopprijs?: number
      account?: string
      verkoopdatum?: string
    }
    regels?: { product: string }[]
    verkoop_id?: string
  }

  const supabase = getSupabase()
  const { data: log, error: logErr } = await supabase
    .from('email_ingestie_log')
    .select('*')
    .eq('id', id)
    .single()

  if (logErr || !log) return NextResponse.json({ error: 'log-rij niet gevonden' }, { status: 404 })
  if (log.status !== 'pending') {
    return NextResponse.json({ error: `log-rij heeft status ${log.status}, niet pending` }, { status: 400 })
  }

  if (actie === 'afwijzen') {
    await supabase
      .from('email_ingestie_log')
      .update({ status: 'rejected', verwerkt_op: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ ok: true })
  }

  const parsed = (log.parsed_data || {}) as Record<string, unknown>

  if (actie === 'akkoord') {
    if (log.mail_type !== 'verkoop') {
      return NextResponse.json({ error: 'akkoord werkt alleen op verkoop-mails' }, { status: 400 })
    }

    const product = overrides?.product || (parsed.productMapped as string) || (parsed.product as string)
    const koper = overrides?.naam_koper || (parsed.koper as string) || 'Onbekend'
    const prijs = overrides?.verkoopprijs ?? (parsed.prijs as number)
    const account = overrides?.account || log.account
    const datum = overrides?.verkoopdatum || (log.ontvangen_op as string).slice(0, 10)

    if (!product || !account || prijs == null) {
      return NextResponse.json(
        { error: 'product, account of prijs ontbreekt — vul aan via overrides' },
        { status: 400 }
      )
    }

    const { data: nieuw, error } = await supabase
      .from('verkopen')
      .insert({
        verkoopdatum: datum,
        product,
        naam_koper: koper,
        verkoopprijs: prijs,
        status: 'Verkocht - Nog niet verzonden',
        account,
        bron: 'gmail-bevestigd',
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase
      .from('email_ingestie_log')
      .update({ status: 'approved', verkoop_id: nieuw.id, verwerkt_op: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ ok: true, verkoop_id: nieuw.id })
  }

  if (actie === 'akkoord-bundel') {
    if (!log.is_bundel) {
      return NextResponse.json({ error: 'akkoord-bundel werkt alleen op bundle-verkopen' }, { status: 400 })
    }
    if (!regels || regels.length === 0) {
      return NextResponse.json({ error: 'regels (lijst van producten) is verplicht' }, { status: 400 })
    }
    if (regels.length !== log.bundel_aantal) {
      return NextResponse.json(
        { error: `verwacht ${log.bundel_aantal} regels, kreeg er ${regels.length}` },
        { status: 400 }
      )
    }

    const totaalPrijs = (parsed.prijs as number) || 0
    const account = log.account
    const koper = (parsed.koper as string) || 'Onbekend'
    const datum = (log.ontvangen_op as string).slice(0, 10)

    if (!account || totaalPrijs <= 0) {
      return NextResponse.json({ error: 'account of totaalprijs ontbreekt' }, { status: 400 })
    }

    // Verdeel prijs op cent-precisie, rest naar laatste regel
    const totaalCent = Math.round(totaalPrijs * 100)
    const basisCent = Math.floor(totaalCent / regels.length)
    const restCent = totaalCent - basisCent * regels.length
    const prijsPerRegel = regels.map((_, i) =>
      i === regels.length - 1 ? (basisCent + restCent) / 100 : basisCent / 100
    )

    const verkoopRows = regels.map((r, i) => ({
      verkoopdatum: datum,
      product: r.product,
      naam_koper: koper,
      verkoopprijs: prijsPerRegel[i],
      status: 'Verkocht - Nog niet verzonden',
      account,
      bron: 'gmail-bevestigd',
      notitie: `Bundel: ${regels.length} items`,
    }))

    const { data: nieuw, error } = await supabase
      .from('verkopen')
      .insert(verkoopRows)
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase
      .from('email_ingestie_log')
      .update({
        status: 'approved',
        verkoop_id: nieuw[0]?.id || null,
        verwerkt_op: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({ ok: true, verkoop_ids: nieuw.map((r) => r.id) })
  }

  if (actie === 'koppel-verkoop') {
    if (log.mail_type !== 'afgerond' && log.mail_type !== 'retour') {
      return NextResponse.json({ error: 'koppel-verkoop werkt op afgerond- of retour-mails' }, { status: 400 })
    }
    if (!verkoop_id) {
      return NextResponse.json({ error: 'verkoop_id is verplicht' }, { status: 400 })
    }

    const { data: verkoop, error: verkoopErr } = await supabase
      .from('verkopen')
      .select('id, status, vinted_transaction_id')
      .eq('id', verkoop_id)
      .maybeSingle()

    if (verkoopErr || !verkoop) {
      return NextResponse.json({ error: 'verkoop niet gevonden' }, { status: 404 })
    }

    const nieuweStatus = log.mail_type === 'retour' ? 'Retour' : 'Afgerond (geld binnen)'
    const txId = log.vinted_transaction_id || (parsed.transactionId as string | undefined) || null

    await supabase
      .from('verkopen')
      .update({
        status: nieuweStatus,
        ...(txId && !verkoop.vinted_transaction_id ? { vinted_transaction_id: txId } : {}),
      })
      .eq('id', verkoop.id)

    await supabase
      .from('email_ingestie_log')
      .update({
        status: 'approved',
        verkoop_id: verkoop.id,
        foutmelding: null,
        verwerkt_op: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({ ok: true, verkoop_id: verkoop.id, status: nieuweStatus })
  }

  return NextResponse.json({ error: 'onbekende actie' }, { status: 400 })
}
