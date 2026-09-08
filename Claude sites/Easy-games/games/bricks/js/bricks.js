'use strict';

/* Easy Bricks.

   The original 1976 numbers, which are more specific than most clones assume:
   eight rows in four colour bands of two, worth 1, 3, 5 and 7 points from the
   bottom up; the paddle halves once the ball breaks through and reaches the top
   wall; and the ball speeds up after 4 hits, after 12 hits, and on first contact
   with the orange and the red rows.

   Two things are deliberately not from 1976, because without them it is
   unplayable with a mouse: the bounce angle comes from where the ball lands on
   the paddle, and the ball is stepped in small slices so it cannot pass through
   a brick in a single frame. */

(function () {
  const W = 680, H = 620;

  const CFG = {
    cols: 14, rows: 8,
    brickH: 20, brickTop: 78, sideMargin: 18, brickGap: 3,
    paddleW: 104, paddleH: 14, paddleY: H - 46, paddleSpeed: 520,
    ballR: 7, ballStart: 300, speedMul: 1.11, ballMax: 660,
    maxBounce: 1.15,
    lives: 3, screens: 2
  };

  // Bottom up: yellow, green, orange, red. Two rows each.
  const BANDS = [
    { points: 7, col: '#e8453c', light: '#ff7d75', name: 'red' },
    { points: 7, col: '#e8453c', light: '#ff7d75', name: 'red' },
    { points: 5, col: '#e88a2a', light: '#ffb066', name: 'orange' },
    { points: 5, col: '#e88a2a', light: '#ffb066', name: 'orange' },
    { points: 3, col: '#3fb457', light: '#7de095', name: 'green' },
    { points: 3, col: '#3fb457', light: '#7de095', name: 'green' },
    { points: 1, col: '#d8c22e', light: '#f5e070', name: 'yellow' },
    { points: 1, col: '#d8c22e', light: '#f5e070', name: 'yellow' }
  ];

  const DROPS = {
    wide:  { col: '#4ad46f', label: 'W' },
    multi: { col: '#4da3ff', label: 'M' },
    slow:  { col: '#b98cff', label: 'S' },
    life:  { col: '#ff5470', label: '+' }
  };

  let mode = 'modern';        // classic | modern
  let state = 'menu';         // menu | serve | play | over | won
  let bricks = [];            // { alive, band, x, y, w, h }
  let balls = [];
  let drops = [];
  let paddle, lives, score, screen, hits, particles;
  let halved, spedOrange, spedRed, sped4, sped12;
  let widenUntil = 0;

  Shell.mount({
    name: 'Bricks',
    width: W, height: H, max: 680, pad: 240,
    tools: ['sound', 'pause', 'help'],
    foot: 'Move with the <b>mouse</b>, <b>arrows</b> or <b>A</b> and <b>D</b> &middot; drag on a phone',
    rules: `
      <ul>
        <li>Eight rows in four colour bands. Yellow scores 1, green 3, orange 5, red 7.</li>
        <li>Where the ball lands on your paddle sets the angle it leaves at. The
            middle sends it straight, the edges send it wide.</li>
        <li>The ball speeds up after 4 paddle hits, again after 12, and again the
            first time it touches the orange and the red rows.</li>
        <li>Once you break through and the ball reaches the top wall, your paddle
            halves in width for the rest of the game.</li>
        <li>Three lives, two screens to clear. A perfect game scores 896.</li>
      </ul>
      <p><b>Modern</b> mode drops power-ups from broken bricks: a wider paddle,
         an extra ball, a slower ball, and an extra life. <b>Classic</b> mode is the
         1976 game with none of that.</p>`
  });

  Input.init();
  Input.claim(['KeyA', 'KeyD', 'KeyR', 'Space']);
  const ctx = Shell.ctx;

  /* ---------- setup ---------- */

  function buildBricks() {
    bricks = [];
    const usable = W - CFG.sideMargin * 2;
    const bw = (usable - CFG.brickGap * (CFG.cols - 1)) / CFG.cols;
    for (let r = 0; r < CFG.rows; r++) {
      for (let c = 0; c < CFG.cols; c++) {
        bricks.push({
          alive: true, band: r,
          x: CFG.sideMargin + c * (bw + CFG.brickGap),
          y: CFG.brickTop + r * (CFG.brickH + CFG.brickGap),
          w: bw, h: CFG.brickH
        });
      }
    }
  }

  function newBall(x, y, speed, ang) {
    return { x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, speed, stuck: false };
  }

  function start() {
    score = 0; lives = CFG.lives; screen = 1;
    hits = 0; halved = false; spedOrange = false; spedRed = false; sped4 = false; sped12 = false;
    widenUntil = 0;
    particles = [];
    drops = [];
    paddle = { x: W / 2, w: CFG.paddleW };
    buildBricks();
    serve();
    Shell.hide();
    updateHud();
  }

  function serve() {
    balls = [newBall(paddle.x, CFG.paddleY - 18, CFG.ballStart, -Math.PI / 2 + (Math.random() - 0.5) * 0.6)];
    balls[0].stuck = true;
    state = 'serve';
  }

  function launch() {
    if (state !== 'serve') return;
    for (const b of balls) b.stuck = false;
    state = 'play';
    Sfx.place();
  }

  /* ---------- simulation ---------- */

  function update(dt) {
    if (state !== 'play' && state !== 'serve') return;

    movePaddle(dt);
    if (widenUntil && performance.now() > widenUntil) { paddle.w = baseWidth(); widenUntil = 0; }

    for (const b of balls) {
      if (b.stuck) { b.x = paddle.x; b.y = CFG.paddleY - 18; continue; }
      let remaining = dt;
      while (remaining > 0) {
        const step = Math.min(remaining, 3 / Math.max(1, Math.hypot(b.vx, b.vy)));
        remaining -= step;
        stepBall(b, step);
      }
    }

    balls = balls.filter((b) => b.y - CFG.ballR < H + 40);
    if (state === 'play' && !balls.length) loseLife();

    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += 150 * dt;
      if (d.y > CFG.paddleY - 8 && d.y < CFG.paddleY + CFG.paddleH + 8 &&
          Math.abs(d.x - paddle.x) < paddle.w / 2 + 12) {
        applyDrop(d.kind);
        drops.splice(i, 1);
        continue;
      }
      if (d.y > H + 20) drops.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += 700 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function baseWidth() { return halved ? CFG.paddleW / 2 : CFG.paddleW; }

  function movePaddle(dt) {
    let d = 0;
    if (Input.held('ArrowLeft') || Input.held('KeyA')) d -= 1;
    if (Input.held('ArrowRight') || Input.held('KeyD')) d += 1;
    if (Touch.dir.dx) d = Touch.dir.dx;
    if (d) paddle.x = clamp(paddle.x + d * CFG.paddleSpeed * dt, paddle.w / 2, W - paddle.w / 2);
  }

  function stepBall(b, dt) {
    // X axis.
    b.x += b.vx * dt;
    if (b.x - CFG.ballR < 0) { b.x = CFG.ballR; b.vx = -b.vx; Sfx.tick(false); }
    if (b.x + CFG.ballR > W) { b.x = W - CFG.ballR; b.vx = -b.vx; Sfx.tick(false); }
    let hit = brickAt(b.x, b.y);
    if (hit) { b.vx = -b.vx; b.x += (b.vx > 0 ? 1 : -1) * 0.5; breakBrick(hit, b); }

    // Y axis.
    b.y += b.vy * dt;
    if (b.y - CFG.ballR < 0) {
      b.y = CFG.ballR;
      b.vy = -b.vy;
      Sfx.tick(false);
      if (!halved) { halved = true; paddle.w = baseWidth(); Shell.banner('Paddle halved'); }
    }
    hit = brickAt(b.x, b.y);
    if (hit) { b.vy = -b.vy; b.y += (b.vy > 0 ? 1 : -1) * 0.5; breakBrick(hit, b); }

    // Paddle.
    if (b.vy > 0 &&
        b.y + CFG.ballR >= CFG.paddleY && b.y - CFG.ballR <= CFG.paddleY + CFG.paddleH &&
        Math.abs(b.x - paddle.x) <= paddle.w / 2 + CFG.ballR) {
      const offset = clamp((b.x - paddle.x) / (paddle.w / 2), -1, 1);
      const ang = -Math.PI / 2 + offset * CFG.maxBounce;
      b.vx = Math.cos(ang) * b.speed;
      b.vy = Math.sin(ang) * b.speed;
      b.y = CFG.paddleY - CFG.ballR - 0.5;
      hits++;
      if (!sped4 && hits >= 4) { sped4 = true; speedUp(); }
      if (!sped12 && hits >= 12) { sped12 = true; speedUp(); }
      Sfx.place();
      updateHud();
    }
  }

  function speedUp() {
    for (const b of balls) {
      b.speed = Math.min(CFG.ballMax, b.speed * CFG.speedMul);
      const m = Math.hypot(b.vx, b.vy) || 1;
      b.vx = b.vx / m * b.speed;
      b.vy = b.vy / m * b.speed;
    }
  }

  function brickAt(x, y) {
    for (const br of bricks) {
      if (!br.alive) continue;
      if (x + CFG.ballR > br.x && x - CFG.ballR < br.x + br.w &&
          y + CFG.ballR > br.y && y - CFG.ballR < br.y + br.h) return br;
    }
    return null;
  }

  function breakBrick(br, b) {
    br.alive = false;
    const band = BANDS[br.band];
    score += band.points;
    Sfx.brick();
    spawnDebris(br, band.col);

    if (!spedOrange && band.name === 'orange') { spedOrange = true; speedUp(); }
    if (!spedRed && band.name === 'red') { spedRed = true; speedUp(); }

    if (mode === 'modern' && Math.random() < 0.07) {
      const kind = pick(Object.keys(DROPS));
      drops.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, kind });
    }

    updateHud();
    if (!bricks.some((q) => q.alive)) clearScreen();
  }

  function spawnDebris(br, col) {
    for (let i = 0; i < 7; i++) {
      particles.push({
        x: br.x + Math.random() * br.w, y: br.y + Math.random() * br.h,
        vx: (Math.random() - 0.5) * 180, vy: -40 - Math.random() * 140,
        life: 0.35 + Math.random() * 0.3, max: 0.65,
        size: 2 + Math.random() * 3, col
      });
    }
  }

  function applyDrop(kind) {
    Sfx.pickup();
    if (kind === 'wide') { paddle.w = baseWidth() * 1.6; widenUntil = performance.now() + 12000; }
    if (kind === 'life') { lives++; }
    if (kind === 'slow') {
      for (const b of balls) {
        b.speed = Math.max(CFG.ballStart * 0.8, b.speed * 0.8);
        const m = Math.hypot(b.vx, b.vy) || 1;
        b.vx = b.vx / m * b.speed; b.vy = b.vy / m * b.speed;
      }
    }
    if (kind === 'multi') {
      const src = balls[0];
      if (src) {
        for (const off of [-0.5, 0.5]) {
          const ang = Math.atan2(src.vy, src.vx) + off;
          balls.push(newBall(src.x, src.y, src.speed, ang));
        }
      }
    }
    Shell.banner({ wide: 'Wider paddle', multi: 'Extra balls', slow: 'Slower ball', life: 'Extra life' }[kind]);
    updateHud();
  }

  function clearScreen() {
    if (screen >= CFG.screens) { finish(true); return; }
    screen++;
    Shell.banner('Screen ' + screen);
    buildBricks();
    drops = [];
    serve();
    updateHud();
  }

  function loseLife() {
    lives--;
    Sfx.die();
    drops = [];
    if (lives <= 0) { finish(false); return; }
    paddle.w = baseWidth();
    widenUntil = 0;
    serve();
    updateHud();
  }

  function finish(won) {
    state = won ? 'won' : 'over';
    const res = Scores.submit('bricks', score, { variant: mode });
    Shell.gameOverCard({
      title: won ? 'Both screens cleared' : 'Out of lives',
      scoreLabel: 'Score',
      score: score,
      isNew: res.isNew && res.previous !== null,
      best: Scores.label('bricks', mode),
      extra: `<p class="tag" style="margin-top:8px">${
        won && score === 896 ? 'A perfect 896. Nothing left to take.' : 'A perfect game is 896.'}</p>`,
      buttons: [{ label: 'Play again', act: 'again', primary: true }, { label: 'Menu', act: 'menu' }]
    });
  }

  function updateHud() {
    Shell.readouts([
      { label: 'Score', value: score || 0, accent: true },
      { label: 'Lives', value: lives || 0 },
      { label: 'Screen', value: (screen || 1) + '/' + CFG.screens },
      { label: 'Best', value: Scores.label('bricks', mode) }
    ]);
    Shell.status(score || 0, mode === 'classic' ? 'classic rules' : 'with power-ups');
  }

  /* ---------- input ---------- */

  Touch.mount(Shell.els.touchpad, { dpad: true, axis: 'x', action: 'GO' });
  Touch.drag(Shell.els.stageWrap, (nx) => {
    if (state === 'menu') return;
    paddle.x = clamp(nx * W, paddle.w / 2, W - paddle.w / 2);
  });

  Shell.canvas.addEventListener('pointermove', (e) => {
    if (state === 'menu' || e.pointerType === 'touch') return;
    const p = Touch.canvasPos(Shell.canvas, e);
    paddle.x = clamp(p.x, paddle.w / 2, W - paddle.w / 2);
  });
  Shell.canvas.addEventListener('pointerdown', () => launch());

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); launch(); }
    if (e.code === 'KeyR' && state !== 'menu') start();
  });

  /* ---------- drawing ---------- */

  function draw() {
    ctx.fillStyle = '#151b2a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#111624';
    ctx.fillRect(0, CFG.brickTop - 10, W, CFG.rows * (CFG.brickH + CFG.brickGap) + 20);

    for (const br of bricks) {
      if (!br.alive) continue;
      const band = BANDS[br.band];
      const g = ctx.createLinearGradient(br.x, br.y, br.x, br.y + br.h);
      g.addColorStop(0, band.light);
      g.addColorStop(1, band.col);
      ctx.fillStyle = g;
      roundRect(ctx, br.x, br.y, br.w, br.h, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.2)';
      ctx.fillRect(br.x + 2, br.y + 2, br.w - 4, 3);
    }

    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const d of drops) {
      const info = DROPS[d.kind];
      ctx.fillStyle = info.col;
      roundRect(ctx, d.x - 11, d.y - 8, 22, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#10141f';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(info.label, d.x, d.y + 1);
    }

    // Paddle.
    const pg = ctx.createLinearGradient(0, CFG.paddleY, 0, CFG.paddleY + CFG.paddleH);
    pg.addColorStop(0, '#7fc4ff');
    pg.addColorStop(1, '#2f7fd0');
    ctx.fillStyle = pg;
    roundRect(ctx, paddle.x - paddle.w / 2, CFG.paddleY, paddle.w, CFG.paddleH, 6);
    ctx.fill();

    for (const b of balls) {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(255,176,46,.9)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(b.x, b.y, CFG.ballR, 0, 6.283);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (state === 'serve') {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Click or press space to launch', W / 2, CFG.paddleY - 60);
    }

    // Lives, drawn as little balls.
    for (let i = 0; i < Math.min(lives || 0, 8); i++) {
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.arc(16 + i * 16, H - 14, 5, 0, 6.283);
      ctx.fill();
    }
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    buildBricks();
    balls = [];
    drops = [];
    particles = [];
    paddle = { x: W / 2, w: CFG.paddleW };
    lives = CFG.lives; score = 0; screen = 1;
    Shell.status('', '');
    Shell.readouts([
      { label: 'Best classic', value: Scores.label('bricks', 'classic') },
      { label: 'Best modern', value: Scores.label('bricks', 'modern') }
    ]);
    Shell.startCard({
      blurb: 'Clear eight rows without dropping the ball.',
      extra: `<div class="rowBetween"><span>Rules</span><div class="seg">
        <button data-act="mode" data-m="classic" class="${mode === 'classic' ? 'on' : ''}">Classic</button>
        <button data-act="mode" data-m="modern" class="${mode === 'modern' ? 'on' : ''}">Power-ups</button>
      </div></div>
      <div class="rowBetween"><span>Scoring</span><b style="color:var(--text)">yellow 1, green 3, orange 5, red 7</b></div>`,
      buttons: [{ label: 'Play', act: 'again', primary: true }]
    });
  }

  Shell.on({
    again: () => start(),
    menu: () => showMenu(),
    mode: (el) => { mode = el.dataset.m; showMenu(); }
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyBricks = {
    get state() { return state; },
    get score() { return score; },
    get lives() { return lives; },
    get hits() { return hits; },
    get halved() { return halved; },
    balls: () => balls, bricks: () => bricks, paddle: () => paddle,
    start, update, launch, serve,
    setMode(m) { mode = m; },
    aliveCount: () => bricks.filter((b) => b.alive).length,
    perfectScore: () => BANDS.reduce((a, b) => a + b.points * CFG.cols, 0) * CFG.screens,
    cfg: CFG, bands: BANDS
  };
})();
