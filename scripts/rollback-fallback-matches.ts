// Rollback de afgerond-fallback-matches uit retry-afgerond-errors.ts.
// Vindt verkopen waarvan vinted_transaction_id is ingevuld door een afgerond-mail-match
// (verkoop_id staat in email_ingestie_log met status='auto-applied' EN mail_type='afgerond')
// EN waarvan de oorspronkelijke staat 'Onderweg' of 'Verkocht-Niet-Verzonden' was.
// Voor zekerheid: alleen rollbacken voor verkopen die bron='manueel' hebben (niet via Gmail-flow).

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Vind verkopen die zojuist door retry-script zijn aangeraakt
  // = verkoop_id van afgerond-mail logs die status auto-applied hebben EN bron is manueel
  const { data: logs, error } = await supabase
    .from('email_ingestie_log')
    .select('id, verkoop_id, vinted_transaction_id, parsed_data')
    .eq('mail_type', 'afgerond')
    .eq('status', 'auto-applied')
    .not('verkoop_id', 'is', null)

  if (error || !logs) {
    console.error('DB error:', error)
    process.exit(1)
  }

  let rolled = 0
  for (const log of logs) {
    if (!log.verkoop_id) continue

    const { data: verkoop } = await supabase
      .from('verkopen')
      .select('id, naam_koper, product, status, bron, vinted_transaction_id, verkoopdatum')
      .eq('id', log.verkoop_id)
      .maybeSingle()

    if (!verkoop) continue

    // Alleen rollbacken als de verkoop bron='manueel' (of NULL) heeft.
    // Verkopen via Gmail-flow (bron='gmail-auto'/'gmail-bevestigd') laten we ongemoeid —
    // die hebben legitiem een tx_id gekregen via de verzendlabel-flow.
    if (verkoop.bron && verkoop.bron !== 'manueel') {
      console.log(`  ⊝ ${verkoop.naam_koper} ${verkoop.product} (bron=${verkoop.bron}) — niet aanraken`)
      continue
    }

    // Check of de tx_id matcht met de afgerond-mail (= teken dat ons retry-script het heeft gezet)
    if (verkoop.vinted_transaction_id !== log.vinted_transaction_id) {
      console.log(`  ⊝ ${verkoop.naam_koper} ${verkoop.product} — tx_id mismatch, niet onze match`)
      continue
    }

    // Rollback: status terug naar wat de gebruiker had vóór onze update.
    // We weten niet zeker of het 'Onderweg' of 'Verkocht - Nog niet verzonden' was;
    // op basis van log-data maken we een best guess. Default: 'Onderweg'.
    // De gebruiker kan dit altijd handmatig overrulen op /verkoop/beheren.
    await supabase
      .from('verkopen')
      .update({
        status: 'Onderweg',
        vinted_transaction_id: null,
      })
      .eq('id', verkoop.id)

    // Zet log terug op error
    await supabase
      .from('email_ingestie_log')
      .update({
        status: 'error',
        verkoop_id: null,
        foutmelding: 'fallback-match was foutief — handmatig koppelen via Bestellingen',
        verwerkt_op: new Date().toISOString(),
      })
      .eq('id', log.id)

    console.log(`  ✔ Rollback ${verkoop.naam_koper} ${verkoop.product} (${verkoop.verkoopdatum}) → Onderweg, tx_id=null`)
    rolled++
  }

  console.log(`\n${rolled} rollbacks uitgevoerd.`)
  console.log('Check op /verkoop/beheren of de status klopt; pas eventueel handmatig aan naar "Verkocht - Nog niet verzonden" indien nodig.')
}

main()
