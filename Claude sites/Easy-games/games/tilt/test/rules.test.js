'use strict';

/* Easy Tilt - the rules engine test suite.
 *
 *   node games/tilt/test/rules.test.js
 *
 * The engine is pure: no canvas, no DOM, seeded randomness. That is the whole
 * reason it can be tested like this, and it is how every rule in the game was
 * actually verified rather than assumed. Exits non-zero on any failure.
 */
const fs = require('fs');
// rules.js is a plain script, not a module: it declares `const TiltRules = ...`,
// so it has to be evaluated in the global scope and then hoisted out.
(0, eval)(fs.readFileSync(require('path').join(__dirname, '..', 'js', 'rules.js'), 'utf8')
          + '\n;globalThis.TiltRules = TiltRules;');
const R = globalThis.TiltRules;
const K = R.KIND;

let pass = 0, fail = 0;
const check = (n, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log('  FAIL ' + n + '\n    got  ' + JSON.stringify(got) + '\n    want ' + JSON.stringify(want)); }
};
const ok = (n, c, d) => { if (c) pass++; else { fail++; console.log('  FAIL ' + n + (d ? '  ' + d : '')); } };

const B = (cfg, seed) => R.makeBoard(Object.assign({ specialChance: 0 }, cfg), seed == null ? 1 : seed);
const M = (b, colour, weight, kind) => R.makeMarble(b, { colour, weight, kind: kind || K.PLAIN });
const types = (ev) => ev.map(e => e.type);

console.log('\n== board shape ==');
{
  const b = B();
  check('four see-saws give eight pans', b.cols, 8);
  check('pan 5 is on see-saw 2', R.scaleOf(5), 2);
  check('pan 4 partners pan 5', R.partnerOf(4), 5);
  check('every column starts with a full depot', b.depot.map(d => d.length), [2,2,2,2,2,2,2,2]);
}

console.log('\n== capacity moves with the tilt ==');
{
  const b = B();
  check('a level pan holds seven', R.capacityOf(b, 0), 7);
  b.stacks[1].push(M(b, 0, 5));            // right pan heavier
  R.refreshTilt(b, 0);
  check('the pan tilted down holds eight', R.capacityOf(b, 1), 8);
  check('the raised pan holds only six', R.capacityOf(b, 0), 6);
}

console.log('\n== the core rule: the LIGHTER pan throws ==');
{
  // Use a see-saw in the MIDDLE of the board, so the throw lands on the board
  // rather than wrapping - a wrap swaps the marble for a transformed one and
  // would hide the identity this test is checking.
  const b = B();
  const lightTop = M(b, 1, 1);
  b.stacks[3].push(M(b, 0, 1), lightTop);      // right pan of see-saw 1: weight 2
  R.refreshTilt(b, 1);
  const ev = R.dropMarble(b, 2, M(b, 2, 4));   // slam its left pan
  const launch = ev.find(e => e.type === 'launch');
  ok('something was launched', !!launch, JSON.stringify(types(ev)));
  ok('it came from the LIGHT pan, not the heavy one', launch && launch.from === 3,
     'from ' + (launch && launch.from));
  ok('it was that pan\'s top marble', launch && launch.marble.id === lightTop.id);
  ok('it stayed on the board', launch && !launch.wrapped);
  check('the pan below it is untouched', b.stacks[3].length, 1);
}

console.log('\n== a wrapped launch arrives transformed ==');
{
  // The throw goes towards the heavy side, so to leave the board it must be
  // thrown at the RIGHT edge with the weight on the right.
  const b = B();
  const original = M(b, 1, 1);
  b.stacks[6].push(original);                  // light pan, will rise and throw right
  R.refreshTilt(b, 3);
  const ev = R.dropMarble(b, 7, M(b, 2, 6));   // difference 5, thrown off the right edge
  const launch = ev.find(e => e.type === 'launch');
  const wrap = ev.find(e => e.type === 'wrap');
  ok('it wrapped', launch && launch.wrapped, JSON.stringify(types(ev)));
  ok('a wrap event was reported', !!wrap);
  ok('the marble that lands is NOT the one that left', launch && launch.marble.id !== original.id);
  ok('a plain marble comes back as a Heart', launch && launch.marble.kind === K.HEART,
     'kind ' + (launch && launch.marble.kind));
}

console.log('\n== distance equals the weight difference ==');
{
  const mk = (heavy) => {
    const b = B();
    b.stacks[0].push(M(b, 0, 1));
    R.refreshTilt(b, 0);
    const ev = R.dropMarble(b, 1, M(b, 1, heavy));
    return ev.find(e => e.type === 'launch');
  };
  const a = mk(3);   // 3 vs 1 -> difference 2
  const c = mk(6);   // 6 vs 1 -> difference 5
  check('a difference of two flies two', a && a.distance, 2);
  check('a difference of five flies five', c && c.distance, 5);
  ok('further difference, further flight', Math.abs(c.distance) > Math.abs(a.distance));
}

console.log('\n== an empty raised pan has nothing to throw ==');
{
  const b = B();
  const ev = R.dropMarble(b, 1, M(b, 0, 5));    // left pan empty
  ok('the scale tilts', ev.some(e => e.type === 'tilt'), JSON.stringify(types(ev)));
  ok('but nothing is launched', !ev.some(e => e.type === 'launch'));
  ok('the board settles', R.isSettled(b));
}

console.log('\n== equal weight does not tip ==');
{
  const b = B();
  b.stacks[0].push(M(b, 0, 3));
  R.refreshTilt(b, 0);
  const ev = R.dropMarble(b, 1, M(b, 1, 3));
  check('the scale reads level', b.tilt[0], 0);
  ok('nothing flies', !ev.some(e => e.type === 'launch'));
}

console.log('\n== the edge is a ring, and it transforms ==');
{
  const b = B();
  b.stacks[7].push(M(b, 0, 1));
  R.refreshTilt(b, 3);
  // right pan of the last see-saw is col 7; make col 6 heavy so col 7 rises and throws right
  const ev = R.dropMarble(b, 6, M(b, 1, 9));
  const launch = ev.find(e => e.type === 'launch');
  ok('it launched off the far end', !!launch, JSON.stringify(types(ev)));
  ok('it wrapped around', launch && launch.wrapped, 'to ' + (launch && launch.to));
  ok('it came back inside the board', launch && launch.to >= 0 && launch.to < 8);
  ok('a plain marble returns as a Heart', launch && launch.marble.kind === K.HEART,
     'kind ' + (launch && launch.marble.kind));
}
{
  const b = B();
  const heart = M(b, 0, 0, K.HEART);
  check('a Heart crossing becomes a Bomb', R.transformOnWrap(b, heart).kind, K.BOMB);
  const bomb = M(b, 0, 0, K.BOMB);
  check('a Bomb crossing reverts to a Heart', R.transformOnWrap(b, bomb).kind, K.HEART);
  check('wrapping is arithmetic on a ring', R.wrapColumn(b, -1).col, 7);
  check('and the other way', R.wrapColumn(b, 8).col, 0);
}

console.log('\n== matching is horizontal only ==');
{
  const v = B();
  v.stacks[2].push(M(v, 1, 0), M(v, 1, 0), M(v, 1, 0));
  ok('three stacked vertically is NOT a clear', !R.findClear(v));

  const h = B();
  h.stacks[0].push(M(h, 1, 0));
  h.stacks[1].push(M(h, 1, 0));
  h.stacks[2].push(M(h, 1, 0));
  const c = R.findClear(h);
  ok('three side by side IS a clear', !!c);
  check('three cells', c && c.cells.length, 3);

  const two = B();
  two.stacks[0].push(M(two, 1, 0));
  two.stacks[1].push(M(two, 1, 0));
  ok('two side by side is not enough', !R.findClear(two));
}

console.log('\n== a trio floods to every connected marble of that colour ==');
{
  const b = B();
  // a row of three reds, with more reds attached above and beside
  b.stacks[0].push(M(b, 1, 0), M(b, 1, 0));   // red, red stacked
  b.stacks[1].push(M(b, 1, 0));
  b.stacks[2].push(M(b, 1, 0), M(b, 2, 0));   // red with a blue on top
  b.stacks[3].push(M(b, 1, 0));               // a fourth red, adjacent
  const c = R.findClear(b);
  ok('found a clear', !!c);
  ok('it swept up the attached reds too', c && c.cells.length >= 5,
     'swept ' + (c && c.cells.length));
  ok('the blue was left alone', c && !c.cells.some(x => x.col === 2 && x.row === 1));
}

console.log('\n== a joker stands in, it does not bridge two colours ==');
{
  const b = B();
  b.stacks[0].push(M(b, 1, 0));                 // red
  b.stacks[1].push(M(b, 0, 0, K.JOKER));
  b.stacks[2].push(M(b, 2, 0));                 // blue
  ok('red, joker, blue is NOT a trio', !R.findClear(b),
     'cleared ' + JSON.stringify(R.findClear(b)));

  const c = B();
  c.stacks[0].push(M(c, 1, 0));
  c.stacks[1].push(M(c, 0, 0, K.JOKER));
  c.stacks[2].push(M(c, 1, 0));                 // red again
  ok('red, joker, red IS a trio', !!R.findClear(c));

  // and the same rule vertically, for the five
  const d = B();
  d.stacks[3].push(M(d, 1, 0), M(d, 0, 0, K.JOKER), M(d, 2, 0), M(d, 0, 0, K.JOKER), M(d, 3, 0));
  ok('a joker-bridged stack is not a five', !R.findFive(d));
}

console.log('\n== matching runs in VISUAL rows, not array indices ==');
{
  // Same array index, different physical height because the pans are tilted.
  const b = B();
  b.stacks[1].push(M(b, 0, 9));                 // makes see-saw 0 lean right
  R.relevel(b, []);
  check('pan 0 rose', R.rowOffset(b, 0), -1);
  check('pan 1 sank', R.rowOffset(b, 1), 1);

  const c = B();
  c.stacks[1].push(M(c, 5, 9));                 // tilt first
  R.relevel(c, []);
  c.stacks[0].push(M(c, 1, 0));                 // raised pan, index 0
  c.stacks[2].push(M(c, 1, 0));                 // level pan, index 0
  c.stacks[3].push(M(c, 1, 0));                 // level pan, index 0
  ok('a raised pan does not line up with level ones', !R.findClear(c),
     'these three share an index but not a height');

  const d = B();
  d.stacks[1].push(M(d, 5, 9));
  R.relevel(d, []);
  d.stacks[2].push(M(d, 1, 0));
  d.stacks[3].push(M(d, 1, 0));
  d.stacks[4].push(M(d, 1, 0));
  ok('three level pans at the same height DO clear', !!R.findClear(d));
}

console.log('\n== a stone never clears ==');
{
  const b = B();
  b.stacks[0].push(M(b, 1, 0));
  b.stacks[1].push(M(b, 1, 0, K.STONE));
  b.stacks[2].push(M(b, 1, 0));
  ok('a stone breaks the run', !R.findClear(b));
}

console.log('\n== a joker stands in for any colour ==');
{
  const b = B();
  b.stacks[0].push(M(b, 1, 0));
  b.stacks[1].push(M(b, 0, 0, K.JOKER));
  b.stacks[2].push(M(b, 1, 0));
  const c = R.findClear(b);
  ok('the joker completes the trio', !!c, 'no clear found');
}

console.log('\n== five stacked melt into one ==');
{
  const b = B({ colours: 4 });
  for (let i = 0; i < 5; i++) b.stacks[3].push(M(b, 2, 2));
  const five = R.findFive(b);
  ok('a five is recognised', !!five);
  const ev = [];
  R.settle(b, ev, { depth: 1, guard: 0, flown: new Set() });
  const merge = ev.find(e => e.type === 'merge');
  ok('it merged', !!merge, JSON.stringify(types(ev)));
  check('one marble left in the pan', b.stacks[3].length, 1);
  check('carrying the combined weight', b.stacks[3][0].weight, 10);
}

console.log('\n== a trio beats a five ==');
{
  const b = B();
  for (let i = 0; i < 5; i++) b.stacks[0].push(M(b, 1, 0));   // a five, vertically
  b.stacks[1].push(M(b, 1, 0));                               // and a trio across the bottom
  b.stacks[2].push(M(b, 1, 0));
  const ev = [];
  R.settle(b, ev, { depth: 1, guard: 0, flown: new Set() });
  const first = ev.find(e => e.type === 'clear' || e.type === 'merge');
  check('the clear resolves first', first && first.type, 'clear');
}

console.log('\n== extras weigh nothing ==');
{
  const b = B();
  let heavy = [];
  for (const kind of [K.JOKER, K.BOMB, K.CRUSHER, K.COLZAP, K.TINT, K.COLJOKER,
                      K.ZAPTOP, K.ZAPROW, K.ZAPPILE, K.HEART, K.STONE, K.SILVER, K.GOLD]) {
    const m = R.makeMarble(b, { kind });
    if (m.weight !== 0) heavy.push(kind + '=' + m.weight);
  }
  check('every extra weighs nothing', heavy, []);
  const plain = R.makeMarble(b, {});
  ok('a plain marble does have weight', plain.weight > 0, 'weight ' + plain.weight);
}

console.log('\n== each extra does its job ==');
{
  // Bomb: 3x3
  let b = B();
  // Three columns of equal height, so a correct 3x3 really does span them.
  // Colours vary so nothing forms a trio and clears on its own.
  b.stacks[3].push(M(b, 0, 0), M(b, 1, 0), M(b, 2, 0));
  b.stacks[4].push(M(b, 1, 0), M(b, 2, 0));
  b.stacks[5].push(M(b, 2, 0), M(b, 0, 0), M(b, 1, 0));
  let ev = R.dropMarble(b, 4, M(b, 0, 0, K.BOMB));
  const blast = ev.find(e => e.type === 'blast');
  ok('the bomb blasts', !!blast, JSON.stringify(types(ev)));
  // It should take the neighbouring columns with it, not just its own.
  const hitCols = blast ? [...new Set(blast.cells.map(c => c.col))].sort() : [];
  check('the blast spans three columns', hitCols, [3, 4, 5]);
  // A bomb dropped normally lands on TOP of its pile, so its 3x3 can only reach
  // one marble down in its own column. The full square is only ever used by a
  // dormant bomb buried under others, which is the point of that mechanic.
  check('it reached one marble below itself', b.stacks[4].length, 1);

  // So prove the buried case really does use the whole square.
  b = B();
  b.stacks[3].push(M(b, 0, 0), M(b, 1, 0), M(b, 2, 0));
  b.stacks[5].push(M(b, 2, 0), M(b, 0, 0), M(b, 1, 0));
  R.dropMarble(b, 4, M(b, 0, 0, K.BOMB));          // lands on an empty pan, arms
  b.stacks[4].push(M(b, 1, 0), M(b, 2, 0));        // bury it
  const buried = R.dropMarble(b, 4, M(b, 0, 0));   // something lands on the pan
  const bb = buried.find(e => e.type === 'blast');
  ok('the buried bomb went off', !!bb, JSON.stringify(types(buried)));
  const rows = bb ? [...new Set(bb.cells.filter(c => c.col === 4).map(c => c.row))].sort() : [];
  ok('and it reached ABOVE itself as well as below', rows.length >= 2,
     'own-column rows hit: ' + JSON.stringify(rows));

  // Crusher: the whole pan
  b = B();
  for (let i = 0; i < 4; i++) b.stacks[2].push(M(b, i % 3, 0));
  R.dropMarble(b, 2, M(b, 0, 0, K.CRUSHER));
  check('the crusher empties the pan', b.stacks[2].length, 0);

  // Colour zap: every marble of that colour, board wide
  b = B();
  b.stacks[0].push(M(b, 1, 0));
  b.stacks[5].push(M(b, 1, 0));
  b.stacks[6].push(M(b, 2, 0));
  b.stacks[3].push(M(b, 1, 0));
  R.dropMarble(b, 3, M(b, 0, 0, K.COLZAP));
  const reds = b.stacks.flat().filter(m => m.colour === 1 && m.kind === K.PLAIN).length;
  check('every marble of that colour is gone', reds, 0);
  ok('other colours survive', b.stacks[6].length === 1);

  // Tint: repaint a pan
  b = B();
  b.stacks[7].push(M(b, 0, 0), M(b, 1, 0), M(b, 2, 0));
  R.dropMarble(b, 7, M(b, 0, 0, K.TINT));
  // Compare against a literal, not against a mapping of the array itself -
  // the old form passed on an empty pan too.
  check('the pan is not destroyed', b.stacks[7].length, 3);
  check('the whole pan takes the former top colour', b.stacks[7].map(m => m.colour), [2, 2, 2]);

  // Zap top: the top of every column
  b = B();
  // Colours must vary across columns or the leftover row is a trio and clears,
  // which would look exactly like the zap having removed too much.
  for (let c = 0; c < 8; c++) b.stacks[c].push(M(b, c % 3, 0), M(b, (c + 1) % 3, 0));
  const heightsBefore = b.stacks.map(s => s.length);
  R.dropMarble(b, 0, M(b, 0, 0, K.ZAPTOP));
  // Exactly one gone from every column, the landing column included. The old
  // assertion allowed "removed nothing but itself" to pass.
  check('every column lost exactly its top',
        b.stacks.map(s => s.length), heightsBefore.map(h => h - 1));

  // Landing on an empty pan cancels it (manual p.22).
  b = B();
  for (let c = 1; c < 8; c++) b.stacks[c].push(M(b, c % 3, 0), M(b, (c + 1) % 3, 0));
  const untouched = b.stacks.map(s => s.length);
  R.dropMarble(b, 0, M(b, 0, 0, K.ZAPTOP));
  check('an empty pan cancels a top zap', b.stacks.slice(1).map(s => s.length), untouched.slice(1));

  // Zap pile: everything beneath it
  b = B();
  for (let i = 0; i < 5; i++) b.stacks[6].push(M(b, i % 3, 0));
  R.dropMarble(b, 6, M(b, 0, 0, K.ZAPPILE));
  check('the pile is gone', b.stacks[6].length, 0);

  // Colour joker: turns a colour into jokers
  b = B();
  b.stacks[0].push(M(b, 2, 0));
  b.stacks[5].push(M(b, 2, 0));
  b.stacks[4].push(M(b, 2, 0));
  R.dropMarble(b, 4, M(b, 0, 0, K.COLJOKER));
  const jokers = b.stacks.flat().filter(m => m.kind === K.JOKER).length;
  check('every marble of that colour became a joker', jokers, 3);
}

console.log('\n== stars ==');
{
  const b = B();
  b.stacks[2].push(R.makeMarble(b, { kind: K.SILVER, weight: 0 }));
  b.stacks[3].push(R.makeMarble(b, { kind: K.SILVER, weight: 0 }));
  b.stacks[4].push(R.makeMarble(b, { kind: K.SILVER, weight: 0 }));
  b.stacks[5].push(M(b, 1, 0));
  b.stacks[6].push(M(b, 2, 0));
  const ev = [];
  R.settle(b, ev, { depth: 1, guard: 0, flown: new Set() });
  const sweep = ev.find(e => e.type === 'starclear');
  ok('three silver stars sweep the board', !!sweep, JSON.stringify(types(ev)));
  check('nothing at all is left', b.stacks.map(s => s.length), [0,0,0,0,0,0,0,0]);
  check('a silver sweep pays nothing', sweep && sweep.gain, 0);

  const g = B();
  for (const c of [2,3,4]) g.stacks[c].push(R.makeMarble(g, { kind: K.GOLD, weight: 0 }));
  g.stacks[5].push(M(g, 1, 0));
  const ev2 = [];
  R.settle(g, ev2, { depth: 1, guard: 0, flown: new Set() });
  const gs = ev2.find(e => e.type === 'starclear');
  ok('three gold stars sweep AND pay', gs && gs.gain > 0, 'gain ' + (gs && gs.gain));

  const m = B();
  m.stacks[1].push(R.makeMarble(m, { kind: K.SILVER, weight: 0 }),
                   R.makeMarble(m, { kind: K.SILVER, weight: 0 }));
  const ev3 = [];
  R.settle(m, ev3, { depth: 1, guard: 0, flown: new Set() });
  ok('two silver stacked melt into gold', m.stacks[1].length === 1 && m.stacks[1][0].kind === K.GOLD,
     JSON.stringify(m.stacks[1].map(x => x.kind)));

  const j = B();
  j.stacks[2].push(R.makeMarble(j, { kind: K.SILVER, weight: 0 }));
  j.stacks[3].push(R.makeMarble(j, { kind: K.JOKER, weight: 0 }));
  j.stacks[4].push(R.makeMarble(j, { kind: K.SILVER, weight: 0 }));
  ok('a joker cannot impersonate a star', !R.findClear(j));
}

console.log('\n== a bomb waits on an empty pan ==');
{
  const b = B();
  const ev = R.dropMarble(b, 3, M(b, 0, 0, K.BOMB));
  ok('it does not go off', !ev.some(e => e.type === 'blast'), JSON.stringify(types(ev)));
  ok('it is armed and waiting', ev.some(e => e.type === 'arm'));
  check('it is still sitting there', b.stacks[3].length, 1);

  b.stacks[2].push(M(b, 1, 0));
  b.stacks[4].push(M(b, 1, 0));
  const ev2 = R.dropMarble(b, 3, M(b, 2, 0));
  ok('landing on it sets it off', ev2.some(e => e.type === 'blast'), JSON.stringify(types(ev2)));
  check('the pan is cleared', b.stacks[3].length, 0);
}

console.log('\n== a row zap cuts a straight LINE ==');
{
  const b = B();
  b.stacks[1].push(M(b, 5, 9));                  // tilt see-saw 0
  R.relevel(b, []);
  // The zap always lands on TOP of its own pile, so for its line to cross
  // anything the other columns must be taller. Colours step per column so no
  // horizontal trio forms and clears the board out from under the test.
  for (let c = 0; c < 8; c++) {
    if (c === 4) continue;
    for (let i = 0; i < 4; i++) b.stacks[c].push(M(b, (c + i) % 3, 0));
  }
  b.stacks[4].push(M(b, 1, 0));

  const evRow = R.dropMarble(b, 4, M(b, 0, 0, K.ZAPROW));
  const rowBlast = evRow.find(e => e.type === 'blast');
  ok('the zap fired', !!rowBlast, JSON.stringify(types(evRow)));
  if (rowBlast) {
    const perCol = {};
    for (const c of rowBlast.cells) perCol[c.col] = (perCol[c.col] || 0) + 1;
    check('at most one cell per column', Object.values(perCol).filter(n => n > 1), []);
    check('it crossed every column', Object.keys(perCol).length, 8);
  }
}

console.log('\n== overflow uses the tilted capacity ==');
{
  const b = B();
  // make pan 0 the raised one, so it can only hold six
  b.stacks[1].push(M(b, 0, 9));
  R.refreshTilt(b, 0);
  check('raised capacity', R.capacityOf(b, 0), 6);
  for (let i = 0; i < 6; i++) b.stacks[0].push(M(b, i % 4, 0));
  ok('six is still legal', !b.over);
  const ev = R.dropMarble(b, 0, M(b, 3, 0));
  ok('the seventh overflows a raised pan', b.over, 'height ' + b.stacks[0].length);
  ok('and it is reported', ev.some(e => e.type === 'overflow'));
}

console.log('\n== a level is fifty marbles ==');
{
  const b = R.makeBoard({ specialChance: 0 }, 5);
  let levelled = 0;
  for (let i = 0; i < 50; i++) {
    if (b.over) break;
    const ev = R.dropFromDepot(b, i % 8);
    if (ev.some(e => e.type === 'level')) levelled++;
  }
  ok('either it levelled at fifty or the board filled first', levelled === 1 || b.over,
     'levelled ' + levelled + ' over ' + b.over + ' dropped ' + b.dropped);
}

console.log('\n== the depot refills ==');
{
  const b = B();
  const first = b.depot[3][0];
  R.dropFromDepot(b, 3);
  check('still two deep', b.depot[3].length, 2);
  ok('and the front one moved on', b.depot[3][0].id !== first.id);
}

console.log('\n== blasts and zaps respect the tilt ==');
{
  // A bomb's 3x3 is measured in VISUAL rows. With a tilted see-saw, array
  // indices and visual rows disagree by a whole ball, so an index-based blast
  // lands somewhere the player did not see it.
  const b = B();
  b.stacks[1].push(M(b, 5, 9));                 // tilt see-saw 0
  R.relevel(b, []);
  check('the pans really are offset', [R.rowOffset(b, 0), R.rowOffset(b, 1)], [-1, 1]);
  for (const c of [0, 1, 2]) for (let i = 0; i < 3; i++) b.stacks[c].push(M(b, (c + i) % 3, 0));
  const bomb = M(b, 0, 0, K.BOMB);
  b.stacks[1].push(bomb);
  // Read the centre BEFORE it detonates: the bomb removes itself, so afterwards
  // indexOf is -1 and every genuine cell would look like a stray.
  const centre = R.toVisual(b, 1, b.stacks[1].indexOf(bomb));
  const ev = [];
  R.applyExtra(b, 1, bomb, ev, { flown: new Set(), depth: 1, guard: 0 });
  const blast = ev.find(e => e.type === 'blast');
  ok('the bomb went off', !!blast);
  if (blast) {
    const rows = blast.cells.map(c => R.toVisual(b, c.col, c.row));
    const stray = rows.filter(r => Math.abs(r - centre) > 1);
    check('every cell hit is within one visual row of the bomb', stray, []);
  }
}
{
  // A row zap cuts one visual line, not a staircase of array indices.
  const b = B();
  b.stacks[1].push(M(b, 5, 9));
  R.relevel(b, []);
  for (let c = 0; c < 8; c++) for (let i = 0; i < 4; i++) b.stacks[c].push(M(b, (c * 2 + i) % 3, 0));
  const zap = M(b, 0, 0, K.ZAPROW);
  b.stacks[3].push(zap);
  const centre = R.toVisual(b, 3, b.stacks[3].indexOf(zap));
  const ev = [];
  R.applyExtra(b, 3, zap, ev, { flown: new Set(), depth: 1, guard: 0 });
  const blast = ev.find(e => e.type === 'blast');
  if (blast) {
    const rows = [...new Set(blast.cells.map(c => R.toVisual(b, c.col, c.row)))];
    check('every cell is on one single visual row', rows, [centre]);
  } else { fail++; console.log('  FAIL the row zap did nothing'); }
}

console.log('\n== three jokers are not a board sweep ==');
{
  const b = B();
  for (let c = 0; c < 8; c++) b.stacks[c].push(M(b, c % 5, 0));
  for (const c of [0, 1, 2]) b.stacks[c].push(M(b, 0, 0, K.JOKER));
  const before = R.totalMarbles(b);
  const clear = R.findClear(b);
  // Three wildcards must not clear every colour on the board; that sweep is
  // reserved for a trio of Stars.
  ok('a joker-only run does not take the whole board',
     !clear || clear.cells.length <= 3, clear ? 'cleared ' + clear.cells.length + ' of ' + before : 'no clear');
}

console.log('\n== colour joker makes real, weightless jokers ==');
{
  const b = B();
  b.stacks[0].push(M(b, 2, 7));
  b.stacks[5].push(M(b, 2, 4));
  b.stacks[4].push(M(b, 2, 3));
  R.dropMarble(b, 4, M(b, 0, 0, K.COLJOKER));
  const jokers = b.stacks.flat().filter(m => m.kind === K.JOKER);
  ok('it converted some', jokers.length > 0);
  check('and none of them kept a weight', jokers.filter(m => m.weight !== 0).map(m => m.weight), []);
}

console.log('\n== a colour zap spares extras and stars ==');
{
  const b = B();
  const star = R.makeMarble(b, { kind: K.SILVER, weight: 0, colour: 2 });
  const bomb = R.makeMarble(b, { kind: K.BOMB, weight: 0, colour: 2 });
  b.stacks[0].push(star);
  b.stacks[1].push(bomb);
  b.stacks[6].push(M(b, 2, 3));
  b.stacks[4].push(M(b, 2, 3));
  R.dropMarble(b, 4, M(b, 0, 0, K.COLZAP));
  ok('the star survived', b.stacks[0].indexOf(star) >= 0, 'stars are the level reward');
  ok('the bomb survived', b.stacks[1].indexOf(bomb) >= 0);
  check('but the plain marble of that colour is gone', b.stacks[6].length, 0);
}

console.log('\n== a blast reports the see-saw it moved ==');
{
  const b = B();
  b.stacks[0].push(M(b, 0, 5), M(b, 1, 5), M(b, 2, 5));
  b.stacks[1].push(M(b, 3, 1));
  R.relevel(b, []);
  const before = b.tilt[0];
  const ev = R.dropMarble(b, 0, M(b, 0, 0, K.CRUSHER));
  ok('the tilt actually changed', b.tilt[0] !== before, before + ' -> ' + b.tilt[0]);
  ok('and an event says so', ev.some(e => e.type === 'tilt'),
     'without this the drawn see-saw stays inverted: ' + JSON.stringify(types(ev)));
}

console.log('\n== force destroys a stone, colour cannot see one ==');
{
  const c = B();
  c.stacks[2].push(M(c, 0, 0), M(c, 0, 0, K.STONE), M(c, 1, 0));
  R.dropMarble(c, 2, M(c, 0, 0, K.CRUSHER));
  check('the crusher clears everything', c.stacks[2].length, 0);

  const z = B();
  z.stacks[2].push(M(z, 0, 0), M(z, 0, 0, K.STONE), M(z, 1, 0));
  R.dropMarble(z, 2, M(z, 0, 0, K.ZAPPILE));
  // The player guide is specific that a Stone goes "by using a cutter or zap
  // ball", so sparing them made the one marble meant to be removable by force
  // immune to most of the force in the game.
  check('the pile zap takes the stone too', z.stacks[2].length, 0);

  // Colour-targeting still cannot touch one, because a Stone shows no colour.
  const cz = B();
  cz.stacks[3].push(M(cz, 2, 1), M(cz, 2, 0, K.STONE));
  R.dropMarble(cz, 3, M(cz, 0, 0, K.COLZAP));
  ok('a colour zap leaves it alone', cz.stacks[3].some(m => m.kind === K.STONE));
}

console.log('\n== extras hide their colour from the colour readers ==');
{
  const t = B();
  t.stacks[7].push(M(t, 0, 0), M(t, 1, 0), M(t, 4, 0, K.STONE));
  R.dropMarble(t, 7, M(t, 6, 0, K.TINT));
  ok('tint does not adopt a stone\'s invisible colour',
     !t.stacks[7].some(m => m.kind === K.PLAIN && m.colour === 4),
     JSON.stringify(t.stacks[7].map(m => m.kind + '/' + m.colour)));

  const z = B();
  z.stacks[3].push(M(z, 0, 0, K.JOKER));
  z.stacks[5].push(M(z, 0, 0));
  R.dropMarble(z, 3, M(z, 6, 0, K.COLZAP));
  check('colour zap does not fire off a joker', z.stacks[5].length, 1);
}

console.log('\n== the level star keeps the depot at its drawn depth ==');
{
  const b = R.makeBoard({ specialChance: 0 }, 3);
  let starred = false;
  for (let i = 0; i < 50 && !b.over; i++) {
    const ev = R.dropFromDepot(b, i % 8);
    if (ev.some(e => e.type === 'level')) starred = true;
  }
  if (starred) {
    check('every queue is still exactly two deep', b.depot.map(d => d.length),
          b.depot.map(() => b.cfg.depotDepth));
    ok('and a star is waiting at the front of one of them',
       b.depot.some(d => d[0] && d[0].kind === K.SILVER),
       JSON.stringify(b.depot.map(d => d[0] && d[0].kind)));
  } else {
    ok('board filled before the level ended, nothing to check', true);
  }
}

console.log('\n== determinism ==');
{
  const run = (seed) => {
    const b = R.makeBoard({}, seed);
    const log = [];
    for (let i = 0; i < 80 && !b.over; i++) log.push(types(R.dropFromDepot(b, Math.floor(b.rng() * 8))).join(','));
    return log.join('|') + '#' + b.score;
  };
  ok('same seed replays exactly', run(42) === run(42));
  ok('different seed diverges', run(42) !== run(43));
}

console.log('\n== soak: 400 games ==');
{
  let crashes = 0, unsettled = 0, worst = 0, overs = 0, overCapWhileAlive = 0;
  for (let seed = 1; seed <= 400; seed++) {
    try {
      const b = R.makeBoard({}, seed);
      for (let i = 0; i < 300 && !b.over; i++) {
        const ev = R.dropFromDepot(b, Math.floor(b.rng() * 8));
        worst = Math.max(worst, ev.length);
        // The real invariant: while the game is still alive, no pan may sit
        // above its capacity. After the fatal drop one legitimately does.
        if (!b.over) {
          for (let c = 0; c < b.cols; c++) {
            if (b.stacks[c].length > R.capacityOf(b, c)) overCapWhileAlive++;
          }
          if (!R.isSettled(b)) unsettled++;
        }
      }
      if (b.over) overs++;
    } catch (e) { crashes++; if (crashes === 1) console.log('    ' + e.stack.split('\n').slice(0,3).join(' | ')); }
  }
  check('no crashes', crashes, 0);
  check('never left unsettled', unsettled, 0);
  ok('cascades stay bounded', worst < 200, 'longest event list ' + worst);
  ok('games do end', overs > 300, overs + '/400 ended in overflow');
  check('no pan ever sits over capacity while the game is alive', overCapWhileAlive, 0);
}


console.log('\n== the crane holds one marble, wherever it goes ==');
{
  const b = B({ jokerEvery: 0 }, 42);
  const held = R.pickUp(b, 0);
  ok('the crane loads from the column it starts over', !!held);
  check('that marble left the depot', b.depot[0].indexOf(held), -1);
  check('and the depot refilled behind it', b.depot[0].length, 2);

  // Walk the crane the whole way across. The marble must not change.
  const stillHeld = b.held;
  ok('moving does not swap the marble', stillHeld === held);

  // Drop it somewhere else entirely.
  const ev = R.dropFromDepot(b, 6);
  const landed = ev.find(e => e.type === 'land');
  ok('the marble that lands is the one we were carrying', landed.marble === held);
  ok('and it lands where we let go, not where we picked up', landed.col === 6);
}

console.log('\n== you are reloaded from where you dropped ==');
{
  const b = B({ jokerEvery: 0 }, 77);
  R.pickUp(b, 0);
  const wanted = b.depot[5][0];             // the bottom marble of a far column
  const above  = b.depot[5][1];
  const ev = R.dropFromDepot(b, 5);
  const reload = ev[ev.length - 1];
  check('the drop reports a reload', reload.type, 'reload');
  check('from the column dropped into', reload.col, 5);
  ok('the crane now holds that column\'s bottom marble', b.held === wanted);
  ok('the one above it fell down to take its place', b.depot[5][0] === above);
  check('and a fresh marble arrived on top', b.depot[5].length, 2);
}

console.log('\n== every fifteenth marble is a Joker ==');
{
  const b = B({ jokerEvery: 15 }, 5);
  // makeBoard already generated 16, so the counter is mid-cycle. Read it.
  const before = R.jokerIn(b);
  ok('the countdown is inside the cycle', before >= 1 && before <= 15, 'got ' + before);
  let seen = 0;
  for (let i = 0; i < before; i++) { const m = R.randomMarble(b); if (m.kind === K.JOKER) seen++; }
  check('the countdown lands exactly on a Joker', seen >= 1, true);
  check('and it resets to a full cycle', R.jokerIn(b), 15);

  // Over a long run the cadence holds regardless of the random extras.
  const c = B({ jokerEvery: 15, specialChance: 0 }, 9);
  let jok = 0;
  for (let i = 0; i < 1500; i++) if (R.randomMarble(c).kind === K.JOKER) jok++;
  check('exactly one in fifteen with no other extras in play', jok, 100);

  const d = B({ jokerEvery: 0 }, 9);
  let none = 0;
  for (let i = 0; i < 200; i++) if (R.randomMarble(d).kind === K.JOKER) none++;
  check('switching the cadence off stops them', none, 0);
  check('and the countdown reads zero', R.jokerIn(d), 0);
}

console.log('\n== the crane never runs dry ==');
{
  let empty = 0, wrong = 0, games = 0;
  for (let g = 0; g < 200; g++) {
    const b = R.makeBoard({}, g * 104729 + 3);
    R.pickUp(b, 3);
    games++;
    while (!b.over) {
      if (!b.held) { empty++; break; }
      const held = b.held;
      let best = 0;
      for (let c = 1; c < b.cols; c++) if (R.headroom(b, c) > R.headroom(b, best)) best = c;
      const ev = R.dropFromDepot(b, best);
      const landed = ev.find(e => e.type === 'land');
      if (landed && landed.marble !== held) wrong++;
      if (!b.over && !b.held) { empty++; break; }
    }
  }
  check('200 full games', games, 200);
  check('the crane was never empty mid-game', empty, 0);
  check('and never dropped a marble it was not holding', wrong, 0);
}


console.log('\n== Hearts match as Hearts, not by a colour nobody can see ==');
{
  // Three Hearts side by side, each carrying a DIFFERENT hidden colour. They are
  // all drawn as hearts, so they must clear as a group.
  const b = B({}, 3);
  b.stacks[2].push(M(b, 0, 0, K.HEART));
  b.stacks[3].push(M(b, 1, 0, K.HEART));
  b.stacks[4].push(M(b, 2, 0, K.HEART));
  const clear = R.findClear(b);
  ok('three Hearts of different hidden colours clear', !!clear);
  check('all three go', clear ? clear.cells.length : 0, 3);
  check('and it is a Heart clear, not a Star sweep', clear ? clear.star : 'x', null);
  check('reported as a Heart run', clear ? clear.kind : 'x', K.HEART);
}
{
  // A Heart must NOT complete a colour trio just because its hidden field agrees.
  const b = B({}, 3);
  b.stacks[2].push(M(b, 1, 3));
  b.stacks[3].push(M(b, 1, 3));
  b.stacks[4].push(M(b, 1, 0, K.HEART));   // same colour 1, but drawn as a heart
  check('a Heart never completes a colour line', R.findClear(b), null);
}
{
  // The game's own Extras screen: the Joker "can replace the heart and any color".
  const b = B({}, 3);
  b.stacks[2].push(M(b, 0, 0, K.HEART));
  b.stacks[3].push(M(b, 5, 0, K.JOKER));
  b.stacks[4].push(M(b, 2, 0, K.HEART));
  const clear = R.findClear(b);
  ok('a Joker stands in for a Heart', !!clear);
  check('and is taken with them', clear ? clear.cells.length : 0, 3);
}
{
  // But a Joker still cannot impersonate a Star, because a Star trio sweeps.
  const b = B({}, 3);
  b.stacks[2].push(M(b, 0, 0, K.SILVER));
  b.stacks[3].push(M(b, 0, 0, K.JOKER));
  b.stacks[4].push(M(b, 0, 0, K.SILVER));
  check('a Joker cannot fake a Star', R.findClear(b), null);
}
{
  // Hearts weigh nothing, so five stacked would merge into a weightless plain
  // marble and quietly stop being Hearts. They must not merge.
  const b = B({}, 3);
  for (let i = 0; i < 5; i++) b.stacks[1].push(M(b, i, 0, K.HEART));
  check('five stacked Hearts do not melt into a marble', R.findFive(b), null);
}
{
  // Nor may a Heart be swept up by a colour flood spreading past it.
  const b = B({}, 3);
  b.stacks[2].push(M(b, 1, 3));
  b.stacks[3].push(M(b, 1, 3));
  b.stacks[4].push(M(b, 1, 3));
  b.stacks[3].push(M(b, 1, 0, K.HEART));   // sits directly on a clearing marble
  const clear = R.findClear(b);
  ok('the colour trio still clears', !!clear);
  check('but the Heart above it survives', clear ? clear.cells.length : 0, 3);
}


console.log('\n== the throw goes TOWARDS the heavy side ==');
{
  // Weight on the RIGHT of the see-saw. The left pan rises and its marble must
  // travel right, over the pivot, not outward to the left.
  const b = B();
  const flier = M(b, 1, 1);
  b.stacks[2].push(flier);                     // left pan of see-saw 1, weight 1
  R.refreshTilt(b, 1);
  const ev = R.dropMarble(b, 3, M(b, 2, 4));   // right pan gets weight 4
  const l = ev.find(e => e.type === 'launch');
  ok('it launched', !!l, JSON.stringify(types(ev)));
  check('from the light left pan', l && l.from, 2);
  check('heavy on the right, so it flew right', l && l.dir, 1);
  check('three columns, the weight difference', l && l.distance, 3);
  check('landing on column 5', l && l.to, 5);
  ok('and it is the same marble, having stayed on the board', l && l.marble.id === flier.id);
}
{
  // Mirror image. Weight on the LEFT, so the right pan rises and throws left.
  const b = B();
  const flier = M(b, 1, 1);
  b.stacks[5].push(flier);                     // right pan of see-saw 2, weight 1
  R.refreshTilt(b, 2);
  const ev = R.dropMarble(b, 4, M(b, 2, 4));   // left pan gets weight 4
  const l = ev.find(e => e.type === 'launch');
  ok('it launched', !!l, JSON.stringify(types(ev)));
  check('from the light right pan', l && l.from, 5);
  check('heavy on the left, so it flew left', l && l.dir, -1);
  check('three columns again', l && l.distance, 3);
  check('landing on column 2', l && l.to, 2);
}
{
  // A difference of exactly one puts the marble in its own partner pan - the
  // heavy side of the same see-saw. That must not set off an endless exchange,
  // because moving weight onto the heavy side cannot flip the tilt back.
  const b = B();
  b.stacks[2].push(M(b, 1, 1));
  R.refreshTilt(b, 1);
  const ev = R.dropMarble(b, 3, M(b, 2, 2));
  const l = ev.find(e => e.type === 'launch');
  check('one column of difference', l && l.distance, 1);
  check('so it lands on its own partner pan', l && l.to, 3);
  ok('and the cascade terminates', types(ev).indexOf('cascadeCapped') === -1,
     JSON.stringify(types(ev)));
}
{
  // Direction must not depend on which see-saw it is, only on where the weight
  // sits. Sweep every see-saw and check both orientations.
  let wrong = 0;
  for (let sc = 0; sc < 4; sc++) {
    for (const heavyRight of [true, false]) {
      const b = B();
      const light = heavyRight ? sc * 2 : sc * 2 + 1;
      const heavy = heavyRight ? sc * 2 + 1 : sc * 2;
      b.stacks[light].push(M(b, 1, 1));
      R.refreshTilt(b, sc);
      const ev = R.dropMarble(b, heavy, M(b, 2, 3));
      const l = ev.find(e => e.type === 'launch');
      if (!l || l.dir !== (heavyRight ? 1 : -1)) wrong++;
    }
  }
  check('all eight see-saw orientations throw towards the weight', wrong, 0);
}


console.log('\n== a landing knows how it arrived ==');
{
  // Dropped from the crane.
  const b = B({}, 3);
  const ev = R.dropMarble(b, 4, M(b, 1, 2));
  const land = ev.find(e => e.type === 'land');
  check('a crane drop is not flown', land.flown, false);
}
{
  // Arrived by catapult. The animation starts its fall from the travel lane
  // rather than the crane, so getting this wrong snaps the marble to the top of
  // the screen for a frame and replays the whole descent.
  const b = B({}, 3);
  b.stacks[2].push(M(b, 1, 1));
  R.refreshTilt(b, 1);
  const ev = R.dropMarble(b, 3, M(b, 2, 4));
  const lands = ev.filter(e => e.type === 'land');
  check('two landings: the drop and the throw', lands.length, 2);
  check('the dropped one is not flown', lands[0].flown, false);
  check('the catapulted one is flown', lands[1].flown, true);
  const launch = ev.find(e => e.type === 'launch');
  ok('the launch carries the pre-wrap marble for the animation', !!launch.original);
}

console.log('\n== a saved game comes back exactly ==');
{
  const b = R.makeBoard({}, 4242);
  R.pickUp(b, 3);
  for (let i = 0; i < 60 && !b.over; i++) {
    let best = 0;
    for (let c = 1; c < b.cols; c++) if (R.headroom(b, c) > R.headroom(b, best)) best = c;
    R.dropFromDepot(b, best);
  }
  const wire = JSON.parse(JSON.stringify(R.serialize(b)));
  const r = R.restore(wire);
  ok('it restores', !!r);

  const shape = (x) => JSON.stringify({
    st: x.stacks.map(s => s.map(m => [m.id, m.kind, m.colour, m.weight, !!m.armed])),
    dp: x.depot.map(s => s.map(m => [m.id, m.kind, m.colour, m.weight])),
    held: [x.held.id, x.held.kind, x.held.colour, x.held.weight],
    tilt: x.tilt, level: x.level, dropped: x.dropped, score: x.score,
    cleared: x.cleared, chainBest: x.chainBest, since: x.since, over: x.over
  });
  check('every field survives the round trip', shape(r), shape(b));

  // The future has to match too, or the player resumes into a different game.
  // The lamps are the one thing a reload cannot carry (their clock is gone), so
  // the original is put back to a dark lamp before the replay, exactly as
  // restore leaves the copy.
  b.bonus = 1; b.bonusUntil = null;
  const play = (board) => {
    const out = [];
    for (let i = 0; i < 40 && !board.over; i++) {
      out.push(R.dropFromDepot(board, i % board.cols).map(e => e.type).join('|'));
    }
    return out.join('/') + '#' + board.score + '#' + board.level;
  };
  check('and so does the random stream', play(r), play(b));
}
{
  // A Bomb lying dormant on an empty pan must still be armed after a reload.
  const b = B({}, 5);
  R.dropMarble(b, 2, M(b, 0, 0, K.BOMB));
  ok('the bomb armed itself', !!b.stacks[2][0].armed);
  const r = R.restore(JSON.parse(JSON.stringify(R.serialize(b))));
  ok('a board whose crane was never loaded still restores', !!r);
  ok('and is still armed after a save and reload', r && !!r.stacks[2][0].armed);
  const ev = R.dropMarble(r, 2, M(r, 1, 3));
  ok('so it still goes off when something lands on it',
     ev.some(e => e.type === 'blast'), JSON.stringify(types(ev)));
}
{
  // Anything unrecognisable must return null rather than throw, so the game
  // falls back to a new game instead of dying on boot.
  const junk = [null, undefined, {}, [], 0, 'nonsense', { v: 99 }, { v: 1 },
                { v: 1, stacks: 'no' }, { v: 1, stacks: [] }];
  let threw = 0, nonNull = 0;
  for (const j of junk) {
    try { if (R.restore(j) !== null) nonNull++; } catch (e) { threw++; }
  }
  check('no hostile input throws', threw, 0);
  check('and none of it produces a board', nonNull, 0);
}
{
  // Ids must never be reissued, or the renderer animates the wrong marble.
  const b = R.makeBoard({}, 8);
  R.pickUp(b, 0);
  for (let i = 0; i < 30; i++) R.dropFromDepot(b, i % b.cols);
  const r = R.restore(JSON.parse(JSON.stringify(R.serialize(b))));
  const seen = new Set();
  for (const col of r.stacks) for (const m of col) seen.add(m.id);
  for (const col of r.depot) for (const m of col) seen.add(m.id);
  seen.add(r.held.id);
  const before = seen.size;
  for (let i = 0; i < 200; i++) seen.add(R.makeMarble(r, {}).id);
  check('200 fresh marbles collide with nothing restored', seen.size, before + 200);
}


console.log('\n== a hand-edited save cannot steer the engine ==');
{
  const good = () => {
    const b = R.makeBoard({}, 21);
    R.pickUp(b, 2);
    for (let i = 0; i < 12; i++) R.dropFromDepot(b, i % b.cols);
    return JSON.parse(JSON.stringify(R.serialize(b)));
  };

  // Fractional weight: produces a fractional launch distance, which indexes
  // stacks[3.5] and throws. Must be rejected outright.
  const w = good(); w.held.w = 2.5;
  check('a fractional weight is refused', R.restore(w), null);

  // Fractional colour: indexes past the palette and throws once per frame in
  // the draw loop.
  const c = good(); c.held.c = 2.5;
  check('a fractional colour is refused', R.restore(c), null);

  const i = good(); i.held.i = 1.5;
  check('a fractional id is refused', R.restore(i), null);

  const neg = good(); neg.held.w = -1;
  check('a negative weight is refused', R.restore(neg), null);

  const big = good(); big.held.c = 999;
  check('a colour outside the palette is refused', R.restore(big), null);

  // Junk in the two fields that reach the game-over card.
  const cb = good(); cb.chainBest = {};
  check('an object as chainBest is refused', R.restore(cb), null);
  const cl = good(); cl.cleared = 'lots';
  check('a string as cleared is refused', R.restore(cl), null);

  // Two marbles sharing an id: ctx.flown keys on the id, so the twin could
  // never be catapulted in the same cascade.
  const dupe = good();
  const first = dupe.stacks.find((col) => col.length);
  if (first) { dupe.held.i = first[0].i; check('a duplicated id is refused', R.restore(dupe), null); }

  // A stored cfg must not reach the engine, or a DEFAULTS change could never
  // reach a game already in progress.
  const cfg = good();
  cfg.cfg = { scales: 4, matchLen: 0, depotDepth: 400, maxCascade: 9e9, fiveLen: 1 };
  const r = R.restore(cfg);
  ok('a save with a hostile cfg still restores', !!r);
  check('but the cfg is rebuilt from defaults', r && r.cfg.matchLen, R.DEFAULTS.matchLen);
  check('depot depth too', r && r.cfg.depotDepth, R.DEFAULTS.depotDepth);
  ok('and the board is playable', (() => {
    try { R.dropFromDepot(r, 0); return true; } catch (e) { return false; }
  })());
}

console.log('\n== the crane position rides along ==');
{
  const b = R.makeBoard({}, 33);
  R.pickUp(b, 6);
  for (let i = 0; i < 8; i++) R.dropFromDepot(b, 6);
  b.crane = 6;
  const r = R.restore(JSON.parse(JSON.stringify(R.serialize(b))));
  check('where the player left it', r.crane, 6);

  b.crane = 0;
  const zero = R.restore(JSON.parse(JSON.stringify(R.serialize(b))));
  check('column zero is a real position, not a missing one', zero.crane, 0);

  const older = JSON.parse(JSON.stringify(R.serialize(b)));
  delete older.crane;
  const old = R.restore(older);
  ok('a save from before this field still restores', !!old);
  check('with no crane recorded', old.crane, null);

  const bad = JSON.parse(JSON.stringify(R.serialize(b)));
  bad.crane = 99;
  check('an out-of-range crane is discarded, not trusted', R.restore(bad).crane, null);
}


console.log('\n== the preview tells the truth about a fatal drop ==');
{
  // D1. Dropping into a RAISED pan that will tip DOWN: its capacity grows from
  // six to eight, so the move is safe. A capacity check on the current tilt
  // calls it fatal and tells the player not to make a legal, often best, move.
  const b = B({}, 1);
  b.stacks[0] = [M(b, 0, 10)];
  for (let i = 0; i < 6; i++) b.stacks[1].push(M(b, i % 3, 0));
  R.refreshTilt(b, 0);
  b.held = M(b, 1, 20);
  check('the raised pan holds only six right now', R.capacityOf(b, 1), 6);
  check('the old helper calls it fatal', R.wouldOverflow(b, 1), true);
  check('the prediction knows it is safe', R.predictDrop(b, 1).fatal, false);
}
{
  // D2. Dropping into an EMPTY pan levels the see-saw, which costs the full
  // partner pan its eighth slot. Nothing is thrown and nothing lands there, so
  // no check on the target column could ever see it coming.
  const b = B({}, 1);
  for (let i = 0; i < 8; i++) b.stacks[0].push(M(b, i % 3, 1));
  R.refreshTilt(b, 0);
  b.held = M(b, 1, 8);
  check('the old helper says the drop is safe', R.wouldOverflow(b, 1), false);
  const p = R.predictDrop(b, 1);
  check('but it ends the game', p.fatal, true);
  check('and the prediction names the pan that dies', p.overflowCol, 0);
}
{
  // A prediction must never touch the real board.
  const b = R.makeBoard({}, 77);
  R.pickUp(b, 3);
  for (let i = 0; i < 25; i++) R.dropFromDepot(b, i % b.cols);
  const shape = (x) => JSON.stringify({
    st: x.stacks.map(s => s.map(m => [m.id, m.kind, m.colour, m.weight])),
    dp: x.depot.map(s => s.map(m => m.id)),
    held: x.held.id, tilt: x.tilt, score: x.score, dropped: x.dropped,
    since: x.since, rng: x.rng.state(), over: x.over
  });
  const before = shape(b);
  for (let c = 0; c < b.cols; c++) R.predictDrop(b, c);
  check('predicting every column changes nothing', shape(b), before);

  // And the prediction must match what actually happens.
  const col = 4;
  const predicted = R.predictDrop(b, col);
  const actual = R.dropFromDepot(b, col);
  check('the predicted outcome is the real one', predicted.fatal, b.over);
  check('and the event sequence matches',
        predicted.events.map(e => e.type).join(','),
        actual.filter(e => e.type !== 'reload' && e.type !== 'level').map(e => e.type).join(','));
}
{
  // At scale: the prediction must agree with reality on every drop of every
  // game, in both directions. This is the measurement that matters.
  let falseAlarms = 0, missedDeaths = 0, drops = 0, deaths = 0, wrongCol = 0;
  for (let g = 0; g < 300; g++) {
    const b = R.makeBoard({}, g * 31337 + 7);
    R.pickUp(b, 3);
    while (!b.over && drops < 200000) {
      const col = (b.dropped * 7 + g) % b.cols;      // spread the drops around
      const p = R.predictDrop(b, col);
      const ev = R.dropFromDepot(b, col);
      drops++;
      const reallyDied = b.over;
      if (reallyDied) deaths++;
      if (p.fatal && !reallyDied) falseAlarms++;
      if (!p.fatal && reallyDied) missedDeaths++;
      if (reallyDied) {
        const spill = ev.find(e => e.type === 'overflow');
        if (spill && p.overflowCol !== spill.col) wrongCol++;
      }
    }
  }
  ok('a meaningful sample', drops > 20000 && deaths > 250, drops + ' drops, ' + deaths + ' deaths');
  check('never warns about a drop that is actually safe', falseAlarms, 0);
  check('never stays silent about a drop that ends the game', missedDeaths, 0);
  check('and always names the pan that overflows', wrongCol, 0);
}


console.log('\n== an extra is never matched on a colour nobody can see ==');
{
  // The armed Bomb is the one extra that sits on the board waiting to be set
  // off, so it was the one a colour clear could swallow - matched on a colour
  // field that is never drawn. Roughly one game in nineteen.
  const b = B({}, 1);
  b.stacks[0].push(M(b, 0, 1));
  b.stacks[1].push(M(b, 0, 1));
  b.stacks[2].push(M(b, 0, 1));
  const bomb = M(b, 0, 0, K.BOMB);          // same hidden colour as the trio
  bomb.armed = true;
  b.stacks[3].push(bomb, M(b, 1, 1));
  const clear = R.findClear(b);
  ok('the trio still clears', !!clear);
  check('but only the three ordinary marbles go', clear ? clear.cells.length : 0, 3);
  ok('the armed Bomb is untouched',
     !clear.cells.some((c) => c.col === 3 && c.row === 0));
}
{
  // Same rule from the other side: an extra must not START a colour run either.
  const b = B({}, 1);
  b.stacks[0].push(M(b, 2, 0, K.CRUSHER));
  b.stacks[1].push(M(b, 2, 1));
  b.stacks[2].push(M(b, 2, 1));
  check('an extra cannot be the third of a trio', R.findClear(b), null);
}
{
  // And a Joker is still wild for real colours.
  const b = B({}, 1);
  b.stacks[0].push(M(b, 3, 1));
  b.stacks[1].push(M(b, 9, 0, K.JOKER));
  b.stacks[2].push(M(b, 3, 1));
  ok('a Joker still bridges a colour', !!R.findClear(b));
}

console.log('\n== every special ball comes back off the ring as a Bomb ==');
{
  /* The manual is explicit: an ordinary ball thrown out of the field returns as
     a Heart, and a Heart "as well as every other special ball" returns as a
     Bomb, and the other way round. So throwing a Star out really does cost you
     the Star - a risk the player is meant to manage, not a defect. An earlier
     pass here exempted Stars on the reasoning that destroying a level reward
     could not be intended; that was a design opinion, and the manual overrules
     it. */
  const b = B({}, 1);
  b.stacks[6].push(M(b, 0, 0, K.GOLD));
  R.refreshTilt(b, 3);
  const ev = R.dropMarble(b, 7, M(b, 1, 9));
  const l = ev.find((e) => e.type === 'launch');
  ok('the star was thrown off the edge', l && l.wrapped);
  check('and a thrown Star is lost, returning as a Bomb', l && l.marble.kind, K.BOMB);
  ok('so it is a different marble', l && l.marble !== l.original);
  ok('and the transformation is announced', ev.some((e) => e.type === 'wrap'));
}
{
  const b = B({}, 1);
  b.stacks[6].push(M(b, 0, 1));
  R.refreshTilt(b, 3);
  const l = R.dropMarble(b, 7, M(b, 1, 9)).find((e) => e.type === 'launch');
  check('an ordinary marble returns as a Heart', l && l.marble.kind, K.HEART);
}
{
  const b = B({}, 1);
  b.stacks[6].push(M(b, 0, 0, K.HEART));
  R.refreshTilt(b, 3);
  const l = R.dropMarble(b, 7, M(b, 1, 9)).find((e) => e.type === 'launch');
  check('and a Heart returns as a Bomb', l && l.marble.kind, K.BOMB);
}
{
  const b = B({}, 1);
  b.stacks[6].push(M(b, 0, 0, K.BOMB));
  R.refreshTilt(b, 3);
  const l = R.dropMarble(b, 7, M(b, 1, 9)).find((e) => e.type === 'launch');
  check('a Bomb comes back the other way, as a Heart', l && l.marble.kind, K.HEART);
}

console.log('\n== a blast that wraps onto itself is counted once ==');
{
  // Two columns only, so a 3x3 blast reaches round the ring onto its own
  // neighbour twice. Scoring the duplicate paid for a marble that was not there.
  const b = B({ scales: 1 }, 1);
  for (let i = 0; i < 3; i++) { b.stacks[0].push(M(b, 0, 1)); b.stacks[1].push(M(b, 1, 1)); }
  const before = R.totalMarbles(b);
  const scoreBefore = b.score;
  const ev = R.dropMarble(b, 0, M(b, 2, 0, K.BOMB));
  const blast = ev.find((e) => e.type === 'blast');
  const keys = blast.cells.map((c) => c.col + ':' + c.row);
  check('no cell is named twice', keys.length, new Set(keys).size);
  const removed = before + 1 - R.totalMarbles(b);
  check('and the score matches the marbles actually removed',
        b.score - scoreBefore, removed * 12);
}

console.log('\n== five wilds are not a merge ==');
{
  const b = B({}, 1);
  for (let i = 0; i < 5; i++) b.stacks[1].push(M(b, i % 3, 0, K.JOKER));
  check('five Jokers have no colour to merge into', R.findFive(b), null);
}
{
  const b = B({}, 1);
  for (let i = 0; i < 5; i++) b.stacks[0].push(M(b, 1, 0, K.BOMB));
  check('and five extras sharing a hidden colour do not merge', R.findFive(b), null);
}
{
  // Four Jokers plus one real colour DOES merge, into that colour.
  const b = B({}, 1);
  for (let i = 0; i < 4; i++) b.stacks[2].push(M(b, 7, 0, K.JOKER));
  b.stacks[2].push(M(b, 2, 6));
  const five = R.findFive(b);
  ok('four wilds and a red still merge', !!five);
  const ev = R.settle(b, [], { flown: new Set(), depth: 1, guard: 0 }) || [];
  const merged = b.stacks[2][0];
  check('into the real colour, not a hidden one', merged.colour, 2);
  check('carrying the combined weight', merged.weight, 6);
}

console.log('\n== a configured minimum weight is honoured ==');
{
  const b = R.makeBoard({ weightMin: 15, weightMax: 3 }, 1);
  const r = R.weightRangeFor(b);
  ok('the clamp never inverts the range', r.max >= r.min, JSON.stringify(r));
}


console.log('\n== two boards, one ring ==');
{
  const [a, z] = R.link(B({}, 1), B({}, 2), K.STONE);
  ok('they know each other', a.neighbour === z && z.neighbour === a);
  check('and know which side they are', [a.side, z.side], [0, 1]);

  // Off the RIGHT edge arrives at their LEFT columns.
  a.stacks[6].push(M(a, 0, 1));
  R.refreshTilt(a, 3);
  const ev = R.dropMarble(a, 7, M(a, 1, 4));
  const l = ev.find((e) => e.type === 'launch');
  ok('the throw crossed', l && l.crossed);
  check('into the other field', l.toSide, 1);
  check('arriving as an attack marble', l.marble.kind, K.STONE);
  check('and it really landed there', z.stacks[l.to].length, 1);
  check('the landing is stamped with the receiving board', 
        ev.filter((e) => e.type === 'land').map((e) => e.side), [0, 1]);
}
{
  // Off the LEFT edge arrives at their RIGHT columns, so the ring really is
  // closed rather than one field simply overflowing into the other.
  const [a, z] = R.link(B({}, 1), B({}, 2), K.HEART);
  a.stacks[1].push(M(a, 0, 1));
  R.refreshTilt(a, 0);
  const l = R.dropMarble(a, 0, M(a, 1, 4)).find((e) => e.type === 'launch');
  ok('it crossed the other way', l && l.crossed && l.toSide === 1);
  ok('landing in their right-hand half', l.to >= 4, 'column ' + l.to);
  check('and Competition mode sends Hearts, not Stones', l.marble.kind, K.HEART);
}
{
  // Every throw distance must land somewhere sensible on the joint ring.
  const [a, z] = R.link(B({}, 1), B({}, 2), K.STONE);
  let bad = 0;
  for (let raw = -40; raw <= 40; raw++) {
    const w = R.landingFor(a, raw);
    if (!w.board || w.col < 0 || w.col >= 8) bad++;
    if (w.board !== a && w.board !== z) bad++;
  }
  check('81 throw distances all land legally', bad, 0);
  check('straight ahead stays home', R.landingFor(a, 3).board === a, true);
  check('one past the right edge is their column 0', R.landingFor(a, 8).col, 0);
  check('and it is their board', R.landingFor(a, 8).board === z, true);
  check('one past the left edge is their column 7', R.landingFor(a, -1).col, 7);
  check('a full lap comes home', R.landingFor(a, 16).board === a, true);
}

console.log('\n== clears earn extras, and the parity decides whose they are ==');
{
  /* The manual: extras stop falling into your supply in Arcade and must be
     earned by clearing. An ODD count pays you something useful; an EVEN count
     pays you a weapon that only works once thrown into someone else's field.
     Nothing crosses on its own - an earlier build of this had a clear spraying
     stones at the opponent, which is nowhere in the manual. */
  const [a, z] = R.link(B({}, 1), B({}, 2), K.STONE);
  a.earnExtras = true; z.earnExtras = true;

  a.stacks[0].push(M(a, 1, 1));
  a.stacks[1].push(M(a, 1, 1));
  const beforeOpponent = R.totalMarbles(z);
  const ev = R.dropMarble(a, 2, M(a, 1, 1));
  const clear = ev.find((e) => e.type === 'clear');
  const earn = ev.find((e) => e.type === 'earn');
  check('the trio cleared three', clear.cells.length, 3);
  ok('and it paid out an extra', !!earn);
  check('an odd clear is for yourself', earn.attack, false);
  ok('drawn from the helpful pool', R.HELPFUL.indexOf(earn.kind) >= 0, earn.kind);
  check('and NOTHING was sent to the opponent', R.totalMarbles(z) - beforeOpponent, 0);
  check('no send events exist any more', ev.filter((e) => e.type === 'send').length, 0);
}
{
  // A four is an even clear, so it pays a weapon instead. Everything weighs
  // nothing, so no see-saw tips and no visual row shifts under the trio.
  const [a, z] = R.link(B({}, 7), B({}, 8), K.STONE);
  a.earnExtras = true;
  a.stacks[0].push(M(a, 1, 0));
  a.stacks[1].push(M(a, 1, 0), M(a, 1, 0));   // the fourth, stacked so it floods in
  const before = R.totalMarbles(z);
  const ev = R.dropMarble(a, 2, M(a, 1, 0));
  const clear = ev.find((e) => e.type === 'clear');
  const earn = ev.find((e) => e.type === 'earn');
  check('exactly four came out', clear.cells.length, 4);
  ok('which is an even clear', clear.cells.length % 2 === 0);
  check('so the extra is an attack', earn.attack, true);
  ok('drawn from the arsenal', R.ATTACKS.indexOf(earn.kind) >= 0, earn.kind);
  check('and still nothing crossed by itself', R.totalMarbles(z) - before, 0);
}
{
  // The earned extra lands in the depot, not in your hand.
  const b = B({}, 5);
  b.earnExtras = true;
  const depotBefore = b.depot.map((d) => d.map((m) => m.id).join(','));
  b.stacks[0].push(M(b, 1, 1));
  b.stacks[1].push(M(b, 1, 1));
  const ev = R.dropMarble(b, 2, M(b, 1, 1));
  const earn = ev.find((e) => e.type === 'earn');
  ok('it names the depot column it went to', earn && earn.col >= 0 && earn.col < b.cols);
  check('and that column really changed', b.depot[earn.col][0].kind, earn.kind);
  // It may stand one deeper than the drawn depth until it drains: nothing is
  // ever evicted to make room, since that destroyed marbles the player could see.
  ok('and nothing waiting there was destroyed',
     depotBefore[earn.col].split(',').filter(Boolean)
       .every((id) => b.depot[earn.col].some((m) => String(m.id) === id)));
}

console.log('\n== an attack extra is inert until it has crossed ==');
{
  const [a, z] = R.link(B({}, 3), B({}, 4), K.STONE);
  // Dropped at home it must do nothing at all.
  a.stacks[4].push(M(a, 1, 1), M(a, 2, 1));
  const heights = a.stacks.map((c) => c.length);
  const ev = R.dropMarble(a, 4, M(a, 0, 0, K.STONEMAKER));
  ok('it reports itself inert', ev.some((e) => e.type === 'inert'));
  check('nothing turned to stone', a.stacks[4].filter((m) => m.kind === K.STONE).length, 0);
  check('and it just sits there', a.stacks[4].length, heights[4] + 1);
}
{
  // Thrown across, it arrives as itself and goes off.
  const [a, z] = R.link(B({}, 3), B({}, 4), K.STONE);
  for (let c = 0; c < 8; c++) z.stacks[c].push(M(z, 1, 1), M(z, 2, 1));
  const weapon = M(a, 0, 0, K.STONEMAKER);
  a.stacks[6].push(weapon);
  R.refreshTilt(a, 3);
  const ev = R.dropMarble(a, 7, M(a, 1, 4));
  const cross = ev.find((e) => e.type === 'cross');
  ok('it crossed', !!cross);
  check('it was an attack extra that crossed, not a converted stone', cross.was, K.STONEMAKER);
  check('and arrives armed', cross.armed, true);
  ok('turning part of their board to stone',
     z.stacks.reduce((n, c) => n + c.filter((m) => m.kind === K.STONE).length, 0) > 0);
}
{
  // An ordinary marble still converts on the way over.
  const [a, z] = R.link(B({}, 3), B({}, 4), K.STONE);
  a.stacks[6].push(M(a, 0, 1));
  R.refreshTilt(a, 3);
  const cross = R.dropMarble(a, 7, M(a, 1, 4)).find((e) => e.type === 'cross');
  check('an ordinary marble arrives as a Stone in Arcade', cross.marble.kind, K.STONE);
}
{
  const [a, z] = R.link(B({}, 3), B({}, 4), K.HEART);
  a.stacks[6].push(M(a, 0, 1));
  R.refreshTilt(a, 3);
  const cross = R.dropMarble(a, 7, M(a, 1, 4)).find((e) => e.type === 'cross');
  check('and as a Heart in Competition', cross.marble.kind, K.HEART);
}

console.log('\n== a match cannot run away with itself ==');
{
  // Two boards feeding each other must not volley one cascade forever.
  let worst = 0, capped = 0, crashes = 0, matches = 0, drops = 0;
  for (let m = 0; m < 60; m++) {
    const pair = R.link(R.makeBoard({}, m * 7919 + 3), R.makeBoard({}, m * 104729 + 5), K.STONE);
    pair[0].sendPerClear = 1; pair[1].sendPerClear = 1;
    R.pickUp(pair[0], 3); R.pickUp(pair[1], 3);
    matches++;
    try {
      while (!pair[0].over && !pair[1].over && drops < 40000) {
        for (let s = 0; s < 2; s++) {
          if (pair[s].over) continue;
          let best = 0;
          for (let c = 1; c < 8; c++) if (R.headroom(pair[s], c) > R.headroom(pair[s], best)) best = c;
          const ev = R.dropFromDepot(pair[s], best);
          worst = Math.max(worst, ev.length);
          if (ev.some((e) => e.type === 'cascadeCapped')) capped++;
          drops++;
        }
      }
    } catch (e) { crashes++; if (crashes === 1) console.log('    ' + e.stack.split('\n')[0]); }
  }
  check('no crashes across 60 matches', crashes, 0);
  check('the cascade valve never trips', capped, 0);
  ok('every match ends', drops < 40000, drops + ' drops over ' + matches + ' matches');
  ok('and no single drop explodes', worst < 400, 'longest event list ' + worst);
}

console.log('\n== previewing a match never touches the opponent ==');
{
  const [a, z] = R.link(R.makeBoard({}, 11), R.makeBoard({}, 22), K.STONE);
  a.sendPerClear = 1; z.sendPerClear = 1;
  R.pickUp(a, 3); R.pickUp(z, 3);
  for (let i = 0; i < 25; i++) { R.dropFromDepot(a, i % 8); R.dropFromDepot(z, (i * 3) % 8); }
  const shape = (x) => JSON.stringify({
    st: x.stacks.map((s) => s.map((m) => [m.id, m.kind, m.colour, m.weight])),
    held: x.held.id, tilt: x.tilt, score: x.score, dropped: x.dropped,
    rng: x.rng.state(), over: x.over
  });
  const beforeA = shape(a), beforeZ = shape(z);
  for (let n = 0; n < 25; n++) for (let c = 0; c < 8; c++) { R.predictDrop(a, c); R.predictDrop(z, c); }
  check('400 previews leave our own board alone', shape(a), beforeA);
  check('and leave the opponent completely alone', shape(z), beforeZ);
  ok('the link survives', a.neighbour === z && z.neighbour === a);
}


console.log('\n== REVIEW: a marble thrown across can end the opponent right now ==');
{
  /* The reviewer's soak found zero kills ever registering at the attacking
     drop: overflow was only checked on the board that dropped, so the victim
     survived over capacity until their own next move, which then got blamed. */
  const [a, z] = R.link(B({}, 1), B({}, 2), K.STONE);
  for (let i = 0; i < 7; i++) { z.stacks[0].push(M(z, i % 3, 1)); z.stacks[1].push(M(z, i % 3, 1)); }
  R.refreshTilt(z, 0);
  check('their pans are full but legal', [R.capacityOf(z, 0), z.stacks[0].length], [7, 7]);
  a.stacks[6].push(M(a, 0, 1));
  R.refreshTilt(a, 3);
  const p = R.predictDrop(a, 7, M(a, 1, 3));
  check('the preview knows this drop kills them', p.kills, true);
  const ev = R.dropMarble(a, 7, M(a, 1, 3));
  ok('the marble crossed', ev.some((e) => e.type === 'cross'));
  check('and the opponent is over NOW, not next turn', z.over, true);
  ok('with an overflow event stamped on their board', ev.some((e) => e.type === 'overflow' && e.side === 1));
}

console.log('\n== REVIEW: every colour-reading extra reads a visible colour ==');
{
  const b = B({}, 3);
  b.stacks[0].push(M(b, 0, 1), M(b, 1, 1), M(b, 2, 0, K.HEART));   // hidden colour 2 on top
  R.dropMarble(b, 0, M(b, 5, 0, K.TINT));
  check('a Tint landing on a Heart repaints nothing', b.stacks[0].map((m) => m.colour).slice(0, 2), [0, 1]);
}
{
  const b = B({}, 3);
  b.stacks[0].push(M(b, 0, 1), M(b, 1, 0, K.SILVER));               // a Star with hidden colour 1
  b.stacks[3].push(M(b, 1, 2), M(b, 1, 2));
  R.dropMarble(b, 0, M(b, 4, 0, K.COLZAP));
  check('a Colour Zap landing on a Star destroys nothing elsewhere', b.stacks[3].length, 2);
  ok('and the Star survives', b.stacks[0].some((m) => m.kind === K.SILVER));
}
{
  const b = B({}, 3);
  b.stacks[0].push(M(b, 1, 0, K.HEART));
  b.stacks[4].push(M(b, 1, 2));
  R.dropMarble(b, 0, M(b, 4, 0, K.COLJOKER));
  check('a Colour Joker landing on a Heart turns nothing wild', b.stacks[4][0].kind, K.PLAIN);
}
{
  const b = B({}, 3);
  b.stacks[2].push(M(b, 0, 1), M(b, 1, 1), M(b, 2, 0, K.JOKER));
  R.dropMarble(b, 2, M(b, 6, 0, K.TINT3));
  check('a Tint 3x3 on a Joker does not paint the Tint\'s own hidden colour', b.stacks[2].map((m) => m.colour).slice(0, 2), [0, 1]);
}

console.log('\n== REVIEW: a Colour Bomb lays mines, it does not fire them ==');
{
  const b = B({}, 3);
  b.stacks[3].push(M(b, 1, 1), M(b, 1, 1));
  b.stacks[0].push(M(b, 1, 1));
  const ev = R.dropMarble(b, 3, M(b, 4, 0, K.COLBOMB));
  // Every self-removing extra emits a 'blast' for its own cell. A detonating
  // mine is the one stamped with the Bomb's kind, and there must be none.
  ok('no mine exploded in the same landing', !ev.some((e) => e.type === 'blast' && e.kind === K.BOMB), JSON.stringify(types(ev)));
  check('three mines are armed', b.stacks.reduce((n, c) => n + c.filter((m) => m.kind === K.BOMB && m.armed).length, 0), 3);
  const ev2 = R.dropMarble(b, 3, M(b, 2, 1));
  ok('the next thing to land on one sets it off', ev2.some((e) => e.type === 'blast'));
}

console.log('\n== REVIEW: nothing is "wasted" by a marble that never had an effect ==');
{
  for (const kind of [K.HEART, K.JOKER, K.SILVER, K.GOLD]) {
    const b = B({}, 3);
    const ev = R.dropMarble(b, 2, M(b, 0, 0, kind));
    ok('a ' + kind + ' on an empty pan does not fizzle', !ev.some((e) => e.type === 'fizzle'));
  }
  const b = B({}, 3);
  ok('a Crusher on an empty pan still does', R.dropMarble(b, 2, M(b, 0, 0, K.CRUSHER)).some((e) => e.type === 'fizzle'));
}

console.log('\n== REVIEW: a Stone off the edge is a special ball, so it comes back a Bomb ==');
{
  const b = B({}, 1);
  b.stacks[6].push(M(b, 0, 0, K.STONE));
  R.refreshTilt(b, 3);
  const l = R.dropMarble(b, 7, M(b, 1, 9)).find((e) => e.type === 'launch');
  check('a thrown Stone returns as a Bomb', l && l.marble.kind, K.BOMB);
}

console.log('\n== REVIEW: Tower fills to the brim, not over it ==');
{
  const [a, z] = R.link(B({}, 3), B({}, 4), K.STONE);
  z.stacks[0].push(M(z, 1, 1), M(z, 2, 1));
  R.refreshTilt(z, 0);                                   // col 0 down: capacity 8
  const tower = M(a, 0, 0, K.TOWER); tower.crossed = true;
  R.landMarble(z, 0, tower, [], { flown: new Set(), depth: 1, guard: 0 }, true);
  check('the column is exactly at capacity', z.stacks[0].length, R.capacityOf(z, 0));
  R.dropMarble(z, 3, M(z, 0, 1));
  check('and the game is not over by itself', z.over, false);
}

console.log('\n== REVIEW: a Blocker stays put and seals both neighbours, drops AND throws ==');
{
  const [a, z] = R.link(B({}, 3), B({}, 4), K.STONE);
  z.stacks[5].push(M(z, 1, 1));
  const blocker = M(a, 0, 0, K.BLOCKER); blocker.crossed = true;
  const ev = [];
  R.landMarble(z, 5, blocker, ev, { flown: new Set(), depth: 1, guard: 0 }, true);
  ok('it is still on the board', z.stacks[5].some((m) => m.kind === K.BLOCKER));
  check('columns 4 and 6 are sealed', [R.isBlocked(z, 4), R.isBlocked(z, 6), R.isBlocked(z, 5)], [true, true, false]);
  R.pickUp(z, 4);
  check('a drop into a sealed column is refused', R.dropFromDepot(z, 4)[0].type, 'rejected');
  // A throw aimed at column 4 carries on past it.
  z.stacks[2].push(M(z, 1, 1));
  R.refreshTilt(z, 1);
  const l = R.dropMarble(z, 3, M(z, 2, 3)).find((e) => e.type === 'launch');
  check('distance two from column 2 would be column 4', l && l.distance, 2);
  ok('but it landed past the seal', l && l.to !== 4, 'landed ' + (l && l.to));
  // Destroy the Blocker and the seal lifts.
  R.dropMarble(z, 5, M(z, 0, 0, K.CRUSHER));
  check('a Crusher removes it', z.stacks[5].length, 0);
  check('and the seal is gone', R.isBlocked(z, 4), false);
}

console.log('\n== REVIEW: shapes stop at the walls ==');
{
  const b = B({}, 3);
  b.stacks[0].push(M(b, 1, 1), M(b, 2, 1));
  b.stacks[7].push(M(b, 1, 1), M(b, 2, 1));
  R.dropMarble(b, 0, M(b, 0, 0, K.BOMB));
  check('a Bomb at column 0 does not reach round to column 7', b.stacks[7].length, 2);
  const c = B({}, 3);
  c.stacks[0].push(M(c, 1, 1), M(c, 2, 1));
  c.stacks[7].push(M(c, 1, 1), M(c, 2, 1));
  const st = M(c, 0, 0, K.STONEMAKER); st.crossed = true;
  R.landMarble(c, 0, st, [], { flown: new Set(), depth: 1, guard: 0 }, true);
  check('nor does a Stonemaker', c.stacks[7].filter((m) => m.kind === K.STONE).length, 0);
}
{
  // Flash Diagonal paints only downward.
  // Colours staggered so nothing on the board can form a trio and clear.
  const b = B({}, 3);
  for (let col = 0; col < 8; col++) for (let r = 0; r < 4; r++) b.stacks[col].push(M(b, (col * 2 + r) % 6, 0));
  b.stacks[3].pop(); b.stacks[3].push(M(b, 7, 0));            // target colour 7 under the landing
  const wasColour = new Map();
  b.stacks.forEach((c) => c.forEach((m) => wasColour.set(m.id, m.colour)));
  R.dropMarble(b, 3, M(b, 0, 0, K.FLASHDIAG));
  const painted = [];
  b.stacks.forEach((c, col) => c.forEach((m, r) => { if (wasColour.get(m.id) !== 7 && m.colour === 7) painted.push([col, r]); }));
  ok('something was painted', painted.length > 0);
  ok('every painted cell sits BELOW the landing row', painted.every(([col, r]) => R.toVisual(b, col, r) < 4),
     JSON.stringify(painted));
}

console.log('\n== REVIEW: the score formula weighs the marbles ==');
{
  const light = B({}, 3), heavy = B({}, 3);
  for (const [b, w] of [[light, 1], [heavy, 5]]) {
    b.stacks[0].push(M(b, 1, w)); b.stacks[1].push(M(b, 1, w));
    R.dropMarble(b, 2, M(b, 1, w));
  }
  ok('the same trio built from heavier marbles pays more', heavy.score > light.score, light.score + ' vs ' + heavy.score);
  ok('and a weightless clear still pays something', (() => {
    const b = B({}, 3);
    b.stacks[0].push(M(b, 1, 0)); b.stacks[1].push(M(b, 1, 0));
    R.dropMarble(b, 2, M(b, 1, 0));
    return b.score > 0;
  })());
}

console.log('\n== REVIEW: a saved match keeps its blackouts and seals ==');
{
  const b = R.makeBoard({}, 9);
  R.pickUp(b, 2);
  for (let i = 0; i < 10; i++) R.dropFromDepot(b, i % 8);
  b.darkUntil = b.dropped + 6;
  const some = b.stacks.find((c) => c.length)[0];
  some.dark = b.dropped + 4;
  some.crossed = true;
  const r = R.restore(JSON.parse(JSON.stringify(R.serialize(b))));
  check('the whole-field blackout survives', r.darkUntil, b.darkUntil);
  const back = r.stacks.flat().find((m) => m.id === some.id);
  check('a darkened marble is still dark', back.dark, some.dark);
  check('and a crossed weapon is still armed', back.crossed, true);
}

console.log('\n== REVIEW: the first press picks up, from wherever the crane is ==');
{
  const b = R.makeBoard({}, 5);
  check('a new board hands out nothing', b.held, null);
  const want = b.depot[6][0];
  R.pickUp(b, 6);
  ok('the player picks from their own column', b.held === want);
}


console.log('\n== REVIEW: the reward tables follow the manual\'s fragments ==');
{
  const draws = (size, n) => {
    const seen = {};
    for (let i = 0; i < n; i++) { const b = B({}, i + 1); const k = R.rewardFor(b, size); seen[k] = (seen[k] || 0) + 1; }
    return seen;
  };
  check('a clear of three always earns a Bomb', Object.keys(draws(3, 40)), [K.BOMB]);
  const five = draws(5, 400);
  check('a clear of five is a Cutter or a Sting, nothing else', Object.keys(five).sort(), [K.CRUSHER, K.STING].sort());
  ok('about three to one in the Cutter\'s favour', five[K.CRUSHER] > 240 && five[K.STING] > 50, JSON.stringify(five));
  const four = draws(4, 400);
  check('a clear of four is a Stonemaker or a Colour Stone', Object.keys(four).sort(), [K.STONEMAKER, K.COLSTONE].sort());
  const six = draws(6, 400);
  check('a clear of six is a Twister or a Tower', Object.keys(six).sort(), [K.TWISTER, K.TOWER].sort());
  const eight = draws(8, 400);
  ok('past the fragments, the named weapons are not drawn again',
     [K.STONEMAKER, K.COLSTONE, K.TWISTER, K.TOWER].every((k) => !eight[k]), JSON.stringify(eight));
  ok('and every remaining weapon can still turn up', Object.keys(eight).length >= 3, JSON.stringify(eight));
}

console.log('\n== REVIEW: the bonus lamps ==');
{
  const trio = (b, w) => { b.stacks[0].push(M(b, 1, w)); b.stacks[1].push(M(b, 1, w)); return R.dropMarble(b, 2, M(b, 1, w)); };
  const b = B({}, 3);
  check('a fresh board shows x1', b.bonus, 1);
  const first = trio(b, 2).find((e) => e.type === 'clear');
  check('the first clear pays at x1', first.bonus, 1);
  check('and lights every lamp', b.bonus, 4);
  const second = trio(b, 2).find((e) => e.type === 'clear');
  check('a quick second clear pays at x4', second.bonus, 4);
  check('four times as much for the same trio', second.gain, first.gain * 4);
}
{
  // With a clock, the lamps go out.
  const b = B({}, 3);
  b.stacks[0].push(M(b, 1, 2)); b.stacks[1].push(M(b, 1, 2));
  R.pickUp(b, 2); b.held = M(b, 1, 2);
  R.dropFromDepot(b, 2, 100);                 // t = 100s: clear, lamp lit until 106
  check('all four lit, with the clock running', b.bonus, 4);
  check('still all lit a second in', R.tickBonus(b, 101), false);
  check('the lamps go out one by one', (R.tickBonus(b, 103), b.bonus), 3);
  check('and one more', (R.tickBonus(b, 105), b.bonus), 2);
  check('dark once the window passes', (R.tickBonus(b, 107), b.bonus), 1);
  // and a drop after the window pays at x1 again
  b.stacks[0].push(M(b, 1, 2)); b.stacks[1].push(M(b, 1, 2));
  b.held = M(b, 1, 2);
  const ev = R.dropFromDepot(b, 2, 120);
  check('a late clear pays at x1', ev.find((e) => e.type === 'clear').bonus, 1);
}
{
  const b = B({}, 3);
  b.stacks[0].push(M(b, 1, 2)); b.stacks[1].push(M(b, 1, 2)); R.dropMarble(b, 2, M(b, 1, 2));
  const r = R.restore(JSON.parse(JSON.stringify(R.serialize(b))));
  check('the lamps go out on a reload, since their clock cannot follow', r.bonus, 1);
  check('and there is no clock to bring them back', r.bonusUntil, null);
}

console.log('\n== REVIEW: a column that reaches the crane loses at once ==');
{
  const b = B({}, 3);
  for (let i = 0; i < 7; i++) b.stacks[2].push(M(b, i % 3, 0));   // level pan, full at 7
  b.stacks[3].push(M(b, 0, 0));
  const ev = R.dropMarble(b, 2, M(b, 1, 0));
  check('the eighth marble ends it', b.over, true);
  const land = ev.findIndex((e) => e.type === 'land');
  const over = ev.findIndex((e) => e.type === 'overflow');
  ok('and the overflow is reported right after the landing, not at the end', over === land + 1, JSON.stringify(types(ev)));
  check('only once', ev.filter((e) => e.type === 'overflow').length, 1);
}
{
  // The one that fooled the first version of this rule: a raised pan sinks
  // under a heavy landing and grows from six to eight, so the seventh is legal.
  const b = B({}, 1);
  b.stacks[0] = [M(b, 0, 10)];
  for (let i = 0; i < 6; i++) b.stacks[1].push(M(b, i % 3, 0));
  R.refreshTilt(b, 0);
  check('the raised pan holds six', R.capacityOf(b, 1), 6);
  R.dropMarble(b, 1, M(b, 1, 20));
  check('a heavy seventh sinks it and is safe', b.over, false);
  check('with the pan now down', R.capacityOf(b, 1), 8);
}


console.log('\n== SOLO REVIEW: a Joker serves the run on its right too ==');
{
  const P = (b, c) => M(b, c, 0);
  const cases = [
    ['green Joker red red',     (b) => { b.stacks[0].push(P(b, 1)); b.stacks[1].push(M(b, 9, 0, K.JOKER)); b.stacks[2].push(P(b, 0)); b.stacks[3].push(P(b, 0)); }],
    ['Heart Joker red red',     (b) => { b.stacks[0].push(M(b, 1, 0, K.HEART)); b.stacks[1].push(M(b, 9, 0, K.JOKER)); b.stacks[2].push(P(b, 0)); b.stacks[3].push(P(b, 0)); }],
    ['red Joker Heart Heart',   (b) => { b.stacks[0].push(P(b, 0)); b.stacks[1].push(M(b, 9, 0, K.JOKER)); b.stacks[2].push(M(b, 1, 0, K.HEART)); b.stacks[3].push(M(b, 2, 0, K.HEART)); }],
    ['blue Joker green Joker',  (b) => { b.stacks[0].push(P(b, 2)); b.stacks[1].push(M(b, 9, 0, K.JOKER)); b.stacks[2].push(P(b, 1)); b.stacks[3].push(M(b, 9, 0, K.JOKER)); }]
  ];
  for (const [name, build] of cases) {
    const b = B({}, 1); build(b);
    const clear = R.findClear(b);
    ok(name + ' clears', !!clear && clear.cells.length >= 3, name + ' -> ' + JSON.stringify(clear && clear.cells));
  }
  // and the mirror image still does
  const b = B({}, 1); b.stacks[0].push(P(b, 0)); b.stacks[1].push(P(b, 0)); b.stacks[2].push(M(b, 9, 0, K.JOKER)); b.stacks[3].push(P(b, 1));
  ok('red red Joker green still clears', !!R.findClear(b));
  // vertically too
  const v = B({}, 1);
  v.stacks[2].push(P(v, 1), M(v, 9, 0, K.JOKER), P(v, 0), P(v, 0), P(v, 0), P(v, 0));
  const five = R.findFive(v);
  ok('green Joker red red red red stacked merges the five', !!five && five.rows.length === 5, JSON.stringify(five));
}

console.log('\n== SOLO REVIEW: stocking the depot never destroys anything ==');
{
  const b = R.makeBoard({}, 3);
  const before = b.depot.map((q) => q.map((m) => m.id));
  for (let i = 0; i < 3; i++) R.awardExtra(b, 4, []);
  const after = new Set(b.depot.flat().map((m) => m.id));
  ok('every marble that was waiting is still waiting', before.flat().every((id) => after.has(id)));
  check('and all three awards are there', b.depot.flat().filter((m) => R.ATTACKS.indexOf(m.kind) >= 0).length, 3);
  ok('spread across columns rather than piled into one', b.depot.filter((q) => q.some((m) => R.ATTACKS.indexOf(m.kind) >= 0)).length >= 2);
  // the level star, same rule
  const s = B({}, 1); R.pickUp(s, 0); s.dropped = s.cfg.marblesPerLevel - 1;
  const seen = new Set(s.depot.flat().map((m) => m.id)); seen.add(s.held.id);
  R.dropFromDepot(s, 0);
  const now = new Set(s.depot.flat().map((m) => m.id)); if (s.held) now.add(s.held.id);
  const lost = Array.from(seen).filter((id) => !now.has(id) && !s.stacks.flat().some((m) => m.id === id));
  check('a level star evicts nothing', lost.length, 0);
  ok('and it is in a depot', s.depot.flat().some((m) => m.kind === K.SILVER));
}

console.log('\n== SOLO REVIEW: a rescue extra acts before the column is judged ==');
{
  const b = B({}, 3);
  for (let i = 0; i < 7; i++) b.stacks[2].push(M(b, i % 3, 0));      // level, full
  const ev = R.dropMarble(b, 2, M(b, 0, 0, K.CRUSHER));
  check('a Crusher into a full column is not a death', b.over, false);
  check('the column is empty', b.stacks[2].length, 0);
  const c = B({}, 3);
  for (let i = 0; i < 7; i++) c.stacks[2].push(M(c, i % 3, 0));
  R.dropMarble(c, 2, M(c, 0, 0));
  check('a plain eighth marble still is', c.over, true);
}

console.log('\n== SOLO REVIEW: Sting can actually turn up ==');
{
  ok('Sting has an unlock level', R.UNLOCK.some((u) => u.kind === K.STING));
  const b = R.makeBoard({ specialChance: 1 }, 5); b.level = 9;
  let seen = 0;
  for (let i = 0; i < 400; i++) if (R.randomMarble(b).kind === K.STING) seen++;
  ok('and is dealt once unlocked', seen > 0, seen + ' in 400');
}

console.log('\n== VERSUS REVIEW: the arsenal, fixed ==');
{
  // A Blocker at home seals nothing and can be launched like any weapon.
  const [a, z] = R.link(B({}, 3), B({}, 4), K.STONE);
  a.stacks[4].push(M(a, 1, 1));
  R.dropMarble(a, 4, M(a, 0, 0, K.BLOCKER));
  check('a Blocker at home seals nothing', [R.isBlocked(a, 3), R.isBlocked(a, 5)], [false, false]);
  a.stacks[4] = [M(a, 1, 1), a.stacks[4].find((m) => m.kind === K.BLOCKER)];
  a.stacks[6] = []; a.stacks[7] = [];
  // put it on the light pan of the last see-saw and flip it
  const blocker = a.stacks[4].pop(); a.stacks[6].push(blocker);
  R.refreshTilt(a, 3);
  const l = R.dropMarble(a, 7, M(a, 1, 5)).find((e) => e.type === 'launch');
  ok('and it can be catapulted across', l && l.crossed && l.original === blocker, JSON.stringify(l && [l.from, l.to, l.crossed]));
  check('where it seals THEIR columns', [R.isBlocked(z, l.to - 1), R.isBlocked(z, l.to + 1)].filter(Boolean).length > 0, true);
}
{
  // kills is only true when we END them
  const [a, z] = R.link(B({}, 3), B({}, 4), K.STONE);
  z.over = true;
  a.stacks[6].push(M(a, 0, 2));
  R.refreshTilt(a, 3);
  const p = R.predictDrop(a, 7, M(a, 1, 6));
  check('a throw at a dead opponent attacks', p.attacks, true);
  check('but does not "kill" them again', p.kills, false);
}
{
  // the Twister leaves by the front door
  const [a, z] = R.link(B({}, 3), B({}, 4), K.STONE);
  z.stacks[2].push(M(z, 1, 1), M(z, 2, 1), M(z, 0, 1));
  const tw = M(a, 0, 0, K.TWISTER); tw.crossed = true;
  const ev = [];
  R.landMarble(z, 2, tw, ev, { flown: new Set(), depth: 1, guard: 0 }, true);
  const t = ev.find((e) => e.type === 'twister');
  ok('the twister event says what left', t && t.taken.length === 3, JSON.stringify(t && t.taken.map((c) => c.row)));
  ok('and where each landed', t && t.landed.length === 3);
  ok('and the Twister itself leaves with a blast', ev.some((e) => e.type === 'blast' && e.kind === K.TWISTER));
  check('so it is on neither board', z.stacks.flat().concat(a.stacks.flat()).filter((m) => m.kind === K.TWISTER).length, 0);
  check('and nothing was lost', z.stacks.flat().length, 3);
}
{
  // a Tower becomes part of its own wall
  const [a, z] = R.link(B({}, 3), B({}, 4), K.STONE);
  z.stacks[0].push(M(z, 1, 1));
  R.refreshTilt(z, 0);                       // settle the tilt before the delivery
  const capWas = R.capacityOf(z, 0);         // reading it after would see the tip
  const tw = M(a, 0, 0, K.TOWER); tw.crossed = true;
  R.landMarble(z, 0, tw, [], { flown: new Set(), depth: 1, guard: 0 }, true);
  check('no Tower marble is left to be catapulted back', z.stacks[0].filter((m) => m.kind === K.TOWER).length, 0);
  check('the column is filled to the brim', z.stacks[0].length, capWas);
  check('and everything it added is stone', z.stacks[0].filter((m) => m.kind === K.STONE).length, capWas - 1);
}
{
  // seals are honoured by pick-up and preview
  const [a, z] = R.link(B({}, 3), B({}, 4), K.STONE);
  const bl = M(a, 0, 0, K.BLOCKER); bl.crossed = true;
  z.stacks[5].push(M(z, 1, 1)); z.stacks[5].push(bl);
  check('a sealed column cannot be picked from', R.pickUp(z, 4), null);
  check('nor previewed', R.predictDrop(z, 4, M(z, 1, 1)), null);
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
