"use client"

import { useEffect, useMemo, useState } from 'react'

type Role = 'moku' | 'shuan'
type Item = {
  id: string
  name: string
  category: string
  note: string
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
  const [selectedRole, setSelectedRole] = useState<Role>('moku')
  const [data, setData] = useState<ApiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', category: '大件装备', note: '' })
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

  useEffect(() => {
    refresh()
  }, [])

  async function handleClaim(itemId: string, role: Role | '') {
    setSubmittingId(itemId)
    const res = await fetch('/api/camp-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, role }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || '提交失败')
      setSubmittingId(null)
      return
    }
    setData(json as ApiPayload)
    setError('')
    setSubmittingId(null)
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
      setDeletingId(null)
      return
    }
    setData(json as ApiPayload)
    setError('')
    setDeletingId(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.name.trim()) return
    setAdding(true)
    const res = await fetch('/api/camp-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', ...addForm }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || '添加失败')
      setAdding(false)
      return
    }
    setData(json as ApiPayload)
    setError('')
    setAdding(false)
    setShowAddForm(false)
    setAddForm({ name: '', category: '大件装备', note: '' })
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
                  我把界面整体重做成更像"户外手册"的感觉，不是普通表格工具。核心目标不变，出发前快速分清楚谁带什么。
                </p>
              </div>

              {/* PRD 摘要：嵌入像素徒步动画 */}
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

          {/* 添加装备 */}
          <section className="panel" style={{ marginBottom: 0 }}>
            <div className="panel-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>装备清单管理</h2>
                <p className="panel-copy" style={{ marginTop: 4 }}>添加新装备或删除不需要的物资。</p>
              </div>
              <button
                type="button"
                className="primary-btn role-moku"
                style={{ minWidth: 120 }}
                onClick={() => setShowAddForm(v => !v)}
              >
                {showAddForm ? '取消添加' : '+ 添加装备'}
              </button>
            </div>

            {showAddForm && (
              <div className="panel-inner" style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <form onSubmit={handleAdd} style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>装备名称 *</label>
                    <input
                      required
                      value={addForm.name}
                      onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="如：睡袋"
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 14, background: 'var(--card)', color: 'var(--foreground)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>分类</label>
                    <select
                      value={addForm.category}
                      onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 14, background: 'var(--card)', color: 'var(--foreground)' }}
                    >
                      {categoryOrder.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>备注</label>
                    <input
                      value={addForm.note}
                      onChange={e => setAddForm(f => ({ ...f, note: e.target.value }))}
                      placeholder="可选"
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 14, background: 'var(--card)', color: 'var(--foreground)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      type="submit"
                      className="primary-btn role-moku"
                      disabled={adding}
                      style={{ width: '100%' }}
                    >
                      {adding ? '添加中...' : '确认添加'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>

          <section className="stat-grid">
            <article className="panel">
              <div className="panel-inner">
                <h2 style={{ margin: 0, fontSize: 20 }}>当前操作角色</h2>
                <p className="panel-copy" style={{ marginTop: 8 }}>先切换角色，再认领对应物资。</p>
                <div className="role-switch" style={{ marginTop: 20 }}>
                  {(data?.roles ?? ['moku', 'shuan']).map((role) => {
                    const active = selectedRole === role
                    return (
                      <button
                        key={role}
                        type="button"
                        data-role={role}
                        className={`pill-btn ${active ? 'active' : ''}`}
                        onClick={() => setSelectedRole(role)}
                      >
                        {data?.roleLabels?.[role] ?? role}
                      </button>
                    )
                  })}
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-inner">
                <h2 style={{ margin: 0, fontSize: 20 }}>认领进度</h2>
                <p className="panel-copy" style={{ marginTop: 8 }}>谁拿得多，谁还没分到，一眼就够。</p>
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
                      const claimed = item.claimed_by
                      const claimedLabel = claimed ? data?.roleLabels?.[claimed] : '未认领'
                      return (
                        <article key={item.id} className="claim-card">
                          <div className="claim-card-inner">
                            <div className="claim-header">
                              <div>
                                <h3>{item.name}</h3>
                                <p className="claim-note">{item.note || '暂时没有备注'}</p>
                              </div>
                              <div className={`claim-badge ${claimed ? `role-${claimed}` : ''}`}>{claimedLabel}</div>
                            </div>

                            <div className="divider" />

                            <div className="claim-actions">
                              <button
                                type="button"
                                className={`primary-btn role-${selectedRole}`}
                                onClick={() => handleClaim(item.id, selectedRole)}
                                disabled={submittingId === item.id || deletingId === item.id}
                              >
                                {submittingId === item.id ? '提交中...' : `由${data?.roleLabels?.[selectedRole] ?? selectedRole}认领`}
                              </button>
                              {claimed ? (
                                <button
                                  type="button"
                                  className="ghost-btn"
                                  onClick={() => handleClaim(item.id, '')}
                                  disabled={submittingId === item.id || deletingId === item.id}
                                >
                                  取消认领
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="ghost-btn"
                                onClick={() => handleDelete(item.id)}
                                disabled={submittingId === item.id || deletingId === item.id}
                                style={{ color: '#e05a5a', borderColor: '#e05a5a33' }}
                              >
                                {deletingId === item.id ? '删除中...' : '删除'}
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
