# CLAUDE.md — Vinted Dashboard

## Project

Persoonlijk boekhouddashboard voor Vinted-verkopen. Bijhoudt inkopen, verkopen, voorraad, winst en statistieken voor 2–3 Vinted-accounts (`1-jesuslata`, `2-disteltr`, `3-jasmijn`). Gebouwd voor eigen gebruik — geen externe gebruikers.

- **Stack**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase, Recharts
- **Hosting**: Vercel (automatische deploy bij push naar `main`)
- **Werkdirectory**: `/Users/tristandistelmans/Documents/Projects/Boekhouding Vinted/vinted-dashboard/`

## Lokale ontwikkeling

```bash
npm run dev   # start op http://localhost:3000
npm run build # controleer build vóór deploy
```

## Deployment — BELANGRIJK

**Nooit** pushen naar GitHub of Vercel tenzij de gebruiker dit **expliciet** vraagt. Vercel deployt automatisch bij elke push naar `main`, dus een push heeft direct live-effect.

## Taal

- Antwoorden en uitleg: **Nederlands**
- Code, variabelenamen, comments, commit messages: **Engels**

## Privacy & Secrets

Nooit `.env`-waarden, tokens, API-keys of wachtwoorden tonen in output, code of logs. Betrokken variabelen: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AUTH_TOKEN`, `AUTH_TOKEN_JASMIJN`.

## Architectuur

- Alle pagina's zijn client-side (`'use client'`) en fetchen naar eigen Next.js API routes
- API routes in `app/api/` lezen/schrijven direct naar Supabase
- Auth via cookie (`auth_token`), gecontroleerd in `middleware.ts`
- Supabase client is lazy-geïnitialiseerd via Proxy in `lib/supabase.ts`

### Bestandsstructuur

```
app/
  api/                  — server-side API routes (Supabase queries)
  page.tsx              — Dashboard (KPI kaarten, voorraad)
  verkoop/invoeren/     — Nieuwe verkoop invoeren
  verkoop/beheren/      — Verkopen beheren (filter, status, verwijder)
  voorraad/             — Voorraad overzicht + inkoop toevoegen
  listings/             — Vinted titels/beschrijvingen kopiëren
  statistieken/         — Recharts grafieken (maand + product)
  instellingen/         — Commissieregels, extra kosten
  login/                — Login pagina
components/
  Navigation.tsx        — Bottom nav (5 items + logout)
  ConditionalNavigation.tsx — Verbergt nav op loginpagina
lib/
  constants.ts          — PRODUCTEN, STATUSSEN, ACCOUNTS, berekenWinst(), berekenCommissie(), formatEuro(), formatDatum()
  supabase.ts           — Lazy Supabase client
  vinted-client.ts      — Vinted API integratie
```

## Database (Supabase)

Row Level Security is **bewust uitgeschakeld** — dit is een persoonlijke tool zonder externe gebruikers.

### Tabellen

**`verkopen`**: `id`, `verkoopdatum`, `product`, `naam_koper`, `verkoopprijs`, `status`, `account`

**`inkopen`**: `id`, `besteldatum`, `product`, `aantal`, `status`, `totale_aankoopprijs`, `prijs_per_stuk`

**`extra_kosten`**: extra kosten per periode (verpakking, verzending, etc.)

### Accounts

| Code | Vinted account |
|------|---------------|
| `1-jesuslata` | Jesuslata |
| `2-disteltr` | Disteltr |
| `3-jasmijn` | Jasmijn |

## Rollen & views

- **CEO-view** (`1-jesuslata`, `2-disteltr`): alle accounts, totale winst/omzet
- **Jasmijn-view** (`3-jasmijn`): alleen eigen account, commissie-gefocust dashboard, knop "Uitbetaald"

## Constanten & utilities (`lib/constants.ts`)

- `PRODUCTEN` — lijst van alle producten (caps, hoodies, etc.)
- `STATUSSEN` — verkoopstatussen (Afgerond, Onderweg, Retour, etc.)
- `ACTIEVE_STATUSSEN` — statussen die tellen als actieve verkoop
- `berekenWinst(status, verkoopprijs, aankoopprijs)` — winstberekening op basis van status
- `berekenCommissie(prijs)` — Vinted commissie berekening
- `formatEuro(bedrag)` — format als `€ 12,50` (nl-NL)
- `formatDatum(datum)` — format als Nederlandse datum
- `LISTINGS` — Vinted productteksten per product (titel + beschrijving)

## Scope van wijzigingen

Mag proactief refactoren of verbeteringen doorvoeren als dat zinvol is. Geef wel aan wat er extra gewijzigd is.

**Nooit zonder bevestiging:**
- Nieuwe databasetabellen of -kolommen toevoegen
- Breaking changes aan bestaande API-routes
- Productnamen of statuswaarden wijzigen in `lib/constants.ts` (dit raakt bestaande databasedata)
- Supabase RLS inschakelen (bewust uitgeschakeld)
