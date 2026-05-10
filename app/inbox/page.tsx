'use client'

import { useEffect, useState, useCallback } from 'react'
import { PRODUCTEN, formatEuro } from '@/lib/constants'
import type { EmailIngestie } from '@/lib/supabase'

type ParsedData = {
  type?: string
  account?: string | null
  koper?: string | null
  product?: string | null
  productMapped?: string | null
  isBundel?: boolean
  bundelAantal?: number
  prijs?: number | null
  transactionId?: string | null
  bedragItem?: number | null
}

export default function InboxPage() {
  const [items, setItems] = useState<EmailIngestie[]>([])
  const [laden, setLaden] = useState(true)
  const [bezig, setBezig] = useState<string | null>(null)
  const [bewerkItem, setBewerkItem] = useState<EmailIngestie | null>(null)
  const [bundelItem, setBundelItem] = useState<EmailIngestie | null>(null)
  const [koppelItem, setKoppelItem] = useState<EmailIngestie | null>(null)

  const laad = useCallback(async () => {
    setLaden(true)
    try {
      const res = await fetch('/api/gmail/queue')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data.items || [])
    } finally {
      setLaden(false)
    }
  }, [])

  useEffect(() => {
    laad()
  }, [laad])

  async function actie(itemId: string, actie: string, body?: Record<string, unknown>) {
    setBezig(itemId)
    try {
      const res = await fetch(`/api/gmail/queue/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actie, ...body }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert('Fout: ' + (data.error || 'onbekend'))
      } else {
        await laad()
      }
    } finally {
      setBezig(null)
      setBewerkItem(null)
      setBundelItem(null)
      setKoppelItem(null)
    }
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-white mb-2">Inbox</h1>
      <p className="text-gray-400 text-sm mb-5">
        Mails uit Vinted die wachten op je goedkeuring. Auto-mode kun je aanzetten bij Instellingen.
      </p>

      {laden && <div className="text-center text-gray-500 py-16">Laden...</div>}
      {!laden && items.length === 0 && (
        <div className="text-center text-gray-500 py-16">
          🎉 Geen pending items. Alles is automatisch verwerkt of er zijn geen nieuwe Vinted-mails.
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const parsed = (item.parsed_data || {}) as ParsedData
          return (
            <div key={item.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.mail_type === 'verkoop'
                        ? 'bg-blue-900/40 text-blue-300'
                        : item.mail_type === 'verzendlabel'
                        ? 'bg-yellow-900/40 text-yellow-300'
                        : item.mail_type === 'afgerond'
                        ? 'bg-emerald-900/40 text-emerald-300'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {item.mail_type}
                  </span>
                  {item.is_bundel && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 font-medium">
                      Bundel ({item.bundel_aantal}x)
                    </span>
                  )}
                  {item.account && (
                    <span className="ml-2 text-xs text-gray-500">{item.account}</span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(item.ontvangen_op).toLocaleDateString('nl-NL', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <p className="text-sm text-gray-200 font-medium mb-1 line-clamp-2">{item.raw_subject}</p>

              <div className="text-xs text-gray-400 space-y-0.5 mb-3">
                {parsed.koper && <div>Koper: <span className="text-gray-200">{parsed.koper}</span></div>}
                {parsed.productMapped && (
                  <div>
                    Product:{' '}
                    <span className="text-gray-200">
                      {parsed.productMapped}
                      {parsed.product !== parsed.productMapped && parsed.productMapped !== 'Onbekend' && (
                        <span className="text-gray-500"> (uit &quot;{parsed.product}&quot;)</span>
                      )}
                    </span>
                  </div>
                )}
                {parsed.prijs != null && (
                  <div>
                    Prijs: <span className="text-gray-200">{formatEuro(parsed.prijs)}</span>
                  </div>
                )}
                {parsed.transactionId && (
                  <div>Transactie-ID: <span className="text-gray-200">{parsed.transactionId}</span></div>
                )}
              </div>

              {item.foutmelding && (
                <div className="text-xs text-red-400 mb-2">⚠ {item.foutmelding}</div>
              )}

              <div className="flex gap-2">
                {item.mail_type === 'verkoop' && !item.is_bundel && (
                  <>
                    <button
                      onClick={() => actie(item.id, 'akkoord')}
                      disabled={bezig === item.id}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                    >
                      Akkoord
                    </button>
                    <button
                      onClick={() => setBewerkItem(item)}
                      disabled={bezig === item.id}
                      className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-200 text-sm font-medium disabled:opacity-50"
                    >
                      Bewerken
                    </button>
                  </>
                )}
                {item.mail_type === 'verkoop' && item.is_bundel && (
                  <button
                    onClick={() => setBundelItem(item)}
                    disabled={bezig === item.id}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    Bundel splitsen ({item.bundel_aantal}×)
                  </button>
                )}
                {(item.mail_type === 'afgerond' || item.mail_type === 'retour') && (
                  <button
                    onClick={() => setKoppelItem(item)}
                    disabled={bezig === item.id}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    Koppel verkoop
                  </button>
                )}
                <button
                  onClick={() => actie(item.id, 'afwijzen')}
                  disabled={bezig === item.id}
                  className="px-4 py-2 rounded-lg bg-red-900/40 text-red-300 text-sm font-medium disabled:opacity-50"
                >
                  Afwijzen
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {bewerkItem && (
        <BewerkModal
          item={bewerkItem}
          onCancel={() => setBewerkItem(null)}
          onConfirm={(overrides) => actie(bewerkItem.id, 'akkoord', { overrides })}
        />
      )}

      {bundelItem && (
        <BundelModal
          item={bundelItem}
          onCancel={() => setBundelItem(null)}
          onConfirm={(regels) => actie(bundelItem.id, 'akkoord-bundel', { regels })}
        />
      )}

      {koppelItem && (
        <KoppelModal
          item={koppelItem}
          onCancel={() => setKoppelItem(null)}
          onConfirm={(verkoop_id) => actie(koppelItem.id, 'koppel-verkoop', { verkoop_id })}
        />
      )}
    </div>
  )
}

function BewerkModal({
  item,
  onCancel,
  onConfirm,
}: {
  item: EmailIngestie
  onCancel: () => void
  onConfirm: (overrides: Record<string, unknown>) => void
}) {
  const parsed = (item.parsed_data || {}) as ParsedData
  const [product, setProduct] = useState(parsed.productMapped && parsed.productMapped !== 'Onbekend' ? parsed.productMapped : PRODUCTEN[0])
  const [koper, setKoper] = useState(parsed.koper || '')
  const [prijs, setPrijs] = useState(parsed.prijs?.toString() || '')

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-2">
      <div className="bg-gray-900 rounded-t-2xl pt-6 px-6 pb-24 w-full max-w-lg">
        <h2 className="text-white text-lg font-semibold mb-4">Bewerken vóór goedkeuring</h2>
        <div className="space-y-3">
          <div>
            <label className="text-gray-400 text-sm">Product</label>
            <select value={product} onChange={(e) => setProduct(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 mt-1">
              {PRODUCTEN.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-sm">Koper</label>
            <input value={koper} onChange={(e) => setKoper(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 mt-1" />
          </div>
          <div>
            <label className="text-gray-400 text-sm">Prijs (€)</label>
            <input type="number" step="0.01" value={prijs} onChange={(e) => setPrijs(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 mt-1" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-medium">
            Annuleren
          </button>
          <button
            onClick={() =>
              onConfirm({
                product,
                naam_koper: koper,
                verkoopprijs: parseFloat(prijs),
              })
            }
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium"
          >
            Toevoegen
          </button>
        </div>
      </div>
    </div>
  )
}

function BundelModal({
  item,
  onCancel,
  onConfirm,
}: {
  item: EmailIngestie
  onCancel: () => void
  onConfirm: (regels: { product: string }[]) => void
}) {
  const parsed = (item.parsed_data || {}) as ParsedData
  const aantal = item.bundel_aantal || parsed.bundelAantal || 2
  const totaalPrijs = parsed.prijs || 0
  const [regels, setRegels] = useState<string[]>(Array(aantal).fill(PRODUCTEN[0]))

  function update(i: number, val: string) {
    setRegels((prev) => prev.map((r, idx) => (idx === i ? val : r)))
  }

  const prijsPerRegel = (totaalPrijs / aantal).toFixed(2)

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-2">
      <div className="bg-gray-900 rounded-t-2xl pt-6 px-6 pb-24 w-full max-w-lg overflow-y-auto max-h-[95vh]">
        <h2 className="text-white text-lg font-semibold mb-2">Bundel splitsen</h2>
        <p className="text-gray-400 text-sm mb-4">
          {parsed.koper} kocht een bundel van {aantal} items voor {formatEuro(totaalPrijs)}.
          Selecteer welke producten in de bundel zaten — elk wordt {formatEuro(parseFloat(prijsPerRegel))}.
        </p>
        <div className="space-y-2">
          {regels.map((r, i) => (
            <div key={i}>
              <label className="text-gray-400 text-xs">Item {i + 1}</label>
              <select
                value={r}
                onChange={(e) => update(i, e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 mt-1"
              >
                {PRODUCTEN.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-medium">
            Annuleren
          </button>
          <button
            onClick={() => onConfirm(regels.map((p) => ({ product: p })))}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-medium"
          >
            {aantal} verkopen aanmaken
          </button>
        </div>
      </div>
    </div>
  )
}

type VerkoopOption = {
  id: string
  verkoopdatum: string
  product: string
  naam_koper: string
  verkoopprijs: number
  status: string
  account: string
}

function KoppelModal({
  item,
  onCancel,
  onConfirm,
}: {
  item: EmailIngestie
  onCancel: () => void
  onConfirm: (verkoop_id: string) => void
}) {
  const parsed = (item.parsed_data || {}) as ParsedData
  const [verkopen, setVerkopen] = useState<VerkoopOption[]>([])
  const [laden, setLaden] = useState(true)
  const [zoek, setZoek] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/verkopen')
      .then((r) => r.json())
      .then((data: VerkoopOption[]) => {
        if (cancelled) return
        // Filter: zelfde account, niet-afgeronde status. Sorteer recent eerst.
        const filtered = data
          .filter((v) =>
            v.account === item.account &&
            ['Verkocht - Nog niet verzonden', 'Onderweg'].includes(v.status)
          )
          .sort((a, b) => b.verkoopdatum.localeCompare(a.verkoopdatum))
        setVerkopen(filtered)
        setLaden(false)
      })
      .catch(() => setLaden(false))
    return () => {
      cancelled = true
    }
  }, [item.account])

  const lower = zoek.toLowerCase()
  const zichtbaar = lower
    ? verkopen.filter(
        (v) =>
          v.product.toLowerCase().includes(lower) ||
          v.naam_koper.toLowerCase().includes(lower) ||
          v.verkoopprijs.toString().includes(lower)
      )
    : verkopen

  const isRetour = item.mail_type === 'retour'
  const titel = isRetour ? 'Koppel retour aan verkoop' : 'Koppel afgerond aan verkoop'

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-2">
      <div className="bg-gray-900 rounded-t-2xl pt-6 px-6 pb-24 w-full max-w-lg overflow-y-auto max-h-[95vh]">
        <h2 className="text-white text-lg font-semibold mb-1">{titel}</h2>
        <p className="text-gray-400 text-xs mb-3">
          Vinted-mail: <span className="text-gray-200">{parsed.productMapped || parsed.product || '?'}</span>
          {parsed.bedragItem != null && <> · {formatEuro(parsed.bedragItem)}</>}
          {parsed.transactionId && <> · tx #{parsed.transactionId}</>}
        </p>
        <input
          type="text"
          placeholder="Zoek op product, koper of prijs..."
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 mb-3"
          autoFocus
        />
        <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
          {laden && <div className="text-center text-gray-500 py-4">Verkopen laden...</div>}
          {!laden && zichtbaar.length === 0 && (
            <div className="text-center text-gray-500 py-4 text-sm">
              Geen openstaande verkopen voor {item.account}.
            </div>
          )}
          {zichtbaar.map((v) => (
            <button
              key={v.id}
              onClick={() => onConfirm(v.id)}
              className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-4 py-3 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-gray-200 text-sm font-medium">{v.product}</p>
                  <p className="text-gray-500 text-xs">{v.naam_koper} · {formatEuro(v.verkoopprijs)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">{v.verkoopdatum}</p>
                  <p className="text-gray-500 text-xs">{v.status}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="w-full py-3 rounded-xl bg-gray-700 text-white font-medium"
        >
          Annuleren
        </button>
      </div>
    </div>
  )
}
