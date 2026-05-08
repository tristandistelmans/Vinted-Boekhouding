import { google, gmail_v1 } from 'googleapis'

const VERWERKT_LABEL = 'Boekhouding-verwerkt'

let _gmailClient: gmail_v1.Gmail | null = null
let _verwerktLabelId: string | null = null

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Gmail OAuth niet geconfigureerd. Vul GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REFRESH_TOKEN in .env.local in.'
    )
  }

  const client = new google.auth.OAuth2(clientId, clientSecret)
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

function getGmail(): gmail_v1.Gmail {
  if (!_gmailClient) {
    _gmailClient = google.gmail({ version: 'v1', auth: getOAuthClient() })
  }
  return _gmailClient
}

export type GmailMessage = {
  id: string
  threadId: string
  ontvangenOp: Date
  subject: string
  fromHeader: string
  toHeader: string
  plaintextBody: string
  labelIds: string[]
}

export async function listVintedMails(opts: {
  afterEpochSec: number
  excludeProcessed?: boolean
  maxResults?: number
}): Promise<{ id: string; threadId: string }[]> {
  const gmail = getGmail()
  const queryParts = [
    '(from:vinted.com OR from:vinted.be OR from:vinted.nl OR from:vinted.fr OR from:vintedcrm.com)',
    `after:${opts.afterEpochSec}`,
  ]
  if (opts.excludeProcessed) queryParts.push(`-label:${VERWERKT_LABEL}`)
  const q = queryParts.join(' ')

  const messages: { id: string; threadId: string }[] = []
  let pageToken: string | undefined
  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q,
      maxResults: Math.min(opts.maxResults ?? 100, 500),
      pageToken,
    })
    const items = res.data.messages || []
    for (const m of items) {
      if (m.id && m.threadId) messages.push({ id: m.id, threadId: m.threadId })
    }
    pageToken = res.data.nextPageToken || undefined
    if (opts.maxResults && messages.length >= opts.maxResults) break
  } while (pageToken)

  return messages
}

function decodeBase64Url(b64: string): string {
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64').toString('utf-8')
}

function extractPlaintext(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return ''
  // Voorkeur: text/plain
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }
  // Fallback: text/html → strip tags
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&euro;/g, '€')
      .replace(/&#8364;/g, '€')
      .replace(/\s+/g, ' ')
      .trim()
  }
  // Recursief in onderdelen zoeken
  for (const part of payload.parts || []) {
    const text = extractPlaintext(part)
    if (text) return text
  }
  return ''
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  if (!headers) return ''
  const h = headers.find((x) => x.name?.toLowerCase() === name.toLowerCase())
  return h?.value || ''
}

export async function fetchMail(id: string): Promise<GmailMessage> {
  const gmail = getGmail()
  const res = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
  const headers = res.data.payload?.headers
  const internalDate = res.data.internalDate ? new Date(Number(res.data.internalDate)) : new Date()

  return {
    id: res.data.id || id,
    threadId: res.data.threadId || '',
    ontvangenOp: internalDate,
    subject: getHeader(headers, 'Subject'),
    fromHeader: getHeader(headers, 'From'),
    toHeader: getHeader(headers, 'To'),
    plaintextBody: extractPlaintext(res.data.payload || undefined),
    labelIds: res.data.labelIds || [],
  }
}

async function getOrCreateVerwerktLabelId(): Promise<string> {
  if (_verwerktLabelId) return _verwerktLabelId
  const gmail = getGmail()
  const list = await gmail.users.labels.list({ userId: 'me' })
  const existing = list.data.labels?.find((l) => l.name === VERWERKT_LABEL)
  if (existing?.id) {
    _verwerktLabelId = existing.id
    return existing.id
  }
  const created = await gmail.users.labels.create({
    userId: 'me',
    requestBody: { name: VERWERKT_LABEL, labelListVisibility: 'labelShow', messageListVisibility: 'show' },
  })
  _verwerktLabelId = created.data.id || ''
  return _verwerktLabelId
}

export async function markAlsVerwerkt(messageId: string): Promise<void> {
  const labelId = await getOrCreateVerwerktLabelId()
  const gmail = getGmail()
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { addLabelIds: [labelId] },
  })
}
