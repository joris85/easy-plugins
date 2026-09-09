'use strict';

/* Easy Sudoku - the controller.

   The engine in rules.js generates, grades and hints. This file owns the board
   on canvas, the number pad under it, selection, pencil marks, undo, the timer
   and the cards. Nothing here knows how to solve a Sudoku; it asks.

   Two design choices worth stating:

   PENCIL MARKS come in two flavours, chosen on the start card. Manual marks are
   yours: you write them, you rub them out, and placing a digit clears that
   digit from the marks around it. Auto marks are the true candidates computed
   from the board, and crossing one out is remembered as your own claim, which
   is why the hint can tell you when you crossed out the answer.

   HINTS TAKE TWO PRESSES. The first names the technique and lights up the cells
   it uses, which is the part that teaches. The second applies it. Nothing is
   ever filled in silently. */

(function () {
  const R = SudokuRules;

  const CELL = 56, X0 = 8, Y0 = 8, BOARD = CELL * 9;
  const W = BOARD + X0 * 2;                       // 520
  const PAD = { y: 526, h: 56, w: 50, gap: 6 };
  const ACT = { y: 594, h: 44, w: 118, gap: 8 };
  const MSG_Y = 656;
  const H = 692;
  const PAD_X0 = (W - (9 * PAD.w + 8 * PAD.gap)) / 2;
  const ACT_X0 = (W - (4 * ACT.w + 3 * ACT.gap)) / 2;
  const ACTIONS = [
    { key: 'notes', label: 'Notes', sub: 'N' },
    { key: 'erase', label: 'Erase', sub: 'Backspace' },
    { key: 'undo', label: 'Undo', sub: 'U' },
    { key: 'hint', label: 'Hint', sub: 'H' }
  ];

  const COL = {
    bg: '#1a2231', board: '#222c40', boardAlt: '#1f2839', line: '#2e3a53', thick: '#8f9cba',
    given: '#e8edfa', entry: '#6fb4ff', bad: '#ff5470', note: '#8f9cba', noteHot: '#ffd27a',
    sel: '#ffb02e', peer: 'rgba(255,255,255,.045)', same: 'rgba(111,180,255,.16)',
    hintCell: 'rgba(255,176,46,.22)', hintPlace: 'rgba(74,212,111,.28)', hintElim: 'rgba(255,84,112,.22)'
  };

  const SAVE_KEY = 'easygames.sudoku.save';

  let puzzle = null, solution = null, given = [];
  let grid = [], notes = [], killed = [];
  let autoCand = [];
  let sel = 40;
  let notesMode = false;
  let autoNotes = false;
  let errorCheck = true;
  let undoStack = [];
  let hintStep = null;
  let hintsUsed = 0;
  let message = '', messageKind = '';
  let gradeKey = 'medium';
  let dailyKey = null;                 // set while playing the daily
  let state = 'menu';                  // menu | play | won
  let startAt = 0, elapsed = 0;
  let hover = -1;
  let pressed = '';                    // pad or action button under the pointer
  let resumable = null;

  Shell.mount({
    name: 'Sudoku',
    width: W, height: H, max: 520, pad: 230,
    tools: ['sound', 'pause', 'help'],
    foot: '<b>Arrows</b> move &middot; <b>1</b> to <b>9</b> enter &middot; <b>Shift</b> plus a digit writes a pencil mark &middot; <b>N</b> notes &middot; <b>U</b> undo &middot; <b>H</b> hint',
    rules: `
      <ul>
        <li>Fill the grid so every row, every column and every 3x3 box holds the
            digits 1 to 9 exactly once. Every puzzle has one solution.</li>
        <li>Tap a cell, then a digit. Tap the same digit again to clear it.
            Selecting any cell lights up every copy of its digit.</li>
        <li><b>Notes</b> switches to pencil marks: a digit is then written small in the
            corner of the cell rather than filled in. Holding <b>Shift</b> does the same.</li>
        <li><b>Hint</b> names the technique that applies next and lights up the cells
            it uses. Press it again to apply that one step.</li>
        <li><b>Undo</b> takes back any number of moves. <b>Erase</b> clears the cell,
            and clears its pencil marks if it was already empty.</li>
      </ul>
      <h3>Grades</h3>
      <p>A puzzle is graded by the hardest technique a careful solver needs, never by
         how many blanks it has. <b>Easy</b> needs only singles. <b>Medium</b> adds pairs,
         pointing pairs and box-line reduction. <b>Hard</b> adds triples and the X-wing.
         <b>Expert</b> adds swordfish, XY-wing and simple colouring. <b>Evil</b> cannot be
         finished with any of those and asks you to try a digit and follow it to a
         contradiction.</p>
      <h3>The daily</h3>
      <p>Everyone gets the same puzzle on the same day. Monday is Easy and the week
         climbs to Evil on Sunday.</p>`
  });

  Input.init();
  Input.claim(['Backspace', 'Delete', 'KeyN', 'KeyU', 'KeyH', 'KeyF', 'KeyZ',
               'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
               'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9']);
  const ctx = Shell.ctx;

  const clock = (s) => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const variant = () => (dailyKey ? 'daily' : gradeKey);
  const gradeLabel = () => (dailyKey ? 'Daily ' + R.GRADE_LABEL[gradeKey] : R.GRADE_LABEL[gradeKey]);

  /* ---------- saving ---------- */

  /* A Sudoku is a long sit, and a stray refresh should not throw it away. The
     board is written after every change; the timer resumes where it stopped. */

  function saveGame() {
    if (state !== 'play' || !puzzle) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        puzzle, solution, grid, notes, killed, gradeKey, dailyKey, hintsUsed, autoNotes, errorCheck,
        elapsed: Loop.time - startAt
      }));
    } catch (e) { /* private mode or quota: not worth interrupting play over */ }
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !Array.isArray(s.grid) || s.grid.length !== 81 || !Array.isArray(s.solution)) return null;
      if (R.isSolved(s.grid, s.solution)) return null;
      // A stale daily is just a puzzle now, not "today's".
      if (s.dailyKey && s.dailyKey !== R.todayKey()) s.dailyKey = null;
      return s;
    } catch (e) { return null; }
  }

  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  window.addEventListener('pagehide', saveGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });

  /* ---------- setup ---------- */

  function beginBoard(p, sol, opts) {
    const o = opts || {};
    puzzle = p.slice();
    solution = sol.slice();
    given = puzzle.map((d) => d > 0);
    grid = o.grid ? o.grid.slice() : puzzle.slice();
    notes = o.notes ? o.notes.slice() : new Array(81).fill(0);
    killed = o.killed ? o.killed.slice() : new Array(81).fill(0);
    undoStack = [];
    hintStep = null;
    hintsUsed = o.hintsUsed || 0;
    message = ''; messageKind = '';
    notesMode = false;
    sel = firstEmpty();
    refresh();
    state = 'play';
    startAt = Loop.time - (o.elapsed || 0);
    Shell.hide();
    updateHud();
    updateTools();
  }

  function firstEmpty() {
    for (let i = 0; i < 81; i++) if (!grid[i]) return i;
    return 40;
  }

  /** Generate on a short timer so the "building" card can paint first. */
  function newGame(opts) {
    const o = opts || {};
    dailyKey = o.daily ? R.todayKey() : null;
    if (dailyKey) gradeKey = R.dailyGrade(dailyKey);
    const label = dailyKey ? 'today\'s ' + R.GRADE_LABEL[gradeKey] + ' puzzle' : 'a ' + R.GRADE_LABEL[gradeKey] + ' puzzle';
    Shell.overlay(`<div class="card slim"><h2>Building ${label}</h2>
      <p class="tag" style="margin:0">Digging clues until only one solution is left.</p></div>`);
    Shell.status('', 'building');
    setTimeout(() => {
      const made = dailyKey ? R.daily(dailyKey) : R.generate(gradeKey);
      clearSave();
      beginBoard(made.puzzle, made.solution);
      saveGame();
    }, 30);
  }

  function resumeGame() {
    const s = resumable || loadSave();
    resumable = null;
    if (!s) { newGame(); return; }
    gradeKey = s.gradeKey || 'medium';
    dailyKey = s.dailyKey || null;
    autoNotes = !!s.autoNotes;
    errorCheck = s.errorCheck !== false;
    beginBoard(s.puzzle, s.solution, s);
  }

  /* ---------- state upkeep ---------- */

  function refresh() {
    autoCand = R.candidates(grid);
  }

  function snapshot() {
    undoStack.push({ grid: grid.slice(), notes: notes.slice(), killed: killed.slice() });
    if (undoStack.length > 400) undoStack.shift();
  }

  function afterChange() {
    refresh();
    hintStep = null;
    updateHud();
    saveGame();
  }

  function say(text, kind) { message = text || ''; messageKind = kind || ''; }

  /* ---------- actions ---------- */

  function select(i) {
    if (i < 0 || i > 80) return;
    sel = i;
  }

  /** Enter digit d in the selected cell, or toggle it as a pencil mark. */
  function enter(d, asNote) {
    if (state !== 'play' || !d) return;
    const i = sel;
    if (given[i]) { Sfx.tick(false); return; }
    const note = asNote != null ? asNote : notesMode;
    if (note) {
      if (grid[i]) return;                              // marks live in empty cells only
      snapshot();
      if (autoNotes) killed[i] ^= R.bit(d);
      else notes[i] ^= R.bit(d);
      say('');
      Sfx.tick(false);
      afterChange();
      return;
    }
    snapshot();
    if (grid[i] === d) {
      grid[i] = 0;                                      // same digit again clears it
    } else {
      grid[i] = d;
      notes[i] = 0;
      if (!autoNotes) R.pruneNotes(notes, i, d);
      killed[i] = 0;
    }
    say('');
    afterChange();
    const bad = errorCheck && R.conflicts(grid)[i];
    if (bad) Sfx.bad(); else Sfx.place();
    checkDone();
  }

  function erase() {
    if (state !== 'play') return;
    const i = sel;
    if (given[i]) return;
    if (!grid[i] && !notes[i] && !killed[i]) return;
    snapshot();
    if (grid[i]) grid[i] = 0;
    else { notes[i] = 0; killed[i] = 0; }
    say('');
    Sfx.kick();
    afterChange();
  }

  function undo() {
    if (state !== 'play' || !undoStack.length) return;
    const s = undoStack.pop();
    grid = s.grid; notes = s.notes; killed = s.killed;
    say('');
    Sfx.kick();
    afterChange();
  }

  /** Write the true candidates into every empty cell's manual marks. */
  function fillNotes() {
    if (state !== 'play' || autoNotes) return;
    snapshot();
    for (let i = 0; i < 81; i++) if (!grid[i]) notes[i] = autoCand[i] & ~killed[i];
    say('Pencil marks filled with every candidate.');
    Sfx.tick(false);
    afterChange();
  }

  /** First press explains, second press applies. */
  function hint() {
    if (state !== 'play') return;
    if (hintStep) { applyHint(); return; }
    const s = R.hint(grid, solution, killed);
    if (!s) { say('Nothing left to hint.'); return; }
    hintStep = s;
    hintsUsed++;
    sel = s.place ? s.place.cell : s.cells[0];
    say(s.name + ': ' + s.text + (s.mistake != null ? '' : ' Press hint again to apply it.'), 'hint');
    Sfx.pickup();
    updateHud();
    saveGame();
  }

  function applyHint() {
    const s = hintStep;
    hintStep = null;
    snapshot();
    if (s.mistake != null) {
      if (s.revive) killed[s.mistake] &= ~R.bit(s.revive);
      else grid[s.mistake] = 0;
      sel = s.mistake;
    } else if (s.place) {
      const i = s.place.cell, d = s.place.digit;
      grid[i] = d; notes[i] = 0; killed[i] = 0;
      if (!autoNotes) R.pruneNotes(notes, i, d);
      sel = i;
    } else {
      // Eliminations are remembered as killed so the hinter never repeats them;
      // manual marks lose the digit too so the player sees the effect.
      for (const e of s.elims) {
        killed[e.cell] |= R.bit(e.digit);
        notes[e.cell] &= ~R.bit(e.digit);
      }
    }
    say(s.place ? 'Placed ' + s.place.digit + ' at ' + R.cellName(s.place.cell) + '.' : 'Applied: ' + s.name.toLowerCase() + '.');
    Sfx.place();
    afterChange();
    checkDone();
  }

  function checkDone() {
    if (!R.isComplete(grid)) return;
    if (R.isSolved(grid, solution)) { win(); return; }
    say('The board is full but something is wrong.', 'bad');
    Sfx.bad();
  }

  function win() {
    state = 'won';
    elapsed = Loop.time - startAt;
    clearSave();
    Sfx.win();
    const res = Scores.submit('sudoku', elapsed, { variant: variant(), lower: true });
    updateHud();
    Shell.gameOverCard({
      title: dailyKey ? 'Daily solved' : 'Solved',
      scoreLabel: 'Time',
      score: clock(elapsed),
      isNew: res.isNew && res.previous !== null,
      best: Scores.label('sudoku', variant(), clock),
      extra: `<div class="rowBetween"><span>Grade</span><b style="color:var(--text)">${gradeLabel()}</b></div>
              <div class="rowBetween"><span>Hints used</span><b style="color:var(--text)">${hintsUsed}</b></div>`,
      buttons: dailyKey
        ? [{ label: 'Another puzzle', act: 'menu', primary: true }]
        : [{ label: 'New ' + R.GRADE_LABEL[gradeKey], act: 'again', primary: true }, { label: 'Change grade', act: 'menu' }]
    });
  }

  /* ---------- hud ---------- */

  function currentTime() {
    if (state === 'play') return Loop.time - startAt;
    return elapsed;
  }

  function updateHud() {
    const t = currentTime();
    let left = 0;
    for (let i = 0; i < 81; i++) if (!grid[i]) left++;
    Shell.readouts([
      { label: 'Time', value: clock(t), accent: true },
      { label: 'Grade', value: gradeLabel() },
      { label: 'Empty', value: left },
      { label: 'Hints', value: hintsUsed },
      { label: 'Best', value: Scores.label('sudoku', variant(), clock) }
    ]);
    Shell.status(clock(t), gradeLabel());
  }

  function updateTools() {
    const fill = document.getElementById('fillBtn');
    if (fill) fill.style.display = (state === 'play' && !autoNotes) ? '' : 'none';
    const nb = document.getElementById('newBtn');
    if (nb) nb.style.display = state === 'menu' ? 'none' : '';
  }

  // Two extra tools in the top bar: a way back to the grade picker, and the
  // fill-all-marks shortcut for people who play with manual marks.
  (function addTools() {
    const nb = document.createElement('button');
    nb.id = 'newBtn'; nb.type = 'button'; nb.textContent = 'New puzzle';
    nb.addEventListener('click', () => { saveGame(); showMenu(); });
    Shell.els.tools.insertBefore(nb, Shell.els.tools.firstChild);
    const fb = document.createElement('button');
    fb.id = 'fillBtn'; fb.type = 'button'; fb.textContent = 'Fill marks';
    fb.addEventListener('click', fillNotes);
    Shell.els.tools.insertBefore(fb, Shell.els.tools.firstChild);
    updateTools();
  })();

  /* ---------- input ---------- */

  function cellAt(px, py) {
    const c = Math.floor((px - X0) / CELL), r = Math.floor((py - Y0) / CELL);
    if (r < 0 || c < 0 || r > 8 || c > 8) return -1;
    return r * 9 + c;
  }

  function padAt(px, py) {
    if (py >= PAD.y && py < PAD.y + PAD.h) {
      const k = Math.floor((px - PAD_X0) / (PAD.w + PAD.gap));
      if (k >= 0 && k < 9 && px - PAD_X0 - k * (PAD.w + PAD.gap) < PAD.w) return 'd' + (k + 1);
    }
    if (py >= ACT.y && py < ACT.y + ACT.h) {
      const k = Math.floor((px - ACT_X0) / (ACT.w + ACT.gap));
      if (k >= 0 && k < 4 && px - ACT_X0 - k * (ACT.w + ACT.gap) < ACT.w) return ACTIONS[k].key;
    }
    return '';
  }

  function doAction(key) {
    if (key === 'notes') { notesMode = !notesMode; Sfx.tick(false); }
    else if (key === 'erase') erase();
    else if (key === 'undo') undo();
    else if (key === 'hint') hint();
    else if (key[0] === 'd') enter(+key.slice(1));
  }

  Shell.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  Shell.canvas.addEventListener('pointerdown', (e) => {
    if (state !== 'play' || Shell.isOpen()) return;
    const p = Touch.canvasPos(Shell.canvas, e);
    const i = cellAt(p.x, p.y);
    if (i >= 0) {
      // Selecting is instant; the highlight of its digit is the feedback.
      select(i);
      if (e.button === 2) erase();
      return;
    }
    const key = padAt(p.x, p.y);
    if (key) { pressed = key; doAction(key); }
  });
  window.addEventListener('pointerup', () => { pressed = ''; });

  Shell.canvas.addEventListener('pointermove', (e) => {
    const p = Touch.canvasPos(Shell.canvas, e);
    hover = cellAt(p.x, p.y);
  });
  Shell.canvas.addEventListener('pointerleave', () => { hover = -1; });

  window.addEventListener('keydown', (e) => {
    if (state !== 'play' || Shell.isOpen()) return;
    if (e.metaKey || e.ctrlKey) {
      if (e.code === 'KeyZ') { e.preventDefault(); undo(); }
      return;
    }
    const r = R.rowOf(sel), c = R.colOf(sel);
    switch (e.code) {
      case 'ArrowUp': select(((r + 8) % 9) * 9 + c); return;
      case 'ArrowDown': select(((r + 1) % 9) * 9 + c); return;
      case 'ArrowLeft': select(r * 9 + (c + 8) % 9); return;
      case 'ArrowRight': select(r * 9 + (c + 1) % 9); return;
      case 'Backspace': case 'Delete': case 'Digit0': case 'Numpad0': erase(); return;
      case 'KeyN': notesMode = !notesMode; return;
      case 'KeyU': undo(); return;
      case 'KeyH': hint(); return;
      case 'KeyF': fillNotes(); return;
      default: break;
    }
    let d = 0;
    if (e.code.startsWith('Digit')) d = +e.code.slice(5);
    else if (e.code.startsWith('Numpad')) d = +e.code.slice(6);
    if (d >= 1 && d <= 9) enter(d, notesMode || e.shiftKey);
  });

  /* ---------- drawing ---------- */

  function draw() {
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, W, H);
    drawBoard();
    drawPad();
    drawMessage();
  }

  function drawBoard() {
    const bad = errorCheck ? R.conflicts(grid) : null;
    const selDigit = grid[sel] || 0;
    const hs = hintStep;
    const hintCells = hs ? new Set(hs.cells) : null;
    const elimCells = hs ? new Set(hs.elims.map((e) => e.cell)) : null;

    // Cell backgrounds, then the tints layered on top.
    for (let i = 0; i < 81; i++) {
      const r = R.rowOf(i), c = R.colOf(i);
      const x = X0 + c * CELL, y = Y0 + r * CELL;
      ctx.fillStyle = (R.boxOf(i) % 2 === 0) ? COL.board : COL.boardAlt;
      ctx.fillRect(x, y, CELL, CELL);

      if (state === 'play' || state === 'won') {
        if (i !== sel && R.sees(i, sel)) { ctx.fillStyle = COL.peer; ctx.fillRect(x, y, CELL, CELL); }
        if (selDigit && grid[i] === selDigit) { ctx.fillStyle = COL.same; ctx.fillRect(x, y, CELL, CELL); }
        if (hs) {
          if (hs.place && hs.place.cell === i) { ctx.fillStyle = COL.hintPlace; ctx.fillRect(x, y, CELL, CELL); }
          else if (elimCells.has(i)) { ctx.fillStyle = COL.hintElim; ctx.fillRect(x, y, CELL, CELL); }
          else if (hintCells.has(i)) { ctx.fillStyle = COL.hintCell; ctx.fillRect(x, y, CELL, CELL); }
        }
        if (i === hover && i !== sel) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(x, y, CELL, CELL); }
      }
    }

    // Thin lines, then the box lines over them.
    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 1;
    for (let k = 0; k <= 9; k++) {
      const p = k * CELL + 0.5;
      ctx.beginPath(); ctx.moveTo(X0 + p, Y0); ctx.lineTo(X0 + p, Y0 + BOARD); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X0, Y0 + p); ctx.lineTo(X0 + BOARD, Y0 + p); ctx.stroke();
    }
    ctx.strokeStyle = COL.thick;
    ctx.lineWidth = 3;
    for (let k = 0; k <= 3; k++) {
      const p = k * CELL * 3;
      ctx.beginPath(); ctx.moveTo(X0 + p, Y0); ctx.lineTo(X0 + p, Y0 + BOARD); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X0, Y0 + p); ctx.lineTo(X0 + BOARD, Y0 + p); ctx.stroke();
    }

    // Digits and marks.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 81; i++) {
      const r = R.rowOf(i), c = R.colOf(i);
      const x = X0 + c * CELL, y = Y0 + r * CELL;
      const d = grid[i];
      if (d) {
        ctx.font = (given[i] ? '700 ' : '500 ') + Math.round(CELL * 0.56) + 'px system-ui, sans-serif';
        ctx.fillStyle = bad && bad[i] ? COL.bad : (given[i] ? COL.given : COL.entry);
        if (hs && hs.mistake === i) ctx.fillStyle = COL.bad;
        ctx.fillText(d, x + CELL / 2, y + CELL / 2 + 1);
        continue;
      }
      let marks = autoNotes ? (autoCand[i] & ~killed[i]) : notes[i];
      if (!marks) continue;
      ctx.font = '500 ' + Math.round(CELL * 0.27) + 'px system-ui, sans-serif';
      const elimHere = hs && hs.elims.filter((e) => e.cell === i).map((e) => e.digit);
      for (let k = 1; k <= 9; k++) {
        if (!(marks & R.bit(k))) continue;
        const mx = x + CELL * (0.2 + ((k - 1) % 3) * 0.3);
        const my = y + CELL * (0.2 + Math.floor((k - 1) / 3) * 0.3);
        const struck = elimHere && elimHere.indexOf(k) !== -1;
        ctx.fillStyle = struck ? COL.bad : (selDigit === k ? COL.noteHot : COL.note);
        ctx.fillText(k, mx, my + 1);
        if (struck) {
          ctx.strokeStyle = COL.bad; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(mx - 5, my + 5); ctx.lineTo(mx + 5, my - 5); ctx.stroke();
        }
      }
    }

    // Selection last, so it sits over everything.
    if (state === 'play' || state === 'won') {
      const x = X0 + R.colOf(sel) * CELL, y = Y0 + R.rowOf(sel) * CELL;
      ctx.strokeStyle = COL.sel;
      ctx.lineWidth = 3;
      roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 5);
      ctx.stroke();
    }
  }

  function drawPad() {
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 81; i++) if (grid[i]) counts[grid[i]]++;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let k = 1; k <= 9; k++) {
      const x = PAD_X0 + (k - 1) * (PAD.w + PAD.gap), y = PAD.y;
      const done = counts[k] >= 9;
      const isPressed = pressed === 'd' + k;
      const g = ctx.createLinearGradient(x, y, x, y + PAD.h);
      g.addColorStop(0, isPressed ? '#5b6d95' : '#3a4763');
      g.addColorStop(1, isPressed ? '#405073' : '#2b3550');
      ctx.fillStyle = g;
      roundRect(ctx, x, y, PAD.w, PAD.h, 8);
      ctx.fill();
      if (notesMode) {
        ctx.strokeStyle = 'rgba(255,210,122,.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.fillStyle = done ? 'rgba(255,255,255,.22)' : (notesMode ? COL.noteHot : COL.given);
      ctx.font = (notesMode ? '500 18px' : '700 24px') + ' system-ui, sans-serif';
      ctx.fillText(k, x + PAD.w / 2, y + PAD.h / 2 - 5);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.fillText(done ? 'done' : 9 - counts[k], x + PAD.w / 2, y + PAD.h - 11);
    }

    for (let k = 0; k < 4; k++) {
      const a = ACTIONS[k];
      const x = ACT_X0 + k * (ACT.w + ACT.gap), y = ACT.y;
      const on = (a.key === 'notes' && notesMode) || (a.key === 'hint' && hintStep);
      const isPressed = pressed === a.key;
      ctx.fillStyle = on ? '#ffb02e' : (isPressed ? '#3a4763' : '#222c40');
      roundRect(ctx, x, y, ACT.w, ACT.h, 8);
      ctx.fill();
      ctx.strokeStyle = on ? '#b87a10' : COL.line;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = on ? '#241a03' : COL.given;
      ctx.font = '600 14px system-ui, sans-serif';
      let label = a.label;
      if (a.key === 'hint' && hintStep) label = 'Apply hint';
      if (a.key === 'notes') label = 'Notes ' + (notesMode ? 'on' : 'off');
      ctx.fillText(label, x + ACT.w / 2, y + ACT.h / 2 - 4);
      ctx.fillStyle = on ? 'rgba(36,26,3,.6)' : 'rgba(255,255,255,.35)';
      ctx.font = '500 10px system-ui, sans-serif';
      ctx.fillText(a.sub, x + ACT.w / 2, y + ACT.h / 2 + 12);
    }
  }

  function drawMessage() {
    if (!message) return;
    ctx.fillStyle = messageKind === 'bad' ? COL.bad : (messageKind === 'hint' ? COL.noteHot : COL.note);
    ctx.font = '500 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = wrap(message, W - 40);
    for (let k = 0; k < lines.length && k < 2; k++) ctx.fillText(lines[k], W / 2, MSG_Y + k * 17);
  }

  function wrap(text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    hintStep = null;
    resumable = loadSave();
    if (!puzzle) {
      // A blank board behind the card, so the page never looks empty.
      grid = new Array(81).fill(0); notes = grid.slice(); killed = grid.slice(); given = grid.map(() => false);
      refresh();
    }
    Shell.status('', '');
    Shell.readouts(R.GRADES.map((k) => ({ label: 'Best ' + R.GRADE_LABEL[k], value: Scores.label('sudoku', k, clock) }))
      .concat([{ label: 'Best daily', value: Scores.label('sudoku', 'daily', clock) }]));
    updateTools();
    const today = R.todayKey();
    const dailyG = R.GRADE_LABEL[R.dailyGrade(today)];
    const resumeLine = resumable
      ? `<div class="rowBetween"><span>A ${resumable.dailyKey ? 'daily' : R.GRADE_LABEL[resumable.gradeKey]} puzzle is waiting, ${clock(resumable.elapsed || 0)} in</span>
           <button data-act="continue" class="primary" style="padding:5px 11px;font-size:12px">Resume</button></div>`
      : '';
    Shell.startCard({
      blurb: 'One solution, graded by the logic it needs.',
      extra: `
        ${resumeLine}
        <div class="rowBetween"><span>Grade</span><div class="seg">${
          R.GRADES.map((k) => `<button data-act="grade" data-k="${k}" class="${gradeKey === k ? 'on' : ''}">${R.GRADE_LABEL[k]}</button>`).join('')
        }</div></div>
        <div class="rowBetween"><span>Pencil marks</span><div class="seg">
          <button data-act="marks" data-v="0" class="${!autoNotes ? 'on' : ''}">manual</button>
          <button data-act="marks" data-v="1" class="${autoNotes ? 'on' : ''}">auto</button>
        </div></div>
        <div class="rowBetween"><span>Show conflicts</span><div class="seg">
          <button data-act="check" data-v="1" class="${errorCheck ? 'on' : ''}">yes</button>
          <button data-act="check" data-v="0" class="${!errorCheck ? 'on' : ''}">no</button>
        </div></div>
        <div class="rowBetween"><span>Daily for ${today}</span><b style="color:var(--text)">${dailyG}</b></div>`,
      buttons: [{ label: 'Play ' + R.GRADE_LABEL[gradeKey], act: 'again', primary: true }, { label: 'Play the daily', act: 'daily' }]
    });
  }

  Shell.on({
    again: () => newGame(),
    daily: () => newGame({ daily: true }),
    continue: () => resumeGame(),
    menu: () => showMenu(),
    grade: (el) => { gradeKey = el.dataset.k; showMenu(); },
    marks: (el) => { autoNotes = el.dataset.v === '1'; showMenu(); },
    check: (el) => { errorCheck = el.dataset.v === '1'; showMenu(); }
  });

  Loop.start(() => { if (state === 'play' && Loop.frames % 30 === 0) updateHud(); }, draw);
  showMenu();

  window.EasySudoku = {
    rules: R,
    get state() { return state; },
    get sel() { return sel; },
    grid: () => grid.slice(),
    notes: () => notes.slice(),
    killed: () => killed.slice(),
    solution: () => solution && solution.slice(),
    puzzle: () => puzzle && puzzle.slice(),
    hintStep: () => hintStep,
    setOptions(o) { if (o.autoNotes != null) autoNotes = o.autoNotes; if (o.errorCheck != null) errorCheck = o.errorCheck; },
    setGrade(k) { gradeKey = k; },
    /** Start a specific puzzle without the generator, for headless tests. */
    load(p, sol) { dailyKey = null; clearSave(); beginBoard(p, sol); },
    select, enter, erase, undo, hint, fillNotes, newGame, showMenu,
    toggleNotes() { notesMode = !notesMode; return notesMode; },
    elapsed: currentTime
  };
})();
