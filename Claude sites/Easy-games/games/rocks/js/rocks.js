'use strict';

/* Easy Rocks.

   Faithful to the 1979 arcade numbers: a large rock scores 20 and splits into
   two mediums, a medium scores 50 and splits into two smalls, a small scores 100
   and is destroyed outright. The large saucer is 200 and shoots badly, the small
   one is 1000, shoots well, and is the only one that appears past 40000 points.
   Waves start with four large rocks and grow by two, capped at twelve. An extra
   ship every 10000.

   Two design points that matter:

   - There is NO friction. Thrust adds velocity and it stays. Adding drag is the
     usual clone deviation and it destroys the feel, so there is only a top speed.
   - Hyperspace fails destructively one time in four, exactly as the original
     rolled 0 to 31 and died on 24 to 31. That is what makes it a real decision
     rather than a free escape. */

(function () {
  const W = 860, H = 620;

  const CFG = {
    turn: 3.3,              // rad/s
    thrust: 300,            // px/s^2
    maxSpeed: 430,
    shipR: 12,
    bullets: 4,             // maximum on screen at once
    bulletSpeed: 560,
    bulletLife: 1.15,
    fireDelay: 190,
    hyperspaceFail: 0.25,
    invulnMs: 2200,
    extraLifeEvery: 10000,
    smallSaucerFrom: 40000
  };

  const ROCK = {
    large:  { r: 44, next: 'medium', points: 20,  spdMin: 34,  spdMax: 72 },
    medium: { r: 25, next: 'small',  points: 50,  spdMin: 58,  spdMax: 112 },
    small:  { r: 13, next: null,     points: 100, spdMin: 92,  spdMax: 168 }
  };

  let state = 'menu';        // menu | play | dead | over
  let ship, rocks, bullets, saucer, saucerBullets, particles;
  let score, lives, wave, nextExtra, saucerTimer, deadTimer;
  let stars = [];

  Shell.mount({
    name: 'Rocks',
    width: W, height: H, max: 860, pad: 240,
    tools: ['sound', 'pause', 'help'],
    foot: '<b>Left</b> and <b>right</b> turn &middot; <b>up</b> thrusts &middot; <b>space</b> fires &middot; <b>shift</b> jumps',
    rules: `
      <ul>
        <li>Large rocks score 20 and split into two mediums. Mediums score 50 and
            split into two smalls. Smalls score 100 and are gone.</li>
        <li>There is no friction out here. Thrust changes your velocity and it stays
            changed, so plan your stopping as carefully as your starting.</li>
        <li>Only four of your shots can be in flight at once.</li>
        <li>The <b>large saucer</b> is worth 200 and shoots badly. The <b>small
            saucer</b> is worth 1000, shoots well, and once you pass 40000 it is the
            only one that comes.</li>
        <li><b>Hyperspace</b> teleports you somewhere random with zero speed, and
            fails fatally one time in four. It is an escape and a gamble.</li>
        <li>An extra ship every 10000 points.</li>
      </ul>`
  });

  Input.init();
  Input.claim(['KeyW', 'KeyA', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyR']);
  const ctx = Shell.ctx;

  for (let i = 0; i < 90; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.3, a: Math.random() * 0.5 + 0.15 });
  }

  /* ---------- helpers ---------- */

  function wrap(o) {
    if (o.x < -30) o.x += W + 60;
    if (o.x > W + 30) o.x -= W + 60;
    if (o.y < -30) o.y += H + 60;
    if (o.y > H + 30) o.y -= H + 60;
  }

  /** Distance that respects the wrapping playfield. */
  function dist(a, b) {
    let dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
    if (dx > W / 2) dx = W - dx;
    if (dy > H / 2) dy = H - dy;
    return Math.hypot(dx, dy);
  }

  function makeRock(kind, x, y) {
    const def = ROCK[kind];
    const ang = Math.random() * 6.283;
    const spd = def.spdMin + Math.random() * (def.spdMax - def.spdMin);
    // A lumpy outline, generated once per rock.
    const pts = [];
    const n = 9 + randInt(4);
    for (let i = 0; i < n; i++) pts.push(0.72 + Math.random() * 0.5);
    return {
      kind, x, y, r: def.r,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      spin: (Math.random() - 0.5) * 1.6, rot: Math.random() * 6.283, pts
    };
  }

  /* ---------- flow ---------- */

  function start() {
    score = 0; lives = 3; wave = 0; nextExtra = CFG.extraLifeEvery;
    rocks = []; bullets = []; saucerBullets = []; particles = [];
    saucer = null; saucerTimer = 14000;
    resetShip(true);
    nextWave();
    state = 'play';
    Shell.hide();
    updateHud();
  }

  function resetShip(full) {
    ship = {
      x: W / 2, y: H / 2, vx: 0, vy: 0, ang: -Math.PI / 2,
      thrusting: false, invuln: performance.now() + CFG.invulnMs, lastFire: 0
    };
    if (full) ship.invuln = performance.now() + CFG.invulnMs;
  }

  function nextWave() {
    wave++;
    const count = Math.min(12, 4 + (wave - 1) * 2);
    for (let i = 0; i < count; i++) {
      // Spawn away from the middle so nothing lands on the ship.
      let x, y, guard = 0;
      do {
        x = Math.random() * W;
        y = Math.random() * H;
        guard++;
      } while (guard < 60 && Math.hypot(x - W / 2, y - H / 2) < 190);
      rocks.push(makeRock('large', x, y));
    }
    if (wave > 1) Shell.banner('Wave ' + wave);
  }

  /* ---------- simulation ---------- */

  function update(dt) {
    if (state === 'dead') {
      deadTimer -= dt * 1000;
      stepWorld(dt);
      if (deadTimer <= 0) {
        if (lives <= 0) gameOver();
        else { resetShip(true); state = 'play'; }
      }
      return;
    }
    if (state !== 'play') return;

    controlShip(dt);
    stepWorld(dt);
    collide();

    if (!rocks.length && !saucer) nextWave();
  }

  function controlShip(dt) {
    if (Input.held('ArrowLeft') || Input.held('KeyA') || Touch.dir.dx === -1) ship.ang -= CFG.turn * dt;
    if (Input.held('ArrowRight') || Input.held('KeyD') || Touch.dir.dx === 1) ship.ang += CFG.turn * dt;

    ship.thrusting = Input.held('ArrowUp') || Input.held('KeyW') || Touch.dir.dy === -1;
    if (ship.thrusting) {
      ship.vx += Math.cos(ship.ang) * CFG.thrust * dt;
      ship.vy += Math.sin(ship.ang) * CFG.thrust * dt;
      const sp = Math.hypot(ship.vx, ship.vy);
      if (sp > CFG.maxSpeed) { ship.vx = ship.vx / sp * CFG.maxSpeed; ship.vy = ship.vy / sp * CFG.maxSpeed; }
      if (Math.random() < 0.6) {
        particles.push({
          x: ship.x - Math.cos(ship.ang) * 14, y: ship.y - Math.sin(ship.ang) * 14,
          vx: -Math.cos(ship.ang) * 130 + (Math.random() - 0.5) * 60,
          vy: -Math.sin(ship.ang) * 130 + (Math.random() - 0.5) * 60,
          life: 0.25, max: 0.25, size: 2, col: '#ffb02e'
        });
      }
    }

    if (Input.held('Space') || Touch.held.a) fire();
    if (Input.tapped('ShiftLeft') || Input.tapped('ShiftRight') || Touch.tapped('b')) hyperspace();
  }

  function fire() {
    const now = performance.now();
    if (now - ship.lastFire < CFG.fireDelay) return;
    if (bullets.length >= CFG.bullets) return;
    ship.lastFire = now;
    bullets.push({
      x: ship.x + Math.cos(ship.ang) * 14,
      y: ship.y + Math.sin(ship.ang) * 14,
      vx: ship.vx + Math.cos(ship.ang) * CFG.bulletSpeed,
      vy: ship.vy + Math.sin(ship.ang) * CFG.bulletSpeed,
      life: CFG.bulletLife
    });
    Sfx.place();
  }

  function hyperspace() {
    ship.x = 40 + Math.random() * (W - 80);
    ship.y = 40 + Math.random() * (H - 80);
    ship.vx = 0; ship.vy = 0;
    Sfx.kick();
    // One jump in four does not survive the trip.
    if (Math.random() < CFG.hyperspaceFail) { explodeShip(); Shell.banner('Jump failed'); }
  }

  function stepWorld(dt) {
    if (state === 'play') {
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      wrap(ship);
    }

    for (const r of rocks) { r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.spin * dt; wrap(r); }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      wrap(b);
      if (b.life <= 0) bullets.splice(i, 1);
    }

    for (let i = saucerBullets.length - 1; i >= 0; i--) {
      const b = saucerBullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      wrap(b);
      if (b.life <= 0) saucerBullets.splice(i, 1);
    }

    stepSaucer(dt);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  function stepSaucer(dt) {
    if (!saucer) {
      saucerTimer -= dt * 1000;
      if (saucerTimer <= 0 && state === 'play') spawnSaucer();
      return;
    }
    saucer.x += saucer.vx * dt;
    saucer.y += saucer.vy * dt;
    if (saucer.y < 40 || saucer.y > H - 40) saucer.vy = -saucer.vy;

    saucer.turnIn -= dt * 1000;
    if (saucer.turnIn <= 0) {
      saucer.turnIn = 900 + Math.random() * 1200;
      saucer.vy = (Math.random() - 0.5) * 120;
    }

    saucer.fireIn -= dt * 1000;
    if (saucer.fireIn <= 0) {
      saucer.fireIn = saucer.small ? 900 : 1400;
      let ang;
      if (saucer.small && state === 'play') {
        ang = Math.atan2(ship.y - saucer.y, ship.x - saucer.x) + (Math.random() - 0.5) * 0.22;
      } else {
        ang = Math.random() * 6.283;
      }
      saucerBullets.push({
        x: saucer.x, y: saucer.y,
        vx: Math.cos(ang) * 330, vy: Math.sin(ang) * 330, life: 1.6
      });
      Sfx.tick(saucer.small);
    }

    if (saucer.x < -40 || saucer.x > W + 40) { saucer = null; saucerTimer = 12000 + Math.random() * 8000; }
  }

  function spawnSaucer() {
    const small = score >= CFG.smallSaucerFrom ? true : Math.random() < 0.35;
    const fromLeft = Math.random() < 0.5;
    saucer = {
      small,
      x: fromLeft ? -30 : W + 30,
      y: 60 + Math.random() * (H - 120),
      vx: (fromLeft ? 1 : -1) * (small ? 135 : 100),
      vy: 0,
      fireIn: 700, turnIn: 1200,
      r: small ? 13 : 22
    };
    Shell.banner(small ? 'Small saucer' : 'Saucer');
  }

  /* ---------- collisions ---------- */

  function collide() {
    // Player shots against rocks and the saucer.
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      let done = false;
      for (let j = rocks.length - 1; j >= 0 && !done; j--) {
        if (dist(b, rocks[j]) < rocks[j].r) { bullets.splice(i, 1); splitRock(j); done = true; }
      }
      if (done) continue;
      if (saucer && dist(b, saucer) < saucer.r + 4) {
        bullets.splice(i, 1);
        addScore(saucer.small ? 1000 : 200);
        boom(saucer.x, saucer.y, saucer.small ? 14 : 22, '#ff5470');
        saucer = null;
        saucerTimer = 12000 + Math.random() * 8000;
        Sfx.boom();
      }
    }

    if (state !== 'play' || performance.now() < ship.invuln) return;

    for (let j = rocks.length - 1; j >= 0; j--) {
      if (dist(ship, rocks[j]) < rocks[j].r + CFG.shipR * 0.7) { splitRock(j); explodeShip(); return; }
    }
    for (const b of saucerBullets) {
      if (dist(ship, b) < CFG.shipR) { explodeShip(); return; }
    }
    if (saucer && dist(ship, saucer) < saucer.r + CFG.shipR * 0.7) {
      boom(saucer.x, saucer.y, 18, '#ff5470');
      saucer = null;
      saucerTimer = 14000;
      explodeShip();
    }
  }

  function splitRock(j) {
    const r = rocks[j];
    const def = ROCK[r.kind];
    addScore(def.points);
    boom(r.x, r.y, r.r * 0.6, '#cfd6e8');
    Sfx.boom();
    rocks.splice(j, 1);
    if (def.next) {
      for (let k = 0; k < 2; k++) rocks.push(makeRock(def.next, r.x, r.y));
    }
  }

  function explodeShip() {
    lives--;
    boom(ship.x, ship.y, 20, '#ffb02e');
    Sfx.die();
    state = 'dead';
    deadTimer = 1400;
    updateHud();
  }

  function boom(x, y, r, col) {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * 6.283;
      const s = 40 + Math.random() * 190;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                       life: 0.3 + Math.random() * 0.5, max: 0.8, size: 1.5 + Math.random() * 2, col });
    }
  }

  function addScore(n) {
    score += n;
    if (score >= nextExtra) { lives++; nextExtra += CFG.extraLifeEvery; Shell.banner('Extra ship'); Sfx.win(); }
    updateHud();
  }

  function gameOver() {
    state = 'over';
    const res = Scores.submit('rocks', score);
    Shell.gameOverCard({
      title: 'Ship lost',
      scoreLabel: 'Score',
      score: score,
      isNew: res.isNew && res.previous !== null,
      best: Scores.label('rocks'),
      extra: `<p class="tag" style="margin-top:8px">You reached wave ${wave}</p>`,
      buttons: [{ label: 'Play again', act: 'again', primary: true }, { label: 'Menu', act: 'menu' }]
    });
  }

  function updateHud() {
    Shell.readouts([
      { label: 'Score', value: score || 0, accent: true },
      { label: 'Ships', value: Math.max(0, lives || 0) },
      { label: 'Wave', value: wave || 0 },
      { label: 'Best', value: Scores.label('rocks') }
    ]);
    Shell.status(score || 0, 'wave ' + (wave || 0));
  }

  /* ---------- drawing ---------- */

  function draw() {
    ctx.fillStyle = '#0b0f1a';
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#dfe6f8';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    for (const r of rocks) drawRock(r);
    if (saucer) drawSaucer(saucer);

    ctx.fillStyle = '#ffd775';
    for (const b of bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 2.6, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = '#ff8fa3';
    for (const b of saucerBullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 6.283); ctx.fill(); }

    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    if (state === 'play') drawShip();
  }

  function drawRock(r) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    ctx.strokeStyle = '#aab6d4';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(120,134,170,.16)';
    ctx.beginPath();
    for (let i = 0; i < r.pts.length; i++) {
      const a = i / r.pts.length * 6.283;
      const rad = r.r * r.pts[i];
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawSaucer(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    const w = s.r * 2;
    ctx.strokeStyle = s.small ? '#ff8fa3' : '#7fd7ff';
    ctx.fillStyle = s.small ? 'rgba(255,84,112,.2)' : 'rgba(77,163,255,.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w, 0); ctx.lineTo(-w * 0.45, -s.r * 0.5);
    ctx.lineTo(w * 0.45, -s.r * 0.5); ctx.lineTo(w, 0);
    ctx.lineTo(w * 0.45, s.r * 0.5); ctx.lineTo(-w * 0.45, s.r * 0.5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w * 0.45, -s.r * 0.5);
    ctx.lineTo(-w * 0.2, -s.r); ctx.lineTo(w * 0.2, -s.r); ctx.lineTo(w * 0.45, -s.r * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawShip() {
    const blink = performance.now() < ship.invuln && Math.floor(performance.now() / 90) % 2 === 0;
    if (blink) return;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.ang);
    ctx.strokeStyle = '#e8edfa';
    ctx.fillStyle = 'rgba(232,237,250,.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-11, -10);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-11, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (ship.thrusting && Math.floor(performance.now() / 60) % 2 === 0) {
      ctx.strokeStyle = '#ffb02e';
      ctx.beginPath();
      ctx.moveTo(-7, -5);
      ctx.lineTo(-19, 0);
      ctx.lineTo(-7, 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    rocks = []; bullets = []; saucerBullets = []; particles = [];
    saucer = null;
    score = 0; lives = 3; wave = 0;
    for (let i = 0; i < 6; i++) rocks.push(makeRock('large', Math.random() * W, Math.random() * H));
    Shell.status('', '');
    Shell.readouts([{ label: 'Best score', value: Scores.label('rocks') }]);
    Shell.startCard({
      blurb: 'No friction, no brakes, four shots at a time.',
      extra: `<div class="rowBetween"><span>Rock values</span><b style="color:var(--text)">20 / 50 / 100</b></div>
              <div class="rowBetween"><span>Saucers</span><b style="color:var(--text)">200 and 1000</b></div>
              <div class="rowBetween"><span>Hyperspace</span><b style="color:var(--text)">fails 1 time in 4</b></div>`,
      buttons: [{ label: 'Play', act: 'again', primary: true }]
    });
  }

  Shell.on({ again: () => start(), menu: () => showMenu() });

  Touch.mount(Shell.els.touchpad, { dpad: true, action: 'FIRE', action2: 'JUMP' });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyR' && state !== 'menu') start();
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyRocks = {
    get state() { return state; },
    get score() { return score; },
    get lives() { return lives; },
    get wave() { return wave; },
    ship: () => ship, rocks: () => rocks, bullets: () => bullets,
    saucer: () => saucer,
    start, update, fire, hyperspace, splitRock, dist, makeRock,
    setScore(v) { score = v; },
    spawnSaucer,
    cfg: CFG, rockDefs: ROCK
  };
})();
