'use client'

import { useState, useEffect } from 'react'

interface SyncResultaat {
  nieuw: number
  bijgewerkt: number
  fouten: string[]
}

export default function InstellingenPage() {
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [wachtwoordGewijzigd, setWachtwoordGewijzigd] = useState(false)
  const [opslaan, setOpslaan] = useState(false)
  const [opslaanBericht, setOpslaanBericht] = useState<{ ok: boolean; tekst: string } | null>(null)

  const [syncBezig, setSyncBezig] = useState(false)
  const [syncResultaat, setSyncResultaat] = useState<SyncResultaat | null>(null)
  const [syncFout, setSyncFout] = useState<string | null>(null)

  const [laatste_sync, setLaatsteSyncTijd] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/instellingen')
      .then((r) => r.json())
      .then((data) => {
        const rows: { sleutel: string; waarde: string }[] = data.instellingen || []
        const map = Object.fromEntries(rows.map((r) => [r.sleutel, r.waarde]))
        if (map.vinted_email) setEmail(map.vinted_email)
        if (map.vinted_password) setWachtwoord(map.vinted_password) // masked value
        if (map.laatste_sync) setLaatsteSyncTijd(map.laatste_sync)
      })
      .catch(() => {})
  }, [])

  async function handleOpslaan() {
    setOpslaan(true)
    setOpslaanBericht(null)
    try {
      const saves = [
        fetch('/api/instellingen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sleutel: 'vinted_email', waarde: email }),
        }),
      ]
      if (wachtwoordGewijzigd) {
        saves.push(
          fetch('/api/instellingen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sleutel: 'vinted_password', waarde: wachtwoord }),
          })
        )
      }
      const results = await Promise.all(saves)
      const allOk = results.every((r) => r.ok)
      setOpslaanBericht({ ok: allOk, tekst: allOk ? 'Opgeslagen' : 'Opslaan mislukt' })
      if (allOk) setWachtwoordGewijzigd(false)
    } catch {
      setOpslaanBericht({ ok: false, tekst: 'Verbindingsfout' })
    } finally {
      setOpslaan(false)
    }
  }

  async function handleSync() {
    setSyncBezig(true)
    setSyncResultaat(null)
    setSyncFout(null)
    try {
      const resp = await fetch('/api/vinted/sync', { method: 'POST' })
      const data = await resp.json()
      if (!resp.ok) {
        setSyncFout(data.error || 'Sync mislukt')
      } else {
        setSyncResultaat(data)
        setLaatsteSyncTijd(new Date().toISOString())
      }
    } catch {
      setSyncFout('Verbindingsfout bij sync')
    } finally {
      setSyncBezig(false)
    }
  }

  const formatSyncTijd = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold">Instellingen</h1>

        {/* Vinted Account */}
        <section className="bg-gray-900 rounded-xl p-4 space-y-4">
          <h2 className="font-semibold text-gray-200">Vinted account – jesuslata</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">E-mailadres</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@voorbeeld.com"
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Wachtwoord</label>
              <input
                type="password"
                value={wachtwoord}
                onChange={(e) => {
                  setWachtwoord(e.target.value)
                  setWachtwoordGewijzigd(true)
                }}
                placeholder={wachtwoord ? 'Wachtwoord ingesteld' : 'Wachtwoord invoeren'}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleOpslaan}
            disabled={opslaan || !email}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
          >
            {opslaan ? 'Opslaan...' : 'Opslaan'}
          </button>

          {opslaanBericht && (
            <p
              className={`text-sm text-center ${
                opslaanBericht.ok ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {opslaanBericht.tekst}
            </p>
          )}
        </section>

        {/* Sync */}
        <section className="bg-gray-900 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-200">Synchronisatie</h2>
            {laatste_sync && (
              <span className="text-xs text-gray-500">
                Laatste sync: {formatSyncTijd(laatste_sync)}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-400">
            Haalt alle verkopen op van je Vinted account en importeert ze automatisch. Bestaande
            verkopen worden niet overschreven — alleen de status wordt bijgewerkt.
          </p>

          <button
            onClick={handleSync}
            disabled={syncBezig || !email}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
          >
            {syncBezig ? 'Synchroniseren...' : 'Sync nu'}
          </button>

          {syncResultaat && (
            <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-3 space-y-1">
              <p className="text-sm text-emerald-300 font-medium">Sync voltooid</p>
              <p className="text-sm text-gray-300">
                {syncResultaat.nieuw} nieuw · {syncResultaat.bijgewerkt} bijgewerkt
              </p>
              {syncResultaat.fouten.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-red-400 font-medium">
                    {syncResultaat.fouten.length} fout(en):
                  </p>
                  {syncResultaat.fouten.slice(0, 5).map((f, i) => (
                    <p key={i} className="text-xs text-red-300">
                      {f}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {syncFout && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-300">{syncFout}</p>
            </div>
          )}
        </section>

        {/* Info */}
        <section className="bg-gray-900 rounded-xl p-4 space-y-2">
          <h2 className="font-semibold text-gray-200 text-sm">Info</h2>
          <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
            <li>Productnamen worden automatisch herkend via de listing-titel</li>
            <li>Niet-herkende producten worden geïmporteerd als "Onbekend"</li>
            <li>Je kan "Onbekend" achteraf corrigeren in Bestellingen</li>
            <li>Account 2 (disteltr) kan later worden toegevoegd</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
