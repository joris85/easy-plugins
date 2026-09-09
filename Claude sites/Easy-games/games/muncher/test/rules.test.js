'use strict';

/* Easy Muncher - the rules engine test suite.
 *
 *   node games/muncher/test/rules.test.js
 *
 * The engine is pure: no canvas, no DOM, seeded randomness, fixed ticks. So
 * every ghost's mind, the mode clock, the tunnels and the cornering can be
 * driven here and asserted exactly. Exits non-zero on any failure.
 */
const fs = require('fs');
// rules.js is a plain script, not a module: it declares `const MuncherRules`,
// so it has to be evaluated in the global scope and then hoisted out.
(0, eval)(fs.readFileSync(require('path').join(__dirname, '..', 'js', 'rules.js'), 'utf8')
          + '\n;globalThis.MuncherRules = MuncherRules;');
const R = globalThis.MuncherRules;
const TICK = R.TICK;

let pass = 0, fail = 0;
const check = (n, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log('  FAIL ' + n + '\n    got  ' + JSON.stringify(got) + '\n    want ' + JSON.stringify(want)); }
};
const ok = (n, c, d) => { if (c) pass++; else { fail++; console.log('  FAIL ' + n + (d ? '  ' + d : '')); } };
const near = (a, b, eps) => Math.abs(a - b) <= (eps == null ? 1e-6 : eps);

/** Run the clock for `sec` seconds, one tick at a time. Returns all events. */
function run(s, sec) {
  const ev = [];
  const n = Math.round(sec / TICK);
  for (let i = 0; i < n; i++) ev.push.apply(ev, R.update(s, TICK));
  return ev;
}
/** Skip the READY pause. */
function go(s) { s.phase = 'play'; s.phaseT = 0; }
/** Lock every ghost in the house so the player can be tested alone. */
function calm(s) {
  s.spec.noDotTime = Infinity;
  s.ghosts.forEach((g, i) => {
    g.state = 'home'; g.mode = 'normal'; g.dotLimit = Infinity;
    g.x = R.HOUSE.slots[Math.min(i, 2)]; g.y = R.HOUSE.y;
  });
}
function placeGhost(g, x, y, dir) { g.x = x; g.y = y; R.setDir(g, dir); g.state = 'out'; g.mode = 'normal'; }
function placePlayer(s, x, y, dir) { s.player.x = x; s.player.y = y; R.setDir(s.player, dir); s.player.moving = true; s.player.want = null; }
const tile = (e) => [Math.floor(e.x), Math.floor(e.y)];

console.log('\n== the maze ==');
{
  const s = R.newGame({ seed: 1 });
  check('28 columns', R.COLS, 28);
  check('31 rows', R.ROWS, 31);
  ok('every row is 28 wide', R.MAP.every((r) => r.length === 28));
  check('254 pellets including the four power pellets', R.countPellets(s), 254);
  let power = 0;
  for (const c of s.tiles) if (c === 'o') power++;
  check('four power pellets', power, 4);
  check('two tunnel rows', R.TUNNEL_ROWS, [9, 19]);

  // No dead ends: every walkable tile outside the house has two open neighbours.
  const openAt = (x, y) => R.playerPassable(s, x, y);
  const dead = [];
  for (let y = 0; y < R.ROWS; y++) for (let x = 0; x < R.COLS; x++) {
    const c = R.MAP[y][x];
    if (c !== '.' && c !== 'o') continue;
    let n = 0;
    for (const d of Object.values(R.DIRS)) if (openAt(x + d.dx, y + d.dy)) n++;
    if (n < 2) dead.push([x, y]);
  }
  check('no dead ends', dead, []);

  // Every pellet reachable from the start, walking like the player does.
  const seen = new Set();
  const q = [[14, 21]];
  seen.add('14,21');
  while (q.length) {
    const [x, y] = q.shift();
    for (const d of Object.values(R.DIRS)) {
      const nx = R.wrapX(x + d.dx), ny = y + d.dy;
      if (!openAt(nx, ny) || seen.has(nx + ',' + ny)) continue;
      seen.add(nx + ',' + ny); q.push([nx, ny]);
    }
  }
  let unreachable = 0;
  for (let y = 0; y < R.ROWS; y++) for (let x = 0; x < R.COLS; x++) {
    const c = R.MAP[y][x];
    if ((c === '.' || c === 'o') && !seen.has(x + ',' + y)) unreachable++;
  }
  check('every pellet can be reached', unreachable, 0);
  ok('the door blocks the player', !R.playerPassable(s, 13, 12) && !R.playerPassable(s, 14, 12));
  ok('the tunnel mouth is open on both sides', openAt(0, 9) && openAt(27, 9) && openAt(0, 19) && openAt(27, 19));
}

console.log('\n== four minds, four targets ==');
{
  const s = R.newGame({ seed: 1 });
  go(s);
  s.mode = 'chase';
  const [blaze, wisp, echo, muddle] = s.ghosts;
  placeGhost(blaze, 14.5, 11.5, 'left');            // tile (14, 11)
  placePlayer(s, 10.5, 21.5, 'left');               // tile (10, 21)

  check('Blaze targets the player tile', R.targetFor(s, blaze), { x: 10, y: 21 });
  check('Wisp targets four tiles ahead', R.targetFor(s, wisp), { x: 6, y: 21 });
  R.setDir(s.player, 'down');
  check('Wisp follows the player round', R.targetFor(s, wisp), { x: 10, y: 25 });
  R.setDir(s.player, 'up');
  check('facing up, Wisp aims four up AND four left (the overflow bug, kept)', R.targetFor(s, wisp), { x: 6, y: 17 });

  R.setDir(s.player, 'left');
  // Two ahead of the player is (8, 21). Vector from Blaze (14, 11) to it is
  // (-6, +10); doubled and added back gives (2, 31).
  check('Echo doubles the vector from Blaze', R.targetFor(s, echo), { x: 2, y: 31 });
  placeGhost(blaze, 8.5, 21.5, 'left');
  check('Echo with Blaze on the spot targets that spot', R.targetFor(s, echo), { x: 8, y: 21 });
  R.setDir(s.player, 'up');
  check('Echo inherits the up bug at two tiles', R.targetFor(s, echo), { x: 8, y: 17 });
  R.setDir(s.player, 'left');

  placeGhost(muddle, 14.5, 11.5, 'left');           // 4 across, 10 down: far
  check('Muddle far away chases like Blaze', R.targetFor(s, muddle), { x: 10, y: 21 });
  placeGhost(muddle, 14.5, 21.5, 'left');           // 4 tiles away: close
  check('Muddle within eight tiles runs to its corner', R.targetFor(s, muddle), { x: 0, y: 32 });
  placeGhost(muddle, 18.5, 21.5, 'left');           // exactly 8: still close
  check('exactly eight tiles still counts as close', R.targetFor(s, muddle), { x: 0, y: 32 });
  placeGhost(muddle, 19.5, 21.5, 'left');           // 9 tiles: far
  check('nine tiles is far again', R.targetFor(s, muddle), { x: 10, y: 21 });

  s.mode = 'scatter';
  check('scatter: Blaze top right', R.targetFor(s, blaze), { x: 25, y: -3 });
  check('scatter: Wisp top left', R.targetFor(s, wisp), { x: 2, y: -3 });
  check('scatter: Echo bottom right', R.targetFor(s, echo), { x: 27, y: 32 });
  check('scatter: Muddle bottom left', R.targetFor(s, muddle), { x: 0, y: 32 });

  s.mode = 'chase';
  wisp.mode = 'eyes';
  check('eyes target the house door whatever the mode', R.targetFor(s, wisp), { x: 14, y: 11 });
}

console.log('\n== choosing a direction ==');
{
  const s = R.newGame({ seed: 1 });
  go(s);
  s.mode = 'chase';
  const g = s.ghosts[0];
  // Tile (6, 6) is a T junction: open up, left and down, wall to the right.
  placeGhost(g, 6.5, 6.5, 'down');
  placePlayer(s, 1.5, 6.5, 'left');
  check('takes the branch nearest the target', R.chooseDir(s, g, 6, 6), 'left');
  placePlayer(s, 6.5, 9.5, 'left');
  check('straight on when that is nearest', R.chooseDir(s, g, 6, 6), 'down');
  placePlayer(s, 6.5, 1.5, 'left');
  check('never reverses, even when the target is behind', R.chooseDir(s, g, 6, 6), 'left');
  // Target (5, 7) is one tile from both the left and the down branch: the
  // tie goes to the earlier of up, left, down, right.
  s.mode = 'scatter';
  g.scatter = { x: 5, y: 7 };
  check('ties break in the order up, left, down, right', R.chooseDir(s, g, 6, 6), 'left');
  g.scatter = { x: 25, y: -3 };

  // A frightened ghost picks at random, from the seed, and never goes back.
  g.mode = 'fright';
  const seenDirs = new Set();
  for (let i = 0; i < 40; i++) seenDirs.add(R.chooseDir(s, g, 6, 6));
  ok('frightened choices vary', seenDirs.size > 1, [...seenDirs].join(','));
  ok('frightened choices never include the way back', !seenDirs.has('up'));
  g.mode = 'normal';

  // In a corridor there is only one way on.
  placeGhost(g, 6.5, 8.5, 'down');
  check('a corridor gives the only option', R.chooseDir(s, g, 6, 8), 'down');
}

console.log('\n== moving tile by tile ==');
{
  const s = R.newGame({ seed: 1 });
  go(s);
  const g = s.ghosts[0];
  placeGhost(g, 6.5, 8.2, 'down');            // 0.3 short of the centre of tile (6, 8)
  const centres = [];
  R.stepEntity(s, g, 1.0, R.ghostPassable, (st, e, tx, ty) => centres.push([tx, ty]));
  check('passes one centre in one tile of travel', centres, [[6, 8]]);
  ok('and lands 0.7 beyond it', near(g.y, 9.2) && near(g.x, 6.5), g.x + ',' + g.y);

  placeGhost(g, 6.5, 6.5, 'right');                 // wall to the right
  R.stepEntity(s, g, 0.5, R.ghostPassable, null);
  ok('stops flush at the centre when the next tile is a wall', near(g.x, 6.5) && g.moving === false);

  // A step a whisker short of a centre still rounds onto it when it is added
  // on. If that did not count as arriving, the ghost would sit on a junction
  // it had never chosen at and walk into the wall on the next tick.
  placeGhost(g, 6.5, 8.4, 'down');
  let hits = 0;
  R.stepEntity(s, g, (8.5 - 8.4) - 1e-12, R.ghostPassable, () => hits++);
  check('a step a whisker short of a centre still counts as arriving', hits, 1);
  ok('and lands exactly on it', g.y === 8.5, String(g.y));
}

console.log('\n== a reversed ghost never stands still ==');
{
  const s = R.newGame({ seed: 1 });
  go(s);
  calm(s);
  s.player.moving = false;
  const g = s.ghosts[0];
  // (6, 6) is open up, left and down with a wall to the right. A ghost that
  // has just turned left there and is then reversed by a mode change is left
  // facing solid wall, which used to park it for the rest of the game.
  placeGhost(g, 6.5, 6.5, 'left');
  g.dotLimit = Infinity;
  R.reverseAll(s);
  check('the switch turns it into the wall', g.dir, 'right');
  run(s, 0.5);
  ok('it chooses another way rather than standing there',
     Math.abs(g.x - 6.5) + Math.abs(g.y - 6.5) > 0.5, g.x + ',' + g.y);
  ok('and it is moving again', g.moving);

  // The same trap on every tile out in the maze, facing every way a ghost
  // could have chosen there. Nobody may stand still for more than the one tick
  // it takes to notice and choose again.
  const frozen = [];
  for (let y = 0; y < R.ROWS; y++) for (let x = 0; x < R.COLS; x++) {
    if (x > 8 && x < 19 && y > 11 && y < 17) continue;       // inside the house
    for (const d of R.ORDER) {
      const v = R.DIRS[d];
      if (!R.ghostPassable(s, x, y) || !R.ghostPassable(s, x + v.dx, y + v.dy)) continue;
      const t = R.newGame({ seed: 1 });
      go(t); calm(t);
      t.player.x = 14; t.player.y = R.HOUSE.y;                // parked out of reach
      t.player.moving = false;
      const h = t.ghosts[0];
      placeGhost(h, x + 0.5, y + 0.5, d);
      h.dotLimit = Infinity;
      R.reverseAll(t);
      let still = 0, worst = 0, px = h.x, py = h.y;
      for (let i = 0; i < 30; i++) {
        R.update(t, TICK);
        if (h.x === px && h.y === py) still++; else { still = 0; px = h.x; py = h.y; }
        if (still > worst) worst = still;
      }
      if (worst > 3) frozen.push([x, y, d, worst]);
    }
  }
  check('no tile in the maze can freeze a reversed ghost', frozen, []);
}

console.log('\n== the tunnels wrap ==');
{
  const s = R.newGame({ seed: 1 });
  go(s);
  calm(s);
  const g = s.ghosts[0];
  placeGhost(g, 0.5, 9.5, 'left');
  s.spec.noDotTime = Infinity;
  R.stepEntity(s, g, 1.0, R.ghostPassable, null);
  ok('a ghost leaving the left edge comes in on the right', near(g.x, 27.5), 'x ' + g.x);
  placeGhost(g, 27.5, 19.5, 'right');
  R.stepEntity(s, g, 1.0, R.ghostPassable, null);
  ok('and the other tunnel wraps the other way', near(g.x, 0.5), 'x ' + g.x);
  placeGhost(g, 27.9, 9.5, 'right');
  R.stepEntity(s, g, 0.3, R.ghostPassable, null);
  ok('a fractional step across the seam wraps too', near(g.x, 0.2), 'x ' + g.x);

  calm(s);                                          // the ghost was parked in the tunnel
  placePlayer(s, 1.5, 9.5, 'left');
  run(s, 0.5);
  ok('the player wraps as well', s.player.x > 20, 'x ' + s.player.x);

  ok('tunnel tiles are recognised', R.isTunnel(2, 9) && R.isTunnel(25, 19) && !R.isTunnel(10, 9) && !R.isTunnel(2, 10));
  placeGhost(g, 2.5, 9.5, 'left');
  ok('ghosts crawl in the tunnel', near(R.ghostSpeed(s, g), R.BASE * 0.40));
  placeGhost(g, 10.5, 9.5, 'up');
  ok('and run at full speed out of it', near(R.ghostSpeed(s, g), R.BASE * 0.75));
}

console.log('\n== scatter and chase on the clock ==');
{
  const s = R.newGame({ seed: 1 });
  check('READY lasts 2.2 seconds', s.phaseT, 2.2);
  run(s, 2.2);
  check('then play begins', s.phase, 'play');
  calm(s);
  s.player.moving = false;
  const g = s.ghosts[0];
  placeGhost(g, 6.5, 8.5, 'down');
  g.dotLimit = Infinity;

  check('level 1 opens in scatter', s.mode, 'scatter');
  // Blaze is out patrolling, so which way it faces at the seven second mark is
  // whatever the patrol has it doing. What matters is that the switch flips it.
  const first = run(s, 7.0 - TICK);
  const facing = g.dir;
  first.push.apply(first, run(s, TICK));
  check('7 s later it is chase', s.mode, 'chase');
  ok('the switch is announced', first.some((e) => e.type === 'mode' && e.mode === 'chase'));
  check('and the ghost turned round', g.dir, R.OPPOSITE[facing]);
  calm(s);                                          // or Blaze catches the parked player and resets the clock
  run(s, 20);
  check('20 s of chase, then scatter', s.mode, 'scatter');
  run(s, 7);  check('7 s scatter', s.mode, 'chase');
  run(s, 20); check('20 s chase', s.mode, 'scatter');
  run(s, 5);  check('5 s scatter', s.mode, 'chase');
  run(s, 20); check('20 s chase', s.mode, 'scatter');
  run(s, 5);  check('5 s scatter, then chase', s.mode, 'chase');
  run(s, 200);
  check('and chase for ever after', s.mode, 'chase');

  check('level 5 opens with a 5 s scatter', R.levelSpec(5).schedule[0], 5);
  check('level 2 keeps the 7 s scatter', R.levelSpec(2).schedule[0], 7);
  check('later levels shrink the last scatter to a blink', R.levelSpec(3).schedule[6], 1 / 60);

  const d = R.newGame({ seed: 1 });
  go(d); calm(d); d.player.moving = false;
  run(d, 3);
  const before = d.modeT;
  R.startFright(d);
  run(d, 2);
  ok('the mode clock stands still while ghosts are frightened', near(d.modeT, before), before + ' vs ' + d.modeT);
}

console.log('\n== frightened ==');
{
  const s = R.newGame({ seed: 1 });
  go(s);
  calm(s);
  const g = s.ghosts[0];
  placeGhost(g, 6.5, 8.5, 'down');
  g.dotLimit = Infinity;
  s.player.moving = false;

  check('level 1 gives six seconds', R.levelSpec(1).frightTime, 6);
  check('level 3 gives four', R.levelSpec(3).frightTime, 4);
  check('level 9 gives one', R.levelSpec(9).frightTime, 1);
  check('level 17 gives none', R.levelSpec(17).frightTime, 0);
  check('level 30 gives none', R.levelSpec(30).frightTime, 0);

  R.startFright(s);
  ok('fright is on', s.fright.on && near(s.fright.t, 6));
  check('the ghost turned blue', g.mode, 'fright');
  check('and reversed', g.dir, 'up');
  ok('frightened ghosts are slow', near(R.ghostSpeed(s, g), R.BASE * 0.5));
  ok('the player is faster while they are blue', near(R.playerSpeed(s), R.BASE * 0.9));
  run(s, 5.9);
  check('still blue just before the end', g.mode, 'fright');
  const ev = run(s, 0.2);
  check('normal again after six seconds', g.mode, 'normal');
  ok('the end is announced', ev.some((e) => e.type === 'frightEnd'));
  ok('fright is off', !s.fright.on);

  // Eating ghosts doubles each time within one pellet.
  R.startFright(s);
  s.score = 0;
  const pts = [];
  s.ghosts.forEach((h) => { h.state = 'out'; h.mode = 'fright'; });
  s.ghosts.forEach((h) => { R.eatGhost(s, h); pts.push(s.events.pop().points); });
  check('200, 400, 800, 1600', pts, [200, 400, 800, 1600]);
  check('a total of 3000', s.score, 3000);
  ok('eaten ghosts become eyes', s.ghosts.every((h) => h.mode === 'eyes'));
  ok('and the game freezes briefly', s.freezeT > 0);
  R.startFright(s);
  check('a new power pellet restarts the chain', s.fright.chain, 0);

  // A late level: the power pellet only turns them round.
  const late = R.newGame({ seed: 1, level: 19 });
  go(late);
  const h = late.ghosts[0];
  placeGhost(h, 6.5, 8.5, 'down');
  R.startFright(late);
  ok('no fright at level 19', !late.fright.on);
  check('but the ghosts still reverse', h.dir, 'up');
  check('and stay dangerous', h.mode, 'normal');
}

console.log('\n== pellets, fruit and the end of a level ==');
{
  const s = R.newGame({ seed: 1 });
  go(s);
  calm(s);
  check('254 to eat', s.pelletsLeft, 254);
  const ev = run(s, TICK);
  check('the start tile is eaten on the first tick', s.pelletsLeft, 253);
  check('a pellet is ten points', s.score, 10);
  ok('and announced', ev.some((e) => e.type === 'pellet'));
  check('eating stalls the player for one tick', s.player.stall, 1);
  const x0 = s.player.x;
  run(s, TICK);
  ok('so the next tick moves nobody', near(s.player.x, x0));
  run(s, TICK);
  ok('and the one after does', s.player.x < x0);

  // A power pellet: 50 points, three stalled ticks, ghosts blue.
  placePlayer(s, 1.5, 6.5, 'left');
  s.player.moving = false;
  run(s, TICK);
  check('a power pellet is fifty points', s.score, 60);
  check('and stalls three ticks', s.player.stall, 3);
  ok('and frightens the ghosts', s.fright.on);

  // Fruit shows at 70 and 170 pellets, for nine to ten seconds.
  const f = R.newGame({ seed: 3 });
  go(f); calm(f);
  f.pelletsEaten = 69;
  placePlayer(f, 3.5, 1.5, 'left');
  run(f, TICK);
  ok('the 70th pellet brings fruit', !!f.fruit, JSON.stringify(f.fruit));
  check('a cherry on level one', f.fruit.kind, 'cherry');
  check('worth 100', f.fruit.value, 100);
  ok('for nine to ten seconds', f.fruit.t >= 9 && f.fruit.t <= 10, String(f.fruit.t));
  ok('below the house', f.fruit.x === 14 && f.fruit.y === 17.5);
  run(f, 10.1);
  ok('and it is gone after that', !f.fruit);
  f.pelletsEaten = 169;
  placePlayer(f, 20.5, 1.5, 'left');               // a pellet nobody has eaten yet
  run(f, TICK);
  ok('the 170th brings the second', !!f.fruit);
  placePlayer(f, 13.9, 17.5, 'right');
  run(f, TICK * 3);
  ok('eating it pays', f.score >= 100 && !f.fruit, 'score ' + f.score);
  check('later levels bring better fruit', [R.levelSpec(2).fruit.kind, R.levelSpec(7).fruit.value, R.levelSpec(40).fruit.value], ['berry', 1000, 5000]);

  // The last pellet ends the level.
  const e = R.newGame({ seed: 1 });
  go(e); calm(e);
  R.leavePellets(e, 1);
  check('one left', e.pelletsLeft, 1);
  check('the count agrees with the map', R.countPellets(e), 1);
  placePlayer(e, 26.5, 29.5, 'left');
  const evc = run(e, TICK);
  check('eating it clears the level', e.phase, 'clear');
  ok('with an event', evc.some((x) => x.type === 'clear' && x.level === 1));
  run(e, 2.6);
  check('level two follows', e.level, 2);
  check('with a fresh maze', e.pelletsLeft, 254);
  check('and a READY pause', e.phase, 'ready');
  check('level 2 is faster', R.levelSpec(2).player, 0.9);
  check('level 5 is full speed', R.levelSpec(5).player, 1.0);
  check('level 21 slows the player again', R.levelSpec(21).player, 0.9);
}

console.log('\n== cornering and buffered turns ==');
{
  const s = R.newGame({ seed: 1 });
  go(s);
  calm(s);
  const p = s.player;
  check('starts moving left', p.dir, 'left');
  R.setWant(s, 'up');                                // a wall: must wait
  run(s, 10 * TICK);
  check('a turn into a wall stays buffered', p.want, 'up');
  check('and the player carries on', p.dir, 'left');

  // Column 11 opens downward from the start row. Ask for it now, far away.
  R.setWant(s, 'down');
  let turnedAt = null;
  for (let i = 0; i < 120 && turnedAt === null; i++) {
    R.update(s, TICK);
    if (p.dir === 'down') turnedAt = p.x;
  }
  ok('the buffered turn fires at the corner', turnedAt !== null);
  ok('a little BEFORE the centre line (pre-turn)', turnedAt > 11.5 && turnedAt <= 11.5 + R.CORNER + 0.01, 'x ' + turnedAt);
  ok('the buffer is consumed', p.want === null);
  run(s, 6 * TICK);
  ok('and the player slides onto the lane while moving', near(p.x, 11.5) && p.y > 21.5, p.x + ',' + p.y);

  // Reversing is instant, wherever you are.
  R.setWant(s, 'up');
  run(s, TICK);
  check('a reverse takes effect at once', p.dir, 'up');

  // Post-turn: past the centre but still within the tile, the turn is allowed
  // and the player eases back onto the lane.
  placePlayer(s, 11.3, 21.5, 'left');               // past the centre of tile 11, heading left
  R.setWant(s, 'down');
  run(s, TICK);
  check('a turn just past the centre is taken', p.dir, 'down');
  ok('and pulls back to the lane', p.x > 11.3 && p.x <= 11.5, 'x ' + p.x);

  // Too far past the centre and it has to wait.
  placePlayer(s, 11.0, 21.5, 'right');              // heading away, half a tile out
  R.setWant(s, 'down');
  run(s, TICK);
  check('half a tile away it is only buffered', p.dir, 'right');
  check('still wanted', p.want, 'down');

  // Stopped against a wall, a possible turn starts you moving again.
  placePlayer(s, 8.5, 21.5, 'left');                // (7, 21) is wall
  run(s, TICK);
  ok('a wall stops the player flush', near(p.x, 8.5) && p.moving === false);
  R.setWant(s, 'up');                                // (8, 20) is open
  run(s, 2 * TICK);
  check('a valid turn gets it going', p.dir, 'up');
  ok('moving again', p.moving && p.y < 21.5);
}

console.log('\n== leaving the house ==');
{
  const s = R.newGame({ seed: 1 });
  go(s);
  s.player.moving = false;
  const [blaze, wisp, echo, muddle] = s.ghosts;
  check('Blaze starts outside', blaze.state, 'out');
  check('the others start at home', [wisp.state, echo.state, muddle.state], ['home', 'home', 'home']);
  check('level 1 pellet limits', [wisp.dotLimit, echo.dotLimit, muddle.dotLimit], [0, 30, 60]);
  run(s, TICK);
  check('Wisp leaves at once', wisp.state, 'leaving');
  run(s, 1.5);
  check('and is out within two seconds', wisp.state, 'out');
  check('Echo waits for thirty pellets', echo.state, 'home');
  s.dotsSinceReset = 30;
  run(s, TICK);
  check('and leaves when they are eaten', echo.state, 'leaving');
  run(s, 1.5);
  check('Muddle is still waiting', muddle.state, 'home');
  s.noDotT = 0;
  run(s, 4.1);
  check('four seconds without a pellet frees the next one anyway', muddle.state !== 'home', true);
  check('level 3 lets everyone out at once', R.levelSpec(3).dotLimits, [0, 0, 0, 0]);
  check('level 5 shortens the no-pellet timer', R.levelSpec(5).noDotTime, 3);
}

console.log('\n== eyes go home and come back ==');
{
  const s = R.newGame({ seed: 1 });
  go(s);
  calm(s);
  s.player.moving = false;
  const g = s.ghosts[1];
  placeGhost(g, 18.5, 11.5, 'left');
  g.mode = 'eyes';
  ok('eyes are fast', near(R.ghostSpeed(s, g), R.BASE * 1.5));
  let entered = false, revived = false;
  for (let i = 0; i < 300 && !revived; i++) {
    const ev = R.update(s, TICK);
    if (g.state === 'entering') entered = true;
    if (ev.some((e) => e.type === 'revived')) revived = true;
  }
  ok('the eyes reach the door and go in', entered);
  ok('and the ghost is reborn inside', revived && g.mode === 'normal');
  run(s, 2);
  check('then it walks straight back out', g.state, 'out');
  ok('the door is not a path: nobody walks through it', !R.ghostPassable(s, 13, 12));
}

console.log('\n== catching and being caught ==');
{
  const s = R.newGame({ seed: 1 });
  go(s);
  calm(s);
  const g = s.ghosts[0];
  placeGhost(g, 14.5, 21.5, 'left');
  const ev = run(s, TICK);
  check('a ghost on your tile ends the life', s.phase, 'dying');
  ok('with a die event', ev.some((e) => e.type === 'die'));
  check('three lives to start', s.lives, 3);
  run(s, 2.1);
  check('one life fewer', s.lives, 2);
  check('back to READY', s.phase, 'ready');
  ok('everyone back at the start', s.player.x === 14 && s.player.y === 21.5 && g.x === 14 && g.y === 11.5);
  check('the house empties faster after a death', [s.ghosts[2].dotLimit, s.ghosts[3].dotLimit], [7, 17]);
  ok('pellets are not restored', s.pelletsLeft < 254);

  // Two more deaths and it is over.
  for (let k = 0; k < 2; k++) {
    go(s); calm(s);
    placeGhost(g, 14.5, 21.5, 'left');
    run(s, 2.2);
  }
  check('no lives left means game over', s.phase, 'over');
  check('lives read zero', s.lives, 0);

  // Frightened ghosts on your tile are lunch, not death.
  const f = R.newGame({ seed: 1 });
  go(f); calm(f);
  const h = f.ghosts[0];
  placeGhost(h, 14.5, 21.5, 'left');
  R.startFright(f);
  run(f, TICK);
  check('a blue ghost on your tile is eaten', h.mode, 'eyes');
  check('for 200', f.score, 200 + 10);
  check('and play continues', f.phase, 'play');

  // Overlapping bodies across a tile edge also count.
  const o = R.newGame({ seed: 1 });
  go(o); calm(o);
  const k = o.ghosts[0];
  placeGhost(k, 13.6, 21.5, 'right');                // tile 13, the player is in tile 14 at x = 14.0
  run(o, TICK);
  check('bodies overlapping across a tile edge collide', o.phase, 'dying');
}

console.log('\n== cruise mode and the extra life ==');
{
  const s = R.newGame({ seed: 1 });
  go(s);
  const g = s.ghosts[0];
  s.ghosts[3].state = 'out';
  placeGhost(g, 6.5, 8.5, 'down');
  ok('normal speed with plenty left', near(R.ghostSpeed(s, g), R.BASE * 0.75));
  s.pelletsLeft = 20;
  ok('faster at twenty pellets', near(R.ghostSpeed(s, g), R.BASE * 0.80));
  s.pelletsLeft = 10;
  ok('faster again at ten', near(R.ghostSpeed(s, g), R.BASE * 0.85));
  s.ghosts[3].state = 'home';
  ok('but not while Muddle is still at home', near(R.ghostSpeed(s, g), R.BASE * 0.75));
  check('the threshold grows with the level', [R.levelSpec(2).elroy1, R.levelSpec(6).elroy1, R.levelSpec(20).elroy1], [30, 50, 120]);

  const e = R.newGame({ seed: 1 });
  go(e); calm(e);
  e.score = 9995;
  run(e, TICK);                                     // eats the start pellet
  check('ten thousand points earns a life', e.lives, 4);
  ok('once only', (e.score = 30000, R.eatGhost(e, e.ghosts[0]), e.lives === 4));
}

console.log('\n== determinism ==');
{
  const play = (seed) => {
    const s = R.newGame({ seed });
    const wants = ['down', 'left', 'up', 'right', 'up', 'left', 'down'];
    let k = 0;
    for (let t = 0; t < 40; t += 0.5) {
      R.setWant(s, wants[k++ % wants.length]);
      if (near(t, 4)) R.startFright(s);
      run(s, 0.5);
      if (s.phase === 'over') break;
    }
    return JSON.stringify({
      p: [s.player.x, s.player.y, s.player.dir],
      g: s.ghosts.map((g) => [g.x, g.y, g.dir, g.state, g.mode]),
      score: s.score, left: s.pelletsLeft, mode: s.mode, lives: s.lives, phase: s.phase
    });
  };
  const a = play(7), b = play(7), c = play(8);
  ok('the same seed and inputs replay the same game', a === b);
  ok('a different seed plays out differently', a !== c);
  ok('the game actually ran', JSON.parse(a).left < 254 && JSON.parse(a).score > 0);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
/* Set the code and let node finish on its own, rather than process.exit().
   These suites load a plain browser script with an indirect (0, eval), and on
   node 24.7 that combination segfaults on roughly one run in ten - after the
   summary has printed, so the tests all pass and the shell still sees 139.
   Isolated: eval-load alone is clean, process.exit alone is clean, together
   they crash. Exit codes are how every check here is judged, so they have to
   be trustworthy. */
process.exitCode = fail ? 1 : 0;
