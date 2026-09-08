'use strict';

/* Easy Mines.

   Two details separate a good minesweeper from a bad one, and both are here:

   1. First click safe. Mines are placed AFTER the first click, excluding the
      clicked cell and all eight of its neighbours, so the opening click always
      reveals a region rather than a lone number.

   2. Chording. Clicking a revealed number that already carries exactly that many
      flags reveals every other neighbour at once. It is the core speed technique
      and its absence makes the game feel broken to anyone who plays seriously.
      Bound to left+right together, middle click, and double tap on touch. */

(function () {
  const LEVELS = {
    beginner:     { cols: 9,  rows: 9,  mines: 10, cell: 34, label: 'Beginner' },
    intermediate: { cols: 16, rows: 16, mines: 40, cell: 30, label: 'Intermediate' },
    expert:       { cols: 30, rows: 16, mines: 99, cell: 26, label: 'Expert' }
  };

  const NUM_COLORS = ['', '#6fb4ff', '#5cd68a', '#ff6b7d', '#b98cff',
                      '#ff9038', '#3fe0d0', '#e8edfa', '#8f9cba'];

  let L = LEVELS.beginner;
  let levelKey = 'beginner';
  let cols, rows, mineCount, cell;
  let mine = [], open = [], flag = [], near = [];
  let placed = false;          // mines are laid on the first click
  let state = 'menu';          // menu | play | lost | won
  let startedAt = 0, elapsed = 0;
  let fatal = -1;
  let flagMode = false;
  let cursor = null;

  Shell.mount({
    name: 'Mines',
    width: 9 * 34, height: 9 * 34, max: 720, pad: 250,
    tools: ['sound', 'help'],
    foot: 'Left click reveals &middot; right click flags &middot; <b>both buttons</b> on a number clears its neighbours',
    rules: `
      <ul>
        <li>A revealed number tells you how many mines touch that cell, counting all eight neighbours.</li>
        <li>Right click, or the flag button, marks a cell you believe is a mine.</li>
        <li><b>Chording:</b> once a number has exactly that many flags around it, clicking
            it with both mouse buttons, the middle button, or a double tap clears every
            other neighbour in one action. If a flag is wrong, you lose.</li>
        <li>You win when every cell that is not a mine has been revealed. Flags are optional.</li>
      </ul>
      <p>The first click is always safe, and so are its eight neighbours, so you
         always open onto a region rather than a lone number.</p>`
  });

  Input.init();
  Input.claim(['KeyR', 'KeyF']);
  const ctx = Shell.ctx;

  const idx = (r, c) => r * cols + c;
  const inB = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols;

  function neighbours(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        if (inB(r + dr, c + dc)) out.push(idx(r + dr, c + dc));
      }
    }
    return out;
  }

  /* ---------- setup ---------- */

  function newGame(key) {
    levelKey = key || levelKey;
    L = LEVELS[levelKey];
    cols = L.cols; rows = L.rows; mineCount = L.mines; cell = L.cell;
    const n = cols * rows;
    mine = new Array(n).fill(false);
    open = new Array(n).fill(false);
    flag = new Array(n).fill(false);
    near = new Array(n).fill(0);
    placed = false;
    fatal = -1;
    startedAt = 0;
    elapsed = 0;
    state = 'play';
    Shell.resize(cols * cell, rows * cell, Math.min(760, cols * cell));
    Shell.hide();
    updateHud();
  }

  /** Lay the mines, keeping the first clicked cell and its neighbours clear. */
  function placeMines(safeR, safeC) {
    const banned = new Set([idx(safeR, safeC), ...neighbours(safeR, safeC)]);
    const spots = [];
    for (let i = 0; i < cols * rows; i++) if (!banned.has(i)) spots.push(i);
    shuffle(spots);
    // On a tiny board the safe pocket may not leave room; fall back to just the cell.
    const room = Math.min(mineCount, spots.length);
    for (let k = 0; k < room; k++) mine[spots[k]] = true;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        near[idx(r, c)] = neighbours(r, c).filter((i) => mine[i]).length;
      }
    }
    placed = true;
    startedAt = performance.now();
  }

  /* ---------- actions ---------- */

  function reveal(r, c) {
    if (state !== 'play' || !inB(r, c)) return;
    const i = idx(r, c);
    if (flag[i] || open[i]) return;
    if (!placed) placeMines(r, c);

    if (mine[i]) { open[i] = true; fatal = i; lose(); return; }

    // Flood fill outward from any zero.
    const stack = [i];
    while (stack.length) {
      const cur = stack.pop();
      if (open[cur] || flag[cur]) continue;
      open[cur] = true;
      if (near[cur] === 0) {
        const cr = Math.floor(cur / cols), cc = cur % cols;
        for (const nb of neighbours(cr, cc)) if (!open[nb] && !mine[nb]) stack.push(nb);
      }
    }
    Sfx.place();
    checkWin();
    updateHud();
  }

  function toggleFlag(r, c) {
    if (state !== 'play' || !inB(r, c)) return;
    const i = idx(r, c);
    if (open[i]) return;
    flag[i] = !flag[i];
    Sfx.tick(false);
    updateHud();
  }

  /** Reveal every unflagged neighbour, if the flag count already matches. */
  function chord(r, c) {
    if (state !== 'play' || !inB(r, c)) return;
    const i = idx(r, c);
    if (!open[i] || near[i] === 0) return;
    const nbs = neighbours(r, c);
    const flags = nbs.filter((j) => flag[j]).length;
    if (flags !== near[i]) return;
    for (const j of nbs) {
      if (!flag[j] && !open[j]) reveal(Math.floor(j / cols), j % cols);
      if (state !== 'play') return;
    }
  }

  function checkWin() {
    const total = cols * rows;
    let opened = 0;
    for (let i = 0; i < total; i++) if (open[i]) opened++;
    if (opened === total - mineCount) win();
  }

  function lose() {
    state = 'lost';
    elapsed = startedAt ? (performance.now() - startedAt) / 1000 : 0;
    for (let i = 0; i < mine.length; i++) if (mine[i]) open[i] = true;
    Sfx.boom();
    updateHud();
    Shell.gameOverCard({
      title: 'Boom',
      scoreLabel: 'Time',
      score: elapsed.toFixed(1) + 's',
      best: Scores.label('mines', levelKey, (v) => v.toFixed(1) + 's'),
      extra: '<p class="tag" style="margin-top:8px">The mine you hit is marked in red.</p>',
      buttons: [{ label: 'Try again', act: 'again', primary: true }, { label: 'Change level', act: 'menu' }]
    });
  }

  function win() {
    state = 'won';
    elapsed = (performance.now() - startedAt) / 1000;
    for (let i = 0; i < mine.length; i++) if (mine[i]) flag[i] = true;
    Sfx.win();
    const res = Scores.submit('mines', elapsed, { variant: levelKey, lower: true });
    updateHud();
    Shell.gameOverCard({
      title: 'Field cleared',
      scoreLabel: 'Time',
      score: elapsed.toFixed(1) + 's',
      isNew: res.isNew && res.previous !== null,
      best: Scores.label('mines', levelKey, (v) => v.toFixed(1) + 's'),
      buttons: [{ label: 'Play again', act: 'again', primary: true }, { label: 'Change level', act: 'menu' }]
    });
  }

  function updateHud() {
    const flags = flag.filter(Boolean).length;
    const secs = state === 'play' && startedAt ? (performance.now() - startedAt) / 1000 : elapsed;
    Shell.readouts([
      { label: 'Mines left', value: mineCount - flags, accent: true },
      { label: 'Time', value: secs.toFixed(0) + 's' },
      { label: 'Level', value: L.label },
      { label: 'Best', value: Scores.label('mines', levelKey, (v) => v.toFixed(1) + 's') }
    ]);
    Shell.status(mineCount - flags, L.label);
  }

  /* ---------- input ---------- */

  function cellAt(px, py) {
    const c = Math.floor(px / cell), r = Math.floor(py / cell);
    return inB(r, c) ? { r, c } : null;
  }

  let buttons = 0;
  let lastTap = 0, lastTapCell = -1;

  Shell.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  Shell.canvas.addEventListener('pointerdown', (e) => {
    const p = Touch.canvasPos(Shell.canvas, e);
    const at = cellAt(p.x, p.y);
    if (!at) return;
    const i = idx(at.r, at.c);

    if (e.pointerType === 'touch') {
      const now = performance.now();
      if (i === lastTapCell && now - lastTap < 320) { chord(at.r, at.c); lastTap = 0; return; }
      lastTap = now; lastTapCell = i;
      if (flagMode) toggleFlag(at.r, at.c); else reveal(at.r, at.c);
      return;
    }

    buttons = e.buttons;
    if (e.button === 2) { toggleFlag(at.r, at.c); return; }
    if (e.button === 1 || e.buttons === 3) { chord(at.r, at.c); return; }
    if (e.button === 0) {
      if (open[i] && near[i] > 0) chord(at.r, at.c);   // click a number to chord
      else reveal(at.r, at.c);
    }
  });

  Shell.canvas.addEventListener('pointermove', (e) => {
    const p = Touch.canvasPos(Shell.canvas, e);
    cursor = cellAt(p.x, p.y);
  });
  Shell.canvas.addEventListener('pointerleave', () => { cursor = null; });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && state !== 'menu') newGame();
    if (e.code === 'KeyF') { flagMode = !flagMode; updateFlagButton(); }
  });

  function updateFlagButton() {
    const b = document.getElementById('flagBtn');
    if (b) { b.textContent = flagMode ? 'Flag mode: on' : 'Flag mode: off'; b.classList.toggle('primary', flagMode); }
  }

  // Touch users need a flag toggle, since there is no right button.
  (function addFlagButton() {
    const b = document.createElement('button');
    b.id = 'flagBtn';
    b.type = 'button';
    b.textContent = 'Flag mode: off';
    b.addEventListener('click', () => { flagMode = !flagMode; updateFlagButton(); });
    Shell.els.tools.insertBefore(b, Shell.els.tools.firstChild);
  })();

  /* ---------- drawing ---------- */

  function draw() {
    const W = cols * cell, H = rows * cell;
    ctx.fillStyle = '#1a2231';
    ctx.fillRect(0, 0, W, H);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = idx(r, c);
        const x = c * cell, y = r * cell;
        const hot = cursor && cursor.r === r && cursor.c === c && !open[i] && state === 'play';

        if (!open[i]) {
          const g = ctx.createLinearGradient(x, y, x, y + cell);
          g.addColorStop(0, hot ? '#5b6d95' : '#4a5a7e');
          g.addColorStop(1, hot ? '#405073' : '#364463');
          ctx.fillStyle = g;
          roundRect(ctx, x + 1, y + 1, cell - 2, cell - 2, 4);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.13)';
          roundRect(ctx, x + 3, y + 3, cell - 6, (cell - 6) * .38, 3);
          ctx.fill();
          if (flag[i]) drawFlag(x, y);
        } else {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#232c40' : '#202839';
          ctx.fillRect(x, y, cell, cell);
          ctx.strokeStyle = 'rgba(255,255,255,.04)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + .5, y + .5, cell - 1, cell - 1);
          if (mine[i]) drawMine(x, y, i === fatal);
          else if (near[i] > 0) {
            ctx.fillStyle = NUM_COLORS[near[i]];
            ctx.font = '700 ' + (cell * 0.56).toFixed(0) + 'px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(near[i], x + cell / 2, y + cell / 2 + 1);
          }
        }
      }
    }
  }

  function drawFlag(x, y) {
    const s = cell;
    ctx.strokeStyle = '#cfd6e8';
    ctx.lineWidth = Math.max(1.5, s * 0.07);
    ctx.beginPath();
    ctx.moveTo(x + s * .38, y + s * .22);
    ctx.lineTo(x + s * .38, y + s * .76);
    ctx.stroke();
    ctx.fillStyle = '#cfd6e8';
    ctx.fillRect(x + s * .28, y + s * .74, s * .44, s * .08);
    ctx.fillStyle = '#ff5470';
    ctx.beginPath();
    ctx.moveTo(x + s * .38, y + s * .2);
    ctx.lineTo(x + s * .72, y + s * .34);
    ctx.lineTo(x + s * .38, y + s * .48);
    ctx.closePath();
    ctx.fill();
  }

  function drawMine(x, y, isFatal) {
    const s = cell, cx = x + s / 2, cy = y + s / 2, r = s * 0.26;
    if (isFatal) {
      ctx.fillStyle = 'rgba(255,60,80,.45)';
      ctx.fillRect(x, y, s, s);
    }
    ctx.strokeStyle = isFatal ? '#ffd0d6' : '#c7d0e6';
    ctx.lineWidth = Math.max(1.5, s * 0.06);
    for (let a = 0; a < 4; a++) {
      const ang = a * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(ang) * r * 1.5, cy - Math.sin(ang) * r * 1.5);
      ctx.lineTo(cx + Math.cos(ang) * r * 1.5, cy + Math.sin(ang) * r * 1.5);
      ctx.stroke();
    }
    ctx.fillStyle = isFatal ? '#ff5470' : '#e8edfa';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.arc(cx - r * .3, cy - r * .35, r * .22, 0, 6.283);
    ctx.fill();
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    L = LEVELS[levelKey];
    cols = L.cols; rows = L.rows; cell = L.cell; mineCount = L.mines;
    const n = cols * rows;
    mine = new Array(n).fill(false);
    open = new Array(n).fill(false);
    flag = new Array(n).fill(false);
    near = new Array(n).fill(0);
    Shell.resize(cols * cell, rows * cell, Math.min(760, cols * cell));
    Shell.status('', '');
    Shell.readouts(Object.keys(LEVELS).map((k) =>
      ({ label: 'Best ' + LEVELS[k].label, value: Scores.label('mines', k, (v) => v.toFixed(1) + 's') })));
    Shell.startCard({
      blurb: 'Clear every cell that is not a mine. The first click is always safe.',
      extra: `<div class="rowBetween"><span>Level</span><div class="seg">${
        Object.keys(LEVELS).map((k) =>
          `<button data-act="level" data-k="${k}" class="${levelKey === k ? 'on' : ''}">${LEVELS[k].label}</button>`).join('')
      }</div></div>
      <div class="rowBetween"><span>Board</span><b style="color:var(--text)">${L.cols}x${L.rows}, ${L.mines} mines</b></div>`,
      buttons: [{ label: 'Play', act: 'again', primary: true }]
    });
  }

  Shell.on({
    again: () => newGame(),
    menu: () => showMenu(),
    level: (el) => { levelKey = el.dataset.k; showMenu(); }
  });

  Loop.start(() => { if (state === 'play' && startedAt && Loop.frames % 30 === 0) updateHud(); }, draw, { pauseOnHide: false });
  showMenu();

  window.EasyMines = {
    get state() { return state; },
    get placed() { return placed; },
    dims: () => ({ cols, rows, mineCount }),
    grids: () => ({ mine, open, flag, near }),
    reveal, toggleFlag, chord, newGame, neighbours,
    setLevel(k) { levelKey = k; },
    countOpen: () => open.filter(Boolean).length
  };
})();
