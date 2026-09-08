'use strict';

/* Easy Tilt - two players, one keyboard.

   Two ordinary eight-column boards sit side by side, and the rules engine has
   been told they are neighbours. Everything local - matching, flooding, the
   zaps, capacity, losing - happens inside one board exactly as it does in the
   single player game and needed no change at all.

   What crosses is a THROW. The two fields are treated as a single closed ring of
   sixteen columns, so tipping your own see-saw hard enough hurls a marble out of
   your field and into theirs. There is no separate "send garbage" button: the
   attack IS the balance rule, reaching across the gap. Which means the way to
   hurt your opponent is the same skill as keeping your own board alive, and a
   careless drop can arm them by accident.

   The engine resolves each drop instantly and returns an ordered event list,
   every event stamped with the board it happened on. Both players may drop at
   any moment; the engine serialises them and the queue below plays them back in
   order against two display copies. So neither player ever waits for the other,
   and the animation can never disagree with the simulation. */

(function () {
  const R = TiltRules;
  const V = TiltRender;
  const G = V.G;
  const K = R.KIND;

  const GAP = 56;                                  // the space the attacks fly across
  const ORIGIN = [0, G.W + GAP];
  const CANVAS_W = G.W * 2 + GAP;

  const DUR = {
    land: 0.34, launch: 0.46, tilt: 0.22, clear: 0.40,
    merge: 0.34, blast: 0.30, wrap: 0.01, cross: 0.01, tint: 0.20,
    jokerise: 0.20, level: 0.45, overflow: 0.60,
    starclear: 0.80, arm: 0.26, cascadeCapped: 0.01, reload: 0.01, fizzle: 0.22,
    earn: 0.40, inert: 0.18, tower: 0.45, twister: 0.50,
    level0: 0.25, blocked: 0.30, blackout: 0.40, darken: 0.30
  };

  /* The two modes are the manual's two modes, and they differ in more than the
     marble that crosses. Arcade is survival: the last player standing wins,
     nothing arrives in the supply for free, and every extra has to be earned by
     clearing. Competition is a scoring race that happens to share a ring: it
     plays exactly like the solo game, and the highest score wins whoever fell
     over first. */
  const MODES = {
    arcade: {
      name: 'Arcade',
      attack: K.STONE,
      earn: true,               // extras are earned by clearing, never dealt
      special: 0,               // and none fall into the supply on their own
      goal: 'last one standing wins',
      blurb: 'Marbles thrown into the other field turn to <b>stone</b>: they never match, and only force removes one. ' +
             'Extras do not fall into your supply here - you earn them by clearing, and an even clear earns a weapon.'
    },
    competition: {
      name: 'Competition',
      attack: K.HEART,
      earn: false,
      special: R.DEFAULTS.specialChance,
      goal: 'highest score wins',
      blurb: 'Plays like the solo game, on a shared ring. Marbles thrown across arrive as <b>Hearts</b>. ' +
             'When someone overloads the round ends, and the <b>higher score</b> wins it - not the survivor.'
    }
  };

  /* Arcade ends the moment anyone overloads. Competition follows the manual:
     an eliminated player drops out and the other may play on alone, so the
     round only ends when both have fallen - and the survivor gets their chance
     at the higher score, which is what "highest score wins" needs to mean. */
  function roundIsOver(pair, m) {
    return m === 'competition' ? (pair[0].over && pair[1].over) : (pair[0].over || pair[1].over);
  }

  const nowSeconds = () => performance.now() / 1000;

  /** The mode's rules, applied to both boards of a pair (new, resumed, or backdrop). */
  function applyMode(pair, m) {
    for (const b of pair) {
      b.earnExtras = MODES[m].earn;
      b.cfg = Object.assign({}, b.cfg, { specialChance: MODES[m].special });
    }
  }

  /* ---------- state ---------- */

  let boards = null;              // [left, right]
  let views = null;               // display copies, one per side
  let cranes = [3, 3];
  let pending = [false, false];   // one buffered drop per player
  let particles = [[], []];
  let flash = [[], []];
  let shake = [0, 0];
  let queue = [];
  let anim = null;
  let state = 'menu';             // menu | play | anim | over
  let mode = 'arcade';
  let wins = [0, 0];
  let menuSave = null;            // the match showMenu restored, reused on resume

  const NAMES = ['Player 1', 'Player 2'];

  Shell.mount({
    name: 'Tilt Versus',
    // Two boards need roughly twice the room of one. Without widening the page
    // column as well, the pair renders smaller than a single board does.
    width: CANVAS_W, height: G.H, max: 1760, pad: 186, wrapMax: 1760,
    tools: ['sound', 'pause', 'help'],
    root: 'index.html',
    foot: '<b>Player 1</b> A / D to carry, S to drop &middot; <b>Player 2</b> arrow keys to carry, down to drop',
    rules: `
      <ul>
        <li>Two boards, one ring. Your right edge is their left edge, and your
            left edge is their right edge.</li>
        <li>All the normal rules apply inside your own field: three or more of a
            colour <b>side by side</b> clear, five of a colour <b>stacked</b>
            merge, and the pan that <b>rises</b> catapults its top marble
            towards the heavy side.</li>
        <li><b>That catapult is the attack.</b> Build a big enough weight
            difference and the marble flies clean out of your field and lands in
            theirs. There is no separate attack button.</li>
        <li><b>Arcade</b>: a marble arriving across turns to <b>stone</b> and
            blocks them. Nothing falls into your supply for free - you
            <b>earn</b> extras by clearing. An <b>odd</b> number cleared pays
            you something helpful; an <b>even</b> number pays you a weapon that
            does nothing at home and has to be catapulted into their field.
            Overload a pan and you are out; the last one standing wins.</li>
        <li><b>Competition</b>: plays exactly like the solo game, on a shared
            ring. A marble arriving across is a <b>Heart</b>. When someone
            overloads the round ends and the <b>higher score</b> wins it, no
            matter who fell over.</li>
        <li>The first press of your drop key <b>picks up</b> the marble above
            you. After that, where you drop is where your next one comes from.</li>
      </ul>
      <p>Both players drop whenever they like. Nobody waits for a turn.</p>`
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
          V.marbleList(R, boards ? boards[0] : null, mode === 'arcade');
      }
    });
  })();

  Input.init();
  Input.claim(['KeyA', 'KeyD', 'KeyS', 'KeyR', 'Space',
               'ArrowLeft', 'ArrowRight', 'ArrowDown']);
  const ctx = Shell.ctx;

  /* ---------- geometry across two fields ---------- */

  const xOf = (side, col) => ORIGIN[side] + G.firstX + col * G.pitch;

  /** Position on the joint sixteen-column ring, which is how throws are aimed. */
  const ringOf = (side, col) => side * G.cols + col;
  const xOfRing = (r) => xOf(r >= G.cols ? 1 : 0, r % G.cols);

  function slotY(side, col, row) {
    return V.rowY(V.animCupY(views[side].tilt[col >> 1], col), row);
  }

  /* ---------- setup ---------- */

  function newMatch(keepWins) {
    if (!keepWins) wins = [0, 0];
    newRound();
  }

  function newRound() {
    clearMatch();
    const seed = (Math.random() * 1e9) | 0;
    // Different seeds, so the two players are not handed an identical game and
    // reduced to racing the same script.
    boards = R.link(R.makeBoard({}, seed), R.makeBoard({}, seed ^ 0x5bf03635), MODES[mode].attack);
    applyMode(boards, mode);
    views = boards.map(viewFrom);
    cranes = [3, 3];
    // Nobody is handed a marble. The first press of each player's drop key picks
    // one up from wherever their crane is standing - their choice, as in the
    // original, rather than a marble forced on them from column three.
    pending = [false, false];
    particles = [[], []];
    flash = [[], []];
    shake = [0, 0];
    queue = []; anim = null;
    ghostCache = [null, null];
    state = 'play';
    Shell.hide();
    updateHud();
  }

  function viewFrom(b) {
    return {
      stacks: b.stacks.map((c) => c.slice()),
      tilt: b.tilt.slice(),
      tiltTarget: b.tilt.slice()
    };
  }

  /* ---------- saving a match ---------- */

  /* A match survives a refresh exactly as a solo game does: both boards are
     written out after every settled move, each with its own position in the
     random stream, so a resumed match continues with precisely the marbles that
     were coming rather than a freshly rolled set. The link, the mode, the round
     tally and both crane positions ride along with them. */

  const MATCH_KEY = 'easygames.tilt.match';

  function saveMatch() {
    if (!boards || state === 'menu' || state === 'over') return;
    if (roundIsOver(boards, mode)) return;
    boards[0].crane = cranes[0];
    boards[1].crane = cranes[1];
    try {
      localStorage.setItem(MATCH_KEY, JSON.stringify({
        v: 1, mode, wins: wins.slice(),
        boards: [R.serialize(boards[0]), R.serialize(boards[1])]
      }));
    } catch (e) { /* private mode or quota: not worth interrupting play over */ }
  }

  function loadMatch() {
    try {
      const raw = localStorage.getItem(MATCH_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || d.v !== 1 || !MODES[d.mode] || !Array.isArray(d.boards) || d.boards.length !== 2) return null;
      const a = R.restore(d.boards[0]);
      const z = R.restore(d.boards[1]);
      // Either half failing invalidates the whole match: a restored board paired
      // with a fresh one is not the game anybody left.
      if (!a || !z || roundIsOver([a, z], d.mode)) return null;
      if (!a.dropped && !z.dropped) return null;
      R.link(a, z, MODES[d.mode].attack);
      applyMode([a, z], d.mode);
      return { boards: [a, z], mode: d.mode,
               wins: Array.isArray(d.wins) && d.wins.length === 2 ? d.wins.slice() : [0, 0] };
    } catch (e) { return null; }
  }

  function clearMatch() {
    try { localStorage.removeItem(MATCH_KEY); } catch (e) { /* ignore */ }
  }

  function resumeMatch(saved) {
    const m = saved || loadMatch();
    if (!m) { newRound(); return; }
    boards = m.boards;
    mode = m.mode;
    wins = m.wins;
    views = boards.map(viewFrom);
    cranes = [boards[0].crane == null ? 3 : boards[0].crane,
              boards[1].crane == null ? 3 : boards[1].crane];
    for (let s = 0; s < 2; s++) if (!boards[s].held) R.pickUp(boards[s], cranes[s]);
    pending = [false, false];
    particles = [[], []];
    flash = [[], []];
    shake = [0, 0];
    queue = []; anim = null;
    ghostCache = [null, null];
    menuSave = null;
    state = 'play';
    Shell.hide();
    updateHud();
  }

  window.addEventListener('pagehide', saveMatch);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveMatch(); });

  /* ---------- input ---------- */

  function moveCrane(side, d) {
    if (state !== 'play' && state !== 'anim') return;
    if (boards[side].over) return;
    cranes[side] = ((cranes[side] + d) % G.cols + G.cols) % G.cols;
    Sfx.tick(false);
  }

  function dropFor(side) {
    const b = boards[side];
    if (b.over) return;
    // Buffer one drop rather than discarding it, so a long cascade on either
    // board does not swallow this player's input with no feedback.
    if (state === 'anim') { pending[side] = true; return; }
    if (state !== 'play') return;
    if (!b.held) {
      // An empty crane picks up rather than drops. Only ever true at the start
      // of a round, before this player has touched anything.
      if (R.isBlocked(b, cranes[side])) return;
      R.pickUp(b, cranes[side]);
      ghostCache[side] = null;
      Sfx.tick(true);
      updateHud();
      return;
    }
    const events = R.dropFromDepot(b, cranes[side], nowSeconds());
    if (!events.length || events[0].type === 'rejected') return;
    // The engine resolves instantly, so a round can already be decided while the
    // ending is still animating. Drop the save now, or refreshing during that
    // second would rewind to before the losing drop.
    if (roundIsOver(boards, mode)) clearMatch();
    else if (b.over || boards[1 - side].over) {
      // Competition: one player is out, the other plays on for the score.
      const out = b.over ? side : 1 - side;
      Shell.banner(NAMES[out] + ' is out - ' + NAMES[1 - out] + ' plays on');
    }
    queue = queue.concat(events);
    installDisplayHolds(events);
    state = 'anim';
    nextEvent();
  }

  window.addEventListener('keydown', (e) => {
    if (state === 'menu' || state === 'over') return;
    if (e.code === 'KeyA') moveCrane(0, -1);
    if (e.code === 'KeyD') moveCrane(0, 1);
    if (e.code === 'KeyS' || e.code === 'Space') { e.preventDefault(); dropFor(0); }
    if (e.code === 'ArrowLeft') moveCrane(1, -1);
    if (e.code === 'ArrowRight') moveCrane(1, 1);
    if (e.code === 'ArrowDown') { e.preventDefault(); dropFor(1); }
    if (e.code === 'KeyR') newRound();
  });

  Shell.canvas.addEventListener('pointerdown', (e) => {
    if (state !== 'play' && state !== 'anim') return;
    const p = Touch.canvasPos(Shell.canvas, e);
    const side = p.x < ORIGIN[1] - GAP / 2 ? 0 : 1;
    const col = Math.round((p.x - ORIGIN[side] - G.firstX) / G.pitch);
    if (col < 0 || col >= G.cols) return;
    if (col === cranes[side]) dropFor(side);
    else { cranes[side] = col; ghostCache[side] = null; Sfx.tick(false); }
  });

  /* ---------- animation queue ---------- */

  function findMarble(id) {
    for (const v of views) {
      for (const stack of v.stacks) for (const m of stack) if (m.id === id) return m;
    }
    return null;
  }

  /* Hold the appearance the player should still be seeing, for events that
     change a marble the simulation has already moved past. */
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

  function nextEvent() {
    if (!queue.length) {
      anim = null;
      verifyViews();
      if (roundIsOver(boards, mode)) return roundOver();
      state = 'play';
      updateHud();
      saveMatch();                         // settled, so this is a safe point
      for (let s = 0; s < 2; s++) {
        if (pending[s]) { pending[s] = false; dropFor(s); return; }
      }
      return;
    }
    const ev = queue.shift();
    if (DUR[ev.type] == null) {
      // Never fail silently. A missing handler means a display copy stops
      // matching its board and nothing downstream would ever notice.
      console.warn('Easy Tilt Versus: no handler for event "' + ev.type + '" - resyncing');
      resyncViews();
    }
    anim = { ev, t: 0, dur: DUR[ev.type] == null ? 0.25 : DUR[ev.type] };
    beginEvent(ev);
    if (anim.dur <= 0.02) { completeEvent(ev); nextEvent(); }
  }

  /** Both display copies must equal their boards after every settled move. */
  function verifyViews() {
    for (let s = 0; s < 2; s++) {
      const b = boards[s], v = views[s];
      for (let c = 0; c < b.cols; c++) {
        if (v.stacks[c].length !== b.stacks[c].length) return reportDrift(s, c);
        for (let r = 0; r < b.stacks[c].length; r++) {
          if (v.stacks[c][r] !== b.stacks[c][r]) return reportDrift(s, c);
        }
      }
    }
  }

  function reportDrift(side, col) {
    console.warn('Easy Tilt Versus: display drifted at side ' + side + ' column ' + col + ' - resyncing');
    resyncViews();
  }

  function resyncViews() {
    for (let s = 0; s < 2; s++) {
      for (let c = 0; c < boards[s].cols; c++) views[s].stacks[c] = boards[s].stacks[c].slice();
      for (let i = 0; i < boards[s].tilt.length; i++) views[s].tiltTarget[i] = boards[s].tilt[i];
    }
  }

  function beginEvent(ev) {
    const s = ev.side;
    switch (ev.type) {
      case 'launch':
        views[s].stacks[ev.from].pop();
        Sfx.kick();
        break;
      case 'cross':
        Sfx.boom();
        break;
      case 'tower':
      case 'twister':
      case 'blackout':
      case 'blocked':
        Sfx.boom();
        shake[s] = Math.min(14, shake[s] + 8);
        break;
      case 'earn':
        Sfx.win();
        break;
      case 'tilt':
        views[s].tiltTarget[ev.scale] = ev.to;
        break;
      case 'clear':
        Sfx.pickup();
        break;
      case 'blast':
        Sfx.boom();
        shake[s] = Math.min(12, shake[s] + 7);
        break;
      case 'merge':
        Sfx.win();
        break;
      case 'starclear':
        Sfx.win();
        shake[s] = Math.min(14, shake[s] + 10);
        Shell.banner(NAMES[s] + ': star sweep');
        break;
      case 'arm':
        Sfx.tick(true);
        break;
      case 'fizzle':
        // No banner. In a match both players are dropping constantly, so this
        // fires often enough to sit permanently across the middle of the screen,
        // covering the boards it is talking about. The quiet tick is enough.
        Sfx.tick(false);
        break;
      case 'overflow':
        Sfx.die();
        shake[s] = Math.min(14, shake[s] + 10);
        break;
      case 'level':
        Sfx.roundStart();
        break;
      default:
        break;
    }
  }

  function completeEvent(ev) {
    const s = ev.side;
    const view = views[s];
    switch (ev.type) {
      case 'land': {
        view.stacks[ev.col].push(ev.marble);
        Sfx.place();
        spawnSparks(s, xOf(s, ev.col), slotY(s, ev.col, view.stacks[ev.col].length - 1));
        break;
      }
      case 'clear':
      case 'blast': {
        for (const c of ev.cells) {
          particles[s].push(...burst(xOf(s, c.col), slotY(s, c.col, c.row),
                                     ev.type === 'blast' ? '#ffd775' : colourOf(c.marble)));
        }
        removeFromView(s, ev.cells);
        if (ev.gain) {
          flash[s].push({ x: xOf(s, ev.cells[0].col), y: slotY(s, ev.cells[0].col, ev.cells[0].row),
                          text: '+' + ev.gain, t: 0, chain: ev.chain });
        }
        break;
      }
      case 'tint':
      case 'jokerise':
        releaseDisplayHold(ev);
        Sfx.kick();
        break;
      case 'starclear': {
        for (const c of ev.cells) {
          particles[s].push(...burst(xOf(s, c.col), slotY(s, c.col, c.row), colourOf(c.marble)));
        }
        for (let c = 0; c < view.stacks.length; c++) view.stacks[c].length = 0;
        if (ev.gain) flash[s].push({ x: ORIGIN[s] + G.W / 2, y: G.ceilingY + 120, text: '+' + ev.gain, t: 0, chain: 2 });
        break;
      }
      case 'merge': {
        removeFromView(s, ev.rows.map((r) => ({ col: ev.col, row: r })));
        view.stacks[ev.col].splice(ev.rows[0], 0, ev.marble);
        flash[s].push({ x: xOf(s, ev.col), y: slotY(s, ev.col, ev.rows[0]), text: 'x' + ev.weight, t: 0, chain: 1 });
        break;
      }
      case 'cross': {
        // The marble is now the other player's problem. Say so where they will
        // see it, not where it left from.
        flash[ev.toSide].push({ x: xOf(ev.toSide, ev.to), y: G.ceilingY + 40,
                                text: ev.armed ? 'INCOMING!' : (ev.marble.kind === K.HEART ? 'a gift' : 'stone'),
                                t: 0, chain: ev.armed ? 3 : 2 });
        shake[ev.toSide] = Math.min(10, shake[ev.toSide] + 5);
        break;
      }
      case 'earn': {
        flash[s].push({ x: xOf(s, ev.col), y: G.ceilingY + 70,
                        text: ev.attack ? 'weapon earned' : 'extra earned', t: 0, chain: ev.attack ? 3 : 1 });
        break;
      }
      case 'tower':
      case 'twister':
        // Both rearrange the board wholesale, so the display copy is rebuilt
        // rather than patched - there is no incremental version of "scattered".
        resyncViews();
        break;
      case 'inert': {
        // A weapon dropped at home does nothing, on purpose. Without saying so
        // it reads as a marble that simply failed to work.
        flash[s].push({ x: xOf(s, ev.col), y: slotY(s, ev.col, ev.row) - G.ballD,
                        text: 'inert here - throw it', t: 0, chain: 1 });
        break;
      }
      case 'blocked': {
        for (const c of ev.cols) {
          flash[s].push({ x: xOf(s, c), y: G.ceilingY + 44, text: 'sealed', t: 0, chain: 2 });
        }
        break;
      }
      case 'level0':
      case 'blackout':
      case 'darken':
        break;
      default:
        break;
    }
  }

  function removeFromView(side, cells) {
    const byCol = new Map();
    for (const c of cells) {
      if (!byCol.has(c.col)) byCol.set(c.col, new Set());
      byCol.get(c.col).add(c.row);
    }
    for (const [col, rowSet] of byCol) {
      const rows = Array.from(rowSet).sort((a, b) => b - a);
      for (const r of rows) if (views[side].stacks[col][r]) views[side].stacks[col].splice(r, 1);
    }
  }

  /* ---------- particles ---------- */

  function burst(x, y, col) {
    const out = [];
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * 6.283, sp = 50 + Math.random() * 190;
      out.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                 life: 0.35 + Math.random() * 0.3, max: 0.65, size: 2 + Math.random() * 3, col });
    }
    return out;
  }

  function colourOf(m) {
    const c = m && V.COLOURS[m.colour % V.COLOURS.length];
    return c ? c.base : '#ffffff';
  }

  function spawnSparks(side, x, y) {
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = 40 + Math.random() * 120;
      particles[side].push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                             life: 0.28, max: 0.28, size: 2 + Math.random() * 2, col: '#ffc46b' });
    }
  }

  /* ---------- the preview ---------- */

  /* Same trial-run preview as the single player game: the drop is played on a
     copy and the engine is asked what happened. In a match the copy has to take
     the opponent's board with it, or every refresh of the preview would drop
     real stones on a live board. */
  let ghostCache = [null, null];

  function predictFor(side) {
    const b = boards[side];
    if (!b.held || b.over) return null;
    const key = cranes[side] + ':' + b.dropped + ':' + b.held.id + ':' + boards[1 - side].dropped;
    if (ghostCache[side] && ghostCache[side].key === key) return ghostCache[side].val;
    ghostCache[side] = { key, val: R.predictDrop(b, cranes[side]) };
    return ghostCache[side].val;
  }

  /* ---------- loop ---------- */

  function update(dt) {
    let lampsChanged = false;
    for (let s = 0; s < 2; s++) {
      if (boards && state !== 'menu' && R.tickBonus(boards[s], nowSeconds())) lampsChanged = true;
      if (shake[s] > 0) shake[s] = Math.max(0, shake[s] - dt * 40);
      const v = views[s];
      for (let i = 0; i < v.tiltTarget.length; i++) {
        v.tilt[i] = approach(v.tilt[i], v.tiltTarget[i], dt * 5.5);
      }
      for (let i = particles[s].length - 1; i >= 0; i--) {
        const p = particles[s][i];
        p.life -= dt;
        if (p.life <= 0) { particles[s].splice(i, 1); continue; }
        p.vy += 620 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = flash[s].length - 1; i >= 0; i--) {
        flash[s][i].t += dt;
        if (flash[s][i].t > 1.1) flash[s].splice(i, 1);
      }
    }
    if (lampsChanged) updateHud();
    if (anim) {
      anim.t += dt / anim.dur;
      if (anim.t >= 1) { completeEvent(anim.ev); nextEvent(); }
    }
  }

  function approach(a, b, k) {
    const d = b - a;
    if (Math.abs(d) < 0.001) return b;
    return a + d * Math.min(1, k);
  }

  function draw() {
    ctx.save();
    try { drawMatch(); } finally { ctx.restore(); }
  }

  function drawMatch() {
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(0, 0, CANVAS_W, G.H);
    for (let s = 0; s < 2; s++) drawSide(s);
    V.setOrigin(0);
    drawDivider();
    drawFlying();
  }

  function drawSide(side) {
    const view = views[side];
    const board = boards[side];
    ctx.save();
    V.setOrigin(ORIGIN[side]);
    if (shake[side] > 0.2) {
      ctx.translate((Math.random() - 0.5) * shake[side], (Math.random() - 0.5) * shake[side]);
    }

    V.drawBackground(ctx);
    for (let s = 0; s < board.cfg.scales; s++) V.drawScale(ctx, s, view.tilt[s]);

    const blackout = R.isDark(board);
    for (let col = 0; col < board.cols; col++) {
      const cy = V.animCupY(view.tilt[col >> 1], col);
      const stack = view.stacks[col];
      for (let row = 0; row < stack.length; row++) {
        stack[row].darkNow = blackout || (stack[row].dark || 0) > board.dropped;
        let sc = 1;
        if (anim && anim.ev.side === side && (anim.ev.type === 'clear' || anim.ev.type === 'blast')) {
          if (anim.ev.cells.some((c) => c.col === col && c.row === row)) sc = 1 - anim.t * 0.85;
        }
        if (anim && anim.ev.side === side && anim.ev.type === 'merge' &&
            anim.ev.col === col && anim.ev.rows.indexOf(row) >= 0) {
          sc = 1 - anim.t * 0.6;
        }
        V.drawMarble(ctx, stack[row], V.colX(col), V.rowY(cy, row), sc, K);
      }
    }

    for (let c = 0; c < board.cols; c++) {
      if (!R.isBlocked(board, c)) continue;
      const x = V.colX(c);
      ctx.fillStyle = 'rgba(255,84,112,.13)';
      ctx.fillRect(x - G.pitch / 2 + 2, G.ceilingY, G.pitch - 4, G.railY - G.ceilingY);
      ctx.strokeStyle = 'rgba(255,84,112,.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(x - G.pitch / 2 + 3, G.ceilingY + 2, G.pitch - 6, G.railY - G.ceilingY - 4);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,139,150,.9)';
      ctx.font = '800 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SEALED', x, G.ceilingY + 16);
    }

    V.drawDepot(ctx, board.depot, K, board.over ? -1 : cranes[side], board.cfg.depotDepth);
    V.drawCrane(ctx, cranes[side], board.over ? null : board.held, K);
    if (state === 'play' && !board.over) drawGhost(side);

    const weights = [], critical = [];
    for (let c = 0; c < board.cols; c++) {
      weights.push(R.weightOf(board, c));
      critical.push(view.stacks[c].length >= R.capacityOf(board, c));
    }
    V.drawWeights(ctx, weights, board.tilt, critical);

    for (const p of particles[side]) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const f of flash[side]) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / 1.1);
      ctx.fillStyle = f.chain > 1 ? '#ffd775' : '#9ee8b0';
      ctx.font = '800 ' + (16 + f.chain * 3) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.text, f.x, f.y - f.t * 34);
    }
    ctx.globalAlpha = 1;

    drawNamePlate(side);
    if (board.over) drawDefeated(side);
    ctx.restore();
  }

  function drawNamePlate(side) {
    const b = boards[side];
    const x = ORIGIN[side] + G.W / 2;
    ctx.fillStyle = side === 0 ? 'rgba(120,190,255,.85)' : 'rgba(255,180,110,.85)';
    ctx.font = '800 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(NAMES[side], x, 6);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(b.score + '   level ' + b.level, x, 24);
  }

  function drawDefeated(side) {
    ctx.fillStyle = 'rgba(10,14,22,.62)';
    ctx.fillRect(ORIGIN[side], 0, G.W, G.H);
    ctx.fillStyle = '#ff8b96';
    ctx.font = '800 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OVERLOADED', ORIGIN[side] + G.W / 2, G.H / 2);
  }

  /** The gap the attacks cross. Worth drawing, because it is the whole point. */
  function drawDivider() {
    const x = G.W + GAP / 2;
    const g = ctx.createLinearGradient(x - GAP / 2, 0, x + GAP / 2, 0);
    g.addColorStop(0, 'rgba(255,176,46,.05)');
    g.addColorStop(0.5, 'rgba(255,176,46,.16)');
    g.addColorStop(1, 'rgba(255,176,46,.05)');
    ctx.fillStyle = g;
    ctx.fillRect(x - GAP / 2, G.ceilingY - 20, GAP, G.railY - G.ceilingY + 30);

    ctx.strokeStyle = 'rgba(255,176,46,.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(x, G.ceilingY - 20);
    ctx.lineTo(x, G.railY + 10);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.translate(x, (G.ceilingY + G.railY) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(255,176,46,.5)';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('THROWS CROSS HERE', 0, 0);
    ctx.restore();
  }

  /* ---------- the flying marble ---------- */

  function drawFlying() {
    if (!anim) return;
    const ev = anim.ev;
    const t = Math.min(1, anim.t);
    const lane = G.ceilingY + 2;

    if (ev.type === 'land') {
      const s = ev.side;
      const x = xOf(s, ev.col);
      const toY = V.rowY(V.animCupY(views[s].tilt[ev.col >> 1], ev.col), ev.row);
      const fromY = ev.flown ? lane : G.craneY + 12;
      V.setOrigin(0);
      V.drawMarble(ctx, ev.marble, x, fromY + (toY - fromY) * (t * t), 1, K);
      return;
    }

    if (ev.type !== 'launch') return;

    // Up, then across. The fall is the land event that follows, from this same
    // lane, so the two draw one unbroken path.
    const fromRing = ringOf(ev.side, ev.from);
    const toRing = ringOf(ev.toSide, ev.to);
    const ringSize = G.cols * 2;
    const rawRing = fromRing + ev.dir * ev.distance;
    const leavesCanvas = rawRing < 0 || rawRing >= ringSize;

    const fromX = xOfRing(fromRing);
    const toX = xOfRing(toRing);
    const fromY = V.rowY(V.animCupY(views[ev.side].tilt[ev.from >> 1], ev.from),
                         views[ev.side].stacks[ev.from].length);

    const RISE = 0.42;
    let x, y, shown = ev.original || ev.marble;

    if (t < RISE) {
      const k = t / RISE;
      x = fromX;
      y = fromY + (lane - fromY) * (1 - (1 - k) * (1 - k));
    } else {
      const k = (t - RISE) / (1 - RISE);
      y = lane;
      if (leavesCanvas) {
        // It ran off one end of the pair of boards and came back on the other.
        const goingLeft = ev.dir < 0;
        const edgeOut = goingLeft ? -G.ballR : CANVAS_W + G.ballR;
        const edgeIn = goingLeft ? CANVAS_W + G.ballR : -G.ballR;
        const legA = Math.abs(edgeOut - fromX);
        const legB = Math.abs(toX - edgeIn);
        const cut = legA / Math.max(1, legA + legB);
        if (k < cut) x = fromX + (edgeOut - fromX) * (k / cut);
        else { x = edgeIn + (toX - edgeIn) * ((k - cut) / Math.max(0.0001, 1 - cut)); shown = ev.marble; }
      } else {
        x = fromX + (toX - fromX) * k;
        // A marble that crosses the gap changes as it passes the divider, which
        // is exactly where the eye is already looking.
        if (ev.crossed) {
          const mid = G.W + GAP / 2;
          const past = ev.dir > 0 ? x >= mid : x <= mid;
          if (past) shown = ev.marble;
        }
      }
    }

    V.setOrigin(0);
    V.drawMarble(ctx, shown, x, y, 1, K);
  }

  /* ---------- the ghost preview ---------- */

  function drawGhost(side) {
    const b = boards[side];
    if (!b.held) return;
    const pred = predictFor(side);
    if (!pred) return;

    const info = {
      col: cranes[side],
      row: views[side].stacks[cranes[side]].length,
      cupTilt: views[side].tilt[cranes[side] >> 1],
      fatal: pred.fatal,
      fatalCol: pred.overflowCol,
      fatalRow: pred.overflowCol >= 0 ? views[side].stacks[pred.overflowCol].length : 0,
      fatalCupTilt: pred.overflowCol >= 0 ? views[side].tilt[pred.overflowCol >> 1] : 0,
      tip: null
    };

    if (!pred.fatal) {
      // Only show a throw that stays at home. One that crosses is drawn as an
      // attack marker instead, because its landing spot is on the other board
      // and this preview only knows how to draw inside one field.
      const launch = pred.events.find((e) => e.type === 'launch' && e.side === side);
      if (launch && !launch.crossed) {
        const after = pred.events.slice(pred.events.indexOf(launch));
        const land = after.find((e) => e.type === 'land' && e.flown && e.side === side);
        info.tip = {
          from: launch.from, to: launch.to, wrapped: launch.wrapped,
          dir: launch.dir, distance: launch.distance,
          marbleRow: launch.row,
          landRow: land ? land.row : views[side].stacks[launch.to].length,
          fromCupTilt: views[side].tilt[launch.from >> 1],
          toCupTilt: views[side].tilt[launch.to >> 1],
          landFatal: false
        };
      }
    }

    V.drawGhost(ctx, info, K);

    if (!pred.fatal && pred.attacks) drawAttackMarker(side, pred);
  }

  /** Tell the player, before they commit, that this drop reaches the other board. */
  function drawAttackMarker(side, pred) {
    const launch = pred.events.find((e) => e.type === 'launch' && e.crossed);
    if (!launch) return;
    const x = V.colX(launch.from);
    const y = G.ceilingY + 26;
    ctx.save();
    ctx.fillStyle = 'rgba(255,176,46,.95)';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = (pred.kills ? 'THIS ENDS THEM ' : 'THROWS ACROSS ') +
                  (launch.dir > 0 ? '\u25b6' : '\u25c0');
    if (pred.kills) ctx.fillStyle = 'rgba(255,84,112,.95)';
    ctx.fillText(label, x, y);
    ctx.strokeStyle = 'rgba(255,176,46,.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x, y + 12);
    ctx.lineTo(x, V.rowY(V.animCupY(views[side].tilt[launch.from >> 1], launch.from),
                         Math.max(0, views[side].stacks[launch.from].length - 1)) - G.ballR);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /* ---------- readouts ---------- */

  const lamps = (b) => '\u25cf'.repeat(b.bonus) + '\u25cb'.repeat(b.cfg.bonusMax - b.bonus) + ' x' + b.bonus;

  function updateHud() {
    Shell.readouts([
      { label: 'P1 score', value: boards[0].score, accent: true },
      { label: 'P1 bonus', value: lamps(boards[0]), accent: boards[0].bonus > 1 },
      { label: 'P1 joker in', value: R.jokerIn(boards[0]) },
      { label: 'Rounds', value: wins[0] + ' - ' + wins[1] },
      { label: 'P2 joker in', value: R.jokerIn(boards[1]) },
      { label: 'P2 bonus', value: lamps(boards[1]), accent: boards[1].bonus > 1 },
      { label: 'P2 score', value: boards[1].score, accent: true }
    ]);
    Shell.status(MODES[mode].name, MODES[mode].goal);
  }

  /* ---------- round and match ---------- */

  function roundOver() {
    state = 'over';
    clearMatch();
    // Arcade is survival: the one still standing wins, and a double death goes
    // to the score. Competition is the manual's scoring race: whoever fell over,
    // the higher score takes the round.
    const dead = [boards[0].over, boards[1].over];
    const byScore = () => boards[0].score === boards[1].score ? -1 : (boards[0].score > boards[1].score ? 0 : 1);
    let winner;
    if (mode === 'competition' || (dead[0] && dead[1])) winner = byScore();
    else winner = dead[0] ? 1 : 0;
    if (winner >= 0) wins[winner]++;
    updateHud();

    Shell.gameOverCard({
      title: winner < 0 ? 'A dead heat'
           : NAMES[winner] + ' wins the round' + (mode === 'competition' ? ' on points' : ''),
      scoreLabel: 'Rounds won',
      score: wins[0] + ' - ' + wins[1],
      extra: `<div class="rowBetween"><span>${NAMES[0]}</span><b style="color:var(--text)">${boards[0].score} &middot; level ${boards[0].level}</b></div>
              <div class="rowBetween"><span>${NAMES[1]}</span><b style="color:var(--text)">${boards[1].score} &middot; level ${boards[1].level}</b></div>`,
      buttons: [{ label: 'Next round', act: 'nextRound', primary: true },
                { label: 'New match', act: 'newMatch' },
                { label: 'Menu', act: 'menu' }]
    });
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    // An interrupted match becomes the backdrop as well as the offer, so both
    // players can see it really is still there before choosing to go back to it.
    menuSave = loadMatch();
    if (menuSave) { boards = menuSave.boards; mode = menuSave.mode; }
    else {
      boards = R.link(R.makeBoard({}, 1), R.makeBoard({}, 2), MODES[mode].attack);
      applyMode(boards, mode);
    }
    views = boards.map(viewFrom);
    ghostCache = [null, null];
    Shell.status('', '');
    Shell.readouts([{ label: 'Mode', value: MODES[mode].name }]);

    const detail = menuSave
      ? `<div class="rowBetween"><span>Rounds won</span><b style="color:var(--text)">${menuSave.wins[0]} - ${menuSave.wins[1]}</b></div>
         <div class="rowBetween"><span>${NAMES[0]}</span><b style="color:var(--text)">${boards[0].score} &middot; ${boards[0].dropped} dropped</b></div>
         <div class="rowBetween"><span>${NAMES[1]}</span><b style="color:var(--text)">${boards[1].score} &middot; ${boards[1].dropped} dropped</b></div>`
      : `<p class="tag" style="margin:2px 0 10px">${MODES[mode].blurb}</p>
         <div class="rowBetween"><span>${NAMES[0]}</span><b style="color:var(--text)">A / D to carry, S to drop</b></div>
         <div class="rowBetween"><span>${NAMES[1]}</span><b style="color:var(--text)">arrows to carry, down to drop</b></div>`;

    const buttons = menuSave
      ? [{ label: 'Continue match', act: 'continueMatch', primary: true },
         { label: 'New match', act: 'start' },
         { label: 'How to play', act: 'howto' },
         { label: 'One player', act: 'solo' }]
      : [{ label: 'Play ' + MODES[mode].name, act: 'start', primary: true },
         { label: 'Switch mode', act: 'switchMode' },
         { label: 'How to play', act: 'howto' },
         { label: 'One player', act: 'solo' }];

    Shell.startCard({
      blurb: menuSave
        ? 'Your match is still here. The same marbles are still coming.'
        : 'Two boards, one ring. Tip your see-saws hard enough and your marbles fly into the other field.',
      extra: detail,
      buttons: buttons
    });
  }

  Shell.on({
    start: () => { clearMatch(); menuSave = null; newMatch(false); },
    continueMatch: () => resumeMatch(menuSave),
    nextRound: () => newRound(),
    newMatch: () => newMatch(false),
    menu: () => showMenu(),
    howto: () => Shell.showRules(),
    closeRef: () => { Shell.hide(); if (!refWasPaused) Loop.resume(); },
    switchMode: () => { mode = mode === 'arcade' ? 'competition' : 'arcade'; clearMatch(); menuSave = null; showMenu(); },
    solo: () => { window.location.href = 'index.html'; }
  });

  /* Both players need the same reference the solo game has, and in a match the
     arsenal is the half that matters most. */
  let refWasPaused = false;

  function showReference() {
    refWasPaused = Loop.paused;
    if (!refWasPaused) Loop.pause();
    Shell.overlay(V.marbleCard(R, boards ? boards[0] : null, mode === 'arcade') +
      '<div class="btnRow"><button class="primary" data-act="closeRef">Back</button></div></div>');
  }

  (function addReferenceButton() {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Marbles';
    b.addEventListener('click', () => showReference());
    Shell.els.tools.insertBefore(b, Shell.els.tools.firstChild);
  })();

  /* A match is not saved, but it is long enough that losing it to a stray
     keystroke would sting. */
  let leavingOnPurpose = false;
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('a.back')) leavingOnPurpose = true;
  }, true);

  window.addEventListener('beforeunload', (e) => {
    if (state !== 'play' && state !== 'anim') return;
    if (leavingOnPurpose) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyTiltVersus = {
    get state() { return state; },
    boards: () => boards,
    views: () => views,
    rules: R,
    newRound, dropFor, moveCrane,
    setCrane(side, c) { cranes[side] = c; ghostCache[side] = null; },
    cranes: () => cranes.slice(),
    get mode() { return mode; },
    setMode(m) { mode = m; },
    flush() {
      let guard = 0;
      while ((anim || queue.length) && guard++ < 3000) {
        if (anim) { completeEvent(anim.ev); anim = null; }
        if (queue.length) {
          const ev = queue.shift();
          if (DUR[ev.type] == null) { console.warn('Easy Tilt Versus: no handler for "' + ev.type + '"'); resyncViews(); }
          beginEvent(ev); completeEvent(ev);
        }
      }
      anim = null; queue = [];
      for (let s = 0; s < 2; s++) {
        for (let i = 0; i < views[s].tiltTarget.length; i++) views[s].tilt[i] = views[s].tiltTarget[i];
      }
      if (roundIsOver(boards, mode)) { if (state !== 'over') roundOver(); }
      else { state = 'play'; updateHud(); saveMatch(); }
    }
  };
})();
