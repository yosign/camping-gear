"use client"

import { useEffect, useMemo, useState } from 'react'

type Role = 'moku' | 'shuan'
type Item = {
  id: string
  name: string
  category: string
  note: string
  quantity: number
  claimed_moku: number
  claimed_shuan: number
  claimed_by: Role | ''
  sort_order: number
  updated_at?: string
}

type ApiPayload = {
  items: Item[]
  summary: {
    moku: number
    shuan: number
    unclaimed: number
  }
  roles: Role[]
  roleLabels: Record<Role, string>
}

const categoryOrder = ['大件装备', '照明电源', '做饭装备', '吃食补给', '应急物资', '亲子物资']

export default function CampClaimPage() {
  const [data, setData] = useState<ApiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingKey, setPendingKey] = useState<string | null>(null) // `${id}-${role}-${delta}` or `qty-${id}`
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', category: '大件装备', note: '', quantity: '1' })
  const [adding, setAdding] = useState(false)

  async function refresh() {
    const res = await fetch('/api/camp-claim', { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || '加载失败')
      setLoading(false)
      return
    }
    setData(json as ApiPayload)
    setError('')
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  // 按 delta +1/-1 调整某个角色的认领数量
  async function handleDelta(itemId: string, role: Role, delta: 1 | -1) {
    const key = `${itemId}-${role}-${delta}`
    setPendingKey(key)
    const res = await fetch('/api/camp-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, role, delta }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || '提交失败')
    } else {
      setData(json as ApiPayload)
      setError('')
    }
    setPendingKey(null)
  }

  // 调整物品总数量
  async function handleSetQuantity(itemId: string, quantity: number) {
    const key = `qty-${itemId}`
    setPendingKey(key)
    const res = await fetch('/api/camp-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_quantity', id: itemId, quantity }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || '修改失败')
    } else {
      setData(json as ApiPayload)
      setError('')
    }
    setPendingKey(null)
  }

  async function handleDelete(itemId: string) {
    setDeletingId(itemId)
    const res = await fetch('/api/camp-claim', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || '删除失败')
    } else {
      setData(json as ApiPayload)
      setError('')
    }
    setDeletingId(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.name.trim()) return
    setAdding(true)
    const res = await fetch('/api/camp-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add',
        ...addForm,
        quantity: Math.max(1, parseInt(addForm.quantity) || 1),
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || '添加失败')
    } else {
      setData(json as ApiPayload)
      setError('')
      setShowAddForm(false)
      setAddForm({ name: '', category: '大件装备', note: '', quantity: '1' })
    }
    setAdding(false)
  }

  const grouped = useMemo(() => {
    if (!data) return [] as Array<[string, Item[]]>
    const map = new Map<string, Item[]>()
    for (const category of categoryOrder) map.set(category, [])
    for (const item of data.items) {
      if (!map.has(item.category)) map.set(item.category, [])
      map.get(item.category)!.push(item)
    }
    return [...map.entries()].filter(([, items]) => items.length > 0)
  }, [data])

  const roleLabels = data?.roleLabels ?? { moku: '榫叔', shuan: '栓宝' }

  return (
    <main className="page-shell">
      <div className="paper-grid" />
      <div className="grain-overlay">
        <div className="container">
          <section className="panel">
            <div className="panel-inner grid-hero">
              <div>
                <div className="eyebrow">/camp-claim</div>
                <h1 className="panel-title" style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)' }}>露营装备认领板</h1>
                <p className="panel-copy" style={{ maxWidth: 760 }}>
                  出发前快速分清楚谁带什么。支持拆分数量，比如椅子各带几把。
                </p>
              </div>

              <section className="panel" style={{ borderRadius: 24, background: '#0d0f14', boxShadow: 'none', overflow: 'hidden', padding: 0 }}>
                <iframe
                  src="/hiking-canvas-embed.html"
                  style={{ width: '100%', aspectRatio: '2 / 1', border: 'none', display: 'block' }}
                  title="像素徒步动画"
                  scrolling="no"
                />
              </section>
            </div>
          </section>

          {error ? <div className="error-box">{error}</div> : null}

          {/* 认领进度 */}
          <section className="stat-grid">
            <article className="panel">
              <div className="panel-inner">
                <h2 style={{ margin: 0, fontSize: 20 }}>认领进度</h2>
                <p className="panel-copy" style={{ marginTop: 8 }}>按物品单位统计，拆分的物品按各自数量累加。</p>
                <div className="stat-grid" style={{ gridTemplateColumns: '1fr', marginTop: 18 }}>
                  <div className="stat-box" style={{ background: '#edf1f5' }}>
                    <h3>{data?.summary.moku ?? 0}</h3>
                    <p>榫叔</p>
                  </div>
                  <div className="stat-box" style={{ background: '#f7e7af' }}>
                    <h3>{data?.summary.shuan ?? 0}</h3>
                    <p>栓宝</p>
                  </div>
                  <div className="stat-box" style={{ background: '#dcefe5' }}>
                    <h3>{data?.summary.unclaimed ?? 0}</h3>
                    <p>未认领</p>
                  </div>
                </div>
              </div>
            </article>

            {/* 添加装备 */}
            <article className="panel">
              <div className="panel-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>装备管理</h2>
                  <p className="panel-copy" style={{ marginTop: 4 }}>添加新装备，可设置总数量。</p>
                </div>
                <button
                  type="button"
                  className="primary-btn role-moku"
                  style={{ minWidth: 120 }}
                  onClick={() => setShowAddForm(v => !v)}
                >
                  {showAddForm ? '取消' : '+ 添加装备'}
                </button>
              </div>

              {showAddForm && (
                <div className="panel-inner" style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                  <form onSubmit={handleAdd} style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>装备名称 *</label>
                      <input
                        required
                        value={addForm.name}
                        onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="如：睡袋"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>分类</label>
                      <select
                        value={addForm.category}
                        onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                        style={inputStyle}
                      >
                        {categoryOrder.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>总数量</label>
                      <input
                        type="number"
                        min="1"
                        value={addForm.quantity}
                        onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>备注</label>
                      <input
                        value={addForm.note}
                        onChange={e => setAddForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="可选"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button type="submit" className="primary-btn role-moku" disabled={adding} style={{ width: '100%' }}>
                        {adding ? '添加中...' : '确认添加'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </article>
          </section>

          {loading ? (
            <section className="panel">
              <div className="panel-inner" style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '80px 24px' }}>
                正在加载露营清单...
              </div>
            </section>
          ) : (
            <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr' }}>
              {grouped.map(([category, items]) => (
                <section key={category}>
                  <div className="category-head">
                    <div>
                      <h2>{category}</h2>
                      <p>把这组物资尽快分完，出发前就不会再反复确认。</p>
                    </div>
                    <div className="count-badge">{items.length} 项</div>
                  </div>

                  <div className="card-grid">
                    {items.map((item) => {
                      const claimed = item.claimed_moku + item.claimed_shuan
                      const remaining = item.quantity - claimed
                      const isSplit = item.claimed_moku > 0 && item.claimed_shuan > 0
                      const isFullyClaimed = remaining === 0
                      const isMulti = item.quantity > 1

                      return (
                        <article key={item.id} className="claim-card">
                          <div className="claim-card-inner">
                            <div className="claim-header">
                              <div>
                                <h3>{item.name}</h3>
                                <p className="claim-note">{item.note || '暂时没有备注'}</p>
                              </div>
                              {/* 状态徽章 */}
                              {isSplit ? (
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <span className="claim-badge role-moku">{roleLabels.moku}×{item.claimed_moku}</span>
                                  <span className="claim-badge role-shuan">{roleLabels.shuan}×{item.claimed_shuan}</span>
                                </div>
                              ) : (
                                <div className={`claim-badge ${isFullyClaimed ? `role-${item.claimed_by}` : ''}`}>
                                  {isFullyClaimed
                                    ? (item.claimed_moku > 0 ? roleLabels.moku : roleLabels.shuan) + (isMulti ? `×${claimed}` : '')
                                    : '未认领'}
                                </div>
                              )}
                            </div>

                            {/* 数量控制区 */}
                            <div style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {/* 总数量调整 */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--muted-foreground)', flex: 1 }}>总数量</span>
                                <div style={counterStyle}>
                                  <button
                                    type="button"
                                    style={counterBtnStyle}
                                    disabled={item.quantity <= Math.max(1, claimed) || pendingKey === `qty-${item.id}`}
                                    onClick={() => handleSetQuantity(item.id, item.quantity - 1)}
                                  >−</button>
                                  <span style={{ minWidth: 24, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{item.quantity}</span>
                                  <button
                                    type="button"
                                    style={counterBtnStyle}
                                    disabled={pendingKey === `qty-${item.id}`}
                                    onClick={() => handleSetQuantity(item.id, item.quantity + 1)}
                                  >+</button>
                                </div>
                              </div>

                              {/* 榫叔认领数 */}
                              <RoleCounter
                                label={roleLabels.moku}
                                role="moku"
                                value={item.claimed_moku}
                                max={item.quantity - item.claimed_shuan}
                                pending={pendingKey}
                                itemId={item.id}
                                onDelta={(d) => handleDelta(item.id, 'moku', d)}
                              />

                              {/* 栓宝认领数 */}
                              <RoleCounter
                                label={roleLabels.shuan}
                                role="shuan"
                                value={item.claimed_shuan}
                                max={item.quantity - item.claimed_moku}
                                pending={pendingKey}
                                itemId={item.id}
                                onDelta={(d) => handleDelta(item.id, 'shuan', d)}
                              />

                              {/* 剩余提示 */}
                              {remaining > 0 && (
                                <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: 0, textAlign: 'right' }}>
                                  还剩 {remaining} 个未认领
                                </p>
                              )}
                            </div>

                            <div className="divider" />

                            <div className="claim-actions">
                              <button
                                type="button"
                                className="ghost-btn"
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                                style={{ color: '#e05a5a', borderColor: '#e05a5a33' }}
                              >
                                {deletingId === item.id ? '删除中...' : '删除物品'}
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

// 单个角色的 +/- 计数器行
function RoleCounter({
  label, role, value, max, pending, itemId, onDelta,
}: {
  label: string
  role: 'moku' | 'shuan'
  value: number
  max: number
  pending: string | null
  itemId: string
  onDelta: (d: 1 | -1) => void
}) {
  const isPending = pending?.startsWith(itemId)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontSize: 12,
        fontWeight: 600,
        flex: 1,
        color: role === 'moku' ? '#4a7fa5' : '#c49a28',
      }}>
        {label}
      </span>
      <div style={counterStyle}>
        <button
          type="button"
          style={counterBtnStyle}
          disabled={value <= 0 || isPending}
          onClick={() => onDelta(-1)}
        >−</button>
        <span style={{ minWidth: 24, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{value}</span>
        <button
          type="button"
          style={counterBtnStyle}
          disabled={value >= max || isPending}
          onClick={() => onDelta(1)}
        >+</button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1.5px solid var(--border)',
  fontSize: 14,
  background: 'var(--card)',
  color: 'var(--foreground)',
}

const counterStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'var(--card)',
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  padding: '2px 6px',
}

const counterBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--foreground)',
  lineHeight: 1,
}
