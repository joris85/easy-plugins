'use strict';

/* Easy Puck, air hockey.

   The single most common bug in air hockey clones is tunnelling. At full speed
   the puck covers roughly 18 pixels per frame while a mallet is 60 across, so a
   frame-sized step can put it through a mallet or a wall without ever
   overlapping. Everything here runs on a fixed 4 millisecond internal step,
   independent of the frame rate.

   The second thing that matters is that a smash feels like a smash: the mallet's
   own velocity is added to the puck on contact, so shoving into it drives it
   much harder than letting it hit a stationary mallet. */

(function () {
  const W = 600, H = 900;
  const SUB = 0.004;                 // fixed physics step, seconds

  const CFG = {
    puckR: 16,
    puckFriction: 0.28,              // per second, gentle
    puckMax: 1150,
    malletR: 30,
    malletSpeed: 540,
    wallBounce: 0.94,
    transfer: 0.62,
    goalMouth: 200,
    target: 7,
    serveDelay: 700
  };

  const SIDES = [
    { name: 'Blue', col: '#4da3ff', dark: '#1d61b8', light: '#a5d2ff' },   // bottom, player 1
    { name: 'Red',  col: '#ff4d5e', dark: '#c02637', light: '#ff8b96' }    // top, player 2 or CPU
  ];

  const LEVELS = {
    easy:   { react: 190, error: 60, speed: 330, aggression: 0.45, label: 'Easy' },
    normal: { react: 110, error: 34, speed: 430, aggression: 0.7,  label: 'Normal' },
    hard:   { react: 60,  error: 14, speed: 520, aggression: 0.9,  label: 'Hard' }
  };

  let mode = 'duel';                 // duel | cpu
  let level = 'normal';
  let state = 'menu';                // menu | serve | play | over
  let puck, mallets, serveTimer, serveTo, trail = [], particles = [];
  let lastGoal = 0;

  Shell.mount({
    name: 'Puck',
    width: W, height: H, max: 520, pad: 210,
    tools: ['sound', 'pause', 'help'],
    foot: 'Bottom <b>W A S D</b> &middot; top <b>arrow keys</b> &middot; on a tablet each player drags with a thumb',
    rules: `
      <ul>
        <li>Knock the puck into the other goal. First to ${CFG.target}.</li>
        <li>Your mallet stays in your own half. That is the whole game: you cannot
            reach across to defend a shot you left open.</li>
        <li>Hitting the puck while moving adds your own speed to it, so drive
            through the puck rather than waiting for it.</li>
        <li>The puck slows very gradually, so a hard shot stays dangerous after
            bouncing off the side walls.</li>
      </ul>
      <p>Best played on a tablet lying flat with a player on each side, each using
         one thumb. Both thumbs work at once.</p>`
  });

  Input.init();
  Input.claim(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR']);
  const ctx = Shell.ctx;

  const goalX1 = (W - CFG.goalMouth) / 2;
  const goalX2 = (W + CFG.goalMouth) / 2;

  /* ---------- setup ---------- */

  function makeMallet(i) {
    return {
      i, side: SIDES[i],
      x: W / 2, y: i === 0 ? H - 120 : 120,
      vx: 0, vy: 0, px: W / 2, py: i === 0 ? H - 120 : 120,
      score: 0, isCpu: i === 1 && mode === 'cpu',
      aim: { x: W / 2, y: 120 }, nextThink: 0, flash: 0
    };
  }

  function start() {
    mallets = [makeMallet(0), makeMallet(1)];
    trail = []; particles = [];
    serveTo = Math.random() < 0.5 ? 0 : 1;
    serve();
    Shell.hide();
    updateHud();
  }

  function serve() {
    puck = { x: W / 2, y: serveTo === 0 ? H * 0.66 : H * 0.34, vx: 0, vy: 0 };
    serveTimer = CFG.serveDelay;
    state = 'serve';
    trail = [];
  }

  /* ---------- simulation ---------- */

  function update(dt) {
    if (state !== 'play' && state !== 'serve') return;

    if (state === 'serve') {
      serveTimer -= dt * 1000;
      moveMallets(dt);
      if (serveTimer <= 0) {
        state = 'play';
        const ang = (serveTo === 0 ? -1 : 1) * (Math.PI / 2) + (Math.random() - 0.5) * 1.2;
        puck.vx = Math.cos(ang) * 240;
        puck.vy = Math.sin(ang) * 240;
      }
      return;
    }

    moveMallets(dt);

    // Fixed physics step, so behaviour does not change with frame rate.
    let acc = dt;
    while (acc > 0) {
      const step = Math.min(SUB, acc);
      acc -= step;
      stepPuck(step);
      if (state !== 'play') return;
    }

    trail.push({ x: puck.x, y: puck.y });
    if (trail.length > 14) trail.shift();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }

    for (const m of mallets) m.flash = Math.max(0, m.flash - dt * 4);
  }

  function moveMallets(dt) {
    for (const m of mallets) {
      m.px = m.x; m.py = m.y;

      if (m.isCpu) {
        cpuMove(m, dt);
      } else if (!m.dragging) {
        let dx = 0, dy = 0;
        if (m.i === 0) {
          if (Input.held('KeyA')) dx -= 1;
          if (Input.held('KeyD')) dx += 1;
          if (Input.held('KeyW')) dy -= 1;
          if (Input.held('KeyS')) dy += 1;
        } else {
          if (Input.held('ArrowLeft')) dx -= 1;
          if (Input.held('ArrowRight')) dx += 1;
          if (Input.held('ArrowUp')) dy -= 1;
          if (Input.held('ArrowDown')) dy += 1;
        }
        const len = Math.hypot(dx, dy) || 1;
        m.x += dx / len * CFG.malletSpeed * dt;
        m.y += dy / len * CFG.malletSpeed * dt;
      }

      confine(m);
      // Velocity is derived from how far it actually moved, so a dragged mallet
      // carries the same weight as a keyboard one.
      m.vx = (m.x - m.px) / Math.max(dt, 0.0001);
      m.vy = (m.y - m.py) / Math.max(dt, 0.0001);
    }
  }

  function confine(m) {
    m.x = clamp(m.x, CFG.malletR, W - CFG.malletR);
    if (m.i === 0) m.y = clamp(m.y, H / 2 + CFG.malletR, H - CFG.malletR);
    else m.y = clamp(m.y, CFG.malletR, H / 2 - CFG.malletR);
  }

  function stepPuck(dt) {
    puck.x += puck.vx * dt;
    puck.y += puck.vy * dt;

    // Gentle exponential drag.
    const decay = Math.exp(-CFG.puckFriction * dt);
    puck.vx *= decay;
    puck.vy *= decay;

    // Side walls.
    if (puck.x - CFG.puckR < 0) { puck.x = CFG.puckR; puck.vx = -puck.vx * CFG.wallBounce; wallHit(); }
    if (puck.x + CFG.puckR > W) { puck.x = W - CFG.puckR; puck.vx = -puck.vx * CFG.wallBounce; wallHit(); }

    // Ends: a goal only counts inside the mouth, otherwise it is a wall.
    const inMouth = puck.x > goalX1 && puck.x < goalX2;
    if (puck.y - CFG.puckR < 0) {
      if (inMouth) { goal(0); return; }
      puck.y = CFG.puckR; puck.vy = -puck.vy * CFG.wallBounce; wallHit();
    }
    if (puck.y + CFG.puckR > H) {
      if (inMouth) { goal(1); return; }
      puck.y = H - CFG.puckR; puck.vy = -puck.vy * CFG.wallBounce; wallHit();
    }

    for (const m of mallets) hitMallet(m);

    const sp = Math.hypot(puck.vx, puck.vy);
    if (sp > CFG.puckMax) { puck.vx = puck.vx / sp * CFG.puckMax; puck.vy = puck.vy / sp * CFG.puckMax; }
  }

  let lastWallSound = 0;
  function wallHit() {
    const now = performance.now();
    if (now - lastWallSound > 60) { Sfx.tick(false); lastWallSound = now; }
  }

  function hitMallet(m) {
    const dx = puck.x - m.x, dy = puck.y - m.y;
    const d = Math.hypot(dx, dy);
    const minD = CFG.puckR + CFG.malletR;
    if (d >= minD || d === 0) return;

    const nx = dx / d, ny = dy / d;
    puck.x = m.x + nx * minD;
    puck.y = m.y + ny * minD;

    // Reflect the component along the contact normal, then add the mallet's push.
    const dot = puck.vx * nx + puck.vy * ny;
    if (dot < 0) {
      puck.vx -= 2 * dot * nx;
      puck.vy -= 2 * dot * ny;
    }
    puck.vx += m.vx * CFG.transfer;
    puck.vy += m.vy * CFG.transfer;

    // Never let it sit dead against a mallet.
    const sp = Math.hypot(puck.vx, puck.vy);
    if (sp < 150) { puck.vx = nx * 190; puck.vy = ny * 190; }

    m.flash = 1;
    Sfx.place();
  }

  function goal(scorer) {
    mallets[scorer].score++;
    lastGoal = performance.now();
    Sfx.boom();
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * 6.283, s = 60 + Math.random() * 260;
      particles.push({ x: puck.x, y: clamp(puck.y, 0, H), vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                       life: 0.4 + Math.random() * 0.4, max: 0.8, size: 2 + Math.random() * 3,
                       col: mallets[scorer].side.col });
    }
    Shell.banner(mallets[scorer].side.name + ' scores');
    updateHud();
    serveTo = scorer === 0 ? 1 : 0;
    if (mallets[scorer].score >= CFG.target) over(mallets[scorer]);
    else serve();
  }

  function over(winner) {
    state = 'over';
    Sfx.win();
    if (mode === 'cpu' && winner.i === 0) Scores.submit('puck', mallets[0].score - mallets[1].score, { variant: level });
    Shell.gameOverCard({
      title: mode === 'cpu'
        ? (winner.i === 0 ? 'You win' : 'The CPU wins')
        : winner.side.name + ' wins',
      scoreLabel: 'Final score',
      score: mallets[0].score + ' - ' + mallets[1].score,
      buttons: [{ label: 'Play again', act: 'again', primary: true }, { label: 'Menu', act: 'menu' }]
    });
  }

  /* ---------- cpu ---------- */

  function cpuMove(m, dt) {
    const lv = LEVELS[level];
    const now = performance.now();

    if (now >= m.nextThink) {
      m.nextThink = now + lv.react;
      const err = () => (Math.random() - 0.5) * 2 * lv.error;

      if (puck.vy < -20 || puck.y < H / 2) {
        // Puck coming at us: intercept it, and if it is close enough, attack.
        const attack = puck.y < H / 2 - 40 && Math.random() < lv.aggression;
        m.aim = {
          x: clamp(puck.x + err(), CFG.malletR, W - CFG.malletR),
          y: attack ? clamp(puck.y + CFG.malletR * 0.9 + err() * 0.3, CFG.malletR, H / 2 - CFG.malletR)
                    : clamp(90 + err() * 0.4, CFG.malletR, H / 2 - CFG.malletR)
        };
      } else {
        // Puck is away: hold a defensive line in front of the goal.
        m.aim = { x: clamp(W / 2 + (puck.x - W / 2) * 0.55 + err() * 0.5, CFG.malletR, W - CFG.malletR),
                  y: clamp(86, CFG.malletR, H / 2 - CFG.malletR) };
      }
    }

    const dx = m.aim.x - m.x, dy = m.aim.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d > 3) {
      m.x += dx / d * Math.min(lv.speed * dt, d);
      m.y += dy / d * Math.min(lv.speed * dt, d);
    }
  }

  /* ---------- touch: two thumbs at once ---------- */

  const pointers = new Map();
  const wrap = Shell.els.stageWrap;

  function pointerToTable(e) {
    const r = wrap.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }

  wrap.addEventListener('pointerdown', (e) => {
    if (state === 'menu') return;
    const p = pointerToTable(e);
    const which = p.y > H / 2 ? 0 : 1;
    const m = mallets[which];
    if (m.isCpu) return;
    pointers.set(e.pointerId, which);
    m.dragging = true;
    wrap.setPointerCapture(e.pointerId);
  });

  wrap.addEventListener('pointermove', (e) => {
    const which = pointers.get(e.pointerId);
    if (which === undefined) return;
    const p = pointerToTable(e);
    mallets[which].x = p.x;
    mallets[which].y = p.y;
    confine(mallets[which]);
  });

  const release = (e) => {
    const which = pointers.get(e.pointerId);
    if (which === undefined) return;
    mallets[which].dragging = false;
    pointers.delete(e.pointerId);
  };
  wrap.addEventListener('pointerup', release);
  wrap.addEventListener('pointercancel', release);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && state !== 'menu') start();
  });

  /* ---------- drawing ---------- */

  function draw() {
    ctx.fillStyle = '#eef2fa';
    ctx.fillRect(0, 0, W, H);

    // Rink markings.
    ctx.strokeStyle = '#c3cee2';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 90, 0, 6.283);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 12, 0, 6.283);
    ctx.fillStyle = '#c3cee2';
    ctx.fill();

    for (const [i, y] of [[1, 0], [0, H]]) {
      ctx.strokeStyle = SIDES[i].col;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(goalX1, y === 0 ? 5 : H - 5);
      ctx.lineTo(goalX2, y === 0 ? 5 : H - 5);
      ctx.stroke();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = SIDES[i].col;
      ctx.fillRect(goalX1, y === 0 ? 0 : H - 70, CFG.goalMouth, 70);
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = '#aab6d4';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);

    for (let i = 0; i < trail.length; i++) {
      const t = i / trail.length;
      ctx.globalAlpha = t * 0.25;
      ctx.fillStyle = '#2b3550';
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, CFG.puckR * (0.4 + t * 0.6), 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    if (mallets) for (const m of mallets) drawMallet(m);
    if (puck) drawPuck();

    // Scores, one at each end, oriented for the player sitting there.
    if (mallets) {
      ctx.save();
      ctx.font = '800 60px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = SIDES[0].col;
      ctx.fillText(mallets[0].score, W - 60, H / 2 + 70);
      ctx.translate(60, H / 2 - 70);
      ctx.rotate(Math.PI);
      ctx.fillStyle = SIDES[1].col;
      ctx.fillText(mallets[1].score, 0, 0);
      ctx.restore();
    }
  }

  function drawMallet(m) {
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.beginPath();
    ctx.ellipse(m.x, m.y + 5, CFG.malletR, CFG.malletR * 0.85, 0, 0, 6.283);
    ctx.fill();

    if (m.flash > 0) { ctx.shadowColor = m.side.col; ctx.shadowBlur = 26 * m.flash; }
    const g = ctx.createRadialGradient(m.x - 8, m.y - 10, 4, m.x, m.y, CFG.malletR);
    g.addColorStop(0, m.side.light);
    g.addColorStop(0.6, m.side.col);
    g.addColorStop(1, m.side.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, CFG.malletR, 0, 6.283);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.arc(m.x, m.y, CFG.malletR * 0.42, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = m.side.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, CFG.malletR * 0.42, 0, 6.283);
    ctx.stroke();
  }

  function drawPuck() {
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath();
    ctx.ellipse(puck.x, puck.y + 4, CFG.puckR, CFG.puckR * 0.9, 0, 0, 6.283);
    ctx.fill();
    const g = ctx.createRadialGradient(puck.x - 5, puck.y - 6, 2, puck.x, puck.y, CFG.puckR);
    g.addColorStop(0, '#4a5573');
    g.addColorStop(1, '#171d2c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, CFG.puckR, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, CFG.puckR * 0.6, 0, 6.283);
    ctx.stroke();
  }

  function updateHud() {
    Shell.readouts([
      { label: mode === 'cpu' ? 'You' : 'Blue', value: mallets ? mallets[0].score : 0, accent: true },
      { label: mode === 'cpu' ? 'CPU' : 'Red', value: mallets ? mallets[1].score : 0 },
      { label: 'First to', value: CFG.target }
    ]);
    Shell.status((mallets ? mallets[0].score : 0) + ' - ' + (mallets ? mallets[1].score : 0),
      mode === 'cpu' ? 'vs CPU ' + LEVELS[level].label : 'two players');
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    mallets = [makeMallet(0), makeMallet(1)];
    puck = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    trail = []; particles = [];
    Shell.status('', '');
    Shell.readouts([{ label: 'Best win margin', value: Scores.label('puck', level) }]);
    Shell.startCard({
      blurb: 'Keep it out of your goal. Your mallet never leaves your half.',
      extra: `<div class="rowBetween"><span>Opponent</span><div class="seg">
          <button data-act="mode" data-m="duel" class="${mode === 'duel' ? 'on' : ''}">Two players</button>
          <button data-act="mode" data-m="cpu" class="${mode === 'cpu' ? 'on' : ''}">CPU</button>
        </div></div>
        ${mode === 'cpu' ? `<div class="rowBetween"><span>Difficulty</span><div class="seg">${
          Object.keys(LEVELS).map((k) => `<button data-act="level" data-k="${k}" class="${level === k ? 'on' : ''}">${LEVELS[k].label}</button>`).join('')
        }</div></div>` : ''}
        <div class="rowBetween"><span>Bottom player</span><b style="color:var(--text)">W A S D or drag</b></div>
        <div class="rowBetween"><span>Top player</span><b style="color:var(--text)">${mode === 'cpu' ? 'CPU' : 'Arrows or drag'}</b></div>`,
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

  window.EasyPuck = {
    get state() { return state; },
    puck: () => puck, mallets: () => mallets,
    start, update, serve, goal,
    setMode(m, l) { mode = m; if (l) level = l; },
    force(p) { Object.assign(puck, p); state = 'play'; },
    cfg: CFG, dims: { W, H, goalX1, goalX2 }
  };
})();
