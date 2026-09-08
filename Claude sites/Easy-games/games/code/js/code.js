'use strict';

/* Easy Code, after Mastermind (Mordecai Meirowitz, 1970).

   Two pieces of this are worth stating precisely.

   THE PEG SCORING. This is where clones go wrong. It is not a per peg match:

     1. Count the exact positional matches. Those are the black pegs.
     2. For each colour, take the minimum of how often it appears in the guess
        and in the secret, and sum those minima.
     3. White pegs are that sum minus the blacks.

   Naive per-peg matching double counts duplicates and hands out feedback that
   is simply wrong.

   THE SOLVER. Donald Knuth showed in 1977 that four pegs and six colours can
   always be cracked in five guesses or fewer, averaging 4.478. The method opens
   with two pairs, then applies minimax: for every possible guess, look at how
   the still-possible codes would split across the feedback it could produce, and
   choose the guess whose WORST case leaves the fewest possibilities. */

(function () {
  const W = 520, H = 620;

  const PALETTE = [
    { name: 'red',    col: '#ff4d5e', dark: '#a81f2f', light: '#ff9aa4' },
    { name: 'blue',   col: '#4da3ff', dark: '#175394', light: '#a5d2ff' },
    { name: 'green',  col: '#4ad46f', dark: '#187a38', light: '#9aeab1' },
    { name: 'yellow', col: '#ffcc3f', dark: '#a87c00', light: '#ffe396' },
    { name: 'purple', col: '#b98cff', dark: '#6a3fb5', light: '#dbc6ff' },
    { name: 'orange', col: '#ff9038', dark: '#b35400', light: '#ffc08a' },
    { name: 'cyan',   col: '#3fe0d0', dark: '#12897d', light: '#9df3ea' },
    { name: 'pink',   col: '#ff7ad5', dark: '#b02f86', light: '#ffc0eb' }
  ];

  const CFG = { rows: 10, pegR: 17, feedR: 6.5, rowH: 46, topPad: 14, leftPad: 26 };

  let len = 4, colours = 6, repeats = true;
  let mode = 'break';               // break | solve
  let secret = [];
  let guesses = [];                 // { code, black, white }
  let current = [];
  let cursor = 0;
  let state = 'menu';               // menu | play | won | lost
  let revealed = false;
  let solver = null;                // { candidates, all, turn, busy }
  let solveTimer = 0;
  let message = '';

  Shell.mount({
    name: 'Code',
    width: W, height: H, max: 520, pad: 235,
    tools: ['sound', 'help'],
    foot: 'Click a colour to place it &middot; <b>1</b> to <b>8</b> also work &middot; <b>Backspace</b> undoes &middot; <b>Enter</b> submits',
    rules: `
      <ul>
        <li>A hidden code of ${4} colours. You have ${CFG.rows} guesses.</li>
        <li>A <b>black peg</b> means one of your colours is right and in the right place.
            A <b>white peg</b> means a colour is in the code but somewhere else.</li>
        <li>The pegs are not in any order, so they tell you how many, never which.</li>
        <li>Colours can repeat unless you turn that off.</li>
      </ul>
      <h3>Duplicates</h3>
      <p>If your guess has two reds and the code has one, you get credit for one red,
         not two. Exact positions are counted first, then the leftovers.</p>
      <h3>Watch the computer</h3>
      <p>Switch to <b>set a code</b> and the solver takes over, using Knuth's 1977
         minimax method. Four pegs and six colours always fall in five guesses or
         fewer, averaging about 4.48.</p>`
  });

  Input.init();
  Input.claim(['Enter', 'Backspace', 'KeyR',
               'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8']);
  const ctx = Shell.ctx;

  /* ---------- rules ---------- */

  /** Black and white pegs, handling duplicate colours correctly. */
  function score(guess, code) {
    let black = 0;
    const gCount = new Array(colours).fill(0);
    const cCount = new Array(colours).fill(0);
    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === code[i]) black++;
      else { gCount[guess[i]]++; cCount[code[i]]++; }
    }
    let white = 0;
    for (let c = 0; c < colours; c++) white += Math.min(gCount[c], cCount[c]);
    return { black, white };
  }

  function randomCode() {
    const out = [];
    if (repeats) {
      for (let i = 0; i < len; i++) out.push(randInt(colours));
    } else {
      const pool = [];
      for (let i = 0; i < colours; i++) pool.push(i);
      shuffle(pool);
      for (let i = 0; i < len; i++) out.push(pool[i]);
    }
    return out;
  }

  function allCodes() {
    const out = [];
    const rec = (prefix) => {
      if (prefix.length === len) { out.push(prefix.slice()); return; }
      for (let c = 0; c < colours; c++) {
        if (!repeats && prefix.indexOf(c) !== -1) continue;
        prefix.push(c);
        rec(prefix);
        prefix.pop();
      }
    };
    rec([]);
    return out;
  }

  /* ---------- the solver ---------- */

  /** Knuth's opening: two pairs, for example red red blue blue. */
  function openingGuess() {
    const out = [];
    for (let i = 0; i < len; i++) out.push(Math.min(colours - 1, Math.floor(i / 2)));
    if (!repeats) for (let i = 0; i < len; i++) out[i] = i % colours;
    return out;
  }

  /**
   * Minimax: for each possible guess, partition the remaining candidates by the
   * feedback it would produce and take the size of the largest partition. The
   * guess with the smallest such worst case wins, preferring one that could
   * itself be the answer.
   */
  function bestGuess(candidates, all) {
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1500) return pick(candidates);      // keep it responsive

    const candSet = new Set(candidates.map((c) => c.join(',')));
    // Searching every code is the true algorithm; on big boards sample instead.
    const pool = all.length <= 1400 ? all : candidates;

    let best = null, bestWorst = Infinity, bestIsCandidate = false;
    const buckets = new Int32Array(64);
    for (const g of pool) {
      buckets.fill(0);
      let worst = 0;
      for (const c of candidates) {
        const s = score(g, c);
        const k = s.black * 8 + s.white;
        const n = ++buckets[k];
        if (n > worst) worst = n;
        // Prune only on a strictly worse guess. Breaking on equality would skip
        // the tie-break below, which is what keeps the average near Knuth's.
        if (worst > bestWorst && best) break;
      }
      if (worst > bestWorst && best) continue;
      const isCand = candSet.has(g.join(','));
      if (worst < bestWorst || (worst === bestWorst && isCand && !bestIsCandidate)) {
        best = g; bestWorst = worst; bestIsCandidate = isCand;
      }
    }
    return best || pick(candidates);
  }

  function startSolver() {
    solver = { all: allCodes(), turn: 0, busy: false };
    solver.candidates = solver.all.slice();
    solveTimer = 700;
  }

  function solverStep() {
    if (!solver || state !== 'play') return;
    const g = solver.turn === 0 ? openingGuess() : bestGuess(solver.candidates, solver.all);
    solver.turn++;
    const s = score(g, secret);
    guesses.push({ code: g.slice(), black: s.black, white: s.white });
    solver.candidates = solver.candidates.filter((c) => {
      const r = score(g, c);
      return r.black === s.black && r.white === s.white;
    });
    Sfx.place();
    if (s.black === len) { state = 'won'; finish(true); return; }
    if (guesses.length >= CFG.rows) { state = 'lost'; finish(false); return; }
    solveTimer = 850;
    updateHud();
  }

  /* ---------- play ---------- */

  function reset() {
    guesses = [];
    current = new Array(len).fill(-1);
    cursor = 0;
    revealed = false;
    message = '';
    solver = null;
    state = 'play';
    if (mode === 'break') {
      secret = randomCode();
    } else {
      secret = randomCode();          // the player sets it on the menu; random by default
      startSolver();
    }
    Shell.hide();
    updateHud();
  }

  function setColour(c) {
    if (state !== 'play' || mode !== 'break') return;
    if (cursor >= len) cursor = len - 1;
    current[cursor] = c;
    cursor = Math.min(len, cursor + 1);
    Sfx.tick(false);
  }

  function backspace() {
    if (state !== 'play' || mode !== 'break') return;
    cursor = Math.max(0, cursor - 1);
    current[cursor] = -1;
    Sfx.kick();
  }

  function submit() {
    if (state !== 'play' || mode !== 'break') return;
    if (current.some((c) => c < 0)) { message = 'Fill every slot first'; return; }
    if (!repeats && new Set(current).size !== len) { message = 'No repeats allowed in this game'; return; }
    message = '';
    const s = score(current, secret);
    guesses.push({ code: current.slice(), black: s.black, white: s.white });
    current = new Array(len).fill(-1);
    cursor = 0;
    Sfx.place();
    if (s.black === len) { state = 'won'; finish(true); return; }
    if (guesses.length >= CFG.rows) { state = 'lost'; finish(false); return; }
    updateHud();
  }

  function finish(won) {
    revealed = true;
    if (won) Sfx.win(); else Sfx.bad();
    const variant = len + 'x' + colours;
    let best = null, isNew = false;
    if (won && mode === 'break') {
      const res = Scores.submit('code', guesses.length, { variant, lower: true });
      best = res.best; isNew = res.isNew && res.previous !== null;
    }
    updateHud();
    Shell.gameOverCard({
      title: won
        ? (mode === 'solve' ? 'The solver cracked it' : 'Cracked it')
        : (mode === 'solve' ? 'The solver ran out of guesses' : 'Out of guesses'),
      scoreLabel: won ? 'Guesses used' : 'The code was',
      score: won ? guesses.length : secret.map((c) => PALETTE[c].name).join(' '),
      isNew,
      best: best,
      extra: mode === 'solve'
        ? `<p class="tag" style="margin-top:8px">Knuth's method never needs more than five for four pegs and six colours.</p>`
        : '',
      buttons: [{ label: 'New code', act: 'again', primary: true }, { label: 'Menu', act: 'menu' }]
    });
  }

  function updateHud() {
    Shell.readouts([
      { label: 'Guess', value: (guesses.length + (state === 'play' ? 1 : 0)) + '/' + CFG.rows, accent: true },
      { label: 'Pegs', value: len },
      { label: 'Colours', value: colours },
      { label: 'Best', value: Scores.label('code', len + 'x' + colours) }
    ]);
    Shell.status(guesses.length + '/' + CFG.rows, mode === 'solve' ? 'solver running' : 'your turn');
  }

  /* ---------- layout and input ---------- */

  function rowY(i) { return CFG.topPad + i * CFG.rowH + CFG.rowH / 2; }
  function pegX(i) {
    const span = len * (CFG.pegR * 2) + (len - 1) * 10;
    const startX = (W - span) / 2 - 34;
    return startX + i * (CFG.pegR * 2 + 10) + CFG.pegR;
  }
  const paletteY = () => CFG.topPad + CFG.rows * CFG.rowH + 58;
  function paletteX(i) {
    const span = colours * 40 + (colours - 1) * 8;
    return (W - span) / 2 + i * 48 + 20;
  }

  Shell.canvas.addEventListener('pointerdown', (e) => {
    if (state !== 'play' || mode !== 'break') return;
    const p = Touch.canvasPos(Shell.canvas, e);
    // palette
    if (Math.abs(p.y - paletteY()) < 26) {
      for (let i = 0; i < colours; i++) {
        if (Math.abs(p.x - paletteX(i)) < 22) { setColour(i); return; }
      }
    }
    // the working row
    const y = rowY(guesses.length);
    if (Math.abs(p.y - y) < CFG.rowH / 2) {
      for (let i = 0; i < len; i++) {
        if (Math.abs(p.x - pegX(i)) < CFG.pegR + 4) {
          cursor = i;
          // clicking a filled slot cycles it, which is handy on touch
          if (current[i] >= 0) { current[i] = (current[i] + 1) % colours; Sfx.tick(false); }
          return;
        }
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (state === 'menu') return;
    if (e.code.startsWith('Digit')) {
      const n = +e.code.slice(5);
      if (n >= 1 && n <= colours) setColour(n - 1);
    }
    if (e.code === 'Backspace') { e.preventDefault(); backspace(); }
    if (e.code === 'Enter') submit();
    if (e.code === 'KeyR') reset();
  });

  /* ---------- drawing ---------- */

  function update(dt) {
    if (mode === 'solve' && state === 'play' && solver) {
      solveTimer -= dt * 1000;
      if (solveTimer <= 0) solverStep();
    }
  }

  function draw() {
    ctx.fillStyle = '#1a2231';
    ctx.fillRect(0, 0, W, H);

    // Board panel.
    ctx.fillStyle = '#141b28';
    roundRect(ctx, 10, 8, W - 20, CFG.rows * CFG.rowH + 16, 12);
    ctx.fill();

    for (let i = 0; i < CFG.rows; i++) {
      const y = rowY(i);
      const g = guesses[i];
      const isCurrent = i === guesses.length && state === 'play' && mode === 'break';

      if (isCurrent) {
        ctx.fillStyle = 'rgba(255,176,46,.08)';
        roundRect(ctx, 14, y - CFG.rowH / 2 + 3, W - 28, CFG.rowH - 6, 8);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(i + 1, 30, y);

      for (let k = 0; k < len; k++) {
        const x = pegX(k);
        const val = g ? g.code[k] : (isCurrent ? current[k] : -1);
        if (val >= 0) drawPeg(x, y, val, CFG.pegR);
        else {
          ctx.fillStyle = 'rgba(255,255,255,.05)';
          ctx.beginPath();
          ctx.arc(x, y, CFG.pegR * 0.75, 0, 6.283);
          ctx.fill();
          if (isCurrent && k === cursor) {
            ctx.strokeStyle = '#ffb02e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, CFG.pegR * 0.9, 0, 6.283);
            ctx.stroke();
          }
        }
      }

      if (g) drawFeedback(W - 66, y, g.black, g.white);
    }

    // Secret row at the top of the panel, hidden until the end.
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const sy = paletteY() - 54;
    ctx.fillText(revealed ? 'the code' : 'the code is hidden', W / 2, sy - 24);
    for (let k = 0; k < len; k++) {
      const x = pegX(k);
      if (revealed) drawPeg(x, sy, secret[k], CFG.pegR);
      else {
        ctx.fillStyle = '#2b3550';
        ctx.beginPath();
        ctx.arc(x, sy, CFG.pegR, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.font = '700 17px system-ui, sans-serif';
        ctx.fillText('?', x, sy + 1);
      }
    }

    // Palette.
    if (mode === 'break') {
      for (let i = 0; i < colours; i++) {
        drawPeg(paletteX(i), paletteY(), i, 20);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(i + 1, paletteX(i), paletteY() + 32);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.font = '600 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const left = solver ? solver.candidates.length : 0;
      ctx.fillText(left === 1 ? 'one code still possible' : left + ' codes still possible',
                   W / 2, paletteY() + 4);
    }

    if (message) {
      ctx.fillStyle = '#ff5470';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(message, W / 2, H - 12);
    }
  }

  function drawPeg(x, y, colourIndex, r) {
    const p = PALETTE[colourIndex];
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.arc(x, y + 2, r, 0, 6.283);
    ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
    g.addColorStop(0, p.light);
    g.addColorStop(0.6, p.col);
    g.addColorStop(1, p.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.28)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawFeedback(cx, cy, black, white) {
    const per = 2;
    const gap = CFG.feedR * 2 + 4;
    let n = 0;
    for (let i = 0; i < len; i++) {
      const col = i % per, row = Math.floor(i / per);
      const x = cx + col * gap - gap / 2;
      const y = cy + row * gap - gap * (Math.ceil(len / per) - 1) / 2;
      let fill = 'rgba(255,255,255,.08)';
      if (n < black) fill = '#151a26';
      else if (n < black + white) fill = '#eef2fa';
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, CFG.feedR, 0, 6.283);
      ctx.fill();
      if (n < black) {
        ctx.strokeStyle = 'rgba(255,255,255,.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      n++;
    }
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    guesses = [];
    current = new Array(len).fill(-1);
    revealed = false;
    secret = randomCode();
    Shell.status('', '');
    Shell.readouts([{ label: 'Best 4x6', value: Scores.label('code', '4x6') },
                    { label: 'Best 5x6', value: Scores.label('code', '5x6') },
                    { label: 'Best 4x8', value: Scores.label('code', '4x8') }]);
    Shell.startCard({
      blurb: 'Break the hidden colour code in ten guesses.',
      extra: `
        <div class="rowBetween"><span>Mode</span><div class="seg">
          <button data-act="mode" data-m="break" class="${mode === 'break' ? 'on' : ''}">I break it</button>
          <button data-act="mode" data-m="solve" class="${mode === 'solve' ? 'on' : ''}">Watch the solver</button>
        </div></div>
        <div class="rowBetween"><span>Pegs</span><div class="seg">${
          [3, 4, 5].map((n) => `<button data-act="len" data-n="${n}" class="${len === n ? 'on' : ''}">${n}</button>`).join('')
        }</div></div>
        <div class="rowBetween"><span>Colours</span><div class="seg">${
          [4, 6, 8].map((n) => `<button data-act="cols" data-n="${n}" class="${colours === n ? 'on' : ''}">${n}</button>`).join('')
        }</div></div>
        <div class="rowBetween"><span>Repeats allowed</span><div class="seg">
          <button data-act="rep" data-v="1" class="${repeats ? 'on' : ''}">yes</button>
          <button data-act="rep" data-v="0" class="${!repeats ? 'on' : ''}">no</button>
        </div></div>
        <div class="rowBetween"><span>Possible codes</span><b style="color:var(--text)">${countCodes()}</b></div>`,
      buttons: [{ label: 'Play', act: 'again', primary: true }]
    });
  }

  function countCodes() {
    if (repeats) return Math.pow(colours, len);
    let n = 1;
    for (let i = 0; i < len; i++) n *= (colours - i);
    return n;
  }

  Shell.on({
    again: () => reset(),
    menu: () => showMenu(),
    mode: (el) => { mode = el.dataset.m; showMenu(); },
    len: (el) => { len = +el.dataset.n; showMenu(); },
    cols: (el) => { colours = +el.dataset.n; if (!repeats && len > colours) len = colours; showMenu(); },
    rep: (el) => { repeats = el.dataset.v === '1'; if (!repeats && len > colours) len = colours; showMenu(); }
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyCode = {
    get state() { return state; },
    get guesses() { return guesses; },
    secret: () => secret,
    setSecret(s) { secret = s.slice(); },
    setConfig(l, c, r) { len = l; colours = c; repeats = r; },
    setMode(m) { mode = m; },
    score, allCodes, bestGuess, openingGuess, randomCode, reset,
    solverStep, startSolver,
    solver: () => solver,
    play(code) { current = code.slice(); cursor = len; submit(); },
    cfg: CFG
  };
})();
