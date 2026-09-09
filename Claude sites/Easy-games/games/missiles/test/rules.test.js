'use strict';

/* Easy Missiles - the rules engine test suite.
 *
 *   node games/missiles/test/rules.test.js
 *
 * The engine is pure: no canvas, no DOM, seeded randomness. Every wave here is
 * stepped exactly as the browser steps it, so what passes here is what plays.
 * Exits non-zero on any failure.
 */
const fs = require('fs');
// rules.js is a plain script, not a module: it declares `const MissileRules = ...`,
// so it has to be evaluated in the global scope and then hoisted out.
(0, eval)(fs.readFileSync(require('path').join(__dirname, '..', 'js', 'rules.js'), 'utf8')
          + '\n;globalThis.MissileRules = MissileRules;');
const R = globalThis.MissileRules;
const D = R.DEFAULTS;

let pass = 0, fail = 0;
const check = (n, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log('  FAIL ' + n + '\n    got  ' + JSON.stringify(got) + '\n    want ' + JSON.stringify(want)); }
};
const ok = (n, c, d) => { if (c) pass++; else { fail++; console.log('  FAIL ' + n + (d ? '  ' + d : '')); } };

/** A game at the start of a wave with an EMPTY schedule, so tests can place
    their own warheads and nothing else falls out of the sky. */
function quiet(wave, seed) {
  const g = R.makeGame({}, seed == null ? 7 : seed);
  g.wave = wave || 1;
  R.startWave(g);
  g.plan.schedule = [];
  return g;
}
/** Run the engine for `secs` seconds in 1/60 steps, collecting events. */
function run(g, secs) {
  const ev = [];
  for (let t = 0; t < secs; t += 1 / 60) ev.push(...R.step(g, 1 / 60));
  return ev;
}
const drop = (g, kind, x, targetX, opts) => R.spawnWarhead(g, Object.assign({
  kind, target: { kind: 'ground', i: -1, x: targetX == null ? x : targetX },
  speed: 60, splitY: null, children: 0
}, opts || {}), x, 0);

console.log('\n== wave generation ==');
{
  const g = R.makeGame({}, 1);
  const w1 = R.generateWave(1, R.makeRng(1), D, R.liveTargets(g));
  check('wave 1 sends eight warheads', w1.count, 8);
  check('and no smart bombs', w1.smart, 0);
  check('and nothing splits yet', w1.splitChance, 0);
  check('schedule length matches', w1.schedule.length, 8);
  ok('every entry has a live target', w1.schedule.every((s) => s.target.kind === 'city' || s.target.kind === 'battery'));
  ok('the schedule is sorted by release time', w1.schedule.every((s, i) => i === 0 || s.at >= w1.schedule[i - 1].at));
  ok('nothing arrives before the lead-in', w1.schedule[0].at >= D.leadIn);

  const w6 = R.generateWave(6, R.makeRng(1), D, R.liveTargets(g));
  check('wave 6 sends eighteen', w6.count, 18);
  check('with three smart bombs', w6.smart, 3);
  check('and eighteen plus three entries', w6.schedule.length, 21);
  ok('smart bombs fall slower than warheads', w6.schedule.filter((s) => s.kind === 'smart').every((s) => s.speed < w6.speed));
  ok('some warheads carry a split', w6.schedule.some((s) => s.splitY != null && s.children >= 2));
  ok('every split is in the upper half', w6.schedule.filter((s) => s.splitY != null).every((s) => s.splitY < D.groundY * 0.5 + 1));

  const w20 = R.generateWave(20, R.makeRng(1), D, R.liveTargets(g));
  check('warheads cap at thirty', w20.count, 30);
  check('smart bombs cap at five', w20.smart, 5);
  check('speed caps too', w20.speed, D.speedMax);
  check('and so does the split chance', w20.splitChance, D.splitChanceMax);

  const a = R.generateWave(5, R.makeRng(99), D, R.liveTargets(g));
  const b = R.generateWave(5, R.makeRng(99), D, R.liveTargets(g));
  check('the same seed gives the same wave', a, b);
  const c = R.generateWave(5, R.makeRng(100), D, R.liveTargets(g));
  ok('a different seed gives a different wave', JSON.stringify(a) !== JSON.stringify(c));
}

console.log('\n== targets only include what is standing ==');
{
  const g = R.makeGame({}, 1);
  g.cities[0] = false; g.cities[3] = false;
  g.batteries[1].dead = true;
  const t = R.liveTargets(g);
  check('four cities and two batteries', [t.filter((x) => x.kind === 'city').length, t.filter((x) => x.kind === 'battery').length], [4, 2]);
  ok('the dead city is not among them', !t.some((x) => x.kind === 'city' && x.i === 0));
  const w = R.generateWave(3, R.makeRng(1), D, t);
  ok('and no warhead is aimed at it', !w.schedule.some((s) => s.target.kind === 'city' && (s.target.i === 0 || s.target.i === 3)));
}

console.log('\n== multiplier ==');
{
  check('waves 1 to 12', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(R.multiplierFor), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
  check('never above six', R.multiplierFor(40), 6);
}

console.log('\n== blast curve ==');
{
  const b = D.blast;
  check('nothing at birth', R.blastRadius(0, b), 0);
  ok('half way through expansion it is half size', Math.abs(R.blastRadius(b.expand / 2, b) - b.maxR / 2) < 1e-9);
  check('full size at the end of expansion', R.blastRadius(b.expand, b), b.maxR);
  check('still full size during the hold', R.blastRadius(b.expand + b.hold / 2, b), b.maxR);
  ok('half size half way through contraction', Math.abs(R.blastRadius(b.expand + b.hold + b.contract / 2, b) - b.maxR / 2) < 1e-9);
  ok('gone at the end', R.blastRadius(R.blastTotal(b), b) < 1e-9);
  check('total is the three phases added', R.blastTotal(b), b.expand + b.hold + b.contract);
}

console.log('\n== firing and ammo ==');
{
  const g = quiet(1);
  check('thirty shots to start', R.totalAmmo(g), 30);
  check('a shot on the left comes from the left battery', R.nearestBattery(g, 100), 0);
  check('one in the middle from the centre', R.nearestBattery(g, 430), 1);
  check('one on the right from the right', R.nearestBattery(g, 800), 2);
  const m = R.fire(g, 100, 200);
  ok('an interceptor was launched', !!m);
  check('from the left battery', m.battery, 0);
  check('which now has nine', g.batteries[0].ammo, 9);
  check('it leaves from the mound top', [m.x, m.y], [D.batteries[0], D.groundY - D.launchHeight]);
  check('at the flank speed', m.speed, D.interceptorSpeed[0]);
  const fast = R.fire(g, 430, 200);
  check('the centre battery is faster', fast.speed, D.interceptorSpeed[1]);

  const low = R.fire(g, 100, D.groundY);
  check('a shot at the ground is lifted to the minimum height', low.ty, D.groundY - D.minAim);

  for (let i = 0; i < 8; i++) R.fire(g, 100, 200);
  check('the left battery is empty', g.batteries[0].ammo, 0);
  const spill = R.fire(g, 100, 200);
  check('so the next left-side shot comes from the centre', spill.battery, 1);
  check('asking the empty battery by name gives nothing', R.fire(g, 100, 200, 0), null);
  const named = R.fire(g, 100, 200, 2);
  check('asking the far battery by name works', named.battery, 2);

  while (R.fire(g, 430, 200)) { /* empty everything */ }
  check('thirty shots and then nothing', [R.totalAmmo(g), g.stats.shots], [0, 30]);
  check('fire returns null with nothing left', R.fire(g, 430, 200), null);
}

console.log('\n== the interceptor arrives and detonates ==');
{
  const g = quiet(1);
  const m = R.fire(g, 430, 300, 1);
  const dist = Math.hypot(m.tx - m.bx, m.ty - m.by);
  const ev = run(g, dist / m.speed + 0.05);
  const blast = ev.find((e) => e.type === 'blast');
  ok('a blast event fired', !!blast);
  check('exactly where it was aimed', [blast.x, blast.y], [430, 300]);
  check('the interceptor is gone', g.interceptors.length, 0);
  check('and one blast is live', g.blasts.length, 1);
  run(g, R.blastTotal(D.blast) + 0.05);
  check('which fades out in time', g.blasts.length, 0);
}

console.log('\n== blast versus warhead over time ==');
{
  // A warhead falling straight down x=430 at 60 px/s. Let it fall for four
  // seconds (to y=240), then fire the centre battery at y=300: the interceptor
  // takes about 0.4 s and the blast 0.6 s more to fill out, by which time the
  // warhead is at y=300. That is the lead the player has to judge.
  const g = quiet(1);
  drop(g, 'warhead', 430, 430);
  run(g, 4);
  R.fire(g, 430, 300, 1);
  const ev = run(g, 4);
  const kill = ev.find((e) => e.type === 'kill');
  ok('the warhead was caught', !!kill, JSON.stringify(ev.map((e) => e.type)));
  check('for 25 points at x1', kill && kill.points, 25);
  check('score agrees', g.score, 25);
  check('and it never reached the ground', ev.filter((e) => e.type === 'groundHit').length, 0);
}
{
  // The same warhead, but the blast is placed 60 px to one side. That is
  // outside the 36 px radius, so it sails past.
  const g = quiet(1);
  drop(g, 'warhead', 430, 430);
  run(g, 4);
  R.fire(g, 490, 300, 1);
  const ev = run(g, 8);
  check('a miss is a miss', ev.filter((e) => e.type === 'kill').length, 0);
  check('the warhead landed', ev.filter((e) => e.type === 'groundHit').length, 1);
}
{
  // A blast that has already finished shrinking catches nothing. Fire early
  // enough that the blast is over before the warhead gets there.
  const g = quiet(1);
  R.fire(g, 430, 100, 1);
  run(g, 3);
  check('the blast is over', g.blasts.length, 0);
  drop(g, 'warhead', 430, 430);
  const ev = run(g, 12);
  check('so nothing dies', ev.filter((e) => e.type === 'kill').length, 0);
}
{
  // One blast, two warheads passing through it: both die, both score.
  const g = quiet(3);
  drop(g, 'warhead', 420, 420);
  drop(g, 'warhead', 440, 440);
  run(g, 4);
  R.fire(g, 430, 300, 1);
  const ev = run(g, 4);
  check('two kills', ev.filter((e) => e.type === 'kill').length, 2);
  check('at the wave 3 multiplier', g.score, 100);
}

console.log('\n== a warhead that lands ==');
{
  const g = quiet(1);
  const cityX = D.cities[2];
  R.spawnWarhead(g, { kind: 'warhead', target: { kind: 'city', i: 2, x: cityX }, speed: 200, splitY: null, children: 0 }, cityX, 0);
  const ev = run(g, 4);
  check('the city is destroyed', g.cities[2], false);
  check('and reported', ev.filter((e) => e.type === 'cityHit').map((e) => e.i), [2]);
  check('five cities stand', R.liveCities(g).length, 5);
}
{
  const g = quiet(1);
  R.fire(g, 700, 100, 1);      // spend one, well away from the warhead's path
  R.spawnWarhead(g, { kind: 'warhead', target: { kind: 'battery', i: 1, x: D.batteries[1] }, speed: 200, splitY: null, children: 0 }, D.batteries[1], 0);
  const ev = run(g, 4);
  check('the battery is knocked out', g.batteries[1].dead, true);
  check('with its nine remaining missiles', g.batteries[1].ammo, 0);
  check('and reported', ev.filter((e) => e.type === 'batteryHit').length, 1);
  check('a shot at the middle now comes from a flank', R.nearestBattery(g, 430), 0);
  check('and asking it by name gives nothing', R.fire(g, 430, 200, 1), null);
}
{
  const g = quiet(1);
  g.cities[2] = false;
  R.spawnWarhead(g, { kind: 'warhead', target: { kind: 'city', i: 2, x: D.cities[2] }, speed: 200, splitY: null, children: 0 }, D.cities[2], 0);
  const ev = run(g, 4);
  check('a second hit on a ruin is only a ground hit', ev.filter((e) => e.type === 'groundHit').length, 1);
}

console.log('\n== splitting ==');
{
  const g = quiet(5);
  drop(g, 'warhead', 300, 300, { splitY: 150, children: 3 });
  check('one warhead before', g.warheads.length, 1);
  const ev = run(g, 150 / 60 + 0.1);
  const split = ev.find((e) => e.type === 'split');
  ok('it split', !!split);
  check('into three', g.warheads.length, 3);
  ok('at the split height', split && Math.abs(split.y - 150) < 2, split && split.y);
  ok('the children start where the parent split', g.warheads.every((w) => Math.abs(w.y0 - split.y) < 1e-9 && Math.abs(w.x0 - split.x) < 1e-9));
  check('one child keeps the parent target', g.warheads.filter((w) => w.target.x === 300).length >= 1, true);
  ok('children do not split again', g.warheads.every((w) => w.splitY == null));
  ok('children keep the parent speed', g.warheads.every((w) => w.speed === 60));
}
{
  // The engine rule: a split during the walk must not corrupt the walk. Two
  // splitters and a plain warhead in one list, all stepped through the split.
  const g = quiet(5);
  drop(g, 'warhead', 200, 200, { splitY: 100, children: 2 });
  drop(g, 'warhead', 400, 400);
  drop(g, 'warhead', 600, 600, { splitY: 100, children: 2 });
  run(g, 100 / 60 + 0.1);
  check('two splits give five warheads', g.warheads.length, 5);
  ok('all alive and all distinct', new Set(g.warheads.map((w) => w.id)).size === 5 && g.warheads.every((w) => w.alive));
}
{
  // A splitter killed before its split height never splits.
  const g = quiet(5);
  drop(g, 'warhead', 430, 430, { splitY: 400, children: 3 });
  run(g, 3);                   // it is at y=180, the blast will be full at about y=245
  R.fire(g, 430, 250, 1);
  const ev = run(g, 6);
  check('killed once', ev.filter((e) => e.type === 'kill').length, 1);
  check('no split', ev.filter((e) => e.type === 'split').length, 0);
  check('sky empty', g.warheads.length, 0);
}

console.log('\n== smart bombs ==');
{
  // A blast that will land right on it: it cannot get clear in time. The bomb
  // is at y=180 after three seconds; the interceptor takes about 0.48 s and
  // the blast 0.6 s to fill, so y=245 is where the bomb will be.
  const g = quiet(6);
  drop(g, 'smart', 430, 430, { speed: 60 });
  run(g, 3);
  R.fire(g, 430, 245, 1);
  const ev = run(g, 5);
  const kill = ev.find((e) => e.type === 'kill');
  ok('a direct placement kills it', !!kill && kill.kind === 'smart', JSON.stringify(ev.map((e) => e.type)));
  check('for 125 at x3', kill && kill.points, 375);
  check('counted as a smart kill', g.stats.smartKills, 1);
}
{
  // The same blast 30 px to the side. A plain warhead on that line dies; the
  // smart bomb slides around it.
  const runOne = (kind) => {
    const g = quiet(6);
    drop(g, kind, 430, 430, { speed: 60 });
    run(g, 3);
    R.fire(g, 460, 245, 1);
    return run(g, 9);
  };
  const plain = runOne('warhead');
  const smart = runOne('smart');
  check('the plain warhead is caught by the offset blast', plain.filter((e) => e.type === 'kill').length, 1);
  check('the smart bomb is not', smart.filter((e) => e.type === 'kill').length, 0);
  check('and it reaches the ground', smart.filter((e) => e.type === 'groundHit').length, 1);
}
{
  const g = quiet(6);
  const s = drop(g, 'smart', 100, 700, { speed: 60 });
  run(g, 2);
  ok('with no blasts near it steers towards its target', s.vx > 0 && s.x > 100);
  ok('but only at its lateral limit', Math.abs(s.vx) <= D.smartTurn + 1e-9);
  ok('and never stops descending', s.vy === 60);
}

console.log('\n== tally and bonus ==');
{
  const g = quiet(4);           // x2
  g.cities[1] = false;
  R.fire(g, 100, 200); R.fire(g, 100, 200); R.fire(g, 100, 200);
  const t = R.tallyWave(g);
  check('27 missiles and 5 cities', [t.missiles, t.cities, t.mult], [27, 5, 2]);
  check('missile bonus 27 x 5 x 2', t.missilePts, 270);
  check('city bonus 5 x 100 x 2', t.cityPts, 1000);
  check('total', t.total, 1270);
  check('no bonus city yet', t.bonusCities, 0);
}
{
  const g = quiet(2);
  g.score = 9700;
  g.cities[4] = false;
  const t = R.tallyWave(g);
  check('crossing 10000 banks a bonus city', t.bonusCities, 1);
  const res = R.endWave(g);
  check('score includes the bonus', g.score, 9700 + t.total);
  check('the ruin was rebuilt', [res.rebuilt, g.cities[4]], [[4], true]);
  check('nothing left in the bank', g.bank, 0);
  check('next threshold moved on', g.nextBonusCity, 20000);
  check('wave advanced', g.wave, 3);
  check('ammo refilled', R.totalAmmo(g), 30);
  ok('the new wave has a schedule', g.plan.schedule.length > 0);
  check('phase is wave again', g.phase, 'wave');
}
{
  const g = quiet(2);
  g.score = 25000; g.nextBonusCity = 10000;
  const t = R.tallyWave(g);
  check('a big score banks several', t.bonusCities, 2);
  R.endWave(g);
  check('with no ruins they wait in the bank', g.bank, 2);
  check('and the threshold skips past them', g.nextBonusCity, 30000);
}
{
  const g = quiet(1);
  for (let i = 0; i < 6; i++) g.cities[i] = false;
  const res = R.endWave(g);
  check('no cities and no bank is game over', [res.gameOver, g.phase], [true, 'over']);
  check('the unused missiles still paid out', g.score, 30 * 5);
}
{
  const g = quiet(1);
  for (let i = 0; i < 6; i++) g.cities[i] = false;
  g.bank = 1;
  const res = R.endWave(g);
  check('a banked city saves the game', [res.gameOver, R.liveCities(g).length, g.wave], [false, 1, 2]);
}

console.log('\n== a whole wave, untouched, ends itself ==');
{
  const g = R.makeGame({}, 3);
  R.startWave(g);
  const ev = run(g, 40);
  check('the wave reaches the tally', g.phase, 'tally');
  check('exactly one waveClear', ev.filter((e) => e.type === 'waveClear').length, 1);
  check('every warhead was released', g.cursor, g.plan.schedule.length);
  check('the sky is empty', [g.warheads.length, g.interceptors.length, g.blasts.length], [0, 0, 0]);
  const landed = ev.filter((e) => e.type === 'cityHit' || e.type === 'batteryHit' || e.type === 'groundHit').length;
  check('eight impacts for eight warheads', landed, 8);
  check('the tally counts what the batteries still hold', g.tally.missiles, R.totalAmmo(g));
  const lost = g.batteries.filter((b) => b.dead).length;
  check('a hit battery lost its whole stock', g.tally.missiles + lost * D.ammo, 30);
  ok('and this seed does hit a battery', lost > 0);
  ok('some cities are gone', R.liveCities(g).length < 6);
}

console.log('\n== determinism ==');
{
  const play = (seed) => {
    const g = R.makeGame({}, seed);
    R.startWave(g);
    const log = [];
    for (let f = 0; f < 60 * 25; f++) {
      if (f % 45 === 0) R.fire(g, 100 + (f % 700), 120 + (f % 300));
      const ev = R.step(g, 1 / 60);
      for (const e of ev) log.push(e.type);
    }
    return R.snapshot(g) + '|' + log.join(',');
  };
  ok('two games from one seed match to the frame', play(12345) === play(12345));
  ok('and a different seed does not', play(12345) !== play(54321));
}
{
  // Step size must not change the outcome: one big dt is substepped.
  const a = quiet(1), b = quiet(1);
  drop(a, 'warhead', 430, 430); drop(b, 'warhead', 430, 430);
  R.fire(a, 430, 300, 1); R.fire(b, 430, 300, 1);
  const ea = run(a, 8);
  const eb = [];
  for (let t = 0; t < 8; t += 0.25) eb.push(...R.step(b, 0.25));
  check('coarse steps and fine steps agree on the kill', ea.filter((e) => e.type === 'kill').length, eb.filter((e) => e.type === 'kill').length);
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
