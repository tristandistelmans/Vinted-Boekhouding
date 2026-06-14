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

export const ACCOUNTS = ['2-disteltr', 'trisverve', '1-jesuslata', '3-jasmijn'] as const

// Accounts die selecteerbaar zijn bij het invoeren van een nieuwe verkoop.
// value = opgeslagen accountcode, label = weergavetekst in de dropdown.
// Verwijderde/inactieve accounts (trisverve, 3-jasmijn, 1-jesuslata) blijven bestaan
// in de data, maar zijn hier niet meer kiesbaar. 1-jesuslata is geblokkeerd.
export const CEO_ACCOUNTS = [
  { value: 'trisgeuss', label: 'trisgeuss - iphone 13' },
  { value: 'pertumstar', label: 'pertumstar - GSM Jasmijn' },
  { value: '2-disteltr', label: 'disteltr' },
] as const

export const ACTIEVE_STATUSSEN = [
  'Afgerond (geld binnen)',
  'Verkocht - Nog niet verzonden',
  'Onderweg',
]

const GEDEELDE_BESCHRIJVING = `Hey :)
Ik verkoop mijn collectie Aime leon Dore petten omdat ik ga verhuizen.
Ik heb ze altijd verzameld maar verhuizen is duur dus ik heb wat extra geld nodig en ik moet plaatsmaken haha.
Als je vragen hebt mag je het altijd laten weten!`

export const LISTINGS: Record<string, { titel: string; beschrijving: string }> = {
  'NY Navy':             { titel: 'Aime leon Dore pet New Era Yankees Navy Perfect',        beschrijving: GEDEELDE_BESCHRIJVING },
  'NY Beige/Green':      { titel: 'Aime leon Dore pet New Era Yankees Beige Groen Perfect', beschrijving: GEDEELDE_BESCHRIJVING },
  'Porsche Green':       { titel: 'Groene Pet van Aime Leon dore Porsche Perfect',          beschrijving: GEDEELDE_BESCHRIJVING },
  'Porsche Black':       { titel: 'Zwarte Pet van Aime Leon dore Porsche Perfect',          beschrijving: GEDEELDE_BESCHRIJVING },
  'Porsche Red':         { titel: 'Rode Pet van Aime Leon dore Porsche Perfect',            beschrijving: GEDEELDE_BESCHRIJVING },
  'Porsche White Green': { titel: 'Wit Groen Pet van Aime Leon dore Porsche Perfect',       beschrijving: GEDEELDE_BESCHRIJVING },
  'UNI Black':           { titel: 'Aime Leon Dore Pet Zwart Unisphere Perfect',             beschrijving: GEDEELDE_BESCHRIJVING },
  'UNI Green':           { titel: 'Aime Leon Dore Pet Groen Unisphere Perfect',             beschrijving: GEDEELDE_BESCHRIJVING },
  'UNI Beige':           { titel: 'Aime Leon Dore Pet Beige Groen Unisphere Perfect',       beschrijving: GEDEELDE_BESCHRIJVING },
  'UNI Navy':            { titel: 'Aime Leon Dore Pet Navy Geel Unisphere Perfect',         beschrijving: GEDEELDE_BESCHRIJVING },
  'UNI White':           { titel: 'Aime Leon Dore Pet Wit Nylon Unisphere Perfect',         beschrijving: GEDEELDE_BESCHRIJVING },
}

// Mapping van Vinted listing-titels (keywords) naar onze productnamen.
// Volgorde is belangrijk: eerste match wint.
export const VINTED_PRODUCT_MAPPING: { keywords: string[]; product: string }[] = [
  // Porsche caps (check kleur na 'porsche')
  { keywords: ['porsche', 'black'], product: 'Porsche Black' },
  { keywords: ['porsche', 'red'], product: 'Porsche Red' },
  { keywords: ['porsche', 'green', 'beige'], product: 'Porsche White Green' },
  { keywords: ['porsche', 'beige'], product: 'Porsche White Green' },
  { keywords: ['porsche', 'white'], product: 'Porsche White Green' },
  { keywords: ['porsche', 'green'], product: 'Porsche Green' },
  // NY caps
  { keywords: ['yankees', 'navy'], product: 'NY Navy' },
  { keywords: ['yankees', 'beige'], product: 'NY Beige/Green' },
  { keywords: ['ny', 'navy'], product: 'NY Navy' },
  { keywords: ['ny', 'beige'], product: 'NY Beige/Green' },
  // UNI caps
  { keywords: ['unisphere', 'black'], product: 'UNI Black' },
  { keywords: ['unisphere', 'beige'], product: 'UNI Beige' },
  { keywords: ['unisphere', 'navy'], product: 'UNI Navy' },
  { keywords: ['unisphere', 'white'], product: 'UNI White' },
  { keywords: ['unisphere', 'nylon'], product: 'UNI White' },
  { keywords: ['unisphere', 'blue'], product: 'UNI Blue' },
  { keywords: ['unisphere', 'green'], product: 'UNI Green' },
  // Overige producten
  { keywords: ['acne', 'hoodie'], product: 'Acne Hoodie' },
  { keywords: ['ald', 'tote'], product: 'ALD Tote Bag' },
  { keywords: ['ald', 'tee'], product: 'ALD Tee' },
  { keywords: ['golden', 'goose'], product: 'Golden Goose' },
  { keywords: ['margiela'], product: 'Maison Margiela' },
]

export function mapVintedProduct(title: string): string {
  const lower = title.toLowerCase()
  for (const { keywords, product } of VINTED_PRODUCT_MAPPING) {
    if (keywords.every((kw) => lower.includes(kw))) {
      return product
    }
  }
  return 'Onbekend'
}

export type CommissieRegels = {
  drempel1: number
  commissie1: number
  drempel2: number
  commissie2: number
  extraStap: number
  extraBedrag: number
}

export const DEFAULT_COMMISSIE_REGELS: CommissieRegels = {
  drempel1: 30,
  commissie1: 3,
  drempel2: 35,
  commissie2: 5,
  extraStap: 5,
  extraBedrag: 2.5,
}

export function berekenCommissie(verkoopprijs: number, regels: CommissieRegels = DEFAULT_COMMISSIE_REGELS): number {
  if (verkoopprijs >= regels.drempel2) {
    return regels.commissie2 + Math.floor((verkoopprijs - regels.drempel2) / regels.extraStap) * regels.extraBedrag
  }
  if (verkoopprijs >= regels.drempel1) {
    return regels.commissie1
  }
  return 0
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

export function berekenDeadline(verkoopdatum: string): {
  deadline: Date
  dagenOver: number
  isUrgent: boolean
  isVerlopen: boolean
} {
  const start = new Date(verkoopdatum)
  let werkdagen = 0
  const current = new Date(start)

  while (werkdagen < 5) {
    current.setDate(current.getDate() + 1)
    const dag = current.getDay()
    if (dag !== 0 && dag !== 6) {
      werkdagen++
    }
  }

  const nu = new Date()
  nu.setHours(0, 0, 0, 0)
  current.setHours(0, 0, 0, 0)

  const verschilMs = current.getTime() - nu.getTime()
  const dagenOver = Math.ceil(verschilMs / (1000 * 60 * 60 * 24))

  return {
    deadline: current,
    dagenOver,
    isUrgent: dagenOver >= 0 && dagenOver <= 1,
    isVerlopen: dagenOver < 0,
  }
}
