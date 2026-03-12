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
  winstPerProduct: { product: string; winst: number; aantal: number; gemVerkoopprijs: number }[]
  winstPerAccount: { account: string; winst: number; aantal: number }[]
}

const STATS_2025 = {
  winstTotaal: 15936.05,
  omzet: 25083.50,
  aantalVerkopen: null as null | number,
  winstPerProduct: [
    { product: 'NY Navy', winst: 3738.90 },
    { product: 'Porsche Green', winst: 1795.20 },
    { product: 'UNI Beige', winst: 1400.20 },
    { product: 'Porsche Black', winst: 1288.10 },
    { product: 'NY Beige/Green', winst: 1152.90 },
    { product: 'Golden Goose', winst: 1085.30 },
    { product: 'UNI Black', winst: 809.50 },
    { product: 'Maison Margiela', winst: 634.00 },
    { product: 'ALD Tee', winst: 634.00 },
    { product: 'Acne Hoodie', winst: 584.00 },
    { product: 'UNI Navy', winst: 294.00 },
    { product: 'UNI White', winst: 212.60 },
    { product: 'UNI Green', winst: 192.70 },
    { product: 'UNI Blue', winst: 145.60 },
    { product: 'ALD Tote Bag', winst: -12.00 },
    { product: 'Porsche Red', winst: -88.00 },
  ],
}

export default function StatistiekenPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState('')
  const [jaar, setJaar] = useState<2025 | 2026>(2026)

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
  const top2025 = STATS_2025.winstPerProduct.slice(0, 8)

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-white mb-3">Statistieken</h1>

      {/* Jaar toggle */}
      <div className="flex gap-2 mb-5">
        {([2026, 2025] as const).map((j) => (
          <button
            key={j}
            onClick={() => setJaar(j)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              jaar === j
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 active:bg-gray-600'
            }`}
          >
            {j}
          </button>
        ))}
      </div>

      {jaar === 2026 ? (
        <>
          {/* Winst per maand 2026 */}
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

          {/* Winst per product 2026 */}
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

          {/* Per account 2026 */}
          {stats.winstPerAccount.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4 mb-4">
              <h2 className="text-white font-semibold mb-3">Per account 2026</h2>
              <div className="space-y-2">
                {stats.winstPerAccount.map((a) => (
                  <div key={a.account} className="flex items-center gap-1 py-1">
                    <span className="text-gray-300 text-sm whitespace-nowrap">{a.account}</span>
                    <span className="flex-1 border-b border-dotted border-gray-600 mb-0.5 mx-1" />
                    <div className="flex gap-3 items-center shrink-0">
                      <span className="text-gray-400 text-xs">{a.aantal}x</span>
                      <span className={`text-sm font-semibold ${a.winst >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatEuro(a.winst)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bestsellers 2026 */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-white font-semibold mb-3">Bestsellers 2026</h2>
            <div className="grid grid-cols-4 gap-1 px-1 mb-2">
              <span className="text-gray-500 text-xs col-span-2">Product</span>
              <span className="text-gray-500 text-xs text-right">Gem. prijs</span>
              <span className="text-gray-500 text-xs text-right">Winst</span>
            </div>
            <div className="space-y-2">
              {stats.winstPerProduct
                .filter((p) => p.aantal > 0)
                .slice(0, 8)
                .map((p, i) => (
                  <div key={p.product} className="grid grid-cols-4 gap-1 items-center py-1">
                    <div className="col-span-2 flex items-center gap-1.5">
                      <span className="text-gray-600 text-xs w-4 text-right shrink-0">{i + 1}.</span>
                      <span className="text-gray-200 text-xs truncate">{p.product}</span>
                    </div>
                    <span className="text-gray-400 text-xs text-right">
                      {p.gemVerkoopprijs > 0 ? formatEuro(p.gemVerkoopprijs) : '—'}
                    </span>
                    <span className={`text-xs font-medium text-right ${p.winst >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatEuro(p.winst)}
                    </span>
                  </div>
                ))}
              {stats.winstPerProduct.every((p) => p.aantal === 0) && (
                <p className="text-gray-500 text-sm text-center py-4">Geen verkopen dit jaar</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Totaal 2025 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Totale winst 2025</p>
              <p className="text-xl font-bold text-emerald-400">{formatEuro(STATS_2025.winstTotaal)}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Totale omzet 2025</p>
              <p className="text-xl font-bold text-white">{formatEuro(STATS_2025.omzet)}</p>
            </div>
          </div>

          {/* Winst per product 2025 */}
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <h2 className="text-white font-semibold mb-4">Winst per product</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={top2025}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 70, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
                <YAxis
                  type="category"
                  dataKey="product"
                  tick={{ fill: '#d1d5db', fontSize: 11 }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f9fafb' }}
                  formatter={(value) => [formatEuro(Number(value)), 'Winst']}
                />
                <Bar dataKey="winst" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Volledige ranglijst 2025 */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-white font-semibold mb-3">Alle producten 2025</h2>
            <div className="grid grid-cols-3 gap-1 px-1 mb-2">
              <span className="text-gray-500 text-xs col-span-2">Product</span>
              <span className="text-gray-500 text-xs text-right">Winst</span>
            </div>
            <div className="space-y-2">
              {STATS_2025.winstPerProduct.map((p, i) => (
                <div key={p.product} className="grid grid-cols-3 gap-1 items-center py-1">
                  <div className="col-span-2 flex items-center gap-1.5">
                    <span className="text-gray-600 text-xs w-4 text-right shrink-0">{i + 1}.</span>
                    <span className="text-gray-200 text-xs truncate">{p.product}</span>
                  </div>
                  <span className={`text-xs font-medium text-right ${p.winst >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatEuro(p.winst)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
