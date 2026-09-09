'use strict';

/* Easy Words - the rules engine test suite.
 *
 *   node games/words/test/rules.test.js
 *
 * The engine is pure, so every rule is checked here directly rather than by
 * playing. Exits non-zero on any failure.
 */
const fs = require('fs');
// rules.js is a plain script, not a module: it declares `const WordsRules = ...`,
// so it has to be evaluated in the global scope and then hoisted out.
(0, eval)(fs.readFileSync(require('path').join(__dirname, '..', 'js', 'rules.js'), 'utf8')
          + '\n;globalThis.WordsRules = WordsRules;');
const R = globalThis.WordsRules;
const { CORRECT: C, PRESENT: P, ABSENT: A } = R.MARK;

let pass = 0, fail = 0;
const check = (n, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log('  FAIL ' + n + '\n    got  ' + JSON.stringify(got) + '\n    want ' + JSON.stringify(want)); }
};
const ok = (n, c, d) => { if (c) pass++; else { fail++; console.log('  FAIL ' + n + (d ? '  ' + d : '')); } };

console.log('\n== scoring, the two pass count limited match ==');
{
  check('APPLE / ALLEY: second L is grey because the count is spent',
        R.score('alley', 'apple'), [C, P, A, P, A]);
  check('LEVEL / HELLO: both Ls present, E correct',
        R.score('hello', 'level'), [A, C, P, P, A]);
  check('ABBEY / BABES: greens claim their letters before yellows',
        R.score('babes', 'abbey'), [P, P, C, C, A]);
  check('CRANE / EERIE: an earlier duplicate cannot steal a later green',
        R.score('eerie', 'crane'), [A, A, P, A, C]);
  check('all correct', R.score('crane', 'crane'), [C, C, C, C, C]);
  check('nothing shared', R.score('crane', 'south'), [A, A, A, A, A]);
  check('case insensitive', R.score('CRANE', 'Crane'), [C, C, C, C, C]);
  check('SPEED / EERIE: two Es present, the third E grey because the answer has two',
        R.score('eerie', 'speed'), [P, P, A, A, A]);
}

console.log('\n== the daily word ==');
{
  const a = R.dailyWord('2026-09-08'), b = R.dailyWord('2026-09-08');
  check('the same date gives the same word', a, b);
  ok('it is an answer word', R.isAnswer(a), a);
  ok('the next day is a different word', R.dailyWord('2026-09-09') !== a);
  const seen = new Set();
  for (let d = 1; d <= 28; d++) seen.add(R.dailyWord('2026-02-' + String(d).padStart(2, '0')));
  check('a whole month has no repeats', seen.size, 28);
  check('puzzle 1 is the epoch', R.puzzleNumber('2026-01-01'), 1);
  check('puzzle numbers step by one across a DST change', R.dayNumber('2026-03-30') - R.dayNumber('2026-03-29'), 1);
  check('and across a year end', R.dayNumber('2027-01-01') - R.dayNumber('2026-12-31'), 1);
  ok('a date before the epoch still yields a word', R.isAnswer(R.dailyWord('2025-12-25')));
  check('dateKey pads month and day', R.dateKey(new Date(2026, 0, 5)), '2026-01-05');
  const cycle = R.ANSWERS.length;
  check('the sequence wraps only after every answer has been used',
        R.dailyWord('2026-01-01'), R.dailySequence()[0]);
  ok('the daily list is a permutation of the answers', new Set(R.dailySequence()).size === cycle);
}

console.log('\n== randomness ==');
{
  const r1 = R.makeRng(42), r2 = R.makeRng(42), r3 = R.makeRng(43);
  const s1 = [r1(), r1(), r1()], s2 = [r2(), r2(), r2()], s3 = [r3(), r3(), r3()];
  check('same seed, same stream', s1, s2);
  ok('different seed, different stream', JSON.stringify(s1) !== JSON.stringify(s3));
  ok('values stay in [0, 1)', s1.every((v) => v >= 0 && v < 1));
  check('the hash is stable', R.hashString('easywords'), R.hashString('easywords'));
  ok('a seeded practice word is an answer', R.isAnswer(R.randomWord(R.makeRng(7))));
  check('seeded practice words are reproducible',
        R.randomWord(R.makeRng(7)), R.randomWord(R.makeRng(7)));
}

console.log('\n== the word lists ==');
{
  const shape = /^[a-z]{5}$/;
  ok('at least 1500 answers', R.ANSWERS.length >= 1500, String(R.ANSWERS.length));
  ok('every answer is five lower case letters', R.ANSWERS.every((w) => shape.test(w)),
     R.ANSWERS.filter((w) => !shape.test(w)).join(' '));
  check('no duplicate answers', new Set(R.ANSWERS).size, R.ANSWERS.length);
  ok('every extra guess is five lower case letters', R.EXTRA.every((w) => shape.test(w)),
     R.EXTRA.filter((w) => !shape.test(w)).join(' '));
  check('no duplicate extras', new Set(R.EXTRA).size, R.EXTRA.length);
  const aset = new Set(R.ANSWERS);
  check('no extra guess is also an answer', R.EXTRA.filter((w) => aset.has(w)), []);
  ok('the accepted list is a few thousand words', R.ANSWERS.length + R.EXTRA.length >= 3000);
  ok('every answer is valid as a guess', R.ANSWERS.every(R.isValid));
  ok('every extra is valid as a guess', R.EXTRA.every(R.isValid));
  const dup = R.ANSWERS.filter((w) => new Set(w).size < 5).length;
  ok('a good share of answers repeat a letter, so scoring pass two is exercised',
     dup / R.ANSWERS.length > 0.15, (dup / R.ANSWERS.length).toFixed(2));
}

console.log('\n== validity ==');
{
  ok('a common word is valid', R.isValid('crane'));
  ok('upper case is accepted', R.isValid('CRANE'));
  ok('an obscure real word is valid without being an answer', R.isValid('quoth') && !R.isAnswer('quoth'));
  ok('four letters are not', !R.isValid('cran'));
  ok('six letters are not', !R.isValid('cranes'));
  ok('nonsense is not', !R.isValid('xyzzy'));
  ok('non-strings are not', !R.isValid(null) && !R.isValid(12345));
}

console.log('\n== keyboard states ==');
{
  const guesses = ['crane', 'eerie'];
  const marks = guesses.map((g) => R.score(g, 'crate'));
  const ks = R.keyStates(guesses, marks);
  check('a letter shown correct stays correct even after an absent showing', ks.e, C);
  check('a present letter', ks.r, C);
  check('an absent letter', ks.n, A);
  ok('untouched letters are unknown', ks.z === undefined);
  check('empty game, empty keyboard', R.keyStates([], []), {});
}

console.log('\n== hard mode ==');
{
  const g = ['crane'], m = [R.score('crane', 'crate')];
  check('a green must stay in place', R.hardModeViolation('brake', g, m), '1st letter must be C');
  check('keeping the greens passes', R.hardModeViolation('crate', g, m), null);
  const g2 = ['alley'], m2 = [R.score('alley', 'apple')];
  check('a yellow must be reused', R.hardModeViolation('about', g2, m2), 'Guess must contain L');
  check('reusing it passes', R.hardModeViolation('ample', g2, m2), null);
  const g3 = ['hello'], m3 = [R.score('hello', 'level')];
  check('two yellows of one letter need two copies', R.hardModeViolation('leapt', g3, m3), 'Guess must contain L');
  check('two copies pass, with the green E kept in place', R.hardModeViolation('jelly', g3, m3), null);
  check('a green broken by a word that otherwise has both Ls', R.hardModeViolation('llama', g3, m3), '2nd letter must be E');
}

console.log('\n== a game ==');
{
  const g = R.makeGame({ answer: 'CRANE', mode: 'free' });
  check('the answer is stored lower case', g.answer, 'crane');
  check('too short', R.submit(g, 'cra').ok, false);
  check('too short says why', R.submit(g, 'cra').reason, 'Not enough letters');
  check('not a word', R.submit(g, 'xyzzy').reason, 'Not in the word list');
  check('a rejected guess is not recorded', g.guesses.length, 0);
  const r = R.submit(g, 'crate');
  check('a valid guess is scored', r.marks, [C, C, C, A, C]);
  check('still playing', g.status, 'play');
  check('winning', R.submit(g, 'crane').status, 'won');
  check('nothing after the end', R.submit(g, 'crane').ok, false);

  const l = R.makeGame({ answer: 'crane' });
  for (let i = 0; i < R.GUESSES; i++) R.submit(l, 'south');
  check('six misses lose', l.status, 'lost');
  check('six rows recorded', l.guesses.length, R.GUESSES);

  const h = R.makeGame({ answer: 'crate', hard: true });
  R.submit(h, 'crane');
  check('hard mode rejects a guess that drops a green', R.submit(h, 'brake').ok, false);
  check('with the reason', R.submit(h, 'brake').reason, '1st letter must be C');
  check('and accepts one that keeps it', R.submit(h, 'crate').status, 'won');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
/* Set the code and let node finish on its own, rather than process.exit().
   These suites load a plain browser script with an indirect (0, eval), and on
   node 24.7 that combination segfaults on roughly one run in ten - after the
   summary has printed, so the tests all pass and the shell still sees 139.
   Isolated: eval-load alone is clean, process.exit alone is clean, together
   they crash. Exit codes are how every check here is judged, so they have to
   be trustworthy. */
process.exitCode = fail ? 1 : 0;
