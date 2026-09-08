'use strict';

/* Easy Missiles - the rules engine.

   Pure logic: no canvas, no DOM, seeded randomness. The whole wave can be
   stepped from node, which is how every number below was checked rather than
   eyeballed. missiles.js only draws what this produces and plays sounds for
   the events it returns.

   THE GAME. Six cities and three batteries sit on the ground. Warheads fall
   from the top of the sky in straight lines towards a chosen city or battery.
   The player fires an interceptor at a point in the sky; it flies there from
   the nearest battery with ammo and detonates into a blast that grows, holds,
   then shrinks. Anything inside the blast at any moment dies.

   LEADING THE TARGET IS THE SKILL. The interceptor takes time to arrive and the
   blast takes time to grow, so a shot placed on top of a warhead is wasted; it
   has to be placed where the warhead will be. Nothing here helps with that:
   there is no aim assist and the blast is the same size every time.

   TWO COLLECTION RULES that this engine leans on: a warhead that splits in
   mid-air must not push its children into the list being walked, and a kill
   must never splice the list a nested call is iterating. Every walk here runs
   over a snapshot, marks the dead, and filters afterwards. */

const MissileRules = (function () {

  const DEFAULTS = {
    width: 860,
    height: 620,
    groundY: 566,
    batteries: [70, 430, 790],                 // x of the three launch mounds
    cities: [160, 250, 340, 520, 610, 700],    // x of the six cities
    ammo: 10,                                  // per battery, per wave, no refill mid-wave
    interceptorSpeed: [400, 640, 400],         // the centre battery is the fast one
    launchHeight: 14,                          // interceptors leave from the mound top
    minAim: 40,                                // no shot closer than this to the ground
    blast: { maxR: 36, expand: 0.6, hold: 0.35, contract: 0.6 },
    maxStep: 1 / 60,                           // engine substep, so a big dt cannot skip a hit
    leadIn: 1.2,                               // quiet seconds before the first warhead
    warheadBase: 8, warheadPerWave: 2, warheadMax: 30,
    speedBase: 50, speedPerWave: 7, speedMax: 150,
    splitFrom: 2, splitChance: 0.12, splitChanceMax: 0.45, tripleFrom: 5,
    smartFrom: 4, smartMax: 5, smartSpeed: 0.85,
    smartTurn: 48,                             // lateral px/s a smart bomb can manage
    smartSense: 30,                            // it dodges a blast this far outside its full size
    points: { warhead: 25, smart: 125, missile: 5, city: 100 },
    bonusCityEvery: 10000
  };

  /* ---------- randomness ---------- */

  /** Mulberry32. One 32-bit counter, so a seed fully determines a game. */
  function makeRng(seed) {
    let a = (seed == null ? 1 : seed) >>> 0;
    const next = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.state = () => a >>> 0;
    return next;
  }

  /* ---------- game state ---------- */

  function makeGame(cfg, seed) {
    const c = Object.assign({}, DEFAULTS, cfg || {});
    c.blast = Object.assign({}, DEFAULTS.blast, (cfg && cfg.blast) || {});
    c.points = Object.assign({}, DEFAULTS.points, (cfg && cfg.points) || {});
    return {
      cfg: c,
      rng: makeRng(seed),
      seed: seed == null ? 1 : seed,
      phase: 'idle',                 // idle | wave | tally | over
      wave: 1,
      score: 0,
      cities: c.cities.map(() => true),
      batteries: c.batteries.map((x, i) => ({ x, ammo: c.ammo, dead: false, speed: c.interceptorSpeed[i] })),
      warheads: [],
      interceptors: [],
      blasts: [],
      plan: null,                    // the wave schedule, see generateWave
      cursor: 0,                     // next schedule entry to release
      time: 0,
      bank: 0,                       // bonus cities earned and not yet placed
      nextBonusCity: c.bonusCityEvery,
      tally: null,
      nextId: 1,
      stats: { shots: 0, kills: 0, smartKills: 0 }
    };
  }

  /** Waves 1-2 pay x1, 3-4 pay x2, up to x6 from wave 11 on. */
  function multiplierFor(wave) {
    return Math.min(6, Math.ceil(wave / 2));
  }

  function liveCities(g) {
    const out = [];
    for (let i = 0; i < g.cities.length; i++) if (g.cities[i]) out.push(i);
    return out;
  }

  function totalAmmo(g) {
    let n = 0;
    for (const b of g.batteries) n += b.ammo;
    return n;
  }

  /** Everything a warhead may be aimed at right now. */
  function liveTargets(g) {
    const t = [];
    for (let i = 0; i < g.cities.length; i++) if (g.cities[i]) t.push({ kind: 'city', i, x: g.cfg.cities[i] });
    for (let i = 0; i < g.batteries.length; i++) if (!g.batteries[i].dead) t.push({ kind: 'battery', i, x: g.cfg.batteries[i] });
    return t;
  }

  function pickTarget(rng, targets, cfg) {
    if (!targets.length) return { kind: 'ground', i: -1, x: 40 + rng() * (cfg.width - 80) };
    const t = targets[Math.floor(rng() * targets.length)];
    return { kind: t.kind, i: t.i, x: t.x };
  }

  /* ---------- wave generation ---------- */

  /** The whole wave as a sorted release schedule. Deterministic for one rng. */
  function generateWave(wave, rng, cfg, targets) {
    const count = Math.min(cfg.warheadMax, cfg.warheadBase + cfg.warheadPerWave * (wave - 1));
    const speed = Math.min(cfg.speedMax, cfg.speedBase + cfg.speedPerWave * (wave - 1));
    const smart = wave >= cfg.smartFrom ? Math.min(cfg.smartMax, wave - cfg.smartFrom + 1) : 0;
    const splitChance = wave >= cfg.splitFrom
      ? Math.min(cfg.splitChanceMax, cfg.splitChance * (wave - cfg.splitFrom + 1)) : 0;

    // Warheads arrive in flights rather than a steady drizzle, which is what
    // makes one well placed blast able to take several at once.
    const groupSize = 3 + Math.floor(wave / 3);
    const gap = Math.max(2.4, 6 - wave * 0.35);
    const schedule = [];
    for (let i = 0; i < count; i++) {
      const group = Math.floor(i / groupSize);
      const w = {
        kind: 'warhead',
        at: cfg.leadIn + group * gap + rng() * 1.2,
        x0: 20 + rng() * (cfg.width - 40),
        target: pickTarget(rng, targets, cfg),
        speed,
        splitY: null,
        children: 0
      };
      if (splitChance > 0 && rng() < splitChance) {
        // Split somewhere in the upper half, never so low that the children
        // cannot be answered.
        w.splitY = cfg.groundY * (0.2 + rng() * 0.3);
        w.children = wave >= cfg.tripleFrom && rng() < 0.5 ? 3 : 2;
      }
      schedule.push(w);
    }
    const span = Math.ceil(count / groupSize) * gap;
    for (let i = 0; i < smart; i++) {
      schedule.push({
        kind: 'smart',
        at: cfg.leadIn + gap + rng() * Math.max(1, span - gap),
        x0: 20 + rng() * (cfg.width - 40),
        target: pickTarget(rng, targets, cfg),
        speed: speed * cfg.smartSpeed,
        splitY: null,
        children: 0
      });
    }
    schedule.sort((a, b) => a.at - b.at);
    return { wave, count, smart, speed, splitChance, schedule };
  }

  function startWave(g) {
    const c = g.cfg;
    for (const b of g.batteries) { b.ammo = c.ammo; b.dead = false; }
    g.warheads = []; g.interceptors = []; g.blasts = [];
    g.time = 0; g.cursor = 0; g.tally = null;
    g.plan = generateWave(g.wave, g.rng, c, liveTargets(g));
    g.phase = 'wave';
    return g.plan;
  }

  /* ---------- objects ---------- */

  function spawnWarhead(g, def, x0, y0) {
    const c = g.cfg;
    const tx = def.target.x, ty = c.groundY;
    const dx = tx - x0, dy = ty - y0;
    const d = Math.hypot(dx, dy) || 1;
    const w = {
      id: g.nextId++,
      kind: def.kind,
      x: x0, y: y0, x0, y0,
      tx, ty,
      vx: dx / d * def.speed, vy: dy / d * def.speed,
      speed: def.speed,
      target: def.target,
      splitY: def.splitY, children: def.children,
      alive: true
    };
    g.warheads.push(w);
    return w;
  }

  /** Radius of a blast at a given age, in px. Zero once it is over. */
  function blastRadius(age, blast) {
    const b = blast;
    if (age <= 0) return 0;
    if (age < b.expand) return b.maxR * (age / b.expand);
    if (age < b.expand + b.hold) return b.maxR;
    const t = age - b.expand - b.hold;
    if (t < b.contract) return b.maxR * (1 - t / b.contract);
    return 0;
  }

  function blastTotal(blast) { return blast.expand + blast.hold + blast.contract; }

  /* ---------- firing ---------- */

  /** Index of the battery with ammo nearest to x, or -1 when all are empty. */
  function nearestBattery(g, x) {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < g.batteries.length; i++) {
      const b = g.batteries[i];
      if (b.ammo <= 0 || b.dead) continue;
      const d = Math.abs(b.x - x);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  /** Launch one interceptor at (x, y). battery is optional; null means nearest. */
  function fire(g, x, y, battery) {
    if (g.phase !== 'wave') return null;
    const c = g.cfg;
    const i = battery == null ? nearestBattery(g, x) : battery;
    if (i < 0 || i >= g.batteries.length) return null;
    const b = g.batteries[i];
    if (b.ammo <= 0 || b.dead) return null;

    const tx = Math.max(4, Math.min(c.width - 4, x));
    const ty = Math.max(4, Math.min(c.groundY - c.minAim, y));
    const bx = b.x, by = c.groundY - c.launchHeight;
    const d = Math.hypot(tx - bx, ty - by) || 1;
    const m = {
      id: g.nextId++,
      battery: i,
      bx, by, x: bx, y: by, tx, ty,
      vx: (tx - bx) / d * b.speed, vy: (ty - by) / d * b.speed,
      speed: b.speed,
      alive: true
    };
    b.ammo--;
    g.stats.shots++;
    g.interceptors.push(m);
    return m;
  }

  /* ---------- stepping ---------- */

  function step(g, dt) {
    const ev = [];
    if (g.phase !== 'wave') return ev;
    let acc = dt;
    while (acc > 0) {
      const h = Math.min(g.cfg.maxStep, acc);
      acc -= h;
      substep(g, h, ev);
      if (g.phase !== 'wave') break;
    }
    return ev;
  }

  function substep(g, h, ev) {
    const c = g.cfg;
    g.time += h;

    // Release whatever the schedule says is due.
    const sched = g.plan.schedule;
    while (g.cursor < sched.length && sched[g.cursor].at <= g.time) {
      const def = sched[g.cursor++];
      const w = spawnWarhead(g, def, def.x0, -6);
      ev.push({ type: 'spawn', kind: w.kind, id: w.id });
    }

    // Interceptors fly to their point and become blasts.
    for (const m of g.interceptors.slice()) {
      const remain = Math.hypot(m.tx - m.x, m.ty - m.y);
      const stepLen = m.speed * h;
      if (remain <= stepLen) {
        m.alive = false;
        g.blasts.push({ id: g.nextId++, x: m.tx, y: m.ty, age: 0, alive: true });
        ev.push({ type: 'blast', x: m.tx, y: m.ty });
      } else {
        m.x += m.vx * h; m.y += m.vy * h;
      }
    }
    g.interceptors = g.interceptors.filter((m) => m.alive);

    // Blasts age and fade.
    const total = blastTotal(c.blast);
    for (const b of g.blasts) {
      b.age += h;
      if (b.age >= total) b.alive = false;
    }
    g.blasts = g.blasts.filter((b) => b.alive);

    // Warheads move, split, and land. Children go into `born`, never into the
    // list being walked.
    const born = [];
    for (const w of g.warheads.slice()) {
      if (!w.alive) continue;
      if (w.kind === 'smart') steerSmart(g, w, h);
      w.x += w.vx * h; w.y += w.vy * h;

      if (w.splitY != null && w.y >= w.splitY) {
        w.alive = false;
        const targets = liveTargets(g);
        for (let k = 0; k < w.children; k++) {
          // The first child keeps the parent's target so a split never lets a
          // threatened city off the hook; the rest fan out.
          const target = k === 0 ? w.target : pickTarget(g.rng, targets, c);
          born.push({ kind: 'warhead', target, speed: w.speed, splitY: null, children: 0, x: w.x, y: w.y });
        }
        ev.push({ type: 'split', x: w.x, y: w.y, children: w.children });
        continue;
      }

      if (w.y >= c.groundY) {
        w.alive = false;
        impact(g, w, ev);
      }
    }
    g.warheads = g.warheads.filter((w) => w.alive);
    for (const d of born) spawnWarhead(g, d, d.x, d.y);

    // Kills. A warhead is dead the moment any blast's current radius reaches it.
    const mult = multiplierFor(g.wave);
    for (const b of g.blasts) {
      const r = blastRadius(b.age, c.blast);
      if (r <= 0) continue;
      for (const w of g.warheads) {
        if (!w.alive) continue;
        if (Math.hypot(w.x - b.x, w.y - b.y) <= r) {
          w.alive = false;
          const pts = (w.kind === 'smart' ? c.points.smart : c.points.warhead) * mult;
          g.score += pts;
          g.stats.kills++;
          if (w.kind === 'smart') g.stats.smartKills++;
          ev.push({ type: 'kill', x: w.x, y: w.y, kind: w.kind, points: pts });
        }
      }
    }
    g.warheads = g.warheads.filter((w) => w.alive);

    // The wave is over when the schedule is spent and the sky is empty.
    if (g.cursor >= sched.length && !g.warheads.length && !g.interceptors.length && !g.blasts.length) {
      g.phase = 'tally';
      g.tally = tallyWave(g);
      ev.push({ type: 'waveClear', wave: g.wave });
    }
  }

  /** A smart bomb keeps falling at its own pace but slides sideways around
      any blast it is about to meet. It only has so much lateral speed, so a
      blast placed right on it still kills it; one placed a little off does not. */
  function steerSmart(g, w, h) {
    const c = g.cfg;
    const sense = c.blast.maxR + c.smartSense;
    let dodge = 0;
    for (const b of g.blasts) {
      const d = Math.hypot(w.x - b.x, w.y - b.y);
      if (d < sense) {
        const side = w.x - b.x;
        dodge += side === 0 ? 1 : Math.sign(side);
      }
    }
    let want;
    if (dodge !== 0) want = Math.sign(dodge) * c.smartTurn;
    else want = Math.max(-c.smartTurn, Math.min(c.smartTurn, (w.tx - w.x) * 1.5));
    w.vx = want;
    w.vy = w.speed;
    // Keep it on the screen: a bomb pushed off the edge turns back in.
    if (w.x < 8 && w.vx < 0) w.vx = c.smartTurn;
    if (w.x > c.width - 8 && w.vx > 0) w.vx = -c.smartTurn;
  }

  function impact(g, w, ev) {
    const t = w.target;
    if (t.kind === 'city' && g.cities[t.i]) {
      g.cities[t.i] = false;
      ev.push({ type: 'cityHit', i: t.i, x: w.x });
      return;
    }
    if (t.kind === 'battery' && !g.batteries[t.i].dead) {
      const b = g.batteries[t.i];
      b.dead = true;
      b.ammo = 0;                   // the stock goes up with the mound
      ev.push({ type: 'batteryHit', i: t.i, x: w.x });
      return;
    }
    ev.push({ type: 'groundHit', x: w.x });
  }

  /* ---------- end of wave ---------- */

  /** The bonus the player is about to receive, without applying it. */
  function tallyWave(g) {
    const c = g.cfg;
    const mult = multiplierFor(g.wave);
    const missiles = totalAmmo(g);
    const cities = liveCities(g).length;
    const missilePts = missiles * c.points.missile * mult;
    const cityPts = cities * c.points.city * mult;
    const total = missilePts + cityPts;
    const after = g.score + total;
    let bonusCities = 0, th = g.nextBonusCity;
    while (after >= th) { bonusCities++; th += c.bonusCityEvery; }
    return { wave: g.wave, mult, missiles, cities, missilePts, cityPts, total, bonusCities };
  }

  /** Apply the tally, place any banked bonus cities, then either end the game
      or start the next wave. */
  function endWave(g) {
    const c = g.cfg;
    const t = g.tally || tallyWave(g);
    g.score += t.total;
    g.bank += t.bonusCities;
    g.nextBonusCity += t.bonusCities * c.bonusCityEvery;

    // A bonus city replaces a destroyed one. Any left over stays in the bank
    // until there is a ruin to rebuild.
    const rebuilt = [];
    while (g.bank > 0) {
      const dead = [];
      for (let i = 0; i < g.cities.length; i++) if (!g.cities[i]) dead.push(i);
      if (!dead.length) break;
      const i = dead[Math.floor(g.rng() * dead.length)];
      g.cities[i] = true;
      g.bank--;
      rebuilt.push(i);
    }

    if (!liveCities(g).length) {
      g.phase = 'over';
      return { gameOver: true, rebuilt, tally: t };
    }
    g.wave++;
    startWave(g);
    return { gameOver: false, rebuilt, tally: t };
  }

  /* ---------- inspection ---------- */

  /** A JSON-safe copy for determinism checks, with the rng left out. */
  function snapshot(g) {
    return JSON.stringify({
      phase: g.phase, wave: g.wave, score: g.score, time: g.time, cursor: g.cursor,
      cities: g.cities, batteries: g.batteries, warheads: g.warheads,
      interceptors: g.interceptors, blasts: g.blasts, bank: g.bank, stats: g.stats
    });
  }

  return {
    DEFAULTS,
    makeRng, makeGame, startWave, generateWave, step, fire, nearestBattery,
    blastRadius, blastTotal, multiplierFor, liveCities, liveTargets, totalAmmo,
    tallyWave, endWave, spawnWarhead, snapshot
  };
})();
