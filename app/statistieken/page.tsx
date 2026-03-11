'use client'

import { useEffect, useState } from 'react'
import { formatEuro } from '@/lib/constants'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

type Stats = {
  winstDitJaar: number
  winstDezeMaand: number
  aantalDitJaar: number
  winstPerMaand: { naam: string; winst: number }[]
  winstPerProduct: { product: string; winst: number; aantal: number }[]
}

export default function StatistiekenPage() {
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
      .catch(() => setFout('Kon statistieken niet laden'))
      .finally(() => setLaden(false))
  }, [])

  const huidigJaar = new Date().getFullYear()

  if (laden) return <div className="text-center text-gray-400 py-16 pt-10">Laden...</div>
  if (fout) return (
    <div className="px-4 pt-6">
      <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300">{fout}</div>
    </div>
  )
  if (!stats) return null

  const maandData = stats.winstPerMaand.filter((m) => m.winst !== 0)
  const topProducten = stats.winstPerProduct.slice(0, 8)

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-white mb-1">Statistieken</h1>
      <p className="text-gray-400 text-sm mb-6">{huidigJaar}</p>

      {/* Winst per maand */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <h2 className="text-white font-semibold mb-4">Winst per maand</h2>
        {maandData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.winstPerMaand} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="naam" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f9fafb' }}
                formatter={(value) => [formatEuro(Number(value)), 'Winst']}
              />
              <Line
                type="monotone"
                dataKey="winst"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ fill: '#34d399', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-sm text-center py-8">Nog geen data dit jaar</p>
        )}
      </div>

      {/* Winst per product */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <h2 className="text-white font-semibold mb-4">Winst per product</h2>
        {topProducten.some((p) => p.winst !== 0) ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={topProducten}
              layout="vertical"
              margin={{ top: 0, right: 10, left: 60, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
              <YAxis
                type="category"
                dataKey="product"
                tick={{ fill: '#d1d5db', fontSize: 11 }}
                width={60}
              />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f9fafb' }}
                formatter={(value) => [formatEuro(Number(value)), 'Winst']}
              />
              <Bar dataKey="winst" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-sm text-center py-8">Nog geen data dit jaar</p>
        )}
      </div>

      {/* Bestsellers tabel */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h2 className="text-white font-semibold mb-3">Bestsellers {huidigJaar}</h2>
        <div className="space-y-2">
          {stats.winstPerProduct
            .filter((p) => p.aantal > 0)
            .slice(0, 6)
            .map((p, i) => (
              <div key={p.product} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm w-5 text-right">{i + 1}.</span>
                  <span className="text-gray-200 text-sm">{p.product}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs">{p.aantal}x</span>
                  <span className={`text-sm font-medium ${p.winst >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatEuro(p.winst)}
                  </span>
                </div>
              </div>
            ))}
          {stats.winstPerProduct.every((p) => p.aantal === 0) && (
            <p className="text-gray-500 text-sm text-center py-4">Geen verkopen dit jaar</p>
          )}
        </div>
      </div>
    </div>
  )
}
