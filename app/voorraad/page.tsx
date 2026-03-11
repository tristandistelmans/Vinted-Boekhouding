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

type VoorraadItem = {
  product: string
  in_huis: number
  onderweg: number
}

export default function VoorraadPage() {
  const [inkopen, setInkopen] = useState<Inkoop[]>([])
  const [voorraad, setVooraad] = useState<VoorraadItem[]>([])
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState('')
  const vandaag = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    besteldatum: vandaag,
    product: PRODUCTEN[0],
    aantal: '1',
    totale_aankoopprijs: '',
    status: 'In Huis',
  })
  const [bezig, setBezig] = useState(false)
  const [bericht, setBericht] = useState<{ type: 'succes' | 'fout'; tekst: string } | null>(null)
  const [tabblad, setTabblad] = useState<'overzicht' | 'bestelling'>('overzicht')

  const laadData = useCallback(async () => {
    setLaden(true)
    try {
      const [inkoopRes, statsRes] = await Promise.all([
        fetch('/api/inkopen'),
        fetch('/api/stats'),
      ])
      const inkoopData = await inkoopRes.json()
      const statsData = await statsRes.json()

      if (inkoopData.error) setFout(inkoopData.error)
      else setInkopen(inkoopData)

      if (statsData.voorraad) setVooraad(statsData.voorraad)
    } catch {
      setFout('Kon data niet laden')
    } finally {
      setLaden(false)
    }
  }, [])

  useEffect(() => {
    laadData()
  }, [laadData])

  function updateForm(key: string, value: string) {
    setBericht(null)
    if (key === 'aantal' || key === 'totale_aankoopprijs') {
      setForm((prev) => ({ ...prev, [key]: value }))
    } else {
      setForm((prev) => ({ ...prev, [key]: value }))
    }
  }

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
          status: 'In Huis',
        })
        laadData()
      }
    } catch {
      setBericht({ type: 'fout', tekst: 'Kon verbinding niet maken' })
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-white mb-4">Voorraad</h1>

      {/* Tabbladen */}
      <div className="flex gap-2 mb-5 bg-gray-800 rounded-xl p-1">
        <button
          onClick={() => setTabblad('overzicht')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tabblad === 'overzicht' ? 'bg-blue-600 text-white' : 'text-gray-400'
          }`}
        >
          Overzicht
        </button>
        <button
          onClick={() => setTabblad('bestelling')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tabblad === 'bestelling' ? 'bg-blue-600 text-white' : 'text-gray-400'
          }`}
        >
          Inkoop toevoegen
        </button>
      </div>

      {laden && <div className="text-center text-gray-400 py-16">Laden...</div>}
      {fout && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 mb-4">
          {fout}
        </div>
      )}

      {tabblad === 'overzicht' && !laden && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 px-1 mb-1">
            <span className="text-gray-500 text-xs font-medium">Product</span>
            <span className="text-gray-500 text-xs font-medium text-center">In huis</span>
            <span className="text-gray-500 text-xs font-medium text-center">Onderweg</span>
          </div>
          {voorraad.map((item) => (
            <div
              key={item.product}
              className={`bg-gray-800 rounded-xl px-4 py-3 grid grid-cols-3 gap-2 items-center ${
                item.in_huis === 0 && item.onderweg === 0 ? 'opacity-40' : ''
              }`}
            >
              <span className="text-gray-200 text-sm">{item.product}</span>
              <span
                className={`text-center font-bold ${
                  item.in_huis > 0 ? 'text-emerald-400' : 'text-gray-600'
                }`}
              >
                {item.in_huis}
              </span>
              <span
                className={`text-center font-bold ${
                  item.onderweg > 0 ? 'text-yellow-400' : 'text-gray-600'
                }`}
              >
                {item.onderweg}
              </span>
            </div>
          ))}

          {/* Recente inkopen */}
          {inkopen.filter((i) => i.status !== 'Beginsaldo').length > 0 && (
            <>
              <h2 className="text-white font-semibold mt-5 mb-2">Recente inkopen</h2>
              {inkopen.filter((i) => i.status !== 'Beginsaldo').slice(0, 10).map((inkoop) => (
                <div key={inkoop.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-gray-200 text-sm font-medium">
                      {inkoop.aantal}x {inkoop.product}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(inkoop.besteldatum).toLocaleDateString('nl-NL')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        inkoop.status === 'In Huis'
                          ? 'bg-emerald-900/40 text-emerald-400'
                          : 'bg-yellow-900/40 text-yellow-400'
                      }`}
                    >
                      {inkoop.status}
                    </span>
                    {inkoop.prijs_per_stuk > 0 && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        €{inkoop.prijs_per_stuk.toFixed(2)}/stuk
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tabblad === 'bestelling' && (
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <Veld label="Besteldatum">
              <input
                type="date"
                value={form.besteldatum}
                onChange={(e) => updateForm('besteldatum', e.target.value)}
                className="veld-input"
                required
              />
            </Veld>

            <Veld label="Product">
              <select
                value={form.product}
                onChange={(e) => updateForm('product', e.target.value)}
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
                onChange={(e) => updateForm('aantal', e.target.value)}
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
                onChange={(e) => updateForm('totale_aankoopprijs', e.target.value)}
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
                onChange={(e) => updateForm('status', e.target.value)}
                className="veld-input"
                required
              >
                <option value="In Huis">In Huis</option>
                <option value="Onderweg">Onderweg</option>
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
