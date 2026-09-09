'use strict';

/* Easy Invaders - the rules engine test suite.
 *
 *   node games/invaders/test/rules.test.js
 *
 * The engine is pure: no canvas, no DOM, seeded randomness. Every rule in the
 * game is stepped and asserted here rather than assumed. Exits non-zero on any
 * failure.
 */
const fs = require('fs');
// rules.js is a plain script, not a module: it declares `const InvadersRules = ...`,
// so it has to be evaluated in the global scope and then hoisted out.
(0, eval)(fs.readFileSync(require('path').join(__dirname, '..', 'js', 'rules.js'), 'utf8')
          + '\n;globalThis.InvadersRules = InvadersRules;');
const R = globalThis.InvadersRules;
const C = R.CFG;

let pass = 0, fail = 0;
const check = (n, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log('  FAIL ' + n + '\n    got  ' + JSON.stringify(got) + '\n    want ' + JSON.stringify(want)); }
};
const ok = (n, c, d) => { if (c) pass++; else { fail++; console.log('  FAIL ' + n + (d ? '  ' + d : '')); } };

const DT = 1 / 60;
const G = (seed) => { const g = R.makeGame(seed == null ? 1 : seed); g.phase = 'play'; return g; };
const run = (g, frames, input) => { const ev = []; for (let i = 0; i < frames; i++) ev.push(...R.tick(g, DT, input || {})); return ev; };
const alive = (g) => g.invaders.filter((i) => i.alive);

console.log('\n== formation ==');
{
  const g = G();
  check('fifty-five invaders', g.invaders.length, 55);
  check('eleven columns by five rows', [Math.max(...g.invaders.map((i) => i.col)) + 1, Math.max(...g.invaders.map((i) => i.row)) + 1], [11, 5]);
  const byRow = (r) => g.invaders.filter((i) => i.row === r);
  check('top row scores 30', byRow(0).map((i) => i.points), Array(11).fill(30));
  check('middle rows score 20', [...byRow(1), ...byRow(2)].map((i) => i.points), Array(22).fill(20));
  check('bottom rows score 10', [...byRow(3), ...byRow(4)].map((i) => i.points), Array(22).fill(10));
  check('three sprite types, top to bottom', [0, 1, 2, 3, 4].map((r) => byRow(r)[0].type), [0, 1, 1, 2, 2]);
  check('each sprite has two frames of equal size', R.SPRITES.invaders.map((f) => f[0].w === f[1].w && f[0].h === f[1].h), [true, true, true]);
  check('the rack starts centred', Math.round(g.formation.x + C.cols * C.colW / 2), C.W / 2);
  check('wave 1 starts at the top', g.formation.y, C.topY);
}

console.log('\n== the speed-up curve ==');
{
  check('full rack steps at the base interval', R.stepInterval(55), C.baseStep);
  check('one invader steps at a fifty-fifth of it', +R.stepInterval(1).toFixed(6), +(C.baseStep / 55).toFixed(6));
  check('half the rack is twice as fast', +(R.stepInterval(55) / R.stepInterval(27.5)).toFixed(6), 2);
  let mono = true;
  for (let n = 55; n > 1; n--) if (R.stepInterval(n) <= R.stepInterval(n - 1)) mono = false;
  ok('every death makes it faster', mono);
  ok('zero alive never divides to zero', R.stepInterval(0) > 0);

  // Count steps in ten seconds with 55 alive and with 5 alive.
  const steps = (keep) => {
    const g = G();
    const ev = [];
    let n = 0;
    for (const inv of g.invaders) { if (n < 55 - keep) { R.killInvader(g, inv, []); n++; } }
    g.formation.y = -400;   // far above everything so it drops without landing
    g.reloadTimer = 1e9;    // no invader fire
    g.mysteryTimer = 1e9;
    return run(g, 600).filter((e) => e.type === 'step').length;
  };
  const full = steps(55), few = steps(5);
  check('about eleven steps in ten seconds with 55 alive', full, 11);
  ok('eleven times as many with 5 alive', few >= full * 10, 'full ' + full + ' few ' + few);
}

console.log('\n== stepping, dropping and reversing ==');
{
  const g = G();
  const x0 = g.formation.x, y0 = g.formation.y;
  const ev = [];
  R.stepFormation(g, ev);
  check('a step moves right by stepX', g.formation.x - x0, C.stepX);
  check('a plain step does not drop', [g.formation.y - y0, ev[0].dropped], [0, false]);
  check('the animation frame toggles', g.formation.frame, 1);
  check('the march note advances', ev[0].note, 1);
  let n = 0, dropped = null;
  while (!dropped && n < 200) { const e = []; R.stepFormation(g, e); n++; if (e[0].dropped) dropped = e[0]; }
  ok('the rack drops at the wall', !!dropped, 'no drop in ' + n + ' steps');
  check('the drop is dropY', g.formation.y - y0, C.dropY);
  check('and the direction reverses', g.formation.dir, -1);
  const b = R.bounds(g);
  ok('no invader crossed the wall', b.right <= C.W - C.edge && b.left >= C.edge, JSON.stringify(b));
  check('a full rack reaches the right wall in 10 steps', n, 10);
}

console.log('\n== a thinned rack travels further ==');
{
  const stepsToDrop = (g) => { let n = 0; for (;;) { const e = []; R.stepFormation(g, e); n++; if (e[0].dropped) return n; if (n > 500) return -1; } };
  const a = G();
  const full = stepsToDrop(a);
  const b = G();
  for (const inv of b.invaders) if (inv.col >= 9) R.killInvader(b, inv, []);
  const thinned = stepsToDrop(b);
  check('two dead columns on the right buy 16 more steps', thinned - full, 2 * C.colW / C.stepX);
  const c = G();
  for (const inv of c.invaders) if (inv.col !== 5) R.killInvader(c, inv, []);
  ok('a lone column sweeps most of the screen', stepsToDrop(c) > full * 4);
}

console.log('\n== waves start lower ==');
{
  check('drops per wave', [1, 2, 3, 4, 5, 6, 12].map(R.startDropsFor), [0, 2, 3, 4, 5, 5, 5]);
  const g = G();
  const y1 = g.formation.y;
  for (const inv of g.invaders) R.killInvader(g, inv, []);
  check('the last kill clears the wave', g.phase, 'cleared');
  run(g, Math.ceil(C.clearPause * 60) + 1);
  check('a new wave follows the pause', [g.wave, g.phase, alive(g).length], [2, 'intro', 55]);
  check('wave 2 starts two drops lower', g.formation.y - y1, 2 * C.dropY);
  check('shields are rebuilt', g.shields.map((s) => s.left === s.total), [true, true, true, true]);
  ok('wave 5 still leaves room above the shields', C.topY + 5 * C.dropY + C.rows * C.rowH < C.shieldY);
}

console.log('\n== shields erode pixel by pixel ==');
{
  const sh = R.makeShield(0);
  check('four shields', R.makeShields().length, 4);
  check('a fresh shield is 22 by 16 units', [sh.w, sh.h], [22, 16]);
  const fresh = sh.left;
  ok('a fresh shield has a doorway', fresh < sh.w * sh.h && fresh > sh.w * sh.h * 0.7, 'left ' + fresh);
  const cx = sh.x + sh.w * C.P / 2, cy = sh.y + 3 * C.P;
  const cell = R.shieldCellAt(sh, cx, cy);
  ok('a point inside the arch is solid', !!cell);
  const removed = R.erodeShield(sh, cell.lx, cell.ly, C.shieldPlayerHole);
  ok('a player hit removes a handful of units', removed >= 15 && removed <= 25, 'removed ' + removed);
  check('the count keeps up', sh.left, fresh - removed);
  check('the hit point is now empty', R.shieldCellAt(sh, cx, cy), null);
  ok('a neighbour just outside the hole survives', !!R.shieldCellAt(sh, cx, cy + 4 * C.P));
  check('eroding the same spot again removes nothing', R.erodeShield(sh, cell.lx, cell.ly, C.shieldPlayerHole), 0);
  check('off-grid points are not solid', [R.shieldCellAt(sh, sh.x - 1, cy), R.shieldCellAt(sh, cx, sh.y + sh.h * C.P + 1)], [null, null]);
  const sh2 = R.makeShield(1);
  const gone = R.eraseRectFromShield(sh2, { x: sh2.x, y: sh2.y, w: sh2.w * C.P, h: 2 * C.P });
  check('erasing the top two rows removes exactly those units', gone, 14 + 16);
}

console.log('\n== a player shot ==');
{
  const g = G();
  g.reloadTimer = 1e9; g.mysteryTimer = 1e9;
  const ev = [];
  ok('firing works', R.firePlayer(g, ev));
  check('it is counted', g.shots, 1);
  ok('one shot in the air at a time', !R.firePlayer(g, ev));
  check('the second attempt is not counted', g.shots, 1);
  const spr = g.playerShot;
  check('the shot leaves from the middle of the player', Math.round(spr.x + spr.w / 2), Math.round(g.player.x + C.playerW / 2));
  run(g, 120);
  check('an unobstructed shot leaves the top and frees the gun', g.playerShot, null);
  ok('firing is allowed again', R.firePlayer(g, []));
}

console.log('\n== a shot kills an invader and scores it ==');
{
  const g = G();
  g.reloadTimer = 1e9; g.mysteryTimer = 1e9;
  g.formation.timer = 1e9;    // freeze the rack
  // Put the player under column 3 and fire.
  const target = g.invaders.find((i) => i.col === 3 && i.row === 4);
  const r = R.invaderRect(g, target);
  R.setPlayerX(g, r.x + r.w / 2 - C.playerW / 2);
  const ev = run(g, 60, { fire: true });
  const died = ev.filter((e) => e.type === 'invaderDied');
  check('exactly one invader died', died.length, 1);
  check('it was the lowest in that column', target.alive, false);
  check('bottom row is worth 10', g.score, 10);
  check('alive count follows', g.alive, 54);
  ok('the gun is free again afterwards', !g.playerShot || ev.some((e) => e.type === 'playerShot' && ev.indexOf(e) > ev.indexOf(died[0])));

  const above = g.invaders.find((i) => i.col === 3 && i.row === 3);
  for (let i = 0; i < 120 && above.alive; i++) R.tick(g, DT, { fire: true });
  check('the next shot takes the one above it', above.alive, false);
  check('which is also 10', g.score, 20);
}

console.log('\n== shots and shields ==');
{
  const g = G();
  g.reloadTimer = 1e9; g.mysteryTimer = 1e9; g.formation.timer = 1e9;
  const sh = g.shields[1];
  R.setPlayerX(g, sh.x + sh.w * C.P / 2 - C.playerW / 2);
  const before = sh.left;
  R.firePlayer(g, []);
  const ev = run(g, 40);
  ok('a shot from below hits the shield', ev.some((e) => e.type === 'shieldHit'));
  ok('and erodes it', sh.left < before, sh.left + ' vs ' + before);
  check('the shot is spent', g.playerShot, null);

  // An invader shot from above erodes the same shield with a bigger hole.
  const g2 = G();
  g2.reloadTimer = 1e9; g2.mysteryTimer = 1e9; g2.formation.timer = 1e9;
  const sh2 = g2.shields[2];
  g2.invaderShots.push({ x: sh2.x + sh2.w * C.P / 2 - 4, y: sh2.y - 60, w: 9, h: 21, kind: 0 });
  const b2 = sh2.left;
  const ev2 = run(g2, 30);
  ok('an invader shot hits the shield', ev2.some((e) => e.type === 'shieldHit'));
  ok('with a bigger bite than the player takes', b2 - sh2.left > before - sh.left, (b2 - sh2.left) + ' vs ' + (before - sh.left));
  check('the shot is gone', g2.invaderShots.length, 0);
}

console.log('\n== the rack eats shields it marches into ==');
{
  const g = G();
  const sh = g.shields[0];
  // Put the bottom row level with the shield's top.
  g.formation.y = sh.y - (C.rows - 1) * C.rowH;
  const before = sh.left;
  R.stepFormation(g, []);
  ok('overlapped units are erased', sh.left < before, sh.left + ' vs ' + before);
}

console.log('\n== invader fire ==');
{
  const g = G(3);
  g.mysteryTimer = 1e9; g.formation.timer = 1e9;
  const ev = run(g, 120);
  ok('the rack shoots', ev.some((e) => e.type === 'invaderShot'));
  ok('never more than three in the air', g.invaderShots.length <= C.maxInvaderShots);
  check('the shooter is the lowest in its column', R.lowestInColumn(g, 4).row, 4);
  for (const inv of g.invaders) if (inv.col === 4 && inv.row === 4) R.killInvader(g, inv, []);
  check('once it dies the one above takes over', R.lowestInColumn(g, 4).row, 3);
  check('reload shortens as the score climbs', [0, 199, 200, 999, 1000, 2500, 9999].map(R.reloadFor), [1.0, 1.0, 0.65, 0.65, 0.45, 0.35, 0.28]);

  // Aimed shots come from the column nearest the player.
  const g2 = G(5);
  g2.formation.timer = 1e9;
  R.setPlayerX(g2, R.invaderRect(g2, g2.invaders[10]).x);   // under column 10
  let aimed = 0, total = 0;
  for (let i = 0; i < 200; i++) {
    g2.invaderShots = [];
    R.fireInvaderShot(g2, []);
    total++;
    const s = g2.invaderShots[0];
    const r = R.invaderRect(g2, g2.invaders.find((v) => v.col === 10 && v.row === 4));
    if (s && s.x > r.x && s.x < r.x + r.w) aimed++;
  }
  ok('a good share of shots come from the column over the player', aimed / total > 0.3 && aimed / total < 0.55, aimed + '/' + total);
}

console.log('\n== losing a life ==');
{
  const g = G();
  g.reloadTimer = 1e9; g.mysteryTimer = 1e9; g.formation.timer = 1e9;
  g.invaderShots.push({ x: g.player.x + C.playerW / 2 - 4, y: C.playerY - 40, w: 9, h: 21, kind: 0 });
  const ev = run(g, 20);
  ok('the shot kills the player', ev.some((e) => e.type === 'playerDied'));
  check('a life is lost and the game pauses', [g.lives, g.phase], [2, 'dying']);
  check('the shots are cleared', [g.invaderShots.length, g.playerShot], [0, null]);
  run(g, Math.ceil(C.deathPause * 60) + 1);
  check('play resumes with the player back at the start', [g.phase, g.player.x], ['play', C.playerStartX]);

  g.lives = 1;
  g.invaderShots.push({ x: g.player.x + C.playerW / 2 - 4, y: C.playerY - 40, w: 9, h: 21, kind: 0 });
  run(g, 20);
  check('the last life goes', [g.lives, g.phase], [0, 'dying']);
  const ev2 = run(g, Math.ceil(C.deathPause * 60) + 1);
  check('and the game is over', [g.phase, g.reason], ['over', 'lives']);
  ok('with an over event', ev2.some((e) => e.type === 'over' && e.reason === 'lives'));
  check('ticking an over game does nothing', run(g, 10), []);
}

console.log('\n== the invasion ==');
{
  const g = G();
  g.reloadTimer = 1e9; g.mysteryTimer = 1e9;
  // Park the rack one drop above the player's row and walk it to the wall.
  g.formation.y = C.playerY - C.rows * C.rowH - 1;
  let ev = [];
  for (let i = 0; i < 60 && g.phase === 'play'; i++) { ev = []; R.stepFormation(g, ev); }
  check('reaching the player row ends the game whatever the lives', [g.phase, g.reason, g.lives], ['over', 'landed', 3]);
}

console.log('\n== scoring, the extra life and the mystery ship ==');
{
  check('mystery values by shot count', [0, 1, 2, 3, 4, 7, 8, 22].map(R.mysteryValue), [100, 50, 50, 100, 150, 50, 100, 50]);
  check('the 23rd shot is 300', R.mysteryValue(23), 300);
  check('and every 15th after it', [38, 53, 68, 233].map(R.mysteryValue), [300, 300, 300, 300]);
  check('the shots between are not', [24, 37, 39, 52].map(R.mysteryValue), [100, 50, 100, 50]);
  ok('nothing scores less than 50 or more than 300', [...Array(100).keys()].every((n) => R.mysteryValue(n) >= 50 && R.mysteryValue(n) <= 300));

  const g = G();
  g.reloadTimer = 1e9; g.formation.timer = 1e9;
  g.mysteryTimer = 0.01;
  let ev = run(g, 5);
  ok('the mystery ship appears when its timer runs out', ev.some((e) => e.type === 'mystery') && g.mystery);
  run(g, 60 * 12);
  check('it crosses and leaves', g.mystery, null);
  ok('and the timer is reset to the visit range', g.mysteryTimer >= C.mysteryEvery[0] && g.mysteryTimer <= C.mysteryEvery[1]);

  for (const inv of g.invaders) { if (g.alive > 7) R.killInvader(g, inv, []); }
  g.mysteryTimer = 0.01;
  run(g, 60);
  check('it stays away once fewer than 8 remain', g.mystery, null);

  // Shoot it down with the 23rd shot for 300.
  const g2 = G();
  g2.reloadTimer = 1e9; g2.formation.timer = 1e9;
  for (const inv of g2.invaders) if (inv.col === 5) R.killInvader(g2, inv, []);   // open a lane
  g2.score = 0;               // the lane cost 90, which is not what is measured here
  g2.shots = 22;
  g2.mystery = { x: 0, vx: 0 };
  R.setPlayerX(g2, C.mysteryW / 2 - C.playerW / 2);
  const ev2 = run(g2, 90, { fire: true });
  const hit = ev2.find((e) => e.type === 'mysteryDied');
  ok('the mystery ship can be shot', !!hit);
  check('the 23rd shot scores 300', hit && hit.points, 300);
  check('and it shows a popup', g2.popups.map((p) => p.text), ['300']);
  check('the score follows', g2.score, 300);

  const g3 = G();
  const ev3 = [];
  g3.score = 1490;
  R.killInvader(g3, g3.invaders[54], ev3);
  check('crossing 1500 gives one extra life', [g3.lives, ev3.some((e) => e.type === 'extraLife')], [4, true]);
  const ev4 = [];
  g3.score = 2990;
  R.killInvader(g3, g3.invaders[53], ev4);
  check('and only one', [g3.lives, ev4.some((e) => e.type === 'extraLife')], [4, false]);
}

console.log('\n== the player ==');
{
  const g = G();
  g.reloadTimer = 1e9; g.mysteryTimer = 1e9; g.formation.timer = 1e9;
  const x0 = g.player.x;
  run(g, 30, { right: true });
  ok('right moves right', g.player.x > x0);
  check('at the configured speed', +(g.player.x - x0).toFixed(3), +(C.playerSpeed * 0.5).toFixed(3));
  run(g, 600, { right: true });
  check('and stops at the wall', g.player.x, C.W - C.edge - C.playerW);
  run(g, 600, { left: true });
  check('on both sides', g.player.x, C.edge);
  run(g, 10, { left: true, right: true });
  check('both keys cancel', g.player.x, C.edge);
  R.setPlayerX(g, 9999);
  check('setPlayerX clamps too', g.player.x, C.W - C.edge - C.playerW);
}

console.log('\n== phases ==');
{
  const g = R.makeGame(1);
  check('a new game starts with an intro', g.phase, 'intro');
  const ev = run(g, Math.ceil(C.introPause * 60) + 1, { fire: true });
  check('the intro ends in play', g.phase, 'play');
  ok('with a go event', ev.some((e) => e.type === 'go'));
  ok('firing during the intro did nothing', g.shots <= 1);
  ok('the rack does not move during the intro', !ev.some((e) => e.type === 'step'));
}

console.log('\n== determinism ==');
{
  const play = (seed) => {
    const g = R.makeGame(seed);
    const snaps = [];
    for (let i = 0; i < 1800; i++) {
      const phase = Math.floor(i / 90) % 3;
      R.tick(g, DT, { left: phase === 1, right: phase === 2, fire: i % 7 !== 0 });
      if (i % 300 === 299) snaps.push(R.snapshot(g));
    }
    return snaps;
  };
  const a = play(42), b = play(42);
  check('the same seed and inputs give the same game, frame for frame', a, b);
  const c = play(43);
  ok('a different seed gives a different game', JSON.stringify(a) !== JSON.stringify(c));
  ok('thirty seconds in, something happened', a[5].score > 0 || a[5].lives < 3 || a[5].shields.some((s, i) => s < R.makeShield(i).total));
  const rng1 = R.makeRng(9), rng2 = R.makeRng(9);
  check('the generator itself repeats', [rng1.next(), rng1.next(), rng1.int(10)], [rng2.next(), rng2.next(), rng2.int(10)]);
}

console.log('\n== collisions never skip ==');
{
  // A fast player shot must not tunnel through the thin top of a shield.
  const g = G();
  g.reloadTimer = 1e9; g.mysteryTimer = 1e9; g.formation.timer = 1e9;
  const sh = g.shields[3];
  R.setPlayerX(g, sh.x + 2 * C.P - C.playerW / 2 + 1);    // the narrow corner column
  const before = sh.left;
  run(g, 40, { fire: true });
  ok('a shot at the shield corner still lands', sh.left < before);
  ok('overlap helper agrees with itself', R.rectsOverlap({ x: 0, y: 0, w: 2, h: 2 }, { x: 1, y: 1, w: 2, h: 2 }) && !R.rectsOverlap({ x: 0, y: 0, w: 2, h: 2 }, { x: 2, y: 0, w: 2, h: 2 }));
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
