'use client'

import { useState } from 'react'
import { LISTINGS, PRODUCTEN } from '@/lib/constants'

export default function ListingsPage() {
  const [gekopieerd, setGekopieerd] = useState<string | null>(null)

  async function kopieer(tekst: string, sleutel: string) {
    try {
      await navigator.clipboard.writeText(tekst)
      setGekopieerd(sleutel)
      setTimeout(() => setGekopieerd(null), 2000)
    } catch {
      // Fallback voor oudere browsers
      const el = document.createElement('textarea')
      el.value = tekst
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setGekopieerd(sleutel)
      setTimeout(() => setGekopieerd(null), 2000)
    }
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-white mb-2">Listings tool</h1>
      <p className="text-gray-400 text-sm mb-6">Tik op een knop om te kopiëren naar klembord</p>

      <div className="space-y-3">
        {PRODUCTEN.filter((p) => LISTINGS[p]).map((product) => {
          const listing = LISTINGS[product]
          const titelSleutel = `titel-${product}`
          const beschSleutel = `besch-${product}`

          return (
            <div key={product} className="bg-gray-800 rounded-xl p-4">
              <p className="text-white font-semibold mb-3">{product}</p>

              <div className="space-y-2">
                <KopieerKnop
                  label="Titel"
                  tekst={listing.titel}
                  gekopieerd={gekopieerd === titelSleutel}
                  onClick={() => kopieer(listing.titel, titelSleutel)}
                />
                <p className="text-gray-500 text-xs px-1 truncate">{listing.titel}</p>

                <KopieerKnop
                  label="Beschrijving"
                  tekst={listing.beschrijving}
                  gekopieerd={gekopieerd === beschSleutel}
                  onClick={() => kopieer(listing.beschrijving, beschSleutel)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KopieerKnop({
  label,
  tekst,
  gekopieerd,
  onClick,
}: {
  label: string
  tekst: string
  gekopieerd: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
        gekopieerd
          ? 'bg-emerald-600 text-white'
          : 'bg-gray-700 text-gray-200 active:bg-gray-600'
      }`}
    >
      <span>{gekopieerd ? `${label} gekopieerd!` : `Kopieer ${label.toLowerCase()}`}</span>
      {gekopieerd ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
        </svg>
      )}
    </button>
  )
}
