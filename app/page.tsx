'use client'

import { useEffect, useState } from 'react'
import { formatEuro } from '@/lib/constants'

type Stats = {
  winstDitJaar: number
  winstDezeMaand: number
  aantalDezeMaand: number
  aantalDitJaar: number
  totaleVoorraadWaarde: number
  omzetDitJaar: number
  kostenProductDitJaar: number
  extraKostenDitJaar: number
  geldBinnen: number
  geldVerwacht: number
  kostenInkopenDitJaar: number
  kostenInkopenDezeMaand: number
  omzetDezeMaand: number
  kostenProductDezeMaand: number
  extraKostenDezeMaand: number
  geldBinnenDezeMaand: number
  geldVerwachtDezeMaand: number
  teVerzenden: number
  voorraad: { product: string; in_huis: number; onderweg: number }[]
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState('')

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setFout(data.error)
        else setStats(data)
      })
      .catch(() => setFout('Kon stats niet laden'))
      .finally(() => setLaden(false))
  }, [])

  const huidigJaar = new Date().getFullYear()
  const maandnamen = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
  const huidigeMaand = maandnamen[new Date().getMonth()]

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">{huidigJaar}</p>

      {laden && <div className="text-center text-gray-400 py-16 text-lg">Laden...</div>}
      {fout && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 mb-4">{fout}</div>
      )}

      {stats && (
        <>
          {/* DEZE MAAND */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">{huidigeMaand}</p>
          <div className="bg-gray-800 rounded-xl p-4 mb-3">
            {/* Winst verdeling maand */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-2.5 text-center min-w-0">
                <p className="text-emerald-400 text-sm font-bold leading-tight truncate">{formatEuro(stats.geldBinnenDezeMaand)}</p>
                <p className="text-emerald-700 text-xs mt-0.5">Bevestigd</p>
              </div>
              <div className="flex-1 bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-2.5 text-center min-w-0">
                <p className="text-yellow-400 text-sm font-bold leading-tight truncate">{formatEuro(stats.geldVerwachtDezeMaand)}</p>
                <p className="text-yellow-700 text-xs mt-0.5">Onderweg</p>
              </div>
              <div className="flex-1 bg-red-900/20 border border-red-700/30 rounded-xl p-2.5 text-center min-w-0">
                <p className="text-red-400 text-sm font-bold leading-tight truncate">−{formatEuro(stats.kostenInkopenDezeMaand + stats.extraKostenDezeMaand)}</p>
                <p className="text-red-700 text-xs mt-0.5">Kosten</p>
              </div>
            </div>

            {/* Omzet / Kosten breakdown maand */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Omzet</span>
                <span className="text-white font-medium">{formatEuro(stats.omzetDezeMaand)}</span>
              </div>
              {stats.kostenInkopenDezeMaand > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Inkoopkosten</span>
                  <span className="text-red-400">− {formatEuro(stats.kostenInkopenDezeMaand)}</span>
                </div>
              )}
              {stats.extraKostenDezeMaand > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Extra kosten</span>
                  <span className="text-red-400">− {formatEuro(stats.extraKostenDezeMaand)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-700 pt-2">
                <span className="text-white font-semibold">Netto</span>
                <span className={`font-bold ${(stats.omzetDezeMaand - stats.kostenInkopenDezeMaand - stats.extraKostenDezeMaand) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatEuro(stats.omzetDezeMaand - stats.kostenInkopenDezeMaand - stats.extraKostenDezeMaand)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard label="Verkopen" waarde={String(stats.aantalDezeMaand)} />
            <StatCard label="Te verzenden" waarde={String(stats.teVerzenden)} />
          </div>

          {/* DIT JAAR */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">{huidigJaar}</p>
          <div className="bg-gray-800 rounded-xl p-4 mb-3">
            {/* Winst verdeling */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-2.5 text-center min-w-0">
                <p className="text-emerald-400 text-sm font-bold leading-tight truncate">{formatEuro(stats.geldBinnen)}</p>
                <p className="text-emerald-700 text-xs mt-0.5">Bevestigd</p>
              </div>
              <div className="flex-1 bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-2.5 text-center min-w-0">
                <p className="text-yellow-400 text-sm font-bold leading-tight truncate">{formatEuro(stats.geldVerwacht)}</p>
                <p className="text-yellow-700 text-xs mt-0.5">Onderweg</p>
              </div>
              {(stats.kostenInkopenDitJaar + stats.extraKostenDitJaar) > 0 && (
                <div className="flex-1 bg-red-900/20 border border-red-700/30 rounded-xl p-2.5 text-center min-w-0">
                  <p className="text-red-400 text-sm font-bold leading-tight truncate">−{formatEuro(stats.kostenInkopenDitJaar + stats.extraKostenDitJaar)}</p>
                  <p className="text-red-700 text-xs mt-0.5">Kosten</p>
                </div>
              )}
            </div>

            {/* Omzet / Kosten breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Omzet</span>
                <span className="text-white font-medium">{formatEuro(stats.omzetDitJaar)}</span>
              </div>
              {stats.kostenInkopenDitJaar > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Inkoopkosten</span>
                  <span className="text-red-400">− {formatEuro(stats.kostenInkopenDitJaar)}</span>
                </div>
              )}
              {stats.extraKostenDitJaar > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Extra kosten</span>
                  <span className="text-red-400">− {formatEuro(stats.extraKostenDitJaar)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-700 pt-2">
                <span className="text-white font-semibold">Netto</span>
                <span className={`font-bold ${(stats.omzetDitJaar - stats.kostenInkopenDitJaar - stats.extraKostenDitJaar) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatEuro(stats.omzetDitJaar - stats.kostenInkopenDitJaar - stats.extraKostenDitJaar)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard label="Verkopen" waarde={String(stats.aantalDitJaar)} />
            <StatCard label="Waarde voorraad" waarde={formatEuro(stats.totaleVoorraadWaarde)} groot />
          </div>

          {/* VOORRAAD */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Voorraad</p>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="space-y-2">
              {stats.voorraad
                .filter((v) => v.in_huis > 0 || v.onderweg > 0)
                .sort((a, b) => b.in_huis - a.in_huis)
                .map((item) => (
                  <div key={item.product} className="flex items-center gap-1 py-1">
                    <span className="text-gray-300 text-sm whitespace-nowrap">{item.product}</span>
                    <span className="flex-1 border-b border-dotted border-gray-700 mb-0.5 mx-1" />
                    <div className="flex gap-2 items-center shrink-0">
                      {item.onderweg > 0 && (
                        <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded-full">
                          {item.onderweg} onderweg
                        </span>
                      )}
                      <span className={`text-sm font-semibold ${item.in_huis > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {item.in_huis} stuks
                      </span>
                    </div>
                  </div>
                ))}
              {stats.voorraad.every((v) => v.in_huis === 0 && v.onderweg === 0) && (
                <p className="text-gray-500 text-sm text-center py-2">Geen voorraad</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, waarde, positief, groot }: {
  label: string; waarde: string; positief?: boolean; groot?: boolean
}) {
  const kleur = positief === undefined ? 'text-white' : positief ? 'text-emerald-400' : 'text-red-400'
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`font-bold ${groot ? 'text-xl' : 'text-lg'} ${kleur}`}>{waarde}</p>
    </div>
  )
}
