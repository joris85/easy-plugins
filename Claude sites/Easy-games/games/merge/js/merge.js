'use strict';

/* Easy Merge, a 2048 style sliding puzzle.

   Three rules clones get wrong, all handled in resolveLine():
   1. A tile merges at most once per move, so 2 2 2 2 gives 4 4, never 8.
   2. Merges resolve from the direction of travel, so 2 2 2 pressed left
      gives 4 2, not 2 4.
   3. A move that changes nothing is rejected and does not spawn a tile. */

(function () {
  const SIZE = 520;                 // canvas is square, tile size derives from N
  const SLIDE_MS = 105;
  const POP_MS = 130;

  const COLORS = {
    2: '#cdd4e6', 4: '#b9c2da', 8: '#f2a03d', 16: '#f08a30', 32: '#ee6f3a',
    64: '#ec5330', 128: '#e8c84a', 256: '#e3bd2c', 512: '#d9ae14',
    1024: '#a78bfa', 2048: '#4ad46f', 4096: '#3fe0d0', 8192: '#ff7ad5'
  };

  let N = 4;
  let board = [];
  let score = 0, best = 0;
  let state = 'menu';            // menu | play | over | won
  let slides = [], pops = [];
  let anim = 1;                  // 0..1 slide progress
  let prev = null;               // one level of undo
  let reached = 0;
  let keepPlaying = false;

  Shell.mount({
    name: 'Merge',
    width: SIZE, height: SIZE, max: 520, pad: 250,
    tools: ['sound', 'help'],
    foot: '<b>Arrows</b> or <b>WASD</b> to slide &middot; <b>Z</b> undoes one move &middot; swipe on a phone',
    rules: `
      <ul>
        <li>Every move slides <b>all</b> tiles as far as they can go in that direction.</li>
        <li>Two tiles with the same number merge into their sum, and you score that sum.</li>
        <li>A tile can only merge once per move. Four 2s in a row become two 4s, not an 8.</li>
        <li>Merges resolve from the edge you are sliding toward, so three 2s pressed
            left give a 4 next to a 2.</li>
        <li>A move that changes nothing is not a move, and no new tile appears.</li>
        <li>Each real move drops one new tile: a 2 nine times out of ten, otherwise a 4.</li>
      </ul>
      <p>You win at 2048 and can keep going afterwards. You lose when the board is
         full and no two neighbours match.</p>`
  });

  Input.init();
  Input.claim(['KeyZ', 'KeyR', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
  const ctx = Shell.ctx;

  /* ---------- board helpers ---------- */

  const idx = (r, c) => r * N + c;

  function emptyCells() {
    const out = [];
    for (let i = 0; i < N * N; i++) if (!board[i]) out.push(i);
    return out;
  }

  function spawn(popIt) {
    const free = emptyCells();
    if (!free.length) return null;
    const i = pick(free);
    board[i] = Math.random() < 0.9 ? 2 : 4;
    if (popIt) pops.push({ r: Math.floor(i / N), c: i % N, t: 0, isNew: true });
    return i;
  }

  function reset(n) {
    N = n || N;
    board = new Array(N * N).fill(0);
    score = 0;
    slides = []; pops = [];
    anim = 1;
    prev = null;
    reached = 0;
    keepPlaying = false;
    spawn(true); spawn(true);
    state = 'play';
    best = Scores.best('merge', 'n' + N) || 0;
    Shell.hide();
    updateHud();
  }

  /* ---------- the move ---------- */

  /** Cell indices of line `i` in travel order for a direction. */
  function lineCells(dir, i) {
    const out = [];
    for (let k = 0; k < N; k++) {
      if (dir === 'left') out.push(idx(i, k));
      else if (dir === 'right') out.push(idx(i, N - 1 - k));
      else if (dir === 'up') out.push(idx(k, i));
      else out.push(idx(N - 1 - k, i));
    }
    return out;
  }

  function move(dir) {
    if (state !== 'play') return false;
    if (anim < 1) {
      finishSlide();                  // a queued input completes the previous slide first
      if (state !== 'play') return false;
    }

    const before = board.slice();
    const beforeScore = score;
    const newBoard = new Array(N * N).fill(0);
    const mySlides = [], myPops = [];
    let changed = false;

    for (let i = 0; i < N; i++) {
      const cells = lineCells(dir, i);
      const vals = [];
      for (const c of cells) if (board[c]) vals.push({ v: board[c], from: c });

      let out = 0;                     // next free slot in travel order
      let k = 0;
      while (k < vals.length) {
        const target = cells[out];
        if (k + 1 < vals.length && vals[k].v === vals[k + 1].v) {
          const merged = vals[k].v * 2;
          newBoard[target] = merged;
          score += merged;
          mySlides.push({ v: vals[k].v, from: vals[k].from, to: target });
          mySlides.push({ v: vals[k + 1].v, from: vals[k + 1].from, to: target });
          myPops.push({ r: Math.floor(target / N), c: target % N, t: 0, isNew: false });
          if (merged > reached) reached = merged;
          k += 2;
        } else {
          newBoard[target] = vals[k].v;
          mySlides.push({ v: vals[k].v, from: vals[k].from, to: target });
          k += 1;
        }
        out++;
      }
    }

    for (let i = 0; i < N * N; i++) if (before[i] !== newBoard[i]) changed = true;

    if (!changed) {
      score = beforeScore;             // nothing happened, so no points either
      return false;
    }

    prev = { board: before, score: beforeScore, reached };
    board = newBoard;
    slides = mySlides;
    pendingPops = myPops;             // merged tiles pop after the slide, not during
    pops = [];
    anim = 0;
    Sfx.place();
    if (myPops.length) setTimeout(() => Sfx.tick(false), SLIDE_MS);
    return true;
  }

  let pendingPops = [];

  function finishSlide() { anim = 1; afterSlide(); }

  function afterSlide() {
    slides = [];
    pops = pendingPops.map((p) => ({ r: p.r, c: p.c, t: 0, isNew: false }));
    pendingPops = [];
    spawn(true);
    updateHud();
    if (reached >= 2048 && !keepPlaying && state === 'play') { state = 'won'; wonCard(); return; }
    if (!hasMove()) gameOver();
  }

  function hasMove() {
    if (emptyCells().length) return true;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = board[idx(r, c)];
        if (c + 1 < N && board[idx(r, c + 1)] === v) return true;
        if (r + 1 < N && board[idx(r + 1, c)] === v) return true;
      }
    }
    return false;
  }

  function undo() {
    if (!prev || state === 'over') return;
    board = prev.board.slice();
    score = prev.score;
    reached = prev.reached;
    prev = null;
    slides = []; pops = []; anim = 1;
    updateHud();
    Sfx.kick();
  }

  /* ---------- outcome ---------- */

  function gameOver() {
    state = 'over';
    const res = Scores.submit('merge', score, { variant: 'n' + N });
    best = res.best;
    Shell.gameOverCard({
      title: 'No moves left',
      scoreLabel: 'Score',
      score: score,
      isNew: res.isNew && res.previous !== null,
      best: best,
      extra: `<p class="tag" style="margin-top:8px">Biggest tile ${reached}</p>`,
      buttons: [{ label: 'Play again', act: 'again', primary: true }, { label: 'Change size', act: 'menu' }]
    });
  }

  function wonCard() {
    Scores.submit('merge', score, { variant: 'n' + N });
    Shell.overlay(`<div class="card">
      <h2>You reached 2048</h2>
      <div class="bigNum">${score}</div>
      <p class="tag" style="margin-top:8px">Nothing stops you going further.</p>
      <div class="btnRow">
        <button class="primary" data-act="continue">Keep playing</button>
        <button data-act="again">New game</button>
      </div>
    </div>`);
  }

  function updateHud() {
    Shell.readouts([
      { label: 'Score', value: score, accent: true },
      { label: 'Best', value: best || '--' },
      { label: 'Board', value: N + 'x' + N }
    ]);
    Shell.status(score, N + 'x' + N);
  }

  /* ---------- input ---------- */

  const KEYS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down'
  };

  window.addEventListener('keydown', (e) => {
    if (state === 'menu') return;
    if (KEYS[e.code]) { e.preventDefault(); move(KEYS[e.code]); return; }
    if (e.code === 'KeyZ') undo();
    if (e.code === 'KeyR') reset(N);
  });

  Touch.mount(Shell.els.touchpad, { dpad: true });
  Touch.swipe(Shell.els.stageWrap, (dir) => { if (state !== 'menu') move(dir); }, 20);
  let lastTouchDir = '';
  // The d-pad reports a held direction; treat each new direction as one move.
  function pollTouch() {
    const d = Touch.dir;
    const key = d.dx + ',' + d.dy;
    if (key !== lastTouchDir) {
      lastTouchDir = key;
      if (d.dx === -1) move('left');
      else if (d.dx === 1) move('right');
      else if (d.dy === -1) move('up');
      else if (d.dy === 1) move('down');
    }
  }

  /* ---------- loop ---------- */

  function update(dt) {
    pollTouch();
    if (anim < 1) {
      anim = Math.min(1, anim + dt * 1000 / SLIDE_MS);
      if (anim >= 1) afterSlide();
    }
    for (let i = pops.length - 1; i >= 0; i--) {
      pops[i].t += dt * 1000 / POP_MS;
      if (pops[i].t >= 1) pops.splice(i, 1);
    }
  }

  /* ---------- drawing ---------- */

  function metrics() {
    const gap = N <= 4 ? 12 : (N === 5 ? 10 : 8);
    const pad = gap;
    const tile = (SIZE - pad * 2 - gap * (N - 1)) / N;
    return { gap, pad, tile };
  }

  function cellXY(r, c) {
    const m = metrics();
    return { x: m.pad + c * (m.tile + m.gap), y: m.pad + r * (m.tile + m.gap), s: m.tile };
  }

  function draw() {
    const m = metrics();
    ctx.fillStyle = '#20283a';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Empty slots.
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const p = cellXY(r, c);
        ctx.fillStyle = '#2b3550';
        roundRect(ctx, p.x, p.y, p.s, p.s, 6);
        ctx.fill();
      }
    }

    if (anim < 1) {
      const e = 1 - Math.pow(1 - anim, 3);      // ease out
      for (const s of slides) {
        const a = cellXY(Math.floor(s.from / N), s.from % N);
        const b = cellXY(Math.floor(s.to / N), s.to % N);
        drawTile(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, m.tile, s.v, 1);
      }
    } else {
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const v = board[idx(r, c)];
          if (!v) continue;
          const p = cellXY(r, c);
          const pop = pops.find((q) => q.r === r && q.c === c);
          let scale = 1;
          if (pop) {
            scale = pop.isNew
              ? 0.35 + 0.65 * Math.min(1, pop.t * 1.4)
              : 1 + 0.18 * Math.sin(Math.min(1, pop.t) * Math.PI);
          }
          drawTile(p.x, p.y, m.tile, v, scale);
        }
      }
    }
  }

  function drawTile(x, y, s, v, scale) {
    const cx = x + s / 2, cy = y + s / 2;
    const ss = s * scale;
    const col = COLORS[v] || '#4ad46f';
    ctx.save();
    ctx.translate(cx, cy);
    roundRect(ctx, -ss / 2, -ss / 2, ss, ss, 6);
    const g = ctx.createLinearGradient(0, -ss / 2, 0, ss / 2);
    g.addColorStop(0, lighten(col, 0.16));
    g.addColorStop(1, col);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const digits = String(v).length;
    const fs = ss * (digits <= 2 ? 0.44 : digits === 3 ? 0.34 : digits === 4 ? 0.27 : 0.22);
    ctx.fillStyle = v <= 4 ? '#28304a' : '#ffffff';
    ctx.font = '700 ' + fs.toFixed(1) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(v, 0, 1);
    ctx.restore();
  }

  function lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) + amt * 255);
    const g = Math.min(255, ((n >> 8) & 255) + amt * 255);
    const b = Math.min(255, (n & 255) + amt * 255);
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    board = new Array(N * N).fill(0);
    Shell.readouts([{ label: 'Best 4x4', value: Scores.label('merge', 'n4') },
                    { label: 'Best 5x5', value: Scores.label('merge', 'n5') },
                    { label: 'Best 6x6', value: Scores.label('merge', 'n6') }]);
    Shell.status('', '');
    Shell.startCard({
      blurb: 'Slide tiles together, combine matching numbers, reach 2048.',
      extra: `<div class="rowBetween"><span>Board size</span><div class="seg">${
        [4, 5, 6].map((n) => `<button data-act="size" data-n="${n}" class="${N === n ? 'on' : ''}">${n}x${n}</button>`).join('')
      }</div></div>`,
      buttons: [{ label: 'Play', act: 'again', primary: true }]
    });
  }

  Shell.on({
    again: () => reset(N),
    menu: () => showMenu(),
    size: (el) => { N = +el.dataset.n; showMenu(); },
    continue: () => { keepPlaying = true; state = 'play'; Shell.hide(); }
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyMerge = {
    get state() { return state; },
    get score() { return score; },
    board: () => board,
    setBoard(v) { board = v.slice(); N = Math.round(Math.sqrt(v.length)); },
    move, undo, reset, hasMove,
    finish() { anim = 1; afterSlide(); },
    lineCells
  };
})();
