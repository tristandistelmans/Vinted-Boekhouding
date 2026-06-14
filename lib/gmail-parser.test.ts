import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseEmail } from './gmail-parser'

test('verkoop bundel-mail (jesuslata, 2 artikelen, €60)', () => {
  const result = parseEmail({
    subject: 'Je hebt een artikel verkocht op Vinted',
    plaintextBody: `Hey jesuslata, lmh2006 heeft gekocht Bundel: 2 artikelen 2 Bundel: 2 artikelen € 60,00 We maken de betaling over naar je Vinted Portemonnee zodra de bestelling is afgerond. Verstuur je bestelling binnen 5 dagen.`,
    fromHeader: 'Team Vinted <no-reply@vinted.be>',
    toHeader: 'tristandistzlmans@gmail.com',
  })

  assert.equal(result.type, 'verkoop')
  if (result.type !== 'verkoop') return
  assert.equal(result.account, '1-jesuslata')
  assert.equal(result.koper, 'lmh2006')
  assert.equal(result.isBundel, true)
  assert.equal(result.bundelAantal, 2)
  assert.equal(result.prijs, 60)
  assert.equal(result.product, null)
})

test('verkoop single-item one-line (NY Navy, disteltr)', () => {
  const result = parseEmail({
    subject: 'Je hebt een artikel verkocht op Vinted',
    plaintextBody: `Hey disteltr, guterkauf.de heeft gekocht Aimé Leon dore Yankees pet navy katoen € 40,00 We maken de betaling over naar je Vinted Portemonnee zodra de bestelling is afgerond.`,
    fromHeader: 'Team Vinted <no-reply@vinted.be>',
    toHeader: 'disteltr@gmail.com',
  })

  assert.equal(result.type, 'verkoop')
  if (result.type !== 'verkoop') return
  assert.equal(result.account, '2-disteltr')
  assert.equal(result.koper, 'guterkauf.de')
  assert.equal(result.isBundel, false)
  assert.equal(result.prijs, 40)
  assert.equal(result.product, 'Aimé Leon dore Yankees pet navy katoen')
  assert.equal(result.productMapped, 'NY Navy')
})

test('verkoop single-item one-line (Porsche Red, disteltr)', () => {
  const result = parseEmail({
    subject: 'Je hebt een artikel verkocht op Vinted',
    plaintextBody: `Hey disteltr, max.wsr heeft gekocht Porsche Aimé Leon dore red cap € 35,00 We maken de betaling over...`,
    fromHeader: 'Team Vinted <no-reply@vinted.be>',
    toHeader: 'disteltr@gmail.com',
  })
  assert.equal(result.type, 'verkoop')
  if (result.type !== 'verkoop') return
  assert.equal(result.product, 'Porsche Aimé Leon dore red cap')
  assert.equal(result.productMapped, 'Porsche Red')
  assert.equal(result.prijs, 35)
})

test('verkoop single-item one-line (UNI White, disteltr, met typo "doreb")', () => {
  const result = parseEmail({
    subject: 'Je hebt een artikel verkocht op Vinted',
    plaintextBody: `Hey disteltr, igordall heeft gekocht Unisphere Cap white nylon Aimé Leon doreb € 35,00 We maken...`,
    fromHeader: 'Team Vinted <no-reply@vinted.be>',
    toHeader: 'disteltr@gmail.com',
  })
  assert.equal(result.type, 'verkoop')
  if (result.type !== 'verkoop') return
  assert.equal(result.productMapped, 'UNI White')
})

test('verzendlabel-mail (jesuslata, UNI White)', () => {
  const result = parseEmail({
    subject: 'Dit is je verzendlabel. Uiterste verzenddatum: 13-05-2026, 12.36 uur',
    plaintextBody: `Beste jesuslata,

In deze e-mail vind je het verzendlabel als bijlage.

*Verzendinformatie*
*Bestelling:* Cap Aime Leon Dore Unisphere Nylon White
*Pakketmaat:* 500.0 g
*Trackingnummer:* 05488805149185
*Uiterste verzenddatum:* 13-05-2026, 12.36 uur
*Transactie-ID:* 19639557812`,
    fromHeader: 'Team Vinted <no-reply@vinted.be>',
    toHeader: 'tristandistzlmans@gmail.com',
  })

  assert.equal(result.type, 'verzendlabel')
  if (result.type !== 'verzendlabel') return
  assert.equal(result.account, '1-jesuslata')
  assert.equal(result.product, 'Cap Aime Leon Dore Unisphere Nylon White')
  assert.equal(result.productMapped, 'UNI White')
  assert.equal(result.transactionId, '19639557812')
  assert.equal(result.tracking, '05488805149185')
})

test('verzendlabel-mail (disteltr, geforward, Porsche White Green)', () => {
  const result = parseEmail({
    subject: 'Fwd: Dit is je verzendlabel. Uiterste verzenddatum: 24-03-2026, 12.56 uur',
    plaintextBody: `--------- Doorgestuurd bericht --------
Van: Team Vinted <no-reply@vinted.be>
Datum: di 17 mrt 2026 om 13:05
Onderwerp: Dit is je verzendlabel. Uiterste verzenddatum: 24-03-2026, 12.56 uur
Aan: <disteltr@gmail.com>


*Beste disteltr,*

In deze e-mail vind je het verzendlabel als bijlage.

*Verzendinformatie*
*Bestelling:* Porsche pet Aimé Leon dore groen nieuw
*Pakketmaat:* 500.0 g
*Trackingnummer:* 1773749104540534
*Uiterste verzenddatum:* 24-03-2026, 12.56 uur
*Transactie-ID:* 18641313862`,
    fromHeader: 'disteltr@gmail.com',
    toHeader: 'tristan.distelmans@gmail.com',
  })

  assert.equal(result.type, 'verzendlabel')
  if (result.type !== 'verzendlabel') return
  assert.equal(result.account, '2-disteltr')
  assert.equal(result.product, 'Porsche pet Aimé Leon dore groen nieuw')
  assert.equal(result.productMapped, 'Porsche Green')
  assert.equal(result.transactionId, '18641313862')
})

test('afgerond-mail (jesuslata, Porsche Beige Green, €90)', () => {
  const result = parseEmail({
    subject: 'Bestelling afgerond',
    plaintextBody: `De verkoop is voltooid jesuslata,
Je verkoop van Cap Aime Leon Dore Porsche Cotton Beige Green is succesvol afgerond.

Transactie-ID: #19474927033
Datum: 05-05-2026, 14.53 uur

Vinted, UAB
...

Ontvangen voor item:	€ 90,00
Ontvangen voor verzending:	€ 5,15

Overgemaakt naar je Vinted Portemonnee:	€ 90,00`,
    fromHeader: 'Team Vinted <no-reply@vinted.be>',
    toHeader: 'tristandistzlmans@gmail.com',
  })

  assert.equal(result.type, 'afgerond')
  if (result.type !== 'afgerond') return
  assert.equal(result.account, '1-jesuslata')
  assert.equal(result.product, 'Cap Aime Leon Dore Porsche Cotton Beige Green')
  assert.equal(result.productMapped, 'Porsche White Green')
  assert.equal(result.transactionId, '19474927033')
  assert.equal(result.bedragItem, 90)
})

test('verkoop single-item — Engels Vinted-listing formaat', () => {
  const result = parseEmail({
    subject: 'Je hebt een artikel verkocht op Vinted',
    plaintextBody: `Hey disteltr, cooluser123 heeft gekocht Cap Aime Leon Dore Porsche Cotton Black € 45,00 We maken de betaling over naar je Vinted Portemonnee.`,
    fromHeader: 'Team Vinted <no-reply@vinted.be>',
    toHeader: 'disteltr@gmail.com',
  })

  assert.equal(result.type, 'verkoop')
  if (result.type !== 'verkoop') return
  assert.equal(result.account, '2-disteltr')
  assert.equal(result.koper, 'cooluser123')
  assert.equal(result.isBundel, false)
  assert.equal(result.prijs, 45)
  assert.equal(result.product, 'Cap Aime Leon Dore Porsche Cotton Black')
  assert.equal(result.productMapped, 'Porsche Black')
})

test('verkoop pertumstar — account via begroeting (iCloud-forward, onbekend adres)', () => {
  const result = parseEmail({
    subject: 'Je hebt een artikel verkocht op Vinted',
    plaintextBody: `Hey pertumstar, koper99 heeft gekocht Cap Aime Leon Dore Porsche Cotton Black € 45,00 We maken de betaling over naar je Vinted Portemonnee.`,
    fromHeader: 'Team Vinted <no-reply@vinted.be>',
    toHeader: 'disteltr@gmail.com',
  })

  assert.equal(result.type, 'verkoop')
  if (result.type !== 'verkoop') return
  assert.equal(result.account, 'pertumstar')
  assert.equal(result.koper, 'koper99')
  assert.equal(result.isBundel, false)
  assert.equal(result.prijs, 45)
  assert.equal(result.productMapped, 'Porsche Black')
})

test('verkoop trisgeuss — account via begroeting (Apple-mail-forward)', () => {
  const result = parseEmail({
    subject: 'Je hebt een artikel verkocht op Vinted',
    plaintextBody: `Hey trisgeuss, buyer_nl heeft gekocht Aimé Leon dore Yankees pet navy katoen € 40,00 We maken de betaling over naar je Vinted Portemonnee.`,
    fromHeader: 'Team Vinted <no-reply@vinted.be>',
    toHeader: 'disteltr@gmail.com',
  })

  assert.equal(result.type, 'verkoop')
  if (result.type !== 'verkoop') return
  assert.equal(result.account, 'trisgeuss')
  assert.equal(result.koper, 'buyer_nl')
  assert.equal(result.prijs, 40)
  assert.equal(result.productMapped, 'NY Navy')
})

test('verkoop pertumstar — echte headers (esdoornm@gmail.com forwardt naar hub)', () => {
  const result = parseEmail({
    subject: 'Je hebt een artikel verkocht op Vinted',
    plaintextBody: `Hey pertumstar, klantx heeft gekocht Porsche pet Aimé Leon dore groen € 50,00 We maken de betaling over.`,
    fromHeader: 'Team Vinted <no-reply@vinted.be>',
    toHeader: 'esdoornm@gmail.com',
  })

  assert.equal(result.type, 'verkoop')
  if (result.type !== 'verkoop') return
  assert.equal(result.account, 'pertumstar')
  assert.equal(result.prijs, 50)
})

test('verkoop trisgeuss — Apple-relay: afzender herschreven, account via To-alias', () => {
  // Sign-in-with-Apple relay herschrijft de afzender; greeting hier bewust onbruikbaar
  // om de ACCOUNT_VAN_EMAIL-fallback (To-header) te testen.
  const result = parseEmail({
    subject: 'Je hebt een artikel verkocht op Vinted',
    plaintextBody: `koper_be heeft gekocht Aimé Leon dore Yankees pet navy € 38,00 We maken de betaling over.`,
    fromHeader: 'Team Vinted <no-reply_at_vinted_be_ttpz954dst_77a807e9@privaterelay.appleid.com>',
    toHeader: 'ttpz954dst@privaterelay.appleid.com',
  })

  assert.equal(result.type, 'verkoop')
  if (result.type !== 'verkoop') return
  assert.equal(result.account, 'trisgeuss')
  assert.equal(result.koper, 'koper_be')
  assert.equal(result.prijs, 38)
})

test('onbekend mailtype', () => {
  const result = parseEmail({
    subject: 'Newsletter van Vinted',
    plaintextBody: 'Promotionele content zonder transactie',
    fromHeader: 'newsletter@vinted.be',
    toHeader: 'tristandistzlmans@gmail.com',
  })
  assert.equal(result.type, 'onbekend')
})
