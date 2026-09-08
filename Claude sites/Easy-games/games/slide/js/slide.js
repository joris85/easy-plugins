'use strict';

/* Easy Slide, the fifteen puzzle.

   Half of all random arrangements of a sliding puzzle are unsolvable. The parity
   rule for a 4x4 board: count inversions across the tiles read in row-major
   order ignoring the blank, then the position is solvable if either the blank
   sits on an even row counted from the bottom and the inversion count is odd, or
   the blank sits on an odd row from the bottom and the count is even.

   We never rely on that at shuffle time though. Scrambling by applying random
   legal moves to a solved board is solvable by construction, and the move count
   doubles as a difficulty measure. The parity test is kept below because it is
   the honest way to validate the shuffler, and the tests use it. */

(function () {
  const SIZE = 520;
  const SLIDE_MS = 90;

  let N = 4;
  let board = [];            // values 1..N*N-1, 0 is the gap
  let moves = 0;
  let startedAt = 0;
  let elapsed = 0;
  let state = 'menu';        // menu | play | won
  let slide = null;          // { cells:[{v,fromR,fromC,toR,toC}], t }

  Shell.mount({
    name: 'Slide',
    width: SIZE, height: SIZE, max: 520, pad: 260,
    tools: ['sound', 'help'],
    foot: 'Click a tile in line with the gap &middot; <b>arrows</b> also work &middot; <b>R</b> reshuffles',
    rules: `
      <ul>
        <li>Slide the numbered tiles until they read in order, with the gap last.</li>
        <li>Click any tile in the same row or column as the gap. The whole run of
            tiles between them slides at once, so you rarely need single steps.</li>
        <li>Arrow keys move a tile into the gap from that direction.</li>
      </ul>
      <p>Worth knowing: exactly half of all possible arrangements of a sliding puzzle
         cannot be solved at all, no matter how long you work at them. Every board
         here is scrambled by making real moves from a solved position, so it is
         always solvable.</p>`
  });

  Input.init();
  Input.claim(['KeyR']);
  const ctx = Shell.ctx;

  const idx = (r, c) => r * N + c;
  const gapIndex = () => board.indexOf(0);

  /* ---------- rules ---------- */

  function solved() {
    for (let i = 0; i < N * N - 1; i++) if (board[i] !== i + 1) return false;
    return board[N * N - 1] === 0;
  }

  /** The classic parity test, used to validate the shuffler. */
  function solvable(arr, n) {
    const vals = arr.filter((v) => v !== 0);
    let inv = 0;
    for (let i = 0; i < vals.length; i++) {
      for (let j = i + 1; j < vals.length; j++) if (vals[i] > vals[j]) inv++;
    }
    if (n % 2 === 1) return inv % 2 === 0;
    const gapRow = Math.floor(arr.indexOf(0) / n);
    const rowFromBottom = n - gapRow;             // 1 based, counted from the bottom
    return (rowFromBottom % 2 === 0) ? (inv % 2 === 1) : (inv % 2 === 0);
  }

  function legalNeighbours() {
    const g = gapIndex();
    const gr = Math.floor(g / N), gc = g % N;
    const out = [];
    if (gr > 0) out.push(idx(gr - 1, gc));
    if (gr < N - 1) out.push(idx(gr + 1, gc));
    if (gc > 0) out.push(idx(gr, gc - 1));
    if (gc < N - 1) out.push(idx(gr, gc + 1));
    return out;
  }

  function shuffle(n, steps) {
    N = n;
    board = [];
    for (let i = 1; i < N * N; i++) board.push(i);
    board.push(0);
    let last = -1;
    for (let s = 0; s < steps; s++) {
      const opts = legalNeighbours().filter((i) => i !== last);
      const chosen = pick(opts.length ? opts : legalNeighbours());
      last = gapIndex();
      board[gapIndex()] = board[chosen];
      board[chosen] = 0;
    }
    if (solved()) return shuffle(n, steps);      // a scramble can undo itself
    return board;
  }

  /* ---------- moving ---------- */

  /** Slide the run of tiles between the gap and (r,c). Returns how many moved. */
  function push(r, c) {
    if (state !== 'play' || slide) return 0;
    const g = gapIndex();
    const gr = Math.floor(g / N), gc = g % N;
    if (r !== gr && c !== gc) return 0;

    const cells = [];
    if (r === gr) {
      const step = c > gc ? 1 : -1;
      for (let x = gc + step; step > 0 ? x <= c : x >= c; x += step) {
        cells.push({ v: board[idx(r, x)], fromR: r, fromC: x, toR: r, toC: x - step });
      }
    } else {
      const step = r > gr ? 1 : -1;
      for (let y = gr + step; step > 0 ? y <= r : y >= r; y += step) {
        cells.push({ v: board[idx(y, c)], fromR: y, fromC: c, toR: y - step, toC: c });
      }
    }
    if (!cells.length) return 0;

    for (const cell of cells) board[idx(cell.toR, cell.toC)] = cell.v;
    board[idx(r, c)] = 0;

    slide = { cells, t: 0 };
    moves++;
    if (!startedAt) startedAt = performance.now();
    Sfx.kick();
    updateHud();
    return cells.length;
  }

  /** Arrow keys: pull the tile from that side of the gap into it. */
  function pushDir(dx, dy) {
    const g = gapIndex();
    const gr = Math.floor(g / N), gc = g % N;
    const r = gr - dy, c = gc - dx;
    if (r < 0 || c < 0 || r >= N || c >= N) return;
    push(r, c);
  }

  function finishSlide() {
    slide = null;
    if (solved()) win();
  }

  function win() {
    state = 'won';
    elapsed = (performance.now() - startedAt) / 1000;
    Sfx.win();
    const res = Scores.submit('slide', moves, { variant: 'n' + N, lower: true });
    Shell.gameOverCard({
      title: 'Solved',
      scoreLabel: 'Moves',
      score: moves,
      isNew: res.isNew && res.previous !== null,
      best: Scores.label('slide', 'n' + N),
      extra: `<p class="tag" style="margin-top:8px">Time ${elapsed.toFixed(1)}s</p>`,
      buttons: [{ label: 'New shuffle', act: 'again', primary: true }, { label: 'Change size', act: 'menu' }]
    });
  }

  function newGame(n) {
    N = n || N;
    shuffle(N, N === 3 ? 400 : N === 4 ? 1200 : 2500);
    moves = 0;
    startedAt = 0;
    elapsed = 0;
    slide = null;
    state = 'play';
    Shell.hide();
    updateHud();
  }

  function updateHud() {
    const secs = startedAt ? (performance.now() - startedAt) / 1000 : 0;
    Shell.readouts([
      { label: 'Moves', value: moves, accent: true },
      { label: 'Time', value: secs.toFixed(0) + 's' },
      { label: 'Best moves', value: Scores.label('slide', 'n' + N) }
    ]);
    Shell.status(moves, N + 'x' + N);
  }

  /* ---------- input ---------- */

  function metrics() {
    const gap = 8, pad = 20;
    const tile = (SIZE - pad * 2 - gap * (N - 1)) / N;
    return { gap, pad, tile };
  }

  function cellAt(px, py) {
    const m = metrics();
    const c = Math.floor((px - m.pad) / (m.tile + m.gap));
    const r = Math.floor((py - m.pad) / (m.tile + m.gap));
    if (r < 0 || c < 0 || r >= N || c >= N) return null;
    return { r, c };
  }

  Shell.canvas.addEventListener('pointerdown', (e) => {
    const p = Touch.canvasPos(Shell.canvas, e);
    const cell = cellAt(p.x, p.y);
    if (cell) push(cell.r, cell.c);
  });

  const ARROWS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  window.addEventListener('keydown', (e) => {
    if (state !== 'play') return;
    if (ARROWS[e.code]) { e.preventDefault(); pushDir(ARROWS[e.code][0], ARROWS[e.code][1]); }
    if (e.code === 'KeyR') newGame(N);
  });

  Touch.swipe(Shell.els.stageWrap, (dir) => {
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    if (state === 'play') pushDir(map[dir][0], map[dir][1]);
  }, 18);

  /* ---------- drawing ---------- */

  function tileXY(r, c) {
    const m = metrics();
    return { x: m.pad + c * (m.tile + m.gap), y: m.pad + r * (m.tile + m.gap), s: m.tile };
  }

  function update(dt) {
    if (slide) {
      slide.t += dt * 1000 / SLIDE_MS;
      if (slide.t >= 1) finishSlide();
    }
    if (state === 'play' && startedAt && Loop.frames % 30 === 0) updateHud();
  }

  function draw() {
    const m = metrics();
    ctx.fillStyle = '#1a2231';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#141b28';
    roundRect(ctx, m.pad - 8, m.pad - 8, SIZE - (m.pad - 8) * 2, SIZE - (m.pad - 8) * 2, 12);
    ctx.fill();

    const moving = slide ? slide.cells.map((c) => c.v) : [];

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = board[idx(r, c)];
        if (!v || moving.indexOf(v) !== -1) continue;
        const p = tileXY(r, c);
        drawTile(p.x, p.y, p.s, v);
      }
    }

    if (slide) {
      const e = 1 - Math.pow(1 - Math.min(1, slide.t), 3);
      for (const cell of slide.cells) {
        const a = tileXY(cell.fromR, cell.fromC);
        const b = tileXY(cell.toR, cell.toC);
        drawTile(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, a.s, cell.v);
      }
    }
  }

  function drawTile(x, y, s, v) {
    const home = v === 0 ? false : (board.indexOf(v) === v - 1);
    const g = ctx.createLinearGradient(x, y, x, y + s);
    if (home) { g.addColorStop(0, '#4fd07a'); g.addColorStop(1, '#2a9a52'); }
    else { g.addColorStop(0, '#48597e'); g.addColorStop(1, '#334463'); }
    ctx.fillStyle = g;
    roundRect(ctx, x, y, s, s, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    roundRect(ctx, x + s * .12, y + s * .09, s * .76, s * .16, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 ' + (s * (String(v).length > 1 ? 0.4 : 0.48)).toFixed(1) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(v, x + s / 2, y + s / 2 + 1);
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    N = N || 4;
    board = [];
    for (let i = 1; i < N * N; i++) board.push(i);
    board.push(0);
    Shell.status('', '');
    Shell.readouts([3, 4, 5].map((n) => ({ label: 'Best ' + n + 'x' + n, value: Scores.label('slide', 'n' + n) })));
    Shell.startCard({
      blurb: 'Put the tiles back in order. The gap goes last.',
      extra: `<div class="rowBetween"><span>Board</span><div class="seg">${
        [3, 4, 5].map((n) => `<button data-act="size" data-n="${n}" class="${N === n ? 'on' : ''}">${n}x${n}</button>`).join('')
      }</div></div>`,
      buttons: [{ label: 'Shuffle and play', act: 'again', primary: true }]
    });
  }

  Shell.on({
    again: () => newGame(N),
    menu: () => showMenu(),
    size: (el) => { N = +el.dataset.n; showMenu(); }
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasySlide = {
    get state() { return state; },
    get moves() { return moves; },
    board: () => board,
    setBoard(v, n) { board = v.slice(); N = n || Math.round(Math.sqrt(v.length)); },
    setN(n) { N = n; },
    shuffle, solvable, solved, push, pushDir, newGame,
    finish() { if (slide) { slide.t = 1; finishSlide(); } }
  };
})();
