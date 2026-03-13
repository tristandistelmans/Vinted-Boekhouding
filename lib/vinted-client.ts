const VINTED_BASE = 'https://www.vinted.nl'

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
}

export interface VintedOrder {
  id: number | string
  item: {
    id: number
    title: string
    price: string
    currency: string
  }
  buyer: {
    id: number
    login: string
  }
  total_item_price: string
  status: string
  created_at: string
  updated_at: string
}

export interface ParsedTokens {
  accessToken: string
  refreshToken: string
  xcsrfToken: string
}

/**
 * Parst de volledige output van de Resoled Token Tool:
 * "Bearer access_token: eyJ... refresh_token: eyJ... xcsrf_token: uuid"
 */
export function parseResoledOutput(input: string): ParsedTokens | null {
  const accessMatch = input.match(/access_token:\s*(\S+)/)
  const refreshMatch = input.match(/refresh_token:\s*(\S+)/)
  const xcsrfMatch = input.match(/xcsrf_token:\s*(\S+)/)

  if (!accessMatch?.[1]) return null

  return {
    accessToken: accessMatch[1],
    refreshToken: refreshMatch?.[1] || '',
    xcsrfToken: xcsrfMatch?.[1] || '',
  }
}

export async function fetchOrders(
  accessToken: string,
  xcsrfToken?: string
): Promise<VintedOrder[]> {
  const orders: VintedOrder[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const resp = await fetch(
      `${VINTED_BASE}/api/v2/orders?type=seller&page=${page}&per_page=${perPage}`,
      {
        headers: {
          ...DEFAULT_HEADERS,
          Authorization: `Bearer ${accessToken}`,
          ...(xcsrfToken ? { 'X-CSRF-Token': xcsrfToken } : {}),
        },
      }
    )

    if (resp.status === 401) {
      throw new TokenExpiredError()
    }

    if (!resp.ok) {
      throw new Error(`Fout bij ophalen orders (${resp.status})`)
    }

    const data = await resp.json()
    const batch: VintedOrder[] = data.orders || []
    orders.push(...batch)

    if (batch.length < perPage) break
    page++
    if (page > 10) break
  }

  return orders
}

export class TokenExpiredError extends Error {
  constructor() {
    super('Access token verlopen')
  }
}

/**
 * Vernieuwt het access token via de refresh token.
 * Geeft het nieuwe access token terug.
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const resp = await fetch(`${VINTED_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'web',
    }).toString(),
  })

  if (!resp.ok) {
    throw new Error(
      `Token vernieuwen mislukt (${resp.status}) — haal een nieuwe token op via de Resoled Token Tool`
    )
  }

  const data = await resp.json()

  if (!data.access_token) {
    throw new Error('Onverwacht antwoord bij token refresh')
  }

  return data.access_token
}

export function mapVintedStatus(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('return_completed') || s.includes('return_received')) {
    return 'Retour ontvangen'
  }
  if (s.includes('return')) {
    return 'Retour'
  }
  if (s.includes('cancelled') || s.includes('canceled')) {
    return 'Verlies'
  }
  if (
    s.includes('completed') ||
    s.includes('received') ||
    s.includes('money_released') ||
    s === 'done'
  ) {
    return 'Afgerond (geld binnen)'
  }
  if (s.includes('transit') || s.includes('shipped') || s.includes('delivered')) {
    return 'Onderweg'
  }
  return 'Verkocht - Nog niet verzonden'
}
