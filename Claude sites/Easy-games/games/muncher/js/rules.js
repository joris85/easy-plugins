'use strict';

/* Easy Muncher - the rules engine.
   Original maze, artwork and code; the ghost behaviour follows the well
   documented target-tile rules of the 1980 arcade original, which are just
   rules and cannot be owned by anyone.

   Pure logic: no canvas, no DOM, seeded randomness, and the simulation runs in
   fixed 1/60 s ticks so the same inputs always give the same game whatever the
   frame rate. That is what lets every rule below be driven and asserted from
   node (see test/rules.test.js) and from the browser console.

   THE MAZE is a string map, 28 by 31 tiles. Positions are continuous tile
   coordinates: an entity at x = 3.5 is centred on tile 3. Tile 0 and tile 27
   are joined on the two tunnel rows, so x wraps around there.

   THE FOUR MINDS. Every ghost picks a target tile and, at each tile centre,
   turns toward whichever open neighbour is nearest to it in a straight line.
   It never reverses on its own. What differs is only the target:
     Blaze  (chaser)   your tile, directly
     Wisp   (ambusher) four tiles ahead of you, to cut you off
     Echo   (flanker)  two ahead of you, then that point mirrored through Blaze,
                       so it swings wildly depending on where Blaze is
     Muddle (nervous)  chases like Blaze until it gets within eight tiles, then
                       runs for its own corner
   In scatter mode all four target their own corner, which produces the
   looping patrols. The famous overflow bug of the original is kept on purpose:
   when you face UP, "ahead" also means "and the same distance to the LEFT".

   PELLET EATING COSTS A TICK. The player is slightly faster than the ghosts
   but stalls for one tick per pellet (three per power pellet), which is the
   real reason a cleared corridor is a fast escape and a full one is not. */

const MuncherRules = (function () {

  const COLS = 28, ROWS = 31;
  const TICK = 1 / 60;
  // Timers count down in ticks of 1/60 s and 2.2 - 132/60 is not quite zero in
  // floating point, so every "has it run out" test allows this much slack.
  const EPS = 1e-9;
  const BASE = 9.5;             // tiles per second at "100 percent"
  const CORNER = 0.4;           // how far from a tile centre a turn may be taken early
  const EYES_SPEED = 1.5;       // eyes race home at this multiple of BASE
  const HOUSE_SPEED = 4;        // tiles per second for the scripted house moves
  const EXTRA_LIFE_AT = 10000;
  const FRUIT_AT_PELLETS = [70, 170];

  /* The maze. '#' wall, '.' pellet, 'o' power pellet, ' ' open floor,
     '-' the house door (ghosts only, and only on their scripted way in or out).
     Every corridor is one tile wide, there are no dead ends, and both tunnel
     rows wrap. */
  const MAP = [
    '############################',
    '#..........................#',
    '#.##.#####.######.#####.##.#',
    '#.##.#####.######.#####.##.#',
    '#.##.......######.......##.#',
    '#.####.###.######.###.####.#',
    '#o.....###........###.....o#',
    '######.###.######.###.######',
    '######.###.######.###.######',
    '       ###.######.###       ',
    '######.###.######.###.######',
    '###.....            .....###',
    '###.#### ####--#### ####.###',
    '###.#### ##      ## ####.###',
    '###.#### ##      ## ####.###',
    '###.#### ##      ## ####.###',
    '###.#### ########## ####.###',
    '###.....            .....###',
    '######.#.##########.#.######',
    '       #.##########.#       ',
    '######.#.##########.#.######',
    '#......#............#......#',
    '#.####.####.####.####.####.#',
    '#.####.####.####.####.####.#',
    '#...........####...........#',
    '#.###.####.######.####.###.#',
    '#o###.####.######.####.###o#',
    '#.....#....######....#.....#',
    '#.###.#.############.#.###.#',
    '#..........................#',
    '############################'
  ];

  const TUNNEL_ROWS = [];
  for (let y = 0; y < ROWS; y++) if (MAP[y][0] !== '#') TUNNEL_ROWS.push(y);

  const DIRS = {
    up: { dx: 0, dy: -1 }, left: { dx: -1, dy: 0 }, down: { dx: 0, dy: 1 }, right: { dx: 1, dy: 0 }
  };
  // The tie-break order when two directions are equally close to the target.
  const ORDER = ['up', 'left', 'down', 'right'];
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

  // The house sits between columns 13 and 14, so its centre line is x = 14.0
  // exactly, half way between two tile centres. The movement code copes with
  // that: an entity at x = 14.0 is simply "past the centre" of tile 13 or
  // "before the centre" of tile 14 depending on which way it faces.
  const HOUSE = { x: 14, y: 14.5, exitY: 11.5, slots: [14, 12, 16], exitTiles: [13, 14], exitRow: 11 };
  const START = { x: 14, y: 21.5, dir: 'left' };
  const FRUIT_SPOT = { x: 14, y: 17.5 };

  const GHOSTS = [
    { name: 'Blaze',  mind: 'chaser',   colour: '#ff4d3a', scatter: { x: 25, y: -3 } },
    { name: 'Wisp',   mind: 'ambusher', colour: '#ff6fd8', scatter: { x: 2, y: -3 } },
    { name: 'Echo',   mind: 'flanker',  colour: '#3ee6d2', scatter: { x: 27, y: 32 } },
    { name: 'Muddle', mind: 'nervous',  colour: '#ffb02e', scatter: { x: 0, y: 32 } }
  ];

  const FRUITS = [
    ['cherry', 100], ['berry', 300], ['lemon', 500], ['lemon', 500], ['apple', 700], ['apple', 700],
    ['melon', 1000], ['melon', 1000], ['star', 2000], ['star', 2000], ['gem', 3000], ['gem', 3000], ['crown', 5000]
  ];

  // Seconds of frightened time per level. Beyond the table it is zero: the
  // power pellets still turn the ghosts around, but there is nothing to eat.
  const FRIGHT = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1];

  /* ---------- level table ---------- */

  function levelSpec(level) {
    const L = Math.max(1, level | 0);
    const band = L === 1 ? 0 : L <= 4 ? 1 : L <= 20 ? 2 : 3;
    const pct = [
      { player: 0.80, ghost: 0.75, tunnel: 0.40, frightPlayer: 0.90, frightGhost: 0.50, elroy: 0.80 },
      { player: 0.90, ghost: 0.85, tunnel: 0.45, frightPlayer: 0.95, frightGhost: 0.55, elroy: 0.90 },
      { player: 1.00, ghost: 0.95, tunnel: 0.50, frightPlayer: 1.00, frightGhost: 0.60, elroy: 1.00 },
      // Past level 20 the player slows again while the ghosts do not.
      { player: 0.90, ghost: 0.95, tunnel: 0.50, frightPlayer: 1.00, frightGhost: 0.60, elroy: 1.00 }
    ][band];
    // Blaze speeds up ("cruise" mode) when this many pellets are left, and
    // again at half that. The thresholds climb with the level.
    const elroy = L === 1 ? 20 : L === 2 ? 30 : L <= 5 ? 40 : L <= 8 ? 50 : L <= 11 ? 60 : L <= 14 ? 80 : L <= 18 ? 100 : 120;
    // Scatter, chase, scatter, chase ... and after the last entry, chase for ever.
    const schedule = L === 1 ? [7, 20, 7, 20, 5, 20, 5]
                   : L <= 4 ? [7, 20, 7, 20, 5, 1033, 1 / 60]
                   : [5, 20, 5, 20, 5, 1037, 1 / 60];
    const frightTime = L <= FRIGHT.length ? FRIGHT[L - 1] : 0;
    return {
      player: pct.player, ghost: pct.ghost, tunnel: pct.tunnel,
      frightPlayer: pct.frightPlayer, frightGhost: pct.frightGhost,
      frightTime, flashTime: Math.min(2, frightTime),
      elroy1: elroy, elroy2: Math.floor(elroy / 2), elroySpeed1: pct.elroy, elroySpeed2: pct.elroy + 0.05,
      fruit: { kind: FRUITS[Math.min(L, FRUITS.length) - 1][0], value: FRUITS[Math.min(L, FRUITS.length) - 1][1] },
      schedule,
      // Pellets that must be eaten before each ghost may leave the house at
      // the start of a level. Blaze starts outside, Wisp leaves at once.
      dotLimits: L === 1 ? [0, 0, 30, 60] : L === 2 ? [0, 0, 0, 50] : [0, 0, 0, 0],
      // If nothing is eaten for this long the next ghost leaves anyway.
      noDotTime: L < 5 ? 4 : 3
    };
  }

  /* ---------- randomness ---------- */

  function makeRng(seed) {
    let a = (seed == null ? 1 : seed) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- tiles ---------- */

  function wrapX(x) { return ((x % COLS) + COLS) % COLS; }

  function tileChar(s, x, y) {
    if (y < 0 || y >= ROWS) return '#';
    return s.tiles[y * COLS + wrapX(x)];
  }

  function playerPassable(s, x, y) {
    const c = tileChar(s, x, y);
    return c !== '#' && c !== '-';
  }

  // Ghosts use the door only on their scripted way in and out, never as a path.
  const ghostPassable = playerPassable;

  function isTunnel(x, y) {
    return TUNNEL_ROWS.indexOf(y) !== -1 && (x < 7 || x > 20);
  }

  function countPellets(s) {
    let n = 0;
    for (let i = 0; i < s.tiles.length; i++) if (s.tiles[i] === '.' || s.tiles[i] === 'o') n++;
    return n;
  }

  /* ---------- game setup ---------- */

  function setDir(e, dir) {
    e.dir = dir;
    e.dx = DIRS[dir].dx;
    e.dy = DIRS[dir].dy;
  }

  function newGame(opts) {
    const o = Object.assign({ seed: 1, level: 1, lives: 3 }, opts || {});
    const s = {
      rng: makeRng(o.seed),
      level: o.level,
      score: 0,
      lives: o.lives,
      extraGiven: false,
      events: [],
      acc: 0,
      time: 0,
      tiles: null,
      spec: null,
      pelletsLeft: 0,
      pelletsEaten: 0,
      dotsSinceReset: 0,
      noDotT: 0,
      phase: 'ready',            // ready | play | dying | clear | over
      phaseT: 0,
      mode: 'scatter',
      modeIdx: 0,
      modeT: 0,
      fright: { on: false, t: 0, dur: 0, chain: 0 },
      freezeT: 0,
      player: null,
      ghosts: GHOSTS.map((g, i) => ({
        id: i, name: g.name, mind: g.mind, colour: g.colour, scatter: g.scatter,
        x: 0, y: 0, dir: 'up', dx: 0, dy: -1, moving: true,
        state: 'home',           // home | leaving | out | entering
        mode: 'normal',          // normal | fright | eyes
        dotLimit: 0, bob: 1
      })),
      fruit: null,
      fruitsShown: 0,
      fruitHistory: []
    };
    loadLevel(s, s.level);
    return s;
  }

  function loadLevel(s, level) {
    s.level = level;
    s.spec = levelSpec(level);
    s.tiles = MAP.join('').split('');
    s.pelletsLeft = countPellets(s);
    s.pelletsEaten = 0;
    s.fruit = null;
    s.fruitsShown = 0;
    s.fruitHistory.push(s.spec.fruit.kind);
    if (s.fruitHistory.length > 7) s.fruitHistory.shift();
    resetPositions(s, false);
    s.phase = 'ready';
    s.phaseT = 2.2;
  }

  /** Everyone back to the start. Pellets stay as they are. */
  function resetPositions(s, afterDeath) {
    s.player = {
      x: START.x, y: START.y, dir: START.dir, dx: 0, dy: 0,
      want: null, moving: true, stall: 0
    };
    setDir(s.player, START.dir);
    // After a death the house empties faster, so the pressure returns quickly.
    const limits = afterDeath ? [0, 0, 7, 17] : s.spec.dotLimits;
    s.ghosts.forEach((g, i) => {
      g.mode = 'normal';
      g.moving = true;
      g.dotLimit = limits[i];
      g.bob = i % 2 ? 1 : -1;
      if (i === 0) {
        g.state = 'out';
        g.x = HOUSE.x; g.y = HOUSE.exitY;
        setDir(g, 'left');
      } else {
        g.state = 'home';
        g.x = HOUSE.slots[i - 1]; g.y = HOUSE.y;
        setDir(g, g.bob > 0 ? 'down' : 'up');
      }
    });
    s.dotsSinceReset = 0;
    s.noDotT = 0;
    s.freezeT = 0;
    s.fright = { on: false, t: 0, dur: 0, chain: 0 };
    s.mode = 'scatter';
    s.modeIdx = 0;
    s.modeT = s.spec.schedule[0];
  }

  function emit(s, type, extra) {
    s.events.push(Object.assign({ type }, extra || {}));
  }

  /* ---------- the clock ---------- */

  /** Advance by dt seconds in fixed ticks. Returns the events that happened. */
  function update(s, dt) {
    s.acc += Math.min(dt, 0.1);
    while (s.acc >= TICK - 1e-9) {
      s.acc -= TICK;
      tick(s);
    }
    const ev = s.events;
    s.events = [];
    return ev;
  }

  function tick(s) {
    s.time += TICK;
    if (s.phase === 'ready') {
      s.phaseT -= TICK;
      if (s.phaseT <= EPS) { s.phase = 'play'; emit(s, 'go'); }
      return;
    }
    if (s.phase === 'dying') {
      s.phaseT -= TICK;
      if (s.phaseT <= EPS) afterDeath(s);
      return;
    }
    if (s.phase === 'clear') {
      s.phaseT -= TICK;
      if (s.phaseT <= EPS) { loadLevel(s, s.level + 1); emit(s, 'level', { level: s.level }); }
      return;
    }
    if (s.phase !== 'play') return;

    // The short freeze after eating a ghost: nothing moves, the score shows.
    if (s.freezeT > EPS) { s.freezeT -= TICK; return; }

    s.noDotT += TICK;
    tickModes(s);
    tickPlayer(s);
    checkCollisions(s);
    if (s.phase !== 'play') return;
    for (const g of s.ghosts) tickGhost(s, g);
    tickFruit(s);
    checkCollisions(s);
    if (s.phase !== 'play') return;

    if (s.pelletsLeft === 0) {
      s.phase = 'clear';
      s.phaseT = 2.5;
      emit(s, 'clear', { level: s.level });
    }
  }

  /* ---------- scatter, chase, frightened ---------- */

  function tickModes(s) {
    if (s.fright.on) {
      // The scatter/chase clock stands still while the ghosts are blue.
      s.fright.t -= TICK;
      if (s.fright.t <= EPS) endFright(s);
      return;
    }
    const sched = s.spec.schedule;
    if (s.modeIdx >= sched.length) return;      // chase for ever
    s.modeT -= TICK;
    if (s.modeT > EPS) return;
    s.modeIdx++;
    s.mode = s.modeIdx % 2 === 0 ? 'scatter' : 'chase';
    s.modeT = s.modeIdx < sched.length ? sched[s.modeIdx] : Infinity;
    reverseAll(s);
    emit(s, 'mode', { mode: s.mode });
  }

  /** A mode change is the one thing that makes a ghost turn around. */
  function reverseAll(s) {
    for (const g of s.ghosts) {
      if (g.state === 'out' && g.mode !== 'eyes') setDir(g, OPPOSITE[g.dir]);
    }
  }

  function startFright(s) {
    const dur = s.spec.frightTime;
    reverseAll(s);
    if (dur <= 0) return;                        // late levels: a turn-around, nothing more
    s.fright = { on: true, t: dur, dur, chain: 0 };
    for (const g of s.ghosts) if (g.mode !== 'eyes') g.mode = 'fright';
    emit(s, 'fright');
  }

  function endFright(s) {
    s.fright.on = false;
    s.fright.t = 0;
    for (const g of s.ghosts) if (g.mode === 'fright') g.mode = 'normal';
    emit(s, 'frightEnd');
  }

  /* ---------- movement ---------- */

  function normalise(e) {
    if (e.x < 0) e.x += COLS;
    else if (e.x >= COLS) e.x -= COLS;
  }

  /** Move an entity `dist` tiles along its direction, stopping flush at the
      centre of any tile whose next neighbour is blocked. `onCentre` fires each
      time a tile centre is reached, which is where ghosts choose. */
  function stepEntity(s, e, dist, passable, onCentre) {
    let guard = 0;
    while (dist > 1e-9 && guard++ < 8) {
      const tx = Math.floor(e.x), ty = Math.floor(e.y);
      const cx = tx + 0.5, cy = ty + 0.5;
      // Signed distance to this tile's centre along the travel direction.
      const ahead = e.dx * (cx - e.x) + e.dy * (cy - e.y);
      if (ahead > 1e-9) {
        const step = Math.min(dist, ahead);
        // A step a hair SHORT of the centre still rounds to the centre when it
        // is added on, and an exact `step < ahead` would then return without
        // ever calling onCentre. The entity sits on a junction it never chose
        // at, and next tick it is a fraction past it and walks into the wall.
        // Anything within a nanotile of the centre counts as arriving.
        if (step < ahead - 1e-9) {
          e.x += e.dx * step; e.y += e.dy * step; dist -= step;
          return;
        }
        dist -= step;
        e.x = cx; e.y = cy;                       // land exactly, no drift
        if (onCentre) onCentre(s, e, tx, ty);
        continue;
      }
      const nx = tx + e.dx, ny = ty + e.dy;
      if (!passable(s, nx, ny)) { e.x = cx; e.y = cy; e.moving = false; return; }
      const toNext = 1 + ahead;                   // ahead is zero or negative here
      const step = Math.min(dist, toNext);
      if (step < toNext - 1e-9) {
        e.x += e.dx * step; e.y += e.dy * step; dist -= step;
        normalise(e);
        return;
      }
      e.x = cx + e.dx; e.y = cy + e.dy; dist -= step;
      normalise(e);
      if (onCentre) onCentre(s, e, wrapX(nx), ny);
    }
  }

  function approach(v, target, step) {
    if (v < target) return Math.min(v + step, target);
    if (v > target) return Math.max(v - step, target);
    return v;
  }

  /* ---------- the player ---------- */

  function setWant(s, dir) {
    if (dir && DIRS[dir]) s.player.want = dir;
  }

  /** Apply the buffered turn if it is possible right now. A turn taken a
      little before the corner slides diagonally onto the new lane, which is
      the cornering trick that lets a good player gain on the ghosts. */
  function tryTurn(s, p) {
    const w = p.want;
    if (!w || w === p.dir) return;
    if (w === OPPOSITE[p.dir]) {                  // reversing is always allowed
      setDir(p, w); p.moving = true; p.want = null;
      return;
    }
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    const off = p.dx !== 0 ? p.x - (tx + 0.5) : p.y - (ty + 0.5);
    if (Math.abs(off) > CORNER) return;
    const d = DIRS[w];
    if (!playerPassable(s, tx + d.dx, ty + d.dy)) return;
    setDir(p, w); p.moving = true; p.want = null;
  }

  function playerSpeed(s) {
    return BASE * (s.fright.on ? s.spec.frightPlayer : s.spec.player);
  }

  function tickPlayer(s) {
    const p = s.player;
    if (p.stall > 0) { p.stall--; return; }
    tryTurn(s, p);
    if (p.moving) {
      const dist = playerSpeed(s) * TICK;
      // Cornering: ease onto the lane centre at the same rate as we advance.
      if (p.dx !== 0) p.y = approach(p.y, Math.floor(p.y) + 0.5, dist);
      else p.x = approach(p.x, Math.floor(p.x) + 0.5, dist);
      stepEntity(s, p, dist, playerPassable, null);
    }
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    const c = tileChar(s, tx, ty);
    if (c === '.' || c === 'o') eatPellet(s, tx, ty, c);
  }

  function eatPellet(s, tx, ty, c) {
    s.tiles[ty * COLS + wrapX(tx)] = ' ';
    s.pelletsLeft--;
    s.pelletsEaten++;
    s.dotsSinceReset++;
    s.noDotT = 0;
    const p = s.player;
    if (c === 'o') {
      p.stall = 3;
      addScore(s, 50);
      startFright(s);
      emit(s, 'power');
    } else {
      p.stall = 1;
      addScore(s, 10);
      emit(s, 'pellet', { left: s.pelletsLeft });
    }
    if (FRUIT_AT_PELLETS.indexOf(s.pelletsEaten) !== -1 && !s.fruit) spawnFruit(s);
  }

  function addScore(s, n) {
    s.score += n;
    if (!s.extraGiven && s.score >= EXTRA_LIFE_AT) {
      s.extraGiven = true;
      s.lives++;
      emit(s, 'extraLife');
    }
  }

  /* ---------- ghosts ---------- */

  /** Where the player is heading, n tiles on. Facing up also shifts it n
      tiles LEFT: the original's overflow bug, kept because players rely on it. */
  function aheadOf(p, n) {
    const d = DIRS[p.dir];
    const t = { x: Math.floor(p.x) + d.dx * n, y: Math.floor(p.y) + d.dy * n };
    if (p.dir === 'up') t.x -= n;
    return t;
  }

  function targetFor(s, g) {
    if (g.mode === 'eyes') return { x: HOUSE.exitTiles[1], y: HOUSE.exitRow };
    if (s.mode === 'scatter') return g.scatter;
    const p = s.player;
    const px = Math.floor(p.x), py = Math.floor(p.y);
    switch (g.mind) {
      case 'chaser':
        return { x: px, y: py };
      case 'ambusher':
        return aheadOf(p, 4);
      case 'flanker': {
        const a = aheadOf(p, 2);
        const r = s.ghosts[0];
        const rx = Math.floor(r.x), ry = Math.floor(r.y);
        return { x: rx + 2 * (a.x - rx), y: ry + 2 * (a.y - ry) };
      }
      case 'nervous': {
        const dx = Math.floor(g.x) - px, dy = Math.floor(g.y) - py;
        return dx * dx + dy * dy > 64 ? { x: px, y: py } : g.scatter;
      }
    }
    return { x: px, y: py };
  }

  /** The direction a ghost takes from tile (tx, ty): never back, and of the
      rest the one whose next tile is nearest the target in a straight line.
      Frightened ghosts pick at random instead. */
  function chooseDir(s, g, tx, ty) {
    const back = OPPOSITE[g.dir];
    const cands = [];
    for (const d of ORDER) {
      if (d === back) continue;
      const v = DIRS[d];
      if (ghostPassable(s, tx + v.dx, ty + v.dy)) cands.push(d);
    }
    if (!cands.length) return back;
    if (g.mode === 'fright') return cands[Math.floor(s.rng() * cands.length)];
    const t = targetFor(s, g);
    let best = cands[0], bestD = Infinity;
    for (const d of cands) {
      const v = DIRS[d];
      const dx = tx + v.dx - t.x, dy = ty + v.dy - t.y;
      const dd = dx * dx + dy * dy;
      if (dd < bestD) { bestD = dd; best = d; }
    }
    return best;
  }

  function ghostAtCentre(s, g, tx, ty) {
    if (g.mode === 'eyes' && ty === HOUSE.exitRow && HOUSE.exitTiles.indexOf(tx) !== -1) {
      g.state = 'entering';
      return;
    }
    setDir(g, chooseDir(s, g, tx, ty));
  }

  function ghostSpeed(s, g) {
    const sp = s.spec;
    if (g.mode === 'eyes') return BASE * EYES_SPEED;
    if (isTunnel(Math.floor(g.x), Math.floor(g.y))) return BASE * sp.tunnel;
    if (g.mode === 'fright') return BASE * sp.frightGhost;
    // Cruise mode is suspended while Muddle is still in the house after a death.
    if (g.id === 0 && s.ghosts[3].state !== 'home') {
      if (s.pelletsLeft <= sp.elroy2) return BASE * sp.elroySpeed2;
      if (s.pelletsLeft <= sp.elroy1) return BASE * sp.elroySpeed1;
    }
    return BASE * sp.ghost;
  }

  /** Ghosts leave the house in a fixed order, each once enough pellets have
      gone since the last reset, or when the player stalls too long. */
  function releaseDue(s, g) {
    for (let i = 1; i < g.id; i++) if (s.ghosts[i].state === 'home') return false;
    if (s.dotsSinceReset >= g.dotLimit) return true;
    if (s.noDotT >= s.spec.noDotTime) { s.noDotT = 0; return true; }
    return false;
  }

  function tickGhost(s, g) {
    if (g.state === 'home') {
      g.y += g.bob * 1.6 * TICK;
      if (g.y > HOUSE.y + 0.3) { g.y = HOUSE.y + 0.3; g.bob = -1; }
      if (g.y < HOUSE.y - 0.3) { g.y = HOUSE.y - 0.3; g.bob = 1; }
      setDir(g, g.bob > 0 ? 'down' : 'up');
      if (releaseDue(s, g)) g.state = 'leaving';
      return;
    }
    if (g.state === 'leaving') {
      const step = HOUSE_SPEED * TICK;
      if (g.x !== HOUSE.x) {
        setDir(g, g.x < HOUSE.x ? 'right' : 'left');
        g.x = approach(g.x, HOUSE.x, step);
      } else {
        setDir(g, 'up');
        g.y = approach(g.y, HOUSE.exitY, step);
        if (g.y === HOUSE.exitY) {
          g.state = 'out';
          g.moving = true;
          setDir(g, chooseDir(s, g, HOUSE.exitTiles[1], HOUSE.exitRow));
        }
      }
      return;
    }
    if (g.state === 'entering') {
      const step = EYES_SPEED * BASE * TICK;
      if (g.x !== HOUSE.x) {
        setDir(g, g.x < HOUSE.x ? 'right' : 'left');
        g.x = approach(g.x, HOUSE.x, step);
      } else {
        setDir(g, 'down');
        g.y = approach(g.y, HOUSE.y, step);
        if (g.y === HOUSE.y) {
          g.mode = 'normal';
          g.state = 'leaving';
          emit(s, 'revived', { ghost: g.id });
        }
      }
      return;
    }
    // A mode change turns a ghost round where it stands, and on the one tick a
    // ghost sits exactly on a junction it has just turned at, the way back is
    // a wall. stepEntity then parks it flush against that wall, and with
    // nothing to move it on it stands there for the rest of the game: Blaze
    // froze at tile (16, 21) doing exactly this. Rather than trust that the
    // arithmetic above never leaves anyone on a centre again, a ghost that has
    // nowhere to go simply chooses again from where it is.
    if (!g.moving) {
      g.moving = true;
      ghostAtCentre(s, g, Math.floor(g.x), Math.floor(g.y));
      if (g.state !== 'out') return;
    }
    stepEntity(s, g, ghostSpeed(s, g) * TICK, ghostPassable, ghostAtCentre);
  }

  /* ---------- fruit ---------- */

  function spawnFruit(s) {
    s.fruit = {
      kind: s.spec.fruit.kind, value: s.spec.fruit.value,
      x: FRUIT_SPOT.x, y: FRUIT_SPOT.y,
      t: 9 + s.rng()                                // nine to ten seconds
    };
    s.fruitsShown++;
    emit(s, 'fruit', { kind: s.fruit.kind });
  }

  function tickFruit(s) {
    if (!s.fruit) return;
    s.fruit.t -= TICK;
    if (s.fruit.t <= EPS) { s.fruit = null; emit(s, 'fruitGone'); }
  }

  /* ---------- collisions ---------- */

  function touching(a, b) {
    if (Math.floor(a.x) === Math.floor(b.x) && Math.floor(a.y) === Math.floor(b.y)) return true;
    // Also catch two bodies overlapping across a tile edge, so nothing slips
    // through a ghost in the one tick where both cross the same boundary. The
    // radius is two thirds of a tile, which is where the drawn bodies, nearly
    // a tile wide each, visibly overlap: a tighter circle would let a ghost
    // pass straight through you on screen.
    let dx = a.x - b.x;
    if (dx > COLS / 2) dx -= COLS; else if (dx < -COLS / 2) dx += COLS;
    const dy = a.y - b.y;
    return dx * dx + dy * dy < 0.45;
  }

  function checkCollisions(s) {
    const p = s.player;
    for (const g of s.ghosts) {
      if (g.state !== 'out' || g.mode === 'eyes') continue;
      if (!touching(p, g)) continue;
      if (g.mode === 'fright') eatGhost(s, g);
      else { die(s); return; }
    }
    if (s.fruit && touching(p, s.fruit)) {
      addScore(s, s.fruit.value);
      emit(s, 'fruitEaten', { kind: s.fruit.kind, points: s.fruit.value, x: s.fruit.x, y: s.fruit.y });
      s.fruit = null;
    }
  }

  function eatGhost(s, g) {
    s.fright.chain++;
    const points = 200 * Math.pow(2, s.fright.chain - 1);   // 200, 400, 800, 1600
    addScore(s, points);
    g.mode = 'eyes';
    s.freezeT = 0.9;
    emit(s, 'ghost', { ghost: g.id, points, x: g.x, y: g.y });
  }

  function die(s) {
    s.phase = 'dying';
    s.phaseT = 2.0;
    s.fruit = null;
    emit(s, 'die');
  }

  function afterDeath(s) {
    s.lives--;
    if (s.lives <= 0) {
      s.phase = 'over';
      emit(s, 'over', { score: s.score });
      return;
    }
    resetPositions(s, true);
    s.phase = 'ready';
    s.phaseT = 1.5;
  }

  /* ---------- test helpers ---------- */

  /** Remove pellets until only `n` remain, for driving the end of a level. */
  function leavePellets(s, n) {
    for (let i = 0; i < s.tiles.length && s.pelletsLeft > n; i++) {
      if (s.tiles[i] === '.' || s.tiles[i] === 'o') { s.tiles[i] = ' '; s.pelletsLeft--; }
    }
  }

  return {
    COLS, ROWS, TICK, BASE, CORNER, MAP, DIRS, ORDER, OPPOSITE, HOUSE, START, FRUIT_SPOT, GHOSTS, FRUITS,
    TUNNEL_ROWS, EXTRA_LIFE_AT, FRUIT_AT_PELLETS,
    levelSpec, makeRng, newGame, loadLevel, resetPositions, update, tick,
    tileChar, playerPassable, ghostPassable, isTunnel, countPellets, wrapX,
    setWant, tryTurn, stepEntity, playerSpeed, ghostSpeed,
    targetFor, chooseDir, aheadOf, startFright, endFright, reverseAll,
    spawnFruit, eatGhost, die, leavePellets, setDir
  };
})();
