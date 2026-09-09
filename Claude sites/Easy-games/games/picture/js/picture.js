'use strict';

/* Easy Picture.

   The controller: a grid with clue gutters on canvas, painting by pointer, and
   the reveal at the end. Every decision about what is true lives in rules.js;
   this file only asks it questions and draws the answers.

   Three things make a nonogram feel right to play, and all three are here:

   1. Drag painting locks to a line. The first cell you leave the origin
      towards decides row or column, and the stroke stays on it however wobbly
      the hand. Fast drags that skip cells are filled in, so nothing is missed.

   2. A stroke only overwrites cells that were in the origin cell's state.
      Dragging a fill across a row with crosses in it leaves the crosses alone,
      and dragging "clear" over a mix clears only what you started on.

   3. Every stroke is one undo step, including any crosses the assist added
      for it, so Z takes back exactly what you just did and nothing more. */

(function () {
  const R = PictureRules;
  const UNKNOWN = R.UNKNOWN, FILL = R.FILL, CROSS = R.CROSS;

  const SIZES = { 5: 64, 10: 44, 15: 34, 20: 27 };     // cell pixels per board size
  const SOURCES = { library: 'Library', random: 'Random', daily: 'Daily' };

  let N = 10;
  let source = 'library';
  let mistakesOn = true;
  let autoCross = true;

  let puzzle = null;
  let board = [];
  let state = 'menu';          // menu | play | won
  let startedAt = 0, elapsed = 0;
  let mistakes = 0;
  let tool = 'fill';           // fill | cross, for touch and for the left button
  let undoStack = [];
  let stroke = null;           // the drag in progress
  let cursor = null;           // hovered cell, mouse only
  let flashes = [];            // wrong cells, fading red
  let revealT = 0;             // seconds since the win
  let cardShown = false;
  let played = {};             // library names already seen this session, by size
  let G = null;                // geometry, see layout()
  let lastTick = 0;

  Shell.mount({
    name: 'Picture',
    width: 560, height: 560, max: 720, pad: 250,
    tools: ['sound', 'help'],
    foot: 'Left click paints, right click crosses, drag along a line &middot; <b>X</b> swaps the tool &middot; <b>Z</b> undoes &middot; <b>R</b> for a new picture',
    rules: `
      <ul>
        <li>The numbers beside a row or above a column are the lengths of its runs of
            filled cells, in order, with at least one empty cell between runs.
            <b>2 1</b> means a run of two, a gap, then a single.</li>
        <li>Paint a cell you are sure is filled. Cross a cell you are sure is empty;
            crosses are your notes and are never checked.</li>
        <li>Drag to paint a whole run. The stroke locks to the row or column you
            start along, and it only changes cells that matched the one you started on.</li>
        <li>Every picture here is solvable by <b>pure logic</b>, one line at a time.
            If you find yourself guessing, look again at the crossing lines.</li>
        <li>With <b>Show mistakes</b> on, painting an empty cell is counted, flashed red
            and left as a cross. With it off, nothing is said until the picture is done.</li>
        <li><b>Auto-cross</b> fills the rest of a line with crosses once its painted
            runs match the clue exactly.</li>
      </ul>
      <p>The Daily picture is the same for everyone on the same date. The Library
         is hand drawn; Random pictures are drawn fresh and checked by the solver.</p>`
  });

  Input.init();
  Input.claim(['KeyX', 'KeyZ', 'KeyR']);
  const ctx = Shell.ctx;

  const idx = (r, c) => r * N + c;

  /* ---------- geometry ---------- */

  /** Clue gutters grow with the longest clue, so nothing is ever clipped. */
  function layout() {
    const cell = SIZES[N] || 34;
    const slot = Math.max(14, Math.round(cell * 0.62));
    let rowMax = 1, colMax = 1;
    if (puzzle) {
      for (const cl of puzzle.clues.rows) rowMax = Math.max(rowMax, cl.length);
      for (const cl of puzzle.clues.cols) colMax = Math.max(colMax, cl.length);
    }
    const gutterL = Math.max(cell, rowMax * slot + 14);
    const gutterT = Math.max(cell, colMax * slot + 14);
    const W = gutterL + N * cell + 4, H = gutterT + N * cell + 4;
    G = { cell, slot, gutterL, gutterT, W, H };
    Shell.resize(W, H, Math.min(760, W));
  }

  function cellAt(px, py, clampToGrid) {
    let c = Math.floor((px - G.gutterL) / G.cell);
    let r = Math.floor((py - G.gutterT) / G.cell);
    if (clampToGrid) {
      r = clamp(r, 0, N - 1);
      c = clamp(c, 0, N - 1);
    }
    if (r < 0 || c < 0 || r >= N || c >= N) return null;
    return { r, c };
  }

  /* ---------- setup ---------- */

  function difficultyWord(passes) {
    if (passes <= 2) return 'Gentle';
    if (passes <= 4) return 'Steady';
    if (passes <= 6) return 'Thoughtful';
    return 'Tough';
  }

  function pickLibrary() {
    const all = R.libraryFor(N);
    if (!all.length) return null;
    const seen = played[N] || (played[N] = new Set());
    let pool = all.filter((p) => !seen.has(p.name + p.id));
    // Everything seen once: start the round again rather than repeating early.
    if (!pool.length) { seen.clear(); pool = all; }
    const p = pick(pool);
    seen.add(p.name + p.id);
    return p;
  }

  function makePuzzle() {
    if (source === 'daily') return R.dailyPuzzle(N, R.dateKey());
    if (source === 'library') {
      const p = pickLibrary();
      if (p) {
        if (p.passes == null) p.passes = R.gradePicture(p).passes;
        return p;
      }
    }
    const g = R.generate(N, R.makeRng((Math.random() * 4294967296) >>> 0));
    return R.makePuzzle(g.pic, { name: 'Random picture', source: 'random', passes: g.passes });
  }

  function newGame() {
    if (source === 'library' && !R.libraryFor(N).length) source = 'random';
    puzzle = makePuzzle();
    board = R.emptyBoard(puzzle);
    undoStack = [];
    stroke = null;
    flashes = [];
    mistakes = 0;
    revealT = 0;
    cardShown = false;
    startedAt = performance.now();
    elapsed = 0;
    state = 'play';
    layout();
    Shell.hide();
    updateHud();
  }

  /* ---------- strokes ---------- */

  function beginStroke(r, c, to) {
    const i = idx(r, c);
    const from = board[i];
    // Clicking a cell that already holds the tool's mark clears it.
    const target = from === to ? UNKNOWN : to;
    stroke = { from, to: target, r0: r, c0: c, last: { r, c }, axis: null, changes: [], rows: new Set(), cols: new Set(), dead: false };
    paintCell(r, c);
  }

  function paintCell(r, c) {
    if (!stroke || stroke.dead) return;
    const i = idx(r, c);
    if (board[i] !== stroke.from) return;         // only cells like the origin
    let to = stroke.to;
    if (to === FILL && mistakesOn && !puzzle.cells[i]) {
      // A wrong fill: count it, flash it, leave a cross so it is not tried
      // twice, and stop the stroke so a fast drag cannot rack up several.
      mistakes++;
      flashes.push({ i, t: 0 });
      Sfx.bad();
      to = CROSS;
      stroke.dead = true;
    } else {
      const now = performance.now();
      if (now - lastTick > 40) {
        lastTick = now;
        if (to === FILL) Sfx.tick(false);
        else Sfx.tone({ type: 'triangle', from: 330, to: 330, dur: 0.04, vol: 0.08 });
      }
    }
    if (to === board[i]) return;
    stroke.changes.push({ i, from: board[i], to });
    board[i] = to;
    stroke.rows.add(r);
    stroke.cols.add(c);
  }

  /** Extend the stroke to a cell, locking to a line and filling skipped cells. */
  function extendStroke(r, c) {
    if (!stroke) return;
    if (!stroke.axis) {
      if (r === stroke.r0 && c === stroke.c0) return;
      if (r === stroke.r0) stroke.axis = 'row';
      else if (c === stroke.c0) stroke.axis = 'col';
      else stroke.axis = Math.abs(r - stroke.r0) > Math.abs(c - stroke.c0) ? 'col' : 'row';
    }
    if (stroke.axis === 'row') r = stroke.r0; else c = stroke.c0;
    const last = stroke.last;
    if (last.r === r && last.c === c) return;
    const dr = Math.sign(r - last.r), dc = Math.sign(c - last.c);
    let rr = last.r, cc = last.c;
    while (rr !== r || cc !== c) {
      rr += dr; cc += dc;
      paintCell(rr, cc);
    }
    stroke.last = { r, c };
  }

  function endStroke() {
    if (!stroke) return;
    const s = stroke;
    stroke = null;
    if (autoCross) {
      for (const r of s.rows) crossCompleted('row', r, s.changes);
      for (const c of s.cols) crossCompleted('col', c, s.changes);
    }
    if (s.changes.length) {
      undoStack.push(s.changes);
      if (undoStack.length > 300) undoStack.shift();
    }
    updateHud();
    if (R.isSolved(puzzle, board)) win();
  }

  /** The assist: a line whose painted runs match its clue gets its gaps crossed. */
  function crossCompleted(kind, index, changes) {
    const clue = kind === 'row' ? puzzle.clues.rows[index] : puzzle.clues.cols[index];
    const line = R.lineOf(board, puzzle, kind, index);
    if (!R.lineComplete(clue, line)) return;
    for (let k = 0; k < line.length; k++) {
      if (line[k] !== UNKNOWN) continue;
      const i = kind === 'row' ? idx(index, k) : idx(k, index);
      changes.push({ i, from: UNKNOWN, to: CROSS });
      board[i] = CROSS;
    }
  }

  function undo() {
    if (state !== 'play' || stroke || !undoStack.length) return;
    const changes = undoStack.pop();
    for (let k = changes.length - 1; k >= 0; k--) board[changes[k].i] = changes[k].from;
    Sfx.kick();
    updateHud();
  }

  /** One cell in one stroke, for the console and the tests. */
  function paint(r, c, kind) {
    if (state !== 'play') return;
    beginStroke(r, c, kind === 'cross' ? CROSS : (kind === 'clear' ? board[idx(r, c)] : FILL));
    endStroke();
  }

  function paintLine(r0, c0, r1, c1, kind) {
    if (state !== 'play') return;
    beginStroke(r0, c0, kind === 'cross' ? CROSS : FILL);
    extendStroke(r1, c1);
    endStroke();
  }

  /* ---------- the end ---------- */

  function win() {
    state = 'won';
    elapsed = (performance.now() - startedAt) / 1000;
    revealT = 0;
    cardShown = false;
    Sfx.win();
    if (puzzle.source === 'library') Shell.banner(puzzle.name);
    updateHud();
  }

  function showWinCard() {
    cardShown = true;
    const res = Scores.submit('picture', elapsed, { variant: 'n' + N, lower: true });
    const title = puzzle.source === 'library' ? 'It is a ' + puzzle.name.toLowerCase()
                : puzzle.source === 'daily' ? 'Daily picture done' : 'Picture complete';
    const mist = !mistakesOn ? 'Mistakes were not shown.'
               : mistakes === 0 ? 'Not a single mistake.'
               : mistakes === 1 ? 'One mistake along the way.' : mistakes + ' mistakes along the way.';
    Shell.gameOverCard({
      title,
      scoreLabel: 'Time',
      score: fmtTime(elapsed),
      isNew: res.isNew && res.previous !== null,
      best: Scores.label('picture', 'n' + N, fmtTime),
      extra: `<p class="tag" style="margin-top:8px">${mist} ${difficultyWord(puzzle.passes || 0)} puzzle, ${N}x${N}.</p>`,
      buttons: [{ label: 'Next picture', act: 'again', primary: true }, { label: 'Change size', act: 'menu' }]
    });
  }

  function updateHud() {
    const secs = state === 'play' ? (performance.now() - startedAt) / 1000 : elapsed;
    const items = [
      { label: 'Time', value: fmtTime(secs), accent: true },
      { label: 'Filled', value: R.countFilled(board) + ' / ' + (puzzle ? R.countPicture(puzzle) : 0) }
    ];
    if (mistakesOn) items.push({ label: 'Mistakes', value: mistakes });
    else items.push({ label: 'Tool', value: tool === 'fill' ? 'Fill' : 'Cross' });
    items.push({ label: 'Difficulty', value: puzzle ? difficultyWord(puzzle.passes || 0) : '--' });
    items.push({ label: 'Best', value: Scores.label('picture', 'n' + N, fmtTime) });
    Shell.readouts(items);
    Shell.status(fmtTime(secs), N + 'x' + N + ' ' + (puzzle ? SOURCES[puzzle.source] || '' : ''));
  }

  /* ---------- input ---------- */

  Shell.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  Shell.canvas.addEventListener('pointerdown', (e) => {
    if (state !== 'play') return;
    const p = Touch.canvasPos(Shell.canvas, e);
    const at = cellAt(p.x, p.y, false);
    if (!at) return;
    e.preventDefault();
    try { Shell.canvas.setPointerCapture(e.pointerId); } catch (err) { /* not all browsers */ }
    if (e.pointerType === 'touch') cursor = null;
    // The right button always does the other thing, whichever tool is chosen.
    const useCross = e.button === 2 ? tool !== 'cross' : tool === 'cross';
    beginStroke(at.r, at.c, useCross ? CROSS : FILL);
  });

  Shell.canvas.addEventListener('pointermove', (e) => {
    const p = Touch.canvasPos(Shell.canvas, e);
    if (e.pointerType !== 'touch') cursor = cellAt(p.x, p.y, false);
    if (stroke) {
      // Past the edge still paints to the edge, which is how a hand drags.
      const at = cellAt(p.x, p.y, true);
      if (at) extendStroke(at.r, at.c);
    }
  });

  const finish = () => { if (stroke) endStroke(); };
  Shell.canvas.addEventListener('pointerup', finish);
  Shell.canvas.addEventListener('pointercancel', finish);
  Shell.canvas.addEventListener('lostpointercapture', finish);
  Shell.canvas.addEventListener('pointerleave', () => { cursor = null; });

  window.addEventListener('keydown', (e) => {
    if (state === 'menu' || Shell.isOpen()) return;
    if (e.code === 'KeyX') setTool(tool === 'fill' ? 'cross' : 'fill');
    if (e.code === 'KeyZ') undo();
    if (e.code === 'KeyR') newGame();
  });

  function setTool(t) {
    tool = t;
    const b = document.getElementById('toolBtn');
    if (b) { b.textContent = 'Tool: ' + (tool === 'fill' ? 'fill' : 'cross'); b.classList.toggle('primary', tool === 'cross'); }
    if (state !== 'menu') updateHud();
  }

  // Touch has no right button, so the tool toggle and undo live in the bar.
  (function addButtons() {
    const u = document.createElement('button');
    u.type = 'button';
    u.textContent = 'Undo';
    u.addEventListener('click', undo);
    Shell.els.tools.insertBefore(u, Shell.els.tools.firstChild);
    const b = document.createElement('button');
    b.id = 'toolBtn';
    b.type = 'button';
    b.textContent = 'Tool: fill';
    b.addEventListener('click', () => setTool(tool === 'fill' ? 'cross' : 'fill'));
    Shell.els.tools.insertBefore(b, Shell.els.tools.firstChild);
  })();

  /* ---------- drawing ---------- */

  const COL = {
    bg: '#1a2231', gutter: '#141b2a', unknown: '#232d40', unknownHot: '#2c3850',
    fill: '#dbe4f6', done: '#5be07f', cross: '#5c6c90', text: '#e8edfa', dim: '#4f5e7e',
    line: 'rgba(255,255,255,.07)', bold: 'rgba(255,255,255,.22)', band: 'rgba(255,255,255,.045)'
  };

  function draw(dt) {
    const d = dt || 0.016;
    for (let k = flashes.length - 1; k >= 0; k--) {
      flashes[k].t += d * 1.6;
      if (flashes[k].t >= 1) flashes.splice(k, 1);
    }
    if (!G) layout();
    const { cell, slot, gutterL, gutterT, W, H } = G;
    const reveal = state === 'won' ? clamp(revealT / 0.9, 0, 1) : 0;
    const ease = reveal * reveal * (3 - 2 * reveal);

    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = COL.gutter;
    ctx.fillRect(0, 0, W, gutterT);
    ctx.fillRect(0, 0, gutterL, H);

    if (!puzzle) return;

    // The active row and column get a band across grid and gutter both, so the
    // eye can follow a long line to its numbers without losing the place.
    if (cursor && state === 'play') {
      ctx.fillStyle = COL.band;
      ctx.fillRect(0, gutterT + cursor.r * cell, W, cell);
      ctx.fillRect(gutterL + cursor.c * cell, 0, cell, H);
    }

    // Cells.
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const i = idx(r, c);
        const x = gutterL + c * cell, y = gutterT + r * cell;
        const v = board[i];
        const hot = cursor && state === 'play' && (cursor.r === r || cursor.c === c);
        ctx.fillStyle = hot ? COL.unknownHot : COL.unknown;
        ctx.fillRect(x, y, cell, cell);
        if (v === FILL) {
          if (ease < 1) {
            ctx.fillStyle = COL.fill;
            ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
          }
          if (ease > 0) {
            // The reveal: cells swell into rounded green tiles with a glow.
            ctx.globalAlpha = ease;
            ctx.shadowColor = 'rgba(91,224,127,.55)';
            ctx.shadowBlur = cell * 0.5 * ease;
            ctx.fillStyle = COL.done;
            roundRect(ctx, x + 0.5, y + 0.5, cell - 1, cell - 1, cell * 0.22 * ease);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
          }
        } else if (v === CROSS && ease < 1) {
          ctx.globalAlpha = 1 - ease;
          ctx.strokeStyle = COL.cross;
          ctx.lineWidth = Math.max(1.5, cell * 0.07);
          ctx.lineCap = 'round';
          const m = cell * 0.3;
          ctx.beginPath();
          ctx.moveTo(x + m, y + m); ctx.lineTo(x + cell - m, y + cell - m);
          ctx.moveTo(x + cell - m, y + m); ctx.lineTo(x + m, y + cell - m);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    // Wrong fills flash red and fade.
    for (const f of flashes) {
      const r = Math.floor(f.i / N), c = f.i % N;
      ctx.fillStyle = 'rgba(255,84,112,' + (0.7 * (1 - f.t)).toFixed(3) + ')';
      ctx.fillRect(gutterL + c * cell, gutterT + r * cell, cell, cell);
    }

    // Grid lines, heavier every five so runs can be counted at a glance.
    if (ease < 1) {
      ctx.globalAlpha = 1 - ease;
      for (let k = 0; k <= N; k++) {
        const bold = k % 5 === 0;
        ctx.strokeStyle = bold ? COL.bold : COL.line;
        ctx.lineWidth = bold ? 2 : 1;
        const gx = gutterL + k * cell + (bold ? 0 : 0.5);
        const gy = gutterT + k * cell + (bold ? 0 : 0.5);
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, gutterT + N * cell); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(gutterL + N * cell, gy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Clues. Numbers already accounted for are dimmed; a finished line is all dim.
    ctx.font = '700 ' + Math.round(cell * 0.44) + 'px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < N; r++) {
      const clue = puzzle.clues.rows[r];
      const line = R.lineOf(board, puzzle, 'row', r);
      const marks = R.clueMarks(clue, line);
      const active = cursor && cursor.r === r && state === 'play';
      const y = gutterT + r * cell + cell / 2 + 1;
      if (!clue.length) { ctx.fillStyle = COL.dim; ctx.fillText('0', gutterL - 8 - slot / 2, y); continue; }
      for (let k = 0; k < clue.length; k++) {
        const fromEnd = clue.length - 1 - k;
        ctx.fillStyle = marks[k] ? COL.dim : (active ? '#ffd27a' : COL.text);
        ctx.fillText(clue[k], gutterL - 8 - slot / 2 - fromEnd * slot, y);
      }
    }
    for (let c = 0; c < N; c++) {
      const clue = puzzle.clues.cols[c];
      const line = R.lineOf(board, puzzle, 'col', c);
      const marks = R.clueMarks(clue, line);
      const active = cursor && cursor.c === c && state === 'play';
      const x = gutterL + c * cell + cell / 2;
      if (!clue.length) { ctx.fillStyle = COL.dim; ctx.fillText('0', x, gutterT - 8 - slot / 2); continue; }
      for (let k = 0; k < clue.length; k++) {
        const fromEnd = clue.length - 1 - k;
        ctx.fillStyle = marks[k] ? COL.dim : (active ? '#ffd27a' : COL.text);
        ctx.fillText(clue[k], x, gutterT - 8 - slot / 2 - fromEnd * slot + 1);
      }
    }
  }

  function update(dt) {
    if (state === 'play' && Loop.frames % 30 === 0) updateHud();
    if (state === 'won') {
      revealT += dt;
      if (revealT > 1.5 && !cardShown) showWinCard();
    }
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    stroke = null;
    cursor = null;
    if (source === 'library' && !R.libraryFor(N).length) source = 'random';
    // A finished picture sits under the card, so the idea is visible at once.
    const teaser = R.generate(N, R.makeRng(7 + N));
    puzzle = R.makePuzzle(teaser.pic, { name: 'Teaser', source: 'random', passes: teaser.passes });
    board = puzzle.cells.map((v) => (v ? FILL : UNKNOWN));
    revealT = 10;
    layout();
    Shell.status('', '');
    Shell.readouts(Object.keys(SIZES).map((n) => ({ label: 'Best ' + n + 'x' + n, value: Scores.label('picture', 'n' + n, fmtTime) })));

    const libCount = R.libraryFor(N).length;
    const note = source === 'library' ? libCount + ' hand drawn pictures at this size'
               : source === 'daily' ? 'Everyone gets the same picture today, ' + R.dateKey()
               : 'Drawn fresh and checked by the solver';
    const seg = (name, act, opts, cur) => `<div class="rowBetween"><span>${name}</span><div class="seg">${
      opts.map((o) => `<button data-act="${act}" data-v="${o.v}" class="${cur === o.v ? 'on' : ''} ${o.off ? 'off' : ''}">${o.label}</button>`).join('')
    }</div></div>`;
    Shell.startCard({
      blurb: 'Number clues hide a picture. Every one is solvable by pure logic.',
      extra: seg('Size', 'size', Object.keys(SIZES).map((n) => ({ v: n, label: n + 'x' + n })), String(N))
           + seg('Picture', 'source', [
               { v: 'library', label: 'Library', off: !libCount },
               { v: 'random', label: 'Random' },
               { v: 'daily', label: 'Daily' }], source)
           + seg('Show mistakes', 'mistakes', [{ v: '1', label: 'On' }, { v: '0', label: 'Off' }], mistakesOn ? '1' : '0')
           + seg('Auto-cross', 'auto', [{ v: '1', label: 'On' }, { v: '0', label: 'Off' }], autoCross ? '1' : '0')
           + `<div class="rowBetween"><span>Note</span><b style="color:var(--text);text-align:right">${note}</b></div>`,
      buttons: [{ label: 'Play', act: 'again', primary: true }]
    });
  }

  Shell.on({
    again: () => newGame(),
    menu: () => showMenu(),
    size: (el) => { N = +el.dataset.v; showMenu(); },
    source: (el) => { if (!el.classList.contains('off')) { source = el.dataset.v; showMenu(); } },
    mistakes: (el) => { mistakesOn = el.dataset.v === '1'; showMenu(); },
    auto: (el) => { autoCross = el.dataset.v === '1'; showMenu(); }
  });

  // The reveal animation is draw-time, so the board is drawn while the card
  // is open too; the loop keeps running on a hidden tab for the timer.
  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyPicture = {
    rules: R,
    get state() { return state; },
    get puzzle() { return puzzle; },
    get board() { return board; },
    get mistakes() { return mistakes; },
    get tool() { return tool; },
    get undoDepth() { return undoStack.length; },
    setSize(n) { N = n; },
    setSource(s) { source = s; },
    setMistakes(on) { mistakesOn = !!on; },
    setAutoCross(on) { autoCross = !!on; },
    newGame, showMenu, paint, paintLine, undo, setTool,
    /** Paint the whole picture in, one stroke per row, to watch the reveal. */
    fillAll() {
      if (state !== 'play') return;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) if (puzzle.cells[idx(r, c)] && board[idx(r, c)] !== FILL) paint(r, c, 'fill');
      }
    }
  };
})();
