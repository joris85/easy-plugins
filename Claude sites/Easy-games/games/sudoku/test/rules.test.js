'use strict';

/* Easy Sudoku - the rules engine test suite.
 *
 *   node games/sudoku/test/rules.test.js
 *
 * The engine is pure: no canvas, no DOM, seeded randomness. Every solver,
 * the generator, the grader and the hints are checked here, against known
 * puzzles and against hand-built candidate states that isolate one technique
 * at a time. Exits non-zero on any failure, and prints generator timings
 * because the generator's speed is part of the contract.
 */
const fs = require('fs');
// rules.js is a plain script, not a module: it declares `const SudokuRules = ...`,
// so it has to be evaluated in the global scope and then hoisted out.
(0, eval)(fs.readFileSync(require('path').join(__dirname, '..', 'js', 'rules.js'), 'utf8')
          + '\n;globalThis.SudokuRules = SudokuRules;');
const R = globalThis.SudokuRules;
const b = R.bit;

let pass = 0, fail = 0;
const check = (n, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log('  FAIL ' + n + '\n    got  ' + JSON.stringify(got) + '\n    want ' + JSON.stringify(want)); }
};
const ok = (n, c, d) => { if (c) pass++; else { fail++; console.log('  FAIL ' + n + (d ? '  ' + d : '')); } };

/* Known puzzles. The first is the Wikipedia example. The second is one of
   Gordon Royle's 17-clue puzzles, the proven minimum clue count. The X-wing
   example is the SudokuWiki one. The last two are Inkala's 2012 "hardest"
   and AI Escargot, both beyond every named technique here. */
const P = {
  wiki: '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79',
  wikiSolution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  clue17: '000000010400000000020000000000050407008000300001090000300400200050100000000806000',
  xwing: '1.....569492.561.8.561.924...964.8.1.64.1....218.356.4.4.5...169.5.614.2621.....5',
  inkala: '8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..',
  escargot: '1....7.9..3..2...8..96..5....53..9...1..8...26....4...3......1..4......7..7...3..'
};

/** A full grid is valid when every unit holds 1..9 exactly once. */
function validFull(g) {
  if (!g || g.length !== 81) return false;
  for (const unit of R.UNITS) {
    let m = 0;
    for (const c of unit) { if (!g[c]) return false; m |= b(g[c]); }
    if (m !== R.ALL) return false;
  }
  return true;
}

/** A blank working state with every candidate open, for hand-built cases. */
function blank() {
  return { grid: new Array(81).fill(0), cand: new Array(81).fill(R.ALL), filled: 0 };
}
const idx = (r, c) => (r - 1) * 9 + (c - 1);       // 1-based, like the hint text
const mask = (...ds) => ds.reduce((m, d) => m | b(d), 0);

console.log('\n== geometry ==');
{
  check('R5C5 is in box 5', R.boxOf(idx(5, 5)), 4);
  check('every cell has twenty peers', R.PEERS.every((p) => p.length === 20), true);
  ok('R1C1 sees R1C9, R9C1 and R3C3', R.sees(0, 8) && R.sees(0, 72) && R.sees(0, 20));
  ok('R1C1 does not see R4C4', !R.sees(0, 30));
  check('round trip through the string form', R.toString(R.fromString(P.wiki)), P.wiki);
}

console.log('\n== backtracking solver ==');
{
  const g = R.fromString(P.wiki);
  check('solves the Wikipedia puzzle', R.toString(R.solve(g)), P.wikiSolution);
  const s17 = R.solve(R.fromString(P.clue17));
  ok('solves a 17-clue puzzle to a valid grid', validFull(s17));
  const p17 = R.fromString(P.clue17);
  ok('and the solution keeps every clue', p17.every((d, i) => !d || d === s17[i]));
  const broken = R.fromString(P.wiki); broken[1] = 5;      // two fives in row 1
  check('a duplicated given has no solution', R.countSolutions(broken, 2), 0);
  const stuck = R.fromString(P.wiki); stuck[2] = 1;        // legal locally, but the answer is 4
  check('a wrong but locally legal entry has no solution', R.countSolutions(stuck, 2), 0);
}

console.log('\n== uniqueness counting ==');
{
  check('the Wikipedia puzzle is unique', R.countSolutions(R.fromString(P.wiki), 2), 1);
  check('the 17-clue puzzle is unique', R.countSolutions(R.fromString(P.clue17), 2), 1);
  check('an empty grid stops counting at the limit', R.countSolutions(new Array(81).fill(0), 2), 2);
  check('and honours a higher limit', R.countSolutions(new Array(81).fill(0), 5), 5);
  // Removing a clue from a 17-clue puzzle must break uniqueness: there is no 16.
  const p = R.fromString(P.clue17);
  const first = p.findIndex((d) => d);
  p[first] = 0;
  ok('a 16-clue puzzle is never unique (McGuire 2012)', R.countSolutions(p, 2) >= 2);
  const rng = R.makeRng(5);
  const full = R.fullGrid(rng);
  ok('fullGrid builds a valid complete grid', validFull(full));
  check('a full grid has exactly one solution', R.countSolutions(full, 2), 1);
  ok('two seeds give two different grids', R.toString(R.fullGrid(R.makeRng(1))) !== R.toString(R.fullGrid(R.makeRng(2))));
  check('the same seed gives the same grid', R.toString(R.fullGrid(R.makeRng(9))), R.toString(R.fullGrid(R.makeRng(9))));
}

console.log('\n== grid helpers ==');
{
  const g = R.fromString(P.wiki);
  const cand = R.candidates(g);
  check('a given has no candidates', cand[0], 0);
  check('R1C3 can only be 1, 2 or 4', R.digitsOf(cand[2]), [1, 2, 4]);
  g[2] = 5;
  const bad = R.conflicts(g);
  ok('a duplicate flags both cells', bad[2] && bad[0]);
  ok('and nothing else in that row', !bad[4]);
  check('mistakes are measured against the solution', R.mistakes(g, R.fromString(P.wikiSolution)), [2]);
  const notes = new Array(81).fill(mask(3, 4));
  R.pruneNotes(notes, idx(1, 1), 4);
  check('placing 4 clears it from peers', R.digitsOf(notes[idx(1, 9)]), [3]);
  check('and clears the cell itself', notes[0], 0);
  check('but leaves a non-peer alone', R.digitsOf(notes[idx(4, 4)]), [3, 4]);
}

console.log('\n== technique finders on hand-built states ==');
{
  const st = blank();
  st.cand[idx(3, 3)] = mask(5);
  const s = R.finders.nakedSingle(st);
  check('naked single places the lone candidate', s && s.place, { cell: idx(3, 3), digit: 5 });
  check('and says so', s.text, 'R3C3 has only one candidate left, 5.');
}
{
  const st = blank();
  for (let c = 2; c <= 9; c++) st.cand[idx(1, c)] = mask(2, 3);
  st.cand[idx(1, 1)] = mask(1, 2);
  const s = R.finders.hiddenSingle(st);
  check('hidden single: 1 has one home in row 1', s && s.place, { cell: idx(1, 1), digit: 1 });
  check('named as a hidden single', s.tier, 2);
}
{
  const st = blank();
  st.cand[idx(1, 1)] = mask(4, 8);
  st.cand[idx(1, 2)] = mask(4, 8);
  st.cand[idx(1, 3)] = mask(4, 5, 6);
  for (let c = 4; c <= 9; c++) st.cand[idx(1, c)] = mask(1, 2, 3);
  const s = R.finders.nakedSubset(st, 2, 3);
  check('naked pair removes 4 from the third cell', s && s.elims, [{ cell: idx(1, 3), digit: 4 }]);
  check('pointing at the pair', s.cells, [idx(1, 1), idx(1, 2)]);
}
{
  const st = blank();
  st.cand[idx(1, 1)] = mask(1, 2, 7, 8);
  st.cand[idx(1, 2)] = mask(1, 2, 7, 8);
  for (let c = 3; c <= 9; c++) st.cand[idx(1, c)] = mask(3, 4, 5, 6, 7, 8, 9);
  const s = R.finders.hiddenSubset(st, 2, 4);
  ok('hidden pair keeps only 1 and 2 in the two cells', s && s.elims.length === 4 &&
     s.elims.every((e) => (e.digit === 7 || e.digit === 8) && (e.cell === idx(1, 1) || e.cell === idx(1, 2))),
     JSON.stringify(s && s.elims));
}
{
  const st = blank();
  // In box 1, the 5 only fits on row 1; a 5 elsewhere on row 1 must go.
  for (const i of R.BOXES[0]) st.cand[i] &= ~b(5);
  st.cand[idx(1, 1)] |= b(5); st.cand[idx(1, 2)] |= b(5);
  const s = R.finders.pointing(st);
  ok('pointing pair removes 5 from the rest of row 1', s && s.elims.length === 6 &&
     s.elims.every((e) => e.digit === 5 && R.rowOf(e.cell) === 0 && R.colOf(e.cell) >= 3), JSON.stringify(s && s.elims));
}
{
  const st = blank();
  // In row 1, the 6 only fits inside box 1; a 6 elsewhere in box 1 must go.
  for (const i of R.ROWS[0]) st.cand[i] &= ~b(6);
  st.cand[idx(1, 1)] |= b(6); st.cand[idx(1, 3)] |= b(6);
  const s = R.finders.boxLine(st);
  ok('box-line reduction removes 6 from the rest of box 1', s && s.elims.length === 6 &&
     s.elims.every((e) => e.digit === 6 && R.boxOf(e.cell) === 0 && R.rowOf(e.cell) > 0), JSON.stringify(s && s.elims));
  check('named box-line reduction', s.name, 'Box-line reduction');
}
{
  const st = blank();
  st.cand[idx(1, 1)] = mask(1, 2);
  st.cand[idx(1, 2)] = mask(2, 3);
  st.cand[idx(1, 3)] = mask(1, 3);
  st.cand[idx(1, 5)] = mask(1, 9);
  for (const c of [4, 6, 7, 8, 9]) if (c !== 5) st.cand[idx(1, c)] = mask(4, 5, 6, 7, 8, 9);
  const s = R.finders.nakedSubset(st, 3, 7);
  check('naked triple removes 1 from R1C5', s && s.elims, [{ cell: idx(1, 5), digit: 1 }]);
  check('named as naked triple', s.name, 'Naked triple');
}
{
  const st = blank();
  // Digits 1, 2, 3 fit only in R1C1..R1C3 which also carry 9s.
  for (let c = 1; c <= 9; c++) st.cand[idx(1, c)] = c <= 3 ? mask(1, 2, 3, 9) : mask(4, 5, 6, 7, 8, 9);
  const s = R.finders.hiddenSubset(st, 3, 8);
  ok('hidden triple strips 9 from the three cells', s && s.elims.length === 3 && s.elims.every((e) => e.digit === 9),
     JSON.stringify(s && s.elims));
}
{
  const st = blank();
  // 7 sits only in columns 2 and 6 on rows 1 and 4; a 7 at R7C2 must go.
  for (let i = 0; i < 81; i++) st.cand[i] &= ~b(7);
  for (const i of [idx(1, 2), idx(1, 6), idx(4, 2), idx(4, 6), idx(7, 2)]) st.cand[i] |= b(7);
  const s = R.finders.fish(st, 2, 9);
  check('X-wing removes the stray 7', s && s.elims, [{ cell: idx(7, 2), digit: 7 }]);
  check('named X-wing', s.name, 'X-wing');
}
{
  const st = blank();
  // Column version: 3 sits only in rows 2 and 8 of columns 1 and 5.
  for (let i = 0; i < 81; i++) st.cand[i] &= ~b(3);
  for (const i of [idx(2, 1), idx(8, 1), idx(2, 5), idx(8, 5), idx(2, 9)]) st.cand[i] |= b(3);
  const s = R.finders.fish(st, 2, 9);
  check('X-wing works on columns too', s && s.elims, [{ cell: idx(2, 9), digit: 3 }]);
}
{
  const st = blank();
  // Swordfish: 4 in rows 1, 5, 9 confined to columns 2, 5, 8.
  for (let i = 0; i < 81; i++) st.cand[i] &= ~b(4);
  for (const i of [idx(1, 2), idx(1, 5), idx(5, 5), idx(5, 8), idx(9, 2), idx(9, 8), idx(3, 5)]) st.cand[i] |= b(4);
  const s = R.finders.fish(st, 3, 10);
  check('swordfish removes the 4 at R3C5', s && s.elims, [{ cell: idx(3, 5), digit: 4 }]);
  check('named swordfish', s.name, 'Swordfish');
}
{
  const st = blank();
  // Pivot R1C1 {1,2}; pincers R1C5 {1,3} and R4C1 {2,3}; R4C5 sees both and holds 3.
  for (let i = 0; i < 81; i++) st.cand[i] = mask(5, 6, 7, 8, 9);
  st.cand[idx(1, 1)] = mask(1, 2);
  st.cand[idx(1, 5)] = mask(1, 3);
  st.cand[idx(4, 1)] = mask(2, 3);
  st.cand[idx(4, 5)] = mask(3, 5, 6);
  const s = R.finders.xyWing(st);
  check('XY-wing removes 3 from the cell seeing both pincers', s && s.elims, [{ cell: idx(4, 5), digit: 3 }]);
  check('and lists pivot then pincers', s.cells, [idx(1, 1), idx(1, 5), idx(4, 1)]);
}
{
  const st = blank();
  // Colouring on 2. Row 1 links R1C1-R1C9, column 9 links R1C9-R5C9 and row 5
  // links R5C9-R5C1, so R1C1 and R5C9 share one colour and R1C9 and R5C1 the
  // other. Column 1 holds a third 2 at R7C1, so it is not a link, and that
  // cell sees R1C1 and R5C1: both colours. Whichever colour is true, R7C1 is
  // not a 2. R3C3 is a decoy that sees only one colour.
  for (let i = 0; i < 81; i++) st.cand[i] &= ~b(2);
  for (const i of [idx(1, 1), idx(1, 9), idx(5, 9), idx(5, 1)]) st.cand[i] |= b(2);
  st.cand[idx(3, 3)] |= b(2);
  st.cand[idx(7, 1)] |= b(2);
  const s = R.finders.colouring(st);
  ok('simple colouring removes a 2 that sees both colours', s && s.elims.some((e) => e.cell === idx(7, 1) && e.digit === 2),
     JSON.stringify(s && s.elims));
  check('named simple colouring', s && s.name, 'Simple colouring');
}
{
  const st = blank();
  // Rule 2: a closed chain of odd length forces two cells of one colour to see
  // each other. Box 1 has 2 at R1C1 and R2C2 only (a link); row 2 has it at
  // R2C2 and R2C9; column 9 at R2C9 and R9C9; row 9 at R9C9 and R9C1; column 1
  // at R9C1 and R1C1. Five links round a loop: R1C1 and R9C1 share a colour
  // and share a column, so that colour is false everywhere.
  for (let i = 0; i < 81; i++) st.cand[i] &= ~b(2);
  for (const i of [idx(1, 1), idx(2, 2), idx(2, 9), idx(9, 9), idx(9, 1)]) st.cand[i] |= b(2);
  const s = R.finders.colouring(st);
  ok('colouring rule 2 finds the self-seeing colour', s && s.elims.length >= 2 && s.text.indexOf('see each other') !== -1,
     s && s.text);
}

console.log('\n== grading known puzzles ==');
{
  const g = R.gradePuzzle(R.fromString(P.wiki));
  check('the Wikipedia puzzle is Easy', [g.grade, g.technique], ['easy', 'Naked single']);
  const g17 = R.gradePuzzle(R.fromString(P.clue17));
  check('the 17-clue puzzle is Easy despite having the fewest clues possible', [g17.grade, g17.technique], ['easy', 'Hidden single']);
  const gx = R.gradePuzzle(R.fromString(P.xwing));
  check('the X-wing example is Hard with 46 clues', [gx.grade, gx.technique, gx.clues], ['hard', 'X-wing', 46]);
  const gi = R.gradePuzzle(R.fromString(P.inkala));
  check('Inkala\'s puzzle is Evil', [gi.grade, gi.technique], ['evil', 'Trial and error']);
  const ge = R.gradePuzzle(R.fromString(P.escargot));
  check('AI Escargot is Evil', ge.grade, 'evil');
  check('a non-unique grid has no grade', R.gradePuzzle(new Array(81).fill(0)).grade, null);
  const res = R.solveLogically(R.fromString(P.wiki), 12);
  check('the human solver reaches the same solution', R.toString(res.grid), P.wikiSolution);
  const capped = R.solveLogically(R.fromString(P.xwing), 6);
  check('capped below X-wing it gives up', capped.solved, false);
}

console.log('\n== generator ==');
{
  const timings = [];
  for (const grade of R.GRADES) {
    const seeds = [11, 22, 33];
    let total = 0, worst = 0, attempts = [];
    for (const seed of seeds) {
      const t0 = Date.now();
      const out = R.generate(grade, seed);
      const ms = Date.now() - t0;
      total += ms; worst = Math.max(worst, ms); attempts.push(out.attempts);
      ok(grade + ' seed ' + seed + ': hit the grade', out.grade === grade && !out.fellBack, out.grade);
      check(grade + ' seed ' + seed + ': unique', R.countSolutions(out.puzzle, 2), 1);
      ok(grade + ' seed ' + seed + ': the solution is a valid full grid', validFull(out.solution));
      ok(grade + ' seed ' + seed + ': every clue matches the solution', out.puzzle.every((d, i) => !d || d === out.solution[i]));
      ok(grade + ' seed ' + seed + ': at least 17 clues', out.clues >= 17, String(out.clues));
      check(grade + ' seed ' + seed + ': the grader agrees', R.gradePuzzle(out.puzzle).grade, grade);
    }
    timings.push(grade.padEnd(7) + ' avg ' + String(Math.round(total / seeds.length)).padStart(5) + ' ms, worst ' +
                 String(worst).padStart(5) + ' ms, attempts ' + attempts.join('/'));
  }
  const a = R.generate('medium', 77), c = R.generate('medium', 77);
  check('the same seed gives the same puzzle', R.toString(a.puzzle), R.toString(c.puzzle));
  ok('different seeds give different puzzles', R.toString(R.generate('medium', 78).puzzle) !== R.toString(a.puzzle));
  const easy = R.generate('easy', 5);
  const need = R.solveLogically(easy.puzzle, 2);
  ok('an Easy puzzle is minimal for singles: no clue can go', easy.puzzle.every((d, i) => {
    if (!d) return true;
    const g = easy.puzzle.slice(); g[i] = 0;
    return !R.solveLogically(g, 2).solved;
  }));
  ok('and it solves with singles', need.solved);
  console.log('  generator timings (three seeds each):');
  for (const t of timings) console.log('    ' + t);
}

console.log('\n== hints ==');
{
  const out = R.generate('expert', 3);
  const grid = out.puzzle.slice();
  const killed = new Array(81).fill(0);
  let steps = 0, sound = true, named = new Set(), trial = 0;
  while (!R.isComplete(grid) && steps < 1500) {
    const h = R.hint(grid, out.solution, killed);
    if (!h) { sound = false; break; }
    steps++;
    named.add(h.name);
    if (h.tier === 13) trial++;
    if (h.place) {
      if (out.solution[h.place.cell] !== h.place.digit) { sound = false; break; }
      grid[h.place.cell] = h.place.digit;
    } else {
      if (!h.elims.length) { sound = false; break; }
      for (const e of h.elims) {
        if (out.solution[e.cell] === e.digit) { sound = false; break; }
        killed[e.cell] |= b(e.digit);
      }
    }
  }
  ok('hints walk an Expert puzzle all the way to its solution', R.isSolved(grid, out.solution), 'steps ' + steps);
  ok('and every placement and elimination agreed with the solution', sound);
  check('never resorting to trial and error on an Expert puzzle', trial, 0);
  ok('using more than singles on the way', Array.from(named).some((n) => n !== 'Naked single' && n !== 'Hidden single'), Array.from(named).join(', '));
  ok('every hint names a technique and the cells it uses', steps > 0);
}
{
  const out = R.generate('easy', 4);
  const grid = out.puzzle.slice();
  const i = grid.findIndex((d) => !d);
  const wrong = (out.solution[i] % 9) + 1;
  grid[i] = wrong;
  const h = R.hint(grid, out.solution, null);
  check('a wrong digit is reported before anything else', [h.name, h.mistake], ['Mistake', i]);
  grid[i] = 0;
  const killed = new Array(81).fill(0);
  killed[i] = b(out.solution[i]);
  const h2 = R.hint(grid, out.solution, killed);
  check('a crossed-out answer is reported as a mistake', [h2.name, h2.mistake, h2.revive], ['Mistake', i, out.solution[i]]);
  const h3 = R.hint(grid, out.solution, null);
  ok('an Easy puzzle opens with a single', h3.tier === 1 || h3.tier === 2, h3.name);
  check('a finished grid has nothing to hint', R.hint(out.solution, out.solution, null), null);
  const evil = R.fromString(P.inkala);
  const h4 = R.hint(evil, R.solve(evil), null);
  ok('an Evil position admits it needs trial and error', h4 && (h4.tier === 13 || h4.tier <= 12), h4 && h4.name);
  // Walk Inkala's puzzle with hints: somewhere it must fall back to trial and error.
  const g = evil.slice(), sol = R.solve(evil), k = new Array(81).fill(0);
  let usedTrial = false, n = 0;
  while (!R.isComplete(g) && n++ < 1500) {
    const h = R.hint(g, sol, k);
    if (h.tier === 13) usedTrial = true;
    if (h.place) g[h.place.cell] = h.place.digit;
    else for (const e of h.elims) k[e.cell] |= b(e.digit);
  }
  ok('Inkala\'s puzzle needs trial and error at least once', usedTrial);
  ok('and still ends solved', R.isSolved(g, sol));
}

console.log('\n== daily ==');
{
  const a = R.daily('2026-09-08'), c = R.daily('2026-09-08');
  check('the same date gives the same puzzle', R.toString(a.puzzle), R.toString(c.puzzle));
  ok('the next day gives a different one', R.toString(R.daily('2026-09-09').puzzle) !== R.toString(a.puzzle));
  check('2026-09-08 is a Tuesday, so Medium', [R.dailyGrade('2026-09-08'), a.grade], ['medium', 'medium']);
  check('Monday is Easy', R.dailyGrade('2026-09-07'), 'easy');
  check('Sunday is Evil', R.dailyGrade('2026-09-13'), 'evil');
  check('Saturday is Expert', R.dailyGrade('2026-09-12'), 'expert');
  check('the daily is unique', R.countSolutions(a.puzzle, 2), 1);
  check('the daily carries its date', a.date, '2026-09-08');
  ok('todayKey is YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(R.todayKey()));
  check('todayKey pads the month and day', R.todayKey(new Date(2026, 0, 5)), '2026-01-05');
}

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' CHECKS PASSED' : pass + ' passed, ' + fail + ' FAILED'));
/* Set the code and let node finish on its own, rather than process.exit().
   These suites load a plain browser script with an indirect (0, eval), and on
   node 24.7 that combination segfaults on roughly one run in ten - after the
   summary has printed, so the tests all pass and the shell still sees 139.
   Isolated: eval-load alone is clean, process.exit alone is clean, together
   they crash. Exit codes are how every check here is judged, so they have to
   be trustworthy. */
process.exitCode = fail ? 1 : 0;
