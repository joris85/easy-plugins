'use strict';

/* Easy Lander.

   Actual lunar gravity, 1.62 m/s squared, at a scale of 10 pixels to the metre.
   That makes it slow and deliberate, which is the whole character of the game:
   you are managing momentum you committed to several seconds ago.

   A landing counts only if you are on a flat pad, descending under 2.5 m/s,
   drifting under 1.5 m/s sideways, and within 8 degrees of upright. */

(function () {
  const W = 840, H = 620;
  const SCALE = 10;                 // pixels per metre

  const CFG = {
    gravity: 1.62 * SCALE,          // px/s^2
    thrust: 1.62 * 2.6 * SCALE,     // full throttle, comfortably above gravity
    turn: 1.9,                      // rad/s
    fuel: 1000,
    burnRate: 105,                  // fuel per second at full throttle
    maxVy: 2.5 * SCALE,             // safe touchdown, px/s
    maxVx: 1.5 * SCALE,
    maxTilt: 8 * Math.PI / 180,
    shipR: 11
  };

  let state = 'menu';               // menu | play | landed | crashed
  let ship, terrain, pads, particles, stars;
  let fuel, score, flightNo, message;

  Shell.mount({
    name: 'Lander',
    width: W, height: H, max: 840, pad: 240,
    tools: ['sound', 'pause', 'help'],
    foot: '<b>Left</b> and <b>right</b> rotate &middot; <b>up</b> fires the engine &middot; watch your fuel',
    rules: `
      <ul>
        <li>Gravity here is the real thing, 1.62 metres per second squared, about a
            sixth of Earth's. Everything happens slowly, and far too late to fix.</li>
        <li>Land on a <b>flat pad</b> with descent under 2.5 m/s, sideways drift under
            1.5 m/s, and the lander within 8 degrees of upright.</li>
        <li>Narrower pads carry a bigger multiplier. The tight ones are worth the risk.</li>
        <li>Fuel is finite and the engine burns it fast. Once it is gone you are a
            passenger.</li>
      </ul>
      <p>Score comes from the fuel you had left, how gently you touched down, and
         the pad multiplier.</p>`
  });

  Input.init();
  Input.claim(['KeyW', 'KeyA', 'KeyD', 'KeyR', 'Space']);
  const ctx = Shell.ctx;

  stars = [];
  for (let i = 0; i < 110; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H * 0.7, r: Math.random() * 1.2 + 0.3, a: Math.random() * 0.6 + 0.1 });
  }

  /* ---------- terrain ---------- */

  /** Midpoint displacement, then flat pads punched into the result. */
  function makeTerrain() {
    const points = [];
    const steps = 128;
    const heights = new Array(steps + 1).fill(0);
    heights[0] = H * 0.72 + Math.random() * 60;
    heights[steps] = H * 0.72 + Math.random() * 60;

    let span = steps, amp = 150;
    while (span > 1) {
      const half = span / 2;
      for (let i = half; i < steps; i += span) {
        heights[i] = (heights[i - half] + heights[i + half]) / 2 + (Math.random() - 0.5) * amp;
      }
      span = half;
      amp *= 0.54;
    }
    for (let i = 0; i <= steps; i++) {
      heights[i] = clamp(heights[i], H * 0.42, H - 30);
      points.push({ x: i / steps * W, y: heights[i] });
    }

    // Punch in two or three flat pads. Narrower pads are worth more.
    pads = [];
    const padDefs = [{ w: 9, mult: 2 }, { w: 6, mult: 4 }, { w: 4, mult: 8 }];
    const used = [];
    for (const def of padDefs) {
      let start, tries = 0;
      do {
        start = 6 + randInt(steps - def.w - 12);
        tries++;
      } while (tries < 80 && used.some((u) => Math.abs(u - start) < 16));
      used.push(start);
      const y = points[start].y;
      for (let i = start; i <= start + def.w; i++) points[i].y = y;
      pads.push({ x1: points[start].x, x2: points[start + def.w].x, y, mult: def.mult });
    }

    terrain = points;
  }

  function groundAt(x) {
    for (let i = 0; i < terrain.length - 1; i++) {
      const a = terrain[i], b = terrain[i + 1];
      if (x >= a.x && x <= b.x) {
        const t = (x - a.x) / (b.x - a.x);
        return a.y + (b.y - a.y) * t;
      }
    }
    return H;
  }

  function padAt(x) {
    return pads.find((p) => x >= p.x1 && x <= p.x2) || null;
  }

  /* ---------- flow ---------- */

  function start() {
    score = 0;
    flightNo = 1;
    nextFlight();
  }

  function nextFlight() {
    makeTerrain();
    fuel = CFG.fuel;
    ship = {
      x: 80 + Math.random() * (W - 160),
      y: 70,
      vx: (Math.random() - 0.5) * 40,
      vy: 8,
      ang: 0,
      thrust: 0
    };
    particles = [];
    message = '';
    state = 'play';
    Shell.hide();
    updateHud();
  }

  /* ---------- simulation ---------- */

  function update(dt) {
    if (state !== 'play') {
      for (const p of particles) { p.life -= dt; p.vy += 120 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      particles = particles.filter((p) => p.life > 0);
      return;
    }

    // Controls.
    if (Input.held('ArrowLeft') || Input.held('KeyA') || Touch.dir.dx === -1) ship.ang -= CFG.turn * dt;
    if (Input.held('ArrowRight') || Input.held('KeyD') || Touch.dir.dx === 1) ship.ang += CFG.turn * dt;
    const burning = (Input.held('ArrowUp') || Input.held('KeyW') || Input.held('Space') ||
                     Touch.dir.dy === -1 || Touch.held.a) && fuel > 0;
    ship.thrust = burning ? 1 : 0;

    if (burning) {
      fuel = Math.max(0, fuel - CFG.burnRate * dt);
      ship.vx += Math.sin(ship.ang) * CFG.thrust * dt;
      ship.vy -= Math.cos(ship.ang) * CFG.thrust * dt;
      for (let i = 0; i < 2; i++) {
        const a = ship.ang + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        particles.push({
          x: ship.x - Math.sin(ship.ang) * -14, y: ship.y + Math.cos(ship.ang) * 14,
          vx: Math.sin(ship.ang) * -90 + (Math.random() - 0.5) * 50,
          vy: Math.cos(ship.ang) * 90 + (Math.random() - 0.5) * 50,
          life: 0.3, max: 0.3, size: 2 + Math.random() * 2,
          col: Math.random() < 0.5 ? '#ffd775' : '#ff8a2b'
        });
      }
    }

    ship.vy += CFG.gravity * dt;
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    if (ship.x < 0) ship.x += W;
    if (ship.x > W) ship.x -= W;

    for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    particles = particles.filter((p) => p.life > 0);

    const ground = groundAt(ship.x);
    if (ship.y + CFG.shipR >= ground) touchdown(ground);

    if (Loop.frames % 6 === 0) updateHud();
  }

  function touchdown(ground) {
    ship.y = ground - CFG.shipR;
    const pad = padAt(ship.x);
    const tilt = Math.abs(((ship.ang + Math.PI) % (Math.PI * 2)) - Math.PI);
    const softV = ship.vy <= CFG.maxVy;
    const softH = Math.abs(ship.vx) <= CFG.maxVx;
    const upright = tilt <= CFG.maxTilt;

    if (pad && softV && softH && upright) {
      const gentleness = Math.max(0, 1 - ship.vy / CFG.maxVy);
      const gained = Math.round((50 + fuel * 0.25 + gentleness * 120) * pad.mult);
      score += gained;
      state = 'landed';
      Sfx.win();
      message = 'Touchdown';
      showResult(true, gained, pad, tilt);
    } else {
      state = 'crashed';
      Sfx.boom();
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * 6.283, s = 40 + Math.random() * 220;
        particles.push({ x: ship.x, y: ship.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                         life: 0.5 + Math.random() * 0.6, max: 1.1, size: 2 + Math.random() * 3,
                         col: Math.random() < 0.5 ? '#ffb02e' : '#ff5470' });
      }
      showResult(false, 0, pad, tilt);
    }
    updateHud();
  }

  function showResult(ok, gained, pad, tilt) {
    const why = [];
    if (!pad) why.push('not on a pad');
    if (ship.vy > CFG.maxVy) why.push('descending at ' + (ship.vy / SCALE).toFixed(1) + ' m/s');
    if (Math.abs(ship.vx) > CFG.maxVx) why.push('drifting at ' + (Math.abs(ship.vx) / SCALE).toFixed(1) + ' m/s');
    if (tilt > CFG.maxTilt) why.push('tilted ' + (tilt * 180 / Math.PI).toFixed(0) + ' degrees');

    if (ok) {
      const res = Scores.submit('lander', score);
      Shell.gameOverCard({
        title: 'Touchdown on the x' + pad.mult + ' pad',
        scoreLabel: 'This landing',
        score: gained,
        extra: `<div class="rowBetween"><span>Descent</span><b style="color:var(--text)">${(ship.vy / SCALE).toFixed(2)} m/s</b></div>
                <div class="rowBetween"><span>Fuel left</span><b style="color:var(--text)">${Math.round(fuel)}</b></div>
                <div class="rowBetween"><span>Total score</span><b style="color:var(--accent)">${score}</b></div>`,
        isNew: res.isNew && res.previous !== null,
        best: Scores.label('lander'),
        buttons: [{ label: 'Next flight', act: 'next', primary: true }, { label: 'End run', act: 'end' }]
      });
    } else {
      Scores.submit('lander', score);
      Shell.gameOverCard({
        title: 'Crashed',
        scoreLabel: 'Run total',
        score: score,
        extra: `<p class="tag" style="margin-top:8px">${why.join(', ') || 'hit the surface'}</p>`,
        best: Scores.label('lander'),
        buttons: [{ label: 'New run', act: 'again', primary: true }, { label: 'Menu', act: 'menu' }]
      });
    }
  }

  function updateHud() {
    const vy = ship ? ship.vy / SCALE : 0;
    const vx = ship ? Math.abs(ship.vx) / SCALE : 0;
    Shell.readouts([
      { label: 'Score', value: score || 0, accent: true },
      { label: 'Fuel', value: Math.round(fuel || 0) },
      { label: 'Descent m/s', value: vy.toFixed(1) },
      { label: 'Drift m/s', value: vx.toFixed(1) }
    ]);
    Shell.status(score || 0, 'flight ' + (flightNo || 1));
    Shell.urgent(ship && state === 'play' && (vy > CFG.maxVy / SCALE || vx > CFG.maxVx / SCALE));
  }

  /* ---------- drawing ---------- */

  function draw() {
    ctx.fillStyle = '#080b14';
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#dfe6f8';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    if (!terrain) return;

    // Surface.
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (const p of terrain) ctx.lineTo(p.x, p.y);
    ctx.lineTo(W, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, H * 0.4, 0, H);
    g.addColorStop(0, '#2b3550');
    g.addColorStop(1, '#171d2c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#8f9cba';
    ctx.lineWidth = 2;
    ctx.beginPath();
    terrain.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    for (const p of pads) {
      ctx.strokeStyle = '#4ad46f';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(p.x1, p.y);
      ctx.lineTo(p.x2, p.y);
      ctx.stroke();
      ctx.fillStyle = '#4ad46f';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('x' + p.mult, (p.x1 + p.x2) / 2, p.y - 10);
    }

    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    if (state === 'play' || state === 'landed') drawShip();

    // Altitude marker so you can judge the drop.
    if (state === 'play') {
      const ground = groundAt(ship.x);
      ctx.strokeStyle = 'rgba(255,255,255,.13)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ship.x, ship.y + CFG.shipR);
      ctx.lineTo(ship.x, ground);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(((ground - ship.y - CFG.shipR) / SCALE).toFixed(0) + ' m', ship.x + 8, (ship.y + ground) / 2);
    }
  }

  function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.ang);
    ctx.strokeStyle = '#e8edfa';
    ctx.fillStyle = 'rgba(200,212,240,.22)';
    ctx.lineWidth = 2;
    // Body.
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(9, -2);
    ctx.lineTo(9, 6);
    ctx.lineTo(-9, 6);
    ctx.lineTo(-9, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Legs.
    ctx.beginPath();
    ctx.moveTo(-7, 6); ctx.lineTo(-12, 14);
    ctx.moveTo(7, 6); ctx.lineTo(12, 14);
    ctx.moveTo(-14, 14); ctx.lineTo(-10, 14);
    ctx.moveTo(10, 14); ctx.lineTo(14, 14);
    ctx.stroke();
    if (ship.thrust) {
      ctx.strokeStyle = '#ffb02e';
      ctx.beginPath();
      ctx.moveTo(-5, 7);
      ctx.lineTo(0, 15 + Math.random() * 8);
      ctx.lineTo(5, 7);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    makeTerrain();
    ship = null;
    particles = [];
    score = 0; fuel = CFG.fuel; flightNo = 1;
    Shell.status('', '');
    Shell.urgent(false);
    Shell.readouts([
      { label: 'Best run', value: Scores.label('lander') },
      { label: 'Gravity', value: '1.62' },
      { label: 'Safe descent', value: '2.5 m/s' }
    ]);
    Shell.startCard({
      blurb: 'Real lunar gravity, finite fuel, and no second chances.',
      extra: `<div class="rowBetween"><span>Safe touchdown</span><b style="color:var(--text)">under 2.5 m/s down, 1.5 m/s sideways</b></div>
              <div class="rowBetween"><span>Upright within</span><b style="color:var(--text)">8 degrees</b></div>
              <div class="rowBetween"><span>Pads</span><b style="color:var(--text)">x2, x4 and x8</b></div>`,
      buttons: [{ label: 'Launch', act: 'again', primary: true }]
    });
  }

  Shell.on({
    again: () => start(),
    next: () => { flightNo++; nextFlight(); },
    end: () => showMenu(),
    menu: () => showMenu()
  });

  Touch.mount(Shell.els.touchpad, { dpad: true, axis: 'x', action: 'BURN' });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyR' && state !== 'menu') start();
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyLander = {
    get state() { return state; },
    get score() { return score; },
    get fuel() { return fuel; },
    ship: () => ship, pads: () => pads, terrain: () => terrain,
    start, nextFlight, update, groundAt, padAt, makeTerrain,
    setShip(o) { Object.assign(ship, o); },
    cfg: CFG, scale: SCALE
  };
})();
