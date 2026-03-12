'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { PRODUCTEN, STATUSSEN, formatEuro, formatDatum } from '@/lib/constants'

type Verkoop = {
  id: string
  verkoopdatum: string
  product: string
  naam_koper: string
  verkoopprijs: number
  status: string
  account: string
  winst: number | null
  aankoopprijs: number
  notitie?: string | null
}

const ACTIEVE_STATUSSEN = ['Verkocht - Nog niet verzonden', 'Onderweg', 'Retour', 'Probleem']

function statusKleur(status: string): string {
  switch (status) {
    case 'Afgerond (geld binnen)': return 'text-emerald-500'
    case 'Onderweg': return 'text-blue-400'
    case 'Retour':
    case 'Retour ontvangen': return 'text-orange-400'
    case 'Verlies':
    case 'Probleem': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

function statusKort(status: string): string {
  switch (status) {
    case 'Afgerond (geld binnen)': return 'Afgerond'
    case 'Verkocht - Nog niet verzonden': return 'Nog verzenden'
    case 'Retour ontvangen': return 'Retour ontvangen'
    default: return status
  }
}

function productSlug(product: string): string {
  return product.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function ProductAfbeelding({ product }: { product: string }) {
  const [fout, setFout] = useState(false)
  const slug = productSlug(product)
  const src = `/products/${slug}/1.jpg`

  if (!fout) {
    return (
      <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
        <Image
          src={src}
          alt={product}
          width={44}
          height={44}
          className="object-cover w-full h-full"
          onError={() => setFout(true)}
        />
      </div>
    )
  }

  const initialen = product.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div className="w-11 h-11 rounded-lg flex-shrink-0 bg-gray-700 flex items-center justify-center">
      <span className="text-gray-400 text-xs font-semibold">{initialen}</span>
    </div>
  )
}

export default function VerkopBeheren() {
  const [verkopen, setVerkopen] = useState<Verkoop[]>([])
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState('')
  const [filterStatus, setFilterStatus] = useState('alle')
  const [filterProduct, setFilterProduct] = useState('alle')
  const [filterMaand, setFilterMaand] = useState('alle')
  const [zoekterm, setZoekterm] = useState('')
  const [verwijderBevestig, setVerwijderBevestig] = useState<string | null>(null)
  const [statusBezig, setStatusBezig] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)
  const [prijsEdit, setPrijsEdit] = useState<{ id: string; waarde: string } | null>(null)
  const [notitieEdit, setNotitieEdit] = useState<{ id: string; waarde: string } | null>(null)

  const laadVerkopen = useCallback(async () => {
    setLaden(true)
    try {
      const res = await fetch('/api/verkopen')
      const data = await res.json()
      if (data.error) setFout(data.error)
      else setVerkopen(data)
    } catch {
      setFout('Kon verkopen niet laden')
    } finally {
      setLaden(false)
    }
  }, [])

  useEffect(() => { laadVerkopen() }, [laadVerkopen])

  async function updateStatus(id: string, status: string) {
    setStatusBezig(id)
    try {
      const res = await fetch(`/api/verkopen/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) setVerkopen((prev) => prev.map((v) => v.id === id ? { ...v, status } : v))
    } finally {
      setStatusBezig(null)
    }
  }

  async function updateNotitie(id: string, notitie: string) {
    try {
      const res = await fetch(`/api/verkopen/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notitie }),
      })
      if (res.ok) setVerkopen((prev) => prev.map((v) => v.id === id ? { ...v, notitie } : v))
    } finally {
      setNotitieEdit(null)
    }
  }

  async function updatePrijs(id: string, verkoopprijs: string) {
    setBezig(true)
    try {
      const res = await fetch(`/api/verkopen/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verkoopprijs: Number(verkoopprijs) }),
      })
      if (res.ok) setVerkopen((prev) => prev.map((v) => v.id === id ? { ...v, verkoopprijs: Number(verkoopprijs) } : v))
    } finally {
      setBezig(false)
      setPrijsEdit(null)
    }
  }

  async function verwijder(id: string) {
    setBezig(true)
    try {
      const res = await fetch(`/api/verkopen/${id}`, { method: 'DELETE' })
      if (res.ok) setVerkopen((prev) => prev.filter((v) => v.id !== id))
    } finally {
      setBezig(false)
      setVerwijderBevestig(null)
    }
  }

  const maanden = [...new Set(verkopen.map((v) => {
    const d = new Date(v.verkoopdatum)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }))].sort().reverse()

  const maandnamen: Record<string, string> = {
    '01': 'Jan', '02': 'Feb', '03': 'Mrt', '04': 'Apr', '05': 'Mei', '06': 'Jun',
    '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Dec',
  }
  function maandLabel(ym: string) {
    const [jaar, maand] = ym.split('-')
    return `${maandnamen[maand]} ${jaar}`
  }

  const aantalActief = verkopen.filter((v) => ACTIEVE_STATUSSEN.includes(v.status)).length

  const gefilterd = verkopen.filter((v) => {
    if (filterStatus === 'actief' && !ACTIEVE_STATUSSEN.includes(v.status)) return false
    if (filterStatus !== 'alle' && filterStatus !== 'actief' && v.status !== filterStatus) return false
    if (filterProduct !== 'alle' && v.product !== filterProduct) return false
    if (filterMaand !== 'alle') {
      const d = new Date(v.verkoopdatum)
      const maand = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (maand !== filterMaand) return false
    }
    if (zoekterm.trim()) {
      const q = zoekterm.toLowerCase()
      if (
        !v.naam_koper.toLowerCase().includes(q) &&
        !v.product.toLowerCase().includes(q) &&
        !(v.notitie ?? '').toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white">Bestellingen</h1>
          <span className="text-gray-500 text-sm">{gefilterd.length}</span>
        </div>

        {/* Zoekbalk */}
        <div className="relative mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            placeholder="Zoek op koper, product..."
            className="w-full bg-gray-800 border-0 text-white rounded-xl pl-9 pr-8 py-2.5 text-sm outline-none placeholder-gray-500"
          />
          {zoekterm && (
            <button onClick={() => setZoekterm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg leading-none">×</button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {/* Actief snelfilter */}
          <button
            onClick={() => setFilterStatus(filterStatus === 'actief' ? 'alle' : 'actief')}
            className={`filter-chip flex items-center gap-1.5 ${filterStatus === 'actief' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
          >
            Actief
            {aantalActief > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterStatus === 'actief' ? 'bg-white/20 text-white' : 'bg-gray-700 text-gray-400'}`}>
                {aantalActief}
              </span>
            )}
          </button>

          <select
            value={filterStatus === 'actief' ? 'alle' : filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-chip bg-gray-800 text-gray-300"
          >
            <option value="alle">Alle statussen</option>
            {STATUSSEN.map((s) => <option key={s} value={s}>{statusKort(s)}</option>)}
          </select>
          <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className="filter-chip bg-gray-800 text-gray-300">
            <option value="alle">Alle producten</option>
            {PRODUCTEN.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterMaand} onChange={(e) => setFilterMaand(e.target.value)} className="filter-chip bg-gray-800 text-gray-300">
            <option value="alle">Alle maanden</option>
            {maanden.map((m) => <option key={m} value={m}>{maandLabel(m)}</option>)}
          </select>
        </div>
      </div>

      {laden && <div className="text-center text-gray-500 py-16">Laden...</div>}
      {fout && <div className="mx-4 mt-2 bg-red-900/30 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{fout}</div>}

      {/* Verwijder bevestiging */}
      {verwijderBevestig && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-white text-lg font-semibold mb-2">Verkoop verwijderen?</h2>
            <p className="text-gray-400 text-sm mb-5">Dit kan niet ongedaan worden gemaakt.</p>
            <div className="flex gap-3">
              <button onClick={() => setVerwijderBevestig(null)} className="flex-1 py-3 rounded-xl bg-gray-700 text-gray-300 font-medium text-sm">Annuleren</button>
              <button onClick={() => verwijder(verwijderBevestig)} disabled={bezig} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium text-sm disabled:opacity-50">
                {bezig ? 'Bezig...' : 'Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lijst */}
      <div className="border-t border-gray-800 mt-1">
        {gefilterd.map((v) => (
          <div key={v.id} className="border-b border-gray-800 px-4 py-3">
            {/* Bovenste rij: foto + product + prijs/winst */}
            <div className="flex items-start gap-3 mb-2">
              <ProductAfbeelding product={v.product} />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white leading-tight truncate">{v.product}</p>
                  <div className="text-right shrink-0">
                    {prijsEdit?.id === v.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-xs">€</span>
                        <input
                          type="number"
                          value={prijsEdit.waarde}
                          onChange={(e) => setPrijsEdit({ id: v.id, waarde: e.target.value })}
                          onBlur={() => updatePrijs(v.id, prijsEdit.waarde)}
                          onKeyDown={(e) => { if (e.key === 'Enter') updatePrijs(v.id, prijsEdit.waarde); if (e.key === 'Escape') setPrijsEdit(null) }}
                          className="w-16 bg-gray-700 text-white text-xs rounded px-1.5 py-0.5 text-right outline-none"
                          autoFocus step="0.01" inputMode="decimal"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setPrijsEdit({ id: v.id, waarde: String(v.verkoopprijs) })}
                        className="text-sm font-semibold text-white underline decoration-dotted underline-offset-2"
                      >
                        {formatEuro(v.verkoopprijs)}
                      </button>
                    )}
                    <p className={`text-xs font-medium mt-0.5 ${v.winst === null ? 'text-gray-600' : v.winst >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                      {v.winst === null ? '—' : `${v.winst >= 0 ? '+' : ''}${formatEuro(v.winst)}`}
                    </p>
                  </div>
                </div>

                {/* Koper · datum · account */}
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {v.naam_koper} · {formatDatum(v.verkoopdatum)} · {v.account}
                </p>
              </div>
            </div>

            {/* Status dropdown + delete */}
            <div className="flex items-center gap-2 pl-14">
              <select
                value={v.status}
                onChange={(e) => updateStatus(v.id, e.target.value)}
                disabled={statusBezig === v.id}
                className={`flex-1 text-xs bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 disabled:opacity-50 appearance-none outline-none font-medium ${statusKleur(v.status)}`}
              >
                {STATUSSEN.map((s) => <option key={s} value={s}>{statusKort(s)}</option>)}
              </select>
              <button
                onClick={() => setVerwijderBevestig(v.id)}
                className="p-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-500 active:text-red-400 shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>

            {/* Notitie */}
            <div className="pl-14 mt-1.5">
              {notitieEdit?.id === v.id ? (
                <input
                  type="text"
                  value={notitieEdit.waarde}
                  onChange={(e) => setNotitieEdit({ id: v.id, waarde: e.target.value })}
                  onBlur={() => updateNotitie(v.id, notitieEdit.waarde)}
                  onKeyDown={(e) => { if (e.key === 'Enter') updateNotitie(v.id, notitieEdit.waarde); if (e.key === 'Escape') setNotitieEdit(null) }}
                  placeholder="Notitie toevoegen..."
                  className="text-xs bg-gray-700 text-white rounded-lg px-3 py-1.5 w-full outline-none placeholder-gray-500"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setNotitieEdit({ id: v.id, waarde: v.notitie || '' })}
                  className={`text-xs text-left ${v.notitie ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  {v.notitie || '+ notitie'}
                </button>
              )}
            </div>
          </div>
        ))}

        {!laden && gefilterd.length === 0 && (
          <div className="text-center text-gray-500 py-16">
            <p className="text-sm">Geen bestellingen gevonden</p>
          </div>
        )}
      </div>

      <style>{`
        .filter-chip {
          border: none;
          border-radius: 9999px;
          padding: 0.4rem 0.85rem;
          font-size: 0.8rem;
          white-space: nowrap;
          flex-shrink: 0;
          outline: none;
          cursor: pointer;
        }
        .filter-chip option { background: #1f2937; }
      `}</style>
    </div>
  )
}
