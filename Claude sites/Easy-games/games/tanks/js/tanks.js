'use strict';

/* Easy Tanks.

   The whole game is the ricochet. A shell bounces once off a steel wall, and it
   is just as lethal on the way back, so every shot is also a risk to yourself.

   That makes the bots interesting. Rather than reasoning about geometry, they
   AIM BY SIMULATION: sample candidate turret angles, fly a virtual shell along
   each one using exactly the same stepping the real shells use, and keep the
   angles that reach an enemy without passing through the firer first. Bounces
   are handled for free because the virtual shell bounces too. The same
   simulation run over the shells already in flight is what tells a bot to dodge. */

(function () {
  const COLS = 20, ROWS = 15, TILE = 40;
  const W = COLS * TILE, H = ROWS * TILE;

  const T = { FLOOR: 0, STEEL: 1, BRICK: 2 };

  const CFG = {
    tankR: 14,
    speed: 96,
    reverse: 62,
    turn: 2.5,
    shellR: 4,
    shellSpeed: 268,
    shellLife: 3.6,
    shellBounces: 1,
    maxShells: 5,
    fireDelay: 620,
    mineMax: 2,
    mineFuse: 3000,
    mineRadius: TILE * 1.5,
    freeze: 1100,
    roundGap: 1900,
    target: 5
  };

  const COLORS = [
    { name: 'Red',    body: '#ff4d5e', dark: '#a81f2f', light: '#ff9aa4' },
    { name: 'Blue',   body: '#4da3ff', dark: '#175394', light: '#a5d2ff' },
    { name: 'Green',  body: '#4ad46f', dark: '#187a38', light: '#9aeab1' },
    { name: 'Yellow', body: '#ffcc3f', dark: '#a87c00', light: '#ffe396' }
  ];

  const LEVELS = {
    easy:   { think: 320, aimErr: 0.20, fireChance: 0.35, dodge: 0.5,  label: 'Easy' },
    normal: { think: 180, aimErr: 0.09, fireChance: 0.7,  dodge: 0.85, label: 'Normal' },
    hard:   { think: 100, aimErr: 0.03, fireChance: 0.95, dodge: 1.0,  label: 'Hard' }
  };

  const SPAWN = [
    { x: 2.5, y: 2.5, a: 0.8 },
    { x: COLS - 2.5, y: ROWS - 2.5, a: 0.8 + Math.PI },
    { x: COLS - 2.5, y: 2.5, a: Math.PI - 0.8 },
    { x: 2.5, y: ROWS - 2.5, a: -0.8 }
  ];

  let slots = [
    { type: 'human', level: 'normal' },
    { type: 'cpu', level: 'normal' },
    { type: 'cpu', level: 'easy' },
    { type: 'off', level: 'easy' }
  ];

  let grid;
  let tanks = [], shells = [], mines = [], particles = [];
  let state = 'menu';           // menu | freeze | play | roundover | matchover
  let timer = 0, shake = 0;

  Shell.mount({
    name: 'Tanks',
    width: W, height: H, max: 800, pad: 250,
    tools: ['sound', 'pause', 'help'],
    foot: 'Turn with <b>left</b> and <b>right</b>, drive with <b>up</b> and <b>down</b>, <b>bomb key</b> fires, <b>detonate key</b> drops a mine',
    rules: `
      <ul>
        <li>Shells <b>bounce once</b> off steel. After that they burn out. A bounced
            shell kills you exactly as dead as a direct one, including your own.</li>
        <li>Only five of your shells can be in the air at a time, and there is a
            short delay between shots.</li>
        <li>Brick walls are destroyed by anything that hits them. Steel never is.</li>
        <li><b>Mines</b> sit for three seconds then blow a hole a tile and a half
            wide, taking bricks and tanks with them. Two at a time.</li>
        <li>Last tank running takes the round. First to ${CFG.target} wins.</li>
      </ul>
      <p>The bank shot is the point. If someone is hiding behind steel, the angle
         off the wall beside them is usually open.</p>`
  });

  Input.init();
  Input.claim(['KeyR', 'Enter']);
  const ctx = Shell.ctx;

  const idx = (cx, cy) => cy * COLS + cx;
  const tileAt = (cx, cy) => (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) ? T.STEEL : grid[idx(cx, cy)];
  const solidAt = (cx, cy) => tileAt(cx, cy) !== T.FLOOR;

  /* ---------- arena ---------- */

  function buildArena() {
    grid = new Uint8Array(COLS * ROWS);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const border = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
        grid[idx(x, y)] = border ? T.STEEL : T.FLOOR;
      }
    }
    // Scatter steel pillars and brick clusters, symmetric enough to feel fair.
    for (let y = 2; y < ROWS - 2; y++) {
      for (let x = 2; x < COLS - 2; x++) {
        const r = Math.random();
        if ((x % 4 === 0 && y % 3 === 0) || r < 0.05) grid[idx(x, y)] = T.STEEL;
        else if (r < 0.20) grid[idx(x, y)] = T.BRICK;
      }
    }
    // Clear the spawn pockets.
    for (const s of SPAWN) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = Math.floor(s.x) + dx, cy = Math.floor(s.y) + dy;
          if (cx > 0 && cy > 0 && cx < COLS - 1 && cy < ROWS - 1) grid[idx(cx, cy)] = T.FLOOR;
        }
      }
    }
  }

  /* ---------- tanks ---------- */

  function makeTank(i, slot) {
    return {
      i, col: COLORS[i], isCpu: slot.type === 'cpu', level: slot.level,
      x: 0, y: 0, ang: 0, alive: true, deathAt: 0, score: 0,
      lastFire: 0, minesOut: 0, tread: 0,
      bot: { think: 0, aim: null, flee: null, wander: Math.random() * 6.283 }
    };
  }

  function startMatch() {
    tanks = [];
    slots.forEach((s, i) => { if (s.type !== 'off') tanks.push(makeTank(i, s)); });
    for (const t of tanks) t.score = 0;
    startRound();
  }

  function startRound() {
    buildArena();
    shells = []; mines = []; particles = [];
    tanks.forEach((t) => {
      const s = SPAWN[t.i];
      t.x = s.x * TILE; t.y = s.y * TILE; t.ang = s.a;
      t.alive = true; t.lastFire = 0; t.minesOut = 0;
      t.bot.think = 0;
    });
    state = 'freeze';
    timer = CFG.freeze;
    Sfx.roundStart();
    Shell.hide();
    updateHud();
  }

  /* ---------- movement ---------- */

  function tankFits(x, y) {
    const r = CFG.tankR;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r], [0, -r], [0, r], [-r, 0], [r, 0]]) {
      if (solidAt(Math.floor((x + ox) / TILE), Math.floor((y + oy) / TILE))) return false;
    }
    return true;
  }

  function driveTank(t, turn, drive, dt) {
    t.ang += turn * CFG.turn * dt;
    if (!drive) return;
    const spd = drive > 0 ? CFG.speed : -CFG.reverse;
    let remaining = Math.abs(spd * dt);
    const sgn = Math.sign(spd);
    while (remaining > 0.001) {
      const step = Math.min(2, remaining);
      remaining -= step;
      const nx = t.x + Math.cos(t.ang) * step * sgn;
      const ny = t.y + Math.sin(t.ang) * step * sgn;
      // Slide along walls instead of sticking to them.
      if (tankFits(nx, ny)) { t.x = nx; t.y = ny; }
      else if (tankFits(nx, t.y)) t.x = nx;
      else if (tankFits(t.x, ny)) t.y = ny;
      else break;
      t.tread += step;
    }
  }

  /* ---------- shells ---------- */

  function fire(t) {
    const now = performance.now();
    if (now - t.lastFire < CFG.fireDelay) return false;
    if (shells.filter((s) => s.owner === t.i).length >= CFG.maxShells) return false;
    t.lastFire = now;
    let sx = t.x + Math.cos(t.ang) * (CFG.tankR + 6);
    let sy = t.y + Math.sin(t.ang) * (CFG.tankR + 6);
    // Nose against a wall: start the shell at the hull instead of inside the tile.
    if (solidAt(Math.floor(sx / TILE), Math.floor(sy / TILE))) { sx = t.x; sy = t.y; }
    shells.push({
      owner: t.i, x: sx, y: sy,
      vx: Math.cos(t.ang) * CFG.shellSpeed, vy: Math.sin(t.ang) * CFG.shellSpeed,
      life: CFG.shellLife, bounces: CFG.shellBounces, born: now
    });
    Sfx.place();
    return true;
  }

  /** One physics step for a shell. Shared by the real shells and by the bots'
      virtual ones, so a bot's prediction can never disagree with reality.

      Each sub-step tests the leading edge one axis at a time. On a steel hit the
      velocity is reversed but the shell is NOT moved into the wall, so the next
      sub-step carries it away cleanly instead of oscillating inside the tile. */
  function stepShell(s, dt, destroy) {
    const speed = Math.hypot(s.vx, s.vy) || 1;
    let remaining = speed * dt;

    while (remaining > 0.001 && s.life > 0) {
      const step = Math.min(3, remaining);
      remaining -= step;

      // X axis.
      const ux = s.vx / speed;
      const nx = s.x + ux * step;
      const cx = Math.floor((nx + Math.sign(s.vx) * CFG.shellR) / TILE);
      const cyNow = Math.floor(s.y / TILE);
      if (solidAt(cx, cyNow)) {
        if (tileAt(cx, cyNow) === T.BRICK) {
          if (destroy) { grid[idx(cx, cyNow)] = T.FLOOR; debris(cx, cyNow); }
          s.life = -1;
          return;
        }
        s.vx = -s.vx;
        if (--s.bounces < 0) { s.life = -1; return; }
        if (destroy) Sfx.tick(false);
        continue;
      }
      s.x = nx;

      // Y axis.
      const uy = s.vy / speed;
      const ny = s.y + uy * step;
      const cyy = Math.floor((ny + Math.sign(s.vy) * CFG.shellR) / TILE);
      const cxNow = Math.floor(s.x / TILE);
      if (solidAt(cxNow, cyy)) {
        if (tileAt(cxNow, cyy) === T.BRICK) {
          if (destroy) { grid[idx(cxNow, cyy)] = T.FLOOR; debris(cxNow, cyy); }
          s.life = -1;
          return;
        }
        s.vy = -s.vy;
        if (--s.bounces < 0) { s.life = -1; return; }
        if (destroy) Sfx.tick(false);
        continue;
      }
      s.y = ny;
    }
  }

  function debris(cx, cy) {
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: cx * TILE + Math.random() * TILE, y: cy * TILE + Math.random() * TILE,
        vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160 - 40,
        life: 0.35 + Math.random() * 0.3, max: 0.65, size: 2 + Math.random() * 3, col: '#a9714a'
      });
    }
  }

  function boom(x, y, r, col) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * 6.283, sp = 50 + Math.random() * 240;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                       life: 0.3 + Math.random() * 0.5, max: 0.8, size: 2 + Math.random() * 3, col });
    }
    shake = Math.min(14, shake + r / 8);
  }

  /* ---------- mines ---------- */

  function dropMine(t) {
    if (t.minesOut >= CFG.mineMax) return false;
    t.minesOut++;
    mines.push({ owner: t.i, x: t.x, y: t.y, fuse: CFG.mineFuse });
    Sfx.kick();
    return true;
  }

  function blowMine(m) {
    const owner = tanks.find((t) => t.i === m.owner);
    if (owner) owner.minesOut = Math.max(0, owner.minesOut - 1);
    boom(m.x, m.y, CFG.mineRadius, '#ffb02e');
    Sfx.boom();
    const c0 = Math.floor((m.x - CFG.mineRadius) / TILE), c1 = Math.floor((m.x + CFG.mineRadius) / TILE);
    const r0 = Math.floor((m.y - CFG.mineRadius) / TILE), r1 = Math.floor((m.y + CFG.mineRadius) / TILE);
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        if (tileAt(cx, cy) !== T.BRICK) continue;
        const dx = (cx + 0.5) * TILE - m.x, dy = (cy + 0.5) * TILE - m.y;
        if (Math.hypot(dx, dy) <= CFG.mineRadius) { grid[idx(cx, cy)] = T.FLOOR; debris(cx, cy); }
      }
    }
    for (const t of tanks) {
      if (t.alive && Math.hypot(t.x - m.x, t.y - m.y) <= CFG.mineRadius) kill(t, m.owner);
    }
    // Chain into other mines.
    for (const other of mines) {
      if (other !== m && other.fuse > 0 && Math.hypot(other.x - m.x, other.y - m.y) <= CFG.mineRadius) other.fuse = 1;
    }
  }

  /* ---------- simulation ---------- */

  function update(dt) {
    if (shake > 0) shake = Math.max(0, shake - dt * 40);

    if (state === 'freeze') {
      timer -= dt * 1000;
      Shell.countdown(Math.ceil(timer / 366), 'Get ready');
      if (timer <= 0) { state = 'play'; Shell.hide(); }
      stepParticles(dt);
      return;
    }
    if (state === 'roundover') {
      timer -= dt * 1000;
      stepWorld(dt);
      if (timer <= 0) {
        const champ = tanks.find((t) => t.score >= CFG.target);
        if (champ) matchOver(champ); else startRound();
      }
      return;
    }
    if (state !== 'play') return;

    for (const t of tanks) {
      if (!t.alive) continue;
      if (t.isCpu) botControl(t, dt);
      else humanControl(t, dt);
    }

    stepWorld(dt);

    const alive = tanks.filter((t) => t.alive);
    if (alive.length <= 1 && tanks.length > 1) endRound(alive[0] || null);
  }

  function stepWorld(dt) {
    for (let i = shells.length - 1; i >= 0; i--) {
      const s = shells[i];
      s.life -= dt;
      if (s.life > 0) stepShell(s, dt, true);
      if (s.life <= 0) { shells.splice(i, 1); continue; }
      for (const t of tanks) {
        if (!t.alive) continue;
        if (Math.hypot(t.x - s.x, t.y - s.y) < CFG.tankR + CFG.shellR) {
          shells.splice(i, 1);
          kill(t, s.owner);
          break;
        }
      }
    }

    for (let i = mines.length - 1; i >= 0; i--) {
      mines[i].fuse -= dt * 1000;
      if (mines[i].fuse <= 0) { const m = mines[i]; mines.splice(i, 1); blowMine(m); }
    }

    stepParticles(dt);
  }

  function stepParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.96; p.vy *= 0.96;
    }
  }

  function humanControl(t, dt) {
    const d = Input.dirFor(t.i);
    const b = Input.bindings[t.i];
    let turn = d.dx, drive = -d.dy;
    if (t.i === tanks[0].i && !tanks[0].isCpu) {
      if (Touch.dir.dx) turn = Touch.dir.dx;
      if (Touch.dir.dy) drive = -Touch.dir.dy;
    }
    driveTank(t, turn, drive, dt);
    if (Input.held(b.bomb) || (t.i === tanks[0].i && Touch.held.a)) fire(t);
    if (Input.tapped(b.boom) || (t.i === tanks[0].i && Touch.tapped('b'))) dropMine(t);
  }

  function kill(t, byWhom) {
    if (!t.alive) return;
    t.alive = false;
    t.deathAt = performance.now();
    boom(t.x, t.y, 30, t.col.body);
    Sfx.die();
    for (const q of tanks) if (q.alive && q !== t) q.score++;
    updateHud();
  }

  function endRound(survivor) {
    state = 'roundover';
    timer = CFG.roundGap;
    if (survivor) Sfx.win();
    const title = survivor
      ? `<span style="color:${survivor.col.body}">${survivor.col.name}</span> survives`
      : 'Everybody destroyed';
    Shell.overlay(`<div class="card slim"><h2>${title}</h2>${scoreStrip()}</div>`, { transparent: true });
  }

  function matchOver(champ) {
    state = 'matchover';
    Sfx.win();
    Shell.overlay(`<div class="card">
      <h2><span style="color:${champ.col.body}">${champ.col.name}</span> wins the match</h2>
      ${scoreStrip()}
      <div class="btnRow">
        <button class="primary" data-act="rematch">Rematch</button>
        <button data-act="menu">Change players</button>
      </div>
    </div>`);
  }

  function scoreStrip() {
    return '<div class="scores">' + tanks.map((t) =>
      `<span class="sc"><i style="background:${t.col.body}"></i>${t.score}</span>`).join('') + '</div>';
  }

  /* ---------- bots ---------- */

  /** Fly a virtual shell and report what it reaches. Uses the real stepShell. */
  function simulateShot(fromX, fromY, ang, firerIndex, maxTime) {
    const s = {
      x: fromX, y: fromY,
      vx: Math.cos(ang) * CFG.shellSpeed, vy: Math.sin(ang) * CFG.shellSpeed,
      life: maxTime || CFG.shellLife, bounces: CFG.shellBounces
    };
    const dt = 1 / 60;                    // exactly the game step, so a
    let elapsed = 0;                      // grazing shot resolves the same way
    while (s.life > 0) {
      s.life -= dt;
      elapsed += dt;
      stepShell(s, dt, false);            // destroy = false, so nothing is changed
      if (s.life <= 0) break;
      for (const t of tanks) {
        if (!t.alive) continue;
        if (Math.hypot(t.x - s.x, t.y - s.y) < CFG.tankR + CFG.shellR) {
          return { hit: t.i, time: elapsed, self: t.i === firerIndex };
        }
      }
    }
    return { hit: -1, time: elapsed, self: false };
  }

  /** Will any shell in flight reach this point soon? */
  function incomingThreat(t, horizon) {
    let worst = null;
    for (const live of shells) {
      const s = { x: live.x, y: live.y, vx: live.vx, vy: live.vy, life: Math.min(live.life, horizon), bounces: live.bounces };
      const dt = 1 / 60;
      let elapsed = 0;
      while (s.life > 0) {
        s.life -= dt;
        elapsed += dt;
        stepShell(s, dt, false);
        if (s.life <= 0) break;
        if (Math.hypot(t.x - s.x, t.y - s.y) < CFG.tankR + CFG.shellR + 8) {
          if (!worst || elapsed < worst.time) {
            worst = { time: elapsed, vx: s.vx, vy: s.vy, x: s.x, y: s.y };
          }
          break;
        }
      }
    }
    return worst;
  }

  function botControl(t, dt) {
    const lv = LEVELS[t.level] || LEVELS.normal;
    const now = performance.now();

    if (now >= t.bot.think) {
      t.bot.think = now + lv.think * (0.85 + Math.random() * 0.3);

      // Dodge anything already on its way.
      const threat = incomingThreat(t, 1.4);
      t.bot.flee = (threat && Math.random() < lv.dodge) ? threat : null;

      // Look for a shot, bounces included, that does not come back at us.
      t.bot.aim = null;
      let best = null;
      for (let k = 0; k < 48; k++) {
        const ang = k / 48 * 6.283;
        const r = simulateShot(t.x + Math.cos(ang) * (CFG.tankR + 7),
                               t.y + Math.sin(ang) * (CFG.tankR + 7), ang, t.i, 2.6);
        if (r.hit === -1 || r.self) continue;
        if (!best || r.time < best.time) best = { ang, time: r.time, target: r.hit };
      }
      if (best) t.bot.aim = best.ang + (Math.random() - 0.5) * 2 * lv.aimErr;
    }

    let turn = 0, drive = 0;

    if (t.bot.flee) {
      // Step sideways out of the shell's line.
      const f = t.bot.flee;
      const perp = Math.atan2(f.vx, -f.vy);
      const want = perp;
      turn = angleTurn(t.ang, want);
      drive = Math.abs(angleDiff(t.ang, want)) < 0.9 ? 1 : 0;
    } else if (t.bot.aim != null) {
      turn = angleTurn(t.ang, t.bot.aim);
      if (Math.abs(angleDiff(t.ang, t.bot.aim)) < 0.06 && Math.random() < LEVELS[t.level].fireChance) {
        fire(t);
      }
      drive = 0;
    } else {
      // Nothing to shoot: roam, so it does not sit in a corner.
      t.bot.wander += (Math.random() - 0.5) * 0.4;
      turn = angleTurn(t.ang, t.bot.wander);
      drive = 1;
      if (!tankFits(t.x + Math.cos(t.ang) * 22, t.y + Math.sin(t.ang) * 22)) {
        t.bot.wander = Math.random() * 6.283;
      }
    }

    driveTank(t, turn, drive, dt);
  }

  function angleDiff(a, b) {
    let d = (b - a) % 6.283185;
    if (d > 3.14159) d -= 6.283185;
    if (d < -3.14159) d += 6.283185;
    return d;
  }
  function angleTurn(a, b) {
    const d = angleDiff(a, b);
    return Math.abs(d) < 0.02 ? 0 : Math.sign(d);
  }

  /* ---------- hud ---------- */

  function updateHud() {
    Shell.hud(tanks.map((t) => `
      <div class="pcard ${t.alive ? '' : 'dead'}" style="--c:${t.col.body}">
        <div class="pTop"><span class="dot"></span><span class="pname">${t.col.name}${t.isCpu ? ' CPU' : ''}</span>
          <span class="wins">${t.score}</span></div>
        <div class="stats"><span class="stat">${t.alive ? 'active' : 'destroyed'}</span></div>
      </div>`).join(''));
    Shell.status(tanks.filter((t) => t.alive).length + '/' + tanks.length, 'first to ' + CFG.target);
  }

  /* ---------- drawing ---------- */

  function draw() {
    ctx.save();
    if (shake > 0.2) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    ctx.fillStyle = '#232b3d';
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = tileAt(x, y);
        const px = x * TILE, py = y * TILE;
        if (t === T.FLOOR) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#2c3446' : '#28303f';
          ctx.fillRect(px, py, TILE, TILE);
        } else if (t === T.STEEL) {
          ctx.fillStyle = '#39415a';
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#4d5773';
          ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 7);
          ctx.fillStyle = '#5f6b8b';
          ctx.fillRect(px + 2, py + 2, TILE - 4, 4);
          ctx.fillStyle = 'rgba(255,255,255,.14)';
          ctx.fillRect(px + 5, py + 7, 3, 3);
          ctx.fillRect(px + TILE - 8, py + 7, 3, 3);
        } else {
          ctx.fillStyle = '#6d3f28';
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#9a5c37';
          roundRect(ctx, px + 2, py + 2, TILE - 4, TILE - 5, 3);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,.28)';
          ctx.lineWidth = 1.5;
          for (let k = 1; k < 3; k++) {
            ctx.beginPath();
            ctx.moveTo(px + 3, py + 3 + k * (TILE - 6) / 3);
            ctx.lineTo(px + TILE - 3, py + 3 + k * (TILE - 6) / 3);
            ctx.stroke();
          }
        }
      }
    }

    for (const m of mines) drawMine(m);
    for (const t of tanks) drawTank(t);
    for (const s of shells) {
      ctx.fillStyle = '#ffe08a';
      ctx.shadowColor = '#ffb02e';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(s.x, s.y, CFG.shellR, 0, 6.283);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawMine(m) {
    const t = 1 - m.fuse / CFG.mineFuse;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / (90 - t * 55));
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(m.x, m.y + 4, 11, 5, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#2a3145';
    ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(255,${100 - t * 80},60,${0.4 + pulse * 0.6})`;
    ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, 6.283); ctx.fill();
  }

  function drawTank(t) {
    let alpha = 1;
    if (!t.alive) {
      const k = (performance.now() - t.deathAt) / 700;
      if (k > 1) return;
      alpha = 1 - k;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(t.x, t.y);

    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, 5, CFG.tankR, CFG.tankR * 0.8, 0, 0, 6.283);
    ctx.fill();

    ctx.rotate(t.ang);

    // Treads.
    ctx.fillStyle = t.col.dark;
    roundRect(ctx, -13, -14, 26, 7, 2); ctx.fill();
    roundRect(ctx, -13, 7, 26, 7, 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    for (let k = -2; k <= 2; k++) {
      const off = ((t.tread / 6 + k * 5) % 10) - 5;
      ctx.fillRect(off + k * 5 - 1, -14, 2, 7);
      ctx.fillRect(off + k * 5 - 1, 7, 2, 7);
    }

    // Hull.
    const g = ctx.createLinearGradient(0, -10, 0, 10);
    g.addColorStop(0, t.col.light);
    g.addColorStop(0.5, t.col.body);
    g.addColorStop(1, t.col.dark);
    ctx.fillStyle = g;
    roundRect(ctx, -12, -9, 24, 18, 4);
    ctx.fill();

    // Barrel and turret.
    ctx.fillStyle = t.col.dark;
    ctx.fillRect(0, -2.5, 20, 5);
    ctx.fillStyle = t.col.light;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = t.col.dark;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    tanks = [];
    buildArena();
    shells = []; mines = []; particles = [];
    Shell.hud('');
    Shell.status('', '');
    const rows = COLORS.map((c, i) => {
      const b = Input.bindings[i];
      const s = slots[i];
      const detail = s.type === 'human'
        ? `<div class="keys">${Input.label(b.up)} ${Input.label(b.left)} ${Input.label(b.down)} ${Input.label(b.right)}
             &nbsp;·&nbsp; fire <b>${Input.label(b.bomb)}</b> &nbsp;·&nbsp; mine <b>${Input.label(b.boom)}</b></div>`
        : (s.type === 'cpu'
            ? `<div class="levels">${['easy', 'normal', 'hard'].map((l) =>
                `<button data-act="level" data-i="${i}" data-l="${l}" class="chip ${s.level === l ? 'on' : ''}">${l}</button>`).join('')}</div>`
            : '<div class="keys dim">not playing</div>');
      return `<div class="slot ${s.type === 'off' ? 'off' : ''}">
        <span class="dot" style="background:${c.body}"></span>
        <span class="who">${c.name}</span>
        <div class="seg">${['human', 'cpu', 'off'].map((tp) =>
          `<button data-act="slot" data-i="${i}" data-t="${tp}" class="${s.type === tp ? 'on' : ''}">${tp === 'cpu' ? 'CPU' : tp}</button>`).join('')}</div>
        ${detail}
      </div>`;
    }).join('');

    Shell.overlay(`<div class="card wide menu">
      <h1>Easy <span>Tanks</span></h1>
      <p class="tag">Shells bounce off steel. So do the ones you fired.</p>
      ${rows}
      <div class="btnRow">
        <button class="primary" data-act="play">Start match</button>
        <button data-act="help2">How to play</button>
      </div>
    </div>`);
  }

  Shell.on({
    slot: (el) => { slots[+el.dataset.i].type = el.dataset.t; showMenu(); },
    level: (el) => { slots[+el.dataset.i].level = el.dataset.l; showMenu(); },
    play: () => {
      if (slots.filter((s) => s.type !== 'off').length < 2) { Shell.banner('Pick at least two tanks'); return; }
      Sfx.init(); Sfx.resume();
      startMatch();
    },
    help2: () => Shell.showRules(),
    rematch: () => { for (const t of tanks) t.score = 0; startRound(); },
    menu: () => showMenu()
  });

  Touch.mount(Shell.els.touchpad, { dpad: true, action: 'FIRE', action2: 'MINE' });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && state === 'menu') {
      const b = Shell.els.overlay.querySelector('[data-act="play"]');
      if (b) b.click();
    }
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyTanks = {
    get state() { return state; },
    tanks: () => tanks, shells: () => shells, mines: () => mines,
    grid: () => grid,
    dims: () => ({ COLS, ROWS, TILE, W, H }),
    tiles: T,
    startMatch, startRound, update, fire, dropMine, driveTank, stepShell,
    simulateShot, incomingThreat, tankFits,
    setSlots(v) { slots = v; },
    cfg: CFG
  };
})();
