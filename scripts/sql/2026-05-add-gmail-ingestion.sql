-- Migration: voeg Gmail-ingestie ondersteuning toe
-- Voer dit uit in de Supabase SQL editor.
-- Veilig om meermaals uit te voeren (idempotent waar mogelijk).

-- 1. Verkopen krijgt een 'bron' kolom (manueel/gmail-auto/gmail-bevestigd/vinted-api)
ALTER TABLE verkopen ADD COLUMN IF NOT EXISTS bron text DEFAULT 'manueel';

-- 2. vinted_transaction_id bestaat al volgens onderzoek; voor zekerheid en uniciteit
ALTER TABLE verkopen ADD COLUMN IF NOT EXISTS vinted_transaction_id text;
CREATE UNIQUE INDEX IF NOT EXISTS verkopen_transaction_id_uq
  ON verkopen(vinted_transaction_id)
  WHERE vinted_transaction_id IS NOT NULL;

-- 3. Audit + review-queue tabel
CREATE TABLE IF NOT EXISTS email_ingestie_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gmail_message_id text UNIQUE NOT NULL,
  ontvangen_op timestamptz NOT NULL,
  mail_type text NOT NULL,
  account text,
  vinted_transaction_id text,
  raw_subject text NOT NULL,
  raw_from text NOT NULL,
  parsed_data jsonb,
  is_bundel boolean DEFAULT false,
  bundel_aantal int,
  status text NOT NULL DEFAULT 'pending',
  verkoop_id uuid REFERENCES verkopen(id) ON DELETE SET NULL,
  foutmelding text,
  verwerkt_op timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_ingestie_log_status_idx ON email_ingestie_log(status);
CREATE INDEX IF NOT EXISTS email_ingestie_log_account_idx ON email_ingestie_log(account);
CREATE INDEX IF NOT EXISTS email_ingestie_log_transaction_idx ON email_ingestie_log(vinted_transaction_id);

-- 4. Instellingen voor Gmail-sync
INSERT INTO instellingen (sleutel, waarde) VALUES ('gmail_auto_mode', 'false')
  ON CONFLICT (sleutel) DO NOTHING;
INSERT INTO instellingen (sleutel, waarde) VALUES ('gmail_laatste_sync', '2026-01-01T00:00:00Z')
  ON CONFLICT (sleutel) DO NOTHING;
