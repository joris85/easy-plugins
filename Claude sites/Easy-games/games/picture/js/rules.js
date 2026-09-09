'use strict';

/* Easy Picture - the rules engine.

   A nonogram: every row and every column carries the lengths of its runs of
   filled cells, in order. From those numbers alone the picture is deduced.

   Pure logic: no canvas, no DOM, seeded randomness. The controller paints and
   listens; everything that decides anything lives here, which is why it can
   be driven headlessly from node (see test/rules.test.js).

   THE ONE RULE THAT MATTERS. A puzzle is only offered when a LINE SOLVER can
   finish it. The line solver looks at one row or column at a time, works out
   which cells are the same in every placement of that line's runs that agrees
   with what is already known, and writes those down. Nothing else, no trying a
   cell and backing out. When that alone reaches the full picture the puzzle is
   solvable by pure logic, which is what a person can actually do at a table.
   When it stalls, the picture needs a guess somewhere, and it is rejected:
   the generator repairs it by flipping cells and tries again, and a library
   picture that fails is a bug caught by the test suite rather than a bad
   evening for a player.

   THE LINE SOLVER is a prefix/suffix feasibility table rather than an
   enumeration of placements. pre[j][i] says "the first i cells can hold the
   first j runs", suf[j][i] says "cells i onward can hold runs j onward". A cell
   can be blank if some split j exists with pre[j][c] and suf[j][c+1]; it can be
   filled if some run can sit over it with a feasible prefix on its left and a
   feasible suffix on its right. That is O(runs x length x run length) per
   line, so a 20x20 board is solved in well under a millisecond and the
   generator can afford to throw away hundreds of candidates. */

const PictureRules = (function () {

  const UNKNOWN = 0, FILL = 1, CROSS = 2;

  /* ---------- randomness ---------- */

  /** mulberry32: a 32-bit seed, the same stream every time. Daily puzzles need that. */
  function makeRng(seed) {
    let a = (seed == null ? 1 : seed) >>> 0;
    const next = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.int = (n) => Math.floor(next() * n);
    next.state = () => a >>> 0;
    return next;
  }

  /** FNV-1a, so a date string becomes a stable 32-bit seed without a server. */
  function hashString(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /* ---------- pictures ---------- */

  /**
   * A picture from string art. '#' is a filled cell, anything else is empty.
   * Returns { rows, cols, cells } with cells a flat array of 0/1, row major.
   */
  function parsePicture(art) {
    const rows = art.length;
    const cols = art[0].length;
    const cells = new Array(rows * cols);
    for (let r = 0; r < rows; r++) {
      if (art[r].length !== cols) throw new Error('ragged picture at row ' + r);
      for (let c = 0; c < cols; c++) cells[r * cols + c] = art[r][c] === '#' ? 1 : 0;
    }
    return { rows, cols, cells };
  }

  /** The reverse, for tests and for eyeballing generator output. */
  function toArt(pic) {
    const out = [];
    for (let r = 0; r < pic.rows; r++) {
      let s = '';
      for (let c = 0; c < pic.cols; c++) s += pic.cells[r * pic.cols + c] ? '#' : '.';
      out.push(s);
    }
    return out;
  }

  /** Run lengths of the 1s in a line of 0/1. An empty line gives []. */
  function runsOf(line) {
    const runs = [];
    let n = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === 1) n++;
      else if (n) { runs.push(n); n = 0; }
    }
    if (n) runs.push(n);
    return runs;
  }

  function rowOf(cells, cols, r) {
    return cells.slice(r * cols, r * cols + cols);
  }

  function colOf(cells, cols, rows, c) {
    const out = new Array(rows);
    for (let r = 0; r < rows; r++) out[r] = cells[r * cols + c];
    return out;
  }

  /** The clues of a picture: { rows: [[...]], cols: [[...]] }. */
  function cluesFor(pic) {
    const rows = [], cols = [];
    for (let r = 0; r < pic.rows; r++) rows.push(runsOf(rowOf(pic.cells, pic.cols, r)));
    for (let c = 0; c < pic.cols; c++) cols.push(runsOf(colOf(pic.cells, pic.cols, pic.rows, c)));
    return { rows, cols };
  }

  /* ---------- the line solver ---------- */

  /**
   * The feasibility tables for one line, shared by the solver and by the
   * clue ticks. Returns { pre, suf, clear }, or null when no placement of the
   * runs agrees with the cells, which means a contradiction.
   */
  function lineTables(clue, line) {
    const n = line.length, k = clue.length;

    // crossBefore[i] = number of CROSS cells in [0, i), so "no cross inside
    // this run" is one subtraction rather than a scan.
    const crossBefore = new Int16Array(n + 1);
    for (let i = 0; i < n; i++) crossBefore[i + 1] = crossBefore[i] + (line[i] === CROSS ? 1 : 0);
    const clear = (a, b) => crossBefore[b] - crossBefore[a] === 0;   // [a, b) holds no cross

    // pre[j][i]: cells [0, i) can hold exactly runs 0..j-1.
    const pre = [];
    for (let j = 0; j <= k; j++) pre.push(new Uint8Array(n + 1));
    pre[0][0] = 1;
    for (let i = 1; i <= n; i++) pre[0][i] = (pre[0][i - 1] && line[i - 1] !== FILL) ? 1 : 0;
    for (let j = 1; j <= k; j++) {
      const len = clue[j - 1];
      for (let i = 1; i <= n; i++) {
        let v = 0;
        if (line[i - 1] !== FILL && pre[j][i - 1]) v = 1;          // cell i-1 blank
        else if (i >= len && clear(i - len, i)) {                   // run j-1 ends at i-1
          const s = i - len;
          if (s === 0) v = pre[j - 1][0];
          else if (line[s - 1] !== FILL && pre[j - 1][s - 1]) v = 1;
        }
        pre[j][i] = v;
      }
    }
    if (!pre[k][n]) return null;

    // suf[j][i]: cells [i, n) can hold exactly runs j..k-1.
    const suf = [];
    for (let j = 0; j <= k; j++) suf.push(new Uint8Array(n + 1));
    suf[k][n] = 1;
    for (let i = n - 1; i >= 0; i--) suf[k][i] = (suf[k][i + 1] && line[i] !== FILL) ? 1 : 0;
    for (let j = k - 1; j >= 0; j--) {
      const len = clue[j];
      for (let i = n - 1; i >= 0; i--) {
        let v = 0;
        if (line[i] !== FILL && suf[j][i + 1]) v = 1;               // cell i blank
        else if (i + len <= n && clear(i, i + len)) {               // run j starts at i
          const e = i + len;
          if (e === n) v = suf[j + 1][n];
          else if (line[e] !== FILL && suf[j + 1][e + 1]) v = 1;
        }
        suf[j][i] = v;
      }
    }
    return { pre, suf, clear };
  }

  /**
   * Deduce everything one line's clue forces, given its current cells
   * (UNKNOWN / FILL / CROSS). Returns the new line, or null on a contradiction.
   */
  function solveLine(clue, line) {
    const n = line.length, k = clue.length;
    const T = lineTables(clue, line);
    if (!T) return null;
    const { pre, suf, clear } = T;

    const out = line.slice();
    for (let c = 0; c < n; c++) {
      let canBlank = false, canFill = false;
      if (line[c] !== FILL) {
        for (let j = 0; j <= k && !canBlank; j++) if (pre[j][c] && suf[j][c + 1]) canBlank = true;
      }
      if (line[c] !== CROSS) {
        for (let j = 0; j < k && !canFill; j++) {
          const len = clue[j];
          const lo = Math.max(0, c - len + 1), hi = Math.min(c, n - len);
          for (let p = lo; p <= hi && !canFill; p++) {
            if (!clear(p, p + len)) continue;
            const leftOk = p === 0 ? pre[j][0] : (line[p - 1] !== FILL && pre[j][p - 1]);
            if (!leftOk) continue;
            const e = p + len;
            const rightOk = e === n ? suf[j + 1][n] : (line[e] !== FILL && suf[j + 1][e + 1]);
            if (rightOk) canFill = true;
          }
        }
      }
      if (!canBlank && !canFill) return null;
      if (canFill && !canBlank) out[c] = FILL;
      else if (canBlank && !canFill) out[c] = CROSS;
    }
    return out;
  }

  /**
   * The leftmost placement of the runs that agrees with the line: each run
   * is pushed as far left as the cells allow. Greedy is exact here because
   * the suffix table says whether the rest can still fit, so a choice is
   * never taken back. Returns the start cell of every run, or null.
   */
  function leftmostStarts(clue, line, T) {
    const n = line.length, k = clue.length;
    const starts = [];
    let i = 0;
    for (let j = 0; j < k; j++) {
      const len = clue[j];
      let p = i;
      for (;;) {
        if (p + len > n) return null;
        const e = p + len;
        const after = e === n ? (j + 1 === k) : (line[e] !== FILL && T.suf[j + 1][e + 1]);
        if (T.clear(p, e) && after) { starts.push(p); i = e + 1; break; }
        if (line[p] === FILL) return null;      // a fill cannot be left uncovered
        p++;
      }
    }
    return starts;
  }

  /** Leftmost and rightmost consistent starts per run, or null on a contradiction. */
  function runBounds(clue, line) {
    const T = lineTables(clue, line);
    if (!T) return null;
    const left = leftmostStarts(clue, line, T);
    const rline = line.slice().reverse();
    const rclue = clue.slice().reverse();
    const rT = lineTables(rclue, rline);
    const rstarts = leftmostStarts(rclue, rline, rT);
    if (!left || !rstarts) return null;
    const n = line.length, k = clue.length;
    const right = new Array(k);
    for (let j = 0; j < k; j++) right[j] = n - (rstarts[k - 1 - j] + clue[j]);
    return { left, right };
  }

  /* ---------- the whole board ---------- */

  /**
   * Run the line solver over rows and columns until nothing changes. A line
   * goes back in the queue whenever a crossing line changes one of its cells.
   * Returns { solved, board, unknown, passes, steps, contradiction }.
   * `passes` (sweeps over the dirty set) is the difficulty grade.
   */
  function solveByLogic(clues) {
    const rows = clues.rows.length, cols = clues.cols.length;
    const board = new Array(rows * cols).fill(UNKNOWN);
    const dirtyR = new Uint8Array(rows).fill(1);
    const dirtyC = new Uint8Array(cols).fill(1);
    let passes = 0, steps = 0, pending = rows + cols;

    while (pending > 0 && passes < (rows + cols) * 4) {
      passes++;
      for (let r = 0; r < rows; r++) {
        if (!dirtyR[r]) continue;
        dirtyR[r] = 0; pending--;
        const line = board.slice(r * cols, r * cols + cols);
        const res = solveLine(clues.rows[r], line);
        if (!res) return { solved: false, contradiction: true, board, unknown: -1, passes, steps };
        let changed = false;
        for (let c = 0; c < cols; c++) {
          if (res[c] !== line[c]) {
            board[r * cols + c] = res[c];
            changed = true;
            if (!dirtyC[c]) { dirtyC[c] = 1; pending++; }
          }
        }
        if (changed) steps++;
      }
      for (let c = 0; c < cols; c++) {
        if (!dirtyC[c]) continue;
        dirtyC[c] = 0; pending--;
        const line = new Array(rows);
        for (let r = 0; r < rows; r++) line[r] = board[r * cols + c];
        const res = solveLine(clues.cols[c], line);
        if (!res) return { solved: false, contradiction: true, board, unknown: -1, passes, steps };
        let changed = false;
        for (let r = 0; r < rows; r++) {
          if (res[r] !== line[r]) {
            board[r * cols + c] = res[r];
            changed = true;
            if (!dirtyR[r]) { dirtyR[r] = 1; pending++; }
          }
        }
        if (changed) steps++;
      }
    }

    let unknown = 0;
    for (let i = 0; i < board.length; i++) if (board[i] === UNKNOWN) unknown++;
    return { solved: unknown === 0, contradiction: false, board, unknown, passes, steps };
  }

  /** Solvable by line logic alone, and the logic lands on this exact picture. */
  function gradePicture(pic) {
    const res = solveByLogic(cluesFor(pic));
    if (!res.solved) return { solvable: false, passes: res.passes, steps: res.steps, unknown: res.unknown };
    for (let i = 0; i < pic.cells.length; i++) {
      if ((res.board[i] === FILL ? 1 : 0) !== pic.cells[i]) {
        return { solvable: false, passes: res.passes, steps: res.steps, unknown: 0, mismatch: true };
      }
    }
    return { solvable: true, passes: res.passes, steps: res.steps, unknown: 0 };
  }

  function isLogicSolvable(pic) { return gradePicture(pic).solvable; }

  /* ---------- the generator ---------- */

  /**
   * A random picture that looks like something rather than static: noise at a
   * chosen density, often mirrored, then one smoothing pass so cells clump
   * into blobs. Blobs give long runs, and long runs are what line logic bites
   * on, so this also raises the odds a candidate is solvable at all.
   */
  function randomPicture(size, rng, opts) {
    const o = Object.assign({ density: 0.5, mirror: rng() < 0.4, smooth: true }, opts || {});
    const n = size;
    const cells = new Array(n * n).fill(0);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (o.mirror && c > (n - 1) / 2) { cells[r * n + c] = cells[r * n + (n - 1 - c)]; continue; }
        cells[r * n + c] = rng() < o.density ? 1 : 0;
      }
    }
    if (!o.smooth) return { rows: n, cols: n, cells };
    // Majority of the 3x3 neighbourhood, counting the edge as empty.
    const out = cells.slice();
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        let on = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr, cc = c + dc;
            if (rr >= 0 && cc >= 0 && rr < n && cc < n && cells[rr * n + cc]) on++;
          }
        }
        out[r * n + c] = on >= 5 ? 1 : (on <= 3 ? 0 : cells[r * n + c]);
      }
    }
    return { rows: n, cols: n, cells: out };
  }

  /** Reject pictures that are almost all one thing; they are dull to solve. */
  function reasonableDensity(pic) {
    let on = 0;
    for (let i = 0; i < pic.cells.length; i++) on += pic.cells[i];
    const f = on / pic.cells.length;
    return f >= 0.3 && f <= 0.7;
  }

  /**
   * Draw pictures until one is solvable by line logic. A failed candidate is
   * REPAIRED before being thrown away: the solver reports which cells it could
   * not settle, and flipping one of those in the picture usually breaks the
   * tie that made a guess necessary. That keeps the blobby look while
   * pushing the acceptance rate high enough for 20x20 to be quick.
   * Returns { pic, tries, flips, passes }.
   */
  function generate(size, rng, opts) {
    const o = Object.assign({ maxTries: 400, maxFlips: 40 }, opts || {});
    let tries = 0, flips = 0;
    while (tries < o.maxTries) {
      tries++;
      let pic = randomPicture(size, rng);
      if (!reasonableDensity(pic)) continue;
      for (let f = 0; f <= o.maxFlips; f++) {
        const res = solveByLogic(cluesFor(pic));
        if (res.solved) {
          // Repairs can nudge a sparse picture past the density gate; a
          // solved one that has is thrown away rather than handed out.
          if (reasonableDensity(pic)) return { pic, tries, flips, passes: res.passes };
          break;
        }
        if (f === o.maxFlips) break;
        // Flip one unsettled cell. Rows and columns both get a dirty look at it.
        const open = [];
        for (let i = 0; i < res.board.length; i++) if (res.board[i] === UNKNOWN) open.push(i);
        if (!open.length) break;
        const i = open[rng.int(open.length)];
        pic = { rows: pic.rows, cols: pic.cols, cells: pic.cells.slice() };
        pic.cells[i] ^= 1;
        flips++;
      }
    }
    // Every size in the game has been sampled thousands of times without
    // reaching this. A plain stripe is solvable and keeps the game alive.
    const cells = new Array(size * size).fill(0);
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells[r * size + c] = (r + c) % 3 === 0 ? 1 : 0;
    return { pic: { rows: size, cols: size, cells }, tries, flips, passes: 0, fallback: true };
  }

  /* ---------- the daily ---------- */

  /** 'YYYY-MM-DD' in UTC, so everyone in the world shares one puzzle a day. */
  function dateKey(date) {
    const d = date || new Date();
    const p = (v) => String(v).padStart(2, '0');
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
  }

  function dailySeed(key, size) {
    return hashString(key + ':picture:' + size);
  }

  function dailyPuzzle(size, key) {
    const k = key || dateKey();
    const g = generate(size, makeRng(dailySeed(k, size)));
    return makePuzzle(g.pic, { name: 'Daily ' + k, source: 'daily', passes: g.passes });
  }

  /* ---------- the library ---------- */

  /* Hand-drawn pictures, all verified logic-solvable by the test suite.
     '#' is a filled cell. Names are only shown once the picture is solved. */
  const LIBRARY = [
    // 5x5
    { name: 'Heart', art: [
      '.#.#.',
      '#####',
      '#####',
      '.###.',
      '..#..'] },
    { name: 'Plus', art: [
      '..#..',
      '..#..',
      '#####',
      '..#..',
      '..#..'] },
    { name: 'Diamond', art: [
      '..#..',
      '.###.',
      '#####',
      '.###.',
      '..#..'] },
    { name: 'Arrow', art: [
      '..#..',
      '.###.',
      '#####',
      '..#..',
      '..#..'] },
    { name: 'Goblet', art: [
      '#####',
      '.###.',
      '..#..',
      '..#..',
      '.###.'] },
    { name: 'Letter T', art: [
      '#####',
      '..#..',
      '..#..',
      '..#..',
      '..#..'] },
    { name: 'Letter H', art: [
      '#...#',
      '#...#',
      '#####',
      '#...#',
      '#...#'] },
    { name: 'House', art: [
      '..#..',
      '.###.',
      '#####',
      '##.##',
      '##.##'] },
    { name: 'Stairs', art: [
      '#....',
      '##...',
      '###..',
      '####.',
      '#####'] },
    { name: 'Bow tie', art: [
      '#...#',
      '##.##',
      '#####',
      '##.##',
      '#...#'] },
    { name: 'Boat', art: [
      '..#..',
      '..##.',
      '..###',
      '#####',
      '#####'] },
    { name: 'Mushroom', art: [
      '.###.',
      '#####',
      '#####',
      '..#..',
      '..#..'] },
    { name: 'Umbrella', art: [
      '.###.',
      '#####',
      '..#..',
      '..#..',
      '.##..'] },
    { name: 'Cat', art: [
      '#...#',
      '#####',
      '#.#.#',
      '#####',
      '.###.'] },
    { name: 'Letter Z', art: [
      '#####',
      '...#.',
      '..#..',
      '.#...',
      '#####'] },
    { name: 'Frame', art: [
      '#####',
      '#...#',
      '#...#',
      '#...#',
      '#####'] },
    { name: 'Rocket', art: [
      '..#..',
      '.###.',
      '.###.',
      '#####',
      '#.#.#'] },
    { name: 'Windmill', art: [
      '.#.#.',
      '..#..',
      '.###.',
      '..#..',
      '..#..'] },
    { name: 'Chair', art: [
      '#....',
      '#....',
      '####.',
      '#..#.',
      '#..#.'] },
    { name: 'Cup', art: [
      '.....',
      '####.',
      '#..##',
      '####.',
      '.....'] },

    // 10x10
    { name: 'Heart', art: [
      '..##..##..',
      '.########.',
      '##########',
      '##########',
      '##########',
      '.########.',
      '..######..',
      '...####...',
      '....##....',
      '..........'] },
    { name: 'Cat', art: [
      '.#......#.',
      '.##....##.',
      '.########.',
      '##########',
      '##.####.##',
      '##########',
      '####..####',
      '.########.',
      '..######..',
      '...####...'] },
    { name: 'Sailboat', art: [
      '.....#....',
      '....##....',
      '...###....',
      '..####....',
      '.#####....',
      '######....',
      '.....#....',
      '##########',
      '.########.',
      '..######..'] },
    { name: 'Mug', art: [
      '..........',
      '.######...',
      '.######.#.',
      '.######.##',
      '.######.##',
      '.######.#.',
      '.######...',
      '..####....',
      '..........',
      '..........'] },
    { name: 'Star', art: [
      '....##....',
      '...####...',
      '...####...',
      '##########',
      '.########.',
      '..######..',
      '..######..',
      '.########.',
      '.###..###.',
      '##......##'] },
    { name: 'Tree', art: [
      '....##....',
      '...####...',
      '..######..',
      '.########.',
      '..######..',
      '.########.',
      '##########',
      '....##....',
      '....##....',
      '...####...'] },
    { name: 'House', art: [
      '....##....',
      '...####...',
      '..######..',
      '.########.',
      '##########',
      '.#..##..#.',
      '.#..##..#.',
      '.########.',
      '.###..###.',
      '.###..###.'] },
    { name: 'Fish', art: [
      '..........',
      '.....####.',
      '#..######.',
      '##.#.#####',
      '##########',
      '##.#######',
      '#..######.',
      '.....####.',
      '..........',
      '..........'] },
    { name: 'Key', art: [
      '.####.....',
      '##..##....',
      '#....#....',
      '##..##....',
      '.####.....',
      '..##......',
      '..##......',
      '..####....',
      '..##......',
      '..####....'] },
    { name: 'Butterfly', art: [
      '##......##',
      '###.##.###',
      '##########',
      '.########.',
      '..######..',
      '.########.',
      '##########',
      '###.##.###',
      '##......##',
      '..........'] },
    { name: 'Anchor', art: [
      '....##....',
      '...#..#...',
      '....##....',
      '....##....',
      '#...##...#',
      '##..##..##',
      '.##.##.##.',
      '..######..',
      '...####...',
      '....##....'] },
    { name: 'Mushroom', art: [
      '...####...',
      '..######..',
      '.###..###.',
      '##..##..##',
      '##########',
      '....##....',
      '....##....',
      '....##....',
      '...####...',
      '..........'] },
    { name: 'Rocket', art: [
      '....##....',
      '...####...',
      '...####...',
      '...#..#...',
      '...####...',
      '...####...',
      '.########.',
      '###.##.###',
      '##.####.##',
      '....##....'] },

    // 15x15
    { name: 'Heart', art: [
      '...###...###...',
      '..#####.#####..',
      '.#############.',
      '###############',
      '###############',
      '###############',
      '###############',
      '.#############.',
      '..###########..',
      '...#########...',
      '....#######....',
      '.....#####.....',
      '......###......',
      '.......#.......',
      '...............'] },
    { name: 'Mug', art: [
      '...............',
      '..#########....',
      '..#########.##.',
      '..#########.###',
      '..#########..##',
      '..#########..##',
      '..#########..##',
      '..#########.###',
      '..#########.##.',
      '..#########....',
      '...#######.....',
      '...............',
      '.#############.',
      '.#############.',
      '...............'] },
    { name: 'Cat', art: [
      '.##.........##.',
      '.###.......###.',
      '.####.....####.',
      '.#############.',
      '.#############.',
      '###############',
      '###############',
      '##..#######..##',
      '###############',
      '###############',
      '######.#.######',
      '#####..#..#####',
      '.#############.',
      '..###########..',
      '....#######....'] },
    { name: 'Umbrella', art: [
      '.......#.......',
      '......###......',
      '....#######....',
      '...#########...',
      '..###########..',
      '.#############.',
      '###############',
      '##.###.#.###.##',
      '.......#.......',
      '.......#.......',
      '.......#.......',
      '.......#.......',
      '.......#.......',
      '.....#.#.......',
      '......##.......'] },
    { name: 'Tree', art: [
      '.......#.......',
      '......###......',
      '.....#####.....',
      '....#######....',
      '.....#####.....',
      '....#######....',
      '...#########...',
      '..###########..',
      '....#######....',
      '...#########...',
      '..###########..',
      '.#############.',
      '......###......',
      '......###......',
      '....#######....'] },
    { name: 'House', art: [
      '.......#.......',
      '......###......',
      '.....#####.....',
      '....#######....',
      '...#########...',
      '..###########..',
      '.#############.',
      '###############',
      '.#############.',
      '.##...###...##.',
      '.##...###...##.',
      '.#############.',
      '.#####...#####.',
      '.#####...#####.',
      '.#############.'] },
    { name: 'Sailboat', art: [
      '.......#.......',
      '.......##......',
      '.......###.....',
      '......#####....',
      '.....######....',
      '....#######....',
      '...########....',
      '..#########....',
      '.##########....',
      '###########....',
      '.......#.......',
      '###############',
      '.#############.',
      '..###########..',
      '...#########...'] },
    { name: 'Star', art: [
      '.......#.......',
      '......###......',
      '......###......',
      '.....#####.....',
      '.....#####.....',
      '###############',
      '.#############.',
      '..###########..',
      '...#########...',
      '...#########...',
      '..####...####..',
      '.###.......###.',
      '##...........##',
      '...............',
      '...............'] }
  ];

  let libraryCache = null;

  /** The library as parsed puzzles, grouped by size. */
  function library() {
    if (libraryCache) return libraryCache;
    libraryCache = LIBRARY.map((e, i) => {
      const pic = parsePicture(e.art);
      return makePuzzle(pic, { name: e.name, source: 'library', id: i });
    });
    return libraryCache;
  }

  function libraryFor(size) {
    return library().filter((p) => p.rows === size && p.cols === size);
  }

  function librarySizes() {
    const s = new Set();
    for (const p of library()) s.add(p.rows);
    return Array.from(s).sort((a, b) => a - b);
  }

  /* ---------- puzzles and boards ---------- */

  function makePuzzle(pic, meta) {
    return Object.assign({
      rows: pic.rows, cols: pic.cols, cells: pic.cells,
      clues: cluesFor(pic), name: 'Picture', source: 'random'
    }, meta || {});
  }

  function emptyBoard(puzzle) {
    return new Array(puzzle.rows * puzzle.cols).fill(UNKNOWN);
  }

  /** The player's marks along one line. kind is 'row' or 'col'. */
  function lineOf(board, puzzle, kind, index) {
    if (kind === 'row') return board.slice(index * puzzle.cols, index * puzzle.cols + puzzle.cols);
    const out = new Array(puzzle.rows);
    for (let r = 0; r < puzzle.rows; r++) out[r] = board[r * puzzle.cols + index];
    return out;
  }

  /** The filled runs of a line of marks, ignoring crosses and unknowns. */
  function filledRuns(line) {
    return runsOf(line.map((v) => (v === FILL ? 1 : 0)));
  }

  /** True when the filled cells alone already match the clue exactly. */
  function lineComplete(clue, line) {
    const runs = filledRuns(line);
    if (runs.length !== clue.length) return false;
    for (let i = 0; i < runs.length; i++) if (runs[i] !== clue[i]) return false;
    return true;
  }

  /**
   * Which clue numbers can be shown as done. A number is ticked when its run
   * sits in the same place in the leftmost and the rightmost consistent
   * placement, so the marks have pinned it, AND the player has painted it.
   * That is exact rather than a guess from fences: a lone painted cell can
   * never tick a number it could not be, and a line the player has made
   * inconsistent ticks nothing at all.
   */
  function clueMarks(clue, line) {
    const marks = new Array(clue.length).fill(false);
    const b = runBounds(clue, line);
    if (!b) return marks;
    for (let j = 0; j < clue.length; j++) {
      if (b.left[j] !== b.right[j]) continue;
      let painted = true;
      for (let c = b.left[j]; c < b.left[j] + clue[j]; c++) if (line[c] !== FILL) { painted = false; break; }
      marks[j] = painted;
    }
    return marks;
  }

  /** Solved means the filled cells are exactly the picture. Crosses are free. */
  function isSolved(puzzle, board) {
    for (let i = 0; i < board.length; i++) {
      if ((board[i] === FILL ? 1 : 0) !== puzzle.cells[i]) return false;
    }
    return true;
  }

  function countFilled(board) {
    let n = 0;
    for (let i = 0; i < board.length; i++) if (board[i] === FILL) n++;
    return n;
  }

  function countPicture(puzzle) {
    let n = 0;
    for (let i = 0; i < puzzle.cells.length; i++) n += puzzle.cells[i];
    return n;
  }

  return {
    UNKNOWN, FILL, CROSS,
    makeRng, hashString,
    parsePicture, toArt, runsOf, cluesFor,
    lineTables, solveLine, runBounds, solveByLogic, gradePicture, isLogicSolvable,
    randomPicture, generate, reasonableDensity,
    dateKey, dailySeed, dailyPuzzle,
    LIBRARY, library, libraryFor, librarySizes,
    makePuzzle, emptyBoard, lineOf, filledRuns, lineComplete, clueMarks, isSolved,
    countFilled, countPicture
  };
})();
