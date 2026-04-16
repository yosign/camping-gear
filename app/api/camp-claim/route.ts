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
    const { action } = body as { action?: string }

    // 添加新装备
    if (action === 'add') {
      const { name, category, note } = body as { name?: string; category?: string; note?: string }
      if (!name || !category) {
        return NextResponse.json({ error: '缺少装备名称或分类' }, { status: 400 })
      }
      const supabase = getSupabaseClient()
      const { data: maxData } = await supabase
        .from('camp_claim_items')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
      const maxOrder = maxData?.[0]?.sort_order ?? 0
      const newId = `item_${Date.now()}`
      const { error } = await supabase.from('camp_claim_items').insert({
        id: newId,
        name,
        category,
        note: note ?? '',
        claimed_by: '',
        sort_order: maxOrder + 10,
      })
      if (error) throw error
      return NextResponse.json(await fetchPayload())
    }

    // 认领装备
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

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { id } = body as { id?: string }

    if (!id) {
      return NextResponse.json({ error: '缺少物资 ID' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase.from('camp_claim_items').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json(await fetchPayload())
  } catch (error) {
    console.error('camp-claim DELETE failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Supabase request failed',
        detail: error,
      },
      { status: 500 }
    )
  }
}
