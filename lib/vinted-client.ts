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

export async function fetchOrders(token: string): Promise<VintedOrder[]> {
  const orders: VintedOrder[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const resp = await fetch(
      `${VINTED_BASE}/api/v2/orders?type=seller&page=${page}&per_page=${perPage}`,
      {
        headers: {
          ...DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (resp.status === 401) {
      throw new Error('Token verlopen of ongeldig — vernieuw je token via de Resoled Token Tool')
    }

    if (!resp.ok) {
      throw new Error(`Fout bij ophalen orders (${resp.status})`)
    }

    const data = await resp.json()
    const batch: VintedOrder[] = data.orders || []
    orders.push(...batch)

    if (batch.length < perPage) break
    page++
    if (page > 10) break // max 1000 orders
  }

  return orders
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
