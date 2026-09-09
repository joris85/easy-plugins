'use strict';

/* Easy Blocks - the controller.

   The rules engine owns the board, the clock and the score. This file owns
   everything a player can feel: key repeat, the touch layer, the well and its
   side panels on canvas, the line-clear flash, the sounds, the cards.

   Presentation is deliberately its own thing: this game's palette, its rounded
   tiles, the two-row skyline strip above the well and the side panels are all
   original. The MECHANICS are the modern standard, because those are what a
   player's hands expect; the LOOK is not borrowed from anyone. */

(function () {
  const R = BlocksRules;

  /* ---------- geometry ---------- */

  const CELL = 28;
  const COLS = R.DEFAULTS.cols, ROWS = R.DEFAULTS.rows;
  const PEEK = 2;                       // hidden rows drawn above the skyline, where pieces appear
  const WELL_X = 190, WELL_Y = 24;
  const WELL_W = COLS * CELL;
  const WELL_H = (ROWS + PEEK) * CELL;
  /* On a touch device the shared d-pad sits bottom-left of the stage, which
     on a phone is the bottom of the well: the rows you watch hardest. So the
     canvas gets a blank band beneath the well, deep enough for the d-pad and
     its margin at every stage width, and the controls live there instead. */
  const BAND = Touch.available ? 290 : 0;
  const W = 660, H = WELL_Y + WELL_H + 24 + BAND;
  const PANEL_L = { x: 24, w: 142 };
  const PANEL_R = { x: 494, w: 142 };

  /* Seven shapes, seven colours of our own. Nothing here matches the palette
     the well-known game uses for the same shapes, on purpose. */
  const COLOURS = {
    I: '#ff5470', O: '#4da3ff', T: '#4ad46f', S: '#ffb02e',
    Z: '#b98cff', J: '#ff8a4c', L: '#5ee6c8'
  };

  /* Delayed auto shift and auto repeat rate, in ms. Standard is the
     guideline's usual feel; the other two are for people who know what they
     want. Persisted, because handling is a personal setting. */
  const HANDLING = {
    relaxed:  { das: 200, arr: 50, label: 'Relaxed' },
    standard: { das: 170, arr: 30, label: 'Standard' },
    fast:     { das: 110, arr: 12, label: 'Fast' }
  };

  const START_LEVELS = [1, 5, 10];

  /* ---------- keys ---------- */

  const DEFAULT_KEYS = {
    left: 'ArrowLeft', right: 'ArrowRight', soft: 'ArrowDown',
    hard: 'Space', cw: 'ArrowUp', ccw: 'KeyZ', hold: 'KeyC'
  };
  // Second keys people reach for out of habit. Fixed, never rebound.
  const ALT_KEYS = { cw: 'KeyX', ccw: 'ControlLeft', hold: 'ShiftLeft' };
  const KEY_LABELS = {
    left: 'Left', right: 'Right', soft: 'Soft drop', hard: 'Hard drop',
    cw: 'Rotate right', ccw: 'Rotate left', hold: 'Hold'
  };
  const KEY_ORDER = ['left', 'right', 'cw', 'ccw', 'soft', 'hard', 'hold'];

  let keys = loadJson('easygames.blocks.keys', DEFAULT_KEYS);
  let settings = loadJson('easygames.blocks.settings', { handling: 'standard', startLevel: 1 });
  if (!HANDLING[settings.handling]) settings.handling = 'standard';
  if (START_LEVELS.indexOf(settings.startLevel) < 0) settings.startLevel = 1;

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return Object.assign({}, fallback, JSON.parse(raw));
    } catch (e) { /* private mode or corrupt storage */ }
    return Object.assign({}, fallback);
  }

  function saveJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  function claimKeys() {
    Input.claim(Object.values(keys).filter(Boolean).concat(Object.values(ALT_KEYS), ['KeyR', 'KeyP']));
  }

  const held = (a) => Input.held(keys[a]) || Input.held(ALT_KEYS[a]);
  const tapped = (a) => Input.tapped(keys[a]) || Input.tapped(ALT_KEYS[a]);

  /* ---------- state ---------- */

  let game = null;
  let state = 'menu';           // menu | play | over
  let das = { dir: 0, timer: 0 };
  let touchUpWas = false;       // for edge-detecting the d-pad's up button
  let lockFlash = null;         // { cells, t } the cells of the last placed piece, briefly lit
  let popups = [];              // score callouts floating up the well
  let sparks = [];
  let shake = 0;
  let capturing = null;         // action name while the keys card waits for a press

  Shell.mount({
    name: 'Blocks',
    width: W, height: H, max: 660, pad: BAND ? 160 : 240,
    tools: ['sound', 'pause', 'help'],
    foot: '<b>Left</b> and <b>right</b> move &middot; <b>up</b> or <b>X</b> rotates, <b>Z</b> the other way &middot; ' +
          '<b>down</b> soft drops, <b>space</b> hard drops &middot; <b>C</b> or <b>shift</b> holds &middot; ' +
          'on a phone: the d-pad, tap the well to rotate, swipe down to drop, swipe up to hold',
    rules: `
      <ul>
        <li>Shapes fall into a well ten wide and twenty deep. Fill a row from
            wall to wall and it clears. Stack to the top and the game ends.</li>
        <li>The seven shapes come from a <b>bag</b>: all seven, shuffled, then a
            fresh bag. You never wait long for the one you need.</li>
        <li><b>Rotate</b> against a wall or the floor and the piece kicks into
            the nearest spot that fits, so it turns where a naive game refuses.</li>
        <li>A landed piece waits <b>half a second</b> before it sets, and every
            move or turn on the ground restarts that wait, fifteen times at most.
            Slide it under an overhang; you have time.</li>
        <li><b>Hold</b> parks the falling piece for later and brings in the
            next one. Once per placement. The faint outline is the <b>ghost</b>,
            where the piece would land right now.</li>
        <li>One line 100, two 300, three 500, <b>four 800</b>, all times the
            level. A <b>T-spin</b>, turning a T into a pocket it could not fall
            into, pays 800, 1200 or 1600 for one, two or three lines.</li>
        <li>Quads and T-spins in a row are <b>back-to-back</b> and pay half
            again. Clearing on consecutive placements builds a <b>combo</b>
            worth 50 more each step.</li>
        <li>Soft drop pays 1 a cell, hard drop 2. A level every ten lines, and
            the fall gets quicker each time.</li>
      </ul>`
  });

  Input.init();
  claimKeys();
  const ctx = Shell.ctx;

  /* ---------- sound ---------- */

  const snd = {
    move()   { Sfx.tone({ type: 'square', from: 260, to: 260, dur: 0.025, vol: 0.05 }); },
    rotate() { Sfx.tone({ type: 'triangle', from: 520, to: 660, dur: 0.05, vol: 0.09 }); },
    hold()   { Sfx.tone({ type: 'triangle', from: 440, to: 330, dur: 0.08, vol: 0.1 }); },
    lock()   { Sfx.tone({ type: 'square', from: 420, to: 180, dur: 0.07, vol: 0.1 }); },
    drop()   { Sfx.noise({ freqFrom: 1200, freqTo: 220, dur: 0.11, vol: 0.18 }); },
    clear(n) {
      const base = [0, 440, 523, 659][Math.min(n, 3)];
      [0, 4, 7].forEach((semi, i) => Sfx.tone({ type: 'triangle', from: base * Math.pow(2, semi / 12), to: base * Math.pow(2, semi / 12), dur: 0.12, vol: 0.14, delay: i * 0.05 }));
    },
    quad()   { Sfx.win(); },
    spin()   { Sfx.pickup(); },
    level()  { [523, 659, 784].forEach((f, i) => Sfx.tone({ type: 'square', from: f, to: f, dur: 0.1, vol: 0.12, delay: i * 0.09 })); },
    over()   { Sfx.die(); }
  };

  /* ---------- game flow ---------- */

  function start() {
    game = R.newGame({ startLevel: settings.startLevel }, (Math.random() * 1e9) | 0);
    state = 'play';
    das = { dir: 0, timer: 0 };
    lockFlash = null; popups = []; sparks = []; shake = 0;
    Sfx.init(); Sfx.resume();
    Shell.hide();
    updateHud(true);
  }

  function finish() {
    state = 'over';
    snd.over();
    const variant = 'L' + settings.startLevel;
    const res = Scores.submit('blocks', game.score, { variant });
    const st = game.stats;
    Shell.gameOverCard({
      title: game.overReason === 'lockout' ? 'Locked out at the top' : 'The well is full',
      scoreLabel: 'Score',
      score: game.score,
      isNew: res.isNew && res.previous !== null,
      best: Scores.label('blocks', variant),
      extra: `<div class="rowBetween"><span>Lines</span><b style="color:var(--text)">${game.lines}</b></div>
        <div class="rowBetween"><span>Level reached</span><b style="color:var(--text)">${game.level}</b></div>
        <div class="rowBetween"><span>Pieces placed</span><b style="color:var(--text)">${game.pieces}</b></div>
        <div class="rowBetween"><span>Quads / T-spins / best combo</span><b style="color:var(--text)">${st.quad} / ${st.tspin} / ${Math.max(0, st.maxCombo)}</b></div>`,
      buttons: [{ label: 'Play again', act: 'again', primary: true }, { label: 'Menu', act: 'menu' }]
    });
  }

  let hudKey = '';

  /** Rebuild the readouts only when a number changed; every move fires an
      event and rebuilding the HUD thirty times a second is pointless work. */
  function updateHud(force) {
    const g = game;
    const key = g ? g.score + '|' + g.lines + '|' + g.level : 'menu|' + settings.startLevel;
    if (!force && key === hudKey) return;
    hudKey = key;
    Shell.readouts([
      { label: 'Score', value: g ? g.score : 0, accent: true },
      { label: 'Lines', value: g ? g.lines : 0 },
      { label: 'Level', value: g ? g.level : settings.startLevel },
      { label: 'Best', value: Scores.label('blocks', 'L' + settings.startLevel) }
    ]);
    Shell.status(g ? g.score : 0, g ? 'level ' + g.level : '');
  }

  /* ---------- applying engine events ---------- */

  /* Every engine call hands back an ordered list of what happened. This is the
     one place that turns those into sound, callouts and card changes, so a
     hard drop from the keyboard, from a swipe and from the console all look
     and sound identical. */
  function apply(events) {
    let dropped = false;
    for (const e of events) {
      switch (e.type) {
        case 'move': snd.move(); break;
        case 'rotate': snd.rotate(); break;
        case 'hold': snd.hold(); break;
        case 'harddrop':
          if (e.cells > 0) { dropped = true; snd.drop(); shake = Math.max(shake, 0.08); }
          break;
        case 'lock':
          if (!dropped) snd.lock();
          lockFlash = { cells: e.cells, t: 0.16 };
          break;
        case 'spin':
          snd.spin();
          popup(e.tspin === 'mini' ? 'MINI T-SPIN' : 'T-SPIN', '+' + e.points);
          break;
        case 'clear': onClear(e); break;
        case 'levelup':
          snd.level();
          Shell.banner('Level ' + e.level);
          break;
        case 'over': finish(); break;
        default: break;
      }
    }
    if (events.length) updateHud();
    return events;
  }

  function onClear(e) {
    const names = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD'];
    let main = names[e.count];
    if (e.tspin !== 'none') main = (e.tspin === 'mini' ? 'MINI T-SPIN ' : 'T-SPIN ') + main;
    const subs = [];
    if (e.b2b) subs.push('BACK-TO-BACK');
    if (e.combo > 0) subs.push('COMBO x' + e.combo);
    if (e.perfect) subs.push('PERFECT CLEAR');
    subs.push('+' + e.points);
    // A plain single is routine; calling it out every time is noise.
    if (e.count > 1 || e.tspin !== 'none' || e.b2b || e.combo > 0 || e.perfect) popup(main, subs.join('  '));
    if (e.count === 4) { snd.quad(); shake = 0.22; }
    else if (e.tspin !== 'none') { snd.spin(); shake = 0.16; }
    else snd.clear(e.count);
    for (const row of e.rows) sparkRow(row, e.count >= 4 || e.tspin !== 'none' ? 18 : 8);
  }

  function popup(text, sub) {
    popups.push({ text, sub, life: 1.4, max: 1.4 });
    if (popups.length > 3) popups.shift();
  }

  function sparkRow(row, n) {
    const py = rowToPx(row) + CELL / 2;
    for (let i = 0; i < n; i++) {
      sparks.push({
        x: WELL_X + Math.random() * WELL_W, y: py,
        vx: (Math.random() - 0.5) * 220, vy: -60 - Math.random() * 160,
        life: 0.4 + Math.random() * 0.35, max: 0.75,
        size: 2 + Math.random() * 3,
        col: Math.random() < 0.5 ? '#ffffff' : '#ffb02e'
      });
    }
  }

  /* ---------- input ---------- */

  /* Sideways movement with DAS and ARR. The first press moves at once, then
     nothing for `das` ms, then one cell every `arr` ms. Tapping never repeats;
     holding flies to the wall. An ARR of zero means instantly to the wall. */
  function lateral(ms) {
    let dir = 0;
    const l = held('left'), r = held('right');
    if (l && r) {
      // Both down: the most recent press wins, which is what a player who
      // rolls from one key to the other expects.
      const tl = Math.max(Input.pressTime[keys.left] || 0, Input.pressTime[ALT_KEYS.left] || 0);
      const tr = Math.max(Input.pressTime[keys.right] || 0, Input.pressTime[ALT_KEYS.right] || 0);
      dir = tl > tr ? -1 : 1;
    } else if (l) dir = -1;
    else if (r) dir = 1;
    if (!dir && Touch.dir.dx) dir = Touch.dir.dx;

    if (dir !== das.dir) {
      das.dir = dir;
      das.timer = 0;
      if (dir) apply(R.move(game, dir));
      return;
    }
    if (!dir) return;
    const h = HANDLING[settings.handling];
    das.timer += ms;
    if (das.timer < h.das) return;
    if (h.arr <= 0) {
      let guard = COLS;
      while (guard-- > 0 && R.move(game, dir).length) { /* to the wall */ }
      updateHud();
      return;
    }
    let steps = 0;
    while (das.timer >= h.das + h.arr && steps++ < COLS) {
      das.timer -= h.arr;
      if (!apply(R.move(game, dir)).length) { das.timer = h.das; break; }
    }
  }

  function update(dt) {
    tickEffects(dt);
    if (state !== 'play' || !game) return;
    const ms = dt * 1000;

    // Edge-triggered actions first, so a rotate and a hard drop in the same
    // frame land in the order a player would expect: turn, then slam.
    if (tapped('hold') || Touch.tapped('b')) apply(R.hold(game));
    const touchUp = Touch.dir.dy < 0;
    if (tapped('cw') || (touchUp && !touchUpWas)) apply(R.rotate(game, 1));
    touchUpWas = touchUp;
    if (tapped('ccw')) apply(R.rotate(game, -1));
    if (tapped('hard') || Touch.tapped('a')) apply(R.hardDrop(game));
    if (state !== 'play') return;

    lateral(ms);
    if (state !== 'play') return;

    const soft = held('soft') || Touch.dir.dy > 0;
    apply(R.tick(game, ms, soft));
  }

  function tickEffects(dt) {
    if (lockFlash) { lockFlash.t -= dt; if (lockFlash.t <= 0) lockFlash = null; }
    if (shake > 0) shake = Math.max(0, shake - dt);
    for (const p of popups) p.life -= dt;
    popups = popups.filter((p) => p.life > 0);
    for (const s of sparks) {
      s.life -= dt;
      s.vy += 500 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    sparks = sparks.filter((s) => s.life > 0);
  }

  Touch.mount(Shell.els.touchpad, { dpad: true, axis: 'both', action: 'DROP', action2: 'HOLD' });

  /* Gestures on the well itself: a tap on the left half turns left, on the
     right half turns right; a swipe down hard drops, a swipe up holds. The
     d-pad and buttons are separate elements, so their presses never reach
     the canvas and never double up here. */
  (function wellGestures() {
    let sx = 0, sy = 0, active = false;
    Shell.canvas.addEventListener('pointerdown', (e) => {
      sx = e.clientX; sy = e.clientY; active = true;
    });
    Shell.canvas.addEventListener('pointerup', (e) => {
      if (!active) return;
      active = false;
      if (state !== 'play') return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      const min = 24;
      if (Math.abs(dx) < min && Math.abs(dy) < min) {
        const p = Touch.canvasPos(Shell.canvas, e);
        apply(R.rotate(game, p.x < W / 2 ? -1 : 1));
        return;
      }
      if (Math.abs(dy) > Math.abs(dx)) apply(dy > 0 ? R.hardDrop(game) : R.hold(game));
      else apply(R.move(game, dx > 0 ? 1 : -1));
    });
    Shell.canvas.addEventListener('pointercancel', () => { active = false; });
  })();

  /* Key capture for the rebind card runs in the CAPTURE phase and stops the
     event there, so neither the shell (Escape pauses) nor Input sees the
     press that is being assigned. */
  window.addEventListener('keydown', (e) => {
    if (!capturing) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const action = capturing;
    capturing = null;
    if (e.code !== 'Escape') {
      // Taking a key that another action uses hands that action the old key,
      // so nothing is ever left unbound.
      for (const a of KEY_ORDER) if (a !== action && keys[a] === e.code) keys[a] = keys[action];
      keys[action] = e.code;
      saveJson('easygames.blocks.keys', keys);
      claimKeys();
    }
    showKeys();
  }, true);

  window.addEventListener('keydown', (e) => {
    if (capturing || Shell.isOpen() && state !== 'play') return;
    // R restarts mid-game and from the game over card, but never from the
    // pause card: a paused game that vanishes on a stray key is a nasty surprise.
    if (e.code === 'KeyR' && state !== 'menu' && (!Shell.isOpen() || state === 'over')) start();
    if (e.code === 'KeyP' && state === 'play') Shell.togglePause();
  });

  /* ---------- drawing ---------- */

  const rowToPx = (row) => WELL_Y + (row - (R.DEFAULTS.buffer - PEEK)) * CELL;
  const colToPx = (col) => WELL_X + col * CELL;

  /** One tile: a rounded square with a lit top edge and a shaded foot. */
  function tile(px, py, size, colour, alpha) {
    const gap = Math.max(1, Math.round(size * 0.08));
    const s = size - gap * 2;
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = colour;
    roundRect(ctx, px + gap, py + gap, s, s, Math.max(3, size * 0.18));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.26)';
    roundRect(ctx, px + gap + 2, py + gap + 2, s - 4, s * 0.34, Math.max(2, size * 0.12));
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.fillRect(px + gap + 3, py + gap + s - 4, s - 6, 2);
    ctx.globalAlpha = 1;
  }

  function ghostTile(px, py, colour) {
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    roundRect(ctx, px + 4, py + 4, CELL - 8, CELL - 8, 4);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function previewPiece(type, cx, cy, size, alpha) {
    const cells = R.previewCells(type);
    let maxX = 0, maxY = 0;
    for (const [x, y] of cells) { if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
    const ox = cx - (maxX + 1) * size / 2, oy = cy - (maxY + 1) * size / 2;
    for (const [x, y] of cells) tile(ox + x * size, oy + y * size, size, COLOURS[type], alpha);
  }

  function label(text, x, y, align, size, colour) {
    ctx.fillStyle = colour || '#8f9cba';
    ctx.font = '700 ' + (size || 11) + 'px system-ui, sans-serif';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
  }

  function panelBox(x, y, w, h) {
    ctx.fillStyle = '#161d2c';
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = '#2e3a53';
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 10);
    ctx.stroke();
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0f1422';
    ctx.fillRect(0, 0, W, H);
    if (shake > 0) {
      const a = shake * 18;
      ctx.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
    }

    drawWell();
    drawSidePanels();
    if (BAND) {
      ctx.fillStyle = '#0b0f1a';
      ctx.fillRect(0, H - BAND, W, BAND);
      ctx.fillStyle = '#1a2233';
      ctx.fillRect(0, H - BAND, W, 1);
    }

    for (const s of sparks) {
      ctx.globalAlpha = clamp(s.life / s.max, 0, 1);
      ctx.fillStyle = s.col;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;

    // Callouts float up from the lower third of the well.
    popups.forEach((p, i) => {
      const k = 1 - p.life / p.max;
      const y = WELL_Y + WELL_H * 0.62 - k * 60 - i * 44;
      ctx.globalAlpha = p.life < 0.4 ? p.life / 0.4 : 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255,176,46,.9)';
      ctx.shadowBlur = 16;
      ctx.font = '800 26px system-ui, sans-serif';
      ctx.fillText(p.text, WELL_X + WELL_W / 2, y);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffd27a';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText(p.sub, WELL_X + WELL_W / 2, y + 22);
      ctx.globalAlpha = 1;
    });
  }

  function drawWell() {
    // Frame.
    ctx.fillStyle = '#1a2233';
    roundRect(ctx, WELL_X - 8, WELL_Y - 8, WELL_W + 16, WELL_H + 16, 12);
    ctx.fill();
    ctx.fillStyle = '#090c14';
    ctx.fillRect(WELL_X, WELL_Y, WELL_W, WELL_H);

    const skylineY = WELL_Y + PEEK * CELL;
    // The strip above the skyline is where pieces appear. Darker, no grid,
    // and a dashed line so it reads as "outside" the twenty rows that count.
    ctx.fillStyle = '#05070c';
    ctx.fillRect(WELL_X, WELL_Y, WELL_W, PEEK * CELL);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if ((x + y) & 1) continue;
        ctx.fillStyle = 'rgba(255,255,255,.025)';
        ctx.fillRect(colToPx(x), skylineY + y * CELL, CELL, CELL);
      }
    }
    ctx.strokeStyle = 'rgba(255,176,46,.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(WELL_X, skylineY + 0.5);
    ctx.lineTo(WELL_X + WELL_W, skylineY + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!game) return;
    const g = game;

    ctx.save();
    ctx.beginPath();
    ctx.rect(WELL_X, WELL_Y, WELL_W, WELL_H);
    ctx.clip();

    const clearing = g.phase === 'clearing' ? new Set(g.clearing.rows) : null;
    const clearK = clearing ? clamp(g.clearing.timer / g.cfg.clearDelay, 0, 1) : 1;   // 1 fresh, 0 gone

    // The stack.
    for (let y = g.buffer - PEEK; y < g.height; y++) {
      const row = g.grid[y];
      const lit = clearing && clearing.has(y);
      if (lit) {
        // A full row flashes white, then squeezes to its centre line and is gone.
        ctx.save();
        ctx.translate(WELL_X + WELL_W / 2, 0);
        ctx.scale(clearK, 1);
        ctx.translate(-(WELL_X + WELL_W / 2), 0);
      }
      for (let x = 0; x < COLS; x++) {
        const t = row[x];
        if (!t) continue;
        tile(colToPx(x), rowToPx(y), CELL, COLOURS[t] || '#8f9cba');
      }
      if (lit) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * clearK) + ')';
        ctx.fillRect(WELL_X, rowToPx(y), WELL_W, CELL);
        ctx.restore();
      }
    }

    // Ghost, then the piece itself, dimming slightly as its lock clock runs.
    if (g.piece && g.phase === 'fall') {
      const p = g.piece;
      const gy = R.ghostY(g);
      if (gy !== p.y) for (const [x, y] of R.cellsOf(p.type, p.rot, p.x, gy)) ghostTile(colToPx(x), rowToPx(y), COLOURS[p.type]);
      const settle = R.onGround(g) ? clamp(g.lockTimer / g.cfg.lockDelay, 0, 1) : 0;
      for (const [x, y] of R.cellsOf(p.type, p.rot, p.x, p.y)) tile(colToPx(x), rowToPx(y), CELL, COLOURS[p.type], 1 - settle * 0.4);
    }

    if (lockFlash) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * lockFlash.t / 0.16) + ')';
      for (const [x, y] of lockFlash.cells) {
        roundRect(ctx, colToPx(x) + 2, rowToPx(y) + 2, CELL - 4, CELL - 4, 5);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawSidePanels() {
    const g = game;
    const L = PANEL_L, Rp = PANEL_R;

    // Hold.
    label('HOLD', L.x + L.w / 2, WELL_Y + 14, 'center');
    panelBox(L.x, WELL_Y + 24, L.w, 96);
    if (g && g.hold) previewPiece(g.hold, L.x + L.w / 2, WELL_Y + 72, 22, g.holdUsed ? 0.3 : 1);

    // Level, lines and the running bonuses, on the canvas as well as in the
    // HUD, because on a phone the HUD sits below the fold.
    const statY = WELL_Y + 150;
    label('LEVEL', L.x, statY, 'left');
    label(String(g ? g.level : settings.startLevel), L.x, statY + 34, 'left', 32, '#e8edfa');
    label('LINES', L.x, statY + 70, 'left');
    label(String(g ? g.lines : 0), L.x, statY + 104, 'left', 32, '#e8edfa');
    label('SCORE', L.x, statY + 140, 'left');
    label(String(g ? g.score : 0), L.x, statY + 170, 'left', 24, '#ffb02e');

    // The two lamps that tell you what the next clear is worth.
    const lampY = statY + 210;
    const b2b = !!(g && g.b2b), combo = g ? g.combo : -1;
    ctx.fillStyle = b2b ? '#ffb02e' : '#1a2233';
    roundRect(ctx, L.x, lampY, L.w, 26, 7); ctx.fill();
    label('BACK-TO-BACK', L.x + L.w / 2, lampY + 17, 'center', 10.5, b2b ? '#241a03' : '#4a5670');
    ctx.fillStyle = combo > 0 ? '#4ad46f' : '#1a2233';
    roundRect(ctx, L.x, lampY + 32, L.w, 26, 7); ctx.fill();
    label(combo > 0 ? 'COMBO x' + combo : 'COMBO', L.x + L.w / 2, lampY + 49, 'center', 10.5, combo > 0 ? '#0b2412' : '#4a5670');

    // Next queue: the first piece large, the rest smaller beneath it.
    label('NEXT', Rp.x + Rp.w / 2, WELL_Y + 14, 'center');
    panelBox(Rp.x, WELL_Y + 24, Rp.w, 96);
    if (g && g.queue[0]) previewPiece(g.queue[0], Rp.x + Rp.w / 2, WELL_Y + 72, 22);
    const rest = g ? g.queue.slice(1) : [];
    const boxY = WELL_Y + 130;
    panelBox(Rp.x, boxY, Rp.w, 4 * 66 + 10);
    for (let i = 0; i < 4; i++) {
      const cy = boxY + 8 + i * 66 + 33;
      if (rest[i]) previewPiece(rest[i], Rp.x + Rp.w / 2, cy, 17);
      if (i < 3) {
        ctx.fillStyle = '#242e45';
        ctx.fillRect(Rp.x + 18, boxY + 8 + (i + 1) * 66 - 1, Rp.w - 36, 1);
      }
    }
  }

  /* ---------- cards ---------- */

  function showMenu() {
    state = 'menu';
    game = null;
    popups = []; sparks = []; lockFlash = null; shake = 0;
    Shell.status('', '');
    updateHud(true);
    const seg = (items, act, key, current) => `<div class="seg">${items.map((it) =>
      `<button data-act="${act}" data-v="${it.v}" class="${current === it.v ? 'on' : ''}">${it.label}</button>`).join('')}</div>`;
    Shell.startCard({
      blurb: 'Falling shapes, full rows clear. Wall kicks and all.',
      extra: `
        <div class="rowBetween"><span>Start level</span>${seg(START_LEVELS.map((n) => ({ v: n, label: String(n) })), 'level', 'v', settings.startLevel)}</div>
        <div class="rowBetween"><span>Key repeat</span>${seg(Object.keys(HANDLING).map((k) => ({ v: k, label: HANDLING[k].label })), 'handling', 'v', settings.handling)}</div>
        <div class="rowBetween"><span>Best from level ${settings.startLevel}</span><b style="color:var(--text)">${Scores.label('blocks', 'L' + settings.startLevel)}</b></div>`,
      buttons: [{ label: 'Play', act: 'again', primary: true }, { label: 'Keys', act: 'keys' }]
    });
  }

  function showKeys() {
    const rows = KEY_ORDER.map((a) => `
      <div class="rowBetween"><span>${KEY_LABELS[a]}${ALT_KEYS[a] ? ' <small style="color:#5a6a8c">or ' + Input.label(ALT_KEYS[a]) + '</small>' : ''}</span>
        <button data-act="rebind" data-action="${a}" style="min-width:96px">${capturing === a ? 'press...' : Input.label(keys[a])}</button>
      </div>`).join('');
    Shell.overlay(`<div class="card">
      <h2>Keys</h2>
      <p class="tag">Click a key, then press the one you want. Escape cancels.</p>
      ${rows}
      <div class="btnRow">
        <button class="primary" data-act="menu">Back</button>
        <button data-act="resetkeys">Reset to defaults</button>
      </div>
    </div>`);
  }

  Shell.on({
    again: () => start(),
    menu: () => { capturing = null; showMenu(); },
    keys: () => showKeys(),
    level: (el) => { settings.startLevel = +el.dataset.v; saveJson('easygames.blocks.settings', settings); showMenu(); },
    handling: (el) => { settings.handling = el.dataset.v; saveJson('easygames.blocks.settings', settings); showMenu(); },
    rebind: (el) => { capturing = el.dataset.action; showKeys(); },
    resetkeys: () => {
      keys = Object.assign({}, DEFAULT_KEYS);
      saveJson('easygames.blocks.keys', keys);
      claimKeys();
      showKeys();
    }
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  /* Debug hook: drive the rules from the console or a headless test without
     touching the canvas. `game` is the live engine object. */
  window.EasyBlocks = {
    get game() { return game; },
    get state() { return state; },
    get settings() { return settings; },
    get keys() { return keys; },
    rules: R,
    start, update, showMenu,
    move: (dx) => apply(R.move(game, dx)),
    rotate: (dir) => apply(R.rotate(game, dir)),
    hardDrop: () => apply(R.hardDrop(game)),
    hold: () => apply(R.hold(game)),
    tick: (ms, soft) => apply(R.tick(game, ms, !!soft)),
    setHandling(name) { if (HANDLING[name]) settings.handling = name; },
    setStartLevel(n) { if (START_LEVELS.indexOf(n) >= 0) settings.startLevel = n; },
    handling: HANDLING, colours: COLOURS
  };
})();
