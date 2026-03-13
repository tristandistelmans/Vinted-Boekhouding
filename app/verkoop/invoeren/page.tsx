'use client'

import { useEffect, useState } from 'react'
import { PRODUCTEN, STATUSSEN, CEO_ACCOUNTS } from '@/lib/constants'

export default function VerkopInvoeren() {
  const vandaag = new Date().toISOString().split('T')[0]
  const [isCEO, setIsCEO] = useState<boolean | null>(null)

  const [form, setForm] = useState({
    verkoopdatum: vandaag,
    product: PRODUCTEN[0],
    naam_koper: '',
    verkoopprijs: '50',
    status: 'Verkocht - Nog niet verzonden',
    account: CEO_ACCOUNTS[0],
    notitie: '',
  })
  const [bezig, setBezig] = useState(false)
  const [bericht, setBericht] = useState<{ type: 'succes' | 'fout'; tekst: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setIsCEO(data.isCEO))
  }, [])

  function updateForm(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setBericht(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setBericht(null)

    // Voor Jasmijn: account wordt server-side ingesteld; stuur gewoon mee
    const body = isCEO ? form : { ...form, account: '3-jasmijn' }

    try {
      const res = await fetch('/api/verkopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setBericht({ type: 'fout', tekst: data.error || 'Er ging iets mis' })
      } else {
        setBericht({ type: 'succes', tekst: `Verkoop toegevoegd! ${form.product} voor €${form.verkoopprijs}` })
        setForm({
          verkoopdatum: vandaag,
          product: PRODUCTEN[0],
          naam_koper: '',
          verkoopprijs: '50',
          status: 'Verkocht - Nog niet verzonden',
          account: CEO_ACCOUNTS[0],
          notitie: '',
        })
      }
    } catch {
      setBericht({ type: 'fout', tekst: 'Kon verbinding niet maken' })
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-white mb-6">Verkoop invoeren</h1>

      {bericht && (
        <div
          className={`rounded-xl p-4 mb-5 text-sm font-medium ${
            bericht.type === 'succes'
              ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300'
              : 'bg-red-900/40 border border-red-700 text-red-300'
          }`}
        >
          {bericht.tekst}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Veld label="Datum">
          <input
            type="date"
            value={form.verkoopdatum}
            onChange={(e) => updateForm('verkoopdatum', e.target.value)}
            className="veld-input"
            required
          />
        </Veld>

        <Veld label="Product">
          <select
            value={form.product}
            onChange={(e) => updateForm('product', e.target.value)}
            className="veld-input"
            required
          >
            {PRODUCTEN.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Veld>

        <Veld label="Naam koper (Vinted)">
          <input
            type="text"
            value={form.naam_koper}
            onChange={(e) => updateForm('naam_koper', e.target.value)}
            placeholder="Gebruikersnaam koper"
            className="veld-input"
            required
            autoCapitalize="none"
            autoCorrect="off"
          />
        </Veld>

        <Veld label="Verkoopprijs (€)">
          <input
            type="number"
            value={form.verkoopprijs}
            onChange={(e) => updateForm('verkoopprijs', e.target.value)}
            placeholder="50"
            className="veld-input"
            required
            min="0"
            step="0.01"
            inputMode="decimal"
          />
        </Veld>

        <Veld label="Status">
          <select
            value={form.status}
            onChange={(e) => updateForm('status', e.target.value)}
            className="veld-input"
            required
          >
            {STATUSSEN.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Veld>

        {/* Account dropdown alleen voor CEO */}
        {isCEO && (
          <Veld label="Account">
            <select
              value={form.account}
              onChange={(e) => updateForm('account', e.target.value)}
              className="veld-input"
              required
            >
              {CEO_ACCOUNTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Veld>
        )}

        <Veld label="Notitie (optioneel)">
          <textarea
            value={form.notitie}
            onChange={(e) => updateForm('notitie', e.target.value)}
            placeholder="Extra info, opmerking..."
            className="veld-input"
            rows={2}
            style={{ resize: 'none' }}
          />
        </Veld>

        <button
          type="submit"
          disabled={bezig}
          className="w-full py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold disabled:opacity-50 active:bg-blue-700 transition-colors mt-2"
        >
          {bezig ? 'Bezig...' : 'Toevoegen'}
        </button>
      </form>

      <style>{`
        .veld-input {
          width: 100%;
          background: #1f2937;
          border: 1px solid #374151;
          color: white;
          border-radius: 0.75rem;
          padding: 0.875rem 1rem;
          font-size: 1rem;
          outline: none;
        }
        .veld-input:focus {
          border-color: #3b82f6;
        }
        .veld-input option {
          background: #1f2937;
        }
      `}</style>
    </div>
  )
}

function Veld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-gray-400 text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}
