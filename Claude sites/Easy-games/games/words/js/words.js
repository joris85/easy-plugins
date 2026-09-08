'use strict';

/* Easy Words - the controller.

   The rules engine decides everything; this file only collects letters, plays
   the reveal, and keeps the daily puzzle and the statistics in localStorage.

   Three choices worth explaining:

   THE KEYBOARD IS DRAWN ON THE CANVAS, under the grid, rather than built from
   DOM buttons. One hit test then serves mouse and touch alike, the keys scale
   with the stage exactly like the tiles do, and the whole game stays inside the
   stage the shell already sizes for every screen.

   PHYSICAL KEYS ARE READ IN THE CAPTURE PHASE. The shell binds M to mute and a
   word game needs M for words. Listening in the capture phase and stopping
   propagation while a game is in progress lets the letters through to the grid
   and keeps the shell's shortcuts for when no game is being typed into.

   THE DAILY PUZZLE SURVIVES A REFRESH, and cannot be replayed. It is written
   after every guess with the date it belongs to. Coming back the same day
   restores the board, and a finished puzzle shows its result card again rather
   than a fresh grid, otherwise a streak would be worth nothing. */

(function () {
  const R = WordsRules;
  const MK = R.MARK;
  const LEN = R.LENGTH, ROWS = R.GUESSES;

  const W = 440, H = 634;

  /* Grid geometry. Six rows of five tiles, centred. */
  const TILE = 60, GAP = 8;
  const GRID_W = LEN * TILE + (LEN - 1) * GAP;
  const GX = (W - GRID_W) / 2;
  const GY = 16;
  const STEP = TILE + GAP;
  const GRID_BOTTOM = GY + ROWS * TILE + (ROWS - 1) * GAP;
  const TOAST_Y = GRID_BOTTOM + 15;

  /* Keyboard geometry. Three staggered rows like a real one, so a player's
     thumbs already know where the letters are. */
  const KEY_W = 38, KEY_H = 54, KEY_GAP = 5, WIDE_W = 58;
  const KB_Y = 446, KB_STEP = KEY_H + 6;
  const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', '#zxcvbnm<'];   // # is Enter, < is Backspace
  const keys = [];
  KEY_ROWS.forEach((row, r) => {
    const widths = [...row].map((ch) => (ch === '#' || ch === '<') ? WIDE_W : KEY_W);
    const total = widths.reduce((a, b) => a + b, 0) + (row.length - 1) * KEY_GAP;
    let x = (W - total) / 2;
    [...row].forEach((ch, i) => {
      keys.push({ ch, x, y: KB_Y + r * KB_STEP, w: widths[i], h: KEY_H });
      x += widths[i] + KEY_GAP;
    });
  });

  /* Own palette: green for correct, amber for close (the site accent), slate for
     out. Tiles are rounded and shaded rather than flat, which is the look here. */
  const COL = {
    correct: ['#3fc76a', '#25a04c'],
    present: ['#ffbe45', '#e0931c'],
    absent:  ['#3a4661', '#2a3449'],
    key:     ['#4c5c82', '#3a4763'],
    empty:   '#1a2233',
    line:    '#2e3a53',
    typed:   '#6b7ea8',
    ink:     '#e8edfa',
    inkDark: '#1a1204'
  };

  const FLIP_STAGGER = 0.26, FLIP_DUR = 0.45;
  const SHAKE_DUR = 0.42, BOUNCE_DUR = 0.75, LOSE_WAIT = 0.9;

  const TITLES_WON = ['First try', 'Second guess', 'Third time lucky', 'Four guesses', 'Five guesses', 'Just in time'];

  let game = null;
  let mode = 'daily';             // daily | free
  let hard = loadFlag('easygames.words.hard');
  let current = '';               // letters typed into the active row
  let state = 'menu';             // menu | play | anim | over
  let anim = null;                // { type, t, row, done }
  let pops = new Array(LEN).fill(0);
  let keyFlash = Object.create(null);
  let toast = null;               // { text, t }
  let freeCount = 0;
  let recorded = false;           // stats written for this game

  Shell.mount({
    name: 'Words',
    width: W, height: H, max: 440, pad: 230,
    tools: ['sound', 'help'],
    foot: 'Type a word and press <b>Enter</b> &middot; <b>Backspace</b> deletes &middot; on a touch screen, tap the keys under the grid',
    rules: `
      <ul>
        <li>Guess the five letter word in six tries. Every guess must be a real word.</li>
        <li>After each guess the tiles change colour. <b>Green</b> is the right letter in
            the right place, <b>amber</b> is a letter that is in the word but somewhere
            else, and <b>grey</b> means it is not in the word at all.</li>
        <li>Repeated letters are counted one for one. If the word has one L and you
            guess two, only one of them lights up.</li>
        <li><b>Daily</b> gives everyone the same word, and it changes at midnight.
            <b>Free play</b> hands out as many words as you like.</li>
        <li><b>Hard mode</b> makes every hint binding: green letters must stay where they
            are and amber letters must be used again.</li>
      </ul>
      <p>Your streak counts consecutive days solved. Miss a day, or miss the word, and
         it starts over. Everything is stored in this browser only.</p>`
  });

  const ctx = Shell.ctx;

  /* ---------- storage ---------- */

  function loadJson(key, fallback) {
    try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch (e) { /* unavailable */ }
    return fallback;
  }
  function saveJson(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
  }
  function loadFlag(key) { return loadJson(key, false) === true; }

  function emptyStats() { return { played: 0, won: 0, streak: 0, maxStreak: 0, dist: [0, 0, 0, 0, 0, 0], last: '' }; }
  function loadStats(m) { return Object.assign(emptyStats(), loadJson('easygames.words.stats.' + m, {})); }
  function saveStats(m, s) { saveJson('easygames.words.stats.' + m, s); }

  function saveDaily() {
    if (!game || game.mode !== 'daily') return;
    saveJson('easygames.words.daily', { date: R.dateKey(), hard: game.hard, guesses: game.guesses });
  }

  /** Today's saved daily, replayed through the engine, or null. Replaying
      rather than trusting stored marks means a change to the scoring can never
      leave a board that disagrees with the rules. */
  function restoreDaily(today) {
    const saved = loadJson('easygames.words.daily', null);
    if (!saved || saved.date !== today || !Array.isArray(saved.guesses)) return null;
    const g = R.makeGame({ answer: R.dailyWord(today), hard: !!saved.hard, mode: 'daily' });
    for (const w of saved.guesses) if (!R.submit(g, w).ok) break;
    return g;
  }

  function yesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return R.dateKey(d);
  }

  /** Write the finished game into the stats, once. A daily streak only carries
      over from a win recorded yesterday; free play streaks are consecutive wins. */
  function recordResult() {
    if (recorded || !game || game.status === 'play') return;
    recorded = true;
    const s = loadStats(game.mode);
    const won = game.status === 'won';
    s.played++;
    if (won) {
      s.won++;
      s.dist[game.guesses.length - 1]++;
      const carries = game.mode === 'daily' ? (s.last === yesterdayKey() && s.streak > 0) : s.streak > 0;
      s.streak = carries ? s.streak + 1 : 1;
      if (s.streak > s.maxStreak) s.maxStreak = s.streak;
    } else {
      s.streak = 0;
    }
    if (game.mode === 'daily') s.last = R.dateKey();
    saveStats(game.mode, s);
  }

  /* ---------- game flow ---------- */

  function newGame(m, forcedAnswer) {
    mode = m || mode;
    const today = R.dateKey();
    if (mode === 'daily') {
      game = restoreDaily(today) || R.makeGame({ answer: R.dailyWord(today), hard, mode: 'daily' });
    } else {
      game = R.makeGame({ answer: forcedAnswer || R.randomWord(), hard, mode: 'free' });
      freeCount++;
    }
    current = '';
    anim = null;
    toast = null;
    pops.fill(0);
    // A restored daily that was already finished must not count again.
    recorded = game.status !== 'play';
    state = game.status === 'play' ? 'play' : 'over';
    Shell.hide();
    updateHud();
    if (mode === 'daily') saveDaily();
    if (state === 'over') showOver();
  }

  function typeLetter(ch) {
    if (state !== 'play' || current.length >= LEN) return;
    current += ch;
    pops[current.length - 1] = 1;
    flashKey(ch);
    blip();
  }

  function backspace() {
    if (state !== 'play' || !current.length) return;
    current = current.slice(0, -1);
    flashKey('<');
  }

  function submitCurrent() {
    if (state !== 'play') return;
    flashKey('#');
    const res = R.submit(game, current);
    if (!res.ok) {
      showToast(res.reason);
      anim = { type: 'shake', t: 0, row: game.guesses.length, done: () => { state = 'play'; } };
      state = 'anim';
      Sfx.tone({ type: 'sawtooth', from: 220, to: 130, dur: 0.16, vol: 0.12 });
      return;
    }
    const row = game.guesses.length - 1;
    current = '';
    pops.fill(0);
    state = 'anim';
    anim = { type: 'reveal', t: 0, row, ticked: 0, done: afterReveal };
    if (game.mode === 'daily') saveDaily();
  }

  function afterReveal() {
    updateHud();
    if (game.status === 'won') {
      Sfx.win();
      recordResult();
      anim = { type: 'bounce', t: 0, row: game.guesses.length - 1, done: showOver };
    } else if (game.status === 'lost') {
      Sfx.bad();
      recordResult();
      showToast(game.answer.toUpperCase());
      anim = { type: 'wait', t: 0, done: showOver };
    } else {
      state = 'play';
    }
  }

  function showOver() {
    state = 'over';
    anim = null;
    updateHud();
    const won = game.status === 'won';
    const s = loadStats(game.mode);
    const daily = game.mode === 'daily';
    const buttons = daily
      ? [{ label: 'Free play', act: 'free', primary: true }, { label: 'Menu', act: 'menu' }]
      : [{ label: 'Next word', act: 'again', primary: true }, { label: 'Menu', act: 'menu' }];
    Shell.gameOverCard({
      title: won ? TITLES_WON[game.guesses.length - 1] : 'Not this time',
      scoreLabel: 'The word was',
      score: game.answer.toUpperCase(),
      extra: distributionHtml(s, won ? game.guesses.length : 0) +
        `<div class="rowBetween"><span>${daily ? 'Day streak' : 'Win streak'}</span><b style="color:var(--text)">${s.streak}</b></div>` +
        (daily ? '<div class="rowBetween"><span>Next word in</span><b id="nextIn" style="color:var(--text);font-variant-numeric:tabular-nums"></b></div>' : ''),
      buttons
    });
    tickCountdown();
  }

  /** Bars for how many guesses each win took. Inline styles, since the card is
      rebuilt from a string and this is the only place that needs them. */
  function distributionHtml(s, highlight) {
    const max = Math.max(1, ...s.dist);
    const rows = s.dist.map((n, i) => {
      const hot = highlight === i + 1;
      const w = Math.max(8, Math.round(n / max * 100));
      return `<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font-size:12px">
        <span style="width:10px;color:var(--dim);text-align:right">${i + 1}</span>
        <div style="flex:1"><div style="width:${w}%;min-width:20px;height:16px;line-height:16px;border-radius:4px;
          text-align:right;padding:0 6px;font-weight:700;font-size:11px;
          background:${hot ? COL.correct[0] : '#3a4661'};color:${hot ? COL.inkDark : COL.ink}">${n}</div></div>
      </div>`;
    }).join('');
    const rate = s.played ? Math.round(s.won / s.played * 100) : 0;
    return `<div style="margin-top:14px">
      <div style="display:flex;gap:14px;font-size:12px;color:var(--dim);margin-bottom:8px">
        <span>Played <b style="color:var(--text)">${s.played}</b></span>
        <span>Won <b style="color:var(--text)">${rate}%</b></span>
        <span>Best streak <b style="color:var(--text)">${s.maxStreak}</b></span>
      </div>${rows}</div>`;
  }

  /** Time until the player's own midnight, when the daily word changes. */
  function tickCountdown() {
    const el = document.getElementById('nextIn');
    if (!el) return;
    const now = new Date();
    const mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const s = Math.max(0, Math.floor((mid - now) / 1000));
    const p = (n) => String(n).padStart(2, '0');
    el.textContent = Math.floor(s / 3600) + ':' + p(Math.floor(s / 60) % 60) + ':' + p(s % 60);
  }

  function updateHud() {
    const s = loadStats(mode);
    const rate = s.played ? Math.round(s.won / s.played * 100) + '%' : '--';
    Shell.readouts([
      { label: mode === 'daily' ? 'Day streak' : 'Win streak', value: s.streak, accent: true },
      { label: 'Played', value: s.played },
      { label: 'Won', value: rate },
      { label: 'Best streak', value: s.maxStreak }
    ]);
    const hardTag = game && game.hard ? ' · hard' : '';
    if (mode === 'daily') {
      const today = R.dateKey();
      Shell.status('#' + R.puzzleNumber(today), niceDate(new Date()) + hardTag);
    } else {
      Shell.status('Free', 'word ' + freeCount + hardTag);
    }
  }

  function niceDate(d) {
    return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getFullYear();
  }

  function showToast(text) { toast = { text, t: 0 }; }
  function flashKey(ch) { keyFlash[ch] = 1; }
  function blip() { Sfx.tone({ type: 'sine', from: 640, to: 640, dur: 0.035, vol: 0.07 }); }

  /* ---------- input ---------- */

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (state !== 'play' && state !== 'anim') return;
    if (Shell.isOpen()) return;
    // e.key rather than e.code, so an AZERTY or Dvorak keyboard types what
    // its caps say; the fallback covers browsers that report 'Unidentified'.
    const k = e.key && e.key.length === 1 ? e.key.toLowerCase() : '';
    let handled = true;
    if (e.key === 'Enter') submitCurrent();
    else if (e.key === 'Backspace') backspace();
    else if (/^[a-z]$/.test(k)) typeLetter(k);
    else if (/^Key[A-Z]$/.test(e.code) && !k) typeLetter(e.code.slice(3).toLowerCase());
    else handled = false;
    if (!handled) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    // The shell's own unlock listener is behind us now, so unlock audio here.
    Sfx.init(); Sfx.resume();
    // A tool button left focused would also fire on Enter.
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
  }, true);

  function keyAt(px, py) {
    for (const k of keys) if (px >= k.x && px < k.x + k.w && py >= k.y && py < k.y + k.h) return k;
    return null;
  }

  Shell.canvas.addEventListener('pointerdown', (e) => {
    if (state !== 'play') return;
    const p = Touch.canvasPos(Shell.canvas, e);
    const k = keyAt(p.x, p.y);
    if (!k) return;
    e.preventDefault();
    if (k.ch === '#') submitCurrent();
    else if (k.ch === '<') backspace();
    else typeLetter(k.ch);
  });

  /* ---------- update ---------- */

  function update(dt) {
    for (let i = 0; i < LEN; i++) if (pops[i] > 0) pops[i] = Math.max(0, pops[i] - dt * 6);
    for (const k in keyFlash) { keyFlash[k] -= dt * 7; if (keyFlash[k] <= 0) delete keyFlash[k]; }
    if (toast) { toast.t += dt; if (toast.t > 2.2) toast = null; }
    if (state === 'over') tickCountdown();

    if (!anim) return;
    anim.t += dt;
    if (anim.type === 'reveal') {
      // One tick per tile as it turns over, timed to the halfway point.
      const shown = Math.min(LEN, Math.floor((anim.t - FLIP_DUR / 2) / FLIP_STAGGER) + 1);
      while (anim.ticked < shown) {
        const m = game.marks[anim.row][anim.ticked++];
        Sfx.tone({ type: 'triangle', from: m === MK.CORRECT ? 660 : m === MK.PRESENT ? 520 : 300,
                   to: m === MK.ABSENT ? 220 : 720, dur: 0.07, vol: 0.09 });
      }
      if (anim.t >= (LEN - 1) * FLIP_STAGGER + FLIP_DUR) finishAnim();
    } else if (anim.type === 'shake' && anim.t >= SHAKE_DUR) finishAnim();
    else if (anim.type === 'bounce' && anim.t >= BOUNCE_DUR) finishAnim();
    else if (anim.type === 'wait' && anim.t >= LOSE_WAIT) finishAnim();
  }

  function finishAnim() {
    const done = anim.done;
    anim = null;
    done();
  }

  /* ---------- drawing ---------- */

  function draw() {
    ctx.fillStyle = '#141a2c';
    ctx.fillRect(0, 0, W, H);

    const done = game ? game.guesses.length : 0;
    for (let r = 0; r < ROWS; r++) {
      const revealing = anim && anim.type === 'reveal' && anim.row === r;
      const shaking = anim && anim.type === 'shake' && anim.row === r;
      const bouncing = anim && anim.type === 'bounce' && anim.row === r;
      let dx = 0;
      if (shaking) dx = Math.sin(anim.t * 48) * 7 * (1 - anim.t / SHAKE_DUR);
      const active = game && r === done && state !== 'over';

      for (let i = 0; i < LEN; i++) {
        const x = GX + i * STEP + dx, y = GY + r * STEP;
        let letter = '', mark = null, sy = 1, dy = 0, scale = 1;

        if (r < done) {
          letter = game.guesses[r][i];
          mark = game.marks[r][i];
          if (revealing) {
            const local = clamp((anim.t - i * FLIP_STAGGER) / FLIP_DUR, 0, 1);
            sy = Math.abs(Math.cos(local * Math.PI));
            if (local < 0.5) mark = null;
          }
          if (bouncing) {
            const local = clamp((anim.t - i * 0.08) / 0.45, 0, 1);
            dy = -Math.sin(local * Math.PI) * 14;
          }
        } else if (active && i < current.length) {
          letter = current[i];
          scale = 1 + pops[i] * 0.08;
        }
        drawTile(x, y, letter, mark, sy, dy, scale);
      }
    }

    drawKeyboard();
    if (toast) drawToast();
  }

  function drawTile(x, y, letter, mark, sy, dy, scale) {
    const cx = x + TILE / 2, cy = y + TILE / 2 + dy;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, sy * scale);
    if (mark) {
      const g = ctx.createLinearGradient(0, -TILE / 2, 0, TILE / 2);
      g.addColorStop(0, COL[mark][0]);
      g.addColorStop(1, COL[mark][1]);
      ctx.fillStyle = g;
      roundRect(ctx, -TILE / 2, -TILE / 2, TILE, TILE, 10);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      roundRect(ctx, -TILE / 2 + 3, -TILE / 2 + 3, TILE - 6, (TILE - 6) * .4, 7);
      ctx.fill();
    } else {
      ctx.fillStyle = COL.empty;
      roundRect(ctx, -TILE / 2, -TILE / 2, TILE, TILE, 10);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = letter ? COL.typed : COL.line;
      roundRect(ctx, -TILE / 2 + 1, -TILE / 2 + 1, TILE - 2, TILE - 2, 9);
      ctx.stroke();
    }
    if (letter) {
      ctx.fillStyle = mark === MK.PRESENT ? COL.inkDark : COL.ink;
      ctx.font = '800 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter.toUpperCase(), 0, 2);
    }
    ctx.restore();
  }

  function drawKeyboard() {
    // The keyboard learns from rows that have finished turning over, never from
    // the one mid reveal, or it would give the answer away before the tiles do.
    let known = Object.create(null);
    if (game) {
      const upto = anim && anim.type === 'reveal' ? anim.row : game.guesses.length;
      known = R.keyStates(game.guesses.slice(0, upto), game.marks.slice(0, upto));
    }
    for (const k of keys) {
      const mark = known[k.ch] || null;
      const flash = keyFlash[k.ch] || 0;
      const cols = mark ? COL[mark] : COL.key;
      const g = ctx.createLinearGradient(0, k.y, 0, k.y + k.h);
      g.addColorStop(0, cols[0]);
      g.addColorStop(1, cols[1]);
      ctx.fillStyle = g;
      roundRect(ctx, k.x, k.y, k.w, k.h, 7);
      ctx.fill();
      if (flash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (flash * 0.35).toFixed(2) + ')';
        roundRect(ctx, k.x, k.y, k.w, k.h, 7);
        ctx.fill();
      }
      ctx.fillStyle = mark === MK.PRESENT ? COL.inkDark : (mark === MK.ABSENT ? '#8f9cba' : COL.ink);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (k.ch === '#') {
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.fillText('ENTER', k.x + k.w / 2, k.y + k.h / 2 + 1);
      } else if (k.ch === '<') {
        drawBackspace(k.x + k.w / 2, k.y + k.h / 2);
      } else {
        ctx.font = '700 17px system-ui, sans-serif';
        ctx.fillText(k.ch.toUpperCase(), k.x + k.w / 2, k.y + k.h / 2 + 1);
      }
    }
  }

  /** A backspace glyph as a path, so no icon font is needed. */
  function drawBackspace(cx, cy) {
    ctx.strokeStyle = COL.ink;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx - 5, cy - 7);
    ctx.lineTo(cx + 12, cy - 7);
    ctx.lineTo(cx + 12, cy + 7);
    ctx.lineTo(cx - 5, cy + 7);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 3.5); ctx.lineTo(cx + 7, cy + 3.5);
    ctx.moveTo(cx + 7, cy - 3.5); ctx.lineTo(cx, cy + 3.5);
    ctx.stroke();
  }

  function drawToast() {
    const fade = toast.t < 0.15 ? toast.t / 0.15 : toast.t > 1.8 ? Math.max(0, (2.2 - toast.t) / 0.4) : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(toast.text).width + 28;
    ctx.fillStyle = '#e8edfa';
    roundRect(ctx, W / 2 - tw / 2, TOAST_Y - 13, tw, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#12172a';
    ctx.fillText(toast.text, W / 2, TOAST_Y + 1);
    ctx.restore();
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    game = null;
    anim = null;
    toast = null;
    current = '';
    updateHud();
    const today = R.dateKey();
    const saved = restoreDaily(today);
    let todayLine = 'Not played yet';
    if (saved) {
      todayLine = saved.status === 'won' ? 'Solved in ' + saved.guesses.length
                : saved.status === 'lost' ? 'Not solved'
                : saved.guesses.length + ' of ' + ROWS + ' guesses used';
    }
    const dailyDone = saved && saved.status !== 'play';
    Shell.startCard({
      blurb: 'Five letters, six guesses. Green is right, amber is close, grey is out.',
      extra: `<div class="rowBetween"><span>Mode</span><div class="seg">
          <button data-act="mode" data-k="daily" class="${mode === 'daily' ? 'on' : ''}">Daily</button>
          <button data-act="mode" data-k="free" class="${mode === 'free' ? 'on' : ''}">Free play</button>
        </div></div>
        <div class="rowBetween"><span>Hard mode</span>
          <button class="chip ${hard ? 'on' : ''}" data-act="hard">${hard ? 'On' : 'Off'}</button></div>
        <div class="rowBetween"><span>Puzzle #${R.puzzleNumber(today)}, ${niceDate(new Date())}</span>
          <b style="color:var(--text)">${todayLine}</b></div>`,
      buttons: [{ label: mode === 'daily' && dailyDone ? 'See today\'s result' : 'Play', act: 'again', primary: true }]
    });
  }

  Shell.on({
    again: () => newGame(),
    menu: () => showMenu(),
    free: () => newGame('free'),
    mode: (el) => { mode = el.dataset.k; showMenu(); },
    hard: () => { hard = !hard; saveJson('easygames.words.hard', hard); showMenu(); }
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyWords = {
    get state() { return state; },
    get mode() { return mode; },
    game: () => game,
    rules: R,
    current: () => current,
    newGame, typeLetter, backspace, submit: submitCurrent, showMenu,
    setHard(v) { hard = !!v; },
    stats: loadStats,
    flush() {                    // run every pending animation to its end
      let guard = 0;
      while (anim && guard++ < 20) finishAnim();
    }
  };
})();
