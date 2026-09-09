'use strict';

/* Easy Blocks - the rules engine test suite.
 *
 *   node games/blocks/test/rules.test.js
 *
 * The engine is pure: no canvas, no DOM, seeded randomness. Every rule the
 * game claims (SRS kicks, the 7-bag, lock delay, T-spins, scoring) is checked
 * here by driving the engine directly. Exits non-zero on any failure.
 */
const fs = require('fs');
// rules.js is a plain script, not a module: it declares `const BlocksRules`,
// so it has to be evaluated in the global scope and then hoisted out.
(0, eval)(fs.readFileSync(require('path').join(__dirname, '..', 'js', 'rules.js'), 'utf8')
          + '\n;globalThis.BlocksRules = BlocksRules;');
const R = globalThis.BlocksRules;

let pass = 0, fail = 0;
const check = (n, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log('  FAIL ' + n + '\n    got  ' + JSON.stringify(got) + '\n    want ' + JSON.stringify(want)); }
};
const ok = (n, c, d) => { if (c) pass++; else { fail++; console.log('  FAIL ' + n + (d ? '  ' + d : '')); } };
const near = (n, got, want, eps) => ok(n, Math.abs(got - want) <= (eps || 1e-3), 'got ' + got + ' want ' + want);

/* Instant line clears unless a test says otherwise, so a hard drop resolves
   in one call. The visible floor is row 39; the skyline is row 20. */
const G = (cfg, seed) => R.newGame(Object.assign({ clearDelay: 0 }, cfg), seed == null ? 1 : seed);
const put = (g, type, rot, x, y) => {
  g.piece = { type, rot, x, y };
  g.phase = 'fall';
  g.lastAction = null; g.lastKick = 0;
  g.lockTimer = 0; g.lockResets = 0; g.lowestY = y; g.gravityAcc = 0;
  return g.piece;
};
const fillRow = (g, y, except) => {
  for (let x = 0; x < g.cols; x++) g.grid[y][x] = (except || []).indexOf(x) >= 0 ? 0 : 'X';
};
const rowCount = (g, y) => g.grid[y].filter((c) => c !== 0).length;
const types = (ev) => ev.map((e) => e.type);
const find = (ev, t) => ev.find((e) => e.type === t);
const cells = (g) => R.cellsOf(g.piece.type, g.piece.rot, g.piece.x, g.piece.y);

console.log('\n== shapes ==');
{
  for (const t of R.TYPES) {
    const box = R.BOX[t];
    for (let r = 0; r < 4; r++) {
      const s = R.SHAPES[t][r];
      check(t + ' state ' + r + ' has four cells', s.length, 4);
      ok(t + ' state ' + r + ' stays inside its ' + box + 'x' + box + ' box',
         s.every(([x, y]) => x >= 0 && y >= 0 && x < box && y < box));
      ok(t + ' state ' + r + ' has no duplicate cell', new Set(s.map((c) => c.join(','))).size === 4);
    }
  }
  // The pictures the whole system is built on.
  check('T spawns flat side down', R.SHAPES.T[0], [[1, 0], [0, 1], [1, 1], [2, 1]]);
  check('T clockwise points right', R.SHAPES.T[1], [[1, 0], [1, 1], [2, 1], [1, 2]]);
  check('I spawns in the second row of its box', R.SHAPES.I[0], [[0, 1], [1, 1], [2, 1], [3, 1]]);
  check('I clockwise stands in the third column', R.SHAPES.I[1], [[2, 0], [2, 1], [2, 2], [2, 3]]);
  const g = G();
  check('the board is ten wide', g.cols, 10);
  check('and forty deep, twenty of them hidden', [g.height, g.buffer], [40, 20]);
  check('five pieces are queued', g.queue.length, 5);
  ok('a piece is falling from the start', !!g.piece && g.piece.rot === 0);
  ok('it spawned just above the skyline, then dropped a row', g.piece.y === g.buffer - 1, 'y ' + g.piece.y);
}

console.log('\n== every rotation of every piece, in open space ==');
{
  for (const t of R.TYPES) {
    const g = G();
    put(g, t, 0, 3, 10);
    const kicks = [];
    for (let i = 0; i < 4; i++) {
      const ev = R.rotate(g, 1);
      if (t !== 'O') kicks.push(find(ev, 'rotate') ? find(ev, 'rotate').kick : 'failed');
    }
    if (t === 'O') {
      check(t + ' ignores rotation', [g.piece.rot, g.piece.x, g.piece.y], [0, 3, 10]);
    } else {
      check(t + ' four clockwise turns come home', [g.piece.rot, g.piece.x, g.piece.y], [0, 3, 10]);
      check(t + ' none of them needed a kick', kicks, [0, 0, 0, 0]);
      for (let i = 0; i < 4; i++) R.rotate(g, -1);
      check(t + ' four anticlockwise turns come home too', [g.piece.rot, g.piece.x, g.piece.y], [0, 3, 10]);
      R.rotate(g, 1);
      const after = JSON.stringify(cells(g));
      R.rotate(g, 1); R.rotate(g, -1);
      check(t + ' clockwise then anticlockwise is a no-op', JSON.stringify(cells(g)), after);
      R.rotate(g, -1);
      check(t + ' and back to spawn', g.piece.rot, 0);
    }
  }
  const g = G();
  put(g, 'T', 0, 3, 10);
  R.rotate(g, 1);
  check('a clockwise T at (3,10) occupies the expected cells', cells(g), [[4, 10], [4, 11], [5, 11], [4, 12]]);
}

console.log('\n== wall kicks ==');
{
  const g = G();
  // A standing I flush against the left wall cannot lie down in place: its
  // row would start two columns outside the well. The first kick tries one
  // column further LEFT and fails too; the second slides it in by two.
  put(g, 'I', 1, -2, 10);
  check('standing I hugs the left wall', cells(g).map((c) => c[0]), [0, 0, 0, 0]);
  const ev = R.rotate(g, 1);
  check('the rotation succeeded', types(ev), ['rotate']);
  check('on the third candidate: one column further left fails first', ev[0].kick, 2);
  check('and now lies along the wall', cells(g), [[0, 12], [1, 12], [2, 12], [3, 12]]);
}
{
  const g = G();
  put(g, 'I', 3, -1, 10);       // anticlockwise I in column 0
  const ev = R.rotate(g, 1);    // to spawn state
  check('anticlockwise I at the wall kicks right by one', [ev[0].kick, g.piece.x], [1, 0]);
}
{
  const g = G();
  put(g, 'T', 3, 8, 10);        // T pointing left, stem in column 9
  const ev = R.rotate(g, -1);   // to upside down, which needs three columns
  check('T at the right wall kicks left', [ev[0].kick, g.piece.x, g.piece.rot], [1, 7, 2]);
  check('every cell is inside', cells(g).every(([x]) => x < 10), true);
}
{
  const g = G();
  put(g, 'T', 1, -1, 10);       // T pointing right, stem in column 0
  const ev = R.rotate(g, 1);
  check('T at the left wall kicks right', [ev[0].kick, g.piece.x, g.piece.rot], [1, 0, 2]);
}

console.log('\n== floor kicks ==');
{
  const g = G();
  put(g, 'I', 0, 3, 38);        // flat I resting on the floor
  ok('it is on the ground', R.onGround(g));
  const ev = R.rotate(g, 1);
  check('standing up needs the deep fifth kick', ev[0] && ev[0].kick, 4);
  check('it moved one right and two up', [g.piece.x, g.piece.y], [4, 36]);
  check('and stands on the floor in column 6', cells(g), [[6, 36], [6, 37], [6, 38], [6, 39]]);
}
{
  // A T wedged flat under an overhang with no room in any direction: every
  // candidate fails and the rotation is refused rather than forced.
  const g = G();
  for (let y = 36; y <= 39; y++) fillRow(g, y);
  g.grid[37][4] = 0;
  g.grid[38][3] = 0; g.grid[38][4] = 0; g.grid[38][5] = 0;
  put(g, 'T', 0, 3, 37);
  ok('the T fits its pocket', R.pieceFits(g, g.piece));
  const ev = R.rotate(g, 1);
  check('no kick fits, so nothing happens', ev, []);
  check('the piece is untouched', [g.piece.rot, g.piece.x, g.piece.y], [0, 3, 37]);
}

console.log('\n== the 7-bag ==');
{
  const g = G({}, 42);
  const seq = [g.piece.type].concat(g.queue);
  while (seq.length < 70) seq.push(R.nextType(g));
  let fair = true;
  for (let i = 0; i < 70; i += 7) {
    const bag = seq.slice(i, i + 7).slice().sort().join('');
    if (bag !== 'IJLOSTZ') fair = false;
  }
  ok('every run of seven holds each piece exactly once', fair, seq.join(''));
  let worst = 0;
  for (const t of R.TYPES) {
    let last = -1;
    seq.forEach((s, i) => { if (s === t) { if (last >= 0) worst = Math.max(worst, i - last - 1); last = i; } });
  }
  ok('no piece is ever more than twelve pieces away', worst <= 12, 'worst wait ' + worst);
  const a = G({}, 5), b = G({}, 5), c = G({}, 6);
  check('the same seed deals the same bag', [a.piece.type].concat(a.queue), [b.piece.type].concat(b.queue));
  ok('a different seed deals differently', [a.piece.type].concat(a.queue).join('') !== [c.piece.type].concat(c.queue).join(''));
}

console.log('\n== gravity, soft drop, hard drop ==');
{
  near('level 1 is one second per cell', R.gravitySeconds(1), 1.0);
  near('level 2 is 0.793', R.gravitySeconds(2), 0.793);
  near('level 10 is about 64 ms', R.gravitySeconds(10), 0.0641, 0.001);
  ok('level 15 is under a frame', R.gravitySeconds(15) < 1 / 60);
  ok('the curve never turns back up', R.gravitySeconds(30) < R.gravitySeconds(29));

  const g = G();
  put(g, 'T', 0, 3, 10);
  R.tick(g, 999, false);
  check('999 ms is not yet a cell at level 1', g.piece.y, 10);
  const ev = R.tick(g, 1, false);
  check('1000 ms is', [g.piece.y, types(ev)], [11, ['fall']]);
  check('nothing was scored for gravity', g.score, 0);

  R.tick(g, 100, true);
  check('soft drop falls twenty times faster', g.piece.y, 13);
  check('and pays one point per cell', g.score, 2);

  const before = g.piece.y;
  const hd = R.hardDrop(g);
  check('hard drop reports its distance', find(hd, 'harddrop').cells, 38 - before);
  check('and pays two per cell', g.score, 2 + (38 - before) * 2);
  ok('the piece locked at once', !!find(hd, 'lock'));
  ok('and the next one spawned', !!find(hd, 'spawn'));
  check('the T sits on the floor', g.grid[39].slice(3, 6), ['T', 'T', 'T']);
}
{
  const g = G();
  put(g, 'T', 0, 3, 10);
  check('the ghost is where a hard drop would land', R.ghostY(g), 38);
  fillRow(g, 30);
  check('and it respects the stack', R.ghostY(g), 28);
}

console.log('\n== lock delay ==');
{
  const g = G();
  put(g, 'T', 0, 3, 38);
  ok('the T is on the ground', R.onGround(g));
  let ev = R.tick(g, 499, false);
  check('499 ms on the ground: still falling', [g.phase, types(ev)], ['fall', []]);
  ev = R.tick(g, 1, false);
  ok('500 ms locks it', !!find(ev, 'lock'), JSON.stringify(types(ev)));
}
{
  const g = G();
  put(g, 'T', 0, 3, 38);
  R.tick(g, 400, false);
  R.move(g, 1);
  R.tick(g, 400, false);
  check('a move on the ground restarts the clock', g.phase === 'fall' && !!g.piece, true);
  R.rotate(g, 1);
  R.tick(g, 400, false);
  ok('so does a rotation', !!g.piece && g.piece.type === 'T');
  const ev = R.tick(g, 100, false);
  ok('until the clock runs out', !!find(ev, 'lock'));
}
{
  const g = G();
  put(g, 'T', 0, 3, 38);
  let locked = false;
  for (let i = 0; i < 15; i++) {
    R.tick(g, 400, false);
    R.move(g, i % 2 ? 1 : -1);
  }
  check('fifteen resets used', g.lockResets, 15);
  R.tick(g, 400, false);
  R.move(g, 1);
  check('the sixteenth move no longer resets', g.lockResets, 15);
  const ev = R.tick(g, 100, false);
  locked = !!find(ev, 'lock');
  ok('and the piece locks on schedule', locked);
}
{
  const g = G();
  put(g, 'T', 0, 3, 30);
  for (let i = 0; i < 5; i++) { g.lockResets++; }
  fillRow(g, 33);
  R.tick(g, 1000, false);
  check('falling to a new row refunds the resets', [g.piece.y, g.lockResets], [31, 0]);
}

console.log('\n== line clears ==');
{
  const g = G();
  fillRow(g, 39, [0]);
  put(g, 'I', 1, -2, 36);       // standing in column 0, feet on the floor
  const ev = R.hardDrop(g);
  const clear = find(ev, 'clear');
  ok('a single clears', !!clear, JSON.stringify(types(ev)));
  check('one row, 100 points', [clear.count, clear.points, g.score], [1, 100, 100]);
  check('the rest of the I settled down a row', [g.grid[39][0], g.grid[38][0], g.grid[37][0], g.grid[36][0]], ['I', 'I', 'I', 0]);
  check('the cleared row is gone', rowCount(g, 39), 1);
  check('lines counted', g.lines, 1);
}
{
  // Two full rows with a half row between them: both go, the half row
  // survives and lands on the floor, the leftover cell above it follows.
  const g = G();
  fillRow(g, 39, [9]);
  fillRow(g, 37, [9]);
  for (let x = 0; x < 5; x++) g.grid[38][x] = 'X';
  put(g, 'I', 1, 7, 36);        // standing in column 9, rows 36..39
  const ev = R.hardDrop(g);
  const clear = find(ev, 'clear');
  check('a non-adjacent double', [clear.count, clear.rows, clear.points], [2, [37, 39], 300]);
  check('the half row is now the floor', g.grid[39], ['X', 'X', 'X', 'X', 'X', 0, 0, 0, 0, 'I']);
  check('the one cell that was above it followed', g.grid[38], [0, 0, 0, 0, 0, 0, 0, 0, 0, 'I']);
  check('and nothing else remains', rowCount(g, 37) + rowCount(g, 36), 0);
}
{
  const g = G();
  g.grid[20][0] = 'X';          // a stray cell, so this is not a perfect clear
  for (let y = 36; y <= 39; y++) fillRow(g, y, [9]);
  put(g, 'I', 1, 7, 36);
  const ev = R.hardDrop(g);
  const clear = find(ev, 'clear');
  check('a quad scores 800', [clear.count, clear.points, clear.b2b, clear.perfect], [4, 800, false, false]);
}
{
  const g = G();
  for (let y = 36; y <= 39; y++) fillRow(g, y, [9]);
  put(g, 'I', 1, 7, 36);
  const clear = find(R.hardDrop(g), 'clear');
  ok('the well is empty again', g.grid.every((r) => r.every((c) => c === 0)));
  ok('which counts as a perfect clear', clear.perfect);
  check('with the perfect clear bonus on top', g.score, 800 + 2000);
}
{
  const g = G();
  check('a triple is 500', R.pointsFor({ lines: 3, tspin: 'none', level: 1, combo: 0 }), 500);
  check('scores scale with the level', R.pointsFor({ lines: 1, tspin: 'none', level: 4, combo: 0 }), 400);
  check('T-spin single 800, double 1200, triple 1600',
        [1, 2, 3].map((n) => R.pointsFor({ lines: n, tspin: 'full', level: 1, combo: 0 })), [800, 1200, 1600]);
  check('T-spin with no lines is 400', R.pointsFor({ lines: 0, tspin: 'full', level: 1, combo: -1 }), 400);
  check('mini T-spin 100, mini single 200', [R.pointsFor({ lines: 0, tspin: 'mini', level: 1, combo: -1 }),
        R.pointsFor({ lines: 1, tspin: 'mini', level: 1, combo: 0 })], [100, 200]);
  check('back-to-back quad is 1200', R.pointsFor({ lines: 4, tspin: 'none', level: 1, combo: 0, b2b: true }), 1200);
  check('back-to-back never applies to a plain single', R.pointsFor({ lines: 1, tspin: 'none', level: 1, combo: 0, b2b: true }), 100);
  check('combo adds 50 per step', R.pointsFor({ lines: 1, tspin: 'none', level: 1, combo: 3 }), 250);
}

console.log('\n== back-to-back and combo across placements ==');
{
  // Each helper leaves a stray cell high up, so no clear is ever a perfect one.
  const quad = (g) => {
    g.grid[20][0] = 'X';
    for (let y = 36; y <= 39; y++) fillRow(g, y, [9]);
    put(g, 'I', 1, 7, 36);
    return find(R.hardDrop(g), 'clear');
  };
  const single = (g) => {
    g.grid[20][0] = 'X';
    fillRow(g, 39, [0]);
    put(g, 'I', 1, -2, 36);
    return find(R.hardDrop(g), 'clear');
  };
  const g = G();
  const q1 = quad(g);
  check('first quad: plain 800, combo 0', [q1.points, q1.b2b, q1.combo], [800, false, 0]);
  g.grid.forEach((r) => r.fill(0));      // scrub the leftover I so perfect clears stay out of it
  const q2 = quad(g);
  check('second quad in a row: back-to-back x1.5 plus combo 50', [q2.points, q2.b2b, q2.combo], [1200 + 50, true, 1]);
  g.grid.forEach((r) => r.fill(0));
  const s = single(g);
  check('a single keeps the combo but breaks the chain', [s.points, s.b2b, s.combo], [100 + 100, false, 2]);
  g.grid.forEach((r) => r.fill(0));
  const q3 = quad(g);
  check('so the next quad is plain again', [q3.b2b, q3.combo], [false, 3]);
  // A placement that clears nothing ends the combo.
  put(g, 'O', 0, 0, 30);
  R.hardDrop(g);
  check('a dry placement resets the combo', g.combo, -1);
  g.grid.forEach((r) => r.fill(0));
  const q4 = quad(g);
  check('but not the back-to-back chain', [q4.b2b, q4.combo], [true, 0]);
}

console.log('\n== levels ==');
{
  const g = G();
  g.lines = 9;
  fillRow(g, 39, [0]);
  put(g, 'I', 1, -2, 36);
  const ev = R.hardDrop(g);
  check('the tenth line lifts the level', [g.level, !!find(ev, 'levelup')], [2, true]);
  g.grid.forEach((r) => r.fill(0));
  g.combo = -1;                 // the clear above would otherwise count as a combo
  fillRow(g, 39, [0]);
  put(g, 'I', 1, -2, 36);
  const s = find(R.hardDrop(g), 'clear');
  check('and a single now pays double', s.points, 200);
  const h = G({ startLevel: 10 });
  check('a chosen start level sticks', h.level, 10);
  h.lines = 10; fillRow(h, 39, [0]); put(h, 'I', 1, -2, 36); R.hardDrop(h);
  check('and climbs from there', h.level, 11);
}

console.log('\n== T-spins ==');
{
  // A full T-spin single: the T points down into a pocket whose two bottom
  // corners are filled, having arrived by rotation with nowhere else to go.
  const g = G();
  fillRow(g, 39, [1]);
  for (let x = 3; x < 9; x++) g.grid[38][x] = 'X';    // column 9 open, so row 38 stays
  g.grid[37][0] = 'X';
  put(g, 'T', 3, 0, 37);        // pointing left, above the slot
  const rot = R.rotate(g, -1);
  check('it turns to point down', [g.piece.rot, rot[0].kick], [2, 0]);
  check('and sits in the slot', cells(g), [[0, 38], [1, 38], [2, 38], [1, 39]]);
  check('the engine calls it a full spin', R.tspinOf(g), 'full');
  const ev = R.hardDrop(g);
  const clear = find(ev, 'clear');
  check('a T-spin single, 800', [clear.count, clear.tspin, clear.points], [1, 'full', 800]);
  check('which starts a back-to-back chain', g.b2b, true);
}
{
  // The same pocket, but the piece moved sideways after turning: no spin.
  const g = G();
  fillRow(g, 39, [1]);
  for (let x = 3; x < 10; x++) g.grid[38][x] = 'X';
  g.grid[37][0] = 'X';
  put(g, 'T', 2, 0, 37);
  g.lastAction = 'move';
  check('a T that slid into place is not a spin', R.tspinOf(g), 'none');
  g.lastAction = 'rotate';
  check('the same cells by rotation are', R.tspinOf(g), 'full');
  g.lastAction = 'fall';
  check('and gravity after the turn cancels it', R.tspinOf(g), 'none');
}
{
  // A mini: three corners filled but only one of the two front corners.
  const g = G();
  g.grid[39][0] = 'X';
  for (let x = 3; x < 10; x++) g.grid[39][x] = 'X';
  g.grid[37][0] = 'X'; g.grid[37][2] = 'X';
  put(g, 'T', 3, 0, 37);
  R.rotate(g, -1);
  check('three corners, one front corner open: a mini', R.tspinOf(g), 'mini');
  const ev = R.hardDrop(g);
  const spin = find(ev, 'spin');
  check('a mini with no lines is reported and pays 100', [spin && spin.tspin, spin && spin.points, g.score], ['mini', 100, 100]);
  ok('it does not start a chain', !g.b2b);
}
{
  const g = G();
  g.grid[39][0] = 'X';
  for (let x = 3; x < 10; x++) g.grid[39][x] = 'X';
  g.grid[37][0] = 'X'; g.grid[37][2] = 'X';
  put(g, 'T', 2, 0, 37);
  g.lastAction = 'rotate'; g.lastKick = 4;
  check('the deep fifth kick upgrades a mini to a full spin', R.tspinOf(g), 'full');
  g.grid[37][2] = 0;
  check('two corners is never a spin', R.tspinOf(g), 'none');
}
{
  // Pressed against the left wall, pointing right: two of its corners are
  // the wall itself.
  const g = G();
  put(g, 'T', 1, -1, 37);
  g.lastAction = 'rotate';
  g.grid[39][1] = 'X';
  check('the wall counts as two corners', R.tspinOf(g), 'mini');
  g.grid[37][1] = 'X';
  check('and with both front corners filled it is full', R.tspinOf(g), 'full');
}
{
  // Pointing up on the floor: the two back corners are below the well.
  const g = G();
  put(g, 'T', 0, 3, 38);
  g.lastAction = 'rotate';
  g.grid[38][3] = 'X';
  check('the floor counts as two corners', R.tspinOf(g), 'mini');
  g.grid[38][5] = 'X';
  check('and filling the front makes it full', R.tspinOf(g), 'full');
}

console.log('\n== hold ==');
{
  const g = G({}, 9);
  const first = g.piece.type, second = g.queue[0];
  const ev = R.hold(g);
  check('hold takes the falling piece', [g.hold, find(ev, 'hold').piece], [first, first]);
  check('and the next one comes in', g.piece.type, second);
  check('once per placement', R.hold(g), []);
  check('the piece is unchanged', g.piece.type, second);
  R.hardDrop(g);
  ok('a placement re-arms hold', !g.holdUsed);
  const third = g.piece.type;
  R.hold(g);
  check('now they swap', [g.hold, g.piece.type], [third, first]);
  check('a swapped-in piece spawns upright at the top', [g.piece.rot, g.piece.x], [0, 3]);
}

console.log('\n== game over ==');
{
  const g = G();
  for (let y = 17; y < 40; y++) for (let x = 3; x < 7; x++) g.grid[y][x] = 'X';
  const ev = R.spawn(g, null, []);
  check('a blocked spawn ends the game', [g.phase, g.overReason, types(ev)], ['over', 'blockout', ['over']]);
  check('nothing responds after that', [R.move(g, 1), R.rotate(g, 1), R.hardDrop(g), R.hold(g)], [[], [], [], []]);
}
{
  const g = G();
  put(g, 'I', 0, 3, 10);        // deep in the hidden buffer
  const ev = R.lock(g, []);
  check('a piece that sets entirely above the skyline locks out', [g.phase, g.overReason], ['over', 'lockout']);
  ok('with an over event', !!find(ev, 'over'));
}

console.log('\n== the clear delay ==');
{
  const g = R.newGame({ clearDelay: 320 }, 1);
  fillRow(g, 39, [0]);
  put(g, 'I', 1, -2, 36);
  const ev = R.hardDrop(g);
  ok('the clear is announced at once', !!find(ev, 'clear'));
  ok('but no new piece yet', !find(ev, 'spawn'));
  check('the full row stays lit', [g.phase, rowCount(g, 39)], ['clearing', 10]);
  check('input is refused meanwhile', R.move(g, 1), []);
  R.tick(g, 319, false);
  check('still lit at 319 ms', g.phase, 'clearing');
  const done = R.tick(g, 1, false);
  check('then it collapses and play resumes', [g.phase, types(done)], ['fall', ['collapse', 'spawn']]);
  check('the row is gone', rowCount(g, 39), 1);
}

console.log('\n== determinism ==');
{
  const script = (g) => {
    const log = [];
    for (let i = 0; i < 60; i++) {
      R.move(g, (i * 7) % 3 - 1);
      if (i % 3 === 0) R.rotate(g, 1);
      if (i % 5 === 0) R.hold(g);
      R.tick(g, 130, i % 4 === 0);
      if (i % 2 === 1) R.hardDrop(g);
      log.push(g.piece ? g.piece.type : '-');
    }
    return log.join('') + '|' + g.score + '|' + g.lines + '|' + g.grid.map((r) => r.join('')).join('/');
  };
  const a = script(G({}, 2024)), b = script(G({}, 2024));
  ok('the same seed and the same inputs replay to the same board', a === b);
  ok('a different seed does not', script(G({}, 2025)) !== a);
  const g = G({}, 2024);
  script(g);
  ok('sixty placements later the game is still consistent',
     g.grid.length === 40 && g.grid.every((r) => r.length === 10), 'grid ' + g.grid.length + 'x' + g.grid[0].length);
}

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' CHECKS PASSED' : pass + ' passed, ' + fail + ' FAILED'));
process.exit(fail ? 1 : 0);
