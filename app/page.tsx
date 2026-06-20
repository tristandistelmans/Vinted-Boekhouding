'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatEuro } from '@/lib/constants'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type TeBetalenVerkoop = {
  id: string
  product: string
  verkoopdatum: string
  verkoopprijs: number
  commissie: number
  teStorten: number
}

type JasmijnStats = {
  commissieDezeMaand: number
  commissieBinnenDezeMaand: number
  commissieOnderwegDezeMaand: number
  omzetBinnenDezeMaand: number
  omzetOnderwegDezeMaand: number
  commissieBinnenDitJaar: number
  commissieOnderwegDitJaar: number
  omzetBinnenDitJaar: number
  omzetOnderweg: number
  teBetalen: number
  teBetalenVerkopen: TeBetalenVerkoop[]
}

type Stats = {
  winstDitJaar: number
  winstDezeMaand: number
  aantalDezeMaand: number
  aantalDitJaar: number
  voorraadWaardeInHuis: number
  voorraadWaardeOnderweg: number
  voorraadWaardeTotaal: number
  omzetDitJaar: number
  kostenProductDitJaar: number
  commissiesDitJaar: number
  commissiesBinnenDitJaar: number
  commissiesOnderwegDitJaar: number
  extraKostenDitJaar: number
  geldBinnen: number
  geldVerwacht: number
  kostenInkopenDitJaar: number
  kostenInkopenDezeMaand: number
  omzetDezeMaand: number
  kostenProductDezeMaand: number
  commissiesDezeMaand: number
  commissiesBinnenDezeMaand: number
  commissiesOnderwegDezeMaand: number
  extraKostenDezeMaand: number
  geldBinnenDezeMaand: number
  geldVerwachtDezeMaand: number
  teVerzenden: number
  voorraad: { product: string; in_huis: number; onderweg: number }[]
  maandOverzicht: {
    maand: string
    omzetVoltooid: number
    omzetOnderweg: number
    inkopen: number
    extraKosten: number
    netto: number
    aantalVerkocht: number
    topProduct: string | null
    topAantal: number
  }[]
  prestatiePerPet: {
    product: string
    verkocht: number
    totaleWinst: number
    gemVerkoopprijs: number
    verkopenPerMaand: number
    inHuis: number
    onderweg: number
    topMaand: string | null
    topMaandAantal: number
  }[]
  winstPerAccount: { account: string; winst: number; aantal: number }[]
  geldInOmloopPerAccount: { account: string; bedrag: number; aantal: number }[]
  winstPerProduct: { product: string; winst: number; aantal: number; gemVerkoopprijs: number }[]
  jasmijnStats?: JasmijnStats
  jasmijnOpenstaand?: number
}

type CurrentUser = { user: string; isCEO: boolean; account: string | null }

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ])
      .then(([statsData, userData]) => {
        if (statsData.error) setFout(statsData.error)
        else setStats(statsData)
        setCurrentUser(userData)
      })
      .catch(() => setFout('Kon stats niet laden'))
      .finally(() => setLaden(false))
  }, [])

  const huidigJaar = new Date().getFullYear()
  const maandnamen = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
  const huidigeMaand = maandnamen[new Date().getMonth()]

  const isJasmijn = currentUser?.isCEO === false

  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-gray-300 active:text-gray-300 transition-colors p-2"
          title="Uitloggen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-6">{huidigJaar}</p>

      {laden && <div className="text-center text-gray-400 py-16 text-lg">Laden...</div>}
      {fout && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 mb-4">{fout}</div>
      )}

      {stats && currentUser && (
        isJasmijn ? (
          <JasmijnDashboard
            stats={stats}
            jasmijn={stats.jasmijnStats!}
            huidigeMaand={huidigeMaand}
            huidigJaar={huidigJaar}
          />
        ) : (
          <CEODashboard stats={stats} />
        )
      )}
    </div>
  )
}

function JasmijnDashboard({
  stats,
  jasmijn,
  huidigeMaand,
  huidigJaar,
}: {
  stats: Stats
  jasmijn: JasmijnStats
  huidigeMaand: string
  huidigJaar: number
}) {
  const [showTeBetalenDetail, setShowTeBetalenDetail] = useState(false)
  const [storting, setStorting] = useState<'idle' | 'laden' | 'klaar'>('idle')

  async function markeerGestort() {
    setStorting('laden')
    const res = await fetch('/api/uitbetaald', { method: 'POST' })
    if (res.ok) {
      setStorting('klaar')
      setTimeout(() => window.location.reload(), 800)
    } else {
      setStorting('idle')
    }
  }

  return (
    <>
      {/* TE STORTEN — prominent bovenaan */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Openstaand</p>
      <div className={`rounded-xl p-4 mb-4 border ${jasmijn.teBetalen > 0 ? 'bg-orange-900/20 border-orange-700/50' : 'bg-gray-800 border-gray-700'}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-300 font-semibold text-sm">Te storten aan Tristan</span>
          {jasmijn.teBetalenVerkopen.length > 0 && (
            <button
              onClick={() => setShowTeBetalenDetail(!showTeBetalenDetail)}
              className="text-xs text-gray-500 underline underline-offset-2"
            >
              {showTeBetalenDetail ? 'Verberg' : `${jasmijn.teBetalenVerkopen.length} sales`}
            </button>
          )}
        </div>
        <p className={`text-3xl font-bold mb-3 ${jasmijn.teBetalen > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
          {jasmijn.teBetalen > 0 ? formatEuro(jasmijn.teBetalen) : 'Alles betaald ✓'}
        </p>

        {/* Per-sale detail */}
        {showTeBetalenDetail && jasmijn.teBetalenVerkopen.length > 0 && (
          <div className="border-t border-gray-700 pt-3 space-y-2 mb-3">
            {jasmijn.teBetalenVerkopen.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="text-gray-300 font-medium">{v.product}</span>
                  <span className="text-gray-600 ml-2">{new Date(v.verkoopdatum).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })}</span>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="text-gray-400">{formatEuro(v.verkoopprijs)}</span>
                  <span className="text-gray-600 mx-1">−</span>
                  <span className="text-blue-400">{formatEuro(v.commissie)}</span>
                  <span className="text-gray-600 mx-1">=</span>
                  <span className="text-orange-300 font-semibold">{formatEuro(v.teStorten)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {jasmijn.teBetalen > 0 && (
          <button
            onClick={markeerGestort}
            disabled={storting !== 'idle'}
            className="w-full mt-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {storting === 'laden' ? '...' : storting === 'klaar' ? 'Gestort ✓' : 'Gestort aan Tristan'}
          </button>
        )}
      </div>

      {/* COMMISSIE — deze maand */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">{huidigeMaand}</p>
      <div className="bg-gray-800 rounded-xl p-4 mb-3">
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-2.5 text-center min-w-0">
            <p className="text-emerald-400 text-sm font-bold leading-tight truncate">{formatEuro(jasmijn.omzetBinnenDezeMaand)}</p>
            <p className="text-emerald-700 text-xs mt-0.5">Omzet</p>
          </div>
          <div className="flex-1 bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-2.5 text-center min-w-0">
            <p className="text-yellow-400 text-sm font-bold leading-tight truncate">{formatEuro(jasmijn.omzetOnderwegDezeMaand)}</p>
            <p className="text-yellow-700 text-xs mt-0.5">Onderweg</p>
          </div>
          <div className="flex-1 bg-blue-900/20 border border-blue-700/30 rounded-xl p-2.5 text-center min-w-0">
            <p className="text-blue-400 text-sm font-bold leading-tight truncate">{formatEuro(jasmijn.commissieBinnenDezeMaand)}</p>
            <p className="text-blue-700 text-xs mt-0.5">Comm. binnen</p>
          </div>
          <div className="flex-1 bg-indigo-900/20 border border-indigo-700/30 rounded-xl p-2.5 text-center min-w-0">
            <p className="text-indigo-400 text-sm font-bold leading-tight truncate">{formatEuro(jasmijn.commissieOnderwegDezeMaand)}</p>
            <p className="text-indigo-700 text-xs mt-0.5">Comm. onderweg</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Omzet binnen</span>
            <span className="text-white font-medium">{formatEuro(jasmijn.omzetBinnenDezeMaand)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Commissie binnen</span>
            <span className="text-blue-400">+ {formatEuro(jasmijn.commissieBinnenDezeMaand)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-700 pt-2">
            <span className="text-white font-semibold">Te storten aan Tristan</span>
            <span className="text-orange-400 font-bold">{formatEuro(jasmijn.omzetBinnenDezeMaand - jasmijn.commissieBinnenDezeMaand)}</span>
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
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-2.5 text-center min-w-0">
            <p className="text-emerald-400 text-sm font-bold leading-tight truncate">{formatEuro(jasmijn.omzetBinnenDitJaar)}</p>
            <p className="text-emerald-700 text-xs mt-0.5">Omzet</p>
          </div>
          <div className="flex-1 bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-2.5 text-center min-w-0">
            <p className="text-yellow-400 text-sm font-bold leading-tight truncate">{formatEuro(jasmijn.omzetOnderweg)}</p>
            <p className="text-yellow-700 text-xs mt-0.5">Onderweg</p>
          </div>
          <div className="flex-1 bg-blue-900/20 border border-blue-700/30 rounded-xl p-2.5 text-center min-w-0">
            <p className="text-blue-400 text-sm font-bold leading-tight truncate">{formatEuro(jasmijn.commissieBinnenDitJaar)}</p>
            <p className="text-blue-700 text-xs mt-0.5">Comm. binnen</p>
          </div>
          <div className="flex-1 bg-indigo-900/20 border border-indigo-700/30 rounded-xl p-2.5 text-center min-w-0">
            <p className="text-indigo-400 text-sm font-bold leading-tight truncate">{formatEuro(jasmijn.commissieOnderwegDitJaar)}</p>
            <p className="text-indigo-700 text-xs mt-0.5">Comm. onderweg</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Omzet binnen</span>
            <span className="text-white font-medium">{formatEuro(jasmijn.omzetBinnenDitJaar)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Commissie binnen</span>
            <span className="text-blue-400">+ {formatEuro(jasmijn.commissieBinnenDitJaar)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-700 pt-2">
            <span className="text-white font-semibold">Totaal gestort dit jaar</span>
            <span className="text-emerald-400 font-bold">{formatEuro(jasmijn.omzetBinnenDitJaar - jasmijn.commissieBinnenDitJaar)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-6">
        <StatCard label="Verkopen dit jaar" waarde={String(stats.aantalDitJaar)} />
      </div>

      {/* VOORRAAD */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Voorraad</p>
      <VoorraadOverzicht voorraad={stats.voorraad} />
    </>
  )
}

function CEODashboard({ stats }: { stats: Stats }) {
  const maandData = stats.maandOverzicht.filter(
    (m) => m.omzetVoltooid > 0 || m.omzetOnderweg > 0 || m.inkopen > 0 || m.extraKosten > 0
  )
  const totaal = maandData.reduce(
    (s, m) => ({
      omzetVoltooid: s.omzetVoltooid + m.omzetVoltooid,
      omzetOnderweg: s.omzetOnderweg + m.omzetOnderweg,
      inkopen: s.inkopen + m.inkopen,
      extraKosten: s.extraKosten + m.extraKosten,
      netto: s.netto + m.netto,
    }),
    { omzetVoltooid: 0, omzetOnderweg: 0, inkopen: 0, extraKosten: 0, netto: 0 }
  )

  // Hero: huidige maand + delta vs vorige
  const huidigeMaandIdx = new Date().getMonth()
  const huidigeMaand = stats.maandOverzicht[huidigeMaandIdx]
  const vorigeMaand = huidigeMaandIdx > 0 ? stats.maandOverzicht[huidigeMaandIdx - 1] : null
  const heeftHuidigeData = huidigeMaand && (huidigeMaand.omzetVoltooid > 0 || huidigeMaand.omzetOnderweg > 0 || huidigeMaand.inkopen > 0 || huidigeMaand.extraKosten > 0)
  const nettoDelta = vorigeMaand && vorigeMaand.netto !== 0 && heeftHuidigeData
    ? ((huidigeMaand.netto - vorigeMaand.netto) / Math.abs(vorigeMaand.netto)) * 100
    : null

  // Delta per maand-rij vs vorige maand (volgt op stats.maandOverzicht index)
  const deltaPerMaand: Record<string, number | null> = {}
  stats.maandOverzicht.forEach((m, idx) => {
    if (idx === 0) {
      deltaPerMaand[m.maand] = null
      return
    }
    const prev = stats.maandOverzicht[idx - 1]
    if (prev.netto === 0) {
      deltaPerMaand[m.maand] = null
    } else {
      deltaPerMaand[m.maand] = ((m.netto - prev.netto) / Math.abs(prev.netto)) * 100
    }
  })

  return (
    <>
      {/* ACTIE-ITEMS BOVENAAN */}
      {stats.teVerzenden > 0 && (
        <Link href="/verzenden" className="block bg-orange-900/20 border border-orange-700/40 rounded-xl p-3 mb-3 active:bg-orange-900/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-400 text-sm font-semibold">{stats.teVerzenden} te verzenden</p>
              <p className="text-gray-500 text-xs mt-0.5">Klik om naar Verzenden te gaan</p>
            </div>
            <span className="text-orange-400 text-xl">→</span>
          </div>
        </Link>
      )}

      {stats.jasmijnOpenstaand !== undefined && stats.jasmijnOpenstaand > 0 && (
        <div className="bg-orange-900/20 border border-orange-700/40 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs">Nog te ontvangen van Jasmijn</p>
              <p className="text-orange-400 text-lg font-bold leading-tight">{formatEuro(stats.jasmijnOpenstaand)}</p>
            </div>
            <span className="text-gray-600 text-[10px] text-right max-w-[120px]">Markeer als uitbetaald in Bestellingen</span>
          </div>
        </div>
      )}

      {/* DEZE MAAND HERO */}
      {heeftHuidigeData && (
        <div className="bg-gradient-to-br from-emerald-900/30 via-gray-800 to-gray-800 border border-emerald-800/30 rounded-xl p-4 mb-4">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-emerald-300 text-sm font-semibold capitalize">{huidigeMaand.maand}</p>
            {nettoDelta !== null && (
              <span className={`text-xs font-medium ${nettoDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {nettoDelta >= 0 ? '↑' : '↓'} {Math.abs(nettoDelta).toFixed(0)}% vs vorige maand
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-emerald-700 text-[10px] uppercase tracking-wide">Voltooid</p>
              <p className="text-emerald-400 text-base font-bold leading-tight">{formatEuro(huidigeMaand.omzetVoltooid)}</p>
            </div>
            <div>
              <p className="text-yellow-700 text-[10px] uppercase tracking-wide">Onderweg</p>
              <p className="text-yellow-400 text-base font-bold leading-tight">{formatEuro(huidigeMaand.omzetOnderweg)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px] uppercase tracking-wide">Netto</p>
              <p className={`text-base font-bold leading-tight ${huidigeMaand.netto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {huidigeMaand.netto >= 0 ? '+' : '−'} {formatEuro(Math.abs(huidigeMaand.netto))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VOORRAADWAARDE */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Voorraadwaarde</p>
      <div className="bg-gray-800 rounded-xl p-3 mb-4">
        <div className="flex gap-2">
          <div className="flex-1 bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-2.5 text-center min-w-0">
            <p className="text-emerald-400 text-sm font-bold leading-tight truncate">{formatEuro(stats.voorraadWaardeInHuis)}</p>
            <p className="text-emerald-700 text-xs mt-0.5">In huis</p>
          </div>
          <div className="flex-1 bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-2.5 text-center min-w-0">
            <p className="text-yellow-400 text-sm font-bold leading-tight truncate">{formatEuro(stats.voorraadWaardeOnderweg)}</p>
            <p className="text-yellow-700 text-xs mt-0.5">Onderweg</p>
          </div>
          <div className="flex-1 bg-gray-700/40 border border-gray-600/40 rounded-xl p-2.5 text-center min-w-0">
            <p className="text-white text-sm font-bold leading-tight truncate">{formatEuro(stats.voorraadWaardeTotaal)}</p>
            <p className="text-gray-400 text-xs mt-0.5">Totaal</p>
          </div>
        </div>
      </div>

      {/* MAANDOVERZICHT */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Maandoverzicht</p>
      <div className="bg-gray-800 rounded-xl p-3 mb-4">
        {maandData.length > 0 ? (
          <>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left font-medium py-1 px-1">Maand</th>
                  <th className="text-right font-medium py-1 px-1">Voltooid</th>
                  <th className="text-right font-medium py-1 px-1">Onderweg</th>
                  <th className="text-right font-medium py-1 px-1">Inkopen</th>
                  <th className="text-right font-medium py-1 px-1">Extra</th>
                  <th className="text-right font-medium py-1 px-1">Netto</th>
                </tr>
              </thead>
              <tbody>
                {maandData.map((m) => {
                  const delta = deltaPerMaand[m.maand]
                  return (
                    <tr key={m.maand} className="border-t border-gray-700 hover:bg-gray-700/30 transition-colors">
                      <td className="py-1.5 px-1 text-gray-300 capitalize">{m.maand.slice(0, 3)}</td>
                      <td className="py-1.5 px-1 text-right text-emerald-400">{m.omzetVoltooid > 0 ? formatEuro(m.omzetVoltooid) : '—'}</td>
                      <td className="py-1.5 px-1 text-right text-yellow-400">{m.omzetOnderweg > 0 ? formatEuro(m.omzetOnderweg) : '—'}</td>
                      <td className="py-1.5 px-1 text-right text-red-400">{m.inkopen > 0 ? `− ${formatEuro(m.inkopen)}` : '—'}</td>
                      <td className="py-1.5 px-1 text-right text-red-400">{m.extraKosten > 0 ? `− ${formatEuro(m.extraKosten)}` : '—'}</td>
                      <td className={`py-1.5 px-1 text-right font-semibold ${m.netto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        <div className="leading-tight">
                          {m.netto >= 0 ? '+' : '−'} {formatEuro(Math.abs(m.netto))}
                        </div>
                        {delta !== null && (
                          <div className={`text-[10px] font-normal opacity-70 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {delta >= 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(0)}%
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                <tr className="border-t-2 border-gray-600">
                  <td className="py-2 px-1 text-white font-semibold">Totaal</td>
                  <td className="py-2 px-1 text-right text-emerald-400 font-semibold">{formatEuro(totaal.omzetVoltooid)}</td>
                  <td className="py-2 px-1 text-right text-yellow-400 font-semibold">{totaal.omzetOnderweg > 0 ? formatEuro(totaal.omzetOnderweg) : '—'}</td>
                  <td className="py-2 px-1 text-right text-red-400 font-semibold">{totaal.inkopen > 0 ? `− ${formatEuro(totaal.inkopen)}` : '—'}</td>
                  <td className="py-2 px-1 text-right text-red-400 font-semibold">{totaal.extraKosten > 0 ? `− ${formatEuro(totaal.extraKosten)}` : '—'}</td>
                  <td className={`py-2 px-1 text-right font-bold ${totaal.netto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totaal.netto >= 0 ? '+' : '−'} {formatEuro(Math.abs(totaal.netto))}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="flex justify-between items-baseline mt-3 px-1 text-xs">
              <span className="text-gray-500">Gem. netto / maand</span>
              <span className={`font-semibold ${maandData.length > 0 && totaal.netto / maandData.length >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {maandData.length > 0
                  ? `${totaal.netto / maandData.length >= 0 ? '+' : '−'} ${formatEuro(Math.abs(totaal.netto / maandData.length))}`
                  : '—'}
              </span>
            </div>
            <p className="text-gray-500 text-[10px] mt-2 px-1 leading-snug">
              Verkopen tellen voor de maand van hun verkoopdatum. Bij voltooiing verschuift het bedrag van Onderweg naar Voltooid binnen die maand.
            </p>
          </>
        ) : (
          <p className="text-gray-500 text-sm text-center py-6">Nog geen data dit jaar</p>
        )}
      </div>

      {/* PRESTATIES PER PET */}
      {stats.prestatiePerPet.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Prestaties per pet</p>
          <div className="bg-gray-800 rounded-xl p-3 mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left font-medium py-1.5 px-1">Pet</th>
                  <th className="text-right font-medium py-1.5 px-1">Verk.</th>
                  <th className="text-right font-medium py-1.5 px-1">Winst</th>
                  <th className="text-right font-medium py-1.5 px-1">Gem.</th>
                  <th className="text-right font-medium py-1.5 px-1">/mnd</th>
                  <th className="text-right font-medium py-1.5 px-1">Vrr</th>
                  <th className="text-right font-medium py-1.5 px-1">Top</th>
                </tr>
              </thead>
              <tbody>
                {stats.prestatiePerPet.map((p, idx) => (
                  <tr
                    key={p.product}
                    className={`border-t border-gray-700/60 transition-colors hover:bg-emerald-900/15 ${idx % 2 === 1 ? 'bg-gray-700/15' : ''}`}
                  >
                    <td className="py-2 px-1 text-gray-100 font-medium truncate max-w-[90px]">{p.product}</td>
                    <td className="py-2 px-1 text-right text-gray-300 tabular-nums">{p.verkocht}</td>
                    <td className={`py-2 px-1 text-right font-medium tabular-nums ${p.totaleWinst >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.verkocht > 0 ? formatEuro(p.totaleWinst) : '—'}
                    </td>
                    <td className="py-2 px-1 text-right text-gray-400 tabular-nums">{p.gemVerkoopprijs > 0 ? formatEuro(p.gemVerkoopprijs) : '—'}</td>
                    <td className="py-2 px-1 text-right text-gray-400 tabular-nums">{p.verkopenPerMaand > 0 ? p.verkopenPerMaand.toFixed(1) : '—'}</td>
                    <td className="py-2 px-1 text-right text-gray-300 tabular-nums">
                      {p.inHuis}{p.onderweg > 0 ? <span className="text-yellow-400">+{p.onderweg}</span> : ''}
                    </td>
                    <td className="py-2 px-1 text-right text-gray-400 capitalize">
                      {p.topMaand ? `${p.topMaand.slice(0, 3)} ${p.topMaandAantal}×` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-gray-500 text-[10px] mt-3 px-1 leading-snug">
              <span className="font-semibold">Verk.</span> = verkocht dit jaar &middot; <span className="font-semibold">Gem.</span> = gem. verkoopprijs &middot; <span className="font-semibold">/mnd</span> = verkopen per maand sinds eerste sale &middot; <span className="font-semibold">Vrr</span> = in huis (+ onderweg) &middot; <span className="font-semibold">Top</span> = maand met meeste verkopen
            </p>
          </div>
        </>
      )}

      {/* PER ACCOUNT DIT JAAR */}
      {stats.winstPerAccount.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Per account dit jaar</p>
          <div className="bg-gray-800 rounded-xl p-3 mb-4">
            <div className="space-y-1">
              {stats.winstPerAccount.map((a) => (
                <div key={a.account} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="text-gray-200 font-medium">{a.account}</span>
                  <div className="flex gap-3 items-baseline shrink-0">
                    <span className="text-gray-500 text-xs tabular-nums">{a.aantal}×</span>
                    <span className={`font-semibold tabular-nums ${a.winst >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatEuro(a.winst)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* GELD IN OMLOOP PER ACCOUNT (Vinted "in behandeling") */}
      {stats.geldInOmloopPerAccount && stats.geldInOmloopPerAccount.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">In behandeling per account</p>
          <div className="bg-gray-800 rounded-xl p-3 mb-4">
            <div className="space-y-1">
              {stats.geldInOmloopPerAccount.map((a) => (
                <div key={a.account} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="text-gray-200 font-medium">{a.account}</span>
                  <div className="flex gap-3 items-baseline shrink-0">
                    <span className="text-gray-500 text-xs tabular-nums">{a.aantal}×</span>
                    <span className="font-semibold tabular-nums text-amber-400">{formatEuro(a.bedrag)}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Nog te verzenden + onderweg + retour</p>
          </div>
        </>
      )}

      {/* WINST PER PRODUCT CHART */}
      {stats.winstPerProduct.some((p) => p.winst !== 0) && (
        <>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Winst per product</p>
          <div className="bg-gray-800 rounded-xl p-3 mb-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.winstPerProduct.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
                <YAxis type="category" dataKey="product" tick={{ fill: '#d1d5db', fontSize: 11 }} width={60} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f9fafb' }}
                  formatter={(value) => [formatEuro(Number(value)), 'Winst']}
                />
                <Bar dataKey="winst" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* VOORRAAD PER PRODUCT */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Voorraad</p>
      <VoorraadOverzicht voorraad={stats.voorraad} />
    </>
  )
}

function VoorraadOverzicht({ voorraad }: { voorraad: { product: string; in_huis: number; onderweg: number }[] }) {
  return (
    <div className="bg-gray-800 rounded-xl p-3 mb-4">
      <div className="space-y-1">
        {voorraad
          .filter((v) => v.in_huis > 0 || v.onderweg > 0)
          .sort((a, b) => b.in_huis - a.in_huis)
          .map((item) => (
            <div key={item.product} className="flex flex-wrap items-center gap-2 py-1 text-sm">
              <span className="text-gray-200 font-medium">{item.product}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.in_huis > 0 ? 'bg-emerald-900/30 text-emerald-400' : 'bg-gray-700/40 text-gray-500'}`}>
                {item.in_huis} in huis
              </span>
              {item.onderweg > 0 && (
                <span className="bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded text-xs font-semibold">
                  {item.onderweg} onderweg
                </span>
              )}
            </div>
          ))}
        {voorraad.every((v) => v.in_huis === 0 && v.onderweg === 0) && (
          <p className="text-gray-500 text-sm text-center py-2">Geen voorraad</p>
        )}
      </div>
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
