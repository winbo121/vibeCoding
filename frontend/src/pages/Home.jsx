import { useEffect, useMemo, useState } from 'react'
import { Alert, Card } from 'react-bootstrap'
import { api } from '../api'

const TONES = [
  { key: 'teal', stroke: '#0d9488', soft: 'rgba(13, 148, 136, 0.14)' },
  { key: 'amber', stroke: '#d97706', soft: 'rgba(217, 119, 6, 0.14)' },
  { key: 'sky', stroke: '#0284c7', soft: 'rgba(2, 132, 199, 0.14)' },
  { key: 'rose', stroke: '#e11d48', soft: 'rgba(225, 29, 72, 0.12)' },
  { key: 'ink', stroke: '#334155', soft: 'rgba(51, 65, 85, 0.12)' },
]

function formatPct(value) {
  const n = Number(value) || 0
  return n % 1 ? n.toFixed(1) : String(Math.round(n))
}

function RingStat({ skill, percent, count, tone, rank, delay = 0 }) {
  const size = 132
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, Number(percent) || 0))
  const offset = c * (1 - pct / 100)

  return (
    <article className={`dash-ring tone-${tone.key}`} style={{ animationDelay: `${delay}s` }}>
      <span className="dash-ring-rank">{String(rank).padStart(2, '0')}</span>
      <div className="dash-ring-visual">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle
            className="dash-ring-track"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
          />
          <circle
            className="dash-ring-progress"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tone.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="dash-ring-center">
          <strong>{formatPct(pct)}%</strong>
          <span>{count}명</span>
        </div>
      </div>
      <h3 className="dash-ring-label">{skill}</h3>
    </article>
  )
}

export default function Home() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await api.skillStats()
        if (!cancelled) setStats(data)
      } catch (err) {
        if (!cancelled) setError(err.message || '통계를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const items = stats?.items || []
  const topSkills = items.slice(0, 3)
  const restSkills = items.slice(3)
  const maxPercent = useMemo(
    () => items.reduce((m, row) => Math.max(m, row.percent || 0), 0) || 100,
    [items],
  )
  const leader = items[0]

  return (
    <>
      <Card className="vc-hero mb-4 border-0">
        <Card.Body className="p-4 p-md-5">
          <div className="eyebrow mb-3">
            <i className="bi bi-cup-hot" />
            개발자 쉼터
          </div>
          <h1 className="brand-mark">DevHaven</h1>
          <p className="lead mb-0">채용 공고, 회사 주변 맛집, 커뮤니티를 한 화면에서.</p>
        </Card.Body>
      </Card>

      <section className="skill-dashboard" aria-label="기술스택 대시보드">
        <header className="dash-head">
          <div>
            <p className="dash-kicker">Community Pulse</p>
            <h2>기술스택 한눈에</h2>
            <p className="dash-sub">가입 회원이 쓰는 언어·프레임워크 비율</p>
          </div>
          {!loading && !error && (
            <div className="dash-kpis">
              <div className="dash-kpi">
                <span className="dash-kpi-icon">
                  <i className="bi bi-people" />
                </span>
                <div>
                  <span className="dash-kpi-label">전체 회원</span>
                  <strong>{stats?.total_members ?? 0}</strong>
                </div>
              </div>
              <div className="dash-kpi">
                <span className="dash-kpi-icon">
                  <i className="bi bi-code-slash" />
                </span>
                <div>
                  <span className="dash-kpi-label">스택 등록</span>
                  <strong>{stats?.members_with_skills ?? 0}</strong>
                </div>
              </div>
              {leader && (
                <div className="dash-kpi highlight">
                  <span className="dash-kpi-icon">
                    <i className="bi bi-trophy" />
                  </span>
                  <div>
                    <span className="dash-kpi-label">가장 많은 스택</span>
                    <strong>
                      {leader.skill} <em>{formatPct(leader.percent)}%</em>
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        {error && (
          <Alert variant="danger" className="mt-3 mb-0">
            {error}
          </Alert>
        )}

        {loading && !error && <div className="dash-loading">통계를 불러오는 중…</div>}

        {!loading && !error && items.length === 0 && (
          <div className="dash-empty">
            아직 기술스택을 등록한 회원이 없습니다. 내 정보에서 스택을 등록하면 여기에 반영됩니다.
          </div>
        )}

        {!loading && items.length > 0 && (
          <>
            <div className="dash-rings">
              {topSkills.map((row, idx) => (
                <RingStat
                  key={row.skill}
                  skill={row.skill}
                  percent={row.percent}
                  count={row.count}
                  tone={TONES[idx % TONES.length]}
                  rank={idx + 1}
                  delay={idx * 0.08}
                />
              ))}
            </div>

            {restSkills.length > 0 && (
              <div className="dash-rank">
                <div className="dash-rank-title">
                  <span>그 외 스택</span>
                  <span className="text-secondary">{restSkills.length}개</span>
                </div>
                <ul className="dash-rank-list">
                  {restSkills.map((row, idx) => {
                    const tone = TONES[(idx + 3) % TONES.length]
                    const width = Math.max(8, ((row.percent || 0) / maxPercent) * 100)
                    return (
                      <li key={row.skill} style={{ animationDelay: `${0.12 + idx * 0.04}s` }}>
                        <div className="dash-rank-meta">
                          <span className="dash-rank-name">
                            <span className="dash-rank-idx">{idx + 4}</span>
                            {row.skill}
                          </span>
                          <span className="dash-rank-pct">
                            {formatPct(row.percent)}%
                            <small>{row.count}명</small>
                          </span>
                        </div>
                        <div className="dash-rank-track">
                          <div
                            className="dash-rank-fill"
                            style={{
                              width: `${width}%`,
                              background: `linear-gradient(90deg, ${tone.stroke}, ${tone.stroke}cc)`,
                            }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}
