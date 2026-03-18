'use client'

import { useEffect, useState, useCallback } from 'react'
import { PRODUCTEN } from '@/lib/constants'

type Inkoop = {
  id: string
  besteldatum: string
  product: string
  aantal: number
  status: string
  totale_aankoopprijs: number
  prijs_per_stuk: number
}

type ExtraKost = {
  id: string
  datum: string
  omschrijving: string
  bedrag: number
}

export default function InkopenPage() {
  const [inkopen, setInkopen] = useState<Inkoop[]>([])
  const [extraKosten, setExtraKosten] = useState<ExtraKost[]>([])
  const [isCEO, setIsCEO] = useState(true)
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState('')
  const vandaag = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState<{
    besteldatum: string
    product: typeof PRODUCTEN[number]
    aantal: string
    totale_aankoopprijs: string
    status: string
  }>({
    besteldatum: vandaag,
    product: PRODUCTEN[0],
    aantal: '1',
    totale_aankoopprijs: '',
    status: 'Onderweg',
  })
  const [kostForm, setKostForm] = useState({ datum: vandaag, omschrijving: '', bedrag: '' })
  const [bezig, setBezig] = useState(false)
  const [bericht, setBericht] = useState<{ type: 'succes' | 'fout'; tekst: string } | null>(null)
  const [kostBericht, setKostBericht] = useState<{ type: 'succes' | 'fout'; tekst: string } | null>(null)
  const [tabblad, setTabblad] = useState<'inkoop' | 'extra-kosten'>('inkoop')
  const [bewerkInkoop, setBewerkInkoop] = useState<Inkoop | null>(null)
  const [verwijderInkoop, setVerwijderInkoop] = useState<string | null>(null)

  const laadData = useCallback(async () => {
    setLaden(true)
    try {
      const [inkoopRes, kostRes] = await Promise.all([
        fetch('/api/inkopen'),
        fetch('/api/extra-kosten'),
      ])
      const inkoopData = await inkoopRes.json()
      const kostData = await kostRes.json()

      if (inkoopData.error) setFout(inkoopData.error)
      else setInkopen(inkoopData)

      if (!kostData.error) setExtraKosten(kostData)
    } catch {
      setFout('Kon data niet laden')
    } finally {
      setLaden(false)
    }
  }, [])

  useEffect(() => {
    laadData()
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setIsCEO(d.isCEO))
  }, [laadData])

  const prijsPerStuk =
    Number(form.aantal) > 0 && Number(form.totale_aankoopprijs) > 0
      ? (Number(form.totale_aankoopprijs) / Number(form.aantal)).toFixed(2)
      : '—'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setBericht(null)

    try {
      const res = await fetch('/api/inkopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setBericht({ type: 'fout', tekst: data.error || 'Er ging iets mis' })
      } else {
        setBericht({
          type: 'succes',
          tekst: `${form.aantal}x ${form.product} (${form.status}) toegevoegd!`,
        })
        setForm({
          besteldatum: vandaag,
          product: PRODUCTEN[0],
          aantal: '1',
          totale_aankoopprijs: '',
          status: 'Onderweg',
        })
        laadData()
      }
    } catch {
      setBericht({ type: 'fout', tekst: 'Kon verbinding niet maken' })
    } finally {
      setBezig(false)
    }
  }

  async function handleSubmitKost(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setKostBericht(null)
    try {
      const res = await fetch('/api/extra-kosten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kostForm),
      })
      const data = await res.json()
      if (!res.ok) {
        setKostBericht({ type: 'fout', tekst: data.error || 'Er ging iets mis' })
      } else {
        setKostBericht({ type: 'succes', tekst: `${kostForm.omschrijving} (€${kostForm.bedrag}) toegevoegd!` })
        setKostForm({ datum: vandaag, omschrijving: '', bedrag: '' })
        laadData()
      }
    } catch {
      setKostBericht({ type: 'fout', tekst: 'Kon verbinding niet maken' })
    } finally {
      setBezig(false)
    }
  }

  async function verwijderKost(id: string) {
    setBezig(true)
    try {
      const res = await fetch(`/api/extra-kosten/${id}`, { method: 'DELETE' })
      if (res.ok) laadData()
    } finally {
      setBezig(false)
    }
  }

  async function slaInkoopOp(inkoop: Inkoop) {
    setBezig(true)
    try {
      const res = await fetch(`/api/inkopen/${inkoop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inkoop),
      })
      if (res.ok) {
        setBewerkInkoop(null)
        laadData()
      }
    } finally {
      setBezig(false)
    }
  }

  async function verwijderInkoopItem(id: string) {
    setBezig(true)
    try {
      const res = await fetch(`/api/inkopen/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setVerwijderInkoop(null)
        laadData()
      }
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-white mb-4">Inkopen</h1>

      {/* Tabbladen */}
      <div className="flex gap-1 mb-5 bg-gray-800 rounded-xl p-1">
        <button
          onClick={() => setTabblad('inkoop')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
            tabblad === 'inkoop' ? 'bg-blue-600 text-white' : 'text-gray-400'
          }`}
        >
          Inkoop
        </button>
        <button
          onClick={() => setTabblad('extra-kosten')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
            tabblad === 'extra-kosten' ? 'bg-blue-600 text-white' : 'text-gray-400'
          }`}
        >
          Extra kosten
        </button>
      </div>

      {laden && <div className="text-center text-gray-400 py-16">Laden...</div>}
      {fout && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 mb-4">
          {fout}
        </div>
      )}

      {/* ── Inkoop tab ── */}
      {tabblad === 'inkoop' && !laden && (
        <div>
          {bericht && (
            <div
              className={`rounded-xl p-4 mb-5 text-sm font-medium ${
                bericht.type === 'succes'
                  ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300'
                  : 'bg-red-900/40 border border-red-700 text-red-300'
              }`}
            >
              {bericht.tekst}
            </div>
          )}

          {isCEO && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-8">
              <Veld label="Besteldatum">
                <input
                  type="date"
                  value={form.besteldatum}
                  onChange={(e) => { setBericht(null); setForm((p) => ({ ...p, besteldatum: e.target.value })) }}
                  className="veld-input"
                  required
                />
              </Veld>

              <Veld label="Product">
                <select
                  value={form.product}
                  onChange={(e) => { setBericht(null); setForm((p) => ({ ...p, product: e.target.value as typeof PRODUCTEN[number] })) }}
                  className="veld-input"
                  required
                >
                  {PRODUCTEN.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Veld>

              <Veld label="Aantal stuks">
                <input
                  type="number"
                  value={form.aantal}
                  onChange={(e) => { setBericht(null); setForm((p) => ({ ...p, aantal: e.target.value })) }}
                  className="veld-input"
                  required
                  min="1"
                  inputMode="numeric"
                />
              </Veld>

              <Veld label="Totale aankoopprijs (€)">
                <input
                  type="number"
                  value={form.totale_aankoopprijs}
                  onChange={(e) => { setBericht(null); setForm((p) => ({ ...p, totale_aankoopprijs: e.target.value })) }}
                  placeholder="0.00"
                  className="veld-input"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                />
              </Veld>

              {prijsPerStuk !== '—' && (
                <p className="text-gray-400 text-sm px-1">
                  Prijs per stuk: <span className="text-white font-medium">€{prijsPerStuk}</span>
                </p>
              )}

              <Veld label="Status">
                <select
                  value={form.status}
                  onChange={(e) => { setBericht(null); setForm((p) => ({ ...p, status: e.target.value })) }}
                  className="veld-input"
                  required
                >
                  <option value="Onderweg">Onderweg</option>
                  <option value="In Huis">In Huis</option>
                </select>
              </Veld>

              <button
                type="submit"
                disabled={bezig}
                className="w-full py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold disabled:opacity-50 active:bg-blue-700 transition-colors"
              >
                {bezig ? 'Bezig...' : 'Toevoegen'}
              </button>
            </form>
          )}

          {/* Recente inkopen */}
          {inkopen.filter((i) => i.status !== 'Beginsaldo').length > 0 && (
            <>
              <h2 className="text-white font-semibold mb-2">Recente inkopen</h2>
              <div className="space-y-2">
                {inkopen.filter((i) => i.status !== 'Beginsaldo').slice(0, 20).map((inkoop) => (
                  <div key={inkoop.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-gray-200 text-sm font-medium">
                        {inkoop.aantal}x {inkoop.product}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(inkoop.besteldatum).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          inkoop.status === 'In Huis' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-yellow-900/40 text-yellow-400'
                        }`}>
                          {inkoop.status}
                        </span>
                        {inkoop.prijs_per_stuk > 0 && (
                          <p className="text-gray-400 text-xs mt-0.5">€{inkoop.prijs_per_stuk.toFixed(2)}/stuk</p>
                        )}
                      </div>
                      {isCEO && (
                        <>
                          <button
                            onClick={() => setBewerkInkoop(inkoop)}
                            className="p-1.5 rounded-lg bg-gray-700 text-blue-400 active:bg-gray-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setVerwijderInkoop(inkoop.id)}
                            className="p-1.5 rounded-lg bg-gray-700 text-red-400 active:bg-gray-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Bewerk modal */}
          {bewerkInkoop && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center">
              <div className="bg-gray-900 rounded-t-2xl pt-6 px-6 pb-24 w-full max-w-lg overflow-y-auto max-h-[95vh]">
                <h2 className="text-white text-lg font-semibold mb-4">Inkoop bewerken</h2>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-gray-400 text-sm">Datum</label>
                    <input type="date" value={bewerkInkoop.besteldatum}
                      onChange={(e) => setBewerkInkoop({ ...bewerkInkoop, besteldatum: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 text-sm">Product</label>
                    <select value={bewerkInkoop.product}
                      onChange={(e) => setBewerkInkoop({ ...bewerkInkoop, product: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3">
                      {PRODUCTEN.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-gray-400 text-sm">Aantal</label>
                      <input type="number" value={bewerkInkoop.aantal} min="1"
                        onChange={(e) => setBewerkInkoop({ ...bewerkInkoop, aantal: Number(e.target.value) })}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-gray-400 text-sm">Totaalprijs (€)</label>
                      <input type="number" value={bewerkInkoop.totale_aankoopprijs} min="0" step="0.01"
                        onChange={(e) => setBewerkInkoop({ ...bewerkInkoop, totale_aankoopprijs: Number(e.target.value) })}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 text-sm">Status</label>
                    <select value={bewerkInkoop.status}
                      onChange={(e) => setBewerkInkoop({ ...bewerkInkoop, status: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3">
                      <option value="Onderweg">Onderweg</option>
                      <option value="In Huis">In Huis</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setBewerkInkoop(null)}
                    className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-medium">
                    Annuleren
                  </button>
                  <button onClick={() => slaInkoopOp(bewerkInkoop)} disabled={bezig}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50">
                    {bezig ? 'Bezig...' : 'Opslaan'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Verwijder bevestiging */}
          {verwijderInkoop && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
                <h2 className="text-white text-lg font-semibold mb-2">Inkoop verwijderen?</h2>
                <p className="text-gray-400 text-sm mb-5">Dit kan niet ongedaan worden gemaakt.</p>
                <div className="flex gap-3">
                  <button onClick={() => setVerwijderInkoop(null)}
                    className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-medium">
                    Annuleren
                  </button>
                  <button onClick={() => verwijderInkoopItem(verwijderInkoop)} disabled={bezig}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium disabled:opacity-50">
                    {bezig ? 'Bezig...' : 'Verwijderen'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Extra kosten tab ── */}
      {tabblad === 'extra-kosten' && !laden && (
        <div>
          {kostBericht && (
            <div className={`rounded-xl p-4 mb-5 text-sm font-medium ${
              kostBericht.type === 'succes'
                ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300'
                : 'bg-red-900/40 border border-red-700 text-red-300'
            }`}>
              {kostBericht.tekst}
            </div>
          )}

          {isCEO && (
            <form onSubmit={handleSubmitKost} className="space-y-4 mb-6">
              <Veld label="Datum">
                <input type="date" value={kostForm.datum}
                  onChange={(e) => setKostForm((p) => ({ ...p, datum: e.target.value }))}
                  className="veld-input" required />
              </Veld>
              <Veld label="Omschrijving">
                <input type="text" value={kostForm.omschrijving}
                  onChange={(e) => setKostForm((p) => ({ ...p, omschrijving: e.target.value }))}
                  placeholder="bv. Verzendzakjes, Tape..."
                  className="veld-input" required />
              </Veld>
              <Veld label="Bedrag (€)">
                <input type="number" value={kostForm.bedrag}
                  onChange={(e) => setKostForm((p) => ({ ...p, bedrag: e.target.value }))}
                  placeholder="0.00" className="veld-input" min="0" step="0.01"
                  inputMode="decimal" required />
              </Veld>
              <button type="submit" disabled={bezig}
                className="w-full py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold disabled:opacity-50 active:bg-blue-700 transition-colors">
                {bezig ? 'Bezig...' : 'Toevoegen'}
              </button>
            </form>
          )}

          {extraKosten.length > 0 && (
            <>
              <h2 className="text-white font-semibold mb-2">Overzicht extra kosten</h2>
              <div className="space-y-2">
                {extraKosten.map((k) => (
                  <div key={k.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-gray-200 text-sm font-medium">{k.omschrijving}</p>
                      <p className="text-gray-500 text-xs">{new Date(k.datum).toLocaleDateString('nl-NL')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 font-semibold text-sm">− €{k.bedrag.toFixed(2)}</span>
                      {isCEO && (
                        <button onClick={() => verwijderKost(k.id)} disabled={bezig}
                          className="p-1.5 rounded-lg bg-gray-700 text-red-400 active:bg-gray-600 disabled:opacity-50">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        .veld-input {
          width: 100%;
          background: #1f2937;
          border: 1px solid #374151;
          color: white;
          border-radius: 0.75rem;
          padding: 0.875rem 1rem;
          font-size: 1rem;
          outline: none;
        }
        .veld-input:focus {
          border-color: #3b82f6;
        }
        .veld-input option {
          background: #1f2937;
        }
      `}</style>
    </div>
  )
}

function Veld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-gray-400 text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}
