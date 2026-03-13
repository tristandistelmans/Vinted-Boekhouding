'use client'

import { useEffect, useState } from 'react'
import { formatEuro } from '@/lib/constants'

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
  omzetBinnenDezeMaand: number
  omzetOnderwegDezeMaand: number
  commissieBinnenDitJaar: number
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
  totaleVoorraadWaarde: number
  omzetDitJaar: number
  kostenProductDitJaar: number
  commissiesDitJaar: number
  extraKostenDitJaar: number
  geldBinnen: number
  geldVerwacht: number
  kostenInkopenDitJaar: number
  kostenInkopenDezeMaand: number
  omzetDezeMaand: number
  kostenProductDezeMaand: number
  commissiesDezeMaand: number
  extraKostenDezeMaand: number
  geldBinnenDezeMaand: number
  geldVerwachtDezeMaand: number
  teVerzenden: number
  voorraad: { product: string; in_huis: number; onderweg: number }[]
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

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
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
          <CEODashboard
            stats={stats}
            huidigeMaand={huidigeMaand}
            huidigJaar={huidigJaar}
          />
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

        {jasmijn.teBetalen > 0 && (
          <p className="text-xs text-gray-500 mb-3">
            Dit zijn afgeronde sales waarvan je het geld nog niet hebt overgemaakt.
          </p>
        )}

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
            <p className="text-blue-700 text-xs mt-0.5">Mijn commissie</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Omzet binnen</span>
            <span className="text-white font-medium">{formatEuro(jasmijn.omzetBinnenDezeMaand)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Mijn commissie</span>
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
            <p className="text-blue-700 text-xs mt-0.5">Mijn commissie</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Omzet binnen</span>
            <span className="text-white font-medium">{formatEuro(jasmijn.omzetBinnenDitJaar)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Totale commissie</span>
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

function CEODashboard({
  stats,
  huidigeMaand,
  huidigJaar,
}: {
  stats: Stats
  huidigeMaand: string
  huidigJaar: number
}) {
  return (
    <>
      {/* DEZE MAAND */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">{huidigeMaand}</p>
      <div className="bg-gray-800 rounded-xl p-4 mb-3">
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
          {stats.commissiesDezeMaand > 0 && (
            <div className="flex-1 bg-blue-900/20 border border-blue-700/30 rounded-xl p-2.5 text-center min-w-0">
              <p className="text-blue-400 text-sm font-bold leading-tight truncate">−{formatEuro(stats.commissiesDezeMaand)}</p>
              <p className="text-blue-700 text-xs mt-0.5">Commissies</p>
            </div>
          )}
        </div>

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
          {stats.commissiesDezeMaand > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Commissies Jasmijn</span>
              <span className="text-blue-400">− {formatEuro(stats.commissiesDezeMaand)}</span>
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
            <span className={`font-bold ${(stats.omzetDezeMaand - stats.kostenInkopenDezeMaand - stats.commissiesDezeMaand - stats.extraKostenDezeMaand) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatEuro(stats.omzetDezeMaand - stats.kostenInkopenDezeMaand - stats.commissiesDezeMaand - stats.extraKostenDezeMaand)}
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
          {stats.commissiesDitJaar > 0 && (
            <div className="flex-1 bg-blue-900/20 border border-blue-700/30 rounded-xl p-2.5 text-center min-w-0">
              <p className="text-blue-400 text-sm font-bold leading-tight truncate">−{formatEuro(stats.commissiesDitJaar)}</p>
              <p className="text-blue-700 text-xs mt-0.5">Commissies</p>
            </div>
          )}
        </div>

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
          {stats.commissiesDitJaar > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Commissies Jasmijn</span>
              <span className="text-blue-400">− {formatEuro(stats.commissiesDitJaar)}</span>
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
            <span className={`font-bold ${(stats.omzetDitJaar - stats.kostenInkopenDitJaar - stats.commissiesDitJaar - stats.extraKostenDitJaar) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatEuro(stats.omzetDitJaar - stats.kostenInkopenDitJaar - stats.commissiesDitJaar - stats.extraKostenDitJaar)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Verkopen" waarde={String(stats.aantalDitJaar)} />
        <StatCard label="Waarde voorraad" waarde={formatEuro(stats.totaleVoorraadWaarde)} groot />
      </div>

      {/* JASMIJN OPENSTAAND */}
      {stats.jasmijnOpenstaand !== undefined && stats.jasmijnOpenstaand > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Jasmijn</p>
          <div className="bg-orange-900/20 border border-orange-700/40 rounded-xl p-4 mb-6">
            <p className="text-gray-400 text-xs mb-1">Nog te ontvangen van Jasmijn</p>
            <p className="text-orange-400 text-2xl font-bold">{formatEuro(stats.jasmijnOpenstaand)}</p>
            <p className="text-gray-600 text-xs mt-1">Markeer sales als uitbetaald in Bestellingen</p>
          </div>
        </>
      )}

      {/* VOORRAAD */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Voorraad</p>
      <VoorraadOverzicht voorraad={stats.voorraad} />
    </>
  )
}

function VoorraadOverzicht({ voorraad }: { voorraad: { product: string; in_huis: number; onderweg: number }[] }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="space-y-2">
        {voorraad
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
