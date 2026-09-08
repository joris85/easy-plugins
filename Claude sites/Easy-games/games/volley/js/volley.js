'use strict';

/* Easy Volley.

   Each player is a semicircle, which is the whole joke and also the whole
   mechanic: because the surface is curved, where the ball strikes you decides
   where it goes. A flat paddle would make this dull. A fraction of your own
   movement is added on contact, so running into the ball drives it harder than
   standing still.

   The fiddly part is the net. A bare rectangle gives ugly corner bounces that
   read as bugs, so the top of the net is a rounded cap handled as a circle. */

(function () {
  const W = 800, H = 440;
  const GROUND = 396;

  const CFG = {
    gravity: 1400,
    playerR: 40,
    speed: 330,
    jump: 640,
    ballR: 12,
    ballGravity: 1150,
    maxBall: 900,
    transfer: 0.35,
    playerBounce: 0.93,     // just under 1, so a rally cannot last forever
    minLaunch: 150,        // below this incoming speed the ball is not re-launched
    wallBounce: 0.96,
    netW: 12, netH: 96,
    serveHeight: 250,
    serveHold: 650,
    target: 11
  };

  const SIDES = [
    { name: 'Left',  col: '#4da3ff', dark: '#1d61b8', light: '#a5d2ff' },
    { name: 'Right', col: '#ff4d5e', dark: '#c02637', light: '#ff8b96' }
  ];

  let mode = 'duel';            // duel | cpu
  let state = 'menu';           // menu | serve | play | over
  let players, ball, serveTimer, server, rally, bestRally;
  let particles = [];

  Shell.mount({
    name: 'Volley',
    width: W, height: H, max: 800, pad: 250,
    tools: ['sound', 'pause', 'help'],
    foot: 'Left player <b>A</b> <b>D</b> and <b>W</b> &middot; right player <b>arrows</b> &middot; first to ' + 11,
    rules: `
      <ul>
        <li>Do not let the ball land on your side. First to ${CFG.target} wins.</li>
        <li>You are a semicircle, so <b>where</b> the ball hits you decides the angle.
            Catch it off your shoulder to send it long, off the top to send it high.</li>
        <li>Running into the ball adds some of your own speed to it. Standing still
            gives a soft return.</li>
        <li>You cannot cross the net, and neither can the ball go through it.</li>
        <li>Whoever lost the last point serves the next one.</li>
      </ul>`
  });

  Input.init();
  Input.claim(['KeyA', 'KeyD', 'KeyW', 'KeyR']);
  const ctx = Shell.ctx;

  const netX = W / 2;
  const netTop = GROUND - CFG.netH;

  /* ---------- setup ---------- */

  function makePlayer(i) {
    const homeX = i === 0 ? W * 0.25 : W * 0.75;
    return {
      i, side: SIDES[i], x: homeX, y: GROUND, vx: 0, vy: 0,
      onGround: true, score: 0, isCpu: i === 1 && mode === 'cpu',
      think: 0, aim: homeX
    };
  }

  function start() {
    players = [makePlayer(0), makePlayer(1)];
    rally = 0; bestRally = 0;
    particles = [];
    server = Math.random() < 0.5 ? 0 : 1;
    serve();
    Shell.hide();
    updateHud();
  }

  function serve() {
    const p = players[server];
    ball = {
      x: p.x, y: GROUND - CFG.serveHeight,
      vx: 0, vy: 0, held: true
    };
    serveTimer = CFG.serveHold;
    rally = 0;
    state = 'serve';
  }

  /* ---------- simulation ---------- */

  function update(dt) {
    if (state !== 'play' && state !== 'serve') return;

    if (state === 'serve') {
      serveTimer -= dt * 1000;
      if (serveTimer <= 0) { ball.held = false; state = 'play'; }
    }

    for (const p of players) movePlayer(p, dt);

    if (!ball.held) {
      let remaining = dt;
      while (remaining > 0) {
        const step = Math.min(remaining, 3 / Math.max(1, Math.hypot(ball.vx, ball.vy)));
        remaining -= step;
        stepBall(step);
        if (state !== 'play') break;
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.life -= dt;
      if (q.life <= 0) { particles.splice(i, 1); continue; }
      q.vy += 900 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
  }

  function movePlayer(p, dt) {
    let d = 0, jump = false;
    if (p.isCpu) {
      const c = cpuIntent(p);
      d = c.dir; jump = c.jump;
    } else if (p.i === 0) {
      if (Input.held('KeyA')) d -= 1;
      if (Input.held('KeyD')) d += 1;
      jump = Input.held('KeyW');
      if (Touch.dir.dx) d = Touch.dir.dx;
      if (Touch.held.a) jump = true;
    } else {
      if (Input.held('ArrowLeft')) d -= 1;
      if (Input.held('ArrowRight')) d += 1;
      jump = Input.held('ArrowUp');
    }

    p.vx = d * CFG.speed;
    p.x += p.vx * dt;

    // Each player is locked to their own half, and cannot clip the net.
    const lo = p.i === 0 ? CFG.playerR : netX + CFG.netW / 2 + CFG.playerR;
    const hi = p.i === 0 ? netX - CFG.netW / 2 - CFG.playerR : W - CFG.playerR;
    p.x = clamp(p.x, lo, hi);

    if (jump && p.onGround) { p.vy = -CFG.jump; p.onGround = false; Sfx.tick(false); }
    if (!p.onGround) {
      p.vy += CFG.gravity * dt;
      p.y += p.vy * dt;
      if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
    }
  }

  function stepBall(dt) {
    ball.vy += CFG.ballGravity * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Side walls.
    if (ball.x - CFG.ballR < 0) { ball.x = CFG.ballR; ball.vx = -ball.vx * CFG.wallBounce; Sfx.tick(false); }
    if (ball.x + CFG.ballR > W) { ball.x = W - CFG.ballR; ball.vx = -ball.vx * CFG.wallBounce; Sfx.tick(false); }
    if (ball.y - CFG.ballR < 0) { ball.y = CFG.ballR; ball.vy = Math.abs(ball.vy) * CFG.wallBounce; }

    hitNet();
    for (const p of players) hitPlayer(p);

    if (ball.y + CFG.ballR >= GROUND) {
      ball.y = GROUND - CFG.ballR;
      point(ball.x < netX ? 1 : 0);
    }
  }

  /** The net is a rectangle with a rounded cap, so the top does not bounce oddly. */
  function hitNet() {
    const halfW = CFG.netW / 2;
    const capR = halfW + CFG.ballR;

    // Cap first: treat the top of the net as a circle.
    const dx = ball.x - netX, dy = ball.y - netTop;
    if (dy < 0 && Math.hypot(dx, dy) < capR) {
      const d = Math.hypot(dx, dy) || 0.001;
      const nx = dx / d, ny = dy / d;
      ball.x = netX + nx * capR;
      ball.y = netTop + ny * capR;
      const dot = ball.vx * nx + ball.vy * ny;
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;
      ball.vx *= 0.92; ball.vy *= 0.92;
      Sfx.kick();
      return;
    }

    // Body of the net.
    if (ball.y > netTop && ball.y < GROUND &&
        Math.abs(ball.x - netX) < halfW + CFG.ballR) {
      ball.x = ball.x < netX ? netX - halfW - CFG.ballR : netX + halfW + CFG.ballR;
      ball.vx = -ball.vx * 0.86;
      Sfx.kick();
    }
  }

  function hitPlayer(p) {
    const dx = ball.x - p.x, dy = ball.y - p.y;
    const d = Math.hypot(dx, dy);
    const minD = CFG.playerR + CFG.ballR;
    // Only the upper half of the blob exists.
    if (d >= minD || dy > 0) return;

    const nx = dx / (d || 0.001), ny = dy / (d || 0.001);
    ball.x = p.x + nx * minD;
    ball.y = p.y + ny * minD;

    const incoming = Math.hypot(ball.vx, ball.vy);

    const dot = ball.vx * nx + ball.vy * ny;
    ball.vx -= 2 * dot * nx;
    ball.vy -= 2 * dot * ny;

    // Just under a perfect bounce. With restitution of exactly 1 a ball dropped
    // dead centre onto a motionless blob bounces to the same height forever and
    // the rally never ends.
    ball.vx *= CFG.playerBounce;
    ball.vy *= CFG.playerBounce;

    // A share of the player's own motion goes into the ball.
    ball.vx += p.vx * CFG.transfer;
    ball.vy += p.vy * CFG.transfer;

    // A touch of sideways scatter, so a perfectly vertical bounce cannot persist.
    ball.vx += (Math.random() - 0.5) * 26;

    // Give a real hit some lift, but never re-launch a ball that has run out of
    // energy, or it would sit on top of a blob bouncing indefinitely.
    if (incoming > CFG.minLaunch && ball.vy > -140) ball.vy = -140 - Math.random() * 50;

    const sp = Math.hypot(ball.vx, ball.vy);
    if (sp > CFG.maxBall) { ball.vx = ball.vx / sp * CFG.maxBall; ball.vy = ball.vy / sp * CFG.maxBall; }

    rally++;
    bestRally = Math.max(bestRally, rally);
    Sfx.place();
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: ball.x, y: ball.y,
        vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 120,
        life: 0.3, max: 0.3, size: 2 + Math.random() * 2, col: p.side.light
      });
    }
    updateHud();
  }

  function point(winner) {
    players[winner].score++;
    server = 1 - winner;
    Sfx.die();
    for (let i = 0; i < 14; i++) {
      particles.push({
        x: ball.x, y: GROUND, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 260,
        life: 0.4 + Math.random() * 0.3, max: 0.7, size: 2 + Math.random() * 3, col: '#8f9cba'
      });
    }
    updateHud();
    const other = players[1 - winner];
    if (players[winner].score >= CFG.target && players[winner].score - other.score >= 2) {
      over(players[winner]);
    } else {
      serve();
    }
  }

  function over(winner) {
    state = 'over';
    Sfx.win();
    if (mode === 'cpu' && winner.i === 0) Scores.submit('volley', bestRally);
    Shell.gameOverCard({
      title: mode === 'cpu'
        ? (winner.i === 0 ? 'You win' : 'The CPU wins')
        : winner.side.name + ' player wins',
      scoreLabel: 'Final score',
      score: players[0].score + ' - ' + players[1].score,
      extra: `<p class="tag" style="margin-top:8px">Longest rally ${bestRally} touches</p>`,
      best: mode === 'cpu' ? Scores.label('volley') + ' touch rally' : null,
      buttons: [{ label: 'Play again', act: 'again', primary: true }, { label: 'Menu', act: 'menu' }]
    });
  }

  /* ---------- cpu ---------- */

  function cpuIntent(p) {
    // Where will the ball cross this player's height, if it is coming our way?
    let targetX = W * 0.75;
    let jump = false;

    if (ball.vx > 0 || ball.x > netX) {
      // Project the ball forward under gravity until it drops to blob height.
      let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy;
      const dt = 1 / 120;
      let guard = 0;
      while (y < GROUND - CFG.playerR && guard++ < 400) {
        vy += CFG.ballGravity * dt;
        x += vx * dt;
        y += vy * dt;
        if (x < netX + CFG.netW / 2) { x = netX + CFG.netW / 2; vx = -vx; }
        if (x > W) { x = W; vx = -vx; }
      }
      targetX = clamp(x, netX + CFG.netW / 2 + CFG.playerR, W - CFG.playerR);
      const near = Math.abs(ball.x - p.x) < 110 && ball.y < GROUND - 90 && ball.y > 60;
      jump = near && ball.vy > -50;
    }

    const diff = targetX - p.x;
    return { dir: Math.abs(diff) < 8 ? 0 : Math.sign(diff), jump };
  }

  /* ---------- drawing ---------- */

  function draw() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#1b2540');
    sky.addColorStop(1, '#243050');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GROUND);

    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    for (let x = 0; x < W; x += 26) ctx.fillRect(x, GROUND, 13, H - GROUND);

    // Net.
    ctx.fillStyle = '#e8edfa';
    roundRect(ctx, netX - CFG.netW / 2, netTop, CFG.netW, CFG.netH, CFG.netW / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 1;
    for (let y = netTop + 8; y < GROUND; y += 10) {
      ctx.beginPath();
      ctx.moveTo(netX - CFG.netW / 2, y);
      ctx.lineTo(netX + CFG.netW / 2, y);
      ctx.stroke();
    }

    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    if (players) for (const p of players) drawBlob(p);
    if (ball) drawBall();

    // Scores, painted large on the sky.
    if (players) {
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.font = '800 88px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(players[0].score, W * 0.25, 90);
      ctx.fillText(players[1].score, W * 0.75, 90);
    }

    if (state === 'serve') {
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.font = '600 17px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(SIDES[server].name + ' serves', W / 2, 190);
    }
  }

  function drawBlob(p) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(p.x, GROUND + 4, CFG.playerR * 0.9, 7, 0, 0, 6.283);
    ctx.fill();

    const g = ctx.createLinearGradient(p.x, p.y - CFG.playerR, p.x, p.y);
    g.addColorStop(0, p.side.light);
    g.addColorStop(0.6, p.side.col);
    g.addColorStop(1, p.side.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, CFG.playerR, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // Eye, looking at the ball.
    const ex = p.x + (p.i === 0 ? 12 : -12);
    const ey = p.y - CFG.playerR * 0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex, ey, 9, 0, 6.283);
    ctx.fill();
    let lx = 0, ly = 0;
    if (ball) {
      const d = Math.hypot(ball.x - ex, ball.y - ey) || 1;
      lx = (ball.x - ex) / d * 3.5;
      ly = (ball.y - ey) / d * 3.5;
    }
    ctx.fillStyle = '#151a26';
    ctx.beginPath();
    ctx.arc(ex + lx, ey + ly, 4.2, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }

  function drawBall() {
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath();
    ctx.ellipse(ball.x, GROUND + 3, CFG.ballR * 0.8, 5, 0, 0, 6.283);
    ctx.fill();

    const g = ctx.createRadialGradient(ball.x - 4, ball.y - 5, 2, ball.x, ball.y, CFG.ballR);
    g.addColorStop(0, '#fff6d8');
    g.addColorStop(1, '#f0b429');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, CFG.ballR, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,0,.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, CFG.ballR * 0.6, -0.6, 2.2);
    ctx.stroke();
  }

  function updateHud() {
    Shell.readouts([
      { label: mode === 'cpu' ? 'You' : 'Left', value: players ? players[0].score : 0, accent: true },
      { label: mode === 'cpu' ? 'CPU' : 'Right', value: players ? players[1].score : 0 },
      { label: 'Rally', value: rally || 0 },
      { label: 'Best rally', value: bestRally || 0 }
    ]);
    Shell.status((players ? players[0].score : 0) + ' - ' + (players ? players[1].score : 0),
      mode === 'cpu' ? 'vs CPU' : 'two players');
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    players = [makePlayer(0), makePlayer(1)];
    ball = { x: W / 2, y: 120, vx: 0, vy: 0, held: true };
    particles = [];
    Shell.status('', '');
    Shell.readouts([{ label: 'Best rally vs CPU', value: Scores.label('volley') }]);
    Shell.startCard({
      blurb: 'Two semicircles, one net, physics that owe nothing to volleyball.',
      extra: `<div class="rowBetween"><span>Opponent</span><div class="seg">
          <button data-act="mode" data-m="duel" class="${mode === 'duel' ? 'on' : ''}">Two players</button>
          <button data-act="mode" data-m="cpu" class="${mode === 'cpu' ? 'on' : ''}">CPU</button>
        </div></div>
        <div class="rowBetween"><span>Left player</span><b style="color:var(--text)">A D and W</b></div>
        <div class="rowBetween"><span>Right player</span><b style="color:var(--text)">${mode === 'cpu' ? 'CPU' : 'Arrow keys'}</b></div>`,
      buttons: [{ label: 'Play', act: 'again', primary: true }]
    });
  }

  Shell.on({
    again: () => start(),
    menu: () => showMenu(),
    mode: (el) => { mode = el.dataset.m; showMenu(); }
  });

  Touch.mount(Shell.els.touchpad, { dpad: true, axis: 'x', action: 'JUMP' });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && state !== 'menu') start();
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyVolley = {
    get state() { return state; },
    players: () => players, ball: () => ball,
    start, update, serve, point,
    setMode(m) { mode = m; },
    force(b) { Object.assign(ball, b); ball.held = false; state = 'play'; },
    cfg: CFG, ground: GROUND, netX, netTop
  };
})();
