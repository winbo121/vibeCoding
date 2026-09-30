import { useMemo, useState } from 'react'
import { Accordion, Alert, Badge, Button, Form, ProgressBar } from 'react-bootstrap'
import { api } from '../api'

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'reused', label: '여러 화면' },
  { id: 'unused', label: '미사용' },
  { id: 'validation', label: '검증' },
  { id: 'i18n', label: '다국어' },
]

const CATEGORY_LABEL = {
  validation: '검증',
  i18n: '다국어',
  common: '공통',
}

function formatRate(value) {
  if (value == null) return '—'
  return `${value % 1 ? value.toFixed(1) : Math.round(value)}%`
}

export default function Analyzer() {
  const [path, setPath] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [functions, setFunctions] = useState([])
  const [gaps, setGaps] = useState(null)
  const [filter, setFilter] = useState('all')
  const [root, setRoot] = useState('')

  const onAnalyze = async (event) => {
    event.preventDefault()
    setError('')
    setRunning(true)
    setProgress({ scanned: 0, total: 0, current: '', phase: '분석을 시작합니다.' })
    setMetrics(null)
    setFunctions([])
    setGaps(null)
    setRoot('')
    try {
      await api.analyzeProject(path.trim(), (payload) => {
        if (payload.type === 'progress') setProgress(payload)
        if (payload.type === 'metrics') setMetrics(payload.metrics)
        if (payload.type === 'done') {
          setMetrics(payload.metrics)
          setFunctions(payload.functions || [])
          setGaps(payload.gaps || null)
          setRoot(payload.root || '')
          setProgress((prev) => ({ ...(prev || {}), phase: '분석이 끝났습니다.', scanned: payload.metrics?.total_files, total: payload.metrics?.total_files }))
        }
      })
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || '분석에 실패했습니다.')
    } finally {
      setRunning(false)
    }
  }

  const visible = useMemo(() => {
    return functions.filter((row) => {
      if (filter === 'reused') return row.files >= 2
      if (filter === 'unused') return row.files === 0
      if (filter === 'validation') return row.category === 'validation'
      if (filter === 'i18n') return row.category === 'i18n'
      return true
    })
  }, [filter, functions])

  const percent = progress?.total ? Math.round((progress.scanned / progress.total) * 100) : running ? 8 : 0

  return (
    <div className="analyzer-page">
      <section className="analyzer-hero">
        <p className="dash-kicker">Project Analyzer</p>
        <h1>프로젝트 분석기</h1>
        <p>
          로컬 프로젝트에서 공통 함수를 찾고, 다른 화면이 검증·다국어·공통 함수를 얼마나 쓰는지 집계합니다.
        </p>
      </section>

      <Form onSubmit={onAnalyze} className="analyzer-form">
        <Form.Label>프로젝트 경로</Form.Label>
        <div className="analyzer-form-row">
          <Form.Control
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="C:\Users\Biztechi\Desktop\CourseProject"
            required
            disabled={running}
          />
          <Button type="submit" className="btn-accent" disabled={running}>
            <i className={`bi ${running ? 'bi-hourglass-split' : 'bi-search'} me-1`} />
            {running ? '분석 중' : '분석'}
          </Button>
        </div>
      </Form>

      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}

      {(running || progress) && (
        <section className="analyzer-progress">
          <div className="d-flex justify-content-between gap-3">
            <strong>{progress?.phase || '준비 중'}</strong>
            <span>{progress?.total ? `${progress.scanned} / ${progress.total}` : ''}</span>
          </div>
          <ProgressBar now={percent} className="mt-2" animated={running} />
          {progress?.current && <p className="analyzer-current">{progress.current}</p>}
        </section>
      )}

      {metrics && (
        <section className="analyzer-metrics" aria-label="분석 지표">
          <Metric label="읽은 파일" value={metrics.scanned_files ?? 0} />
          <Metric label="공통 파일" value={metrics.common_files ?? 0} />
          <Metric label="공통 함수" value={metrics.common_functions ?? 0} />
          <Metric label="여러 화면에서 사용" value={metrics.reused_functions ?? 0} hint="2곳 이상" />
          <Metric label="아직 안 쓰인 함수" value={metrics.unused_functions ?? 0} />
          <Metric label="검증 활용" value={formatRate(metrics.validation_rate)} hint={metrics.screen_files ? `${metrics.validation_screens}/${metrics.screen_files} 화면` : '화면 없음'} />
          <Metric label="다국어 적용" value={formatRate(metrics.i18n_rate)} hint={metrics.message_files ? `메시지 파일 ${metrics.message_files}` : '메시지 파일 없음'} />
        </section>
      )}

      {gaps && (gaps.missing_validation?.length > 0 || gaps.missing_i18n?.length > 0) && (
        <section className="analyzer-gaps">
          {gaps.missing_validation?.length > 0 && (
            <div>
              <h2>검증이 보이지 않는 화면</h2>
              <ul>
                {gaps.missing_validation.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </div>
          )}
          {gaps.missing_i18n?.length > 0 && (
            <div>
              <h2>한글이 있는데 다국어 처리가 없는 화면</h2>
              <ul>
                {gaps.missing_i18n.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {functions.length > 0 && (
        <section className="analyzer-functions">
          <div className="analyzer-functions-head">
            <div>
              <h2>공통 함수</h2>
              <p>
                {root}
                {metrics?.truncated ? ' · 사용 함수 80개, 미사용 함수 120개까지 표시합니다.' : ''}
              </p>
            </div>
            <div className="analyzer-filters">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={filter === item.id ? 'is-active' : ''}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {visible.length === 0 && <p className="text-secondary mb-0">이 조건에 해당하는 함수가 없습니다.</p>}
          <Accordion alwaysOpen>
            {visible.map((row, index) => (
              <Accordion.Item eventKey={String(index)} key={`${row.name}-${row.file}-${row.line}`}>
                <Accordion.Header>
                  <span className="analyzer-fn-name">{row.name}</span>
                  <Badge bg="light" text="dark" className="ms-2">
                    {CATEGORY_LABEL[row.category] || '공통'}
                  </Badge>
                  <span className="analyzer-fn-meta">
                    {row.files}개 파일 · {row.calls}회
                  </span>
                </Accordion.Header>
                <Accordion.Body>
                  <p className="analyzer-fn-file">
                    {row.file}:{row.line}
                  </p>
                  {row.used_in?.length > 0 && (
                    <ul className="analyzer-used">
                      {row.used_in.map((file) => (
                        <li key={file}>{file}</li>
                      ))}
                    </ul>
                  )}
                  {row.files === 0 && <p className="text-secondary">정의만 있고 다른 파일에서 호출되지 않았습니다.</p>}
                  {row.code && <pre className="analyzer-code">{row.code}</pre>}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </section>
      )}
    </div>
  )
}

function Metric({ label, value, hint }) {
  return (
    <article className="analyzer-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  )
}
