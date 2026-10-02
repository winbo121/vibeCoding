export const COLS = 10
export const ROWS = 20
export const CELL = 28
export const WIDTH = 430
export const HEIGHT = 656

const BOARD_X = 16
const BOARD_Y = 86

const SHAPES = {
  I: [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
  ],
  O: [
    [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
  ],
  T: [
    [[0, 1, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 0, 0], [1, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
  ],
  S: [
    [[0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]],
    [[0, 0, 0, 0], [0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0]],
    [[1, 0, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
  ],
  Z: [
    [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 1, 0], [0, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 0, 0], [1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [1, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0]],
  ],
  J: [
    [[1, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 1, 1, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 0, 0], [1, 1, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0]],
  ],
  L: [
    [[0, 0, 1, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
    [[0, 0, 0, 0], [1, 1, 1, 0], [1, 0, 0, 0], [0, 0, 0, 0]],
    [[1, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
  ],
}

const FILLS = {
  I: ['#ecfeff', '#22d3ee', '#0e7490'],
  O: ['#fef9c3', '#facc15', '#a16207'],
  T: ['#f3e8ff', '#c084fc', '#6b21a8'],
  S: ['#dcfce7', '#4ade80', '#166534'],
  Z: ['#ffe4e6', '#fb7185', '#9f1239'],
  J: ['#dbeafe', '#60a5fa', '#1d4ed8'],
  L: ['#ffedd5', '#fb923c', '#c2410c'],
}

const LINE_SCORE = [0, 100, 300, 500, 800]
const KICKS = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]]

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(''))
}

function refill(game) {
  const bag = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  game.bag.push(...bag)
}

function take(game) {
  if (game.bag.length < 7) refill(game)
  return game.bag.shift()
}

export function cellsOf(piece) {
  const shape = SHAPES[piece.type][piece.rot]
  const cells = []
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      if (shape[row][col]) cells.push({ x: piece.x + col, y: piece.y + row })
    }
  }
  return cells
}

function fits(board, piece) {
  for (const cell of cellsOf(piece)) {
    if (cell.x < 0 || cell.x >= COLS || cell.y >= ROWS) return false
    if (cell.y >= 0 && board[cell.y][cell.x]) return false
  }
  return true
}

function spawn(game) {
  const type = game.next || take(game)
  game.next = take(game)
  game.piece = { type, rot: 0, x: 3, y: 0 }
  game.dropAcc = 0
  if (!fits(game.board, game.piece)) game.status = 'over'
}

function clearLines(game) {
  let cleared = 0
  const kept = []
  for (const row of game.board) {
    if (row.every(Boolean)) cleared += 1
    else kept.push(row)
  }
  while (kept.length < ROWS) kept.unshift(Array(COLS).fill(''))
  game.board = kept
  return cleared
}

function lock(game) {
  for (const cell of cellsOf(game.piece)) {
    if (cell.y < 0) {
      game.status = 'over'
      return
    }
    game.board[cell.y][cell.x] = game.piece.type
  }
  const cleared = clearLines(game)
  game.score += LINE_SCORE[cleared] * game.level
  game.lines += cleared
  game.level = Math.floor(game.lines / 10) + 1
  spawn(game)
}

function ghostY(game) {
  const piece = { ...game.piece }
  while (fits(game.board, { ...piece, y: piece.y + 1 })) piece.y += 1
  return piece.y
}

function tryMove(game, dx, dy) {
  const next = { ...game.piece, x: game.piece.x + dx, y: game.piece.y + dy }
  if (!fits(game.board, next)) return false
  game.piece = next
  return true
}

function tryRotate(game) {
  const rot = (game.piece.rot + 1) % 4
  for (const [dx, dy] of KICKS) {
    const next = { ...game.piece, rot, x: game.piece.x + dx, y: game.piece.y + dy }
    if (fits(game.board, next)) {
      game.piece = next
      return
    }
  }
}

function dropInterval(level) {
  return Math.max(90, 820 - (level - 1) * 65)
}

export function createGame() {
  return {
    status: 'ready',
    board: emptyBoard(),
    piece: null,
    next: null,
    bag: [],
    score: 0,
    lines: 0,
    level: 1,
    dropAcc: 0,
    moveAcc: 0,
    wasLeft: false,
    wasRight: false,
  }
}

export function begin(game) {
  game.status = 'play'
  game.board = emptyBoard()
  game.bag = []
  game.next = null
  game.score = 0
  game.lines = 0
  game.level = 1
  game.dropAcc = 0
  game.moveAcc = 0
  game.wasLeft = false
  game.wasRight = false
  spawn(game)
}

function slide(game, input, frame) {
  const left = Boolean(input.left) && !input.right
  const right = Boolean(input.right) && !input.left
  if (left && !game.wasLeft) {
    tryMove(game, -1, 0)
    game.moveAcc = -160
  } else if (right && !game.wasRight) {
    tryMove(game, 1, 0)
    game.moveAcc = -160
  } else if (left || right) {
    game.moveAcc += frame
    while (game.moveAcc >= 46) {
      tryMove(game, left ? -1 : 1, 0)
      game.moveAcc -= 46
    }
  } else {
    game.moveAcc = 0
  }
  game.wasLeft = left
  game.wasRight = right
}

export function step(game, input, dt) {
  if (game.status !== 'play' || !game.piece) return
  const frame = Math.min(34, Math.max(0, dt))
  slide(game, input, frame)
  if (input.rotate) tryRotate(game)
  if (input.hard) {
    let dropped = 0
    while (tryMove(game, 0, 1)) dropped += 1
    game.score += dropped * 2
    lock(game)
    return
  }
  if (input.down) {
    game.dropAcc += frame
    while (game.status === 'play' && game.dropAcc >= 42) {
      game.dropAcc -= 42
      if (tryMove(game, 0, 1)) game.score += 1
      else lock(game)
    }
    return
  }
  game.dropAcc += frame
  const every = dropInterval(game.level)
  while (game.status === 'play' && game.dropAcc >= every) {
    game.dropAcc -= every
    if (!tryMove(game, 0, 1)) lock(game)
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function paintCell(ctx, x, y, type, alpha = 1, size = CELL) {
  const [light, mid, dark] = FILLS[type]
  ctx.save()
  ctx.globalAlpha = alpha
  const fill = ctx.createLinearGradient(x, y, x + size, y + size)
  fill.addColorStop(0, light)
  fill.addColorStop(0.45, mid)
  fill.addColorStop(1, dark)
  roundRect(ctx, x + 1.5, y + 1.5, size - 3, size - 3, 5)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  roundRect(ctx, x + 4, y + 4, size * 0.42, Math.max(3, size * 0.14), 2)
  ctx.fill()
  ctx.restore()
}

function drawPiece(ctx, piece, originX, originY, alpha = 1) {
  for (const cell of cellsOf(piece)) {
    if (cell.y < 0) continue
    paintCell(ctx, originX + cell.x * CELL, originY + cell.y * CELL, piece.type, alpha)
  }
}

export function draw(game, ctx) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  sky.addColorStop(0, '#0f172a')
  sky.addColorStop(1, '#1e293b')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.fillStyle = '#e2e8f0'
  ctx.font = '600 16px Outfit, Malgun Gothic, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`점수 ${game.score}`, 16, 28)
  ctx.fillText(`줄 ${game.lines}`, 16, 52)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#5eead4'
  ctx.fillText(`레벨 ${game.level}`, BOARD_X + COLS * CELL, 28)
  ctx.textAlign = 'left'

  ctx.fillStyle = '#020617'
  roundRect(ctx, BOARD_X - 6, BOARD_Y - 6, COLS * CELL + 12, ROWS * CELL + 12, 12)
  ctx.fill()

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const type = game.board[y][x]
      if (type) paintCell(ctx, BOARD_X + x * CELL, BOARD_Y + y * CELL, type)
      else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.08)'
        ctx.fillRect(BOARD_X + x * CELL + 1, BOARD_Y + y * CELL + 1, CELL - 2, CELL - 2)
      }
    }
  }

  if (game.piece && game.status !== 'over') {
    const landed = { ...game.piece, y: ghostY(game) }
    drawPiece(ctx, landed, BOARD_X, BOARD_Y, 0.22)
    drawPiece(ctx, game.piece, BOARD_X, BOARD_Y, 1)
  }

  const previewX = BOARD_X + COLS * CELL + 28
  ctx.fillStyle = '#e2e8f0'
  ctx.font = '600 14px Outfit, Malgun Gothic, sans-serif'
  ctx.fillText('다음', previewX, 118)
  ctx.fillStyle = '#020617'
  roundRect(ctx, previewX - 8, 132, 104, 104, 12)
  ctx.fill()
  if (game.next) {
    const preview = { type: game.next, rot: 0, x: 0, y: 0 }
    const cells = cellsOf(preview)
    const minX = Math.min(...cells.map((cell) => cell.x))
    const maxX = Math.max(...cells.map((cell) => cell.x))
    const minY = Math.min(...cells.map((cell) => cell.y))
    const maxY = Math.max(...cells.map((cell) => cell.y))
    const previewSize = 22
    const offsetX = previewX + (88 - (maxX - minX + 1) * previewSize) / 2
    const offsetY = 148 + (72 - (maxY - minY + 1) * previewSize) / 2
    for (const cell of cells) {
      paintCell(
        ctx,
        offsetX + (cell.x - minX) * previewSize,
        offsetY + (cell.y - minY) * previewSize,
        game.next,
        1,
        previewSize,
      )
    }
  }
}
