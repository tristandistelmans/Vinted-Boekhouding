'use client'

import { useState, useEffect } from 'react'
import { LISTINGS, PRODUCTEN } from '@/lib/constants'
import JSZip from 'jszip'

type Manifest = Record<string, string[]>

function productSlug(product: string): string {
  return product.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function ListingsPage() {
  const [gekopieerd, setGekopieerd] = useState<string | null>(null)
  const [manifest, setManifest] = useState<Manifest>({})
  const [zipBezig, setZipBezig] = useState<string | null>(null)

  useEffect(() => {
    fetch('/products/manifest.json')
      .then((r) => r.json())
      .then((data) => setManifest(data))
      .catch(() => {})
  }, [])

  async function kopieer(tekst: string, sleutel: string) {
    try {
      await navigator.clipboard.writeText(tekst)
    } catch {
      const el = document.createElement('textarea')
      el.value = tekst
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setGekopieerd(sleutel)
    setTimeout(() => setGekopieerd(null), 1500)
  }

  async function downloadZip(product: string) {
    const slug = productSlug(product)
    const fotos = manifest[slug]
    if (!fotos || fotos.length === 0) return

    setZipBezig(product)
    try {
      const zip = new JSZip()
      await Promise.all(
        fotos.map(async (filename) => {
          const res = await fetch(`/products/${slug}/${filename}`)
          const blob = await res.blob()
          zip.file(filename, blob)
        })
      )
      const content = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(content)
      a.download = `${slug}.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setZipBezig(null)
    }
  }

  const productenMetListing = PRODUCTEN.filter((p) => LISTINGS[p])

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-white mb-1">Listings</h1>
      <p className="text-gray-500 text-xs mb-4">{productenMetListing.length} producten — tik T of B om te kopiëren</p>

      <div className="space-y-2">
        {productenMetListing.map((product) => {
          const listing = LISTINGS[product]
          const slug = productSlug(product)
          const fotos = manifest[slug] ?? []
          const tKey = `t-${product}`
          const bKey = `b-${product}`
          const tGekopieerd = gekopieerd === tKey
          const bGekopieerd = gekopieerd === bKey

          return (
            <div key={product} className="bg-gray-800 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold leading-tight">{product}</p>
                  <p className="text-gray-400 text-xs mt-0.5 truncate">{listing.titel}</p>
                </div>
                <div className="flex gap-1.5 shrink-0 mt-0.5">
                  <button
                    onClick={() => kopieer(listing.titel, tKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      tGekopieerd ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 active:bg-gray-600'
                    }`}
                  >
                    {tGekopieerd ? '✓' : 'T'}
                  </button>
                  <button
                    onClick={() => kopieer(listing.beschrijving, bKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      bGekopieerd ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 active:bg-gray-600'
                    }`}
                  >
                    {bGekopieerd ? '✓' : 'B'}
                  </button>
                </div>
              </div>

              {fotos.length > 0 && (
                <div className="mt-3">
                  <div className="flex gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/products/${slug}/${fotos[0]}`}
                      alt={`${product} foto`}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  </div>
                  <button
                    onClick={() => downloadZip(product)}
                    disabled={zipBezig === product}
                    className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-300 active:bg-gray-600 disabled:opacity-50"
                  >
                    {zipBezig === product ? 'Bezig...' : `Download ZIP (${fotos.length} foto${fotos.length !== 1 ? "'s" : ''})`}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
