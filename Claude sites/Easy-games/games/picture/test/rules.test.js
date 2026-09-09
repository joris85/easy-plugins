'use strict';

/* Easy Picture - the rules engine test suite.
 *
 *   node games/picture/test/rules.test.js
 *
 * The engine is pure: no canvas, no DOM, seeded randomness, so it runs in
 * node exactly as it runs in the page. The important promise of the game, that
 * every offered puzzle is solvable by line logic alone, is checked here for
 * every library picture and for a batch of generated ones per size.
 * Exits non-zero on any failure.
 */
const fs = require('fs');
// rules.js is a plain script, not a module: it declares `const PictureRules`,
// so it has to be evaluated in the global scope and then hoisted out.
(0, eval)(fs.readFileSync(require('path').join(__dirname, '..', 'js', 'rules.js'), 'utf8')
          + '\n;globalThis.PictureRules = PictureRules;');
const R = globalThis.PictureRules;
const U = R.UNKNOWN, F = R.FILL, X = R.CROSS;

let pass = 0, fail = 0;
const check = (n, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log('  FAIL ' + n + '\n    got  ' + JSON.stringify(got) + '\n    want ' + JSON.stringify(want)); }
};
const ok = (n, c, d) => { if (c) pass++; else { fail++; console.log('  FAIL ' + n + (d ? '  ' + d : '')); } };

/** A line from a string: '#' filled, 'x' crossed, anything else unknown. */
const L = (s) => s.split('').map((ch) => (ch === '#' ? F : ch === 'x' ? X : U));
const S = (line) => line.map((v) => (v === F ? '#' : v === X ? 'x' : '.')).join('');

console.log('\n== clues from a picture ==');
{
  const heart = R.parsePicture(['.#.#.', '#####', '#####', '.###.', '..#..']);
  const clues = R.cluesFor(heart);
  check('row clues', clues.rows, [[1, 1], [5], [5], [3], [1]]);
  check('column clues', clues.cols, [[2], [4], [4], [4], [2]]);
  check('an empty line is an empty clue', R.cluesFor(R.parsePicture(['...', '#.#'])).rows, [[], [1, 1]]);
  check('string art round trips', R.toArt(heart), ['.#.#.', '#####', '#####', '.###.', '..#..']);
  check('runs', R.runsOf([1, 1, 0, 1, 0, 0, 1, 1, 1]), [2, 1, 3]);
}

console.log('\n== the line solver on hand-built lines ==');
{
  check('a full run fills the line', S(R.solveLine([5], L('.....'))), '#####');
  check('an empty clue crosses the line', S(R.solveLine([], L('.....'))), 'xxxxx');
  check('3 in 5 pins the middle cell', S(R.solveLine([3], L('.....'))), '..#..');
  check('4 in 5 pins three', S(R.solveLine([4], L('.....'))), '.###.');
  check('2 in 5 pins nothing', S(R.solveLine([2], L('.....'))), '.....');
  check('1 1 in 3 is exact', S(R.solveLine([1, 1], L('...'))), '#x#');
  check('a known fill narrows 2 in 5', S(R.solveLine([2], L('..#..'))), 'x.#.x');
  check('a fill at the edge completes the run', S(R.solveLine([2], L('#....'))), '##xxx');
  check('a cross splits the space', S(R.solveLine([3], L('.x....'))), 'xx.##.');
  check('a finished line gets its crosses', S(R.solveLine([1, 2], L('#.##.'))), '#x##x');
  check('crosses stay put', S(R.solveLine([1], L('x.x..'))), 'x.x..');
  check('2 1 in 5 pins the first run start', S(R.solveLine([2, 1], L('.....'))), '.#...');
  check('3 1 in 6', S(R.solveLine([3, 1], L('......'))), '.##...');
  check('long clue exactly fitting', S(R.solveLine([2, 1, 3], L('........'))), '##x#x###');
  check('a fill far right pushes a lone run right', S(R.solveLine([2], L('.....#'))), 'xxxx##');
  ok('contradiction: fills too far apart for one run', R.solveLine([3], L('#...#')) === null);
  ok('contradiction: a fill against an empty clue', R.solveLine([], L('..#')) === null);
  ok('contradiction: run longer than the free space', R.solveLine([3], L('.xx.x')) === null);
  ok('contradiction: more fills than the clue allows', R.solveLine([1], L('#.#')) === null);
  ok('a 20-cell line with many runs is fine', S(R.solveLine([1, 1, 1, 1, 1, 1, 1], L('....................'))) === '....................');
  check('20 cells, 3 3 3 3 3 pins the middles', S(R.solveLine([3, 3, 3, 3, 3], L('....................'))), '.##..##..##..##..##.');
}

console.log('\n== full solve by logic ==');
{
  const heart = R.parsePicture(['.#.#.', '#####', '#####', '.###.', '..#..']);
  const res = R.solveByLogic(R.cluesFor(heart));
  ok('the heart is solved', res.solved);
  check('and it is the heart', res.board.map((v) => (v === F ? 1 : 0)), heart.cells);
  ok('in a few passes', res.passes >= 1 && res.passes <= 4, 'passes ' + res.passes);
  const g = R.gradePicture(heart);
  ok('gradePicture agrees', g.solvable && g.passes === res.passes);
}

console.log('\n== every library picture is solvable by logic alone ==');
{
  const lib = R.library();
  ok('at least 30 pictures', lib.length >= 30, 'have ' + lib.length);
  const bySize = {};
  for (const p of lib) {
    bySize[p.rows] = (bySize[p.rows] || 0) + 1;
    ok(p.rows + 'x' + p.cols + ' ' + p.name + ' is square', p.rows === p.cols);
    const g = R.gradePicture(p);
    ok(p.rows + 'x' + p.cols + ' ' + p.name + ' is logic-solvable', g.solvable,
       'unknown ' + g.unknown + (g.mismatch ? ' (mismatch)' : ''));
    ok(p.rows + 'x' + p.cols + ' ' + p.name + ' clues match the cells', JSON.stringify(p.clues) === JSON.stringify(R.cluesFor(p)));
  }
  check('sizes offered', R.librarySizes(), [5, 10, 15]);
  ok('5x5 has plenty', bySize[5] >= 15, 'have ' + bySize[5]);
  ok('10x10 has plenty', bySize[10] >= 10, 'have ' + bySize[10]);
  ok('15x15 has some', bySize[15] >= 5, 'have ' + bySize[15]);
  // No two library pictures at a size share a clue set; that would make the
  // picture ambiguous which the solver check should already have caught.
  const seen = new Set();
  let dup = 0;
  for (const p of lib) { const k = JSON.stringify(p.clues); if (seen.has(k)) dup++; seen.add(k); }
  check('no duplicate clue sets', dup, 0);
  console.log('  library: ' + Object.keys(bySize).map((k) => bySize[k] + ' at ' + k + 'x' + k).join(', '));
}

console.log('\n== a picture that needs a guess is rejected ==');
{
  ok('2x2 checkerboard', !R.isLogicSolvable(R.parsePicture(['#.', '.#'])));
  ok('two diagonal dots in 4x4', !R.isLogicSolvable(R.parsePicture(['#...', '.#..', '....', '....'])));
  ok('a thin X', !R.isLogicSolvable(R.parsePicture(['#...#', '.#.#.', '..#..', '.#.#.', '#...#'])));
  const res = R.solveByLogic(R.cluesFor(R.parsePicture(['#.', '.#'])));
  ok('the solver reports the unknown cells rather than guessing', !res.solved && res.unknown === 4 && !res.contradiction);
  ok('a hand-solvable one is accepted', R.isLogicSolvable(R.parsePicture(['##.', '#..', '...'])));
  const bad = R.solveByLogic({ rows: [[3]], cols: [[], [1], []] });
  ok('inconsistent clues report a contradiction', bad.contradiction);
}

console.log('\n== the generator only ever hands out logic-solvable pictures ==');
{
  const report = [];
  for (const size of [5, 10, 15, 20]) {
    const rng = R.makeRng(2026);
    const n = size >= 20 ? 30 : 60;
    const t0 = process.hrtime.bigint();
    let worst = 0, allGood = true, fallbacks = 0, tries = 0, flips = 0;
    for (let i = 0; i < n; i++) {
      const s = process.hrtime.bigint();
      const g = R.generate(size, rng);
      const ms = Number(process.hrtime.bigint() - s) / 1e6;
      worst = Math.max(worst, ms);
      tries += g.tries; flips += g.flips;
      if (g.fallback) fallbacks++;
      if (!R.isLogicSolvable(g.pic)) allGood = false;
      if (g.pic.rows !== size || g.pic.cols !== size) allGood = false;
      if (!R.reasonableDensity(g.pic)) allGood = false;
    }
    const total = Number(process.hrtime.bigint() - t0) / 1e6;
    ok(size + 'x' + size + ': ' + n + ' generated, all solvable and square', allGood);
    ok(size + 'x' + size + ': no fallbacks', fallbacks === 0, 'fallbacks ' + fallbacks);
    ok(size + 'x' + size + ': worst case under 100 ms', worst < 100, 'worst ' + worst.toFixed(1));
    report.push(size + 'x' + size + ' avg ' + (total / n).toFixed(2) + ' ms, worst ' + worst.toFixed(1) + ' ms, '
                + (tries / n).toFixed(1) + ' tries and ' + (flips / n).toFixed(1) + ' repairs per puzzle');
  }
  console.log('  timing: ' + report.join('\n          '));
  const a = R.generate(10, R.makeRng(99)), b = R.generate(10, R.makeRng(99));
  check('the same seed gives the same picture', a.pic.cells, b.pic.cells);
  const c = R.generate(10, R.makeRng(100));
  ok('a different seed gives a different one', JSON.stringify(c.pic.cells) !== JSON.stringify(a.pic.cells));
}

console.log('\n== the daily is stable per date ==');
{
  check('date key is UTC', R.dateKey(new Date(Date.UTC(2026, 8, 8, 23, 59))), '2026-09-08');
  const a = R.dailyPuzzle(10, '2026-09-08'), b = R.dailyPuzzle(10, '2026-09-08');
  check('same date, same picture', a.cells, b.cells);
  check('same date, same clues', a.clues, b.clues);
  const c = R.dailyPuzzle(10, '2026-09-09');
  ok('next day differs', JSON.stringify(c.cells) !== JSON.stringify(a.cells));
  const d = R.dailyPuzzle(15, '2026-09-08');
  ok('another size is another picture', d.rows === 15 && R.isLogicSolvable(d));
  ok('the daily is logic-solvable', R.isLogicSolvable(a));
  check('it is labelled', a.name, 'Daily 2026-09-08');
  ok('seeds differ by size', R.dailySeed('2026-09-08', 10) !== R.dailySeed('2026-09-08', 15));
}

console.log('\n== board helpers the controller leans on ==');
{
  const heart = R.parsePicture(['.#.#.', '#####', '#####', '.###.', '..#..']);
  const pz = R.makePuzzle(heart, { name: 'Heart' });
  const b = R.emptyBoard(pz);
  check('empty board', b.length, 25);
  ok('not solved when empty', !R.isSolved(pz, b));
  heart.cells.forEach((v, i) => { if (v) b[i] = F; });
  ok('solved once every picture cell is filled, crosses optional', R.isSolved(pz, b));
  b[0] = X;
  ok('crosses on empty cells do not matter', R.isSolved(pz, b));
  b[0] = F;
  ok('an extra fill breaks it', !R.isSolved(pz, b));
  check('a column of marks', R.lineOf(b, pz, 'col', 1), [F, F, F, F, U]);
  check('filled cells counted', R.countFilled(b), 17);
  check('picture cells counted', R.countPicture(pz), 16);

  ok('lineComplete: runs match', R.lineComplete([1, 2], L('#.##.')));
  ok('lineComplete: a half run is not', !R.lineComplete([1, 2], L('#.#..')));
  ok('lineComplete: empty clue on an unpainted line', R.lineComplete([], L('.x.')));
  check('runBounds: leftmost and rightmost starts', R.runBounds([2, 1], L('.....')), { left: [0, 3], right: [1, 4] });
  check('runBounds: a fill pins a run', R.runBounds([2, 1], L('.#...')), { left: [0, 3], right: [1, 4] });
  check('runBounds: a cross pushes', R.runBounds([2, 1], L('x....')), { left: [1, 4], right: [1, 4] });
  ok('runBounds: an inconsistent line is null', R.runBounds([2, 1], L('#x....')) === null);
  check('clueMarks: pinned runs from the left', R.clueMarks([1, 2, 1], L('#x##...')), [true, true, false]);
  check('clueMarks: pinned runs from the right', R.clueMarks([1, 2, 1], L('....##x#')), [false, true, true]);
  check('clueMarks: a run pinned by logic is ticked even unfenced', R.clueMarks([2, 1], L('##....')), [true, false]);
  check('clueMarks: a complete line ticks everything', R.clueMarks([2, 1], L('##.#..')), [true, true]);
  check('clueMarks: a lone fill cannot tick a number it could not be', R.clueMarks([2, 1], L('#x....')), [false, false]);
  check('clueMarks: a fill that could be either run ticks nothing', R.clueMarks([1, 1], L('..#..')), [false, false]);
  check('clueMarks: pinned but unpainted is not ticked', R.clueMarks([5], L('.....')), [false]);
  check('clueMarks: 3 in 5 with only the middle painted', R.clueMarks([3], L('..#..')), [false]);
  check('clueMarks: empty clue', R.clueMarks([], L('...')), []);
}

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' CHECKS PASSED' : pass + ' passed, ' + fail + ' FAILED'));
process.exit(fail ? 1 : 0);
