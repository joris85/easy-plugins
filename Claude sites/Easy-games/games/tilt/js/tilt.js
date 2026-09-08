'use strict';

/* Easy Tilt - the controller.

   The rules engine resolves a whole drop instantly and hands back an ordered
   list of events. This file plays that list back as animation, one event at a
   time, against a display copy of the board. So the simulation is never waiting
   on the animation, and the animation can never disagree with the simulation. */

(function () {
  const R = TiltRules;
  const V = TiltRender;
  const G = V.G;
  const K = R.KIND;

  /* The height thrown marbles travel at. Shared by the launch and the landing:
     if these two ever disagree the marble jumps between the events. */
  const TRAVEL_LANE = G.ceilingY + 2;

  const DUR = {
    land: 0.40, launch: 0.52, tilt: 0.24, clear: 0.44,
    merge: 0.38, blast: 0.34, wrap: 0.01, tint: 0.22,
    jokerise: 0.22, level: 0.60, overflow: 0.60,
    starclear: 0.90, arm: 0.30, cascadeCapped: 0.01, reload: 0.01, fizzle: 0.22,
    earn: 0.40, inert: 0.18, tower: 0.45, twister: 0.50,
    level0: 0.25, blocked: 0.30, blackout: 0.40, darken: 0.30
  };

  /* The best-documented failure of the original was not difficulty, it was
     comprehension: players report enjoying it for years while treating the
     weight numbers as noise, and the PC release shipped with no in-game help at
     all. So each mechanic explains itself the first time it actually happens,
     in context, without stopping play. Shown once ever, then remembered. */
  const LESSONS = {
    tilt:     ['The scale tipped', 'A see-saw flips the moment one pan outweighs the other. The number under each column is its total weight.'],
    launch:   ['The rising pan throws', 'The pan that goes UP catapults its top marble, over the pivot and TOWARDS the heavy side. It flies as many columns as the weight difference, so the numbers are your aim.'],
    wrap:     ['Off the edge and back', 'Thrown clean off the board, a marble returns on the far side transformed. Plain becomes a Heart, a Heart becomes a Bomb.'],
    clear:    ['Three in a row', 'Three or more of one colour side by side clear, and the clear spreads to every connected marble of that colour. Stacked alone never clears.'],
    merge:    ['Five became one', 'Five of a colour stacked in one pan melt into a single marble carrying all of their weight. Now you have something heavy to aim with.'],
    extra:    ['A special marble', 'Specials weigh nothing at all, so they never tip a scale. Press Marbles above to see what each one does.'],
    depot:    ['You keep what you hold', 'Moving the crane never swaps your marble. Where you DROP decides which one you are handed next, from that column\'s stack.'],
    joker:    ['A Joker is coming', 'Every fifteenth marble is a multicolour Joker, and the counter shows how many are left. Watch which column catches it.'],
    critical: ['Careful', 'A pan tilted down holds eight, level seven, but a RAISED pan only six. Loading one side shrinks what the other can hold.']
  };

  let taught = loadTaught();
  let coachQueue = [];
  let coachNow = null;

  function loadTaught() {
    try { return JSON.parse(localStorage.getItem('easygames.tilt.taught') || '{}'); }
    catch (e) { return {}; }
  }

  function teach(key) {
    if (taught[key] || !LESSONS[key]) return;
    taught[key] = 1;
    try { localStorage.setItem('easygames.tilt.taught', JSON.stringify(taught)); } catch (e) { /* ignore */ }
    coachQueue.push({ title: LESSONS[key][0], body: LESSONS[key][1] });
  }

  function resetCoach() {
    taught = {};
    try { localStorage.removeItem('easygames.tilt.taught'); } catch (e) { /* ignore */ }
  }

  let board = null;
  let view = null;              // display copy: stacks plus an animated tilt per scale
  let state = 'menu';           // menu | play | anim | over
  let craneCol = 3;
  let queue = [];
  let anim = null;
  let particles = [];
  let flash = [];               // score popups
  let shake = 0;

  Shell.mount({
    name: 'Tilt',
    width: G.W, height: G.H, max: 600, pad: 240,
    tools: ['sound', 'pause', 'help'],
    foot: '<b>Left</b> and <b>right</b> move the crane &middot; <b>down</b> or <b>space</b> picks up, then drops &middot; you are then handed the next marble from the column you dropped into',
    rules: `
      <ul>
        <li>Drop marbles into eight columns. Each pair of columns sits on a
            <b>see-saw</b>, and each marble has a <b>weight</b> printed on it.</li>
        <li>The crane <b>holds one marble</b> and keeps holding it wherever you
            move. Where you drop decides which marble you get <b>next</b>: the
            bottom one of that column's depot is handed to you, the one above
            falls down to replace it, and a new one arrives on top. So every
            drop is both a placement and a pick.</li>
        <li>When one pan outweighs the other the see-saw flips, and the pan that
            <b>rises</b> catapults its top marble away. Being light is what
            launches you, not being heavy.</li>
        <li>The marble flies <b>towards the heavy side</b>, over the pivot, and
            travels <b>as many columns as the weight difference</b>. Weight on
            the left throws left, weight on the right throws right. So the
            numbers are your aim, in both distance and direction.</li>
        <li>Three or more of one colour <b>side by side</b> clear, and the clear
            spreads to every connected marble of that colour. Stacked marbles
            never clear on their own.</li>
        <li><b>Five</b> of a colour stacked in one pan melt into a single marble
            carrying all of their weight.</li>
        <li>The ceiling is fixed, so a pan tilted <b>down holds eight</b>, a level
            pan seven, and a <b>raised pan only six</b>. Overload any pan and the
            game ends.</li>
        <li>Thrown off the edge, a marble returns on the far side <b>transformed</b>:
            plain becomes a Heart, a Heart becomes a Bomb, a Bomb reverts to a Heart.</li>
      </ul>
      <p>Every <b>fifteenth</b> marble into the depot is a multicolour Joker, and
         the counter tells you how many are left. Other kinds of marble arrive as
         the levels climb. A level is fifty marbles.</p>`
  });

  /* The guide carries the whole marble catalogue, not just the rules. Keeping it
     behind its own button meant the one screen a player opens to find out what
     something does was the one screen that did not say. Computed on access, so
     it reflects the level actually reached rather than a snapshot from mount. */
  (function foldMarblesIntoTheGuide() {
    const baseRules = Shell.cfg.rules;
    Object.defineProperty(Shell.cfg, 'rules', {
      get() {
        return baseRules +
          '<h2 style="margin:22px 0 4px">Every marble</h2>' +
          V.marbleList(R, board, false);
      }
    });
  })();

  Input.init();
  Input.claim(['KeyA', 'KeyD', 'KeyR', 'Space', 'ArrowLeft', 'ArrowRight', 'ArrowDown']);
  const ctx = Shell.ctx;

  /* ---------- saving ---------- */

  /* A game survives a refresh. It used to be thrown away, which is a harsh
     punishment for a mistyped keystroke in a game a session of which runs to
     hundreds of drops. The board is written out after every settled move, so
     the most that can ever be lost is the drop currently in mid-air. */

  const SAVE_KEY = 'easygames.tilt.save';
  let menuSave = null;             // the board showMenu restored, reused on resume

  function saveGame() {
    if (!board || board.over || state === 'menu' || state === 'over') return;
    board.crane = craneCol;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(R.serialize(board))); }
    catch (e) { /* private mode or quota: not worth interrupting play over */ }
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const b = R.restore(JSON.parse(raw));
      // A finished or empty game is not worth offering to resume.
      return b && !b.over && b.dropped > 0 ? b : null;
    } catch (e) { return null; }
  }

  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  /** Build the display copy straight from a board that is already at rest. */
  function viewFrom(b) {
    return {
      stacks: b.stacks.map((col) => col.slice()),
      tilt: b.tilt.slice(),
      tiltTarget: b.tilt.slice()
    };
  }

  function resumeGame() {
    // showMenu has usually already restored this board to use as the backdrop.
    // Restoring a second one would leave the player looking at one board and
    // playing a different object.
    const saved = (state === 'menu' && menuSave) || loadSave();
    menuSave = null;
    if (!saved) { newGame(); return; }
    board = saved;
    view = viewFrom(board);
    craneCol = board.crane == null ? 3 : board.crane;
    if (!board.held) R.pickUp(board, craneCol);
    queue = []; anim = null; particles = []; flash = []; pendingDrop = false;
    coachQueue = []; coachNow = null; paintCoach();
    state = 'play';
    Shell.hide();
    updateHud();
  }

  // pagehide is the one that fires reliably on mobile and on tab discard;
  // visibilitychange covers switching away without closing.
  window.addEventListener('pagehide', saveGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });

  /* And make an accidental refresh ask first. The save above means nothing is
     actually lost either way, but the prompt stops the reflex mid-game.

     Only an ACCIDENT should be challenged. The shell's "Games" and "Quit to
     games" links are deliberate exits, so clicking one arms this flag and the
     guard stands down - otherwise leaving on purpose costs an extra dialog for
     no benefit, since the game is saved regardless. */
  let leavingOnPurpose = false;
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('a.back')) leavingOnPurpose = true;
  }, true);

  window.addEventListener('beforeunload', (e) => {
    if (state !== 'play' && state !== 'anim') return;
    saveGame();
    if (leavingOnPurpose) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });

  /* ---------- setup ---------- */

  function newGame() {
    // Every path to a new game abandons the old one - the button, the R key,
    // and any future caller. Clearing at the call sites instead left R able to
    // start a fresh game while the abandoned one was still sitting in storage,
    // ready to be offered back on the next refresh.
    clearSave();
    board = R.makeBoard({}, (Math.random() * 1e9) | 0);
    view = {
      stacks: Array.from({ length: board.cols }, () => []),
      tilt: new Array(board.cfg.scales).fill(0),
      tiltTarget: new Array(board.cfg.scales).fill(0)
    };
    craneCol = 3;
    // Nobody is handed a marble. The first press of the drop key picks one up
    // from wherever the crane stands - the player's choice, as in the original.
    queue = []; anim = null; particles = []; flash = []; pendingDrop = false;
    coachQueue = []; coachNow = null; paintCoach();
    state = 'play';
    Shell.hide();
    updateHud();
    Shell.banner('Pick up a marble');
  }

  /* ---------- input ---------- */

  let pendingDrop = false;

  function moveCrane(d) {
    // The crane is only a cursor, so there is no reason to freeze it while the
    // board animates.
    if (state !== 'play' && state !== 'anim') return;
    craneCol = ((craneCol + d) % board.cols + board.cols) % board.cols;
    // The marble travels with the crane. What the column under it decides is
    // which marble comes NEXT, so this is a pick as much as a placement.
    teach('depot');
    Sfx.tick(false);
  }

  function dropHere() {
    if (board.over) return;
    // Buffer one drop rather than discarding it. A long cascade can otherwise
    // swallow several seconds of input with no feedback.
    if (state === 'anim') { pendingDrop = true; return; }
    if (state !== 'play') return;
    if (!board.held) {
      // An empty crane picks up rather than drops. Only ever true before the
      // first move of a new game.
      R.pickUp(board, craneCol);
      ghostCache = null;
      Sfx.tick(true);
      updateHud();
      return;
    }
    const events = R.dropFromDepot(board, craneCol);
    if (!events.length || events[0].type === 'rejected') return;
    // The engine resolves the whole drop instantly, so the game can already be
    // lost while the death is still animating. Drop the save NOW rather than
    // when the game-over card appears: refreshing during that second would
    // otherwise resume from just before the fatal drop and undo the loss.
    if (board.over) clearSave();
    queue = events.slice();
    installDisplayHolds(queue);
    state = 'anim';
    nextEvent();
  }

  window.addEventListener('keydown', (e) => {
    if (state === 'menu') return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveCrane(-1);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') moveCrane(1);
    if (e.code === 'ArrowDown' || e.code === 'Space') { e.preventDefault(); dropHere(); }
    if (e.code === 'KeyR' && state !== 'menu') newGame();
  });

  Shell.canvas.addEventListener('pointerdown', (e) => {
    // Mouse and touch get the same buffering the keyboard does, or a cascade
    // swallows several seconds of clicks with no feedback.
    if (state !== 'play' && state !== 'anim') return;
    const p = Touch.canvasPos(Shell.canvas, e);
    const col = Math.round((p.x - G.firstX) / G.pitch);
    if (col < 0 || col >= board.cols) return;
    if (col === craneCol) dropHere();
    else { craneCol = col; Sfx.tick(false); }
  });

  Touch.mount(Shell.els.touchpad, { dpad: true, axis: 'x', action: 'DROP' });

  // Actually consume it. Mounting without reading leaves dead buttons sitting
  // over the board, which is worse than having none.
  let lastTouchDir = 0;
  function pollTouch() {
    if (state !== 'play' && state !== 'anim') { lastTouchDir = Touch.dir.dx; return; }
    const d = Touch.dir.dx;
    if (d !== lastTouchDir) {
      lastTouchDir = d;
      if (d) moveCrane(d);
    }
    if (Touch.tapped('a')) dropHere();
  }

  /* ---------- animation queue ---------- */

  /**
   * The engine resolves the whole cascade before a frame is drawn, and tint and
   * jokerise mutate marbles in place. Without this the board would recolour the
   * instant you press drop, seconds before the marble that caused it lands.
   * So pin the old appearance now and release it when that event plays.
   */
  function installDisplayHolds(events) {
    for (const ev of events) {
      if (!ev.before) continue;
      for (const b of ev.before) {
        const m = findMarble(b.id);
        if (m) m._disp = { colour: b.colour, kind: b.kind == null ? m.kind : b.kind };
      }
    }
  }

  function releaseDisplayHold(ev) {
    if (!ev.before) return;
    for (const b of ev.before) {
      const m = findMarble(b.id);
      if (m) delete m._disp;
    }
  }

  function findMarble(id) {
    for (const stack of board.stacks) {
      for (const m of stack) if (m.id === id) return m;
    }
    return null;
  }

  function nextEvent() {
    if (!queue.length) {
      anim = null;
      verifyView();
      if (board.over) return gameOver();
      state = 'play';
      updateHud();
      saveGame();                          // settled, so this is a safe point
      if (pendingDrop) {                   // a drop was buffered during the animation
        pendingDrop = false;
        dropHere();                        // into wherever the crane is NOW
      }
      return;
    }
    const ev = queue.shift();
    if (DUR[ev.type] == null) {
      // Never fail silently here. A missing handler means the display copy stops
      // matching the simulation, and nothing downstream would ever notice.
      console.warn('Easy Tilt: no handler for event "' + ev.type + '" - resyncing the view');
      resyncView();
    }
    anim = { ev, t: 0, dur: DUR[ev.type] == null ? 0.25 : DUR[ev.type] };
    beginEvent(ev);
    if (anim.dur <= 0.02) { completeEvent(ev); nextEvent(); }
  }

  /** After every drop the display copy must equal the board. Say so if it does not. */
  function verifyView() {
    for (let c = 0; c < board.cols; c++) {
      if (view.stacks[c].length !== board.stacks[c].length) { reportDrift(c); return; }
      for (let r = 0; r < board.stacks[c].length; r++) {
        if (view.stacks[c][r] !== board.stacks[c][r]) { reportDrift(c); return; }
      }
    }
  }

  function reportDrift(col) {
    console.warn('Easy Tilt: display drifted from the simulation at column ' + col + ' - resyncing');
    resyncView();
  }

  function beginEvent(ev) {
    switch (ev.type) {
      case 'launch':
        // It leaves the pan the moment it is thrown, so it stops drawing there.
        view.stacks[ev.from].pop();
        Sfx.kick();
        teach('launch');
        if (ev.wrapped) teach('wrap');
        break;
      case 'tilt':
        view.tiltTarget[ev.scale] = ev.to;
        if (!ev.settling) teach('tilt');
        break;
      case 'clear':
        Sfx.pickup();
        teach('clear');
        break;
      case 'blast':
        Sfx.boom();
        shake = Math.min(12, shake + 7);
        break;
      case 'merge':
        Sfx.win();
        teach('merge');
        break;
      case 'starclear':
        Sfx.win();
        shake = Math.min(14, shake + 10);
        Shell.banner(ev.star === K.GOLD ? 'Golden sweep' : 'Star sweep');
        break;
      case 'arm':
        Sfx.tick(true);
        break;
      case 'fizzle':
        // Landing an extra on an empty pan wastes it. Say so, or it reads as a
        // bug: the marble arrives, nothing happens, and nothing explains why.
        Sfx.tick(false);
        Shell.banner('It needs to land on something');
        break;
      case 'cascadeCapped':
        break;
      case 'overflow':
        Sfx.die();
        shake = Math.min(14, shake + 10);
        break;
      case 'level':
        Shell.banner('Level ' + ev.level);
        Sfx.roundStart();
        break;
      default:
        break;
    }
  }

  function completeEvent(ev) {
    switch (ev.type) {
      case 'land': {
        view.stacks[ev.col].push(ev.marble);
        if (ev.marble.kind !== K.PLAIN && ev.marble.kind !== K.STONE) teach('extra');
        if (view.stacks[ev.col].length >= R.capacityOf(board, ev.col) - 1) teach('critical');
        Sfx.place();
        spawnSparks(V.colX(ev.col), slotY(ev.col, view.stacks[ev.col].length - 1));
        break;
      }
      case 'clear':
      case 'blast': {
        for (const c of ev.cells) {
          particles.push(...burst(V.colX(c.col), slotY(c.col, c.row),
                                  ev.type === 'blast' ? '#ffd775' : colourOf(c.marble)));
        }
        removeFromView(ev.cells);
        if (ev.gain) flash.push({ x: V.colX(ev.cells[0].col), y: slotY(ev.cells[0].col, ev.cells[0].row),
                                  text: '+' + ev.gain, t: 0, chain: ev.chain });
        break;
      }
      case 'tint':
      case 'jokerise':
        releaseDisplayHold(ev);
        Sfx.kick();
        break;
      case 'starclear': {
        for (const c of ev.cells) {
          particles.push(...burst(V.colX(c.col), slotY(c.col, c.row), colourOf(c.marble)));
        }
        for (let c = 0; c < view.stacks.length; c++) view.stacks[c].length = 0;
        if (ev.gain) flash.push({ x: G.W / 2, y: G.ceilingY + 120, text: '+' + ev.gain, t: 0, chain: 2 });
        break;
      }
      case 'merge': {
        removeFromView(ev.rows.map((r) => ({ col: ev.col, row: r })));
        view.stacks[ev.col].splice(ev.rows[0], 0, ev.marble);
        flash.push({ x: V.colX(ev.col), y: slotY(ev.col, ev.rows[0]), text: 'x' + ev.weight, t: 0, chain: 1 });
        break;
      }
      default:
        break;
    }
  }

  /** Force the display copy back onto the simulation. Cheap insurance. */
  function resyncView() {
    for (let c = 0; c < board.cols; c++) view.stacks[c] = board.stacks[c].slice();
    for (let s = 0; s < board.tilt.length; s++) view.tiltTarget[s] = board.tilt[s];
  }

  function removeFromView(cells) {
    const byCol = new Map();
    for (const c of cells) {
      if (!byCol.has(c.col)) byCol.set(c.col, new Set());
      byCol.get(c.col).add(c.row);
    }
    for (const [col, rowSet] of byCol) {
      const rows = Array.from(rowSet).sort((a, b) => b - a);
      for (const r of rows) if (view.stacks[col][r]) view.stacks[col].splice(r, 1);
    }
  }

  function colourOf(m) {
    return m && V.COLOURS[m.colour % V.COLOURS.length] ? V.COLOURS[m.colour % V.COLOURS.length].base : '#ffffff';
  }

  function slotY(col, row) {
    return V.rowY(V.animCupY(view.tilt[col >> 1], col), row);
  }

  /* ---------- effects ---------- */

  function spawnSparks(x, y) {
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const s = 40 + Math.random() * 120;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                       life: 0.28, max: 0.28, size: 2 + Math.random() * 2, col: '#ffc46b' });
    }
  }

  function burst(x, y, col) {
    const out = [];
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * 6.283, s = 50 + Math.random() * 190;
      out.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                 life: 0.35 + Math.random() * 0.3, max: 0.65, size: 2 + Math.random() * 3, col });
    }
    return out;
  }

  /* ---------- update ---------- */

  function update(dt) {
    pollTouch();
    if (shake > 0) shake = Math.max(0, shake - dt * 40);

    for (let s = 0; s < view.tiltTarget.length; s++) {
      view.tilt[s] = approach(view.tilt[s], view.tiltTarget[s], dt * 5.5);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += 620 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = flash.length - 1; i >= 0; i--) {
      flash[i].t += dt;
      if (flash[i].t > 1.1) flash.splice(i, 1);
    }

    if (!coachNow && coachQueue.length) { coachNow = { msg: coachQueue.shift(), t: 0 }; paintCoach(); }
    if (coachNow) {
      coachNow.t += dt;
      if (coachNow.t > 7.5) { coachNow = null; paintCoach(); }
    }

    if (anim) {
      anim.t += dt / anim.dur;
      if (anim.t >= 1) { completeEvent(anim.ev); nextEvent(); }
    }
  }

  function gameOver() {
    state = 'over';
    clearSave();
    const res = Scores.submit('tilt', board.score);
    Shell.gameOverCard({
      title: 'Overloaded',
      scoreLabel: 'Score',
      score: board.score,
      isNew: res.isNew && res.previous !== null,
      best: Scores.label('tilt'),
      extra: `<div class="rowBetween"><span>Level reached</span><b style="color:var(--text)">${board.level}</b></div>
              <div class="rowBetween"><span>Marbles dropped</span><b style="color:var(--text)">${board.dropped}</b></div>
              <div class="rowBetween"><span>Longest chain</span><b style="color:var(--text)">${board.chainBest}</b></div>`,
      buttons: [{ label: 'Play again', act: 'again', primary: true }, { label: 'Menu', act: 'menu' }]
    });
  }

  function updateHud() {
    const left = board.cfg.marblesPerLevel - (board.dropped % board.cfg.marblesPerLevel);
    Shell.readouts([
      { label: 'Score', value: board.score, accent: true },
      { label: 'Level', value: board.level },
      { label: 'To next', value: left },
      { label: 'Joker in', value: R.jokerIn(board) },
      { label: 'Best', value: Scores.label('tilt') }
    ]);
    Shell.status(board.score, 'level ' + board.level);
  }

  /* ---------- drawing ---------- */

  function draw() {
    ctx.save();
    try { drawBoard(); } finally { ctx.restore(); }
  }

  function drawBoard() {
    if (shake > 0.2) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    V.drawBackground(ctx);

    // Clear flashes go UNDER the marbles, so a celebration never hides the board.
    drawUnderEffects();

    for (let s = 0; s < board.cfg.scales; s++) V.drawScale(ctx, s, view.tilt[s]);

    // A Shadow hides marbles for a while. Resolved here rather than stored, so
    // it lapses on its own without anything having to remember to clear it.
    const blackout = R.isDark(board);
    for (let col = 0; col < board.cols; col++) {
      const cy = V.animCupY(view.tilt[col >> 1], col);
      const stack = view.stacks[col];
      for (let row = 0; row < stack.length; row++) {
        stack[row].darkNow = blackout || (stack[row].dark || 0) > board.dropped;
        let scale = 1;
        if (anim && (anim.ev.type === 'clear' || anim.ev.type === 'blast')) {
          if (anim.ev.cells.some((c) => c.col === col && c.row === row)) scale = 1 - anim.t * 0.85;
        }
        if (anim && anim.ev.type === 'merge' && anim.ev.col === col && anim.ev.rows.indexOf(row) >= 0) {
          scale = 1 - anim.t * 0.6;
        }
        V.drawMarble(ctx, stack[row], V.colX(col), V.rowY(cy, row), scale, K);
      }
    }

    drawFlying();
    V.drawDepot(ctx, board.depot, K, craneCol, board.cfg.depotDepth);
    V.drawCrane(ctx, craneCol, board.held, K);
    if (state === 'play') drawGhost();

    const weights = [];
    const critical = [];
    for (let c = 0; c < board.cols; c++) {
      weights.push(R.weightOf(board, c));
      critical.push(view.stacks[c].length >= R.capacityOf(board, c));
    }
    V.drawWeights(ctx, weights, board.tilt, critical);

    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const f of flash) {
      ctx.globalAlpha = clamp(1.1 - f.t, 0, 1);
      ctx.fillStyle = f.chain > 1 ? '#ffd775' : '#ffffff';
      ctx.font = '800 ' + (f.chain > 1 ? 22 : 17) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.text + (f.chain > 1 ? '  x' + f.chain : ''), f.x, f.y - f.t * 34);
      ctx.globalAlpha = 1;
    }

    drawCoach();
  }

  /** A non-blocking callout that explains a mechanic the first time it fires. */
  function drawCoach() {
    return;    // the coach now lives in the DOM, below the board, never over it
  }

  function drawCoachUnused() {
    if (!coachNow) return;
    const { title, body } = coachNow.msg;
    const t = coachNow.t;
    const fade = t < 0.3 ? t / 0.3 : (t > 5.8 ? Math.max(0, (6.5 - t) / 0.7) : 1);

    const pad = 14, w = G.W - 60, x = 30;
    const lines = wrapText(body, w - pad * 2, '13px system-ui, sans-serif');
    const h = 30 + lines.length * 18;
    const y = G.ceilingY + 26;

    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(14,19,30,.94)';
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,176,46,.75)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffb02e';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + pad, y + 9);

    ctx.fillStyle = '#d5ddf0';
    ctx.font = '13px system-ui, sans-serif';
    lines.forEach((ln, i) => ctx.fillText(ln, x + pad, y + 30 + i * 18));
    ctx.globalAlpha = 1;
  }

  function wrapText(text, maxW, font) {
    ctx.font = font;
    const words = text.split(' ');
    const out = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; }
      else line = test;
    }
    if (line) out.push(line);
    return out;
  }

  /** The celebration, drawn behind everything and kept faint on purpose. */
  function drawUnderEffects() {
    if (!anim || (anim.ev.type !== 'clear' && anim.ev.type !== 'blast')) return;
    const cells = anim.ev.cells;
    const k = Math.sin(Math.min(1, anim.t) * Math.PI);
    for (const c of cells) {
      const x = V.colX(c.col), y = V.rowY(V.animCupY(view.tilt[c.col >> 1], c.col), c.row);
      const r = G.ballR * (1 + k * 1.6);
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.30 * k).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.283);
      ctx.fill();
    }
  }

  /** The marble currently in the air, whether falling or thrown. */
  function drawFlying() {
    if (!anim) return;
    const ev = anim.ev;
    const t = Math.min(1, anim.t);

    if (ev.type === 'land') {
      const x = V.colX(ev.col);
      const toY = V.rowY(V.animCupY(view.tilt[ev.col >> 1], ev.col), ev.row);
      // A catapulted marble is already up in the travel lane, having just been
      // carried across. Starting its fall at the crane instead snaps it back to
      // the top of the screen for one frame and replays the descent.
      const fromY = ev.flown ? TRAVEL_LANE : G.craneY + 12;
      const y = fromY + (toY - fromY) * (t * t);        // gravity, accelerating
      V.drawMarble(ctx, ev.marble, x, y, 1, K);

    } else if (ev.type === 'launch') {
      const fromX = V.colX(ev.from);
      const fromY = V.rowY(V.animCupY(view.tilt[ev.from >> 1], ev.from), view.stacks[ev.from].length);
      const toX = V.colX(ev.to);

      /* Up, then across. The marble rises straight to the travel lane and is
         carried sideways by the number of columns it owes; the DOWN leg is the
         land event that follows, which starts from this same lane. Splitting it
         that way is what keeps the whole flight continuous - the two events draw
         one unbroken path instead of each animating from its own idea of a
         starting point. */
      const lane = TRAVEL_LANE;
      const RISE = 0.42;
      let x, y, shown = ev.original || ev.marble;

      if (t < RISE) {
        const k = t / RISE;
        x = fromX;
        y = fromY + (lane - fromY) * (1 - (1 - k) * (1 - k));   // eases out at the top
      } else {
        const k = (t - RISE) / (1 - RISE);
        y = lane;
        if (ev.wrapped) {
          // Off one edge and in at the other, at the same height. Direction has
          // to come from the engine: a wrapped throw can end with to > from
          // even though it flew left, so from/to alone cannot tell us.
          const goingLeft = ev.dir < 0;
          const edgeOut = goingLeft ? -G.ballR : G.W + G.ballR;
          const edgeIn = goingLeft ? G.W + G.ballR : -G.ballR;
          const legA = Math.abs(edgeOut - fromX);
          const legB = Math.abs(toX - edgeIn);
          const cut = legA / Math.max(1, legA + legB);
          if (k < cut) {
            x = fromX + (edgeOut - fromX) * (k / cut);
          } else {
            x = edgeIn + (toX - edgeIn) * ((k - cut) / Math.max(0.0001, 1 - cut));
            shown = ev.marble;                 // it crossed, so it comes back changed
          }
        } else {
          x = fromX + (toX - fromX) * k;
        }
      }

      V.drawMarble(ctx, shown, x, y, 1, K);
    }
  }

  /** Where it lands, whether it kills you, and what the tip will throw where. */
  /* The preview is answered by PLAYING the drop on a copy of the board, not by
     reasoning about it. Two bugs came from reasoning about it:

     - dropping into a raised pan can tip it DOWN, growing its capacity from six
       to eight, so a perfectly safe move was marked fatal (0.17% of drops);
     - a drop routinely kills a DIFFERENT pan than the one it lands in, by
       raising it, by levelling it, or by catapulting a marble into it, so 5.6%
       of the drops that actually ended a game carried no warning at all.

     Both directions are now correct for free, and the throw hints come from the
     engine's own event list rather than a second copy of its rules living here.

     The trial is cached on the board state, so it runs once per move rather
     than once per frame. */

  let ghostCache = null;

  function predict() {
    if (!board.held) return null;
    const key = craneCol + ':' + board.dropped + ':' + board.held.id;
    if (ghostCache && ghostCache.key === key) return ghostCache.val;
    ghostCache = { key: key, val: R.predictDrop(board, craneCol) };
    return ghostCache.val;
  }

  function drawGhost() {
    if (!board.held) return;
    const pred = predict();
    if (!pred) return;

    const info = {
      col: craneCol,
      row: view.stacks[craneCol].length,
      cupTilt: view.tilt[craneCol >> 1],
      fatal: pred.fatal,
      fatalCol: pred.overflowCol,
      fatalRow: pred.overflowCol >= 0 ? view.stacks[pred.overflowCol].length : 0,
      fatalCupTilt: pred.overflowCol >= 0 ? view.tilt[pred.overflowCol >> 1] : 0,
      tip: null
    };

    if (!pred.fatal && showHints) {
      const launch = pred.events.find((e) => e.type === 'launch');
      if (launch) {
        // The landing that belongs to this throw: the first flown one after it.
        const after = pred.events.slice(pred.events.indexOf(launch));
        const land = after.find((e) => e.type === 'land' && e.flown);
        info.tip = {
          from: launch.from, to: launch.to, wrapped: launch.wrapped,
          dir: launch.dir, distance: launch.distance,
          marbleRow: launch.row,
          landRow: land ? land.row : view.stacks[launch.to].length,
          fromCupTilt: view.tilt[launch.from >> 1],
          toCupTilt: view.tilt[launch.to >> 1],
          landFatal: false            // subsumed by the whole-drop prediction
        };
      }
    }

    V.drawGhost(ctx, info, K);
  }

  /* ---------- the throw hints toggle ---------- */

  /* The preview has two layers. The landing circle and the overload warning are
     always on, because they answer "is this move legal". The throw hints - which
     marble the tip will fling and where it ends up - are the layer that teaches
     the game, and the layer a player who already knows it will find noisy. So
     they are switchable, and the choice is remembered. */
  let showHints = loadHints();

  function loadHints() {
    try { return localStorage.getItem('easygames.tilt.hints') !== '0'; }
    catch (e) { return true; }
  }

  (function addHintsButton() {
    const b = document.createElement('button');
    b.type = 'button';
    const paint = () => {
      b.textContent = showHints ? 'Throw hints on' : 'Throw hints off';
      b.classList.toggle('off', !showHints);
    };
    b.addEventListener('click', () => {
      showHints = !showHints;
      try { localStorage.setItem('easygames.tilt.hints', showHints ? '1' : '0'); }
      catch (e) { /* ignore */ }
      paint();
    });
    paint();
    Shell.els.tools.insertBefore(b, Shell.els.tools.firstChild);
  })();

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    // An interrupted game becomes the backdrop as well as the offer, so the
    // player can see it is genuinely still there before choosing to go back.
    const saved = loadSave();
    menuSave = saved;
    board = saved || R.makeBoard({}, 1);
    if (!saved) R.pickUp(board, 3);
    view = viewFrom(board);
    Shell.status('', '');
    Shell.readouts([{ label: 'Best score', value: Scores.label('tilt') }]);

    const detail = saved
      ? `<div class="rowBetween"><span>Score so far</span><b style="color:var(--text)">${saved.score}</b></div>
         <div class="rowBetween"><span>Level</span><b style="color:var(--text)">${saved.level}</b></div>
         <div class="rowBetween"><span>Marbles dropped</span><b style="color:var(--text)">${saved.dropped}</b></div>`
      : `<div class="rowBetween"><span>Columns</span><b style="color:var(--text)">8, on 4 see-saws</b></div>
         <div class="rowBetween"><span>Clear</span><b style="color:var(--text)">3 or more side by side</b></div>
         <div class="rowBetween"><span>Throw distance</span><b style="color:var(--text)">the weight difference</b></div>`;

    const buttons = saved
      ? [{ label: 'Continue', act: 'continueGame', primary: true },
         { label: 'New game', act: 'again' },
         { label: 'Two players', act: 'versus' },
         { label: 'How to play', act: 'howto' }]
      : [{ label: 'Play', act: 'again', primary: true },
         { label: 'Two players', act: 'versus' },
         { label: 'How to play', act: 'howto' },
         { label: 'Replay the tips', act: 'replayCoach' }];

    Shell.startCard({
      blurb: saved
        ? 'Your game is still here. Nothing was lost.'
        : 'Drop weighted marbles onto see-saws. The pan that rises throws its top marble across the board.',
      extra: detail,
      buttons: buttons
    });
  }

  /* The reference card is built straight from the renderer's catalogue, so the
     game can never explain a marble it does not have, or quietly gain one it
     never explains. */
  const REFERENCE = V.MARBLE_INFO.map((r) => [r[0], r[1], r[3], r[2]]);

  function showReference() {
    refCameFromMenu = (state === 'menu');
    const wasPaused = Loop.paused;
    if (!wasPaused && !refCameFromMenu) Loop.pause();
    Shell.overlay(V.marbleCard(R, board, false) +
      '<div class="btnRow"><button class="primary" data-act="closeRef">Back</button></div></div>');
    refWasPaused = wasPaused;
  }
  let refWasPaused = false;
  let refCameFromMenu = false;

  (function addReferenceButton() {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Marbles';
    b.addEventListener('click', () => showReference());
    Shell.els.tools.insertBefore(b, Shell.els.tools.firstChild);
  })();

  Shell.on({
    closeRef: () => {
      if (refCameFromMenu) { showMenu(); return; }
      Shell.hide();
      if (!refWasPaused) Loop.resume();
    },
    replayCoach: () => { resetCoach(); showMenu(); },
    again: () => newGame(),
    continueGame: () => resumeGame(),
    // Leaving on purpose, so the refresh guard must not challenge it.
    versus: () => { leavingOnPurpose = true; window.location.href = 'versus.html'; },
    menu: () => showMenu(),
    howto: () => Shell.showRules()
  });

  /* The coaching lives below the board rather than over it. It explains what
     just happened, so covering the thing it is explaining defeats the purpose. */
  const coachEl = document.createElement('div');
  coachEl.className = 'coach';
  Shell.els.hud.parentNode.insertBefore(coachEl, Shell.els.hud.nextSibling);

  function paintCoach() {
    if (!coachNow) { coachEl.classList.remove('on'); coachEl.innerHTML = ''; return; }
    coachEl.innerHTML = '<b>' + coachNow.msg.title + '</b><span>' + coachNow.msg.body + '</span>';
    coachEl.classList.add('on');
  }

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyTilt = {
    get state() { return state; },
    board: () => board,
    view: () => view,
    rules: R,
    newGame, dropHere, moveCrane,
    setCrane(c) { craneCol = c; },
    get craneCol() { return craneCol; },
    flush() {                              // run the whole animation queue instantly
      let guard = 0;
      while ((anim || queue.length) && guard++ < 500) {
        if (anim) { completeEvent(anim.ev); anim = null; }
        if (queue.length) {
          const ev = queue.shift();
          if (DUR[ev.type] == null) { console.warn('Easy Tilt: no handler for "' + ev.type + '"'); resyncView(); }
          beginEvent(ev); completeEvent(ev);
        }
      }
      anim = null; queue = [];
      for (let s = 0; s < view.tiltTarget.length; s++) view.tilt[s] = view.tiltTarget[s];
      // Same tail as nextEvent, saving included - otherwise the debug harness
      // silently exercises a different code path from real play.
      if (board.over) { if (state !== 'over') gameOver(); }
      else { state = 'play'; updateHud(); saveGame(); }
    }
  };
})();
