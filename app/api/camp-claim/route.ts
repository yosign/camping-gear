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

  // 按认领数量统计（每个人实际认领了几个物品单位）
  const summary = { moku: 0, shuan: 0, unclaimed: 0 }
  for (const item of items) {
    summary.moku += item.claimed_moku ?? 0
    summary.shuan += item.claimed_shuan ?? 0
    const remaining = item.quantity - (item.claimed_moku ?? 0) - (item.claimed_shuan ?? 0)
    if (remaining > 0) summary.unclaimed += remaining
  }

  return { items, summary, roles, roleLabels }
}

export async function GET() {
  try {
    return NextResponse.json(await fetchPayload())
  } catch (error) {
    console.error('camp-claim GET failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Supabase request failed', detail: error },
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
      const { name, category, note, quantity } = body as {
        name?: string
        category?: string
        note?: string
        quantity?: number
      }
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
        quantity: Math.max(1, quantity ?? 1),
        claimed_moku: 0,
        claimed_shuan: 0,
        claimed_by: '',
        sort_order: maxOrder + 10,
      })
      if (error) throw error
      return NextResponse.json(await fetchPayload())
    }

    // 修改物品总数量
    if (action === 'set_quantity') {
      const { id, quantity } = body as { id?: string; quantity?: number }
      if (!id || quantity === undefined) {
        return NextResponse.json({ error: '缺少物资 ID 或数量' }, { status: 400 })
      }
      if (quantity < 1) {
        return NextResponse.json({ error: '数量至少为 1' }, { status: 400 })
      }
      const supabase = getSupabaseClient()

      // 先读取当前已认领数，防止缩减到比已认领更少
      const { data: cur } = await supabase
        .from('camp_claim_items')
        .select('claimed_moku, claimed_shuan')
        .eq('id', id)
        .single()
      const totalClaimed = (cur?.claimed_moku ?? 0) + (cur?.claimed_shuan ?? 0)
      if (quantity < totalClaimed) {
        return NextResponse.json(
          { error: `数量不能少于已认领数 ${totalClaimed}` },
          { status: 400 }
        )
      }

      const { error } = await supabase
        .from('camp_claim_items')
        .update({ quantity })
        .eq('id', id)
      if (error) throw error
      return NextResponse.json(await fetchPayload())
    }

    // 按数量认领：delta = +1 / -1，role 指定谁
    const { id, role, delta } = body as { id?: string; role?: CampRole; delta?: number }

    if (!id || !role || delta === undefined) {
      return NextResponse.json({ error: '缺少物资 ID、角色或 delta' }, { status: 400 })
    }
    if (!roles.includes(role as 'moku' | 'shuan')) {
      return NextResponse.json({ error: '角色非法' }, { status: 400 })
    }
    if (delta !== 1 && delta !== -1) {
      return NextResponse.json({ error: 'delta 只能为 +1 或 -1' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const { data: cur, error: fetchErr } = await supabase
      .from('camp_claim_items')
      .select('quantity, claimed_moku, claimed_shuan')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr

    const colKey = role === 'moku' ? 'claimed_moku' : 'claimed_shuan'
    const newVal = (cur[colKey] ?? 0) + delta
    const otherVal = role === 'moku' ? (cur.claimed_shuan ?? 0) : (cur.claimed_moku ?? 0)

    if (newVal < 0) {
      return NextResponse.json({ error: '认领数量不能为负' }, { status: 400 })
    }
    if (newVal + otherVal > cur.quantity) {
      return NextResponse.json({ error: '超出物品总数量' }, { status: 400 })
    }

    // 同步更新 claimed_by（兼容旧逻辑）
    const newMoku = role === 'moku' ? newVal : (cur.claimed_moku ?? 0)
    const newShuan = role === 'shuan' ? newVal : (cur.claimed_shuan ?? 0)
    let claimedBy: CampRole = ''
    if (newMoku > 0 && newShuan === 0) claimedBy = 'moku'
    else if (newShuan > 0 && newMoku === 0) claimedBy = 'shuan'

    const { error: updateErr } = await supabase
      .from('camp_claim_items')
      .update({ [colKey]: newVal, claimed_by: claimedBy })
      .eq('id', id)
    if (updateErr) throw updateErr

    return NextResponse.json(await fetchPayload())
  } catch (error) {
    console.error('camp-claim POST failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Supabase request failed', detail: error },
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
      { error: error instanceof Error ? error.message : 'Supabase request failed', detail: error },
      { status: 500 }
    )
  }
}
