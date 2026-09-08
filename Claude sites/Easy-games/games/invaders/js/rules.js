'use strict';

/* Easy Invaders - the rules engine.
   Original artwork and code; the mechanics follow the 1978 Taito arcade game,
   whose numbers are in the blueprint: 5 rows of 11, worth 30 / 20 / 20 / 10 / 10
   from the top down, four eroding shields, a mystery ship, an extra life at
   1500, and a formation that gets faster as it gets smaller.

   Pure logic: no canvas, no DOM, seeded randomness. Everything is testable by
   stepping it directly, which is how every rule below is verified.

   THE SPEED-UP is the whole game, and it was originally an accident: the 1978
   hardware could redraw only one alien per frame, so the rack stepped once every
   55 frames with a full formation and once EVERY frame with one alien left. The
   blueprint asks for that curve on purpose:
       stepInterval = base * (aliensAlive / 55)
   so nothing else in the game changes speed by wave. The rack is slow because it
   is big, and the last few are terrifying because they are few.

   THE FORMATION is one object. Every invader is a (col, row) cell in it, and the
   rack has one x, one y and one direction. A step moves the rack sideways; when
   the OUTERMOST LIVING invader would cross a wall the rack drops a half row and
   reverses instead. Because the bounds are taken from the living invaders, a
   thinned rack travels further, which is what lets the last ones sweep the
   whole screen.

   SHIELDS are small pixel grids, 22 by 16 units. Every shot that lands on one
   punches a circle out of the grid, and the rack marching through a shield
   erases whatever it overlaps. Erosion is per unit pixel so a shield really
   does wear a hole rather than losing a tile.

   THE MYSTERY SHIP scores by how many shots the player has fired: 300 on the
   23rd shot and on every 15th after that, otherwise a fixed table. Counting
   shots is the trick the original hid behind randomness; here it is deliberate. */

const InvadersRules = (function () {
  const W = 660, H = 620;
  const P = 3;                     // screen pixels per bitmap unit

  const CFG = {
    W, H, P,
    cols: 11, rows: 5,
    colW: 48, rowH: 42,            // formation cell size in pixels
    stepX: 6, dropY: 24,           // two units sideways, eight units down, as the original
    baseStep: 0.9,                 // seconds per step with all 55 alive (55 frames at 60 Hz)
    edge: 12,                      // the wall, measured in from the canvas edge
    topY: 84,                      // formation top on wave 1
    startDrops: [0, 2, 3, 4, 5],   // extra drops per wave; the last entry repeats
    playerY: H - 72,               // top of the player
    playerW: 13 * P, playerH: 8 * P,
    playerSpeed: 210,
    playerStartX: 60,
    playerShotSpeed: 600,
    invaderShotSpeed: 240,
    maxInvaderShots: 3,
    aimedChance: 0.35,             // share of invader shots fired at the player's column
    // Minimum seconds between invader shots, by score. The original shortened
    // the reload as the score climbed, which is why late waves feel dangerous
    // even though the rack itself is no faster.
    reload: [[200, 1.0], [1000, 0.65], [2000, 0.45], [3000, 0.35], [Infinity, 0.28]],
    shieldCount: 4, shieldY: H - 168,
    shieldPlayerHole: 2.5, shieldInvaderHole: 3.2,   // erosion radius in units
    mysteryY: 44, mysterySpeed: 90, mysteryW: 16 * P, mysteryH: 7 * P,
    mysteryEvery: [20, 30],        // seconds between visits, uniform
    mysteryMinAlive: 8,            // the original stops sending it once the rack is small
    lives: 3, extraLifeAt: 1500,
    deathPause: 1.6, clearPause: 1.4, introPause: 1.2,
    rowPoints: [30, 20, 20, 10, 10],
    rowType: [0, 1, 1, 2, 2]
  };

  /* ---------- bitmaps ---------- */

  // Own designs, two frames each so the rack animates on every step.
  const INVADERS = [
    [ // type 0, the top row: a drone with a lamp on top
      ['...##...',
       '..#..#..',
       '.######.',
       '#.####.#',
       '########',
       '#.#..#.#',
       '...##...',
       '..#..#..'],
      ['...##...',
       '..#..#..',
       '.######.',
       '#.####.#',
       '########',
       '.#.##.#.',
       '..#..#..',
       '.#....#.']
    ],
    [ // type 1, the middle rows: a beetle with antennae
      ['..#.....#..',
       '#..#...#..#',
       '#.#######.#',
       '###.###.###',
       '###########',
       '.#########.',
       '..#.....#..',
       '.#.......#.'],
      ['..#.....#..',
       '...#...#...',
       '..#######..',
       '.##.###.##.',
       '###########',
       '#.#######.#',
       '#.#.....#.#',
       '..##...##..']
    ],
    [ // type 2, the bottom rows: a wide tank on legs
      ['....####....',
       '.##########.',
       '############',
       '###..##..###',
       '############',
       '...##..##...',
       '..#..##..#..',
       '.#........#.'],
      ['....####....',
       '.##########.',
       '############',
       '###..##..###',
       '############',
       '..###..###..',
       '.#..#..#..#.',
       '..#......#..']
    ]
  ];

  const PLAYER = [
    '......#......',
    '.....###.....',
    '....#####....',
    '.....###.....',
    '.###########.',
    '#############',
    '##.#######.##',
    '#...........#'
  ];

  const MYSTERY = [
    '.....######.....',
    '...##########...',
    '..############..',
    '.##.##.##.##.##.',
    '################',
    '...###....###...',
    '....#......#....'
  ];

  // Two invader shot styles, purely cosmetic, and both animate by flipping.
  const SHOTS = [
    [['#..', '.#.', '..#', '.#.', '#..', '.#.', '..#'],
     ['..#', '.#.', '#..', '.#.', '..#', '.#.', '#..']],
    [['.#.', '.#.', '###', '.#.', '.#.', '.#.', '###'],
     ['###', '.#.', '.#.', '.#.', '###', '.#.', '.#.']]
  ];

  // The shield: an arch with a doorway, 22 by 16 units.
  const SHIELD = [
    '....##############....',
    '...################...',
    '..##################..',
    '.####################.',
    '######################',
    '######################',
    '######################',
    '######################',
    '######################',
    '######################',
    '######################',
    '######################',
    '#######........#######',
    '######..........######',
    '#####............#####',
    '#####............#####'
  ];

  function sprite(rows) { return { w: rows[0].length, h: rows.length, rows }; }

  const SPRITES = {
    invaders: INVADERS.map((frames) => frames.map(sprite)),
    player: sprite(PLAYER),
    mystery: sprite(MYSTERY),
    shots: SHOTS.map((frames) => frames.map(sprite))
  };

  /* ---------- randomness ---------- */

  /** mulberry32. Small, fast, and the same sequence for the same seed on every machine. */
  function makeRng(seed) {
    let s = (seed == null ? 1 : seed) >>> 0;
    return {
      seed,
      get state() { return s; },
      next() {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      range(lo, hi) { return lo + this.next() * (hi - lo); },
      int(n) { return Math.floor(this.next() * n); }
    };
  }

  /* ---------- shields ---------- */

  function makeShield(index) {
    const w = SHIELD[0].length, h = SHIELD.length;
    const px = new Uint8Array(w * h);
    let left = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (SHIELD[y][x] === '#') { px[y * w + x] = 1; left++; }
      }
    }
    const spacing = W / CFG.shieldCount;
    return {
      index, w, h, px, left, total: left,
      x: Math.round(spacing * (index + 0.5) - w * P / 2),
      y: CFG.shieldY
    };
  }

  function makeShields() {
    const out = [];
    for (let i = 0; i < CFG.shieldCount; i++) out.push(makeShield(i));
    return out;
  }

  /** The shield unit under a screen point, or null when off the grid or empty. */
  function shieldCellAt(sh, sx, sy) {
    const lx = Math.floor((sx - sh.x) / P), ly = Math.floor((sy - sh.y) / P);
    if (lx < 0 || ly < 0 || lx >= sh.w || ly >= sh.h) return null;
    return sh.px[ly * sh.w + lx] ? { lx, ly } : null;
  }

  /** Punch a circle of radius r units out of the shield around unit (lx, ly). */
  function erodeShield(sh, lx, ly, r) {
    let removed = 0;
    const rr = r * r;
    for (let y = Math.floor(ly - r); y <= Math.ceil(ly + r); y++) {
      if (y < 0 || y >= sh.h) continue;
      for (let x = Math.floor(lx - r); x <= Math.ceil(lx + r); x++) {
        if (x < 0 || x >= sh.w) continue;
        const dx = x + 0.5 - (lx + 0.5), dy = y + 0.5 - (ly + 0.5);
        if (dx * dx + dy * dy > rr) continue;
        const i = y * sh.w + x;
        if (sh.px[i]) { sh.px[i] = 0; removed++; }
      }
    }
    sh.left -= removed;
    return removed;
  }

  /** Clear every shield unit inside a screen rectangle. Used by the marching rack. */
  function eraseRectFromShield(sh, rect) {
    const x0 = Math.max(0, Math.floor((rect.x - sh.x) / P));
    const x1 = Math.min(sh.w - 1, Math.ceil((rect.x + rect.w - sh.x) / P) - 1);
    const y0 = Math.max(0, Math.floor((rect.y - sh.y) / P));
    const y1 = Math.min(sh.h - 1, Math.ceil((rect.y + rect.h - sh.y) / P) - 1);
    let removed = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * sh.w + x;
        if (sh.px[i]) { sh.px[i] = 0; removed++; }
      }
    }
    sh.left -= removed;
    return removed;
  }

  function shieldRect(sh) { return { x: sh.x, y: sh.y, w: sh.w * P, h: sh.h * P }; }

  /* ---------- geometry ---------- */

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function invaderRect(g, inv) {
    const spr = SPRITES.invaders[inv.type][0];
    const w = spr.w * P, h = spr.h * P;
    return {
      x: g.formation.x + inv.col * CFG.colW + (CFG.colW - w) / 2,
      y: g.formation.y + inv.row * CFG.rowH,
      w, h
    };
  }

  function playerRect(g) {
    return { x: g.player.x, y: CFG.playerY, w: CFG.playerW, h: CFG.playerH };
  }

  function mysteryRect(g) {
    const m = g.mystery;
    return m ? { x: m.x, y: CFG.mysteryY, w: CFG.mysteryW, h: CFG.mysteryH } : null;
  }

  /** Left, right and bottom edges of the LIVING invaders, or null when none. */
  function bounds(g) {
    let left = Infinity, right = -Infinity, bottom = -Infinity, any = false;
    for (const inv of g.invaders) {
      if (!inv.alive) continue;
      const r = invaderRect(g, inv);
      any = true;
      if (r.x < left) left = r.x;
      if (r.x + r.w > right) right = r.x + r.w;
      if (r.y + r.h > bottom) bottom = r.y + r.h;
    }
    return any ? { left, right, bottom } : null;
  }

  /* ---------- the game ---------- */

  function startDropsFor(wave) {
    const t = CFG.startDrops;
    return t[Math.min(wave - 1, t.length - 1)];
  }

  function stepInterval(alive) {
    const total = CFG.cols * CFG.rows;
    return CFG.baseStep * Math.max(1, alive) / total;
  }

  function reloadFor(score) {
    for (const [limit, secs] of CFG.reload) if (score < limit) return secs;
    return CFG.reload[CFG.reload.length - 1][1];
  }

  /** Mystery ship value for the player's n-th shot fired. */
  function mysteryValue(shots) {
    if (shots >= 23 && (shots - 23) % 15 === 0) return 300;
    return [100, 50, 50, 100, 150, 100, 100, 50, 100, 100, 100, 100, 50, 150, 100][shots % 15];
  }

  function makeInvaders() {
    const out = [];
    for (let row = 0; row < CFG.rows; row++) {
      for (let col = 0; col < CFG.cols; col++) {
        out.push({ col, row, type: CFG.rowType[row], points: CFG.rowPoints[row], alive: true });
      }
    }
    return out;
  }

  function makeGame(seed) {
    const g = {
      rng: makeRng(seed),
      time: 0,
      phase: 'intro',          // intro | play | dying | cleared | over
      timer: 0,
      reason: null,            // 'lives' | 'landed' once over
      score: 0,
      lives: CFG.lives,
      wave: 0,
      shots: 0,                // player shots fired so far, drives the mystery value
      extraGiven: false,
      player: { x: CFG.playerStartX },
      playerShot: null,        // { x, y, w, h }
      invaderShots: [],        // { x, y, w, h, kind }
      shotKind: 0,
      reloadTimer: 0,
      formation: null,
      invaders: [],
      alive: 0,
      shields: [],
      mystery: null,           // { x, vx }
      mysteryTimer: 0,
      popups: []               // { x, y, text, t }
    };
    newWave(g);
    return g;
  }

  function newWave(g) {
    g.wave++;
    g.invaders = makeInvaders();
    g.alive = g.invaders.length;
    g.formation = {
      x: (W - CFG.cols * CFG.colW) / 2,
      y: CFG.topY + startDropsFor(g.wave) * CFG.dropY,
      dir: 1,
      timer: CFG.baseStep,
      frame: 0,
      note: 0
    };
    g.shields = makeShields();
    g.playerShot = null;
    g.invaderShots = [];
    g.mystery = null;
    g.mysteryTimer = g.rng.range(CFG.mysteryEvery[0], CFG.mysteryEvery[1]);
    g.reloadTimer = 1.5;
    g.popups = [];
    g.phase = 'intro';
    g.timer = CFG.introPause;
  }

  function addScore(g, n, ev) {
    g.score += n;
    if (!g.extraGiven && g.score >= CFG.extraLifeAt) {
      g.extraGiven = true;
      g.lives++;
      ev.push({ type: 'extraLife' });
    }
  }

  function gameOver(g, reason, ev) {
    g.phase = 'over';
    g.reason = reason;
    g.playerShot = null;
    g.invaderShots = [];
    ev.push({ type: 'over', reason });
  }

  /* ---------- the formation ---------- */

  /** One step of the rack: sideways, or a drop and a reversal at a wall. */
  function stepFormation(g, ev) {
    const f = g.formation;
    const b = bounds(g);
    if (!b) return;
    const dx = CFG.stepX * f.dir;
    let dropped = false;
    if (b.left + dx < CFG.edge || b.right + dx > W - CFG.edge) {
      f.y += CFG.dropY;
      f.dir = -f.dir;
      dropped = true;
    } else {
      f.x += dx;
    }
    f.frame ^= 1;
    f.note = (f.note + 1) % 4;
    ev.push({ type: 'step', note: f.note, dropped });

    // The rack eats its way through anything it marches into.
    for (const inv of g.invaders) {
      if (!inv.alive) continue;
      const r = invaderRect(g, inv);
      for (const sh of g.shields) {
        if (sh.left && rectsOverlap(r, shieldRect(sh))) eraseRectFromShield(sh, r);
      }
    }

    // Reaching the player's row is the loss the lives cannot buy back.
    const after = bounds(g);
    if (after && after.bottom >= CFG.playerY) gameOver(g, 'landed', ev);
  }

  /** The invader that fires from a column is the lowest living one in it. */
  function lowestInColumn(g, col) {
    let best = null;
    for (const inv of g.invaders) {
      if (inv.alive && inv.col === col && (!best || inv.row > best.row)) best = inv;
    }
    return best;
  }

  function liveColumns(g) {
    const seen = new Set();
    for (const inv of g.invaders) if (inv.alive) seen.add(inv.col);
    return [...seen].sort((a, b) => a - b);
  }

  function chooseShooter(g) {
    const cols = liveColumns(g);
    if (!cols.length) return null;
    let col;
    if (g.rng.next() < CFG.aimedChance) {
      // Aim: the live column whose centre is nearest the player.
      const px = g.player.x + CFG.playerW / 2;
      let bestD = Infinity;
      for (const c of cols) {
        const cx = g.formation.x + c * CFG.colW + CFG.colW / 2;
        const d = Math.abs(cx - px);
        if (d < bestD) { bestD = d; col = c; }
      }
    } else {
      col = cols[g.rng.int(cols.length)];
    }
    return lowestInColumn(g, col);
  }

  function fireInvaderShot(g, ev) {
    const shooter = chooseShooter(g);
    if (!shooter) return;
    const r = invaderRect(g, shooter);
    const spr = SPRITES.shots[0][0];
    g.invaderShots.push({
      x: r.x + r.w / 2 - spr.w * P / 2, y: r.y + r.h,
      w: spr.w * P, h: spr.h * P,
      kind: g.shotKind++ % SPRITES.shots.length
    });
    ev.push({ type: 'invaderShot' });
  }

  /* ---------- the player ---------- */

  function movePlayer(g, dt, input) {
    let d = 0;
    if (input.left) d -= 1;
    if (input.right) d += 1;
    if (d) setPlayerX(g, g.player.x + d * CFG.playerSpeed * dt);
  }

  function setPlayerX(g, x) {
    const lo = CFG.edge, hi = W - CFG.edge - CFG.playerW;
    g.player.x = x < lo ? lo : (x > hi ? hi : x);
  }

  /** The classic rule: one shot in the air at a time. Returns true if it fired. */
  function firePlayer(g, ev) {
    if (g.phase !== 'play' || g.playerShot) return false;
    g.shots++;
    g.playerShot = { x: g.player.x + CFG.playerW / 2 - P / 2, y: CFG.playerY - 4 * P, w: P, h: 4 * P };
    ev.push({ type: 'playerShot' });
    return true;
  }

  function killInvader(g, inv, ev) {
    inv.alive = false;
    g.alive--;
    const r = invaderRect(g, inv);
    addScore(g, inv.points, ev);
    ev.push({ type: 'invaderDied', x: r.x + r.w / 2, y: r.y + r.h / 2, points: inv.points, kind: inv.type });
    if (g.alive === 0) {
      g.phase = 'cleared';
      g.timer = CFG.clearPause;
      g.invaderShots = [];
      ev.push({ type: 'cleared', wave: g.wave });
    }
  }

  function killPlayer(g, ev) {
    g.lives--;
    g.phase = 'dying';
    g.timer = CFG.deathPause;
    g.playerShot = null;
    g.invaderShots = [];
    ev.push({ type: 'playerDied', x: g.player.x + CFG.playerW / 2, y: CFG.playerY + CFG.playerH / 2 });
  }

  /* ---------- shots in flight ---------- */

  /** Move the player's shot up in slices small enough that nothing is skipped. */
  function movePlayerShot(g, dt, ev) {
    let remaining = dt * CFG.playerShotSpeed;
    while (remaining > 0 && g.playerShot && g.phase === 'play') {
      const d = Math.min(remaining, 4);
      remaining -= d;
      const s = g.playerShot;
      s.y -= d;
      if (s.y + s.h < 0) { g.playerShot = null; ev.push({ type: 'shotLost', x: s.x, y: 0 }); return; }

      // Invaders. Walk all of them; the first hit ends the shot.
      let hit = null;
      for (const inv of g.invaders) {
        if (inv.alive && rectsOverlap(s, invaderRect(g, inv))) { hit = inv; break; }
      }
      if (hit) { g.playerShot = null; killInvader(g, hit, ev); return; }

      // The mystery ship.
      const mr = mysteryRect(g);
      if (mr && rectsOverlap(s, mr)) {
        const value = mysteryValue(g.shots);
        addScore(g, value, ev);
        g.popups.push({ x: mr.x + mr.w / 2, y: mr.y + mr.h / 2, text: String(value), t: 1.2 });
        ev.push({ type: 'mysteryDied', x: mr.x + mr.w / 2, y: mr.y + mr.h / 2, points: value });
        g.mystery = null;
        g.mysteryTimer = g.rng.range(CFG.mysteryEvery[0], CFG.mysteryEvery[1]);
        g.playerShot = null;
        return;
      }

      // Shields: the tip of the shot against the pixel grid.
      for (const sh of g.shields) {
        const cell = sh.left ? shieldCellAt(sh, s.x + s.w / 2, s.y) : null;
        if (cell) {
          erodeShield(sh, cell.lx, cell.ly, CFG.shieldPlayerHole);
          g.playerShot = null;
          ev.push({ type: 'shieldHit', x: s.x, y: s.y });
          return;
        }
      }

      // Two shots meeting in the air cancel each other.
      const meet = g.invaderShots.find((is) => rectsOverlap(s, is));
      if (meet) {
        g.invaderShots = g.invaderShots.filter((is) => is !== meet);
        g.playerShot = null;
        ev.push({ type: 'shotsMet', x: s.x, y: s.y });
        return;
      }
    }
  }

  function moveInvaderShots(g, dt, ev) {
    // Walk a snapshot; removals are collected and applied afterwards.
    const dead = new Set();
    const pr = playerRect(g);
    for (const s of g.invaderShots.slice()) {
      let remaining = dt * CFG.invaderShotSpeed;
      while (remaining > 0 && !dead.has(s) && g.phase === 'play') {
        const d = Math.min(remaining, 4);
        remaining -= d;
        s.y += d;
        if (s.y > H) { dead.add(s); break; }

        for (const sh of g.shields) {
          const cell = sh.left ? shieldCellAt(sh, s.x + s.w / 2, s.y + s.h) : null;
          if (cell) {
            erodeShield(sh, cell.lx, cell.ly, CFG.shieldInvaderHole);
            dead.add(s);
            ev.push({ type: 'shieldHit', x: s.x, y: s.y + s.h });
            break;
          }
        }
        if (dead.has(s)) break;

        if (rectsOverlap(s, pr)) { dead.add(s); killPlayer(g, ev); break; }
      }
    }
    if (dead.size) g.invaderShots = g.invaderShots.filter((s) => !dead.has(s));
  }

  /* ---------- the mystery ship ---------- */

  function stepMystery(g, dt, ev) {
    if (!g.mystery) {
      g.mysteryTimer -= dt;
      if (g.mysteryTimer <= 0 && g.alive >= CFG.mysteryMinAlive) {
        const fromLeft = g.rng.next() < 0.5;
        g.mystery = {
          x: fromLeft ? -CFG.mysteryW : W,
          vx: (fromLeft ? 1 : -1) * CFG.mysterySpeed
        };
        ev.push({ type: 'mystery' });
      }
      return;
    }
    g.mystery.x += g.mystery.vx * dt;
    if (g.mystery.x < -CFG.mysteryW - 2 || g.mystery.x > W + 2) {
      g.mystery = null;
      g.mysteryTimer = g.rng.range(CFG.mysteryEvery[0], CFG.mysteryEvery[1]);
    }
  }

  /* ---------- one tick ---------- */

  /** Advance the game by dt seconds. input: { left, right, fire }. Returns events. */
  function tick(g, dt, input) {
    const ev = [];
    const inp = input || {};
    if (g.phase === 'over') return ev;
    g.time += dt;

    for (let i = g.popups.length - 1; i >= 0; i--) {
      g.popups[i].t -= dt;
      if (g.popups[i].t <= 0) g.popups.splice(i, 1);
    }

    if (g.phase === 'intro') {
      movePlayer(g, dt, inp);
      g.timer -= dt;
      if (g.timer <= 0) { g.phase = 'play'; ev.push({ type: 'go' }); }
      return ev;
    }
    if (g.phase === 'dying') {
      g.timer -= dt;
      if (g.timer <= 0) {
        if (g.lives <= 0) gameOver(g, 'lives', ev);
        else { g.player.x = CFG.playerStartX; g.phase = 'play'; ev.push({ type: 'respawn' }); }
      }
      return ev;
    }
    if (g.phase === 'cleared') {
      movePlayer(g, dt, inp);
      g.timer -= dt;
      if (g.timer <= 0) { newWave(g); ev.push({ type: 'wave', wave: g.wave }); }
      return ev;
    }

    // phase === 'play'
    movePlayer(g, dt, inp);
    if (inp.fire) firePlayer(g, ev);

    // The rack. At one invader the interval is a sixtieth of a second, so a
    // clamped frame may owe several steps; the cap stops a stall from ever
    // becoming a runaway loop.
    const f = g.formation;
    f.timer -= dt;
    let guard = 0;
    while (f.timer <= 0 && g.phase === 'play' && guard++ < 4) {
      f.timer += stepInterval(g.alive);
      stepFormation(g, ev);
    }
    if (f.timer < 0) f.timer = 0;

    if (g.phase === 'play' && g.playerShot) movePlayerShot(g, dt, ev);
    if (g.phase === 'play') moveInvaderShots(g, dt, ev);

    if (g.phase === 'play') {
      g.reloadTimer -= dt;
      if (g.reloadTimer <= 0 && g.invaderShots.length < CFG.maxInvaderShots) {
        g.reloadTimer = reloadFor(g.score);
        fireInvaderShot(g, ev);
      }
      stepMystery(g, dt, ev);
    }
    return ev;
  }

  /** Everything that decides the next frame, for determinism checks and debugging. */
  function snapshot(g) {
    return {
      phase: g.phase, score: g.score, lives: g.lives, wave: g.wave, shots: g.shots,
      rng: g.rng.state,
      formation: { x: g.formation.x, y: g.formation.y, dir: g.formation.dir, timer: +g.formation.timer.toFixed(6) },
      alive: g.invaders.map((i) => (i.alive ? 1 : 0)).join(''),
      player: +g.player.x.toFixed(4),
      playerShot: g.playerShot ? +g.playerShot.y.toFixed(4) : null,
      invaderShots: g.invaderShots.map((s) => [+s.x.toFixed(2), +s.y.toFixed(2)]),
      shields: g.shields.map((s) => s.left),
      mystery: g.mystery ? +g.mystery.x.toFixed(4) : null
    };
  }

  return {
    CFG, SPRITES, W, H, P,
    makeRng, makeGame, newWave, tick, snapshot,
    stepInterval, startDropsFor, reloadFor, mysteryValue,
    stepFormation, bounds, invaderRect, playerRect, mysteryRect, rectsOverlap,
    makeShield, makeShields, shieldCellAt, erodeShield, eraseRectFromShield, shieldRect,
    firePlayer, setPlayerX, killInvader, killPlayer, chooseShooter, lowestInColumn, liveColumns,
    fireInvaderShot
  };
})();
