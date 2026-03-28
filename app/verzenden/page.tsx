'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { formatDatum, berekenDeadline } from '@/lib/constants'

type Verkoop = {
  id: string
  verkoopdatum: string
  product: string
  naam_koper: string
  verkoopprijs: number
  status: string
  account: string
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

function deadlineLabel(dagenOver: number, isVerlopen: boolean): { tekst: string; kleur: string } {
  if (isVerlopen) {
    const dagen = Math.abs(dagenOver)
    return { tekst: `${dagen} ${dagen === 1 ? 'dag' : 'dagen'} te laat!`, kleur: 'text-red-400' }
  }
  if (dagenOver === 0) return { tekst: 'Vandaag!', kleur: 'text-red-400' }
  if (dagenOver === 1) return { tekst: 'Nog 1 dag!', kleur: 'text-orange-400' }
  if (dagenOver === 2) return { tekst: 'Nog 2 dagen', kleur: 'text-orange-400' }
  return { tekst: `Nog ${dagenOver} werkdagen`, kleur: 'text-green-400' }
}

const accountLabel: Record<string, string> = {
  '1-jesuslata': 'Jesuslata',
  '2-disteltr': 'Disteltr',
  '3-jasmijn': 'Jasmijn',
}

export default function VerzendenPage() {
  const [verkopen, setVerkopen] = useState<Verkoop[]>([])
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState('')
  const [verzendBezig, setVerzendBezig] = useState<string | null>(null)

  const laadVerkopen = useCallback(async () => {
    setLaden(true)
    try {
      const res = await fetch('/api/verkopen')
      const data = await res.json()
      if (data.error) setFout(data.error)
      else setVerkopen(data.filter((v: Verkoop) => v.status === 'Verkocht - Nog niet verzonden'))
    } catch {
      setFout('Kon verkopen niet laden')
    } finally {
      setLaden(false)
    }
  }, [])

  useEffect(() => {
    laadVerkopen()
  }, [laadVerkopen])

  async function markeerVerzonden(id: string) {
    setVerzendBezig(id)
    try {
      const res = await fetch(`/api/verkopen/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Onderweg' }),
      })
      if (res.ok) {
        setVerkopen((prev) => prev.filter((v) => v.id !== id))
      }
    } finally {
      setVerzendBezig(null)
    }
  }

  // Sort by urgency (most urgent first)
  const gesorteerd = [...verkopen].sort((a, b) => {
    const da = berekenDeadline(a.verkoopdatum)
    const db = berekenDeadline(b.verkoopdatum)
    return da.dagenOver - db.dagenOver
  })

  // Group by product for summary
  const perProduct: Record<string, number> = {}
  verkopen.forEach((v) => {
    perProduct[v.product] = (perProduct[v.product] || 0) + 1
  })
  const productSamenvatting = Object.entries(perProduct).sort((a, b) => b[1] - a[1])

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">Te Verzenden</h1>
        {verkopen.length > 0 && (
          <span className="bg-blue-500/20 text-blue-400 text-sm font-semibold px-2.5 py-0.5 rounded-full">
            {verkopen.length}
          </span>
        )}
      </div>

      {laden && <div className="text-center text-gray-400 py-16 text-lg">Laden...</div>}
      {fout && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 mb-4">{fout}</div>
      )}

      {!laden && verkopen.length === 0 && !fout && (
        <div className="text-center py-16">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-12 h-12 text-gray-600 mx-auto mb-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-gray-500 text-lg">Alles verzonden!</p>
          <p className="text-gray-600 text-sm mt-1">Er zijn geen openstaande zendingen.</p>
        </div>
      )}

      {!laden && verkopen.length > 0 && (
        <>
          {/* Product summary */}
          <div className="flex flex-wrap gap-2 mb-5">
            {productSamenvatting.map(([product, aantal]) => (
              <div
                key={product}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
              >
                <span className="text-gray-300">{product}</span>
                <span className="text-blue-400 font-semibold ml-1.5">x{aantal}</span>
              </div>
            ))}
          </div>

          {/* Sales list */}
          <div className="space-y-3">
            {gesorteerd.map((v) => {
              const dl = berekenDeadline(v.verkoopdatum)
              const label = deadlineLabel(dl.dagenOver, dl.isVerlopen)

              return (
                <div
                  key={v.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    <ProductAfbeelding product={v.product} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white text-sm font-medium truncate">{v.product}</p>
                        <span className="text-gray-500 text-xs flex-shrink-0">
                          {accountLabel[v.account] || v.account}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs truncate">{v.naam_koper}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs">{formatDatum(v.verkoopdatum)}</span>
                          <span className={`text-xs font-medium ${label.kleur}`}>{label.tekst}</span>
                        </div>
                        <button
                          onClick={() => markeerVerzonden(v.id)}
                          disabled={verzendBezig === v.id}
                          className="bg-blue-500/20 text-blue-400 text-xs font-semibold px-3 py-1 rounded-lg hover:bg-blue-500/30 active:bg-blue-500/40 transition-colors disabled:opacity-50"
                        >
                          {verzendBezig === v.id ? '...' : 'Verzonden'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
