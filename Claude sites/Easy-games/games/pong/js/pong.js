'use strict';

/* Easy Pong.

   Two details make it play well rather than merely work:

   - The bounce angle comes from WHERE on the paddle the ball lands, not from a
     plain angle of incidence. Without that you cannot aim, and the game is dull.
   - The ball is stepped in small increments. At full speed it covers 13px per
     frame while the paddle is only 12px thick, so a single big step would let it
     tunnel straight through.

   The CPU is deliberately imperfect. It predicts the intercept, then waits a
   reaction delay and aims at a point that is a little off. A perfect tracker is
   unbeatable and no fun. */

(function () {
  const W = 840, H = 520;

  const CFG = {
    paddleW: 13, paddleH: 84, paddleSpeed: 430,
    ballR: 8,
    ballStart: 310, ballGain: 22, ballMax: 760,
    maxBounceAngle: 1.05,       // radians off horizontal at the paddle edge
    serveDelay: 700,
    target: 11
  };

  const LEVELS = {
    easy:   { react: 230, error: 34, speed: 330, label: 'Easy' },
    normal: { react: 145, error: 20, speed: 400, label: 'Normal' },
    hard:   { react: 80,  error: 8,  speed: 470, label: 'Hard' }
  };

  let mode = 'cpu';            // cpu | duel
  let level = 'normal';
  let state = 'menu';          // menu | serve | play | over
  let serveTimer = 0, serveDir = 1;
  let ball, left, right, winner = null;
  let rally = 0, bestRally = 0;
  let trail = [];

  Shell.mount({
    name: 'Pong',
    width: W, height: H, max: 840, pad: 240,
    tools: ['sound', 'pause', 'help'],
    foot: 'Left paddle <b>W</b> and <b>S</b> &middot; right paddle <b>up</b> and <b>down</b> &middot; drag on a phone',
    rules: `
      <ul>
        <li>Keep the ball out of your goal. First to ${CFG.target}, and you must win by two.</li>
        <li>The angle it comes off your paddle depends on <b>where</b> it hits. Catch it near
            an edge to send it away steeply, hit it flat in the middle to keep it fast and low.</li>
        <li>Every paddle hit speeds the ball up a little, so long rallies get frantic.</li>
      </ul>
      <p>The CPU is not a perfect tracker. It has a reaction delay and aims slightly
         off, and both get tighter as you raise the difficulty.</p>`
  });

  Input.init();
  Input.claim(['KeyW', 'KeyS', 'KeyR']);
  const ctx = Shell.ctx;

  /* ---------- setup ---------- */

  function makePaddle(x, isCpu) {
    return { x, y: H / 2, vy: 0, score: 0, isCpu, aim: H / 2, nextThink: 0, flash: 0 };
  }

  function start() {
    left = makePaddle(38, false);
    right = makePaddle(W - 38 - CFG.paddleW, mode === 'cpu');
    ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: CFG.ballStart };
    rally = 0; bestRally = 0; winner = null;
    trail = [];
    serveDir = Math.random() < 0.5 ? -1 : 1;
    serve();
    state = 'serve';
    Shell.hide();
    updateHud();
  }

  function serve() {
    ball.x = W / 2;
    ball.y = H / 2 + (Math.random() - 0.5) * H * 0.3;
    ball.speed = CFG.ballStart;
    const ang = (Math.random() - 0.5) * 0.5;
    ball.vx = Math.cos(ang) * ball.speed * serveDir;
    ball.vy = Math.sin(ang) * ball.speed;
    rally = 0;
    serveTimer = CFG.serveDelay;
    state = 'serve';
    trail = [];
  }

  /* ---------- simulation ---------- */

  function update(dt) {
    if (state === 'serve') {
      serveTimer -= dt * 1000;
      movePaddles(dt);
      if (serveTimer <= 0) state = 'play';
      return;
    }
    if (state !== 'play') return;

    movePaddles(dt);

    // Step the ball in slices no larger than a few pixels so it cannot tunnel.
    let remaining = dt;
    while (remaining > 0) {
      const step = Math.min(remaining, 4 / Math.max(1, Math.hypot(ball.vx, ball.vy)));
      remaining -= step;
      stepBall(step);
      if (state !== 'play') return;
    }

    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 12) trail.shift();

    left.flash = Math.max(0, left.flash - dt * 4);
    right.flash = Math.max(0, right.flash - dt * 4);
  }

  function stepBall(dt) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y - CFG.ballR < 0 && ball.vy < 0) { ball.y = CFG.ballR; ball.vy = -ball.vy; Sfx.tick(false); }
    if (ball.y + CFG.ballR > H && ball.vy > 0) { ball.y = H - CFG.ballR; ball.vy = -ball.vy; Sfx.tick(false); }

    hitPaddle(left, 1);
    hitPaddle(right, -1);

    if (ball.x + CFG.ballR < 0) point(right);
    else if (ball.x - CFG.ballR > W) point(left);
  }

  function hitPaddle(p, dir) {
    // dir is the direction the ball should travel after the hit.
    if (dir > 0 && ball.vx >= 0) return;
    if (dir < 0 && ball.vx <= 0) return;
    const nearX = dir > 0 ? p.x + CFG.paddleW : p.x;
    const withinX = dir > 0
      ? (ball.x - CFG.ballR <= nearX && ball.x >= p.x - CFG.ballR)
      : (ball.x + CFG.ballR >= nearX && ball.x <= p.x + CFG.paddleW + CFG.ballR);
    if (!withinX) return;
    const half = CFG.paddleH / 2;
    if (ball.y < p.y - half - CFG.ballR || ball.y > p.y + half + CFG.ballR) return;

    // Where on the paddle it landed, from -1 at the top edge to +1 at the bottom.
    const offset = clamp((ball.y - p.y) / half, -1, 1);
    const angle = offset * CFG.maxBounceAngle;
    ball.speed = Math.min(CFG.ballMax, ball.speed + CFG.ballGain);
    ball.vx = Math.cos(angle) * ball.speed * dir;
    ball.vy = Math.sin(angle) * ball.speed;
    ball.x = dir > 0 ? nearX + CFG.ballR + 0.5 : nearX - CFG.ballR - 0.5;

    p.flash = 1;
    rally++;
    bestRally = Math.max(bestRally, rally);
    Sfx.place();
    updateHud();
  }

  function point(scorer) {
    scorer.score++;
    Sfx.die();
    serveDir = scorer === left ? 1 : -1;
    updateHud();
    const other = scorer === left ? right : left;
    if (scorer.score >= CFG.target && scorer.score - other.score >= 2) { over(scorer); return; }
    serve();
  }

  function over(win) {
    winner = win;
    state = 'over';
    Sfx.win();
    const human = mode === 'cpu' ? left : null;
    const title = mode === 'cpu'
      ? (win === left ? 'You win' : 'The CPU wins')
      : (win === left ? 'Left player wins' : 'Right player wins');
    if (human && win === human) Scores.submit('pong', bestRally, { variant: level });
    Shell.gameOverCard({
      title,
      scoreLabel: 'Final score',
      score: left.score + ' - ' + right.score,
      extra: `<p class="tag" style="margin-top:8px">Longest rally ${bestRally} hits</p>`,
      best: mode === 'cpu' ? Scores.label('pong', level) + ' hit rally' : null,
      buttons: [{ label: 'Play again', act: 'again', primary: true }, { label: 'Menu', act: 'menu' }]
    });
  }

  /* ---------- paddles ---------- */

  function movePaddles(dt) {
    const half = CFG.paddleH / 2;

    // Left paddle: W and S, plus arrows when there is no second human.
    let ld = 0;
    if (Input.held('KeyW')) ld -= 1;
    if (Input.held('KeyS')) ld += 1;
    if (mode === 'cpu') {
      if (Input.held('ArrowUp')) ld -= 1;
      if (Input.held('ArrowDown')) ld += 1;
      if (Touch.dir.dy) ld = Touch.dir.dy;
    }
    left.y = clamp(left.y + ld * CFG.paddleSpeed * dt, half, H - half);

    if (right.isCpu) cpuMove(dt);
    else {
      let rd = 0;
      if (Input.held('ArrowUp')) rd -= 1;
      if (Input.held('ArrowDown')) rd += 1;
      right.y = clamp(right.y + rd * CFG.paddleSpeed * dt, half, H - half);
    }
  }

  /** Predict where the ball crosses the paddle plane, bouncing off the walls. */
  function predictY(fromX, fromY, vx, vy, targetX) {
    if (vx === 0) return fromY;
    const t = (targetX - fromX) / vx;
    if (t <= 0) return H / 2;
    let y = fromY + vy * t;
    // Reflect into the range 0..H, which is what bouncing off the walls does.
    const span = H * 2;
    y = ((y % span) + span) % span;
    return y > H ? span - y : y;
  }

  function cpuMove(dt) {
    const lv = LEVELS[level];
    const half = CFG.paddleH / 2;
    const now = performance.now();

    if (now >= right.nextThink) {
      right.nextThink = now + lv.react;
      if (ball.vx > 0) {
        right.aim = predictY(ball.x, ball.y, ball.vx, ball.vy, right.x) + (Math.random() - 0.5) * 2 * lv.error;
      } else {
        right.aim = H / 2 + (Math.random() - 0.5) * 60;    // drift home while the ball is away
      }
    }

    const diff = right.aim - right.y;
    const dead = 6;
    const dir = Math.abs(diff) < dead ? 0 : Math.sign(diff);
    right.y = clamp(right.y + dir * lv.speed * dt, half, H - half);
  }

  /* ---------- touch ---------- */

  Touch.mount(Shell.els.touchpad, { dpad: true, axis: 'y' });
  Touch.drag(Shell.els.stageWrap, (nx, ny) => {
    if (state === 'menu') return;
    const half = CFG.paddleH / 2;
    const y = clamp(ny * H, half, H - half);
    if (nx < 0.5 || mode === 'cpu') left.y = y;
    else right.y = y;
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && state !== 'menu') start();
  });

  /* ---------- drawing ---------- */

  function draw() {
    ctx.fillStyle = '#141a29';
    ctx.fillRect(0, 0, W, H);

    // Centre line.
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 16]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Big background score, the way the original showed it.
    ctx.fillStyle = 'rgba(255,255,255,.055)';
    ctx.font = '800 130px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(left.score, W * 0.28, H * 0.28);
    ctx.fillText(right.score, W * 0.72, H * 0.28);

    for (let i = 0; i < trail.length; i++) {
      const t = i / trail.length;
      ctx.globalAlpha = t * 0.35;
      ctx.fillStyle = '#ffb02e';
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, CFG.ballR * (0.3 + t * 0.7), 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawPaddle(left, '#4da3ff');
    drawPaddle(right, right.isCpu ? '#ff5470' : '#4ad46f');

    // Ball.
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(255,176,46,.9)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, CFG.ballR, 0, 6.283);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (state === 'serve') {
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.font = '600 20px system-ui, sans-serif';
      ctx.fillText('Serving...', W / 2, H * 0.72);
    }
  }

  function drawPaddle(p, col) {
    const half = CFG.paddleH / 2;
    ctx.fillStyle = col;
    if (p.flash > 0) {
      ctx.shadowColor = col;
      ctx.shadowBlur = 26 * p.flash;
    }
    roundRect(ctx, p.x, p.y - half, CFG.paddleW, CFG.paddleH, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    roundRect(ctx, p.x + 3, p.y - half + 4, CFG.paddleW - 6, CFG.paddleH * 0.22, 3);
    ctx.fill();
  }

  function updateHud() {
    Shell.readouts([
      { label: mode === 'cpu' ? 'You' : 'Left', value: left ? left.score : 0, accent: true },
      { label: mode === 'cpu' ? 'CPU' : 'Right', value: right ? right.score : 0 },
      { label: 'Rally', value: rally },
      { label: 'Best rally', value: bestRally }
    ]);
    Shell.status((left ? left.score : 0) + ' - ' + (right ? right.score : 0),
      mode === 'cpu' ? 'vs CPU ' + LEVELS[level].label : 'two players');
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    left = makePaddle(38, false);
    right = makePaddle(W - 38 - CFG.paddleW, true);
    ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: 0 };
    trail = [];
    Shell.status('', '');
    Shell.readouts([{ label: 'Best rally vs CPU', value: Scores.label('pong', level) }]);
    Shell.startCard({
      blurb: 'Keep it out of your goal. First to ' + CFG.target + ', win by two.',
      extra: `
        <div class="rowBetween"><span>Opponent</span><div class="seg">
          <button data-act="mode" data-m="cpu" class="${mode === 'cpu' ? 'on' : ''}">CPU</button>
          <button data-act="mode" data-m="duel" class="${mode === 'duel' ? 'on' : ''}">Two players</button>
        </div></div>
        ${mode === 'cpu' ? `<div class="rowBetween"><span>Difficulty</span><div class="seg">${
          Object.keys(LEVELS).map((k) => `<button data-act="level" data-k="${k}" class="${level === k ? 'on' : ''}">${LEVELS[k].label}</button>`).join('')
        }</div></div>` : '<div class="rowBetween"><span>Left player</span><b style="color:var(--text)">W and S</b></div>'}
        <div class="rowBetween"><span>Right player</span><b style="color:var(--text)">${mode === 'cpu' ? 'CPU' : 'Up and Down'}</b></div>`,
      buttons: [{ label: 'Play', act: 'again', primary: true }]
    });
  }

  Shell.on({
    again: () => start(),
    menu: () => showMenu(),
    mode: (el) => { mode = el.dataset.m; showMenu(); },
    level: (el) => { level = el.dataset.k; showMenu(); }
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyPong = {
    get state() { return state; },
    ball: () => ball, left: () => left, right: () => right,
    start, update, predictY, serve,
    setMode(m, l) { mode = m; if (l) level = l; },
    force(b) { Object.assign(ball, b); state = 'play'; },
    cfg: CFG
  };
})();
