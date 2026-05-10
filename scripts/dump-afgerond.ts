// Debug: toon recente afgerond-mail log-rijen met status, foutmelding, parsed data, en match-poging tegen verkopen.

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Laatste 10 afgerond-mails (alle statussen)
  const { data: logs, error } = await supabase
    .from('email_ingestie_log')
    .select('id, gmail_message_id, ontvangen_op, status, foutmelding, parsed_data, vinted_transaction_id, verkoop_id')
    .eq('mail_type', 'afgerond')
    .order('ontvangen_op', { ascending: false })
    .limit(10)

  if (error || !logs) {
    console.error('DB error:', error)
    process.exit(1)
  }

  console.log(`Laatste ${logs.length} afgerond-mail log-rijen:\n`)

  for (const log of logs) {
    console.log('═'.repeat(80))
    console.log('Datum:', new Date(log.ontvangen_op).toLocaleString('nl-NL'))
    console.log('Status:', log.status)
    console.log('Transactie-ID (uit mail):', log.vinted_transaction_id || '—')
    console.log('Verkoop_id (gekoppeld):', log.verkoop_id || '—')
    if (log.foutmelding) console.log('Foutmelding:', log.foutmelding)
    console.log('Parsed:', JSON.stringify(log.parsed_data, null, 2))

    // Als we een tx-id hebben, check of de verkoop bestaat in DB
    if (log.vinted_transaction_id) {
      const { data: verkoop } = await supabase
        .from('verkopen')
        .select('id, product, verkoopprijs, status, account, naam_koper, vinted_transaction_id')
        .eq('vinted_transaction_id', log.vinted_transaction_id)
        .maybeSingle()

      if (verkoop) {
        console.log('Verkoop in DB:', verkoop)
      } else {
        console.log(`⚠ GEEN verkoop in DB met transaction_id ${log.vinted_transaction_id}`)
        // Check of er verkopen zijn die "lijken" — zelfde product/prijs in laatste 30 dagen
        const parsedData = log.parsed_data as Record<string, unknown>
        const product = parsedData?.productMapped as string | undefined
        if (product && product !== 'Onbekend') {
          const sinds = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          const { data: kandidaten } = await supabase
            .from('verkopen')
            .select('id, product, verkoopprijs, status, naam_koper, vinted_transaction_id, verkoopdatum')
            .eq('product', product)
            .gte('verkoopdatum', sinds)
            .order('verkoopdatum', { ascending: false })
            .limit(5)
          if (kandidaten?.length) {
            console.log(`Mogelijke verkopen voor product ${product}:`)
            for (const k of kandidaten) {
              console.log(`  - ${k.id} | ${k.verkoopdatum} | ${k.naam_koper} | €${k.verkoopprijs} | ${k.status} | tx_id: ${k.vinted_transaction_id || 'GEEN'}`)
            }
          }
        }
      }
    }
    console.log()
  }
}

main()
