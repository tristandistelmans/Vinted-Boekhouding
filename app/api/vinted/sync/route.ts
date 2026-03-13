import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { fetchOrders, mapVintedStatus } from '@/lib/vinted-client'
import { mapVintedProduct } from '@/lib/constants'

interface SyncResult {
  nieuw: number
  bijgewerkt: number
  fouten: string[]
}

export async function POST() {
  const supabase = getSupabase()

  // 1. Laad token uit instellingen
  const { data: rows, error: settingsError } = await supabase
    .from('instellingen')
    .select('sleutel, waarde')
    .eq('sleutel', 'vinted_token')

  if (settingsError) {
    return NextResponse.json({ error: 'Kan instellingen niet laden' }, { status: 500 })
  }

  const token = rows?.[0]?.waarde

  if (!token) {
    return NextResponse.json(
      { error: 'Geen Vinted token ingesteld — plak je token in de instellingen' },
      { status: 400 }
    )
  }

  const result: SyncResult = { nieuw: 0, bijgewerkt: 0, fouten: [] }

  try {
    const orders = await fetchOrders(token)

    for (const order of orders) {
      try {
        const transactionId = String(order.id)
        const status = mapVintedStatus(order.status)
        const product = mapVintedProduct(order.item?.title || '')
        const verkoopprijs = parseFloat(order.total_item_price || order.item?.price || '0')
        const naam_koper = order.buyer?.login || 'Onbekend'
        const verkoopdatum = order.created_at
          ? order.created_at.split('T')[0]
          : new Date().toISOString().split('T')[0]

        const { data: existing } = await supabase
          .from('verkopen')
          .select('id, status')
          .eq('vinted_transaction_id', transactionId)
          .maybeSingle()

        if (existing) {
          if (existing.status !== status) {
            const { error } = await supabase
              .from('verkopen')
              .update({ status })
              .eq('id', existing.id)

            if (error) {
              result.fouten.push(`Order ${transactionId}: ${error.message}`)
            } else {
              result.bijgewerkt++
            }
          }
        } else {
          const { error } = await supabase.from('verkopen').insert({
            verkoopdatum,
            product,
            naam_koper,
            verkoopprijs,
            status,
            account: '1-jesuslata',
            vinted_transaction_id: transactionId,
          })

          if (error) {
            result.fouten.push(`Order ${transactionId}: ${error.message}`)
          } else {
            result.nieuw++
          }
        }
      } catch (e) {
        result.fouten.push(
          `Order ${order.id}: ${e instanceof Error ? e.message : 'onbekende fout'}`
        )
      }
    }

    await supabase.from('instellingen').upsert(
      {
        sleutel: 'laatste_sync',
        waarde: new Date().toISOString(),
        bijgewerkt_op: new Date().toISOString(),
      },
      { onConflict: 'sleutel' }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Onbekende fout'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json(result)
}
