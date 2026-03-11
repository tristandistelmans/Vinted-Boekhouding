'use client'

import { useEffect, useState, useCallback } from 'react'
import { STATUSSEN, formatEuro, formatDatum } from '@/lib/constants'

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
}

export default function VerkopBeheren() {
  const [verkopen, setVerkopen] = useState<Verkoop[]>([])
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState('')
  const [filterStatus, setFilterStatus] = useState('alle')
  const [filterMaand, setFilterMaand] = useState('alle')
  const [verwijderBevestig, setVerwijderBevestig] = useState<string | null>(null)
  const [statusBezig, setStatusBezig] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

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

  useEffect(() => {
    laadVerkopen()
  }, [laadVerkopen])

  async function updateStatus(id: string, status: string) {
    setStatusBezig(id)
    try {
      const res = await fetch(`/api/verkopen/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setVerkopen((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)))
      }
    } finally {
      setStatusBezig(null)
    }
  }

  async function verwijder(id: string) {
    setBezig(true)
    try {
      const res = await fetch(`/api/verkopen/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setVerkopen((prev) => prev.filter((v) => v.id !== id))
      }
    } finally {
      setBezig(false)
      setVerwijderBevestig(null)
    }
  }

  const maanden = [
    ...new Set(
      verkopen.map((v) => {
        const d = new Date(v.verkoopdatum)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      })
    ),
  ].sort().reverse()

  const gefilterd = verkopen.filter((v) => {
    if (filterStatus !== 'alle' && v.status !== filterStatus) return false
    if (filterMaand !== 'alle') {
      const d = new Date(v.verkoopdatum)
      const maand = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (maand !== filterMaand) return false
    }
    return true
  })

  const maandnamen: Record<string, string> = {
    '01': 'Jan', '02': 'Feb', '03': 'Mrt', '04': 'Apr', '05': 'Mei', '06': 'Jun',
    '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Dec',
  }
  function maandLabel(ym: string) {
    const [jaar, maand] = ym.split('-')
    return `${maandnamen[maand]} ${jaar}`
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">Verkopen</h1>
        <span className="text-gray-400 text-sm">{gefilterd.length} verkopen</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="alle">Alle statussen</option>
          {STATUSSEN.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterMaand}
          onChange={(e) => setFilterMaand(e.target.value)}
          className="filter-select"
        >
          <option value="alle">Alle maanden</option>
          {maanden.map((m) => (
            <option key={m} value={m}>{maandLabel(m)}</option>
          ))}
        </select>
      </div>

      {laden && <div className="text-center text-gray-400 py-16">Laden...</div>}
      {fout && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 mb-4">
          {fout}
        </div>
      )}

      {/* Verwijder bevestiging */}
      {verwijderBevestig && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-white text-lg font-semibold mb-2">Verkoop verwijderen?</h2>
            <p className="text-gray-400 text-sm mb-5">Dit kan niet ongedaan worden gemaakt.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setVerwijderBevestig(null)}
                className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-medium"
              >
                Annuleren
              </button>
              <button
                onClick={() => verwijder(verwijderBevestig)}
                disabled={bezig}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium disabled:opacity-50"
              >
                {bezig ? 'Bezig...' : 'Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lijst */}
      <div className="space-y-3">
        {gefilterd.map((v) => (
          <div key={v.id} className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white font-semibold">{v.product}</p>
                <p className="text-gray-400 text-sm">{v.naam_koper} · {formatDatum(v.verkoopdatum)}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">{formatEuro(v.verkoopprijs)}</p>
                <p className={`text-sm font-medium ${
                  v.winst === null ? 'text-gray-500' :
                  v.winst >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {v.winst === null ? '—' : formatEuro(v.winst)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <select
                value={v.status}
                onChange={(e) => updateStatus(v.id, e.target.value)}
                disabled={statusBezig === v.id}
                className="flex-1 text-xs rounded-lg px-2 py-2 border border-gray-600 text-gray-300 disabled:opacity-50"
                style={{ background: '#1f2937' }}
              >
                {STATUSSEN.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={() => setVerwijderBevestig(v.id)}
                className="p-2 rounded-lg bg-gray-700 text-red-400 active:bg-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {!laden && gefilterd.length === 0 && (
          <div className="text-center text-gray-500 py-16">
            <p className="text-lg">Geen verkopen gevonden</p>
            <p className="text-sm mt-1">Pas de filters aan</p>
          </div>
        )}
      </div>

      <style>{`
        .filter-select {
          background: #1f2937;
          border: 1px solid #374151;
          color: #d1d5db;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .filter-select option {
          background: #1f2937;
        }
      `}</style>
    </div>
  )
}
