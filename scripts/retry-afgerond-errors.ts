// Retry afgerond-mail logs die in 'error'-status staan met de nieuwe fallback-match-logica.
// Gebruikt direct de DB (geen Gmail-fetch nodig — parsed_data zit al in de log).

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: logs, error } = await supabase
    .from('email_ingestie_log')
    .select('id, ontvangen_op, parsed_data, vinted_transaction_id')
    .eq('mail_type', 'afgerond')
    .eq('status', 'error')
    .order('ontvangen_op', { ascending: true })

  if (error || !logs) {
    console.error('DB error:', error)
    process.exit(1)
  }

  console.log(`Retry ${logs.length} afgerond-error log-rijen...\n`)

  let resolved = 0
  let stillError = 0
  let ambigue = 0

  for (const log of logs) {
    const parsed = log.parsed_data as {
      account?: string
      productMapped?: string
      bedragItem?: number | null
      transactionId?: string
    }

    if (!parsed.account || !parsed.productMapped || parsed.productMapped === 'Onbekend' || parsed.bedragItem == null) {
      console.log(`  ✘ ${log.id.slice(0, 8)}... onvoldoende parsed data`)
      stillError++
      continue
    }

    const sinds = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { data: kandidaten } = await supabase
      .from('verkopen')
      .select('id, verkoopdatum, naam_koper')
      .eq('account', parsed.account)
      .eq('product', parsed.productMapped)
      .eq('verkoopprijs', parsed.bedragItem)
      .in('status', ['Verkocht - Nog niet verzonden', 'Onderweg'])
      .is('vinted_transaction_id', null)
      .gte('verkoopdatum', sinds)
      .order('verkoopdatum', { ascending: true })

    if (!kandidaten || kandidaten.length === 0) {
      console.log(`  ✘ ${log.id.slice(0, 8)}... geen kandidaat (${parsed.productMapped} €${parsed.bedragItem} ${parsed.account})`)
      stillError++
      continue
    }

    if (kandidaten.length > 1) {
      console.log(`  ⚠ ${log.id.slice(0, 8)}... ${kandidaten.length} kandidaten (ambigue): ${parsed.productMapped} €${parsed.bedragItem}`)
      await supabase
        .from('email_ingestie_log')
        .update({
          status: 'error',
          foutmelding: `ambigue match: ${kandidaten.length} verkopen voor ${parsed.productMapped} €${parsed.bedragItem} ${parsed.account}`,
          verwerkt_op: new Date().toISOString(),
        })
        .eq('id', log.id)
      ambigue++
      continue
    }

    const target = kandidaten[0]
    await supabase
      .from('verkopen')
      .update({
        status: 'Afgerond (geld binnen)',
        vinted_transaction_id: log.vinted_transaction_id || parsed.transactionId,
      })
      .eq('id', target.id)

    await supabase
      .from('email_ingestie_log')
      .update({
        status: 'auto-applied',
        verkoop_id: target.id,
        foutmelding: null,
        verwerkt_op: new Date().toISOString(),
      })
      .eq('id', log.id)

    console.log(`  ✔ ${log.id.slice(0, 8)}... → ${target.naam_koper} ${parsed.productMapped} €${parsed.bedragItem} (${target.verkoopdatum})`)
    resolved++
  }

  console.log(`\nKlaar: ${resolved} opgelost · ${ambigue} ambigue · ${stillError} nog steeds error`)
}

main()
