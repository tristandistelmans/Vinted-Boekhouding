'use client'

import { useEffect, useState } from 'react'
import { formatEuro } from '@/lib/constants'

type Stats = {
  winstDitJaar: number
  winstDezeMaand: number
  aantalDezeMaand: number
  aantalDitJaar: number
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

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-white mb-1">Vinted Dashboard</h1>
      <p className="text-gray-400 text-sm mb-6">{huidigJaar} — 17 tristanjansse</p>

      {laden && (
        <div className="text-center text-gray-400 py-16 text-lg">Laden...</div>
      )}

      {fout && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 mb-4">
          {fout}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard
              label="Winst dit jaar"
              waarde={formatEuro(stats.winstDitJaar)}
              positief={stats.winstDitJaar >= 0}
              groot
            />
            <StatCard
              label="Winst deze maand"
              waarde={formatEuro(stats.winstDezeMaand)}
              positief={stats.winstDezeMaand >= 0}
              groot
            />
            <StatCard
              label="Verkopen deze maand"
              waarde={String(stats.aantalDezeMaand)}
            />
            <StatCard
              label="Verkopen dit jaar"
              waarde={String(stats.aantalDitJaar)}
            />
          </div>

          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Voorraad in huis</h2>
            <div className="space-y-2">
              {stats.voorraad
                .filter((v) => v.in_huis > 0 || v.onderweg > 0)
                .map((item) => (
                  <div key={item.product} className="flex items-center justify-between py-1">
                    <span className="text-gray-300 text-sm">{item.product}</span>
                    <div className="flex gap-3 items-center">
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
                <p className="text-gray-500 text-sm text-center py-2">Geen voorraad gevonden</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  waarde,
  positief,
  groot,
}: {
  label: string
  waarde: string
  positief?: boolean
  groot?: boolean
}) {
  const kleur =
    positief === undefined
      ? 'text-white'
      : positief
      ? 'text-emerald-400'
      : 'text-red-400'

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`font-bold ${groot ? 'text-xl' : 'text-lg'} ${kleur}`}>{waarde}</p>
    </div>
  )
}
