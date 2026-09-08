'use strict';

/* Easy Cycles, light cycles on a grid.

   The grid-locked cousin of Easy Curve, and it plays completely differently:
   here every wall is axis aligned, so the arena carves into clean rectangles and
   the game becomes about cutting people off rather than threading gaps.

   The detail that decides whether it feels responsive: turns are BUFFERED. An
   input between cell boundaries is remembered and applied at the next step,
   validated against the direction that will be current when it lands. Without
   the buffer, inputs vanish and the game feels broken. */

(function () {
  const COLS = 100, ROWS = 76, CELL = 8;
  const W = COLS * CELL, H = ROWS * CELL;

  const CFG = {
    baseSpeed: 14,        // cells per second
    speedStep: 2,
    speedEvery: 15000,    // ms
    maxSpeed: 26,
    freeze: 1200,
    roundGap: 1800,
    target: 10
  };

  const COLORS = [
    { name: 'Red',    body: '#ff4d5e', glow: '#ff8b96' },
    { name: 'Blue',   body: '#4da3ff', glow: '#95c8ff' },
    { name: 'Green',  body: '#4ad46f', glow: '#96e9ac' },
    { name: 'Yellow', body: '#ffcc3f', glow: '#ffe396' }
  ];

  const SPAWNS = [
    { x: 12, y: Math.floor(ROWS / 2), dx: 1, dy: 0 },
    { x: COLS - 13, y: Math.floor(ROWS / 2), dx: -1, dy: 0 },
    { x: Math.floor(COLS / 2), y: 10, dx: 0, dy: 1 },
    { x: Math.floor(COLS / 2), y: ROWS - 11, dx: 0, dy: -1 }
  ];

  let chosen = [true, true, false, false];
  let players = [];
  let grid;                       // 0 free, else owner id + 1
  let state = 'menu';             // menu | freeze | play | roundover | matchover
  let timer = 0, stepAcc = 0, roundMs = 0;

  Shell.mount({
    name: 'Cycles',
    width: W, height: H, max: 800, pad: 250,
    tools: ['sound', 'pause', 'help'],
    foot: 'Four direction keys each &middot; you cannot turn back on yourself',
    rules: `
      <ul>
        <li>Your cycle never stops. Steering leaves a solid wall behind you.</li>
        <li>Hit any wall, including your own, or the arena edge, and you are out.</li>
        <li>You cannot reverse into your own trail.</li>
        <li>Everyone speeds up every 15 seconds, from 14 cells a second up to 26.</li>
        <li>Last one riding takes the round. First to ${CFG.target} wins the match.</li>
      </ul>
      <p>Turns are buffered, so pressing a direction slightly early still registers
         at the next grid line. Tap ahead of the corner rather than on it.</p>`
  });

  Input.init();
  Input.claim(['Enter', 'KeyR']);
  const ctx = Shell.ctx;

  /* ---------- rounds ---------- */

  function startMatch(list) {
    players = list.map((i) => ({
      id: i, col: COLORS[i], score: 0,
      x: 0, y: 0, dir: { dx: 1, dy: 0 }, queue: [],
      alive: true, deathAt: 0, cells: []
    }));
    startRound();
  }

  function startRound() {
    grid = new Uint8Array(COLS * ROWS);
    for (const p of players) {
      const s = SPAWNS[p.id];
      p.x = s.x; p.y = s.y;
      p.dir = { dx: s.dx, dy: s.dy };
      p.queue = [];
      p.alive = true;
      p.cells = [{ x: p.x, y: p.y }];
      grid[p.y * COLS + p.x] = p.id + 1;
    }
    state = 'freeze';
    timer = CFG.freeze;
    stepAcc = 0;
    roundMs = 0;
    Sfx.roundStart();
    Shell.hide();
    updateHud();
  }

  function stepInterval() {
    const bonus = Math.floor(roundMs / CFG.speedEvery) * CFG.speedStep;
    return 1 / Math.min(CFG.maxSpeed, CFG.baseSpeed + bonus);
  }

  /* ---------- input ---------- */

  function queueTurn(p, dx, dy) {
    if (!dx && !dy) return;
    const base = p.queue.length ? p.queue[p.queue.length - 1] : p.dir;
    if (dx === base.dx && dy === base.dy) return;
    if (dx === -base.dx && dy === -base.dy) return;     // no reversing
    if (p.queue.length < 2) p.queue.push({ dx, dy });
  }

  function readInput() {
    for (const p of players) {
      if (!p.alive) continue;
      const d = Input.dirFor(p.id);
      if (d.dx || d.dy) queueTurn(p, d.dx, d.dy);
      if (p.id === players[0].id && (Touch.dir.dx || Touch.dir.dy)) queueTurn(p, Touch.dir.dx, Touch.dir.dy);
    }
  }

  /* ---------- simulation ---------- */

  function update(dt) {
    if (state === 'freeze') {
      timer -= dt * 1000;
      Shell.countdown(Math.ceil(timer / 400), 'Get ready');
      if (timer <= 0) { state = 'play'; Shell.hide(); }
      return;
    }
    if (state === 'roundover') {
      timer -= dt * 1000;
      if (timer <= 0) {
        const champ = players.find((p) => p.score >= CFG.target);
        if (champ) matchOver(champ); else startRound();
      }
      return;
    }
    if (state !== 'play') return;

    readInput();
    roundMs += dt * 1000;
    stepAcc += dt;
    const iv = stepInterval();
    while (stepAcc >= iv) {
      stepAcc -= iv;
      step();
      if (state !== 'play') return;
    }
  }

  function step() {
    // Everyone moves at the same instant, so work out the targets first.
    const targets = players.map((p) => {
      if (!p.alive) return null;
      if (p.queue.length) p.dir = p.queue.shift();
      return { x: p.x + p.dir.dx, y: p.y + p.dir.dy };
    });

    const dying = [];
    players.forEach((p, i) => {
      if (!p.alive) return;
      const t = targets[i];
      if (t.x < 0 || t.y < 0 || t.x >= COLS || t.y >= ROWS) { dying.push(p); return; }
      if (grid[t.y * COLS + t.x]) { dying.push(p); return; }
      // Two riders entering the same cell take each other out.
      for (let j = 0; j < players.length; j++) {
        if (j === i || !targets[j] || !players[j].alive) continue;
        if (targets[j].x === t.x && targets[j].y === t.y) { dying.push(p); return; }
      }
    });

    players.forEach((p, i) => {
      if (!p.alive || dying.indexOf(p) !== -1) return;
      const t = targets[i];
      p.x = t.x; p.y = t.y;
      grid[t.y * COLS + t.x] = p.id + 1;
      p.cells.push({ x: t.x, y: t.y });
    });

    for (const p of dying) {
      p.alive = false;
      p.deathAt = performance.now();
      for (const q of players) if (q.alive && q !== p) q.score++;
      Sfx.die();
    }

    if (dying.length) {
      updateHud();
      const alive = players.filter((p) => p.alive);
      if (alive.length <= 1) endRound(alive[0] || null);
    }
  }

  function endRound(survivor) {
    state = 'roundover';
    timer = CFG.roundGap;
    if (survivor) Sfx.win();
    const title = survivor
      ? `<span style="color:${survivor.col.body}">${survivor.col.name}</span> survives`
      : 'Everybody crashed';
    Shell.overlay(`<div class="card slim"><h2>${title}</h2>${scoreStrip()}</div>`, { transparent: true });
  }

  function matchOver(champ) {
    state = 'matchover';
    Sfx.win();
    Shell.overlay(`<div class="card">
      <h2><span style="color:${champ.col.body}">${champ.col.name}</span> wins the match</h2>
      ${scoreStrip()}
      <div class="btnRow">
        <button class="primary" data-act="rematch">Rematch</button>
        <button data-act="menu">Change players</button>
      </div>
    </div>`);
  }

  function scoreStrip() {
    return '<div class="scores">' + players.map((p) =>
      `<span class="sc"><i style="background:${p.col.body}"></i>${p.score}</span>`).join('') + '</div>';
  }

  function updateHud() {
    Shell.hud(players.map((p) => `
      <div class="pcard ${p.alive ? '' : 'dead'}" style="--c:${p.col.body}">
        <div class="pTop"><span class="dot"></span><span class="pname">${p.col.name}</span>
          <span class="wins">${p.score}</span></div>
        <div class="stats"><span class="stat">${p.alive ? 'riding' : 'out'}</span></div>
      </div>`).join(''));
    const speed = players.length ? Math.min(CFG.maxSpeed, CFG.baseSpeed + Math.floor(roundMs / CFG.speedEvery) * CFG.speedStep) : CFG.baseSpeed;
    Shell.status(players.filter((p) => p.alive).length + '/' + players.length, speed + ' cells/s');
  }

  /* ---------- drawing ---------- */

  function draw() {
    ctx.fillStyle = '#0d1220';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(120,160,255,.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x += 5) { ctx.beginPath(); ctx.moveTo(x * CELL + .5, 0); ctx.lineTo(x * CELL + .5, H); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y += 5) { ctx.beginPath(); ctx.moveTo(0, y * CELL + .5); ctx.lineTo(W, y * CELL + .5); ctx.stroke(); }

    ctx.strokeStyle = 'rgba(255,176,46,.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

    for (const p of players) {
      if (!p.cells.length) continue;
      ctx.fillStyle = p.col.body;
      // A dead rider's wall stays on the board and stays solid, so it must stay
      // visible. Only the rider itself goes. Fading the trail out would leave
      // people crashing into walls they cannot see.
      ctx.globalAlpha = p.alive ? 1 : 0.5;
      for (const c of p.cells) ctx.fillRect(c.x * CELL, c.y * CELL, CELL, CELL);

      if (p.alive) {
        // Bright head with a glow.
        ctx.shadowColor = p.col.body;
        ctx.shadowBlur = 14;
        ctx.fillStyle = p.col.glow;
        ctx.fillRect(p.x * CELL - 1, p.y * CELL - 1, CELL + 2, CELL + 2);
        ctx.shadowBlur = 0;
      } else {
        const t = (performance.now() - p.deathAt) / 500;
        if (t < 1) {
          ctx.globalAlpha = 1 - t;
          ctx.fillStyle = '#fff';
          const r = 3 + t * 26;
          ctx.fillRect(p.x * CELL + CELL / 2 - r, p.y * CELL + CELL / 2 - r, r * 2, r * 2);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    players = [];
    grid = new Uint8Array(COLS * ROWS);
    Shell.hud('');
    Shell.status('', '');
    const rows = COLORS.map((c, i) => {
      const b = Input.bindings[i];
      return `<div class="playerRow ${chosen[i] ? '' : 'off'}">
        <span class="dot" style="background:${c.body}"></span>
        <span class="who">${c.name}</span>
        <span class="keyPair">
          <span class="kp">${Input.label(b.up)}</span><span class="kp">${Input.label(b.left)}</span>
          <span class="kp">${Input.label(b.down)}</span><span class="kp">${Input.label(b.right)}</span>
        </span>
        <button class="toggle ${chosen[i] ? 'primary' : ''}" data-act="toggle" data-i="${i}">${chosen[i] ? 'in' : 'out'}</button>
      </div>`;
    }).join('');

    Shell.overlay(`<div class="card wide">
      <h1>Easy <span>Cycles</span></h1>
      <p class="tag">Leave a wall behind you. Cut the others off before they cut you.</p>
      ${rows}
      <div class="btnRow">
        <button class="primary" data-act="play">Start match</button>
        <button data-act="help2">How to play</button>
      </div>
    </div>`);
  }

  Shell.on({
    toggle: (el) => { const i = +el.dataset.i; chosen[i] = !chosen[i]; showMenu(); },
    play: () => {
      const list = chosen.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
      if (list.length < 2) { Shell.banner('Pick at least two riders'); return; }
      Sfx.init(); Sfx.resume();
      startMatch(list);
    },
    help2: () => Shell.showRules(),
    rematch: () => { for (const p of players) p.score = 0; startRound(); },
    menu: () => showMenu()
  });

  Touch.mount(Shell.els.touchpad, { dpad: true });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && state === 'menu') {
      const b = Shell.els.overlay.querySelector('[data-act="play"]');
      if (b) b.click();
    }
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyCycles = {
    get state() { return state; },
    players: () => players,
    grid: () => grid,
    dims: () => ({ COLS, ROWS }),
    startMatch, startRound, step, update, queueTurn, stepInterval,
    force(list) { chosen = chosen.map((_, i) => list.indexOf(i) >= 0); },
    setRoundMs(v) { roundMs = v; },
    cfg: CFG
  };
})();
