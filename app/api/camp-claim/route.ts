import { NextResponse } from 'next/server'
import { getSupabaseClient, roleLabels, roles, seedItems, type CampRole } from '../../../lib/supabase'

async function ensureSeeded() {
  const supabase = getSupabaseClient()
  const { count, error: countError } = await supabase.from('camp_claim_items').select('*', { count: 'exact', head: true })

  if (countError) throw countError

  if ((count ?? 0) === 0) {
    const { error: insertError } = await supabase.from('camp_claim_items').insert(seedItems)
    if (insertError) throw insertError
  }
}

async function fetchPayload() {
  const supabase = getSupabaseClient()
  await ensureSeeded()

  const { data, error } = await supabase
    .from('camp_claim_items')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error

  const items = data ?? []
  const summary: { moku: number; shuan: number; unclaimed: number } = { moku: 0, shuan: 0, unclaimed: 0 }

  for (const item of items) {
    if (!item.claimed_by) {
      summary.unclaimed += 1
    } else if (item.claimed_by === 'moku') {
      summary.moku += 1
    } else if (item.claimed_by === 'shuan') {
      summary.shuan += 1
    }
  }

  return { items, summary, roles, roleLabels }
}

export async function GET() {
  try {
    return NextResponse.json(await fetchPayload())
  } catch (error) {
    console.error('camp-claim GET failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Supabase request failed',
        detail: error,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, role } = body as { id?: string; role?: CampRole }

    if (!id) {
      return NextResponse.json({ error: '缺少物资 ID' }, { status: 400 })
    }

    if (role && !roles.includes(role as 'moku' | 'shuan')) {
      return NextResponse.json({ error: '角色非法' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('camp_claim_items')
      .update({ claimed_by: role ?? '' })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json(await fetchPayload())
  } catch (error) {
    console.error('camp-claim POST failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Supabase request failed',
        detail: error,
      },
      { status: 500 }
    )
  }
}
