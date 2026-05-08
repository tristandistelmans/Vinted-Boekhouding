// Eenmalige OAuth-setup voor Gmail.
// Draai met: npm run setup-gmail
// Vereist: GOOGLE_CLIENT_ID en GOOGLE_CLIENT_SECRET in .env.local.

import { config as loadEnv } from 'dotenv'
import http from 'node:http'

// Lees .env.local (Next.js conventie); fallback naar .env als die er is
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { URL } from 'node:url'
import { google } from 'googleapis'
import { exec } from 'node:child_process'

const REDIRECT_PORT = 53682
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth-callback`
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
]

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('\n❌ GOOGLE_CLIENT_ID en/of GOOGLE_CLIENT_SECRET ontbreken in .env.local')
    console.error('   Voeg ze toe en draai opnieuw.\n')
    process.exit(1)
  }

  const oauth = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)
  const authUrl = oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  })

  console.log('\n🔐 Open deze URL in je browser om in te loggen op Gmail:\n')
  console.log(authUrl)
  console.log('\n(Browser zou automatisch moeten openen. Anders zelf klikken.)\n')

  // Probeer browser automatisch te openen (macOS)
  exec(`open "${authUrl}"`, () => {})

  const code = await waitForCode()
  console.log('\n✅ Code ontvangen, ruilen voor refresh token...')

  const { tokens } = await oauth.getToken(code)
  if (!tokens.refresh_token) {
    console.error('\n❌ Geen refresh_token ontvangen. Probeer opnieuw met een nieuw Google-consent (revoke eerst app-toegang in je Google account).')
    process.exit(1)
  }

  console.log('\n🎉 Refresh token verkregen!\n')
  console.log('Voeg deze regel toe aan .env.local én aan Vercel env (production + preview + development):\n')
  console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`)
  console.log('Test daarna met:')
  console.log(`  curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/gmail/sync\n`)
}

function waitForCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || '/', `http://localhost:${REDIRECT_PORT}`)
        if (url.pathname !== '/oauth-callback') {
          res.writeHead(404)
          res.end()
          return
        }
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`<h1>OAuth geweigerd</h1><p>${error}</p><p>Sluit dit tabblad.</p>`)
          server.close()
          reject(new Error(`OAuth error: ${error}`))
          return
        }
        if (!code) {
          res.writeHead(400)
          res.end('Geen code ontvangen.')
          return
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h1>Klaar!</h1><p>Je kan dit tabblad sluiten en terug naar je terminal gaan.</p>')
        server.close()
        resolve(code)
      } catch (e) {
        reject(e as Error)
      }
    })
    server.listen(REDIRECT_PORT)
  })
}

main().catch((e) => {
  console.error('\n❌ Fout:', e.message)
  process.exit(1)
})
