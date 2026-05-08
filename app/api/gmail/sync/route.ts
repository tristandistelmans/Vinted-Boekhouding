import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { fetchMail, listVintedMails, markAlsVerwerkt, type GmailMessage } from '@/lib/gmail'
import { parseEmail, type ParseResult } from '@/lib/gmail-parser'

// Maximum aantal mails per sync-run om timeouts te voorkomen
const MAX_MAILS_PER_RUN = 50

export async function POST(req: NextRequest) {
  // Auth: Bearer CRON_SECRET in Authorization header
  const expected = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') || ''
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const startedAt = Date.now()

  try {
    // Lees laatste sync timestamp
    const { data: settings } = await supabase
      .from('instellingen')
      .select('sleutel, waarde')
      .in('sleutel', ['gmail_laatste_sync', 'gmail_auto_mode'])

    const laatsteSyncStr = settings?.find((r) => r.sleutel === 'gmail_laatste_sync')?.waarde || '2026-01-01T00:00:00Z'
    const autoMode = settings?.find((r) => r.sleutel === 'gmail_auto_mode')?.waarde === 'true'

    const laatsteSyncDate = new Date(laatsteSyncStr)
    const afterEpochSec = Math.floor(laatsteSyncDate.getTime() / 1000)

    // Haal nieuwe mails
    const refs = await listVintedMails({
      afterEpochSec,
      excludeProcessed: true,
      maxResults: MAX_MAILS_PER_RUN,
    })

    const stats = {
      gefetched: refs.length,
      verwerkt: 0,
      autoApplied: 0,
      pending: 0,
      errors: 0,
      perType: {} as Record<string, number>,
    }

    let nieuwsteOntvangenOp = laatsteSyncDate.getTime()

    for (const ref of refs) {
      try {
        // Skip als al verwerkt (zekerheid: Gmail-label én DB-check)
        const { data: existing } = await supabase
          .from('email_ingestie_log')
          .select('id')
          .eq('gmail_message_id', ref.id)
          .maybeSingle()
        if (existing) continue

        const mail = await fetchMail(ref.id)
        const parsed = parseEmail({
          subject: mail.subject,
          plaintextBody: mail.plaintextBody,
          fromHeader: mail.fromHeader,
          toHeader: mail.toHeader,
        })

        nieuwsteOntvangenOp = Math.max(nieuwsteOntvangenOp, mail.ontvangenOp.getTime())
        stats.perType[parsed.type] = (stats.perType[parsed.type] || 0) + 1

        const logRow = await insertLog(supabase, mail, parsed)

        // Verwerken o.b.v. type + autoMode
        await verwerkParse(supabase, parsed, mail, logRow.id, autoMode, stats)

        // Markeer in Gmail
        await markAlsVerwerkt(ref.id)
        stats.verwerkt++
      } catch (e) {
        stats.errors++
        console.error('Sync error voor mail', ref.id, e)
      }
    }

    // Cursor alleen vooruit zetten als er minstens één mail succesvol is verwerkt.
    // Zo missen we geen mails wanneer een hele batch faalt (bv. DB down).
    const heeftSucces = stats.autoApplied > 0 || stats.pending > 0
    if (heeftSucces && nieuwsteOntvangenOp > laatsteSyncDate.getTime()) {
      await supabase
        .from('instellingen')
        .upsert(
          {
            sleutel: 'gmail_laatste_sync',
            waarde: new Date(nieuwsteOntvangenOp).toISOString(),
            bijgewerkt_op: new Date().toISOString(),
          },
          { onConflict: 'sleutel' }
        )
    }

    return NextResponse.json({
      ok: true,
      duurMs: Date.now() - startedAt,
      autoMode,
      ...stats,
    })
  } catch (e) {
    console.error('Sync hoofd-error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown error' },
      { status: 500 }
    )
  }
}

async function insertLog(
  supabase: ReturnType<typeof getSupabase>,
  mail: GmailMessage,
  parsed: ParseResult
) {
  const isBundel = parsed.type === 'verkoop' ? parsed.isBundel : false
  const bundelAantal = parsed.type === 'verkoop' && parsed.isBundel ? parsed.bundelAantal : null
  const txId =
    parsed.type === 'verzendlabel' || parsed.type === 'afgerond' || parsed.type === 'retour'
      ? parsed.transactionId
      : null

  const { data, error } = await supabase
    .from('email_ingestie_log')
    .insert({
      gmail_message_id: mail.id,
      ontvangen_op: mail.ontvangenOp.toISOString(),
      mail_type: parsed.type,
      account: parsed.account,
      vinted_transaction_id: txId,
      raw_subject: mail.subject,
      raw_from: mail.fromHeader,
      parsed_data: parsed as unknown as Record<string, unknown>,
      is_bundel: isBundel,
      bundel_aantal: bundelAantal,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error('Kon log-rij niet aanmaken: ' + error?.message)
  return data
}

async function verwerkParse(
  supabase: ReturnType<typeof getSupabase>,
  parsed: ParseResult,
  mail: GmailMessage,
  logId: string,
  autoMode: boolean,
  stats: { autoApplied: number; pending: number; errors: number }
) {
  const updateLog = async (patch: Record<string, unknown>) =>
    supabase.from('email_ingestie_log').update({ verwerkt_op: new Date().toISOString(), ...patch }).eq('id', logId)

  if (parsed.type === 'onbekend') {
    // Newsletters/promo-mails niet in de review queue stoppen — wel auditeren
    await updateLog({ status: 'rejected', foutmelding: 'mailtype niet herkend (newsletter/promo)' })
    return
  }

  if (parsed.type === 'verkoop') {
    if (!parsed.account || parsed.prijs === null) {
      await updateLog({ status: 'error', foutmelding: 'verkoopmail mist account of prijs' })
      stats.errors++
      return
    }

    // Bundle: altijd review, ook in auto-mode
    if (parsed.isBundel) {
      stats.pending++
      return
    }

    if (!autoMode) {
      stats.pending++
      return
    }

    // Auto-mode + single-item → maak verkoop direct
    const { data: nieuw, error } = await supabase
      .from('verkopen')
      .insert({
        verkoopdatum: mail.ontvangenOp.toISOString().slice(0, 10),
        product: parsed.productMapped || parsed.product || 'Onbekend',
        naam_koper: parsed.koper || 'Onbekend',
        verkoopprijs: parsed.prijs,
        status: 'Verkocht - Nog niet verzonden',
        account: parsed.account,
        bron: 'gmail-auto',
      })
      .select('id')
      .single()

    if (error) {
      await updateLog({ status: 'error', foutmelding: error.message })
      stats.errors++
    } else {
      await updateLog({ status: 'auto-applied', verkoop_id: nieuw.id })
      stats.autoApplied++
    }
    return
  }

  if (parsed.type === 'verzendlabel') {
    if (!parsed.transactionId) {
      await updateLog({ status: 'error', foutmelding: 'verzendlabel mist transactie-ID' })
      stats.errors++
      return
    }

    // Stap 1: zoek verkoop met deze transactie-id (al bekend)
    let verkoopId: string | null = null
    const { data: bestaand } = await supabase
      .from('verkopen')
      .select('id')
      .eq('vinted_transaction_id', parsed.transactionId)
      .maybeSingle()

    if (bestaand) {
      verkoopId = bestaand.id
      // Verzendlabel = label aangemaakt op Vinted, NIET fysiek verzonden.
      // Status blijft 'Verkocht - Nog niet verzonden' tot Tristan handmatig op 'Onderweg' zet
      // (Verzenden-tab) of tot een afgerond-mail binnenkomt.
      await supabase
        .from('verkopen')
        .update(
          parsed.productMapped && parsed.productMapped !== 'Onbekend'
            ? { product: parsed.productMapped }
            : {}
        )
        .eq('id', verkoopId)
    } else if (parsed.account) {
      // Stap 2: zoek meest recente verkoop voor dit account zonder transactie-id (chronologische match)
      const { data: kandidaten } = await supabase
        .from('verkopen')
        .select('id, product, created_at')
        .eq('account', parsed.account)
        .is('vinted_transaction_id', null)
        .in('status', ['Verkocht - Nog niet verzonden'])
        .order('created_at', { ascending: false })
        .limit(5)

      // Eerst proberen op product-match, anders meest recente
      const productMatch = parsed.productMapped
        ? kandidaten?.find((k) => k.product === parsed.productMapped)
        : null
      const target = productMatch || kandidaten?.[0]

      if (target) {
        verkoopId = target.id
        // Vul alleen transaction_id en (optioneel) canonieke product-naam in.
        // Status blijft 'Verkocht - Nog niet verzonden'.
        await supabase
          .from('verkopen')
          .update({
            vinted_transaction_id: parsed.transactionId,
            ...(parsed.productMapped && parsed.productMapped !== 'Onbekend'
              ? { product: parsed.productMapped }
              : {}),
          })
          .eq('id', verkoopId)
      }
    }

    if (verkoopId) {
      await updateLog({ status: 'auto-applied', verkoop_id: verkoopId })
      stats.autoApplied++
    } else {
      await updateLog({
        status: 'error',
        foutmelding: 'geen matching verkoop gevonden voor verzendlabel',
      })
      stats.errors++
    }
    return
  }

  if (parsed.type === 'afgerond') {
    if (!parsed.transactionId) {
      await updateLog({ status: 'error', foutmelding: 'afgerond mist transactie-ID' })
      stats.errors++
      return
    }
    const { data: bestaand } = await supabase
      .from('verkopen')
      .select('id, verkoopprijs')
      .eq('vinted_transaction_id', parsed.transactionId)
      .maybeSingle()

    if (!bestaand) {
      await updateLog({
        status: 'error',
        foutmelding: 'geen verkoop gevonden voor transactie-id ' + parsed.transactionId,
      })
      stats.errors++
      return
    }

    await supabase
      .from('verkopen')
      .update({ status: 'Afgerond (geld binnen)' })
      .eq('id', bestaand.id)

    await updateLog({ status: 'auto-applied', verkoop_id: bestaand.id })
    stats.autoApplied++

    // Optioneel: log waarschuwing als bedrag afwijkt
    if (parsed.bedragItem !== null && bestaand.verkoopprijs && Math.abs(parsed.bedragItem - bestaand.verkoopprijs) > 0.5) {
      console.warn(
        `Bedragverschil voor transactie ${parsed.transactionId}: mail=${parsed.bedragItem}, db=${bestaand.verkoopprijs}`
      )
    }
    return
  }

  if (parsed.type === 'retour') {
    if (parsed.transactionId) {
      const { data: bestaand } = await supabase
        .from('verkopen')
        .select('id')
        .eq('vinted_transaction_id', parsed.transactionId)
        .maybeSingle()
      if (bestaand) {
        await supabase.from('verkopen').update({ status: 'Retour' }).eq('id', bestaand.id)
        await updateLog({ status: 'auto-applied', verkoop_id: bestaand.id })
        stats.autoApplied++
        return
      }
    }
    await updateLog({ status: 'error', foutmelding: 'retour-mail kan niet gekoppeld worden' })
    stats.errors++
  }
}
