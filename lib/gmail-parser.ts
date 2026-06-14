// Pure parser-functies voor Vinted-emails. Geen DB, geen network.
// Elk type wordt gedetecteerd op subject + body, en velden worden via regex geëxtraheerd.

import { mapVintedProduct } from '@/lib/constants'

// Nederlandse termen → Engels, zodat mapVintedProduct() (gericht op Engelse listings)
// ook Nederlandstalige Vinted-titels kan herkennen.
const NL_NAAR_EN: Record<string, string> = {
  groen: 'green',
  zwart: 'black',
  rood: 'red',
  wit: 'white',
  blauw: 'blue',
  beige: 'beige',
  navy: 'navy',
  geel: 'yellow',
  pet: 'cap',
  zak: 'bag',
  hoodie: 'hoodie',
}

function normalizeProductTitle(title: string): string {
  let out = title.toLowerCase()
  for (const [nl, en] of Object.entries(NL_NAAR_EN)) {
    out = out.replace(new RegExp(`\\b${nl}\\b`, 'g'), en)
  }
  return out
}

function mapProductBerg(title: string): string {
  return mapVintedProduct(normalizeProductTitle(title))
}

export type AccountKey = '1-jesuslata' | '2-disteltr' | 'pertumstar' | 'trisgeuss'

// E-mailadres -> account. Best-effort: gevuld voor adressen die we kennen.
// Voor pertumstar/trisgeuss (Apple/iCloud) zijn de exacte adressen nog onbekend;
// die worden afgeleid uit de Vinted-username in de begroeting (zie findAccount stap 4).
// Vul hier het echte adres in zodra het zichtbaar is in email_ingestie_log.
const ACCOUNT_VAN_EMAIL: Record<string, AccountKey> = {
  'tristandistzlmans@gmail.com': '1-jesuslata',
  'disteltr@gmail.com': '2-disteltr',
  // pertumstar: Vinted-adres = dedicated Gmail die naar de hub forwardt (afzender blijft vinted.*).
  'esdoornm@gmail.com': 'pertumstar',
  // trisgeuss: Apple Sign-in-with-Apple relay; het relay-adres blijft in de To-header staan.
  'ttpz954dst@privaterelay.appleid.com': 'trisgeuss',
}

// Vinted-username -> account. De accountcodes zijn gelijk aan de Vinted-usernames,
// dus dit is de betrouwbare detectie ongeacht welk e-mailadres doorstuurt.
const ACCOUNT_VAN_USERNAME: Record<string, AccountKey> = {
  'jesuslata': '1-jesuslata',
  'disteltr': '2-disteltr',
  'pertumstar': 'pertumstar',
  'trisgeuss': 'trisgeuss',
}

export type ParseResult =
  | {
      type: 'verkoop'
      account: AccountKey | null
      koper: string | null
      product: string | null
      productMapped: string | null
      isBundel: boolean
      bundelAantal: number
      prijs: number | null
      transactionId: null
      foutmelding?: string
    }
  | {
      type: 'verzendlabel'
      account: AccountKey | null
      product: string | null
      productMapped: string | null
      transactionId: string
      tracking: string | null
      foutmelding?: string
    }
  | {
      type: 'afgerond'
      account: AccountKey | null
      product: string | null
      productMapped: string | null
      transactionId: string
      bedragItem: number | null
      foutmelding?: string
    }
  | {
      type: 'retour'
      account: AccountKey | null
      transactionId: string | null
      foutmelding?: string
    }
  | {
      type: 'onbekend'
      account: AccountKey | null
      foutmelding?: string
    }

export type ParseInput = {
  subject: string
  plaintextBody: string
  fromHeader: string
  toHeader: string
}

function parseEuro(raw: string): number | null {
  // "€ 60,00" of "€60.00" of "60,00 EUR" → 60.00
  const match = raw.replace(/\s/g, '').match(/(\d+[.,]\d{2}|\d+)/)
  if (!match) return null
  const num = parseFloat(match[1].replace(',', '.'))
  return Number.isFinite(num) ? num : null
}

function findAccount(body: string, fromHeader: string, toHeader: string): AccountKey | null {
  // 1. Probeer "Aan: <{email}>" in geforwardde body (specifiek: origineel ontvangeradres)
  const forwardedTo = body.match(/Aan:\s*<?([\w._-]+@[\w.-]+)>?/i)
  if (forwardedTo) {
    const email = forwardedTo[1].toLowerCase()
    if (ACCOUNT_VAN_EMAIL[email]) return ACCOUNT_VAN_EMAIL[email]
  }

  // 2. Begroeting "Hey {username}," / "Beste {username}," / "voltooid {username},"
  // Dit is Vinted's eigen tekst en dus de betrouwbaarste bron: immuun voor
  // forwarding (alle mails komen samen op de hub, dus To/From zijn vervuild).
  const greetingPatterns = [
    /Hey\s+([a-z0-9_-]+),/i,
    /Beste\s+([a-z0-9_-]+),/i,
    /voltooid\s+([a-z0-9_-]+),/i,
  ]
  for (const pat of greetingPatterns) {
    const m = body.match(pat)
    if (m) {
      const u = m[1].toLowerCase()
      if (ACCOUNT_VAN_USERNAME[u]) return ACCOUNT_VAN_USERNAME[u]
    }
  }

  // 3. To: header zelf (bij directe Vinted-mails, fallback als begroeting onbekend is)
  const toMatch = toHeader.match(/<?([\w._-]+@[\w.-]+)>?/)
  if (toMatch && ACCOUNT_VAN_EMAIL[toMatch[1].toLowerCase()]) {
    return ACCOUNT_VAN_EMAIL[toMatch[1].toLowerCase()]
  }

  // 4. From-header bij forwards (de doorsturende account)
  const fromMatch = fromHeader.match(/<?([\w._-]+@[\w.-]+)>?/)
  if (fromMatch && ACCOUNT_VAN_EMAIL[fromMatch[1].toLowerCase()]) {
    return ACCOUNT_VAN_EMAIL[fromMatch[1].toLowerCase()]
  }

  return null
}

function detectType(subject: string, body: string): ParseResult['type'] {
  const s = subject.toLowerCase()
  const b = body.toLowerCase()

  // Verzendlabel: meest specifiek
  if (s.includes('verzendlabel') || b.includes('*verzendinformatie*') || b.includes('verzendinformatie')) {
    return 'verzendlabel'
  }

  // Afgerond: "verkoop is voltooid" of "succesvol afgerond" of "saldo"
  if (
    b.includes('verkoop is voltooid') ||
    b.includes('succesvol afgerond') ||
    s.includes('afgerond') ||
    s.includes('saldo bijgewerkt') ||
    b.includes('overgemaakt naar je vinted portemonnee')
  ) {
    return 'afgerond'
  }

  // Retour
  if (s.includes('retour') || b.includes('retourzending') || b.includes('terugbetaling')) {
    return 'retour'
  }

  // Verkoop: "heeft gekocht" + "Hey {user}"
  if (b.includes('heeft gekocht')) {
    return 'verkoop'
  }

  return 'onbekend'
}

function parseVerkoop(input: ParseInput, account: AccountKey | null): Extract<ParseResult, { type: 'verkoop' }> {
  const body = input.plaintextBody

  // Koper: regel die eindigt op "heeft gekocht"
  const koperMatch = body.match(/^\s*(\S+)\s+heeft gekocht/m) || body.match(/(\S+)\s+heeft gekocht/)
  const koper = koperMatch ? koperMatch[1] : null

  // Bundel-detectie
  const bundelMatch = body.match(/Bundel:\s*(\d+)\s+artikelen?/i)
  const isBundel = bundelMatch !== null
  const bundelAantal = bundelMatch ? parseInt(bundelMatch[1], 10) : 1

  // Productnaam: tekst tussen "heeft gekocht" en het euro-bedrag.
  // In de meeste mails staat alles op één regel; \s matcht ook newlines voor multi-line varianten.
  // Bij bundel: 'null' (we weten niet welke producten — die volgen via verzendlabels).
  let product: string | null = null
  if (!isBundel) {
    const productMatch = body.match(/heeft gekocht\s+(.+?)\s+€\s*[\d.,]+/i)
    if (productMatch) {
      // Strip eventuele "Cap" / "pet" / aantal-prefixes bij begin niet — die hebben we nodig voor mapping
      product = productMatch[1].trim().replace(/\s+/g, ' ')
    }
  }

  // Prijs: "€ 60,00" eerste match
  const prijsMatch = body.match(/€\s*([\d.,]+)/)
  const prijs = prijsMatch ? parseEuro(prijsMatch[0]) : null

  return {
    type: 'verkoop',
    account,
    koper,
    product,
    productMapped: product ? mapProductBerg(product) : null,
    isBundel,
    bundelAantal,
    prijs,
    transactionId: null,
  }
}

function parseVerzendlabel(input: ParseInput, account: AccountKey | null): Extract<ParseResult, { type: 'verzendlabel' }> {
  const body = input.plaintextBody

  // *Bestelling:* {product}
  const productMatch = body.match(/\*?Bestelling:\*?\s*(.+?)(?:\r?\n|\*)/i)
  const product = productMatch ? productMatch[1].trim() : null

  // *Transactie-ID:* {id}
  const txIdMatch = body.match(/\*?Transactie-ID:\*?\s*#?(\d+)/i)
  const transactionId = txIdMatch ? txIdMatch[1] : ''

  // *Trackingnummer:* {tracking}
  const trackingMatch = body.match(/\*?Trackingnummer:\*?\s*(\S+)/i)
  const tracking = trackingMatch ? trackingMatch[1] : null

  return {
    type: 'verzendlabel',
    account,
    product,
    productMapped: product ? mapProductBerg(product) : null,
    transactionId,
    tracking,
  }
}

function parseAfgerond(input: ParseInput, account: AccountKey | null): Extract<ParseResult, { type: 'afgerond' }> {
  const body = input.plaintextBody

  // "Je verkoop van {product} is succesvol afgerond"
  const productMatch = body.match(/Je verkoop van\s+(.+?)\s+is succesvol afgerond/i)
  const product = productMatch ? productMatch[1].trim() : null

  // "Transactie-ID: #{id}" of zonder #
  const txIdMatch = body.match(/Transactie-ID:\s*#?(\d+)/i)
  const transactionId = txIdMatch ? txIdMatch[1] : ''

  // "Ontvangen voor item: € 90,00"
  const bedragMatch = body.match(/Ontvangen voor item:\s*€\s*([\d.,]+)/i)
  const bedragItem = bedragMatch ? parseEuro(bedragMatch[0]) : null

  return {
    type: 'afgerond',
    account,
    product,
    productMapped: product ? mapProductBerg(product) : null,
    transactionId,
    bedragItem,
  }
}

function parseRetour(input: ParseInput, account: AccountKey | null): Extract<ParseResult, { type: 'retour' }> {
  const body = input.plaintextBody
  const txIdMatch = body.match(/Transactie-ID:\s*#?(\d+)/i)
  return {
    type: 'retour',
    account,
    transactionId: txIdMatch ? txIdMatch[1] : null,
  }
}

export function parseEmail(input: ParseInput): ParseResult {
  const account = findAccount(input.plaintextBody, input.fromHeader, input.toHeader)
  const type = detectType(input.subject, input.plaintextBody)

  switch (type) {
    case 'verkoop':
      return parseVerkoop(input, account)
    case 'verzendlabel':
      return parseVerzendlabel(input, account)
    case 'afgerond':
      return parseAfgerond(input, account)
    case 'retour':
      return parseRetour(input, account)
    default:
      return { type: 'onbekend', account, foutmelding: 'Mailtype niet herkend' }
  }
}
