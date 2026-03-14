'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { parseResoledOutput } from '@/lib/vinted-client'

interface SyncResultaat {
  nieuw: number
  bijgewerkt: number
  fouten: string[]
}

type CommissieRegels = { drempel1: number; commissie1: number; drempel2: number; commissie2: number; extraStap: number; extraBedrag: number }
const DEFAULT_REGELS: CommissieRegels = { drempel1: 30, commissie1: 3, drempel2: 35, commissie2: 5, extraStap: 5, extraBedrag: 2.5 }

export default function InstellingenPage() {
  const router = useRouter()
  const [rawInput, setRawInput] = useState('')
  const [heeftToken, setHeeftToken] = useState(false)
  const [opslaan, setOpslaan] = useState(false)
  const [opslaanBericht, setOpslaanBericht] = useState<{ ok: boolean; tekst: string } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const [syncBezig, setSyncBezig] = useState(false)
  const [syncResultaat, setSyncResultaat] = useState<SyncResultaat | null>(null)
  const [syncFout, setSyncFout] = useState<string | null>(null)

  const [laatste_sync, setLaatsteSyncTijd] = useState<string | null>(null)

  const [commRegels, setCommRegels] = useState<CommissieRegels>(DEFAULT_REGELS)
  const [commOpslaan, setCommOpslaan] = useState(false)
  const [commBericht, setCommBericht] = useState<{ ok: boolean; tekst: string } | null>(null)

  useEffect(() => {
    fetch('/api/instellingen')
      .then((r) => r.json())
      .then((data) => {
        const rows: { sleutel: string; waarde: string }[] = data.instellingen || []
        const map = Object.fromEntries(rows.map((r) => [r.sleutel, r.waarde]))
        if (map.vinted_access_token) setHeeftToken(true)
        if (map.laatste_sync) setLaatsteSyncTijd(map.laatste_sync)
        if (map.commissie_regels) {
          try { setCommRegels({ ...DEFAULT_REGELS, ...JSON.parse(map.commissie_regels) }) } catch { /* gebruik default */ }
        }
      })
      .catch(() => {})
  }, [])

  async function handleCommOpslaaan() {
    setCommOpslaan(true)
    setCommBericht(null)
    try {
      await fetch('/api/instellingen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleutel: 'commissie_regels', waarde: JSON.stringify(commRegels) }),
      })
      setCommBericht({ ok: true, tekst: 'Commissie opgeslagen' })
    } catch {
      setCommBericht({ ok: false, tekst: 'Opslaan mislukt' })
    } finally {
      setCommOpslaan(false)
    }
  }

  function updateComm(key: keyof CommissieRegels, val: string) {
    const n = parseFloat(val)
    if (!isNaN(n)) setCommRegels((r) => ({ ...r, [key]: n }))
  }

  async function handleOpslaan() {
    setParseError(null)
    setOpslaanBericht(null)

    const parsed = parseResoledOutput(rawInput)
    if (!parsed) {
      setParseError('Kan de tokens niet herkennen. Kopieer de volledige output van de Resoled Token Tool.')
      return
    }

    setOpslaan(true)
    try {
      await Promise.all([
        fetch('/api/instellingen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sleutel: 'vinted_access_token', waarde: parsed.accessToken }),
        }),
        fetch('/api/instellingen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sleutel: 'vinted_refresh_token', waarde: parsed.refreshToken }),
        }),
        fetch('/api/instellingen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sleutel: 'vinted_xcsrf_token', waarde: parsed.xcsrfToken }),
        }),
      ])
      setOpslaanBericht({ ok: true, tekst: 'Tokens opgeslagen' })
      setHeeftToken(true)
      setRawInput('')
    } catch {
      setOpslaanBericht({ ok: false, tekst: 'Opslaan mislukt' })
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
      if (!resp.ok) setSyncFout(data.error || 'Sync mislukt')
      else {
        setSyncResultaat(data)
        setLaatsteSyncTijd(new Date().toISOString())
      }
    } catch {
      setSyncFout('Verbindingsfout bij sync')
    } finally {
      setSyncBezig(false)
    }
  }

  const formatSyncTijd = (iso: string) =>
    new Date(iso).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold">Instellingen</h1>

        {/* Token invoer */}
        <section className="bg-gray-900 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-200">Vinted tokens – jesuslata</h2>
            {heeftToken && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block" />
                Ingesteld
              </span>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-3 space-y-1 text-xs text-gray-400">
            <p className="font-medium text-gray-300">Stappen:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Open de <span className="text-white font-medium">Resoled Token Tool</span> Chrome extensie op Vinted</li>
              <li>Klik "Copy" of kopieer de volledige output</li>
              <li>Plak hieronder en klik Opslaan</li>
            </ol>
            <p className="text-gray-500 pt-1">
              Tokens worden automatisch vernieuwd (~7 dagen geldig).
              Alleen na een week moet je nieuwe tokens plakken.
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Resoled Token Tool output
            </label>
            <textarea
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value)
                setParseError(null)
                setOpslaanBericht(null)
              }}
              rows={4}
              placeholder="Bearer access_token: eyJ... refresh_token: eyJ... xcsrf_token: ..."
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-xs font-mono border border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {parseError && <p className="text-xs text-red-400">{parseError}</p>}

          <button
            onClick={handleOpslaan}
            disabled={opslaan || !rawInput.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
          >
            {opslaan ? 'Opslaan...' : 'Opslaan'}
          </button>

          {opslaanBericht && (
            <p className={`text-sm text-center ${opslaanBericht.ok ? 'text-emerald-400' : 'text-red-400'}`}>
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
            Haalt alle verkopen op en importeert ze automatisch. Alleen de status van bestaande
            verkopen wordt bijgewerkt.
          </p>

          <button
            onClick={handleSync}
            disabled={syncBezig || !heeftToken}
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
                  <p className="text-xs text-red-400 font-medium">{syncResultaat.fouten.length} fout(en):</p>
                  {syncResultaat.fouten.slice(0, 5).map((f, i) => (
                    <p key={i} className="text-xs text-red-300">{f}</p>
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

        {/* Commissie regels Jasmijn */}
        <section className="bg-gray-900 rounded-xl p-4 space-y-4">
          <h2 className="font-semibold text-gray-200">Commissie Jasmijn</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Drempel 1 (€)</label>
              <input type="number" step="0.5" value={commRegels.drempel1} onChange={(e) => updateComm('drempel1', e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Commissie bij drempel 1 (€)</label>
              <input type="number" step="0.5" value={commRegels.commissie1} onChange={(e) => updateComm('commissie1', e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Drempel 2 (€)</label>
              <input type="number" step="0.5" value={commRegels.drempel2} onChange={(e) => updateComm('drempel2', e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Commissie bij drempel 2 (€)</label>
              <input type="number" step="0.5" value={commRegels.commissie2} onChange={(e) => updateComm('commissie2', e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Extra stap (€)</label>
              <input type="number" step="0.5" value={commRegels.extraStap} onChange={(e) => updateComm('extraStap', e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Extra commissie per stap (€)</label>
              <input type="number" step="0.5" value={commRegels.extraBedrag} onChange={(e) => updateComm('extraBedrag', e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Huidig: &lt;€{commRegels.drempel1} = €0 · €{commRegels.drempel1}–{commRegels.drempel2 - 0.01} = €{commRegels.commissie1} · €{commRegels.drempel2}+ = €{commRegels.commissie2} + €{commRegels.extraBedrag} per €{commRegels.extraStap}
          </p>
          <button onClick={handleCommOpslaaan} disabled={commOpslaan}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors">
            {commOpslaan ? 'Opslaan...' : 'Opslaan'}
          </button>
          {commBericht && (
            <p className={`text-sm text-center ${commBericht.ok ? 'text-emerald-400' : 'text-red-400'}`}>{commBericht.tekst}</p>
          )}
        </section>

        {/* Info */}
        <section className="bg-gray-900 rounded-xl p-4 space-y-2">
          <h2 className="font-semibold text-gray-200 text-sm">Info</h2>
          <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
            <li>Productnamen worden herkend via de listing-titel (keyword matching)</li>
            <li>Niet-herkende producten verschijnen als "Onbekend" — corrigeerbaar in Bestellingen</li>
            <li>Handmatig ingevoerde verkopen worden nooit overschreven</li>
            <li>Account 2 (disteltr) kan later worden toegevoegd</li>
          </ul>
        </section>

        {/* Uitloggen */}
        <section className="bg-gray-900 rounded-xl p-4">
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              router.push('/login')
            }}
            className="w-full bg-gray-800 hover:bg-red-900/40 text-red-400 hover:text-red-300 font-medium rounded-lg py-2.5 text-sm transition-colors border border-gray-700 hover:border-red-800"
          >
            Uitloggen
          </button>
        </section>
      </div>
    </main>
  )
}
