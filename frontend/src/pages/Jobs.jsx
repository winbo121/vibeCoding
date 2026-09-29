import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  ListGroup,
  Modal,
  Row,
  Stack,
} from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

const SOURCE_LABEL = {
  sample: '샘플',
  saramin: '사람인',
  jobkorea: '잡코리아',
}

const SOURCE_TONE = {
  sample: 'secondary',
  saramin: 'primary',
  jobkorea: 'success',
}

function formatDate(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('ko-KR')
  } catch {
    return value
  }
}

function formatDistance(meters) {
  if (meters == null || Number.isNaN(Number(meters))) return null
  const m = Number(meters)
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)}km`
}

function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(Number(seconds))) return null
  const s = Math.max(0, Math.round(Number(seconds)))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`
  if (m <= 0) return '1분 미만'
  return `약 ${m}분`
}

const COMMUTE_MODE_LABEL = {
  transit: '대중교통',
  car: '자동차',
  estimate: '예상',
}

function commuteText(row) {
  if (!row) return null
  if (row.commute_available === false) return row.commute_message || null
  if (row.commute_distance_m == null && row.commute_duration_sec == null) return null
  const parts = []
  const dist = formatDistance(row.commute_distance_m)
  const dur = formatDuration(row.commute_duration_sec)
  if (dist) parts.push(dist)
  if (dur) parts.push(dur)
  const mode = COMMUTE_MODE_LABEL[row.commute_mode] || null
  if (mode) parts.push(mode)
  if (row.commute_mode === 'transit' && row.commute_transfers != null) {
    parts.push(row.commute_transfers === 0 ? '환승 없음' : `환승 ${row.commute_transfers}회`)
  }
  return parts.length ? parts.join(' · ') : null
}

function skillList(raw) {
  if (!raw) return []
  return raw
    .split(/[,/|·;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function tokenHit(variant, text) {
  if (!variant) return false
  const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\./g, '\\.?')
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(text)
}

function skillHit(skill, haystack) {
  const text = (haystack || '').toLowerCase()
  const key = skill.toLowerCase().trim()
  if (!key || !text) return false
  const aliases = {
    js: ['javascript', 'js'],
    javascript: ['javascript', 'js'],
    ts: ['typescript', 'ts'],
    typescript: ['typescript', 'ts'],
    py: ['python', 'py'],
    python: ['python', 'py'],
    react: ['react', 'reactjs', 'react.js'],
    node: ['node', 'nodejs', 'node.js'],
    postgres: ['postgres', 'postgresql'],
    postgresql: ['postgres', 'postgresql'],
    java: ['java'],
  }
  const variants = [key, ...(aliases[key] || [])]
  return variants.some((v) => tokenHit(v, text))
}

/** API 점수와 무관하게 프론트에서도 스택 매칭(단어 단위) */
function applyClientMatch(jobs, skills, { matchOnly, isAdmin }) {
  if (isAdmin || !skills.length) {
    return jobs.map((j) => ({
      ...j,
      match_score: j.match_score || 0,
      matched_skills: j.matched_skills || [],
    }))
  }

  const scored = jobs.map((job) => {
    const haystack = [job.title, job.skills, job.summary, job.description, job.company]
      .filter(Boolean)
      .join(' ')
    const matched = skills.filter((s) => skillHit(s, haystack))
    let score = 0
    for (const s of matched) {
      if (skillHit(s, job.skills || '')) score += 3
      else if (skillHit(s, job.title || '')) score += 2
      else score += 1
    }
    return { ...job, match_score: score, matched_skills: matched }
  })

  const filtered = matchOnly ? scored.filter((j) => (j.match_score || 0) > 0) : scored
  return filtered.sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
}

export default function Jobs() {
  const { isAdmin, user, loading: authLoading, refreshUser } = useAuth()
  const [rows, setRows] = useState([])
  const [sources, setSources] = useState([])
  const [q, setQ] = useState('')
  const [source, setSource] = useState('')
  const [matchOnly, setMatchOnly] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selected, setSelected] = useState(null)
  const [profileSkills, setProfileSkills] = useState(user?.skills || '')

  const mySkills = useMemo(() => skillList(profileSkills), [profileSkills])
  const hasStack = !isAdmin && mySkills.length > 0
  const hasHome = !isAdmin && Boolean((user?.home_address || '').trim())

  const load = useCallback(
    async (params = {}) => {
      if (authLoading || !user) return
      setLoading(true)
      setError('')
      try {
        // 관리자가 스택을 바꾼 뒤에도 최신 프로필을 반영
        let latest = user
        try {
          latest = (await refreshUser?.()) || user
        } catch {
          latest = user
        }
        setProfileSkills(latest?.skills || '')

        const useMatch = params.match_only ?? matchOnly
        const admin = latest?.role === 'admin'
        const skills = admin ? [] : skillList(latest?.skills)
        const raw = await api.listJobs({
          q: params.q,
          source: params.source,
          // 관리자: 파라미터 생략 → 전체 / 일반+스택: true|false 명시
          match_only: admin ? undefined : skills.length > 0 ? !!useMatch : undefined,
        })
        setRows(
          applyClientMatch(Array.isArray(raw) ? raw : [], skills, {
            matchOnly: !admin && skills.length > 0 && !!useMatch,
            isAdmin: admin,
          }),
        )
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [authLoading, user, matchOnly, refreshUser],
  )

  const loadSources = useCallback(async () => {
    try {
      setSources(await api.listJobSources())
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (authLoading || !user) return
    load({
      q: q.trim() || undefined,
      source: source || undefined,
      match_only: matchOnly,
    })
    loadSources()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, user?.role, matchOnly])

  const onSearch = (e) => {
    e.preventDefault()
    load({
      q: q.trim() || undefined,
      source: source || undefined,
      match_only: matchOnly,
    })
  }

  const onSync = async (syncSource) => {
    setSyncing(true)
    setInfo('')
    setError('')
    try {
      const result = await api.syncJobs(syncSource, { keywords: q.trim() || undefined })
      setInfo(result.message)
      await load({
        q: q.trim() || undefined,
        source: source || undefined,
        match_only: matchOnly,
      })
      await loadSources()
    } catch (err) {
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const countLabel = useMemo(() => `${rows.length}건`, [rows.length])
  const matchedCount = useMemo(() => rows.filter((r) => (r.match_score || 0) > 0).length, [rows])
  const sourceMap = useMemo(() => Object.fromEntries(sources.map((s) => [s.source, s])), [sources])
  const saraminReady = !!sourceMap.saramin?.ready
  const jobkoreaReady = !!sourceMap.jobkorea?.ready

  return (
    <>
      <Card className="vc-card mb-3">
        <Card.Body>
          <Stack direction="horizontal" className="justify-content-between flex-wrap gap-2 mb-3">
            <div>
              <h2 className="h4 mb-1">
                <i className="bi bi-briefcase me-2" />
                입사지원 찾기
              </h2>
              <div className="text-secondary small">
                {isAdmin
                  ? '관리자 계정은 전체 채용공고를 조회합니다.'
                  : hasStack
                    ? '내 기술스택과 맞는 공고를 우선(또는 필터)으로 보여줍니다.'
                    : '내 정보에 기술스택을 등록하면 맞춤 공고가 표시됩니다.'}
              </div>
            </div>
            <Badge bg="light" text="dark" pill>
              {countLabel}
              {hasStack && !matchOnly ? ` · 매칭 ${matchedCount}` : ''}
            </Badge>
          </Stack>

          {isAdmin ? (
            <Alert variant="secondary" className="py-2">
              관리자는 기술스택 필터 없이 <strong>전체 공고</strong>를 봅니다.
            </Alert>
          ) : (
            <Alert variant={hasStack ? 'info' : 'warning'} className="py-2">
              {hasStack ? (
                <>
                  <span className="me-2">내 기술스택:</span>
                  {mySkills.map((skill) => (
                    <Badge key={skill} bg="primary" className="me-1 mb-1">
                      {skill}
                    </Badge>
                  ))}
                  <Link to="/profile" className="ms-2 small">
                    수정
                  </Link>
                </>
              ) : (
                <>
                  기술스택이 없습니다. <Link to="/profile">내 정보</Link>에서 등록하면 맞춤 공고를 볼 수
                  있습니다.
                </>
              )}
              <div className="small mt-2 mb-0">
                {hasHome ? (
                  <>
                    <i className="bi bi-house-door me-1" />
                    집주소 기준 출퇴근 거리·시간을 각 공고에 표시합니다.
                  </>
                ) : (
                  <>
                    <i className="bi bi-house-door me-1" />
                    <Link to="/profile">내 정보</Link>에 집주소를 등록하면 회사까지 출퇴근 거리·시간이
                    표시됩니다.
                  </>
                )}
              </div>
            </Alert>
          )}

          <Stack direction="horizontal" gap={2} className="flex-wrap mb-3">
            {sources.map((s) => (
              <Badge key={s.source} bg={s.ready ? 'success' : 'secondary'} pill>
                {s.label}: {s.ready ? '연동 가능' : '미설정'}
              </Badge>
            ))}
          </Stack>

          <Form onSubmit={onSearch}>
            <Row className="g-2 align-items-end">
              <Col md={4}>
                <Form.Label>검색</Form.Label>
                <Form.Control
                  placeholder="제목, 회사, 스킬, 지역"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </Col>
              <Col md={3}>
                <Form.Label>소스</Form.Label>
                <Form.Select value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="">전체</option>
                  <option value="sample">샘플</option>
                  <option value="saramin">사람인</option>
                  <option value="jobkorea">잡코리아</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                {hasStack && (
                  <Form.Check
                    type="switch"
                    id="match-only"
                    label="내 스택 맞춤만"
                    checked={matchOnly}
                    onChange={(e) => setMatchOnly(e.target.checked)}
                  />
                )}
              </Col>
              <Col md={2}>
                <Button type="submit" className="btn-brand w-100" disabled={loading || authLoading}>
                  <i className="bi bi-search me-1" />
                  조회
                </Button>
              </Col>
            </Row>
          </Form>

          {isAdmin && (
            <Stack direction="horizontal" gap={2} className="flex-wrap mt-3">
              <Button
                type="button"
                variant="outline-secondary"
                disabled={syncing}
                onClick={() => onSync('sample')}
              >
                샘플 동기화
              </Button>
              <Button
                type="button"
                variant="outline-primary"
                disabled={syncing || !saraminReady}
                onClick={() => onSync('saramin')}
                title={sourceMap.saramin?.hint || ''}
              >
                사람인 동기화
              </Button>
              <Button
                type="button"
                variant="outline-success"
                disabled={syncing || !jobkoreaReady}
                onClick={() => onSync('jobkorea')}
                title={sourceMap.jobkorea?.hint || ''}
              >
                잡코리아 동기화
              </Button>
              <Button
                type="button"
                className="btn-brand"
                disabled={syncing || (!saraminReady && !jobkoreaReady)}
                onClick={() => onSync('official')}
              >
                공식 API 일괄 동기화
              </Button>
            </Stack>
          )}
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}
      {info && <Alert variant="info">{info}</Alert>}

      <Card className="vc-card">
        <Card.Header>
          <i className="bi bi-list-ul me-2" />
          채용공고 목록
          {isAdmin ? ' (전체)' : hasStack && matchOnly ? ' (맞춤)' : hasStack ? ' (매칭순)' : ''}
        </Card.Header>
        <Card.Body className="p-0">
          <ListGroup variant="flush">
            {rows.map((row) => {
              const matched = row.matched_skills || []
              const score = row.match_score || 0
              const commute = commuteText(row)
              return (
                <ListGroup.Item
                  key={row.id}
                  action
                  onClick={() => setSelected(row)}
                  className="py-3"
                >
                  <div className="d-flex justify-content-between gap-3 flex-wrap">
                    <div>
                      <div className="fw-semibold mb-1">
                        {row.title}{' '}
                        <Badge bg={SOURCE_TONE[row.source] || 'secondary'} className="ms-1">
                          {SOURCE_LABEL[row.source] || row.source}
                        </Badge>
                        {score > 0 && (
                          <Badge bg="success" className="ms-1">
                            맞춤 {score}점
                          </Badge>
                        )}
                      </div>
                      <div className="text-secondary mb-1">
                        {row.company}
                        {row.location ? ` · ${row.location}` : ''}
                        {row.experience ? ` · ${row.experience}` : ''}
                        {row.employment_type ? ` · ${row.employment_type}` : ''}
                      </div>
                      {commute && (
                        <div
                          className={`small mb-1 ${
                            row.commute_available === false ? 'text-muted' : 'text-primary'
                          }`}
                        >
                          <i className="bi bi-signpost-2 me-1" />
                          출퇴근 {commute}
                        </div>
                      )}
                      {row.summary && <div className="small">{row.summary}</div>}
                      {matched.length > 0 && (
                        <div className="mt-2">
                          <span className="small text-success me-1">매칭:</span>
                          {matched.map((skill) => (
                            <Badge key={`m-${skill}`} bg="success" className="me-1 mb-1">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {row.skills && (
                        <div className="mt-2">
                          {skillList(row.skills).map((skill) => (
                            <Badge
                              key={skill}
                              bg={
                                matched.some((m) => m.toLowerCase() === skill.toLowerCase())
                                  ? 'success'
                                  : 'light'
                              }
                              text={
                                matched.some((m) => m.toLowerCase() === skill.toLowerCase())
                                  ? undefined
                                  : 'dark'
                              }
                              className="me-1 mb-1"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-secondary small text-md-end">
                      <div>{formatDate(row.posted_at)}</div>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected(row)
                        }}
                      >
                        상세
                      </Button>
                    </div>
                  </div>
                </ListGroup.Item>
              )
            })}
            {!loading && !authLoading && rows.length === 0 && (
              <ListGroup.Item className="text-secondary py-4 text-center">
                {hasStack && matchOnly
                  ? '내 기술스택과 맞는 공고가 없습니다. 스위치를 끄거나 스택을 수정해 보세요.'
                  : '조회된 채용공고가 없습니다. 관리자로 샘플/공식 API 동기화를 실행해 보세요.'}
              </ListGroup.Item>
            )}
          </ListGroup>
        </Card.Body>
      </Card>

      <Modal show={!!selected} onHide={() => setSelected(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{selected?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selected && (
            <>
              <Stack direction="horizontal" gap={2} className="mb-3 flex-wrap">
                <Badge bg={SOURCE_TONE[selected.source] || 'secondary'}>
                  {SOURCE_LABEL[selected.source] || selected.source}
                </Badge>
                {(selected.match_score || 0) > 0 && (
                  <Badge bg="success">맞춤 {selected.match_score}점</Badge>
                )}
                <span className="fw-semibold">{selected.company}</span>
              </Stack>
              <Row className="g-2 mb-3 small text-secondary">
                <Col md={6}>지역: {selected.location || '-'}</Col>
                <Col md={6}>경력: {selected.experience || '-'}</Col>
                <Col md={6}>고용형태: {selected.employment_type || '-'}</Col>
                <Col md={6}>게시일: {formatDate(selected.posted_at)}</Col>
                {!isAdmin && (
                  <Col md={12}>
                    {commuteText(selected) ? (
                      <span className={selected.commute_available === false ? '' : 'text-primary'}>
                        <i className="bi bi-signpost-2 me-1" />
                        집 → 회사 출퇴근: {commuteText(selected)}
                        {selected.commute_workplace ? ` (${selected.commute_workplace})` : ''}
                      </span>
                    ) : (
                      <span>
                        <i className="bi bi-signpost-2 me-1" />
                        집주소를 등록하면 출퇴근 거리·시간이 표시됩니다.
                      </span>
                    )}
                  </Col>
                )}
              </Row>
              {(selected.matched_skills || []).length > 0 && (
                <div className="mb-2">
                  <div className="small text-success mb-1">내 스택 매칭</div>
                  {selected.matched_skills.map((skill) => (
                    <Badge key={`d-${skill}`} bg="success" className="me-1 mb-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
              {selected.skills && (
                <div className="mb-3">
                  {skillList(selected.skills).map((skill) => (
                    <Badge key={skill} bg="light" text="dark" className="me-1 mb-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
              {selected.summary && <p className="fw-semibold">{selected.summary}</p>}
              <pre className="bg-light p-3 rounded small mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {selected.description || '상세 설명이 없습니다.'}
              </pre>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {selected?.url && (
            <Button
              as="a"
              href={selected.url}
              target="_blank"
              rel="noreferrer"
              variant="outline-primary"
            >
              원문 사이트
            </Button>
          )}
          <Button variant="secondary" onClick={() => setSelected(null)}>
            닫기
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
