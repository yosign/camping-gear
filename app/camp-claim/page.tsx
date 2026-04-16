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
  const [error, setError] = useState('')

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
                                disabled={submittingId === item.id}
                              >
                                {submittingId === item.id ? '提交中...' : `由${data?.roleLabels?.[selectedRole] ?? selectedRole}认领`}
                              </button>
                              {claimed ? (
                                <button
                                  type="button"
                                  className="ghost-btn"
                                  onClick={() => handleClaim(item.id, '')}
                                  disabled={submittingId === item.id}
                                >
                                  取消认领
                                </button>
                              ) : null}
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
