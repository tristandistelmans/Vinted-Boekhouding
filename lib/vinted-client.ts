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

export interface VintedAuthResult {
  token: string
  userId: number
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  cookieHeader.split(/,(?=[^ ])/).forEach((part) => {
    const [nameValue] = part.trim().split(';')
    const [name, ...valueParts] = nameValue.split('=')
    if (name) cookies[name.trim()] = valueParts.join('=').trim()
  })
  return cookies
}

function buildCookieString(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

export async function authenticate(
  email: string,
  password: string
): Promise<VintedAuthResult> {
  // Step 1: Fetch homepage to get session cookies + CSRF token
  const homeResp = await fetch(VINTED_BASE + '/', {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  })

  if (!homeResp.ok) {
    throw new Error(`Kan Vinted niet bereiken (${homeResp.status})`)
  }

  const rawCookies = homeResp.headers.get('set-cookie') || ''
  const cookies = parseCookies(rawCookies)

  // Vinted stores CSRF token in cookie named 'CSRF-TOKEN'
  const csrfToken = cookies['CSRF-TOKEN'] ? decodeURIComponent(cookies['CSRF-TOKEN']) : ''
  const cookieStr = buildCookieString(cookies)

  // Step 2: Login
  const loginResp = await fetch(`${VINTED_BASE}/api/v2/sessions`, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'Content-Type': 'application/json',
      'X-Csrf-Token': csrfToken,
      Cookie: cookieStr,
    },
    body: JSON.stringify({ login: email, password, scope: 'all' }),
  })

  if (!loginResp.ok) {
    const errText = await loginResp.text().catch(() => '')
    if (loginResp.status === 401 || loginResp.status === 403) {
      throw new Error('Inloggen mislukt: controleer je e-mail en wachtwoord')
    }
    throw new Error(`Vinted login fout (${loginResp.status}): ${errText.slice(0, 100)}`)
  }

  const data = await loginResp.json()

  if (!data.access_token || !data.user?.id) {
    throw new Error('Onverwacht antwoord van Vinted bij inloggen')
  }

  return { token: data.access_token, userId: data.user.id }
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

    if (!resp.ok) {
      throw new Error(`Fout bij ophalen orders (${resp.status})`)
    }

    const data = await resp.json()
    const batch: VintedOrder[] = data.orders || []
    orders.push(...batch)

    // Stop when we've received all orders or no more pages
    if (batch.length < perPage) break
    page++

    // Safety limit: max 10 pages (1000 orders)
    if (page > 10) break
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
  // sold, packing, label_created, etc.
  return 'Verkocht - Nog niet verzonden'
}
