// Debug-script: dump pending verkoop-mails uit email_ingestie_log
// Toont raw subject + parsed velden + (eerste 1500 chars van) plaintext body
// voor analyse van waarom de product-regex faalt.

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { createClient } from '@supabase/supabase-js'
import { fetchMail } from '../lib/gmail'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('email_ingestie_log')
    .select('id, gmail_message_id, raw_subject, raw_from, account, parsed_data, is_bundel')
    .eq('mail_type', 'verkoop')
    .eq('status', 'pending')
    .order('ontvangen_op', { ascending: false })
    .limit(10)

  if (error || !data) {
    console.error('DB error:', error)
    process.exit(1)
  }

  for (const row of data) {
    console.log('═'.repeat(80))
    console.log('Subject:', row.raw_subject)
    console.log('From:', row.raw_from)
    console.log('Account:', row.account, ' — bundel:', row.is_bundel)
    console.log('Parsed:', JSON.stringify(row.parsed_data, null, 2))

    // Haal raw body op
    try {
      const mail = await fetchMail(row.gmail_message_id)
      const body = mail.plaintextBody.slice(0, 1500)
      console.log('--- BODY (eerste 1500 chars) ---')
      console.log(body)
    } catch (e) {
      console.log('Kon body niet ophalen:', e instanceof Error ? e.message : 'onbekend')
    }
    console.log()
  }
}

main()
