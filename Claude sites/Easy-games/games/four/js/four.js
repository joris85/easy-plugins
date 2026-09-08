'use strict';

/* Easy Four.

   Connect Four was strongly solved in October 1988, independently by James D.
   Allen and Victor Allis. With perfect play the FIRST player wins, and only by
   opening in the centre column. Opening in either column beside the centre lets
   the second player force a draw, and opening in any of the four outer columns
   loses. Those facts are on the rules card, and the CPU knows the centre opening.

   The opponent is negamax with alpha-beta pruning, centre-out move ordering and
   a transposition table. It checks for an immediate win or an immediate block
   before searching, which is what stops a shallow search from ever missing the
   obvious. */

(function () {
  const COLS = 7, ROWS = 6;
  const CELL = 88;
  const W = COLS * CELL, H = ROWS * CELL + 78;     // extra strip on top for the drop
  const TOP = 78;

  const EMPTY = 0, P1 = 1, P2 = 2;

  const SIDES = [
    null,
    { name: 'Red',    col: '#ff4d5e', dark: '#a81f2f', light: '#ff9aa4' },
    { name: 'Yellow', col: '#ffcc3f', dark: '#a87c00', light: '#ffe396' }
  ];

  const LEVELS = {
    easy:   { depth: 2, blunder: 0.35, label: 'Easy' },
    normal: { depth: 5, blunder: 0.08, label: 'Normal' },
    hard:   { depth: 8, blunder: 0,    label: 'Hard' }
  };

  let mode = 'cpu';               // cpu | duel
  let level = 'normal';
  let board, heights, turn, moves;
  let state = 'menu';             // menu | play | over
  let winner = 0, winLine = null;
  let falling = null;             // { col, row, player, t }
  let hoverCol = -1;
  let thinking = false;
  let lastMove = -1;

  Shell.mount({
    name: 'Four',
    width: W, height: H, max: 620, pad: 250,
    tools: ['sound', 'help'],
    foot: 'Click a column, or use <b>1</b> to <b>7</b> &middot; <b>Z</b> takes a move back',
    rules: `
      <ul>
        <li>Drop a disc into a column. Get four in a row across, down or diagonally.</li>
        <li>Forty-two discs with no line is a draw.</li>
      </ul>
      <h3>The game is solved</h3>
      <p>Connect Four was solved in 1988. With perfect play from both sides:</p>
      <ul>
        <li>Opening in the <b>centre column wins</b> for the first player.</li>
        <li>Opening in either column <b>beside</b> the centre is only a draw.</li>
        <li>Opening in any of the <b>four outer columns loses</b>.</li>
      </ul>
      <p>So if you go first, take the middle. The CPU always will.</p>`
  });

  Input.init();
  Input.claim(['KeyZ', 'KeyR', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7']);
  const ctx = Shell.ctx;

  const idx = (c, r) => r * COLS + c;

  /* ---------- rules ---------- */

  function reset() {
    board = new Uint8Array(COLS * ROWS);
    heights = new Array(COLS).fill(0);       // discs already in each column
    turn = P1;
    moves = 0;
    winner = 0;
    winLine = null;
    falling = null;
    lastMove = -1;
    history = [];
    state = 'play';
    thinking = false;
    Shell.hide();
    updateHud();
    maybeCpu();
  }

  let history = [];

  function canPlay(c) { return c >= 0 && c < COLS && heights[c] < ROWS; }

  /** Row index from the bottom, converted to a top-down row for storage. */
  function rowFor(c) { return ROWS - 1 - heights[c]; }

  function place(c, player) {
    const r = rowFor(c);
    board[idx(c, r)] = player;
    heights[c]++;
    moves++;
    return r;
  }

  function unplace(c) {
    heights[c]--;
    const r = rowFor(c);
    board[idx(c, r)] = EMPTY;
    moves--;
  }

  /** Winning line through (c,r), or null. */
  function lineAt(c, r, player) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dc, dr] of dirs) {
      const cells = [[c, r]];
      for (const s of [1, -1]) {
        let cc = c + dc * s, rr = r + dr * s;
        while (cc >= 0 && rr >= 0 && cc < COLS && rr < ROWS && board[idx(cc, rr)] === player) {
          cells.push([cc, rr]);
          cc += dc * s; rr += dr * s;
        }
      }
      if (cells.length >= 4) return cells;
    }
    return null;
  }

  function wouldWin(c, player) {
    if (!canPlay(c)) return false;
    const r = place(c, player);
    const line = lineAt(c, r, player);
    unplace(c);
    return !!line;
  }

  /* ---------- the opponent ---------- */

  const ORDER = [3, 2, 4, 1, 5, 0, 6];        // centre out
  const WIN = 100000;
  let nodes = 0;
  const table = new Map();

  function key() {
    // Board plus side to move. Fine as a string; the search is small enough.
    let s = '';
    for (let i = 0; i < board.length; i++) s += board[i];
    return s + turn;
  }

  /** Positional score: centre control plus counted threats. */
  function evaluate(player) {
    const other = player === P1 ? P2 : P1;
    let score = 0;
    for (let r = 0; r < ROWS; r++) {
      if (board[idx(3, r)] === player) score += 6;
      else if (board[idx(3, r)] === other) score -= 6;
    }
    // Every window of four contributes.
    const windows = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        for (const [dc, dr] of windows) {
          const ec = c + dc * 3, er = r + dr * 3;
          if (ec < 0 || er < 0 || ec >= COLS || er >= ROWS) continue;
          let mine = 0, theirs = 0;
          for (let k = 0; k < 4; k++) {
            const v = board[idx(c + dc * k, r + dr * k)];
            if (v === player) mine++;
            else if (v === other) theirs++;
          }
          if (mine && theirs) continue;
          if (mine === 3) score += 60;
          else if (mine === 2) score += 12;
          else if (mine === 1) score += 2;
          if (theirs === 3) score -= 75;      // block harder than you attack
          else if (theirs === 2) score -= 14;
          else if (theirs === 1) score -= 2;
        }
      }
    }
    return score;
  }

  function negamax(depth, alpha, beta, player) {
    nodes++;
    const other = player === P1 ? P2 : P1;

    // Immediate win available?
    for (const c of ORDER) if (wouldWin(c, player)) return WIN - moves;

    if (moves >= COLS * ROWS) return 0;
    if (depth === 0) return evaluate(player);

    const k = key() + depth;
    const cached = table.get(k);
    if (cached !== undefined) return cached;

    let best = -Infinity;
    for (const c of ORDER) {
      if (!canPlay(c)) continue;
      place(c, player);
      turn = other;
      const score = -negamax(depth - 1, -beta, -alpha, other);
      turn = player;
      unplace(c);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;              // prune
    }
    if (best === -Infinity) return 0;
    table.set(k, best);
    return best;
  }

  function chooseMove(player) {
    const lv = LEVELS[level];
    const other = player === P1 ? P2 : P1;

    // 1. Take a win.
    for (const c of ORDER) if (wouldWin(c, player)) return c;
    // 2. Block a loss.
    for (const c of ORDER) if (wouldWin(c, other)) return c;
    // 3. The solved opening: centre, always.
    if (moves === 0) return 3;

    if (Math.random() < lv.blunder) {
      const legal = ORDER.filter(canPlay);
      return pick(legal);
    }

    nodes = 0;
    table.clear();
    let best = -Infinity, bestCols = [];
    for (const c of ORDER) {
      if (!canPlay(c)) continue;
      place(c, player);
      turn = other;
      const score = -negamax(lv.depth - 1, -Infinity, Infinity, other);
      turn = player;
      unplace(c);
      if (score > best) { best = score; bestCols = [c]; }
      else if (score === best) bestCols.push(c);
    }
    return bestCols.length ? pick(bestCols) : pick(ORDER.filter(canPlay));
  }

  /* ---------- turns ---------- */

  function drop(c) {
    if (state !== 'play' || falling || !canPlay(c)) return false;
    if (mode === 'cpu' && turn === P2) return false;
    doDrop(c);
    return true;
  }

  function doDrop(c) {
    const player = turn;
    const r = rowFor(c);
    history.push(c);
    falling = { col: c, row: r, player, t: 0, from: -1 };
    place(c, player);
    lastMove = idx(c, r);
    Sfx.place();
  }

  function landed() {
    const { col, row, player } = falling;
    falling = null;
    const line = lineAt(col, row, player);
    if (line) {
      winner = player;
      winLine = line;
      finish();
      return;
    }
    if (moves >= COLS * ROWS) { winner = 0; finish(); return; }
    turn = turn === P1 ? P2 : P1;
    updateHud();
    maybeCpu();
  }

  function maybeCpu() {
    if (state !== 'play' || mode !== 'cpu' || turn !== P2) return;
    thinking = true;
    updateHud();
    // Let the frame paint before the search blocks the thread.
    setTimeout(() => {
      if (state !== 'play') { thinking = false; return; }
      const c = chooseMove(P2);
      thinking = false;
      if (canPlay(c)) doDrop(c); else { const l = ORDER.filter(canPlay); if (l.length) doDrop(l[0]); }
    }, 240);
  }

  function undo() {
    if (state !== 'play' || falling || thinking) return;
    const take = (mode === 'cpu') ? 2 : 1;
    for (let i = 0; i < take && history.length; i++) {
      const c = history.pop();
      unplace(c);
      turn = turn === P1 ? P2 : P1;
    }
    if (mode === 'cpu') turn = P1;
    lastMove = -1;
    updateHud();
    Sfx.kick();
  }

  function finish() {
    state = 'over';
    Sfx.win();
    if (winner && mode === 'cpu' && winner === P1) Scores.submit('four', 1, { variant: level });
    const title = !winner ? 'A draw'
      : (mode === 'cpu'
          ? (winner === P1 ? 'You win' : 'The CPU wins')
          : SIDES[winner].name + ' wins');
    Shell.gameOverCard({
      title,
      scoreLabel: 'Discs played',
      score: moves,
      extra: mode === 'cpu' && winner === P2
        ? '<p class="tag" style="margin-top:8px">Try the centre column first. It is the only opening that wins with perfect play.</p>'
        : '',
      buttons: [{ label: 'Play again', act: 'again', primary: true }, { label: 'Menu', act: 'menu' }]
    });
  }

  function updateHud() {
    const who = mode === 'cpu'
      ? (turn === P1 ? 'Your turn' : (thinking ? 'CPU thinking' : 'CPU turn'))
      : SIDES[turn].name + ' to play';
    Shell.readouts([
      { label: 'To play', value: who, accent: true },
      { label: 'Discs', value: moves },
      { label: mode === 'cpu' ? 'Level' : 'Mode', value: mode === 'cpu' ? LEVELS[level].label : 'Two players' }
    ]);
    Shell.status(moves + '/42', who);
  }

  /* ---------- input ---------- */

  function colAt(px) { return clamp(Math.floor(px / CELL), 0, COLS - 1); }

  Shell.canvas.addEventListener('pointermove', (e) => {
    const p = Touch.canvasPos(Shell.canvas, e);
    hoverCol = colAt(p.x);
  });
  Shell.canvas.addEventListener('pointerleave', () => { hoverCol = -1; });
  Shell.canvas.addEventListener('pointerdown', (e) => {
    const p = Touch.canvasPos(Shell.canvas, e);
    drop(colAt(p.x));
  });

  window.addEventListener('keydown', (e) => {
    if (state === 'menu') return;
    if (e.code.startsWith('Digit')) {
      const n = +e.code.slice(5);
      if (n >= 1 && n <= 7) drop(n - 1);
    }
    if (e.code === 'KeyZ') undo();
    if (e.code === 'KeyR') reset();
  });

  /* ---------- drawing ---------- */

  function cellXY(c, r) {
    return { x: c * CELL + CELL / 2, y: TOP + r * CELL + CELL / 2 };
  }

  function update(dt) {
    if (falling) {
      falling.t += dt * 3.4;
      if (falling.t >= 1) landed();
    }
  }

  function draw() {
    ctx.fillStyle = '#141a29';
    ctx.fillRect(0, 0, W, H);

    // The disc being dropped, drawn behind the board so it appears to fall inside.
    if (falling) {
      const to = cellXY(falling.col, falling.row);
      const from = -CELL / 2;
      const e = falling.t * falling.t;                 // accelerate downward
      const y = from + (to.y - from) * Math.min(1, e);
      drawDisc(to.x, y, falling.player);
    }

    // Hover preview.
    if (state === 'play' && !falling && hoverCol >= 0 && canPlay(hoverCol) &&
        !(mode === 'cpu' && turn === P2)) {
      ctx.globalAlpha = 0.45;
      drawDisc(hoverCol * CELL + CELL / 2, TOP / 2, turn);
      ctx.globalAlpha = 1;
    }

    // Board with holes punched through it.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, TOP, W, H - TOP);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = cellXY(c, r);
        ctx.moveTo(p.x + CELL * 0.38, p.y);
        ctx.arc(p.x, p.y, CELL * 0.38, 0, 6.283, true);
      }
    }
    const bg = ctx.createLinearGradient(0, TOP, 0, H);
    bg.addColorStop(0, '#2f6fbf');
    bg.addColorStop(1, '#1d4d94');
    ctx.fillStyle = bg;
    ctx.fill('evenodd');
    ctx.restore();

    // Discs already resting.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = board[idx(c, r)];
        if (!v) continue;
        if (falling && falling.col === c && falling.row === r) continue;
        const p = cellXY(c, r);
        drawDisc(p.x, p.y, v);
      }
    }

    // Winning line.
    if (winLine) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 18;
      const a = cellXY(winLine[0][0], winLine[0][1]);
      const b = cellXY(winLine[winLine.length - 1][0], winLine[winLine.length - 1][1]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Column numbers in the drop strip.
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let c = 0; c < COLS; c++) {
      if (!canPlay(c)) continue;
      ctx.fillText(c + 1, c * CELL + CELL / 2, TOP - 12);
    }

    if (thinking) {
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.fillText('thinking...', W / 2, 20);
    }
  }

  function drawDisc(x, y, player) {
    const s = SIDES[player];
    const r = CELL * 0.36;
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.arc(x, y + 3, r, 0, 6.283);
    ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
    g.addColorStop(0, s.light);
    g.addColorStop(0.6, s.col);
    g.addColorStop(1, s.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, 6.283);
    ctx.stroke();
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    board = new Uint8Array(COLS * ROWS);
    heights = new Array(COLS).fill(0);
    moves = 0; turn = P1; winLine = null; falling = null;
    Shell.status('', '');
    Shell.readouts([{ label: 'Wins vs CPU', value: Scores.label('four', level) || '0' }]);
    Shell.startCard({
      blurb: 'Four in a row. The middle column is worth more than it looks.',
      extra: `<div class="rowBetween"><span>Opponent</span><div class="seg">
          <button data-act="mode" data-m="cpu" class="${mode === 'cpu' ? 'on' : ''}">CPU</button>
          <button data-act="mode" data-m="duel" class="${mode === 'duel' ? 'on' : ''}">Two players</button>
        </div></div>
        ${mode === 'cpu' ? `<div class="rowBetween"><span>Level</span><div class="seg">${
          Object.keys(LEVELS).map((k) => `<button data-act="level" data-k="${k}" class="${level === k ? 'on' : ''}">${LEVELS[k].label}</button>`).join('')
        }</div></div>
        <div class="rowBetween"><span>Hard searches</span><b style="color:var(--text)">8 moves ahead</b></div>` : ''}`,
      buttons: [{ label: 'Play', act: 'again', primary: true }]
    });
  }

  Shell.on({
    again: () => reset(),
    menu: () => showMenu(),
    mode: (el) => { mode = el.dataset.m; showMenu(); },
    level: (el) => { level = el.dataset.k; showMenu(); }
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyFour = {
    get state() { return state; },
    get turn() { return turn; },
    get moves() { return moves; },
    get winner() { return winner; },
    board: () => board, heights: () => heights,
    reset, drop, doDrop, undo,
    canPlay, wouldWin, lineAt, place, unplace, rowFor, chooseMove, evaluate,
    settle() { while (falling) landed(); },
    setMode(m, l) { mode = m; if (l) level = l; },
    setLevel(l) { level = l; },
    nodes: () => nodes,
    P1, P2, COLS, ROWS, ORDER
  };
})();
