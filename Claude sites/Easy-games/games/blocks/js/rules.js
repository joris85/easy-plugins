'use strict';

/* Easy Blocks - the rules engine.

   Pure logic: no canvas, no DOM, seeded randomness. The controller feeds it
   time and key presses and reads back a list of events, which is what makes
   every rule below testable from node without a browser.

   The mechanics follow the modern guideline standard, because anyone who has
   played a falling-block game in the last twenty years has that feel in their
   hands and anything less registers as wrong:

   - Seven pieces dealt from a 7-BAG: all seven shuffled, dealt out, then a
     fresh bag. You never wait more than twelve pieces for the one you need and
     never drown in S and Z.
   - SRS ROTATION WITH WALL KICKS. A rotation that does not fit where it is
     tries up to four alternative offsets before giving up, which is what lets
     a piece rotate flush against a wall, off the floor, and into a T-slot.
   - LOCK DELAY. A piece that lands does not freeze at once: it gets half a
     second, and every move or rotation on the ground restarts that clock, up
     to fifteen times. That is the difference between "the game locked my
     piece the moment it touched" and "I had time to slide it under".
   - GRAVITY BY THE GUIDELINE FORMULA, one level every ten lines, plus
     back-to-back and combo scoring and honest T-spin detection.

   Coordinates: y grows DOWNWARD, row 0 is the top of a hidden buffer of
   twenty rows above the twenty visible ones. Pieces spawn in the buffer's last
   two rows, just above the skyline. The SRS reference tables put y upward, so
   every kick table below has its y flipped relative to the published ones. */

const BlocksRules = (function () {

  const DEFAULTS = {
    cols: 10,
    rows: 20,               // visible rows
    buffer: 20,             // hidden rows above them; the matrix is 40 deep
    previews: 5,            // pieces shown in the next queue
    lockDelay: 500,         // ms a landed piece waits before it sets
    maxResets: 15,          // moves or rotations that may restart that wait
    clearDelay: 320,        // ms full rows stay lit before they collapse
    softDropFactor: 20,     // soft drop falls this many times faster than gravity
    startLevel: 1,
    linesPerLevel: 10,
    maxLevel: 30            // speed stops climbing here; well under a frame per cell by then
  };

  const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

  /* Rotation states: 0 spawn, 1 clockwise, 2 upside down, 3 anticlockwise.
     Cells are [x, y] inside the piece's box, a 4x4 for the I and a 3x3 for the
     rest, so the box centre (1, 1) is the pivot every 3x3 piece turns around.
     The O never moves when it turns, so its four states are identical. */
  const SHAPES = {
    I: [[[0, 1], [1, 1], [2, 1], [3, 1]], [[2, 0], [2, 1], [2, 2], [2, 3]],
        [[0, 2], [1, 2], [2, 2], [3, 2]], [[1, 0], [1, 1], [1, 2], [1, 3]]],
    O: [[[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]],
        [[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]]],
    T: [[[1, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [2, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [1, 2]]],
    S: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[1, 0], [1, 1], [2, 1], [2, 2]],
        [[1, 1], [2, 1], [0, 2], [1, 2]], [[0, 0], [0, 1], [1, 1], [1, 2]]],
    Z: [[[0, 0], [1, 0], [1, 1], [2, 1]], [[2, 0], [1, 1], [2, 1], [1, 2]],
        [[0, 1], [1, 1], [1, 2], [2, 2]], [[1, 0], [0, 1], [1, 1], [0, 2]]],
    J: [[[0, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [2, 2]], [[1, 0], [1, 1], [0, 2], [1, 2]]],
    L: [[[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [1, 2], [2, 2]],
        [[0, 1], [1, 1], [2, 1], [0, 2]], [[0, 0], [1, 0], [1, 1], [1, 2]]]
  };

  const BOX = { I: 4, O: 3, T: 3, S: 3, Z: 3, J: 3, L: 3 };

  /* SRS wall kicks, keyed "from->to". Each entry is tried in order and the
     first that fits wins; entry 0 is always the plain rotation. y is flipped
     from the published tables because our y points down. The fifth entry is
     the deep kick (two rows down and across) that makes the T-spin triple
     possible, which is why a rotation that lands on it is always a full spin. */
  const KICKS = {
    '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]
  };

  const KICKS_I = {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '0>3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]]
  };

  /* Scoring, all multiplied by the level. Lines cleared without a spin, with a
     full T-spin, and with a mini T-spin. A mini triple cannot happen. */
  const LINE_POINTS = [0, 100, 300, 500, 800];
  const TSPIN_POINTS = [400, 800, 1200, 1600];
  const MINI_POINTS = [100, 200, 400, 400];
  const PERFECT_POINTS = [0, 800, 1200, 1800, 2000];
  const COMBO_STEP = 50;
  const B2B_MULT = 1.5;

  /* ---------- randomness ---------- */

  /** mulberry32: tiny, seedable, good enough to shuffle seven pieces. */
  function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- the game object ---------- */

  function newGame(cfg, seed) {
    const c = Object.assign({}, DEFAULTS, cfg || {});
    const g = {
      cfg: c,
      cols: c.cols,
      height: c.rows + c.buffer,
      buffer: c.buffer,
      grid: [],
      rng: makeRng(seed == null ? 1 : seed),
      bag: [],
      queue: [],
      hold: null,
      holdUsed: false,
      piece: null,            // { type, rot, x, y }
      phase: 'fall',          // fall | clearing | over
      clearing: null,         // { rows, timer } while full rows are lit
      score: 0,
      lines: 0,
      level: c.startLevel,
      combo: -1,              // consecutive clearing placements; -1 is none
      b2b: false,             // last line clear was a quad or a spin
      pieces: 0,
      lockTimer: 0,
      lockResets: 0,
      lowestY: 0,             // deepest row this piece has reached; falling lower refunds the resets
      lastAction: null,       // move | rotate | fall | drop, for T-spin detection
      lastKick: 0,
      gravityAcc: 0,
      overReason: null,
      stats: { single: 0, double: 0, triple: 0, quad: 0, tspin: 0, maxCombo: 0 }
    };
    for (let y = 0; y < g.height; y++) g.grid.push(new Array(g.cols).fill(0));
    fillQueue(g);
    spawn(g, null, []);
    return g;
  }

  /* ---------- pieces ---------- */

  function cellsOf(type, rot, x, y) {
    return SHAPES[type][rot & 3].map((c) => [c[0] + x, c[1] + y]);
  }

  function fits(g, type, rot, x, y) {
    const cells = cellsOf(type, rot, x, y);
    for (const [cx, cy] of cells) {
      if (cx < 0 || cx >= g.cols || cy < 0 || cy >= g.height) return false;
      if (g.grid[cy][cx]) return false;
    }
    return true;
  }

  function pieceFits(g, p) { return fits(g, p.type, p.rot, p.x, p.y); }

  function onGround(g) {
    const p = g.piece;
    return !!p && !fits(g, p.type, p.rot, p.x, p.y + 1);
  }

  function ghostY(g) {
    const p = g.piece;
    if (!p) return 0;
    let y = p.y;
    while (fits(g, p.type, p.rot, p.x, y + 1)) y++;
    return y;
  }

  /** The 7-bag: deal every type once, in a random order, before repeating any. */
  function nextType(g) {
    if (!g.bag.length) {
      g.bag = TYPES.slice();
      for (let i = g.bag.length - 1; i > 0; i--) {
        const j = Math.floor(g.rng() * (i + 1));
        const t = g.bag[i]; g.bag[i] = g.bag[j]; g.bag[j] = t;
      }
    }
    return g.bag.pop();
  }

  function fillQueue(g) {
    while (g.queue.length < g.cfg.previews) g.queue.push(nextType(g));
  }

  /** Put the next piece (or `type`, when swapping out of hold) at the top. */
  function spawn(g, type, events) {
    if (!type) { type = g.queue.shift(); fillQueue(g); }
    // Column 3 puts every box in the middle; the spawn rows are the two just
    // above the skyline, so a piece appears from behind the top edge.
    const p = { type, rot: 0, x: 3, y: g.buffer - 2 };
    g.piece = p;
    g.lockTimer = 0;
    g.lockResets = 0;
    g.lastAction = null;
    g.lastKick = 0;
    g.gravityAcc = 0;
    if (!pieceFits(g, p)) {
      // Block out: the new piece overlaps the stack. The well is full.
      g.phase = 'over';
      g.overReason = 'blockout';
      emit(events, 'over', { reason: 'blockout' });
      return events;
    }
    // The guideline drops a fresh piece one row at once when it can, which is
    // what brings it into view without waiting out a whole gravity step.
    if (fits(g, p.type, p.rot, p.x, p.y + 1)) p.y++;
    g.lowestY = p.y;
    emit(events, 'spawn', { piece: type });
    return events;
  }

  /* ---------- player actions ---------- */

  /** A successful move or rotation on the ground restarts the lock clock, at
      most maxResets times per row reached. Moves in the air cost nothing. */
  function noteAction(g, wasOnGround) {
    if (!wasOnGround) { g.lockTimer = 0; return; }
    if (g.lockResets < g.cfg.maxResets) { g.lockTimer = 0; g.lockResets++; }
  }

  function move(g, dx) {
    const events = [];
    const p = g.piece;
    if (g.phase !== 'fall' || !p) return events;
    if (!fits(g, p.type, p.rot, p.x + dx, p.y)) return events;
    const ground = onGround(g);
    p.x += dx;
    g.lastAction = 'move';
    noteAction(g, ground);
    emit(events, 'move', { dx });
    return events;
  }

  /** dir +1 clockwise, -1 anticlockwise. Tries the kicks in order. */
  function rotate(g, dir) {
    const events = [];
    const p = g.piece;
    if (g.phase !== 'fall' || !p) return events;
    if (p.type === 'O') return events;       // turning a square changes nothing
    const from = p.rot, to = (p.rot + dir + 4) & 3;
    const table = (p.type === 'I' ? KICKS_I : KICKS)[from + '>' + to];
    const ground = onGround(g);
    for (let i = 0; i < table.length; i++) {
      const nx = p.x + table[i][0], ny = p.y + table[i][1];
      if (!fits(g, p.type, to, nx, ny)) continue;
      p.rot = to; p.x = nx; p.y = ny;
      g.lastAction = 'rotate';
      g.lastKick = i;
      noteAction(g, ground);
      emit(events, 'rotate', { dir, kick: i });
      return events;
    }
    return events;
  }

  function hardDrop(g) {
    const events = [];
    const p = g.piece;
    if (g.phase !== 'fall' || !p) return events;
    const gy = ghostY(g);
    const cells = gy - p.y;
    if (cells > 0) {
      p.y = gy;
      g.score += cells * 2;
      g.lastAction = 'drop';
    }
    emit(events, 'harddrop', { cells });
    lock(g, events);
    return events;
  }

  /** Swap the falling piece with the held one, once per placement. */
  function hold(g) {
    const events = [];
    if (g.phase !== 'fall' || !g.piece || g.holdUsed) return events;
    const prev = g.hold;
    g.hold = g.piece.type;
    g.holdUsed = true;
    emit(events, 'hold', { piece: g.hold });
    spawn(g, prev, events);
    return events;
  }

  /* ---------- time ---------- */

  /** Seconds per cell at a level: the guideline curve, a full second at level
      1, 0.79 at level 2, and past a frame per cell around level 14. */
  function gravitySeconds(level, maxLevel) {
    const L = Math.max(1, Math.min(level, maxLevel || DEFAULTS.maxLevel));
    return Math.pow(0.8 - (L - 1) * 0.007, L - 1);
  }

  /** Advance dtMs. softDrop true while the player holds down. */
  function tick(g, dtMs, softDrop) {
    const events = [];
    if (g.phase === 'clearing') {
      g.clearing.timer -= dtMs;
      if (g.clearing.timer <= 0) {
        collapse(g, g.clearing.rows);
        g.clearing = null;
        g.phase = 'fall';
        emit(events, 'collapse', {});
        spawn(g, null, events);
      }
      return events;
    }
    if (g.phase !== 'fall' || !g.piece) return events;

    const p = g.piece;
    const base = gravitySeconds(g.level, g.cfg.maxLevel) * 1000;
    const interval = softDrop ? base / g.cfg.softDropFactor : base;
    g.gravityAcc += dtMs;
    let steps = Math.floor(g.gravityAcc / interval);
    if (steps > g.height) steps = g.height;
    g.gravityAcc -= steps * interval;
    let fell = 0;
    while (steps-- > 0 && fits(g, p.type, p.rot, p.x, p.y + 1)) {
      p.y++;
      fell++;
      g.lastAction = 'fall';
      if (softDrop) g.score += 1;
      if (p.y > g.lowestY) {
        // Reaching a new row refunds the move resets: stalling is only
        // stalling when it happens in one place.
        g.lowestY = p.y;
        g.lockResets = 0;
        g.lockTimer = 0;
      }
    }
    if (fell) emit(events, 'fall', { cells: fell, soft: !!softDrop });

    if (onGround(g)) {
      // Resting on the stack: do not bank gravity, or a piece nudged off a
      // ledge would teleport down the accumulated distance in one frame.
      if (g.gravityAcc > interval) g.gravityAcc = interval;
      // A piece that landed during this very tick starts its clock on the
      // next one; crediting it the whole tick would let one long frame both
      // land and lock it.
      if (!fell) g.lockTimer += dtMs;
      if (g.lockTimer >= g.cfg.lockDelay) lock(g, events);
    } else {
      g.lockTimer = 0;
    }
    return events;
  }

  /* ---------- locking and clearing ---------- */

  /** A T that arrived by rotation and sits in a pocket with three of the four
      cells around its centre filled is a T-spin. Both "front" corners (the
      side the T points to) filled makes it a full spin; otherwise it is a
      mini, unless it got there on the deep fifth kick, which is a full spin
      by definition. Walls and the floor count as filled. */
  function tspinOf(g) {
    const p = g.piece;
    if (p.type !== 'T' || g.lastAction !== 'rotate') return 'none';
    const filled = (cx, cy) => cx < 0 || cx >= g.cols || cy < 0 || cy >= g.height || !!g.grid[cy][cx];
    const A = filled(p.x, p.y), B = filled(p.x + 2, p.y);
    const C = filled(p.x, p.y + 2), D = filled(p.x + 2, p.y + 2);
    const count = A + B + C + D;
    if (count < 3) return 'none';
    const front = [[A, B], [B, D], [C, D], [A, C]][p.rot];
    if (front[0] && front[1]) return 'full';
    return g.lastKick === 4 ? 'full' : 'mini';
  }

  function fullRows(g) {
    const rows = [];
    for (let y = 0; y < g.height; y++) {
      if (g.grid[y].every((c) => c !== 0)) rows.push(y);
    }
    return rows;
  }

  /** Points for one placement. Exported so the tables can be checked directly. */
  function pointsFor(o) {
    const n = o.lines || 0;
    let pts;
    if (o.tspin === 'full') pts = TSPIN_POINTS[n];
    else if (o.tspin === 'mini') pts = MINI_POINTS[n];
    else pts = LINE_POINTS[n];
    const difficult = n === 4 || (o.tspin !== 'none' && n > 0);
    if (difficult && o.b2b) pts = Math.round(pts * B2B_MULT);
    if (n > 0 && o.combo > 0) pts += COMBO_STEP * o.combo;
    if (o.perfect && n > 0) pts += PERFECT_POINTS[n];
    return pts * o.level;
  }

  function lock(g, events) {
    const p = g.piece;
    const tspin = tspinOf(g);
    const cells = cellsOf(p.type, p.rot, p.x, p.y);
    let allHidden = true;
    for (const [cx, cy] of cells) {
      g.grid[cy][cx] = p.type;
      if (cy >= g.buffer) allHidden = false;
    }
    g.pieces++;
    g.holdUsed = false;
    emit(events, 'lock', { piece: p.type, cells, tspin });
    g.piece = null;

    if (allHidden) {
      // Lock out: the piece set entirely above the skyline.
      g.phase = 'over';
      g.overReason = 'lockout';
      emit(events, 'over', { reason: 'lockout' });
      return events;
    }

    const rows = fullRows(g);
    const n = rows.length;
    const difficult = n === 4 || (tspin !== 'none' && n > 0);
    const rowSet = new Set(rows);
    const perfect = n > 0 && g.grid.every((row, y) => rowSet.has(y) || row.every((c) => c === 0));

    if (n > 0) g.combo++; else g.combo = -1;
    const points = pointsFor({ lines: n, tspin, level: g.level, b2b: g.b2b && difficult, combo: g.combo, perfect });
    const b2bApplied = difficult && g.b2b;
    if (n > 0) g.b2b = difficult;           // a plain clear breaks the chain; a spin with no lines leaves it alone
    g.score += points;

    if (tspin !== 'none') g.stats.tspin++;
    if (n) g.stats[['', 'single', 'double', 'triple', 'quad'][n]]++;
    if (g.combo > g.stats.maxCombo) g.stats.maxCombo = g.combo;

    if (n === 0) {
      if (tspin !== 'none') emit(events, 'spin', { tspin, points });
      spawn(g, null, events);
      return events;
    }

    g.lines += n;
    emit(events, 'clear', { rows, count: n, tspin, b2b: b2bApplied, combo: g.combo, points, perfect });

    const level = Math.min(g.cfg.maxLevel, g.cfg.startLevel + Math.floor(g.lines / g.cfg.linesPerLevel));
    if (level > g.level) { g.level = level; emit(events, 'levelup', { level }); }

    if (g.cfg.clearDelay > 0) {
      g.phase = 'clearing';
      g.clearing = { rows, timer: g.cfg.clearDelay };
    } else {
      collapse(g, rows);
      emit(events, 'collapse', {});
      spawn(g, null, events);
    }
    return events;
  }

  /** Remove full rows and let everything above settle. Built as a new grid
      rather than spliced in place, so nothing is walked while it shrinks. */
  function collapse(g, rows) {
    const gone = new Set(rows);
    const kept = g.grid.filter((row, y) => !gone.has(y));
    while (kept.length < g.height) kept.unshift(new Array(g.cols).fill(0));
    g.grid = kept;
  }

  /** The event type is applied last, so a payload can never overwrite it. */
  function emit(events, type, data) {
    const e = Object.assign({}, data || {}, { type });
    events.push(e);
    return e;
  }

  /** Cells of a piece as it would sit in a preview, normalised to start at 0,0. */
  function previewCells(type) {
    const cells = SHAPES[type][0];
    let minX = 9, minY = 9;
    for (const [x, y] of cells) { if (x < minX) minX = x; if (y < minY) minY = y; }
    return cells.map(([x, y]) => [x - minX, y - minY]);
  }

  return {
    DEFAULTS, TYPES, SHAPES, BOX, KICKS, KICKS_I,
    LINE_POINTS, TSPIN_POINTS, MINI_POINTS, PERFECT_POINTS, COMBO_STEP, B2B_MULT,
    makeRng, newGame, spawn, nextType, fillQueue,
    cellsOf, fits, pieceFits, onGround, ghostY, previewCells,
    move, rotate, hardDrop, hold, tick, lock, collapse,
    tspinOf, fullRows, pointsFor, gravitySeconds
  };
})();
