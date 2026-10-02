export const WIDTH = 640
export const HEIGHT = 820
export const MAX_WAVE = 5

export function createMatch() {
  const stars = []
  for (let i = 0; i < 42; i += 1) {
    stars.push({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      s: Math.random() * 1.5 + 0.4,
      v: Math.random() * 0.04 + 0.012,
    })
  }
  return {
    mode: 'ready',
    score: 0,
    lives: 3,
    wave: 1,
    stars,
    player: { x: WIDTH / 2, y: HEIGHT - 78, cooldown: 0, invuln: 0 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    formX: 0,
    formDir: 1,
    formSpeed: 0.05,
    shootTimer: 900,
    diveTimer: 1600,
  }
}

const WAVES = [
  { formSpeed: 0.036, shootEvery: 1180, volley: 1, aim: 0, diveEvery: 2200, maxDivers: 1, bulletSpeed: 0.16, diveSpeed: 0.13, drop: 11 },
  { formSpeed: 0.055, shootEvery: 820, volley: 2, aim: 0.00038, diveEvery: 1400, maxDivers: 2, bulletSpeed: 0.25, diveSpeed: 0.21, drop: 16 },
  { formSpeed: 0.078, shootEvery: 580, volley: 2, aim: 0.00055, diveEvery: 980, maxDivers: 2, bulletSpeed: 0.34, diveSpeed: 0.28, drop: 20 },
  { formSpeed: 0.102, shootEvery: 420, volley: 3, aim: 0.00072, diveEvery: 700, maxDivers: 3, bulletSpeed: 0.42, diveSpeed: 0.34, drop: 24 },
  { formSpeed: 0, shootEvery: 360, volley: 11, aim: 0, diveEvery: 99999, maxDivers: 0, bulletSpeed: 0.3, diveSpeed: 0, drop: 0 },
]

function tuning(wave) {
  const stage = Math.min(MAX_WAVE, Math.max(1, wave))
  return WAVES[stage - 1]
}

function spawnBoss(match) {
  match.enemies = [{
    boss: true,
    row: 0,
    x: WIDTH / 2,
    y: 168,
    diving: false,
    dx: 0,
    dy: 0,
    t: 0,
    swing: 0,
    hp: 60,
    maxHp: 60,
    flash: 0,
    pattern: 0,
    points: 30,
    alive: true,
  }]
  match.formX = 0
  match.formDir = 1
  match.formSpeed = 0
  match.shootTimer = 420
  match.diveTimer = 99999
}

function fireBoss(match, boss, player) {
  const at = placeOf(boss, match)
  const pattern = boss.pattern % 3
  boss.pattern += 1
  if (pattern === 0) {
    const count = 11
    for (let shot = 0; shot < count; shot += 1) {
      const spread = (shot - (count - 1) / 2) * 0.065
      match.enemyBullets.push({ x: at.x, y: at.y + 36, vx: spread, vy: 0.28 })
    }
    return
  }
  if (pattern === 1) {
    const aim = Math.max(-0.32, Math.min(0.32, (player.x - at.x) * 0.0011))
    for (let shot = -3; shot <= 3; shot += 1) {
      match.enemyBullets.push({ x: at.x + shot * 18, y: at.y + 34, vx: aim + shot * 0.03, vy: 0.4 })
    }
    for (const side of [-1, 1]) {
      match.enemyBullets.push({ x: at.x + side * 78, y: at.y + 18, vx: side * 0.16 + aim * 0.4, vy: 0.3 })
    }
    return
  }
  const spin = boss.t / 220
  for (let shot = 0; shot < 10; shot += 1) {
    const angle = spin + (shot / 10) * Math.PI
    match.enemyBullets.push({
      x: at.x + Math.cos(angle) * 40,
      y: at.y + 20,
      vx: Math.cos(angle) * 0.2,
      vy: 0.16 + Math.abs(Math.sin(angle)) * 0.28,
    })
  }
}

function spawn(match) {
  if (match.wave >= MAX_WAVE) {
    spawnBoss(match)
    return
  }
  const pace = tuning(match.wave)
  const enemies = []
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      enemies.push({
        row,
        col,
        x: 58 + col * ((WIDTH - 116) / 7),
        y: 100 + row * 54,
        diving: false,
        dx: 0,
        dy: 0,
        t: 0,
        swing: 0,
        points: (120 + match.wave * 20) - row * 20,
        alive: true,
      })
    }
  }
  match.enemies = enemies
  match.formX = 0
  match.formDir = 1
  match.formSpeed = pace.formSpeed
  match.shootTimer = pace.shootEvery
  match.diveTimer = pace.diveEvery
}

export function begin(match) {
  match.mode = 'play'
  match.score = 0
  match.lives = 3
  match.wave = 1
  match.bullets = []
  match.enemyBullets = []
  match.player.x = WIDTH / 2
  match.player.y = HEIGHT - 78
  match.player.cooldown = 280
  match.player.invuln = 0
  spawn(match)
}

function living(match) {
  return match.enemies.filter((enemy) => enemy.alive)
}

function placeOf(enemy, match) {
  if (enemy.diving) return { x: enemy.dx, y: enemy.dy }
  return { x: enemy.x + match.formX, y: enemy.y }
}

function hurt(match) {
  if (match.mode !== 'play' || match.player.invuln > 0) return
  match.lives -= 1
  match.player.invuln = 1300
  match.enemyBullets = []
  if (match.lives <= 0) match.mode = 'over'
}

function driftStars(match, dt) {
  for (const star of match.stars) {
    star.y += star.v * dt
    if (star.y > HEIGHT) star.y = 0
  }
}

export function step(match, input, dt) {
  const frame = Math.min(34, dt)
  if (match.mode !== 'play') {
    driftStars(match, frame)
    return
  }

  const player = match.player
  if (input.left) player.x -= 0.46 * frame
  if (input.right) player.x += 0.46 * frame
  if (input.up) player.y -= 0.46 * frame
  if (input.down) player.y += 0.46 * frame
  player.x = Math.max(36, Math.min(WIDTH - 36, player.x))
  player.y = Math.max(96, Math.min(HEIGHT - 48, player.y))
  player.cooldown = Math.max(0, player.cooldown - frame)
  player.invuln = Math.max(0, player.invuln - frame)

  if (input.fire && player.cooldown <= 0) {
    player.cooldown = 230
    match.bullets.push({ x: player.x, y: player.y - 30 })
  }

  for (const bullet of match.bullets) bullet.y -= 0.62 * frame
  match.bullets = match.bullets.filter((bullet) => bullet.y > -12)

  const pace = tuning(match.wave)
  for (const bullet of match.enemyBullets) {
    bullet.y += (bullet.vy == null ? pace.bulletSpeed : bullet.vy) * frame
    bullet.x += (bullet.vx || 0) * frame
  }
  match.enemyBullets = match.enemyBullets.filter((bullet) => bullet.y < HEIGHT + 12 && bullet.x > -20 && bullet.x < WIDTH + 20)

  const boss = living(match).find((enemy) => enemy.boss)
  if (boss) {
    boss.t += frame
    boss.flash = Math.max(0, boss.flash - frame)
    boss.x = WIDTH / 2 + Math.sin(boss.t / 520) * 150
    const at = placeOf(boss, match)
    if (Math.abs(player.x - at.x) < 90 && Math.abs(player.y - at.y) < 50) hurt(match)
    match.shootTimer -= frame
    if (match.shootTimer <= 0) {
      fireBoss(match, boss, player)
      match.shootTimer = 360
    }
  }

  const fleet = living(match).filter((enemy) => !enemy.diving && !enemy.boss)
  if (fleet.length) {
    match.formX += match.formDir * match.formSpeed * frame
    let minX = Infinity
    let maxX = -Infinity
    let maxY = 0
    for (const enemy of fleet) {
      const at = placeOf(enemy, match)
      minX = Math.min(minX, at.x)
      maxX = Math.max(maxX, at.x)
      maxY = Math.max(maxY, at.y)
    }
    if (minX < 34 && match.formDir < 0) {
      match.formDir = 1
      for (const enemy of fleet) enemy.y += pace.drop
    } else if (maxX > WIDTH - 34 && match.formDir > 0) {
      match.formDir = -1
      for (const enemy of fleet) enemy.y += pace.drop
    }
    if (maxY > player.y - 26) hurt(match)
  }

  if (!boss) match.shootTimer -= frame
  if (!boss && match.shootTimer <= 0) {
    const shooters = living(match)
    if (shooters.length) {
      const enemy = shooters[Math.floor(Math.random() * shooters.length)]
      const at = placeOf(enemy, match)
      const aim = Math.max(-0.24, Math.min(0.24, (player.x - at.x) * pace.aim))
      for (let shot = 0; shot < pace.volley; shot += 1) {
        const spread = (shot - (pace.volley - 1) / 2) * 0.09
        match.enemyBullets.push({ x: at.x, y: at.y + 16, vx: aim + spread })
      }
    }
    match.shootTimer = pace.shootEvery
  }

  if (!boss) match.diveTimer -= frame
  const divers = living(match).filter((enemy) => enemy.diving)
  if (!boss && match.diveTimer <= 0 && divers.length < pace.maxDivers) {
    const pool = living(match).filter((enemy) => !enemy.diving)
    if (pool.length) {
      const enemy = pool[Math.floor(Math.random() * pool.length)]
      const at = placeOf(enemy, match)
      enemy.diving = true
      enemy.dx = at.x
      enemy.dy = at.y
      enemy.t = 0
      enemy.swing = (Math.random() < 0.5 ? -1 : 1) * (0.05 + match.wave * 0.012)
    }
    match.diveTimer = pace.diveEvery
  }

  for (const enemy of living(match)) {
    if (!enemy.diving) continue
    enemy.t += frame
    enemy.dy += pace.diveSpeed * frame
    enemy.dx += Math.sin(enemy.t / 190) * enemy.swing * frame
    enemy.dx = Math.max(18, Math.min(WIDTH - 18, enemy.dx))
    if (enemy.dy > HEIGHT + 24) enemy.diving = false
    if (Math.hypot(enemy.dx - player.x, enemy.dy - player.y) < 30) hurt(match)
  }

  const kept = []
  for (const bullet of match.bullets) {
    let hit = false
    for (const enemy of living(match)) {
      const at = placeOf(enemy, match)
      const halfW = enemy.boss ? 90 : 22
      const halfH = enemy.boss ? 48 : 18
      if (Math.abs(bullet.x - at.x) < halfW && Math.abs(bullet.y - at.y) < halfH) {
        if (enemy.boss) {
          enemy.hp -= 1
          enemy.flash = 90
          match.score += enemy.points
          if (enemy.hp <= 0) {
            enemy.alive = false
            match.score += 2500
          }
        } else {
          enemy.alive = false
          match.score += enemy.points
        }
        hit = true
        break
      }
    }
    if (!hit) kept.push(bullet)
  }
  match.bullets = kept

  if (match.mode === 'play') {
    const keptShots = []
    for (const bullet of match.enemyBullets) {
      const hit = Math.abs(bullet.x - player.x) < 16 && Math.abs(bullet.y - player.y) < 18
      if (hit) hurt(match)
      else keptShots.push(bullet)
    }
    match.enemyBullets = keptShots
  }

  if (match.mode === 'play' && living(match).length === 0) {
    match.score += 300
    if (match.wave >= MAX_WAVE) {
      match.score += 1500
      match.mode = 'clear'
    } else {
      match.wave += 1
      spawn(match)
    }
  }

  driftStars(match, frame)
}

function blobShadow(ctx, y, rx, ry) {
  const shade = ctx.createRadialGradient(0, y, 1, 0, y, rx)
  shade.addColorStop(0, 'rgba(0, 0, 0, 0.42)')
  shade.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = shade
  ctx.beginPath()
  ctx.ellipse(1, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
}

function sphere(ctx, x, y, r, light, mid, dark) {
  const ball = ctx.createRadialGradient(x - r * 0.36, y - r * 0.42, r * 0.05, x + r * 0.08, y + r * 0.12, r)
  ball.addColorStop(0, light)
  ball.addColorStop(0.48, mid)
  ball.addColorStop(1, dark)
  ctx.fillStyle = ball
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function eyes(ctx, y, gap, radius) {
  sphere(ctx, -gap, y, radius, '#ffffff', '#e2e8f0', '#64748b')
  sphere(ctx, gap, y, radius, '#ffffff', '#e2e8f0', '#64748b')
  ctx.fillStyle = '#020617'
  ctx.beginPath()
  ctx.arc(-gap + radius * 0.22, y + radius * 0.12, radius * 0.4, 0, Math.PI * 2)
  ctx.arc(gap + radius * 0.22, y + radius * 0.12, radius * 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath()
  ctx.arc(-gap, y - radius * 0.15, radius * 0.14, 0, Math.PI * 2)
  ctx.arc(gap, y - radius * 0.15, radius * 0.14, 0, Math.PI * 2)
  ctx.fill()
}

function drawPlayer(ctx, x, y) {
  const flame = 9 + Math.sin(Date.now() / 55) * 4
  ctx.save()
  ctx.translate(x, y)
  blobShadow(ctx, 24, 28, 8)

  for (const side of [-1, 1]) {
    const plume = ctx.createLinearGradient(0, 14, 0, 24 + flame)
    plume.addColorStop(0, '#fff7ed')
    plume.addColorStop(0.35, '#fb923c')
    plume.addColorStop(1, 'rgba(56, 189, 248, 0)')
    ctx.fillStyle = plume
    ctx.beginPath()
    ctx.moveTo(side * 11 - 4, 14)
    ctx.quadraticCurveTo(side * 11, 22 + flame, side * 11 + 4, 14)
    ctx.fill()
  }

  const drawWing = (sign) => {
    ctx.beginPath()
    ctx.moveTo(sign * 8, 0)
    ctx.lineTo(sign * 42, 12)
    ctx.lineTo(sign * 36, 22)
    ctx.quadraticCurveTo(sign * 18, 14, sign * 8, 16)
    ctx.closePath()
  }
  for (const sign of [-1, 1]) {
    ctx.save()
    ctx.translate(0, 3)
    drawWing(sign)
    ctx.fillStyle = sign < 0 ? '#042f2e' : '#134e4a'
    ctx.fill()
    ctx.restore()
    drawWing(sign)
    const panel = ctx.createLinearGradient(sign * 8, -2, sign * 40, 18)
    panel.addColorStop(0, '#ecfeff')
    panel.addColorStop(0.35, '#5eead4')
    panel.addColorStop(1, '#0f766e')
    ctx.fillStyle = panel
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(sign * 14, 4)
    ctx.lineTo(sign * 32, 13)
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.moveTo(0, -38)
  ctx.bezierCurveTo(14, -16, 15, 4, 9, 20)
  ctx.lineTo(-9, 20)
  ctx.bezierCurveTo(-15, 4, -14, -16, 0, -38)
  ctx.closePath()
  const hull = ctx.createLinearGradient(-12, 0, 12, 0)
  hull.addColorStop(0, '#115e59')
  hull.addColorStop(0.28, '#99f6e4')
  hull.addColorStop(0.5, '#f0fdfa')
  hull.addColorStop(0.72, '#5eead4')
  hull.addColorStop(1, '#134e4a')
  ctx.fillStyle = hull
  ctx.fill()
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)'
  ctx.lineWidth = 1
  ctx.stroke()

  const spine = ctx.createLinearGradient(0, -30, 0, 8)
  spine.addColorStop(0, 'rgba(255,255,255,0.85)')
  spine.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.strokeStyle = spine
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(0, -30)
  ctx.lineTo(0, 6)
  ctx.stroke()

  sphere(ctx, 0, -8, 7.5, '#ffffff', '#7dd3fc', '#0369a1')
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.beginPath()
  ctx.ellipse(-2, -11, 2.2, 1.2, -0.5, 0, Math.PI * 2)
  ctx.fill()

  for (const side of [-1, 1]) {
    sphere(ctx, side * 10, 16, 3.4, '#1e293b', '#0f172a', '#020617')
    const core = ctx.createRadialGradient(side * 10, 16, 0, side * 10, 16, 2.2)
    core.addColorStop(0, '#fff7ed')
    core.addColorStop(1, '#f97316')
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(side * 10, 16, 2, 0, Math.PI * 2)
    ctx.fill()
    sphere(ctx, side * 36, 14, 2.4, '#fecdd3', '#fb7185', '#9f1239')
  }
  ctx.restore()
}

function drawEnemy(ctx, x, y, row) {
  const flap = Math.sin(Date.now() / 140 + x * 0.04) * 3.5
  ctx.save()
  ctx.translate(x, y)
  blobShadow(ctx, 16, 18, 6)

  if (row === 0) {
    for (const sign of [-1, 1]) {
      const shell = ctx.createRadialGradient(sign * 10, -2, 1, sign * 14, 2, 16)
      shell.addColorStop(0, '#ffe4e6')
      shell.addColorStop(0.45, '#fb7185')
      shell.addColorStop(1, '#881337')
      ctx.fillStyle = shell
      ctx.beginPath()
      ctx.ellipse(sign * 13, 2 + flap * 0.25, 13, 8, sign * -0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(sign * 6, 0)
      ctx.quadraticCurveTo(sign * 14, -3, sign * 22, 3)
      ctx.stroke()
    }
    sphere(ctx, 0, 1, 11, '#fff1f2', '#fb7185', '#9f1239')
    ctx.strokeStyle = 'rgba(136, 19, 55, 0.7)'
    ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.moveTo(0, -8)
    ctx.lineTo(0, 10)
    ctx.stroke()
    ctx.strokeStyle = '#fecdd3'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-4, -8)
    ctx.quadraticCurveTo(-10, -20, -6, -24)
    ctx.moveTo(4, -8)
    ctx.quadraticCurveTo(10, -20, 6, -24)
    ctx.stroke()
    eyes(ctx, -2, 3.2, 2.4)
  } else if (row === 1) {
    for (const sign of [-1, 1]) {
      const wing = ctx.createRadialGradient(sign * 8, -4, 1, sign * 16, 0, 22)
      wing.addColorStop(0, 'rgba(255, 251, 235, 0.95)')
      wing.addColorStop(0.4, 'rgba(251, 191, 36, 0.82)')
      wing.addColorStop(1, 'rgba(146, 64, 14, 0.2)')
      ctx.fillStyle = wing
      ctx.beginPath()
      ctx.moveTo(sign * 3, -2)
      ctx.quadraticCurveTo(sign * 28, -20 - flap, sign * 22, 4)
      ctx.quadraticCurveTo(sign * 14, 1, sign * 3, 4)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(sign * 3, 3)
      ctx.quadraticCurveTo(sign * 20, 6 + flap * 0.4, sign * 16, 12)
      ctx.quadraticCurveTo(sign * 8, 8, sign * 3, 6)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(sign * 5, 0)
      ctx.quadraticCurveTo(sign * 14, -8, sign * 20, 2)
      ctx.stroke()
    }
    sphere(ctx, 0, 2, 6.5, '#fef3c7', '#f59e0b', '#92400e')
    sphere(ctx, 0, -8, 4.2, '#fffbeb', '#fbbf24', '#b45309')
    sphere(ctx, 0, 11, 4.4, '#fde68a', '#d97706', '#78350f')
    eyes(ctx, -8, 2.2, 1.7)
  } else if (row === 2) {
    ctx.fillStyle = '#082f49'
    ctx.beginPath()
    ctx.ellipse(0, 8, 18, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    const disc = ctx.createLinearGradient(-22, 0, 22, 0)
    disc.addColorStop(0, '#0c4a6e')
    disc.addColorStop(0.18, '#7dd3fc')
    disc.addColorStop(0.5, '#f0f9ff')
    disc.addColorStop(0.82, '#38bdf8')
    disc.addColorStop(1, '#075985')
    ctx.fillStyle = disc
    ctx.beginPath()
    ctx.ellipse(0, 4, 21, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.ellipse(0, 3, 14, 4.2, 0, Math.PI * 1.05, Math.PI * 1.95)
    ctx.stroke()
    const dome = ctx.createRadialGradient(-3, -8, 1, 1, -2, 12)
    dome.addColorStop(0, '#ffffff')
    dome.addColorStop(0.45, '#7dd3fc')
    dome.addColorStop(1, '#0369a1')
    ctx.fillStyle = dome
    ctx.beginPath()
    ctx.ellipse(0, -1, 9, 10, 0, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.beginPath()
    ctx.ellipse(-3, -6, 2.4, 1.3, -0.6, 0, Math.PI * 2)
    ctx.fill()
    const blink = Math.floor(Date.now() / 160 + x) % 5
    ;[-14, -7, 0, 7, 14].forEach((lx, index) => {
      sphere(ctx, lx, 5, index === blink ? 2.1 : 1.5, '#fef9c3', '#facc15', '#a16207')
    })
  } else {
    for (const sign of [-1, 1]) {
      const wing = ctx.createRadialGradient(sign * 8, 0, 1, sign * 14, 2, 14)
      wing.addColorStop(0, 'rgba(204, 251, 241, 0.9)')
      wing.addColorStop(1, 'rgba(15, 118, 110, 0.15)')
      ctx.fillStyle = wing
      ctx.beginPath()
      ctx.ellipse(sign * 14, flap * 0.35, 12, 5, sign * -0.65, 0, Math.PI * 2)
      ctx.fill()
    }
    sphere(ctx, 0, 8, 6.2, '#99f6e4', '#0f766e', '#042f2e')
    sphere(ctx, 0, 1, 5.2, '#ccfbf1', '#14b8a6', '#115e59')
    sphere(ctx, 0, -7, 4.6, '#f0fdfa', '#5eead4', '#0f766e')
    ctx.fillStyle = '#042f2e'
    ctx.beginPath()
    ctx.moveTo(-1.4, 13)
    ctx.lineTo(0, 22)
    ctx.lineTo(1.4, 13)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(4, 47, 46, 0.55)'
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(-4, 8)
    ctx.lineTo(4, 8)
    ctx.moveTo(-3.2, 3)
    ctx.lineTo(3.2, 3)
    ctx.stroke()
    eyes(ctx, -8, 2.1, 1.6)
  }
  ctx.restore()
}

function drawBoss(ctx, x, y, boss) {
  const glow = 1.2 + Math.sin(Date.now() / 90) * 0.7
  ctx.save()
  ctx.translate(x, y)
  blobShadow(ctx, 54, 100, 18)

  for (const sign of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(sign * 20, -6)
    ctx.lineTo(sign * 112, 10)
    ctx.lineTo(sign * 98, 38)
    ctx.quadraticCurveTo(sign * 50, 22, sign * 22, 30)
    ctx.closePath()
    ctx.fillStyle = '#3b0764'
    ctx.fill()
    const plate = ctx.createLinearGradient(sign * 18, -16, sign * 104, 28)
    plate.addColorStop(0, '#fae8ff')
    plate.addColorStop(0.42, '#c084fc')
    plate.addColorStop(1, '#6b21a8')
    ctx.beginPath()
    ctx.moveTo(sign * 16, -16)
    ctx.lineTo(sign * 104, 2)
    ctx.lineTo(sign * 90, 26)
    ctx.quadraticCurveTo(sign * 46, 10, sign * 16, 16)
    ctx.closePath()
    ctx.fillStyle = plate
    ctx.fill()
    sphere(ctx, sign * 72, 14, 6, '#f5d0fe', '#a855f7', '#3b0764')
    const muzzle = ctx.createRadialGradient(sign * 72, 22, 0, sign * 72, 22, 5)
    muzzle.addColorStop(0, '#fff1f2')
    muzzle.addColorStop(1, '#e11d48')
    ctx.fillStyle = muzzle
    ctx.beginPath()
    ctx.arc(sign * 72, 22 + glow, 3.4, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = '#4c0519'
  ctx.beginPath()
  ctx.ellipse(0, 16, 50, 30, 0, 0, Math.PI * 2)
  ctx.fill()
  const body = ctx.createRadialGradient(-18, -20, 4, 4, 6, 62)
  body.addColorStop(0, '#ffe4e6')
  body.addColorStop(0.38, '#fb7185')
  body.addColorStop(0.72, '#9f1239')
  body.addColorStop(1, '#4c0519')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, -2, 48, 34, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(0, -8, 24, 11, 0, Math.PI, 0)
  ctx.stroke()
  sphere(ctx, 0, -6, 15, '#fff1f2', '#fb7185', '#881337')
  eyes(ctx, -8, 5.5, 3.4)
  for (const lx of [-24, 0, 24]) {
    sphere(ctx, lx, 24, 4.4, '#fecdd3', '#be123c', '#4c0519')
    ctx.fillStyle = `rgba(254, 226, 226, ${0.45 + glow * 0.15})`
    ctx.beginPath()
    ctx.arc(lx, 28, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }
  if (boss.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.38)'
    ctx.beginPath()
    ctx.ellipse(0, -2, 48, 34, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawShot(ctx, x, y, color) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 8)
  glow.addColorStop(0, '#fff')
  glow.addColorStop(0.4, color)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.ellipse(x, y, 3.2, 8, 0, 0, Math.PI * 2)
  ctx.fill()
}

export function draw(match, ctx) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  sky.addColorStop(0, '#07111f')
  sky.addColorStop(1, '#122033')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  for (const star of match.stars) {
    ctx.globalAlpha = 0.4 + star.s * 0.3
    ctx.fillStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.s * 0.7, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  for (const enemy of living(match)) {
    const at = placeOf(enemy, match)
    if (enemy.boss) drawBoss(ctx, at.x, at.y, enemy)
    else drawEnemy(ctx, at.x, at.y, enemy.row)
  }

  for (const bullet of match.bullets) drawShot(ctx, bullet.x, bullet.y, '#fef3c7')
  for (const bullet of match.enemyBullets) drawShot(ctx, bullet.x, bullet.y, '#fb7185')

  const player = match.player
  if (match.mode !== 'over' && (player.invuln <= 0 || Math.floor(player.invuln / 80) % 2 === 0)) {
    drawPlayer(ctx, player.x, player.y)
  }

  const stageTint = ['#5eead4', '#34d399', '#facc15', '#fb923c', '#fb7185'][Math.min(MAX_WAVE, match.wave) - 1]
  ctx.fillStyle = '#e2e8f0'
  ctx.font = '600 16px Outfit, Malgun Gothic, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`점수 ${match.score}`, 16, 28)
  ctx.textAlign = 'right'
  ctx.fillStyle = stageTint
  ctx.fillText(match.wave >= MAX_WAVE ? `${match.wave}/${MAX_WAVE} 보스` : `${match.wave}/${MAX_WAVE}탄`, WIDTH - 16, 28)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#5eead4'
  ctx.fillText(`목숨 ${match.lives}`, 16, 50)
  const boss = living(match).find((enemy) => enemy.boss)
  if (boss) {
    const bar = 200
    const left = (WIDTH - bar) / 2
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(left, 62, bar, 8)
    ctx.fillStyle = '#fb7185'
    ctx.fillRect(left, 62, bar * (boss.hp / boss.maxHp), 8)
  }
}
