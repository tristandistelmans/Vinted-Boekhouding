'use client'

import { useEffect, useState } from 'react'
import { PRODUCTEN, STATUSSEN, CEO_ACCOUNTS } from '@/lib/constants'

type ProductRegel = {
  id: string
  product: string
}

function nieuweRegel(): ProductRegel {
  return { id: crypto.randomUUID(), product: PRODUCTEN[0] }
}

export default function VerkopInvoeren() {
  const vandaag = new Date().toISOString().split('T')[0]
  const [isCEO, setIsCEO] = useState<boolean | null>(null)

  const [regels, setRegels] = useState<ProductRegel[]>([nieuweRegel()])
  const [form, setForm] = useState({
    verkoopdatum: vandaag,
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

  function updateRegel(id: string, product: string) {
    setRegels((prev) => prev.map((r) => (r.id === id ? { ...r, product } : r)))
    setBericht(null)
  }

  function voegRegelToe() {
    setRegels((prev) => [...prev, nieuweRegel()])
    setBericht(null)
  }

  function verwijderRegel(id: string) {
    setRegels((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))
    setBericht(null)
  }

  function resetForm() {
    setRegels([nieuweRegel()])
    setForm({
      verkoopdatum: vandaag,
      naam_koper: '',
      verkoopprijs: '50',
      status: 'Verkocht - Nog niet verzonden',
      account: CEO_ACCOUNTS[0],
      notitie: '',
    })
  }

  // Verdeel totaal eerlijk over N regels: alle regels krijgen totaal/N (op cent),
  // afrondingsrest gaat naar de laatste regel zodat de som exact klopt.
  function verdeelPrijs(totaal: number, aantal: number): number[] {
    const totaalCent = Math.round(totaal * 100)
    const basisCent = Math.floor(totaalCent / aantal)
    const restCent = totaalCent - basisCent * aantal
    const prijzen = Array(aantal).fill(basisCent / 100)
    prijzen[aantal - 1] = (basisCent + restCent) / 100
    return prijzen
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setBericht(null)

    const totaal = Number(form.verkoopprijs)
    if (!(totaal > 0)) {
      setBericht({ type: 'fout', tekst: 'Vul een geldige verkoopprijs in' })
      setBezig(false)
      return
    }

    const prijzen = verdeelPrijs(totaal, regels.length)
    const isBundel = regels.length > 1
    const account = isCEO ? form.account : '3-jasmijn'
    const notitiePrefix = isBundel ? `Bundel: ${regels.length} items` : ''
    const notitie = [notitiePrefix, form.notitie].filter(Boolean).join(' — ')

    try {
      const resultaten = await Promise.all(
        regels.map((regel, i) =>
          fetch('/api/verkopen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              verkoopdatum: form.verkoopdatum,
              product: regel.product,
              naam_koper: form.naam_koper,
              verkoopprijs: prijzen[i],
              status: form.status,
              account,
              notitie,
            }),
          }).then(async (res) => ({ ok: res.ok, data: await res.json() }))
        )
      )

      const gefaald = resultaten.filter((r) => !r.ok)
      if (gefaald.length === 0) {
        const omschrijving = isBundel
          ? `Bundel van ${regels.length} items toegevoegd voor €${totaal.toFixed(2)}`
          : `Verkoop toegevoegd! ${regels[0].product} voor €${totaal.toFixed(2)}`
        setBericht({ type: 'succes', tekst: omschrijving })
        resetForm()
      } else {
        const fout = gefaald[0].data?.error || 'Er ging iets mis'
        setBericht({
          type: 'fout',
          tekst: `${resultaten.length - gefaald.length} van ${resultaten.length} toegevoegd. Fout: ${fout}`,
        })
      }
    } catch {
      setBericht({ type: 'fout', tekst: 'Kon verbinding niet maken' })
    } finally {
      setBezig(false)
    }
  }

  const prijsPerPet = Number(form.verkoopprijs) > 0 && regels.length > 1
    ? (Number(form.verkoopprijs) / regels.length).toFixed(2)
    : null

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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-gray-400 text-sm font-medium">
              {regels.length > 1 ? `Producten (${regels.length})` : 'Product'}
            </label>
            <button
              type="button"
              onClick={voegRegelToe}
              className="text-blue-400 text-sm font-medium active:text-blue-500"
            >
              + Pet toevoegen
            </button>
          </div>
          <div className="space-y-2">
            {regels.map((regel) => (
              <div key={regel.id} className="flex gap-2">
                <select
                  value={regel.product}
                  onChange={(e) => updateRegel(regel.id, e.target.value)}
                  className="veld-input flex-1"
                  required
                >
                  {PRODUCTEN.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {regels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => verwijderRegel(regel.id)}
                    aria-label="Regel verwijderen"
                    className="px-4 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 active:bg-gray-700"
                  >
                    −
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

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

        <Veld label={regels.length > 1 ? 'Totale verkoopprijs (€)' : 'Verkoopprijs (€)'}>
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
          {prijsPerPet && (
            <p className="text-gray-500 text-xs mt-1">≈ €{prijsPerPet} per pet</p>
          )}
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
          {bezig ? 'Bezig...' : regels.length > 1 ? `Bundel toevoegen (${regels.length})` : 'Toevoegen'}
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
