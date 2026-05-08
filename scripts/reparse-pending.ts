// Re-parse alle pending log-rijen met de huidige parser-versie.
// Handig wanneer de parser-regex is geüpdatet maar de log-rijen nog oude parsed_data hebben.

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { createClient } from '@supabase/supabase-js'
import { fetchMail } from '../lib/gmail'
import { parseEmail } from '../lib/gmail-parser'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('email_ingestie_log')
    .select('id, gmail_message_id, mail_type')
    .eq('status', 'pending')

  if (error || !data) {
    console.error('DB error:', error)
    process.exit(1)
  }

  console.log(`Re-parsing ${data.length} pending log-rijen...\n`)

  for (const row of data) {
    try {
      const mail = await fetchMail(row.gmail_message_id)
      const parsed = parseEmail({
        subject: mail.subject,
        plaintextBody: mail.plaintextBody,
        fromHeader: mail.fromHeader,
        toHeader: mail.toHeader,
      })

      const isBundel = parsed.type === 'verkoop' ? parsed.isBundel : false
      const bundelAantal = parsed.type === 'verkoop' && parsed.isBundel ? parsed.bundelAantal : null

      await supabase
        .from('email_ingestie_log')
        .update({
          parsed_data: parsed,
          is_bundel: isBundel,
          bundel_aantal: bundelAantal,
        })
        .eq('id', row.id)

      const productNaam = parsed.type === 'verkoop' ? (parsed.productMapped || parsed.product || '—') : '—'
      console.log(`  ✔ ${row.id.slice(0, 8)}... [${parsed.type}] product: ${productNaam}`)
    } catch (e) {
      console.error(`  ✘ ${row.id}: ${e instanceof Error ? e.message : 'onbekende fout'}`)
    }
  }
  console.log('\nKlaar.')
}

main()
