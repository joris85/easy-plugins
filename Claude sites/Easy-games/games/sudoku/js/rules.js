'use strict';

/* Easy Sudoku - the rules engine.

   Pure logic: no canvas, no DOM, seeded randomness. Everything here can be
   driven from node, which is how it is tested.

   THREE SOLVERS live in this file, and the game needs all three:

   1. A BACKTRACKING solver. It counts solutions and stops at two, which is the
      uniqueness test the generator runs after every clue it digs out. It also
      builds the full grid the generator starts from.

   2. A HUMAN solver. It only knows named techniques, applied cheapest first:
      naked single, hidden single, pairs, pointing, box-line, triples, X-wing,
      swordfish, XY-wing, simple colouring. The hardest technique it had to use
      IS the puzzle's grade. Clue count is a poor proxy, a 24-clue puzzle can be
      trivial and a 30-clue one can need an X-wing, so nothing here grades by
      counting blanks. The same solver produces the hints, which is why a hint
      can name the technique and the cells rather than just filling something in.

   3. Trial and error, which is not a technique at all. A puzzle the human solver
      cannot finish is graded Evil, and the hint for it says so honestly.

   Grids are flat arrays of 81 digits, 0 for empty, row-major. Candidates are
   bitmasks with bit d set for digit d, so a cell holding only 4 and 8 is
   (1<<4)|(1<<8). Bit 0 is never used. */

const SudokuRules = (function () {

  const ALL = 0x3FE;                        // bits 1..9

  /* ---------- geometry ---------- */

  const ROWS = [], COLS = [], BOXES = [];
  for (let u = 0; u < 9; u++) {
    const row = [], col = [], box = [];
    for (let k = 0; k < 9; k++) {
      row.push(u * 9 + k);
      col.push(k * 9 + u);
      const br = Math.floor(u / 3) * 3, bc = (u % 3) * 3;
      box.push((br + Math.floor(k / 3)) * 9 + bc + (k % 3));
    }
    ROWS.push(row); COLS.push(col); BOXES.push(box);
  }
  const UNITS = ROWS.concat(COLS, BOXES);   // 0-8 rows, 9-17 columns, 18-26 boxes

  const rowOf = (i) => Math.floor(i / 9);
  const colOf = (i) => i % 9;
  const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

  // The twenty cells that share a row, column or box with each cell.
  const PEERS = [];
  for (let i = 0; i < 81; i++) {
    const set = new Set(ROWS[rowOf(i)].concat(COLS[colOf(i)], BOXES[boxOf(i)]));
    set.delete(i);
    PEERS.push(Array.from(set));
  }
  const sees = (a, b) => a !== b && (rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b));

  /* ---------- bit helpers ---------- */

  const bit = (d) => 1 << d;
  function popcount(m) { let n = 0; while (m) { m &= m - 1; n++; } return n; }
  function digitsOf(m) { const out = []; for (let d = 1; d <= 9; d++) if (m & bit(d)) out.push(d); return out; }
  const lowDigit = (m) => { for (let d = 1; d <= 9; d++) if (m & bit(d)) return d; return 0; };

  /* ---------- seeded randomness ---------- */

  /** mulberry32. Small, fast, and good enough to shuffle a Sudoku. */
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffled(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** FNV-1a, so a date string turns into a stable 32-bit seed. */
  function hashString(s) {
    let h = 0x811C9DC5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /* ---------- the backtracking solver ---------- */

  /**
   * Depth-first search with the most-constrained cell first. Stops after
   * `limit` solutions, so uniqueness is a call with limit 2. With an rng the
   * digit order is shuffled, which is how a fresh full grid is built. Returns
   * { count, solution } where solution is the first one found.
   */
  function search(grid, limit, rng) {
    const g = grid.slice();
    const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
    for (let i = 0; i < 81; i++) {
      const d = g[i];
      if (!d) continue;
      const b = bit(d);
      // Two equal givens in one unit: no solutions, and not worth searching for.
      if ((rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]) & b) return { count: 0, solution: null };
      rows[rowOf(i)] |= b; cols[colOf(i)] |= b; boxes[boxOf(i)] |= b;
    }
    let count = 0, solution = null;

    function rec() {
      let best = -1, bestMask = 0, bestN = 10;
      for (let i = 0; i < 81; i++) {
        if (g[i]) continue;
        const m = ALL & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]);
        const n = popcount(m);
        if (n === 0) return;                 // dead end
        if (n < bestN) { best = i; bestMask = m; bestN = n; if (n === 1) break; }
      }
      if (best < 0) { count++; if (!solution) solution = g.slice(); return; }
      const r = rowOf(best), c = colOf(best), bx = boxOf(best);
      let order = digitsOf(bestMask);
      if (rng) order = shuffled(order, rng);
      for (const d of order) {
        const b = bit(d);
        g[best] = d; rows[r] |= b; cols[c] |= b; boxes[bx] |= b;
        rec();
        g[best] = 0; rows[r] &= ~b; cols[c] &= ~b; boxes[bx] &= ~b;
        if (count >= limit) return;
      }
    }
    rec();
    return { count, solution };
  }

  const solve = (grid) => search(grid, 1).solution;
  const countSolutions = (grid, limit) => search(grid, limit || 2).count;
  const fullGrid = (rng) => search(new Array(81).fill(0), 1, rng).solution;

  /* ---------- plain grid helpers ---------- */

  /** Candidate mask per cell from the placed digits alone. Filled cells get 0. */
  function candidates(grid) {
    const out = new Array(81).fill(0);
    for (let i = 0; i < 81; i++) {
      if (grid[i]) continue;
      let used = 0;
      for (const p of PEERS[i]) if (grid[p]) used |= bit(grid[p]);
      out[i] = ALL & ~used;
    }
    return out;
  }

  /** True for every cell whose digit also appears in one of its peers. */
  function conflicts(grid) {
    const out = new Array(81).fill(false);
    for (let i = 0; i < 81; i++) {
      if (!grid[i]) continue;
      for (const p of PEERS[i]) if (grid[p] === grid[i]) { out[i] = true; break; }
    }
    return out;
  }

  /** Cells filled with something other than the solution. */
  function mistakes(grid, solution) {
    const out = [];
    for (let i = 0; i < 81; i++) if (grid[i] && grid[i] !== solution[i]) out.push(i);
    return out;
  }

  function isComplete(grid) { for (let i = 0; i < 81; i++) if (!grid[i]) return false; return true; }

  function isSolved(grid, solution) {
    for (let i = 0; i < 81; i++) if (grid[i] !== solution[i]) return false;
    return true;
  }

  /** Placing d at cell i removes d from every peer's pencil marks. */
  function pruneNotes(notes, i, d) {
    for (const p of PEERS[i]) notes[p] &= ~bit(d);
    notes[i] = 0;
    return notes;
  }

  /* ---------- the human solver ---------- */

  const TECHNIQUES = [
    null,
    { name: 'Naked single',      grade: 'easy' },     // 1
    { name: 'Hidden single',     grade: 'easy' },     // 2
    { name: 'Naked pair',        grade: 'medium' },   // 3
    { name: 'Hidden pair',       grade: 'medium' },   // 4
    { name: 'Pointing pair',     grade: 'medium' },   // 5
    { name: 'Box-line reduction', grade: 'medium' },  // 6
    { name: 'Naked triple',      grade: 'hard' },     // 7
    { name: 'Hidden triple',     grade: 'hard' },     // 8
    { name: 'X-wing',            grade: 'hard' },     // 9
    { name: 'Swordfish',         grade: 'expert' },   // 10
    { name: 'XY-wing',           grade: 'expert' },   // 11
    { name: 'Simple colouring',  grade: 'expert' },   // 12
    { name: 'Trial and error',   grade: 'evil' }      // 13
  ];
  const GRADES = ['easy', 'medium', 'hard', 'expert', 'evil'];
  const GRADE_CAP = { easy: 2, medium: 6, hard: 9, expert: 12, evil: 13 };
  const GRADE_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert', evil: 'Evil' };

  const cellName = (i) => 'R' + (rowOf(i) + 1) + 'C' + (colOf(i) + 1);
  const unitName = (u) => (u < 9 ? 'row ' + (u + 1) : u < 18 ? 'column ' + (u - 8) : 'box ' + (u - 17));
  const listNames = (cells) => cells.map(cellName).join(', ');
  const listDigits = (ds) => ds.length === 2 ? ds[0] + ' and ' + ds[1] : ds.slice(0, -1).join(', ') + ' and ' + ds[ds.length - 1];

  /** A working state: the grid plus a live candidate mask for every empty cell. */
  function makeState(grid) {
    const st = { grid: grid.slice(), cand: candidates(grid), filled: 0 };
    for (let i = 0; i < 81; i++) {
      if (st.grid[i]) st.filled++;
      else if (!st.cand[i]) return null;      // an empty cell with nothing left: broken puzzle
    }
    // A duplicated given is just as broken, and candidates() cannot see it.
    const bad = conflicts(grid);
    for (let i = 0; i < 81; i++) if (bad[i]) return null;
    return st;
  }

  function place(st, i, d) {
    st.grid[i] = d;
    st.cand[i] = 0;
    st.filled++;
    const b = bit(d);
    for (const p of PEERS[i]) st.cand[p] &= ~b;
  }

  function applyStep(st, step) {
    if (step.place) { place(st, step.place.cell, step.place.digit); return; }
    for (const e of step.elims) st.cand[e.cell] &= ~bit(e.digit);
  }

  /** Eliminations of digit d from `cells`, only where d is actually a candidate. */
  function elimsOf(st, cells, d, skip) {
    const out = [];
    for (const c of cells) {
      if (skip && skip.indexOf(c) !== -1) continue;
      if (st.cand[c] & bit(d)) out.push({ cell: c, digit: d });
    }
    return out;
  }

  /** Eliminate every digit in `mask` from `cells`. */
  function elimsOfMask(st, cells, mask, skip) {
    const out = [];
    for (const d of digitsOf(mask)) out.push.apply(out, elimsOf(st, cells, d, skip));
    return out;
  }

  const step = (tier, cells, extra) => Object.assign({ tier, name: TECHNIQUES[tier].name, cells, place: null, elims: [] }, extra);

  /* Each finder returns the first step it can prove, or null. They are tried
     in order, so a step from finder N means nothing cheaper applied. */

  function nakedSingle(st) {
    for (let i = 0; i < 81; i++) {
      if (st.grid[i] || popcount(st.cand[i]) !== 1) continue;
      const d = lowDigit(st.cand[i]);
      return step(1, [i], { place: { cell: i, digit: d },
        text: cellName(i) + ' has only one candidate left, ' + d + '.' });
    }
    return null;
  }

  function hiddenSingle(st) {
    for (let u = 0; u < 27; u++) {
      const unit = UNITS[u];
      for (let d = 1; d <= 9; d++) {
        let where = -1, n = 0, placed = false;
        for (const c of unit) {
          if (st.grid[c] === d) { placed = true; break; }
          if (st.cand[c] & bit(d)) { n++; where = c; }
        }
        if (placed) continue;
        if (n === 0) return null;                  // the digit has nowhere to go: broken
        if (n === 1) {
          return step(2, [where], { place: { cell: where, digit: d },
            text: 'In ' + unitName(u) + ' the ' + d + ' can only go in ' + cellName(where) + '.' });
        }
      }
    }
    return null;
  }

  /** Naked subsets of size n: n cells whose candidates together cover only n digits. */
  function nakedSubset(st, n, tier) {
    for (let u = 0; u < 27; u++) {
      const cells = UNITS[u].filter((c) => !st.grid[c] && popcount(st.cand[c]) >= 2 && popcount(st.cand[c]) <= n);
      if (cells.length < n) continue;
      const found = combos(cells, n, (set) => {
        let union = 0;
        for (const c of set) union |= st.cand[c];
        if (popcount(union) !== n) return null;
        const elims = elimsOfMask(st, UNITS[u], union, set);
        if (!elims.length) return null;
        return step(tier, set, { elims, digits: digitsOf(union),
          text: listNames(set) + ' in ' + unitName(u) + ' hold only ' + listDigits(digitsOf(union)) +
                ' between them, so those digits leave the rest of the ' + unitName(u).split(' ')[0] + '.' });
      });
      if (found) return found;
    }
    return null;
  }

  /** Hidden subsets of size n: n digits confined to the same n cells of a unit. */
  function hiddenSubset(st, n, tier) {
    for (let u = 0; u < 27; u++) {
      const unit = UNITS[u];
      const spots = [];                            // per digit, the cells that can take it
      const digits = [];
      for (let d = 1; d <= 9; d++) {
        const where = unit.filter((c) => st.cand[c] & bit(d));
        if (where.length >= 2 && where.length <= n) { spots[d] = where; digits.push(d); }
      }
      if (digits.length < n) continue;
      const found = combos(digits, n, (set) => {
        const cells = new Set();
        for (const d of set) for (const c of spots[d]) cells.add(c);
        if (cells.size !== n) return null;
        let keep = 0;
        for (const d of set) keep |= bit(d);
        const list = Array.from(cells);
        const elims = elimsOfMask(st, list, ALL & ~keep);
        if (!elims.length) return null;
        return step(tier, list, { elims, digits: set.slice(),
          text: 'In ' + unitName(u) + ' the digits ' + listDigits(set) + ' fit only in ' + listNames(list) +
                ', so nothing else can live there.' });
      });
      if (found) return found;
    }
    return null;
  }

  /** Every d in a box on one line: d leaves the rest of that line. */
  function pointing(st) {
    for (let b = 0; b < 9; b++) {
      for (let d = 1; d <= 9; d++) {
        const where = BOXES[b].filter((c) => st.cand[c] & bit(d));
        if (where.length < 2) continue;
        const r = rowOf(where[0]), c0 = colOf(where[0]);
        if (where.every((c) => rowOf(c) === r)) {
          const elims = elimsOf(st, ROWS[r], d, where);
          if (elims.length) return step(5, where, { elims, digits: [d],
            text: 'In box ' + (b + 1) + ' every ' + d + ' sits in row ' + (r + 1) + ', so ' + d + ' leaves the rest of that row.' });
        }
        if (where.every((c) => colOf(c) === c0)) {
          const elims = elimsOf(st, COLS[c0], d, where);
          if (elims.length) return step(5, where, { elims, digits: [d],
            text: 'In box ' + (b + 1) + ' every ' + d + ' sits in column ' + (c0 + 1) + ', so ' + d + ' leaves the rest of that column.' });
        }
      }
    }
    return null;
  }

  /** Every d on a line inside one box: d leaves the rest of that box. */
  function boxLine(st) {
    for (let u = 0; u < 18; u++) {
      for (let d = 1; d <= 9; d++) {
        const where = UNITS[u].filter((c) => st.cand[c] & bit(d));
        if (where.length < 2) continue;
        const b = boxOf(where[0]);
        if (!where.every((c) => boxOf(c) === b)) continue;
        const elims = elimsOf(st, BOXES[b], d, where);
        if (elims.length) return step(6, where, { elims, digits: [d],
          text: 'Every ' + d + ' in ' + unitName(u) + ' sits in box ' + (b + 1) + ', so ' + d + ' leaves the rest of that box.' });
      }
    }
    return null;
  }

  /**
   * Basic fish of size n on digit d: n rows whose d-candidates together cover
   * only n columns pin d to those crossings, so d leaves the columns elsewhere.
   * Then the same with rows and columns swapped. n=2 is X-wing, n=3 swordfish.
   */
  function fish(st, n, tier) {
    const label = n === 2 ? 'X-wing' : 'Swordfish';
    for (let d = 1; d <= 9; d++) {
      for (let pass = 0; pass < 2; pass++) {
        const lines = pass === 0 ? ROWS : COLS;
        const cross = pass === 0 ? COLS : ROWS;
        const crossIdx = pass === 0 ? colOf : rowOf;
        const lineIdx = pass === 0 ? rowOf : colOf;
        const usable = [];
        for (let l = 0; l < 9; l++) {
          const where = lines[l].filter((c) => st.cand[c] & bit(d));
          if (where.length >= 2 && where.length <= n) usable.push({ l, where });
        }
        if (usable.length < n) continue;
        const found = combos(usable, n, (set) => {
          let cover = 0;
          for (const s of set) for (const c of s.where) cover |= 1 << crossIdx(c);
          if (popcount(cover) !== n) return null;
          const lineSet = set.map((s) => s.l);
          const cells = [];
          for (const s of set) cells.push.apply(cells, s.where);
          const elims = [];
          for (let k = 0; k < 9; k++) {
            if (!(cover & (1 << k))) continue;
            for (const c of cross[k]) {
              if (lineSet.indexOf(lineIdx(c)) !== -1) continue;
              if (st.cand[c] & bit(d)) elims.push({ cell: c, digit: d });
            }
          }
          if (!elims.length) return null;
          const lineWord = pass === 0 ? 'rows' : 'columns', crossWord = pass === 0 ? 'columns' : 'rows';
          const ks = []; for (let k = 0; k < 9; k++) if (cover & (1 << k)) ks.push(k + 1);
          return step(tier, cells, { elims, digits: [d],
            text: label + ' on ' + d + ': in ' + lineWord + ' ' + listDigits(lineSet.map((l) => l + 1)) +
                  ' it sits only in ' + crossWord + ' ' + listDigits(ks) + ', so ' + d + ' leaves those ' + crossWord + ' elsewhere.' });
        });
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * A pivot holding XY, one pincer holding XZ and another holding YZ, both seen
   * by the pivot. Whichever way the pivot goes, one pincer is Z, so any cell that
   * sees both pincers cannot be Z.
   */
  function xyWing(st) {
    const bivalue = [];
    for (let i = 0; i < 81; i++) if (!st.grid[i] && popcount(st.cand[i]) === 2) bivalue.push(i);
    for (const p of bivalue) {
      const pm = st.cand[p];
      const wings = bivalue.filter((w) => sees(p, w) && popcount(st.cand[w] & pm) === 1);
      for (let a = 0; a < wings.length; a++) {
        for (let b = a + 1; b < wings.length; b++) {
          const A = wings[a], B = wings[b];
          const am = st.cand[A], bm = st.cand[B];
          if ((am & pm) === (bm & pm)) continue;           // both hang off the same pivot digit
          const z = am & bm & ~pm;
          if (!z || popcount(z) !== 1) continue;
          const d = lowDigit(z);
          const elims = [];
          for (let c = 0; c < 81; c++) {
            if (c === A || c === B || c === p || st.grid[c]) continue;
            if (sees(c, A) && sees(c, B) && (st.cand[c] & z)) elims.push({ cell: c, digit: d });
          }
          if (elims.length) return step(11, [p, A, B], { elims, digits: [d],
            text: 'XY-wing: ' + cellName(p) + ' holds ' + listDigits(digitsOf(pm)) + ' and sees ' + cellName(A) + ' and ' +
                  cellName(B) + '. Either way one of them is ' + d + ', so ' + d + ' leaves every cell that sees both.' });
        }
      }
    }
    return null;
  }

  /**
   * Simple colouring on one digit. Wherever a unit has exactly two places for
   * d, one of them is d, so those two cells get opposite colours. Follow the
   * chain: if two cells of one colour see each other, that colour is false
   * everywhere; and a cell that sees both colours cannot be d.
   */
  function colouring(st) {
    for (let d = 1; d <= 9; d++) {
      const b = bit(d);
      const links = new Map();                       // cell -> conjugate partners
      for (const unit of UNITS) {
        const where = unit.filter((c) => st.cand[c] & b);
        if (where.length !== 2) continue;
        for (const c of where) { if (!links.has(c)) links.set(c, []); }
        links.get(where[0]).push(where[1]);
        links.get(where[1]).push(where[0]);
      }
      const colour = new Map();
      for (const start of links.keys()) {
        if (colour.has(start)) continue;
        // Two-colour this component.
        const comp = [];
        colour.set(start, 0);
        const queue = [start];
        while (queue.length) {
          const c = queue.shift();
          comp.push(c);
          for (const n of links.get(c)) {
            if (!colour.has(n)) { colour.set(n, 1 - colour.get(c)); queue.push(n); }
          }
        }
        if (comp.length < 4) continue;              // a single link proves nothing new
        const side = [comp.filter((c) => colour.get(c) === 0), comp.filter((c) => colour.get(c) === 1)];

        // Rule 2: a colour that sees itself is false.
        for (let k = 0; k < 2; k++) {
          const cells = side[k];
          let clash = null;
          outer: for (let x = 0; x < cells.length; x++) {
            for (let y = x + 1; y < cells.length; y++) {
              if (sees(cells[x], cells[y])) { clash = [cells[x], cells[y]]; break outer; }
            }
          }
          if (clash) {
            return step(12, comp, { elims: cells.map((c) => ({ cell: c, digit: d })), digits: [d],
              text: 'Simple colouring on ' + d + ': along the chain from ' + cellName(start) + ', ' + cellName(clash[0]) +
                    ' and ' + cellName(clash[1]) + ' get the same colour yet see each other, so that whole colour is false.' });
          }
        }
        // Rule 4: a cell seeing both colours cannot be d.
        const elims = [];
        for (let c = 0; c < 81; c++) {
          if (st.grid[c] || !(st.cand[c] & b) || colour.has(c)) continue;
          if (side[0].some((x) => sees(c, x)) && side[1].some((x) => sees(c, x))) elims.push({ cell: c, digit: d });
        }
        if (elims.length) {
          return step(12, comp, { elims, digits: [d],
            text: 'Simple colouring on ' + d + ': follow the chain from ' + cellName(start) + ' and ' +
                  listNames(elims.map((e) => e.cell)) + ' can see both colours, so ' + d + ' cannot go there.' });
        }
      }
    }
    return null;
  }

  /** Call fn on every n-combination of arr until it returns something. */
  function combos(arr, n, fn) {
    const idx = [];
    const rec = (start) => {
      if (idx.length === n) return fn(idx.map((k) => arr[k]));
      for (let k = start; k <= arr.length - (n - idx.length); k++) {
        idx.push(k);
        const r = rec(k + 1);
        idx.pop();
        if (r) return r;
      }
      return null;
    };
    return rec(0);
  }

  const FINDERS = [
    null,
    nakedSingle,
    hiddenSingle,
    (st) => nakedSubset(st, 2, 3),
    (st) => hiddenSubset(st, 2, 4),
    pointing,
    boxLine,
    (st) => nakedSubset(st, 3, 7),
    (st) => hiddenSubset(st, 3, 8),
    (st) => fish(st, 2, 9),
    (st) => fish(st, 3, 10),
    xyWing,
    colouring
  ];

  /** The cheapest step that applies right now, up to tier `cap`. */
  function findStep(st, cap) {
    const top = Math.min(cap || 12, 12);
    for (let t = 1; t <= top; t++) {
      const s = FINDERS[t](st);
      if (s) return s;
    }
    return null;
  }

  /**
   * Solve with named techniques only. Returns { solved, hardest, used, steps }
   * where hardest is the highest tier that was needed. A puzzle the techniques
   * cannot finish comes back unsolved with hardest 13, trial and error.
   */
  function solveLogically(grid, cap) {
    const st = makeState(grid);
    if (!st) return { solved: false, hardest: 13, used: [], steps: 0, invalid: true };
    let hardest = 0, steps = 0;
    const used = new Set();
    while (st.filled < 81) {
      const s = findStep(st, cap);
      if (!s) return { solved: false, hardest: 13, used: Array.from(used), steps, grid: st.grid };
      applyStep(st, s);
      steps++;
      used.add(s.tier);
      if (s.tier > hardest) hardest = s.tier;
    }
    return { solved: true, hardest, used: Array.from(used).sort((a, b) => a - b), steps, grid: st.grid };
  }

  const gradeOfTier = (t) => TECHNIQUES[Math.max(1, Math.min(13, t))].grade;

  /** { grade, hardest, technique, unique, clues } for any puzzle. */
  function gradePuzzle(puzzle) {
    const unique = countSolutions(puzzle, 2) === 1;
    let clues = 0;
    for (let i = 0; i < 81; i++) if (puzzle[i]) clues++;
    if (!unique) return { grade: null, hardest: 0, technique: null, unique: false, clues };
    const res = solveLogically(puzzle, 12);
    const hardest = res.solved ? res.hardest : 13;
    return { grade: gradeOfTier(hardest), hardest, technique: TECHNIQUES[hardest].name, unique: true, clues, used: res.used };
  }

  /* ---------- the generator ---------- */

  /**
   * Dig clues out of a full grid in random order. A removal stands only if the
   * puzzle can still be solved within `cap`: for a graded target that means the
   * human solver finishes it using nothing harder than the cap (which also
   * proves uniqueness, every step was forced), and for Evil it means the
   * counting solver finds exactly one solution. One pass is enough: once a clue
   * has refused to go, removing others only makes it harder to remove.
   */
  function dig(full, rng, cap) {
    const g = full.slice();
    for (const i of shuffled(ORDER, rng)) {
      const keep = g[i];
      g[i] = 0;
      const ok = cap >= 13 ? countSolutions(g, 2) === 1 : solveLogically(g, cap).solved;
      if (!ok) g[i] = keep;
    }
    return g;
  }
  const ORDER = []; for (let i = 0; i < 81; i++) ORDER.push(i);

  /**
   * A puzzle whose grade is exactly `grade`, from a seed. Deterministic: the
   * same seed and grade always give the same puzzle, which is what makes a
   * daily puzzle possible without a server. Digging with the cap makes the
   * result at most the target grade; it is regenerated until it is exactly
   * that grade, so a request for Hard never hands back a Medium.
   */
  function generate(grade, seed, opts) {
    const o = opts || {};
    const maxAttempts = o.maxAttempts || 200;
    const rng = makeRng(seed == null ? (Math.random() * 4294967296) >>> 0 : seed);
    const cap = GRADE_CAP[grade] || 6;
    let fallback = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const full = fullGrid(rng);
      const puzzle = dig(full, rng, cap);
      const g = gradePuzzle(puzzle);
      const out = { puzzle, solution: full, grade: g.grade, hardest: g.hardest, technique: g.technique, clues: g.clues, attempts: attempt };
      if (g.grade === grade) return out;
      // Keep the closest miss, so a pathological seed still returns a real puzzle.
      if (!fallback || Math.abs(GRADES.indexOf(g.grade) - GRADES.indexOf(grade)) <
                       Math.abs(GRADES.indexOf(fallback.grade) - GRADES.indexOf(grade))) fallback = out;
    }
    fallback.fellBack = true;
    return fallback;
  }

  /* ---------- daily ---------- */

  /** 'YYYY-MM-DD' in local time, so the puzzle changes at the player's midnight. */
  function todayKey(date) {
    const d = date || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /**
   * The week climbs like a crossword: Monday is Easy, Sunday is Evil. Both the
   * grade and the seed come from the date string alone, so every player who
   * opens the daily gets the same puzzle.
   */
  function dailyGrade(key) {
    const parts = key.split('-').map(Number);
    const day = new Date(parts[0], parts[1] - 1, parts[2]).getDay();      // 0 Sunday
    return ['evil', 'easy', 'medium', 'medium', 'hard', 'hard', 'expert'][day];
  }

  function daily(key) {
    const k = key || todayKey();
    const out = generate(dailyGrade(k), hashString('easy-sudoku:' + k));
    out.date = k;
    return out;
  }

  /* ---------- hints ---------- */

  /**
   * The next thing a human could prove from this position. `killed` is an
   * optional mask per cell of candidates already crossed out by earlier hints,
   * so a hint is never repeated. Mistakes come first: a wrong digit, or a
   * crossed-out mark that was actually the answer, poisons every deduction
   * after it, so the hint points at that instead.
   */
  function hint(grid, solution, killed) {
    const wrong = mistakes(grid, solution);
    if (wrong.length) {
      const i = wrong[0];
      return { tier: 0, name: 'Mistake', cells: [i], place: null, elims: [], mistake: i,
               text: cellName(i) + ' is wrong. Clear it before going on.' };
    }
    if (killed) {
      for (let i = 0; i < 81; i++) {
        if (!grid[i] && (killed[i] & bit(solution[i]))) {
          return { tier: 0, name: 'Mistake', cells: [i], place: null, elims: [], mistake: i, revive: solution[i],
                   text: 'The ' + solution[i] + ' you crossed out at ' + cellName(i) + ' is actually the answer there.' };
        }
      }
    }
    const st = makeState(grid);
    if (!st) return null;
    if (killed) for (let i = 0; i < 81; i++) st.cand[i] &= ~killed[i];
    const s = findStep(st, 12);
    if (s) return s;
    if (st.filled === 81) return null;
    // Nothing named applies. Point at the tightest cell and admit it.
    let best = -1, bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (st.grid[i]) continue;
      const n = popcount(st.cand[i]);
      if (n < bestN) { best = i; bestN = n; }
    }
    return step(13, [best], { place: { cell: best, digit: solution[best] }, trial: true,
      text: 'No named technique applies here. ' + cellName(best) + ' has only ' + bestN +
            ' candidates, ' + listDigits(digitsOf(st.cand[best])) + '. Try one and follow it to a contradiction.' });
  }

  /* ---------- text helpers ---------- */

  function fromString(s) {
    const out = [];
    for (let i = 0; i < s.length && out.length < 81; i++) {
      const ch = s[i];
      if (ch >= '1' && ch <= '9') out.push(+ch);
      else if (ch === '0' || ch === '.') out.push(0);
    }
    while (out.length < 81) out.push(0);
    return out;
  }
  const toString = (g) => g.map((d) => d || '.').join('');

  return {
    ALL, ROWS, COLS, BOXES, UNITS, PEERS, TECHNIQUES, GRADES, GRADE_CAP, GRADE_LABEL,
    rowOf, colOf, boxOf, sees, bit, popcount, digitsOf, cellName, unitName,
    makeRng, hashString, shuffled,
    search, solve, countSolutions, fullGrid,
    candidates, conflicts, mistakes, isComplete, isSolved, pruneNotes,
    makeState, place, applyStep, findStep, solveLogically, gradePuzzle, gradeOfTier,
    finders: { nakedSingle, hiddenSingle, nakedSubset, hiddenSubset, pointing, boxLine, fish, xyWing, colouring },
    dig, generate, todayKey, dailyGrade, daily, hint,
    fromString, toString
  };
})();
