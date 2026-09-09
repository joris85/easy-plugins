'use strict';

/* Easy Solitaire - the rules engine test suite.
 *
 *   node games/solitaire/test/rules.test.js
 *
 * The engine is pure, so every rule is driven here on hand-built positions
 * written in card notation ("KH" is the King of hearts, "TS" the ten of
 * spades). Exits non-zero on any failure.
 */
const fs = require('fs');
// rules.js is a plain script, not a module: it declares `const SolRules = ...`,
// so it has to be evaluated in the global scope and then hoisted out.
(0, eval)(fs.readFileSync(require('path').join(__dirname, '..', 'js', 'rules.js'), 'utf8')
          + '\n;globalThis.SolRules = SolRules;');
const R = globalThis.SolRules;

let pass = 0, fail = 0;
const check = (n, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log('  FAIL ' + n + '\n    got  ' + JSON.stringify(got) + '\n    want ' + JSON.stringify(want)); }
};
const ok = (n, cond, note) => check(n + (cond ? '' : (note ? ' [' + note + ']' : '')), !!cond, true);

const T = (col, index) => ({ pile: 'tab', col, index });
const TAB = (col) => ({ pile: 'tab', col });
const F = (idx) => ({ pile: 'found', idx });
const W = { pile: 'waste' };
const names = (ids) => ids.map(R.name);
const run = (from, to, suit) => { const out = []; for (let r = from; r <= to; r++) out.push(R.name(R.cardId(r, suit))); return out; };

/* A full position for the solver tests: every card accounted for. */
function fullFoundations(suits) {
  return [0, 1, 2, 3].map((s) => (suits.indexOf(s) >= 0 ? run(1, 13, s) : []));
}

console.log('== cards ==');
{
  check('id round trip', R.name(R.parse('QH')), 'QH');
  check('rank of a Ten', R.rankOf(R.parse('TS')), 10);
  check('suit of clubs', R.suitOf(R.parse('3C')), 3);
  check('hearts are red', R.isRed(R.parse('AH')), true);
  check('spades are not', R.isRed(R.parse('AS')), false);
  check('deck is 52 distinct ids', new Set(R.makeDeck()).size, 52);
}

console.log('\n== the deal ==');
{
  const s = R.deal({ seed: 42 });
  check('column sizes 1..7', s.tab.map((c) => c.length), [1, 2, 3, 4, 5, 6, 7]);
  check('face-down counts 0..6', s.down, [0, 1, 2, 3, 4, 5, 6]);
  check('stock holds the other 24', s.stock.length, 24);
  check('waste empty', s.waste.length, 0);
  const all = [].concat(...s.tab, s.stock);
  check('every card exactly once', new Set(all).size, 52);
  check('standard starts at 0', s.score, 0);
  check('vegas starts at -52', R.deal({ seed: 1, scoring: 'vegas' }).score, -52);
  check('same seed, same deal', R.hash(R.deal({ seed: 42 })), R.hash(s));
  ok('different seed, different deal', R.hash(R.deal({ seed: 43 })) !== R.hash(s));
  check('vegas passes: one in draw one', R.passesFor(1, 'vegas'), 1);
  check('vegas passes: three in draw three', R.passesFor(3, 'vegas'), 3);
  check('standard passes unlimited', R.passesFor(3, 'standard'), Infinity);
}

console.log('\n== tableau to tableau ==');
{
  const s = R.fromText({ tab: [['7S'], ['6H'], ['6S'], ['8H'], ['5C'], [], ['KC', 'QD']], down: [0, 0, 0, 0, 0, 0, 0] });
  check('red six onto black seven', R.canMove(s, T(1, 0), TAB(0)), true);
  check('black six onto black seven is refused', R.canMove(s, T(2, 0), TAB(0)), false);
  check('red eight onto black seven is refused', R.canMove(s, T(3, 0), TAB(0)), false);
  check('five onto a seven is refused', R.canMove(s, T(4, 0), TAB(0)), false);
  check('a six may not go to an empty column', R.canMove(s, T(1, 0), TAB(5)), false);
  check('a king-led run may', R.canMove(s, T(6, 0), TAB(5)), true);
  check('a column cannot move onto itself', R.canMove(s, T(0, 0), TAB(0)), false);
  R.applyMove(s, T(1, 0), TAB(0));
  R.applyMove(s, T(4, 0), TAB(0));
  check('the run built up', names(s.tab[0]), ['7S', '6H', '5C']);
  check('a run moves as a unit', R.canMove(s, T(0, 1), TAB(6)), false);   // 6H on QD: no
  s.tab[6] = ['KC', 'QD', 'JS', 'TH', '9S', '8H'].map(R.parse);
  s.tab[3] = [];
  check('...onto the right card', R.canMove(s, T(0, 0), TAB(6)), true);    // 7S on 8H
  R.applyMove(s, T(0, 0), TAB(6));
  check('all three arrived in order', names(s.tab[6]).slice(-3), ['7S', '6H', '5C']);
  check('the source column is empty', s.tab[0].length, 0);
  check('a partial run from the middle is legal', R.canMove(s, T(6, 6), TAB(0)), false);   // 6H to empty: no
  s.tab[0] = ['7C'].map(R.parse);
  check('...when it fits', R.canMove(s, T(6, 7), TAB(0)), true);            // 6H 5C onto 7C
  R.applyMove(s, T(6, 7), TAB(0));
  check('the two cards moved', names(s.tab[0]), ['7C', '6H', '5C']);
  check('the four stayed', names(s.tab[6]), ['KC', 'QD', 'JS', 'TH', '9S', '8H', '7S']);
  check('no points for tableau moves in standard', s.score, 0);
}

console.log('\n== face-down cards ==');
{
  const s = R.fromText({ tab: [['9D', '8C', '7H'], ['8S']], down: [2, 0] });
  check('a face-down card cannot be picked up', R.cardsAt(s, T(0, 1)), null);
  check('nor moved', R.canMove(s, T(0, 1), TAB(1)), false);
  const e = R.applyMove(s, T(0, 2), TAB(1));
  check('moving the top turns the next card up', s.down[0], 1);
  check('and the log says so', e.flipped, true);
  check('turning a card is worth 5', s.score, 5);
  check('the newly turned card is playable', names(R.cardsAt(s, T(0, 1))), ['8C']);
  R.applyMove(s, T(0, 1), TAB(1));      // 8C onto 7H? no, refused; check
  check('an illegal move changes nothing', names(s.tab[1]), ['8S', '7H']);
  const v = R.fromText({ tab: [['9D', '8C', '7H'], ['8S']], down: [2, 0], opts: { scoring: 'vegas' } });
  R.applyMove(v, T(0, 2), TAB(1));
  check('vegas pays nothing for a flip', v.score, -52);
}

console.log('\n== foundations ==');
{
  const s = R.fromText({ tab: [['AS'], ['2S'], ['2H'], ['AH'], ['3S', 'QS']], down: [0, 0, 0, 0, 0] });
  check('an ace goes to any empty slot', R.canMove(s, T(0, 0), F(2)), true);
  check('a two does not', R.canMove(s, T(1, 0), F(0)), false);
  check('foundationFor picks the first empty slot for an ace', R.foundationFor(s, R.parse('AS')), 0);
  R.applyMove(s, T(0, 0), F(0));
  check('ten points home in standard', s.score, 10);
  check('the two of spades follows', R.canMove(s, T(1, 0), F(0)), true);
  check('the two of hearts does not', R.canMove(s, T(2, 0), F(0)), false);
  check('foundationFor finds its suit', R.foundationFor(s, R.parse('2S')), 0);
  check('and -1 for a card with no home', R.foundationFor(s, R.parse('2H')), -1);
  check('a run cannot go home', R.canMove(s, T(4, 0), F(1)), false);
  R.applyMove(s, T(1, 0), F(0));
  check('a card can come back down', R.canMove(s, F(0), TAB(4)), false);   // 2S on QS: no
  s.tab[4] = ['3H'].map(R.parse);
  check('...onto a red three', R.canMove(s, F(0), TAB(4)), true);
  R.applyMove(s, F(0), TAB(4));
  check('that costs 15', s.score, 5);
  check('foundation to foundation is refused', R.canMove(s, F(0), F(1)), false);
  check('heights are per suit', R.foundHeights(s), [1, 0, 0, 0]);
  check('won only with all four full', R.isWon(s), false);
  const w = R.fromText({ found: fullFoundations([0, 1, 2, 3]) });
  check('four full foundations win', R.isWon(w), true);
}

console.log('\n== the waste ==');
{
  const s = R.fromText({ tab: [['8S'], ['AD']], stock: ['5C', '7H', 'AC'] });
  check('nothing to play from an empty waste', R.cardsAt(s, W), null);
  R.draw(s);
  check('the top of the stock is the top of the waste', names(s.waste), ['AC']);
  check('waste to foundation', R.canMove(s, W, F(0)), true);
  R.applyMove(s, W, F(0));
  check('ten points', s.score, 10);
  R.draw(s);
  check('waste to tableau: red seven on black eight', R.canMove(s, W, TAB(0)), true);
  R.applyMove(s, W, TAB(0));
  check('five points for waste to tableau', s.score, 15);
  R.draw(s);
  check('only the top waste card is playable', names(R.cardsAt(s, W)), ['5C']);
  check('waste to an empty column needs a king', R.canMove(s, W, TAB(2)), false);
}

console.log('\n== draw one, draw three, recycle ==');
{
  const stock = ['AS', '2S', '3S', '4S', '5S', '6S', '7S'];   // 7S is the top
  const s = R.fromText({ stock, opts: { draw: 1 } });
  R.draw(s);
  check('draw one turns one', names(s.waste), ['7S']);
  for (let i = 0; i < 6; i++) R.draw(s);
  check('the stock is used up', s.stock.length, 0);
  check('waste in draw order', names(s.waste), ['7S', '6S', '5S', '4S', '3S', '2S', 'AS']);
  check('recycling is allowed in standard', R.canRecycle(s), true);
  check('a click now recycles', R.draw(s), 'recycle');
  check('the stock is back in its original order', names(s.stock), stock);
  check('one pass done', s.passes, 1);
  check('no penalty for recycling in draw one', s.score, 0);

  const d3 = R.fromText({ stock, opts: { draw: 3 } });
  check('draw three turns three', R.draw(d3) && names(d3.waste), ['7S', '6S', '5S']);
  check('only the last is playable', names(R.cardsAt(d3, W)), ['5S']);
  R.draw(d3);
  check('the second click turns the next three', names(d3.waste), ['7S', '6S', '5S', '4S', '3S', '2S']);
  R.draw(d3);
  check('the last click turns what is left', names(d3.waste).slice(-1), ['AS']);
  check('draw returns null on nothing to do', R.draw(R.fromText({})), null);
  d3.score = 30;
  R.draw(d3);
  check('recycling in draw three costs 20', d3.score, 10);
  check('cycling again shows every third card again', R.draw(d3) && names(R.cardsAt(d3, W)), ['5S']);
  d3.score = 5;
  while (d3.stock.length) R.draw(d3);
  R.draw(d3);
  check('standard never goes below zero', d3.score, 0);

  const v1 = R.fromText({ stock: ['AS', '2S'], opts: { draw: 1, scoring: 'vegas' } });
  R.draw(v1); R.draw(v1);
  check('vegas draw one: no second pass', R.canRecycle(v1), false);
  check('the click does nothing', R.draw(v1), null);
  check('canDraw agrees', R.canDraw(v1), false);
  const v3 = R.fromText({ stock: ['AS', '2S', '3S', '4S'], opts: { draw: 3, scoring: 'vegas' } });
  const cycle = () => { while (v3.stock.length) R.draw(v3); return R.draw(v3); };
  check('vegas draw three: pass two', cycle(), 'recycle');
  check('pass three', cycle(), 'recycle');
  check('and no pass four', cycle(), null);
  check('vegas recycling is not fined', v3.score, -52);
}

console.log('\n== vegas money ==');
{
  const s = R.fromText({ tab: [['AS'], ['2H']], stock: ['2S'], opts: { scoring: 'vegas' } });
  R.applyMove(s, T(0, 0), F(0));
  check('five dollars a card', s.score, -47);
  R.draw(s);
  R.applyMove(s, W, F(0));
  check('from the waste too', s.score, -42);
  check('waste to tableau earns nothing', (R.applyMove(R.fromText({ tab: [['3S']], waste: ['2H'], opts: { scoring: 'vegas' } }), W, TAB(0)), true), true);
  const t = R.fromText({ tab: [['3H']], found: [['AS', '2S']], opts: { scoring: 'vegas' } });
  R.applyMove(t, F(0), TAB(0));
  check('taking a card back costs five', t.score, -57);
  check('no time bonus in vegas', R.timeBonus('vegas', 60), 0);
  check('standard time bonus is 700000 over the seconds', R.timeBonus('standard', 100), 7000);
  check('...but not under thirty seconds', R.timeBonus('standard', 20), 0);
}

console.log('\n== undo ==');
{
  const s = R.deal({ seed: 7, draw: 3 });
  const before = R.hash(s) + '|' + s.score + '|' + s.passes;
  // Play a long random walk of legal actions, then unwind every one of them.
  const rng = R.makeRng(99);
  let played = 0;
  for (let i = 0; i < 400; i++) {
    const moves = R.solverMoves(s).filter((m) => m.type !== 'draw');
    const mv = moves.length && rng() < 0.7 ? moves[Math.floor(rng() * moves.length)] : { type: 'draw' };
    if (mv.type === 'draw') { if (R.draw(s)) played++; }
    else if (R.applyMove(s, mv.src, mv.dst)) played++;
  }
  ok('the walk did something', played > 50, String(played));
  ok('and changed the position', R.hash(s) !== before.split('|')[0]);
  check('the log holds every action', s.log.length, played);
  while (R.undo(s)) { /* unwind */ }
  check('undo restores the exact position, score and passes', R.hash(s) + '|' + s.score + '|' + s.passes, before);
  check('the move count is kept', s.moves, played);
  check('and the undo count matches', s.undos, played);
  check('undo on an empty log is a no-op', R.undo(s), null);

  const f = R.fromText({ tab: [['9D', '8C', '7H'], ['8S']], down: [2, 0] });
  R.applyMove(f, T(0, 2), TAB(1));
  R.undo(f);
  check('undoing a flip turns the card back down', f.down[0], 2);
  check('and gives the 5 back', f.score, 0);
  check('the card is home', names(f.tab[0]), ['9D', '8C', '7H']);

  const d = R.fromText({ stock: ['AS', '2S', '3S', '4S'], opts: { draw: 3 } });
  R.draw(d); R.draw(d);
  R.draw(d);                       // recycle
  check('the recycle happened', d.stock.length, 4);
  R.undo(d);
  check('undoing a recycle restores the waste order', names(d.waste), ['4S', '3S', '2S', 'AS']);
  check('and the pass count', d.passes, 0);
  R.undo(d);
  check('undoing a draw-three puts three back', names(d.stock), ['AS']);

  const w = R.fromText({ tab: [['AS'], ['2S']] });
  R.applyMove(w, T(0, 0), F(0));
  R.applyMove(w, T(1, 0), F(0));
  R.undo(w);
  check('undo from a foundation', [names(w.found[0]), names(w.tab[1])], [['AS'], ['2S']]);
  check('score back to 10', w.score, 10);
}

console.log('\n== auto-complete ==');
{
  const s = R.fromText({ tab: [['2S'], ['AS'], ['3H'], ['AH'], ['2H']], down: [0, 0, 0, 1, 0] });
  check('not while a card is face down', R.canAutoComplete(s), false);
  s.down[3] = 0;
  check('all face up and no stock: yes', R.canAutoComplete(s), true);
  const d3 = R.fromText({ tab: [['2S'], ['AS']], stock: ['AH'], opts: { draw: 3 } });
  check('not with a stock in draw three', R.canAutoComplete(d3), false);
  const d1 = R.fromText({ tab: [['2S'], ['AS']], stock: ['AH'], opts: { draw: 1 } });
  check('but yes in draw one with unlimited passes', R.canAutoComplete(d1), true);
  const v = R.fromText({ tab: [['2S'], ['AS']], stock: ['AH'], opts: { draw: 1, scoring: 'vegas' } });
  check('and not in vegas draw one, where the stock goes round once', R.canAutoComplete(v), false);

  let steps = 0;
  while (R.autoStep(s) && steps < 20) steps++;
  check('every card flew home', s.found.map((f) => f.length).sort(), [0, 0, 2, 3]);
  check('in five steps', steps, 5);
  let steps1 = 0;
  while (R.autoStep(d1) && steps1 < 20) steps1++;
  check('draw one auto-complete turns the stock as needed', d1.found.map((f) => f.length).sort(), [0, 0, 1, 2]);
  check('a full board reports won', (R.fromText({ found: fullFoundations([0, 1, 2, 3]) }).found.every((f) => f.length === 13)), true);
}

console.log('\n== targets and stuck ==');
{
  const s = R.fromText({ tab: [['8S'], ['8C'], [], ['KD'], ['4S'], ['4C'], ['9D']], waste: ['7H'] });
  check('every legal target for a waste card', R.targetsFor(s, W), [TAB(0), TAB(1)]);
  check('a king sees the empty column', R.targetsFor(s, T(3, 0)), [TAB(2)]);
  check('there are moves', R.hasAnyMove(s), true);
  const dead = R.fromText({ tab: [['5S'], ['5C']], waste: ['9D'], opts: { draw: 1, scoring: 'vegas' } });
  check('no card fits and no pass is left', R.hasAnyMove(dead), false);
}

console.log('\n== the solver ==');
{
  // Seven spades face up, one per column, the rest of the suit in the stock,
  // the other three suits already home: trivially winnable.
  const easy = R.fromText({
    tab: [['7S'], ['6S'], ['5S'], ['4S'], ['3S'], ['2S'], ['AS']],
    stock: ['KS', 'QS', 'JS', 'TS', '9S', '8S'],
    found: fullFoundations([1, 2, 3]),
    opts: { draw: 1 }
  });
  const r = R.solve(easy);
  check('an easy position is won', r.status, 'won');
  ok('in a handful of nodes', r.nodes < 40, String(r.nodes));
  const t = R.clone(easy);
  for (const mv of r.moves) { if (mv.type === 'draw') R.draw(t); else R.applyMove(t, mv.src, mv.dst); }
  check('and its line really wins when replayed', R.isWon(t), true);

  // Every column's bottom card is a face-down spade that needs the Ace of
  // spades home first, and the Ace sits under a King with no empty column to
  // go to. Nothing can ever empty a column, so the deal is dead.
  const dead = R.fromText({
    tab: [['AS', 'KH'], ['2S', 'KS'], ['3S', 'KD'], ['4S', 'KC'], ['5S', 'QS'], ['6S', 'JS'], ['7S', 'TS']],
    down: [1, 1, 1, 1, 1, 1, 1],
    stock: ['8S', '9S'],
    found: [[], run(1, 12, 1), run(1, 13, 2), run(1, 12, 3)],
    opts: { draw: 1 }
  });
  const all = [].concat(...dead.tab, dead.stock, ...dead.found);
  check('the dead position is a whole deck', new Set(all).size, 52);
  const rd = R.solve(dead);
  check('the solver proves it lost', rd.status, 'lost');
  ok('after exhausting a small tree', rd.nodes < 200, String(rd.nodes));

  // A real deal, labelled by the solver, replayed move by move from the seed.
  const w = R.dealWinnable({ seed: 7, draw: 3 }, 20);
  check('dealWinnable finds a verified deal', w.verified, true);
  const again = R.deal({ seed: w.seed, draw: 3 });
  check('the seed reproduces it', R.hash(again), R.hash(w));
  for (const mv of w.solution) { if (mv.type === 'draw') R.draw(again); else R.applyMove(again, mv.src, mv.dst); }
  check('and the solution wins the real deal', R.isWon(again), true);
  const tiny = R.solve(R.deal({ seed: 3, draw: 3 }), { maxNodes: 5 });
  check('a spent budget is reported as unknown, never as lost', tiny.status, 'unknown');

  check('a safe card: an ace', R.isSafeHome(easy, R.parse('AS'), [0, 0, 0, 0]), true);
  check('a black five with both red fours home', R.isSafeHome(easy, R.parse('5S'), [0, 4, 4, 0]), true);
  check('not with one red four still out', R.isSafeHome(easy, R.parse('5S'), [0, 4, 3, 0]), false);
}

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' CHECKS PASSED' : pass + ' passed, ' + fail + ' FAILED'));
process.exit(fail ? 1 : 0);
