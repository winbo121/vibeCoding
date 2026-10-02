import { useEffect, useRef, useState } from 'react'
import { Badge, Button } from 'react-bootstrap'
import { api } from '../api'
import { begin, createMatch, draw, HEIGHT, step, WIDTH } from '../game/shooterEngine'

export default function Shooter() {
  const canvasRef = useRef(null)
  const keysRef = useRef({ left: false, right: false, up: false, down: false, fire: false })
  const matchRef = useRef(null)
  const phaseRef = useRef('ready')
  const [phase, setPhase] = useState('ready')
  const [lastScore, setLastScore] = useState(0)
  const [rank, setRank] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadRank = async () => {
    try {
      setRank(await api.gameRanking())
    } catch (err) {
      setError(err.message || '순위를 불러오지 못했습니다.')
    }
  }

  useEffect(() => {
    loadRank()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return undefined
    const match = createMatch()
    matchRef.current = match
    let frame = requestAnimationFrame(function loop(now) {
      frame = requestAnimationFrame(loop)
      const prev = match.mode
      step(match, keysRef.current, now - (loop.last || now))
      loop.last = now
      draw(match, ctx)
      if (prev === 'play' && (match.mode === 'over' || match.mode === 'clear')) {
        phaseRef.current = match.mode
        setPhase(match.mode)
        setLastScore(match.score)
        setSaving(true)
        api
          .submitGameScore(match.score)
          .then((data) => {
            setRank(data)
            setError('')
          })
          .catch((err) => setError(err.message || '점수를 저장하지 못했습니다.'))
          .finally(() => setSaving(false))
      }
    })
    const onKey = (event, down) => {
      if (event.repeat) return
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') keysRef.current.left = down
      if (event.code === 'ArrowRight' || event.code === 'KeyD') keysRef.current.right = down
      if (event.code === 'ArrowUp' || event.code === 'KeyW') keysRef.current.up = down
      if (event.code === 'ArrowDown' || event.code === 'KeyS') keysRef.current.down = down
      if (event.code === 'Space') keysRef.current.fire = down
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault()
    }
    const down = (event) => onKey(event, true)
    const up = (event) => onKey(event, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const start = () => {
    const match = matchRef.current
    if (!match) return
    keysRef.current = { left: false, right: false, up: false, down: false, fire: false }
    begin(match)
    phaseRef.current = 'play'
    setPhase('play')
    setError('')
    canvasRef.current?.focus()
  }

  const hold = (key, down) => {
    keysRef.current[key] = down
  }

  const mine = rank?.mine

  return (
    <div className="shooter-page">
      <div>
        <h1 className="h4 mb-1">비행 슈팅</h1>
        <p className="text-secondary small mb-3">
          비행기로 몬스터를 맞히고, 날아오는 탄은 피하세요. 점수는 계정에 누적되고 순위에 반영됩니다.
        </p>
        <div className="shooter-stage">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} />
          {phase !== 'play' && (
            <div className="shooter-overlay">
              <div className="shooter-overlay-title">
                {phase === 'clear' ? '5탄 클리어' : phase === 'over' ? '게임 오버' : '비행 슈팅'}
              </div>
              {phase === 'over' || phase === 'clear' ? (
                <div>
                  이번 점수 <strong>{lastScore}</strong>
                  {saving ? ' · 저장 중…' : error ? '' : ' · 순위에 반영했습니다.'}
                </div>
              ) : (
                <div>방향키로 앞뒤좌우 이동, 스페이스 발사. 4탄까지 갈수록 어려워지고, 5탄은 보스가 탄을 쏟아냅니다.</div>
              )}
              <Button className="btn-brand" onClick={start}>
                {phase === 'over' || phase === 'clear' ? '다시 하기' : '시작'}
              </Button>
            </div>
          )}
        </div>
        <div className="shooter-pad">
          <button type="button" className="shooter-key" onPointerDown={() => hold('up', true)} onPointerUp={() => hold('up', false)} onPointerLeave={() => hold('up', false)}>
            ↑
          </button>
          <div className="shooter-pad-row">
            <button type="button" className="shooter-key" onPointerDown={() => hold('left', true)} onPointerUp={() => hold('left', false)} onPointerLeave={() => hold('left', false)}>
              ←
            </button>
            <span className="shooter-fire-hint">발사 스페이스</span>
            <button type="button" className="shooter-key" onPointerDown={() => hold('right', true)} onPointerUp={() => hold('right', false)} onPointerLeave={() => hold('right', false)}>
              →
            </button>
          </div>
          <button type="button" className="shooter-key" onPointerDown={() => hold('down', true)} onPointerUp={() => hold('down', false)} onPointerLeave={() => hold('down', false)}>
            ↓
          </button>
        </div>
        {error ? <div className="text-danger small mt-2">{error}</div> : null}
      </div>

      <aside className="shooter-rank">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">순위</h2>
          {mine ? (
            <Badge bg="light" text="dark">
              내 누적 {mine.total} · {mine.rank}위
            </Badge>
          ) : null}
        </div>
        <p className="small text-secondary">같은 계정의 점수를 모두 더한 누적 점수 순입니다.</p>
        <ol className="shooter-rank-list">
          {(rank?.items || []).map((item) => (
            <li key={item.user_id} className={item.user_id === mine?.user_id ? 'is-me' : ''}>
              <span className="shooter-rank-no">{item.rank}</span>
              <span className="shooter-rank-name">{item.name || item.username}</span>
              <span className="shooter-rank-score">
                {item.total}
                <small>최고 {item.best}</small>
              </span>
            </li>
          ))}
          {!rank?.items?.length ? <li className="shooter-rank-empty">아직 기록이 없습니다. 한 판 끝내면 여기에 올라옵니다.</li> : null}
        </ol>
      </aside>
    </div>
  )
}
