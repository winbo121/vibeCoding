import { useEffect, useRef, useState } from 'react'
import { Badge, Button } from 'react-bootstrap'
import { api } from '../api'
import { begin, createGame, draw, HEIGHT, step, WIDTH } from '../game/tetrisEngine'

export default function Tetris() {
  const canvasRef = useRef(null)
  const keysRef = useRef({ left: false, right: false, down: false, rotate: false, hard: false })
  const gameRef = useRef(null)
  const [phase, setPhase] = useState('ready')
  const [lastScore, setLastScore] = useState(0)
  const [rank, setRank] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadRank = async () => {
    try {
      setRank(await api.gameRanking('tetris'))
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
    const game = createGame()
    gameRef.current = game
    let frame = requestAnimationFrame(function loop(now) {
      frame = requestAnimationFrame(loop)
      const prev = game.status
      const keys = keysRef.current
      step(game, keys, now - (loop.last || now))
      keys.rotate = false
      keys.hard = false
      loop.last = now
      draw(game, ctx)
      if (prev === 'play' && game.status === 'over') {
        setPhase('over')
        setLastScore(game.score)
        setSaving(true)
        api
          .submitGameScore(game.score, 'tetris')
          .then((data) => {
            setRank(data)
            setError('')
          })
          .catch((err) => setError(err.message || '점수를 저장하지 못했습니다.'))
          .finally(() => setSaving(false))
      }
    })
    const onKey = (event, down) => {
      if (event.repeat && !['ArrowLeft', 'ArrowRight', 'ArrowDown', 'KeyA', 'KeyD', 'KeyS'].includes(event.code)) return
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') keysRef.current.left = down
      if (event.code === 'ArrowRight' || event.code === 'KeyD') keysRef.current.right = down
      if (event.code === 'ArrowDown' || event.code === 'KeyS') keysRef.current.down = down
      if (down && (event.code === 'ArrowUp' || event.code === 'KeyW' || event.code === 'KeyX')) keysRef.current.rotate = true
      if (down && event.code === 'Space') keysRef.current.hard = true
      if (down && event.code === 'KeyP' && game.status === 'play') {
        game.status = 'pause'
        setPhase('pause')
      } else if (down && event.code === 'KeyP' && game.status === 'pause') {
        game.status = 'play'
        setPhase('play')
      }
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
    const game = gameRef.current
    if (!game) return
    keysRef.current = { left: false, right: false, down: false, rotate: false, hard: false }
    begin(game)
    setPhase('play')
    setError('')
    canvasRef.current?.focus()
  }

  const resume = () => {
    const game = gameRef.current
    if (!game || game.status !== 'pause') return
    game.status = 'play'
    setPhase('play')
    canvasRef.current?.focus()
  }

  const hold = (key, down) => {
    keysRef.current[key] = down
  }

  const tap = (key) => {
    keysRef.current[key] = true
  }

  const mine = rank?.mine
  const finished = phase === 'over'

  return (
    <div className="shooter-page">
      <div>
        <h1 className="h4 mb-1">테트리스</h1>
        <p className="text-secondary small mb-3">
          블록을 빈틈없이 맞춰 줄을 지우세요. 10줄을 지울 때마다 레벨이 오르고 더 빨라집니다. 점수는 계정에 누적됩니다.
        </p>
        <div className="tetris-stage">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} />
          {phase !== 'play' && (
            <div className="shooter-overlay">
              <div className="shooter-overlay-title">
                {phase === 'over' ? '게임 오버' : phase === 'pause' ? '일시정지' : '테트리스'}
              </div>
              {finished ? (
                <div>
                  이번 점수 <strong>{lastScore}</strong>
                  {saving ? ' · 저장 중…' : error ? '' : ' · 순위에 반영했습니다.'}
                </div>
              ) : phase === 'pause' ? (
                <div>P 키로 다시 시작할 수 있습니다.</div>
              ) : (
                <div>← → 이동, ↓ 빨리 내리기, ↑ 회전, 스페이스는 한 번에 내리기. P는 일시정지입니다.</div>
              )}
              {phase === 'pause' ? (
                <Button className="btn-brand" onClick={resume}>계속</Button>
              ) : (
                <Button className="btn-brand" onClick={start}>{finished ? '다시 하기' : '시작'}</Button>
              )}
            </div>
          )}
        </div>
        <div className="shooter-pad">
          <button type="button" className="shooter-key" onPointerDown={() => tap('rotate')}>회전</button>
          <div className="shooter-pad-row">
            <button type="button" className="shooter-key" onPointerDown={() => hold('left', true)} onPointerUp={() => hold('left', false)} onPointerLeave={() => hold('left', false)}>←</button>
            <button type="button" className="shooter-key" onPointerDown={() => hold('down', true)} onPointerUp={() => hold('down', false)} onPointerLeave={() => hold('down', false)}>↓</button>
            <button type="button" className="shooter-key" onPointerDown={() => hold('right', true)} onPointerUp={() => hold('right', false)} onPointerLeave={() => hold('right', false)}>→</button>
          </div>
          <button type="button" className="shooter-key" onPointerDown={() => tap('hard')}>한번에</button>
        </div>
        {error ? <div className="text-danger small mt-2">{error}</div> : null}
      </div>

      <aside className="shooter-rank">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">순위</h2>
          {mine ? (
            <Badge bg="light" text="dark">
              내 누적 {mine.total} · {mine.rank ? `${mine.rank}위` : '기록 없음'}
            </Badge>
          ) : null}
        </div>
        <p className="small text-secondary">테트리스 점수를 모두 더한 누적 순위입니다. 비행 슈팅과는 따로 집계됩니다.</p>
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
