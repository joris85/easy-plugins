'use strict';

/* Easy Snake.

   The detail that makes or breaks a snake game is the turn buffer. Inputs must
   queue and be applied at the next cell step, and each queued turn must be
   validated against the direction the snake will actually be facing when that
   turn is applied, not its current one. Without that, a fast double tap lets you
   reverse into your own neck. */

(function () {
  const COLS = 25, ROWS = 25, CELL = 24;
  const W = COLS * CELL, H = ROWS * CELL;

  const MODES = {
    walls: { label: 'Walls', wrap: false, players: 1 },
    wrap: { label: 'No walls', wrap: true, players: 1 },
    duel: { label: 'Two snakes', wrap: false, players: 2 }
  };

  const COLORS = [
    { body: '#4ad46f', head: '#8bf0aa', dark: '#1d9142', name: 'Green' },
    { body: '#4da3ff', head: '#a5d2ff', dark: '#1d61b8', name: 'Blue' }
  ];

  let mode = 'walls';
  let state = 'menu';          // menu | play | over
  let snakes = [];
  let food = [];
  let stepTimer = 0;
  let score = 0;
  let winner = null;
  let foodPulse = 0;

  Shell.mount({
    name: 'Snake',
    width: W, height: H, max: 600, pad: 240,
    tools: ['sound', 'pause', 'help'],
    foot: '<b>Arrows</b> or <b>WASD</b> to steer &middot; Escape pauses &middot; swipe on a phone',
    rules: `
      <ul>
        <li>Steer the snake into the food. Every piece makes you one segment longer.</li>
        <li>You die if you hit a wall or any snake body, including your own.</li>
        <li>The snake speeds up as it grows, from 8 up to 18 cells per second.</li>
        <li><b>No walls</b> mode wraps you around the edges instead of killing you.</li>
        <li><b>Two snakes</b> puts both players on one board. Last one alive wins.</li>
      </ul>
      <p>You cannot turn back on yourself. Turns are buffered, so a quick double tap
         around a corner does what you meant rather than what you typed.</p>`
  });

  Input.init();
  Input.claim(['KeyR']);

  const ctx = Shell.ctx;

  /* ---------- setup ---------- */

  function newSnake(i, n) {
    const y = n === 1 ? Math.floor(ROWS / 2) : (i === 0 ? Math.floor(ROWS / 3) : Math.floor(ROWS * 2 / 3));
    const x = n === 1 ? 6 : (i === 0 ? 5 : COLS - 6);
    const dir = n === 1 ? { dx: 1, dy: 0 } : (i === 0 ? { dx: 1, dy: 0 } : { dx: -1, dy: 0 });
    const cells = [];
    for (let k = 2; k >= 0; k--) cells.push({ x: x - dir.dx * k, y: y - dir.dy * k });
    return {
      id: i, color: COLORS[i], cells, dir,
      queue: [], alive: true, grow: 0, deathAt: 0
    };
  }

  function start() {
    const m = MODES[mode];
    snakes = [];
    for (let i = 0; i < m.players; i++) snakes.push(newSnake(i, m.players));
    food = [];
    spawnFood();
    if (m.players === 2) spawnFood();
    stepTimer = 0;
    score = 0;
    winner = null;
    state = 'play';
    Shell.hide();
    Loop.resume();
    updateHud();
  }

  function occupied(x, y) {
    for (const s of snakes) {
      if (!s.alive) continue;
      for (const c of s.cells) if (c.x === x && c.y === y) return true;
    }
    for (const f of food) if (f.x === x && f.y === y) return true;
    return false;
  }

  function spawnFood() {
    const free = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) if (!occupied(x, y)) free.push({ x, y });
    }
    if (free.length) food.push(pick(free));
  }

  /* ---------- input ---------- */

  function queueTurn(s, dx, dy) {
    if (dx === 0 && dy === 0) return;
    // Compare against the direction this snake will be facing when the turn lands.
    const base = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if (dx === base.dx && dy === base.dy) return;         // same direction, ignore
    if (dx === -base.dx && dy === -base.dy) return;       // no reversing
    if (s.queue.length < 2) s.queue.push({ dx, dy });
  }

  function readInput() {
    for (const s of snakes) {
      if (!s.alive) continue;
      const d = Input.dirFor(s.id);
      if (d.dx || d.dy) queueTurn(s, d.dx, d.dy);
      if (s.id === 0 && (Touch.dir.dx || Touch.dir.dy)) queueTurn(s, Touch.dir.dx, Touch.dir.dy);
    }
  }

  Touch.mount(Shell.els.touchpad, { dpad: true });
  Touch.swipe(Shell.els.stageWrap, (dir) => {
    if (!snakes.length || !snakes[0].alive) return;
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    queueTurn(snakes[0], map[dir][0], map[dir][1]);
  });

  /* ---------- simulation ---------- */

  function stepInterval() {
    const len = snakes.length ? Math.max.apply(null, snakes.map((s) => s.cells.length)) : 3;
    const cps = Math.min(18, 8 + (len - 3) * 0.35);
    return 1 / cps;
  }

  function update(dt) {
    foodPulse += dt * 4;
    if (state !== 'play') return;

    readInput();

    stepTimer += dt;
    const iv = stepInterval();
    while (stepTimer >= iv) {
      stepTimer -= iv;
      step();
      if (state !== 'play') return;
    }
  }

  function step() {
    const wrap = MODES[mode].wrap;

    // Apply one buffered turn each, then compute the new heads.
    const heads = [];
    for (const s of snakes) {
      if (!s.alive) { heads.push(null); continue; }
      if (s.queue.length) s.dir = s.queue.shift();
      let nx = s.cells[s.cells.length - 1].x + s.dir.dx;
      let ny = s.cells[s.cells.length - 1].y + s.dir.dy;
      if (wrap) { nx = (nx + COLS) % COLS; ny = (ny + ROWS) % ROWS; }
      heads.push({ x: nx, y: ny });
    }

    // Resolve deaths against the board as it stands before anyone moves. Tails
    // that are about to vacate still count, which matches the classic feel.
    const dying = [];
    snakes.forEach((s, i) => {
      if (!s.alive) return;
      const hd = heads[i];
      if (!wrap && (hd.x < 0 || hd.y < 0 || hd.x >= COLS || hd.y >= ROWS)) { dying.push(s); return; }
      for (const other of snakes) {
        if (!other.alive) continue;
        const skipTail = other.grow === 0 ? 1 : 0;   // the tail cell moves away this step
        for (let k = skipTail; k < other.cells.length; k++) {
          if (other.cells[k].x === hd.x && other.cells[k].y === hd.y) { dying.push(s); return; }
        }
      }
      // Head-on collision between two snakes entering the same cell.
      for (let j = 0; j < snakes.length; j++) {
        if (j === i || !snakes[j].alive || !heads[j]) continue;
        if (heads[j].x === hd.x && heads[j].y === hd.y) { dying.push(s); return; }
      }
    });

    // Advance the survivors.
    let changed = false;
    snakes.forEach((s, i) => {
      if (!s.alive || dying.indexOf(s) !== -1) return;
      s.cells.push(heads[i]);
      const fi = food.findIndex((f) => f.x === heads[i].x && f.y === heads[i].y);
      if (fi !== -1) {
        food.splice(fi, 1);
        s.grow += 1;
        score += 10;
        changed = true;
        Sfx.pickup();
        spawnFood();
      }
      if (s.grow > 0) s.grow--; else s.cells.shift();
    });

    for (const s of dying) {
      s.alive = false;
      s.deathAt = performance.now();
      Sfx.die();
    }

    if (dying.length) { changed = true; checkEnd(); }
    if (changed) updateHud();
  }

  function checkEnd() {
    const alive = snakes.filter((s) => s.alive);
    if (MODES[mode].players === 2) {
      if (alive.length <= 1) { winner = alive[0] || null; gameOver(); }
    } else if (!alive.length) {
      gameOver();
    }
  }

  function gameOver() {
    state = 'over';
    const solo = MODES[mode].players === 1;
    const res = solo ? Scores.submit('snake', score, { variant: mode }) : null;

    Shell.gameOverCard({
      title: solo ? 'Game over' : (winner ? winner.color.name + ' wins' : 'Both snakes died'),
      scoreLabel: solo ? 'Score' : 'Total food eaten',
      score: score,
      isNew: !!(res && res.isNew && res.previous !== null),
      best: solo ? Scores.label('snake', mode) : null,
      extra: solo ? `<p class="tag" style="margin-top:8px">Length ${snakes[0].cells.length}</p>` : '',
      buttons: [
        { label: 'Play again', act: 'start', primary: true },
        { label: 'Change mode', act: 'menu' }
      ]
    });
  }

  function updateHud() {
    if (MODES[mode].players === 2) {
      Shell.hud(snakes.map((s) => `
        <div class="pcard ${s.alive ? '' : 'dead'}" style="--c:${s.color.body}">
          <div class="pTop"><span class="dot"></span><span class="pname">${s.color.name}</span>
            <span class="wins">${s.cells.length}</span></div>
          <div class="stats"><span class="stat">length</span></div>
        </div>`).join(''));
    } else {
      Shell.readouts([
        { label: 'Score', value: score, accent: true },
        { label: 'Length', value: snakes.length ? snakes[0].cells.length : 3 },
        { label: 'Best', value: Scores.label('snake', mode) }
      ]);
    }
    Shell.status(score, MODES[mode].label);
  }

  /* ---------- drawing ---------- */

  function draw() {
    ctx.fillStyle = '#1b2030';
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#2c3446' : '#28303f';
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
    if (!MODES[mode].wrap) {
      ctx.strokeStyle = 'rgba(255,176,46,.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
    }

    for (const f of food) drawFood(f);
    for (const s of snakes) drawSnake(s);
  }

  function drawFood(f) {
    const cx = f.x * CELL + CELL / 2, cy = f.y * CELL + CELL / 2;
    const r = CELL * 0.32 * (1 + 0.09 * Math.sin(foodPulse));
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * .8, r * .8, r * .3, 0, 0, 6.283); ctx.fill();
    const g = ctx.createRadialGradient(cx - r * .3, cy - r * .35, r * .15, cx, cy, r);
    g.addColorStop(0, '#ff9aa8');
    g.addColorStop(.6, '#ff5470');
    g.addColorStop(1, '#c0203a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#4ad46f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * .5, cy - r * 1.5); ctx.stroke();
  }

  function drawSnake(s) {
    const now = performance.now();
    let alpha = 1;
    if (!s.alive) {
      const t = (now - s.deathAt) / 900;
      if (t > 1) return;
      alpha = 1 - t * 0.75;
    }
    ctx.globalAlpha = alpha;

    const n = s.cells.length;
    s.cells.forEach((c, i) => {
      const head = i === n - 1;
      const inset = head ? 1.5 : 2.5 + (1 - i / n) * 1.5;
      const x = c.x * CELL + inset, y = c.y * CELL + inset;
      const w = CELL - inset * 2;

      if (head) {
        const g = ctx.createLinearGradient(x, y, x, y + w);
        g.addColorStop(0, s.color.head);
        g.addColorStop(1, s.color.body);
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = i % 2 === 0 ? s.color.body : s.color.dark;
      }
      roundRect(ctx, x, y, w, w, head ? 7 : 5);
      ctx.fill();
    });

    // Eyes on the head, looking where it is going.
    const hd = s.cells[n - 1];
    const cx = hd.x * CELL + CELL / 2, cy = hd.y * CELL + CELL / 2;
    const ox = s.dir.dx * CELL * 0.16, oy = s.dir.dy * CELL * 0.16;
    const px = s.dir.dy !== 0 ? CELL * 0.18 : 0;
    const py = s.dir.dx !== 0 ? CELL * 0.18 : 0;
    ctx.fillStyle = '#0f1420';
    ctx.beginPath();
    ctx.arc(cx + ox + px, cy + oy + py, CELL * 0.085, 0, 6.283);
    ctx.arc(cx + ox - px, cy + oy - py, CELL * 0.085, 0, 6.283);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    snakes = [newSnake(0, 1)];
    food = [{ x: 16, y: 12 }];
    Shell.readouts([{ label: 'Best', value: Scores.label('snake', mode) }]);
    Shell.status('', '');
    Shell.startCard({
      blurb: 'Eat, grow, and do not bite yourself.',
      extra: `<div class="rowBetween"><span>Mode</span><div class="seg" id="modeSeg">${
        Object.keys(MODES).map((k) =>
          `<button data-act="mode" data-mode="${k}" class="${mode === k ? 'on' : ''}">${MODES[k].label}</button>`
        ).join('')}</div></div>
        <div class="rowBetween"><span>Your best in this mode</span><b style="color:var(--text)">${Scores.label('snake', mode)}</b></div>`,
      buttons: [{ label: 'Play', act: 'start', primary: true }]
    });
  }

  Shell.on({
    start: () => start(),
    menu: () => showMenu(),
    mode: (el) => { mode = el.dataset.mode; showMenu(); }
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && state !== 'menu') start();
    if (e.code === 'Space' && state === 'over') start();
    if (e.code === 'Space' && state === 'menu') start();
  });

  Loop.start(update, draw, { pauseOnHide: false });   // Shell handles tab-hide pausing

  showMenu();
  window.EasySnake = { get state() { return state; }, snakes: () => snakes, step, start, food: () => food };
})();
