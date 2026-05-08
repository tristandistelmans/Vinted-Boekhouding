import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key || url === 'jouw_supabase_url_hier') {
      throw new Error('Supabase niet geconfigureerd. Vul .env.local in met NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY.')
    }
    _client = createClient(url, key)
  }
  return _client
}

// Backwards-compat alias
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient]
  },
})

export type Verkoop = {
  id: string
  verkoopdatum: string
  product: string
  naam_koper: string
  verkoopprijs: number
  status: string
  account: string
  created_at: string
  winst?: number | null
  aankoopprijs?: number
  bron?: string
  vinted_transaction_id?: string | null
  notitie?: string | null
}

export type EmailIngestie = {
  id: string
  gmail_message_id: string
  ontvangen_op: string
  mail_type: 'verkoop' | 'verzendlabel' | 'afgerond' | 'retour' | 'onbekend'
  account: string | null
  vinted_transaction_id: string | null
  raw_subject: string
  raw_from: string
  parsed_data: Record<string, unknown> | null
  is_bundel: boolean
  bundel_aantal: number | null
  status: 'pending' | 'auto-applied' | 'approved' | 'rejected' | 'error'
  verkoop_id: string | null
  foutmelding: string | null
  verwerkt_op: string | null
  created_at: string
}

export type Inkoop = {
  id: string
  besteldatum: string
  product: string
  aantal: number
  status: string
  totale_aankoopprijs: number
  prijs_per_stuk: number
  created_at: string
}

export type VoorraadItem = {
  product: string
  in_huis: number
  onderweg: number
}
