export const PRODUCTEN = [
  'Porsche Green',
  'Porsche Black',
  'Porsche Red',
  'Porsche White Green',
  'NY Navy',
  'NY Beige/Green',
  'UNI Navy',
  'UNI Black',
  'UNI Beige',
  'UNI White',
  'UNI Green',
  'UNI Blue',
  'Acne Hoodie',
  'ALD Tee',
  'ALD Tote Bag',
  'Golden Goose',
  'Maison Margiela',
] as const

export const STATUSSEN = [
  'Afgerond (geld binnen)',
  'Verkocht - Nog niet verzonden',
  'Onderweg',
  'Retour',
  'Retour ontvangen',
  'Verlies',
  'Probleem',
] as const

export const ACCOUNTS = ['1-jesuslata', '2-disteltr'] as const

export const ACTIEVE_STATUSSEN = [
  'Afgerond (geld binnen)',
  'Verkocht - Nog niet verzonden',
  'Onderweg',
]

export const LISTINGS: Record<string, { titel: string; beschrijving: string }> = {
  'NY Navy': {
    titel: 'Cap Aime Leon Dore Yankees Navy Cotton Blue',
    beschrijving: 'There are no signs of usage. If you have any questions, ask away!',
  },
  'NY Beige/Green': {
    titel: 'Cap Aime Leon Dore Yankees Beige Cotton Green',
    beschrijving: 'There are no signs of usage. If you have any questions, ask away!',
  },
  'Porsche Green': {
    titel: 'Cap Aime Leon Dore Porsche Cotton Green',
    beschrijving: 'There are no signs of usage. If you have any questions, ask away!',
  },
  'Porsche Black': {
    titel: 'Cap Aime Leon Dore Porsche Cotton Black',
    beschrijving: 'There are no signs of usage. If you have any questions, ask away!',
  },
  'Porsche Red': {
    titel: 'Cap Aime Leon Dore Porsche Cotton Red',
    beschrijving: 'There are no signs of usage. If you have any questions, ask away!',
  },
  'Porsche White Green': {
    titel: 'Cap Aime Leon Dore Porsche Cotton Beige Green',
    beschrijving: 'There are no signs of usage. If you have any questions, ask away!',
  },
  'UNI Black': {
    titel: 'Cap Aime Leon Dore Unisphere Cotton Black',
    beschrijving: 'There are no signs of usage. If you have any questions, ask away!',
  },
  'UNI Green': {
    titel: 'Cap Aime Leon Dore Unisphere Cotton green',
    beschrijving: 'There are no signs of usage. If you have any questions, ask away!',
  },
  'UNI Beige': {
    titel: 'Cap Aime Leon Dore Unisphere Cotton Beige Green',
    beschrijving: 'There are no signs of usage. If you have any questions, ask away!',
  },
  'UNI Navy': {
    titel: 'Cap Aime Leon Dore Unisphere Cotton Navy',
    beschrijving: 'There are no signs of usage. If you have any questions, ask away!',
  },
  'UNI White': {
    titel: 'Cap Aime Leon Dore Unisphere Nylon White',
    beschrijving: 'There are no signs of usage. If you have any questions, ask away!',
  },
}

export function berekenWinst(
  status: string,
  verkoopprijs: number,
  aankoopprijs: number
): number | null {
  if (
    status === 'Afgerond (geld binnen)' ||
    status === 'Verkocht - Nog niet verzonden' ||
    status === 'Onderweg'
  ) {
    return verkoopprijs - aankoopprijs
  }
  if (status === 'Retour') return 0
  if (status === 'Verlies') return -aankoopprijs
  return null
}

export function formatEuro(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDatum(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
