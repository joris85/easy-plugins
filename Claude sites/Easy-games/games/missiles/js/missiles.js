'use strict';

/* Easy Missiles.

   Six cities, three batteries, ten interceptors each, and they do not refill
   until the wave is over. Warheads fall in flights from the top of the sky;
   later waves split them in mid-air and send smart bombs that slide around a
   blast placed a little off. Every wave ends with a tally: unused missiles and
   standing cities pay out, multiplied by a wave multiplier that climbs from x1
   to x6, and every 10000 points rebuilds one ruined city.

   All of the rules live in rules.js and are stepped from node in the test
   suite. This file owns the shell, the pointer and keys, the drawing, the
   sounds and the counting-up tally between waves.

   Two design points that matter:

   - Nothing helps you aim. The interceptor takes real time to arrive and the
     blast takes 0.6 s to grow, so a shot placed on top of a warhead is wasted.
     Leading the target is the entire skill and the game never softens it.
   - The blast is always the same size. What changes with the waves is how
     many warheads there are, how fast they fall, how often they split, and how
     many smart bombs come. */

(function () {
  const R = MissileRules;
  const CFG = R.DEFAULTS;
  const W = CFG.width, H = CFG.height, GROUND = CFG.groundY;

  const UI = {
    crossSpeed: 520,            // px/s when steering the crosshair with the arrow keys
    tallyTitle: 0.7,            // seconds the "wave cleared" line sits alone
    tallyMissile: 0.08,         // seconds per counted missile
    tallyCity: 0.22,            // seconds per counted city
    tallyGap: 0.35,             // pause between the stages
    tallyHold: 1.0,             // seconds the finished tally stays up
    bonusHold: 1.1
  };

  const BLAST_COLS = ['#ffffff', '#ffd775', '#ff5470', '#4da3ff'];

  let state = 'menu';           // menu | play | tally | over
  let g = null;                 // the rules engine's game
  let aim = { x: W / 2, y: H * 0.4, shown: false };
  let particles = [], popups = [], scorches = [];
  let shake = 0;
  let tally = null;             // the animated end-of-wave count
  let stars = [];

  Shell.mount({
    name: 'Missiles',
    width: W, height: H, max: 860, pad: 240,
    tools: ['sound', 'pause', 'help'],
    foot: '<b>Move</b> the pointer to aim, <b>click</b> or <b>tap</b> to fire from the nearest battery &middot; <b>1 2 3</b> fire from a chosen battery &middot; <b>arrows</b> and <b>space</b> also work',
    rules: `
      <ul>
        <li>Warheads fall on your six cities and three batteries. Click a point in
            the sky and an interceptor flies there from the nearest battery with
            missiles left, then bursts into a blast that grows, holds, and fades.
            Anything the blast touches is destroyed.</li>
        <li><b>Lead your shots.</b> The interceptor needs time to arrive and the
            blast needs 0.6 seconds to grow. Aim where the warhead will be.</li>
        <li>Each battery holds <b>10 missiles</b> and nothing refills until the
            wave ends. The centre battery fires faster than the flanks. Press
            <b>1</b>, <b>2</b> or <b>3</b> to choose a battery yourself.</li>
        <li>A warhead scores 25, a smart bomb 125, both times the wave multiplier.
            Smart bombs slide around a blast that is not placed right on them.</li>
        <li>From wave 2 some warheads <b>split</b> in mid-air. From wave 4 smart
            bombs arrive.</li>
        <li>At the end of a wave every unused missile pays 5 and every standing
            city 100, times the multiplier: x1 for waves 1 and 2, x2 for 3 and 4,
            up to x6.</li>
        <li>Every 10000 points rebuilds one ruined city. A warhead that lands on a
            battery destroys its remaining missiles for that wave.</li>
        <li>The game ends when a wave finishes with no city standing.</li>
      </ul>`
  });

  Input.init();
  Input.claim(['Digit1', 'Digit2', 'Digit3', 'KeyR', 'Space']);
  const ctx = Shell.ctx;

  for (let i = 0; i < 110; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * GROUND * 0.95, r: Math.random() * 1.4 + 0.3, a: Math.random() * 0.5 + 0.15 });
  }

  /* ---------- sound ---------- */

  const Snd = {
    launch() { Sfx.tone({ type: 'sawtooth', from: 880, to: 260, dur: 0.16, vol: 0.07 }); },
    blast() {
      Sfx.noise({ freqFrom: 2200, freqTo: 180, dur: 0.38, vol: 0.2 });
      Sfx.tone({ type: 'sine', from: 120, to: 50, dur: 0.25, vol: 0.14 });
    },
    kill() { Sfx.tone({ type: 'square', from: 640, to: 1040, dur: 0.07, vol: 0.09 }); },
    smart() { Sfx.pickup(); },
    split() { Sfx.tone({ type: 'triangle', from: 300, to: 180, dur: 0.12, vol: 0.1 }); },
    city() { Sfx.boom(); Sfx.tone({ type: 'sawtooth', from: 200, to: 40, dur: 0.6, vol: 0.16, delay: 0.05 }); },
    battery() { Sfx.bad(); },
    ground() { Sfx.noise({ freqFrom: 700, freqTo: 120, dur: 0.18, vol: 0.1 }); },
    empty() { Sfx.tone({ type: 'square', from: 200, to: 160, dur: 0.06, vol: 0.06 }); },
    tick() { Sfx.tick(false); },
    cityTick() { Sfx.tone({ type: 'triangle', from: 660, to: 660, dur: 0.09, vol: 0.14 }); },
    bonus() { Sfx.win(); },
    wave() { Sfx.kick(); },
    over() { Sfx.die(); }
  };

  /* ---------- flow ---------- */

  function start() {
    g = R.makeGame({}, (Math.random() * 4294967296) >>> 0);
    R.startWave(g);
    particles = []; popups = []; scorches = [];
    tally = null;
    state = 'play';
    Shell.hide();
    Shell.banner('Wave 1');
    Snd.wave();
    updateHud();
  }

  /** Fire at (x, y), from a named battery or the nearest one with ammo. */
  function fireAt(x, y, battery) {
    if (state !== 'play') return null;
    const m = R.fire(g, x, y, battery);
    if (!m) {
      // No missiles there, or none at all. Say so quietly rather than silently
      // eating the click, which reads as a broken game.
      Snd.empty();
      if (R.totalAmmo(g) === 0) Shell.banner('Out of missiles');
      return null;
    }
    Snd.launch();
    updateHud();
    return m;
  }

  function update(dt) {
    if (state === 'play') {
      steerByKeys(dt);
      if (Input.tapped('Space')) fireAt(aim.x, aim.y);
      for (let k = 0; k < 3; k++) if (Input.tapped('Digit' + (k + 1))) fireAt(aim.x, aim.y, k);

      handleEvents(R.step(g, dt));
      stepCosmetics(dt);
      if (g.phase === 'tally') beginTally();
    } else if (state === 'tally') {
      stepTally(dt);
      stepCosmetics(dt);
    } else {
      stepCosmetics(dt);
    }
  }

  function steerByKeys(dt) {
    let dx = 0, dy = 0;
    if (Input.held('ArrowLeft')) dx -= 1;
    if (Input.held('ArrowRight')) dx += 1;
    if (Input.held('ArrowUp')) dy -= 1;
    if (Input.held('ArrowDown')) dy += 1;
    if (!dx && !dy) return;
    const len = Math.hypot(dx, dy);
    aim.x = clamp(aim.x + dx / len * UI.crossSpeed * dt, 4, W - 4);
    aim.y = clamp(aim.y + dy / len * UI.crossSpeed * dt, 4, GROUND - CFG.minAim);
    aim.shown = true;
  }

  function handleEvents(events) {
    for (const e of events) {
      switch (e.type) {
        case 'blast':
          Snd.blast();
          break;
        case 'kill':
          boom(e.x, e.y, e.kind === 'smart' ? 18 : 10, e.kind === 'smart' ? '#ffd775' : '#ff8fa3');
          popups.push({ x: e.x, y: e.y, text: String(e.points), life: 0.9, max: 0.9, col: e.kind === 'smart' ? '#ffd775' : '#e8edfa' });
          if (e.kind === 'smart') Snd.smart(); else Snd.kill();
          updateHud();
          break;
        case 'split':
          Snd.split();
          for (let i = 0; i < 6; i++) {
            const a = Math.random() * 6.283;
            particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 0.3, max: 0.3, size: 2, col: '#ff5470' });
          }
          break;
        case 'cityHit':
          boom(CFG.cities[e.i], GROUND - 10, 34, '#ffb02e');
          boom(CFG.cities[e.i], GROUND - 6, 20, '#6fe3ff');
          scorches.push({ x: e.x, w: 40 });
          shake = 0.5;
          Snd.city();
          updateHud();
          break;
        case 'batteryHit':
          boom(CFG.batteries[e.i], GROUND - 12, 30, '#ff5470');
          scorches.push({ x: e.x, w: 46 });
          shake = 0.4;
          Snd.battery();
          updateHud();
          break;
        case 'groundHit':
          boom(e.x, GROUND - 2, 8, '#8f7fb0');
          scorches.push({ x: e.x, w: 22 });
          Snd.ground();
          break;
        default:
          break;
      }
    }
  }

  function stepCosmetics(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 60 * dt;                       // a little gravity so debris settles
    }
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.life -= dt;
      if (p.life <= 0) { popups.splice(i, 1); continue; }
      p.y -= 26 * dt;
    }
    shake = Math.max(0, shake - dt * 1.6);
  }

  function boom(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const s = 30 + Math.random() * 150;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                       life: 0.3 + Math.random() * 0.5, max: 0.8, size: 1.5 + Math.random() * 2, col });
    }
  }

  /* ---------- the end-of-wave tally ---------- */

  /** The engine has already worked out the numbers (g.tally); this just
      counts them up one at a time so the player sees what paid out. */
  function beginTally() {
    state = 'tally';
    tally = { data: g.tally, stage: 'title', t: 0, missiles: 0, cities: 0, shownBonus: false };
    aim.shown = false;
  }

  function stepTally(dt) {
    const T = tally, d = T.data;
    T.t += dt;
    switch (T.stage) {
      case 'title':
        if (T.t >= UI.tallyTitle) { T.stage = 'missiles'; T.t = 0; }
        break;
      case 'missiles':
        if (T.t < UI.tallyMissile) break;
        T.t = 0;
        if (T.missiles < d.missiles) { T.missiles++; Snd.tick(); updateHud(); }
        else { T.stage = 'gap1'; }
        break;
      case 'gap1':
        if (T.t >= UI.tallyGap) { T.stage = 'cities'; T.t = 0; }
        break;
      case 'cities':
        if (T.t < UI.tallyCity) break;
        T.t = 0;
        if (T.cities < d.cities) { T.cities++; Snd.cityTick(); updateHud(); }
        else { T.stage = d.bonusCities ? 'bonus' : 'hold'; }
        break;
      case 'bonus':
        if (!T.shownBonus) {
          T.shownBonus = true;
          Shell.banner(d.bonusCities > 1 ? d.bonusCities + ' bonus cities' : 'Bonus city');
          Snd.bonus();
        }
        if (T.t >= UI.bonusHold) { T.stage = 'hold'; T.t = 0; }
        break;
      case 'hold':
        if (T.t >= UI.tallyHold) finishTally();
        break;
      default:
        break;
    }
  }

  function finishTally() {
    const res = R.endWave(g);
    tally = null;
    if (res.rebuilt.length) {
      for (const i of res.rebuilt) boom(CFG.cities[i], GROUND - 14, 16, '#6fe3ff');
    }
    if (res.gameOver) { gameOver(); return; }
    state = 'play';
    Shell.banner('Wave ' + g.wave);
    Snd.wave();
    scorches = [];
    updateHud();
  }

  /** Score as the player should see it mid-tally: the engine's score plus
      whatever has been counted up so far. */
  function shownScore() {
    if (!g) return 0;
    if (state !== 'tally' || !tally) return g.score;
    const d = tally.data;
    return g.score + tally.missiles * CFG.points.missile * d.mult + tally.cities * CFG.points.city * d.mult;
  }

  function gameOver() {
    state = 'over';
    Snd.over();
    const res = Scores.submit('missiles', g.score);
    Shell.gameOverCard({
      title: 'All cities lost',
      scoreLabel: 'Score',
      score: g.score,
      isNew: res.isNew && res.previous !== null,
      best: Scores.label('missiles'),
      extra: `<p class="tag" style="margin-top:8px">You held out for ${g.wave} wave${g.wave === 1 ? '' : 's'}, shot down ${g.stats.kills} warhead${g.stats.kills === 1 ? '' : 's'}</p>`,
      buttons: [{ label: 'Play again', act: 'again', primary: true }, { label: 'Menu', act: 'menu' }]
    });
    updateHud();
  }

  function updateHud() {
    const cities = g ? R.liveCities(g).length : 6;
    Shell.readouts([
      { label: 'Score', value: shownScore(), accent: true },
      { label: 'Cities', value: cities },
      { label: 'Missiles', value: g ? R.totalAmmo(g) : 30 },
      { label: 'Wave', value: g ? g.wave + ' (x' + R.multiplierFor(g.wave) + ')' : 1 },
      { label: 'Best', value: Scores.label('missiles') }
    ]);
    Shell.status(shownScore(), g ? 'wave ' + g.wave : '');
  }

  /* ---------- pointer ---------- */

  Shell.canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;      // a finger aims and fires in one tap
    const p = Touch.canvasPos(Shell.canvas, e);
    aim.x = clamp(p.x, 4, W - 4);
    aim.y = clamp(p.y, 4, GROUND - CFG.minAim);
    aim.shown = true;
  });

  Shell.canvas.addEventListener('pointerdown', (e) => {
    if (state !== 'play') return;
    const p = Touch.canvasPos(Shell.canvas, e);
    aim.x = clamp(p.x, 4, W - 4);
    aim.y = clamp(p.y, 4, GROUND - CFG.minAim);
    aim.shown = true;
    fireAt(aim.x, aim.y);
  });

  // A finger that leaves the stage should not leave a crosshair behind.
  Shell.canvas.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'touch') aim.shown = false;
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyR' && state !== 'menu') start();
  });

  /* ---------- drawing ---------- */

  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 6 * shake, (Math.random() - 0.5) * 6 * shake);

    drawSky();
    drawGround();
    for (let i = 0; i < CFG.cities.length; i++) drawCity(i, !g || g.cities[i]);
    for (let i = 0; i < CFG.batteries.length; i++) drawBattery(i);

    if (g) {
      for (const w of g.warheads) drawWarhead(w);
      for (const m of g.interceptors) drawInterceptor(m);
      for (const b of g.blasts) drawBlast(b);
    }

    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of popups) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    if (state === 'play' && aim.shown) drawCrosshair();
    if (state === 'tally' && tally) drawTally();
    ctx.restore();
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#05081a');
    sky.addColorStop(0.7, '#0d1330');
    sky.addColorStop(1, '#2a1f4a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#dfe6f8';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
  }

  function drawGround() {
    ctx.fillStyle = '#221c33';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.strokeStyle = '#5a4f7a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND + 1); ctx.lineTo(W, GROUND + 1);
    ctx.stroke();
    // Scorch marks from this wave's impacts.
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    for (const s of scorches) {
      ctx.beginPath();
      ctx.ellipse(s.x, GROUND + 2, s.w / 2, 4, 0, 0, 6.283);
      ctx.fill();
    }
  }

  const TOWERS = [[14, 24, 18, 30, 16], [22, 12, 28, 16, 20], [18, 30, 14, 22, 26]];

  function drawCity(i, alive) {
    const x = CFG.cities[i];
    const pat = TOWERS[i % TOWERS.length];
    ctx.fillStyle = '#2c2540';
    ctx.fillRect(x - 32, GROUND - 3, 64, 3);
    if (!alive) {
      // Rubble: the same footprint, knocked flat.
      ctx.fillStyle = '#3a3050';
      for (let k = 0; k < 5; k++) {
        const h = 3 + ((i * 7 + k * 5) % 5);
        ctx.fillRect(x - 24 + k * 10, GROUND - 3 - h, 8, h);
      }
      ctx.strokeStyle = '#5a4a70';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 20, GROUND - 4); ctx.lineTo(x - 8, GROUND - 12);
      ctx.moveTo(x + 4, GROUND - 3); ctx.lineTo(x + 18, GROUND - 9);
      ctx.stroke();
      return;
    }
    for (let k = 0; k < 5; k++) {
      const h = pat[k];
      const bx = x - 24 + k * 10;
      ctx.fillStyle = '#2f8fbf';
      ctx.fillRect(bx, GROUND - 3 - h, 8, h);
      ctx.fillStyle = '#6fe3ff';
      ctx.fillRect(bx, GROUND - 3 - h, 8, 2);
      // Windows, lit.
      ctx.fillStyle = '#bfefff';
      for (let wy = GROUND - 3 - h + 5; wy < GROUND - 6; wy += 5) {
        ctx.fillRect(bx + 2, wy, 1.5, 2);
        ctx.fillRect(bx + 5, wy, 1.5, 2);
      }
    }
  }

  function drawBattery(i) {
    const x = CFG.batteries[i];
    const b = g ? g.batteries[i] : null;
    const dead = b ? b.dead : false;
    const ammo = b ? b.ammo : CFG.ammo;
    const armed = g && state === 'play' && aim.shown && R.nearestBattery(g, aim.x) === i;

    ctx.fillStyle = dead ? '#3a2438' : '#3b3352';
    ctx.strokeStyle = armed ? '#ffb02e' : (dead ? '#7a3a55' : '#6c5f8e');
    ctx.lineWidth = armed ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 36, GROUND);
    ctx.lineTo(x - 20, GROUND - 16);
    ctx.lineTo(x + 20, GROUND - 16);
    ctx.lineTo(x + 36, GROUND);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (dead) {
      ctx.strokeStyle = '#ff5470';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 10, GROUND - 13); ctx.lineTo(x + 10, GROUND - 3);
      ctx.moveTo(x + 10, GROUND - 13); ctx.lineTo(x - 10, GROUND - 3);
      ctx.stroke();
      return;
    }

    // The stock, stacked as a pyramid so a glance tells you what is left.
    ctx.fillStyle = '#4da3ff';
    let n = 0;
    const rows = [4, 3, 2, 1];
    for (let r = 0; r < rows.length; r++) {
      const count = rows[r];
      const y = GROUND - 15 - r * 7 - 4;
      for (let k = 0; k < count; k++) {
        if (n++ >= ammo) return;
        const px = x - (count - 1) * 4 + k * 8;
        ctx.beginPath();
        ctx.moveTo(px, y - 6);
        ctx.lineTo(px + 3, y + 1);
        ctx.lineTo(px - 3, y + 1);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawWarhead(w) {
    const smart = w.kind === 'smart';
    ctx.strokeStyle = smart ? 'rgba(255,215,117,.6)' : 'rgba(255,84,112,.6)';
    ctx.lineWidth = 1.5;
    if (smart) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(w.x0, w.y0);
    ctx.lineTo(w.x, w.y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (smart) {
      const r = 5 + Math.sin(Loop.time * 12) * 1.5;
      ctx.fillStyle = '#ffd775';
      ctx.beginPath();
      ctx.moveTo(w.x, w.y - r);
      ctx.lineTo(w.x + r, w.y);
      ctx.lineTo(w.x, w.y + r);
      ctx.lineTo(w.x - r, w.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5a3a00';
      ctx.fillRect(w.x - 1.5, w.y - 1.5, 3, 3);
    } else {
      ctx.fillStyle = '#ffd7dc';
      ctx.beginPath();
      ctx.arc(w.x, w.y, 2.4, 0, 6.283);
      ctx.fill();
    }
  }

  function drawInterceptor(m) {
    ctx.strokeStyle = 'rgba(77,163,255,.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(m.bx, m.by);
    ctx.lineTo(m.x, m.y);
    ctx.stroke();
    ctx.fillStyle = '#dff1ff';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 2.5, 0, 6.283);
    ctx.fill();
    // A small mark where it will burst, so a queued shot can be judged.
    ctx.strokeStyle = 'rgba(223,241,255,.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.tx - 4, m.ty - 4); ctx.lineTo(m.tx + 4, m.ty + 4);
    ctx.moveTo(m.tx + 4, m.ty - 4); ctx.lineTo(m.tx - 4, m.ty + 4);
    ctx.stroke();
  }

  function drawBlast(b) {
    const r = R.blastRadius(b.age, CFG.blast);
    if (r <= 0) return;
    const col = BLAST_COLS[Math.floor(Loop.time * 16 + b.id) % BLAST_COLS.length];
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 6, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawCrosshair() {
    ctx.strokeStyle = 'rgba(232,237,250,.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(aim.x - 12, aim.y); ctx.lineTo(aim.x - 4, aim.y);
    ctx.moveTo(aim.x + 4, aim.y); ctx.lineTo(aim.x + 12, aim.y);
    ctx.moveTo(aim.x, aim.y - 12); ctx.lineTo(aim.x, aim.y - 4);
    ctx.moveTo(aim.x, aim.y + 4); ctx.lineTo(aim.x, aim.y + 12);
    ctx.stroke();
  }

  function drawTally() {
    const d = tally.data;
    const pw = 440, ph = 210;
    const px = (W - pw) / 2, py = 150;
    ctx.fillStyle = 'rgba(12,16,28,.9)';
    roundRect(ctx, px, py, pw, ph, 14);
    ctx.fill();
    ctx.strokeStyle = '#2e3a53';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8edfa';
    ctx.font = '800 22px system-ui, sans-serif';
    ctx.fillText('Wave ' + d.wave + ' cleared', W / 2, py + 30);
    ctx.fillStyle = '#8f9cba';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('bonus x' + d.mult, W / 2, py + 52);

    if (tally.stage === 'title') return;

    // Missiles row: one triangle per counted missile.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8f9cba';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('Missiles left', px + 24, py + 88);
    ctx.fillStyle = '#4da3ff';
    for (let k = 0; k < tally.missiles; k++) {
      const mx = px + 130 + k * 8;
      ctx.beginPath();
      ctx.moveTo(mx, py + 82); ctx.lineTo(mx + 3, py + 92); ctx.lineTo(mx - 3, py + 92);
      ctx.closePath();
      ctx.fill();
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8edfa';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(String(tally.missiles * CFG.points.missile * d.mult), px + pw - 24, py + 88);

    if (tally.stage === 'missiles' || tally.stage === 'gap1') return;

    // Cities row: a small skyline per counted city.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8f9cba';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('Cities standing', px + 24, py + 128);
    for (let k = 0; k < tally.cities; k++) {
      const cx = px + 130 + k * 26;
      ctx.fillStyle = '#2f8fbf';
      ctx.fillRect(cx, py + 124, 5, 10);
      ctx.fillRect(cx + 6, py + 119, 5, 15);
      ctx.fillRect(cx + 12, py + 127, 5, 7);
      ctx.fillStyle = '#6fe3ff';
      ctx.fillRect(cx, py + 124, 5, 1.5);
      ctx.fillRect(cx + 6, py + 119, 5, 1.5);
      ctx.fillRect(cx + 12, py + 127, 5, 1.5);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8edfa';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(String(tally.cities * CFG.points.city * d.mult), px + pw - 24, py + 128);

    if (tally.stage === 'cities') return;

    ctx.strokeStyle = '#2e3a53';
    ctx.beginPath();
    ctx.moveTo(px + 24, py + 152); ctx.lineTo(px + pw - 24, py + 152);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8f9cba';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(d.bonusCities ? 'Bonus, plus a rebuilt city' : 'Bonus', px + 24, py + 176);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffb02e';
    ctx.font = '800 20px system-ui, sans-serif';
    ctx.fillText(String(d.total), px + pw - 24, py + 176);
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    g = null;
    particles = []; popups = []; scorches = [];
    tally = null;
    aim.shown = false;
    Shell.status('', '');
    Shell.readouts([{ label: 'Best score', value: Scores.label('missiles') }]);
    Shell.startCard({
      blurb: 'Six cities, thirty missiles a wave. Aim where the warhead will be, not where it is.',
      extra: `<div class="rowBetween"><span>Batteries</span><b style="color:var(--text)">3 x 10 missiles</b></div>
              <div class="rowBetween"><span>Warhead, smart bomb</span><b style="color:var(--text)">25, 125</b></div>
              <div class="rowBetween"><span>Wave bonus</span><b style="color:var(--text)">x1 up to x6</b></div>
              <div class="rowBetween"><span>Bonus city</span><b style="color:var(--text)">every 10000</b></div>`,
      buttons: [{ label: 'Play', act: 'again', primary: true }]
    });
  }

  Shell.on({ again: () => start(), menu: () => showMenu() });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyMissiles = {
    get state() { return state; },
    get score() { return g ? g.score : 0; },
    get wave() { return g ? g.wave : 0; },
    get cities() { return g ? R.liveCities(g).length : 0; },
    get ammo() { return g ? R.totalAmmo(g) : 0; },
    game: () => g,
    aim: () => aim,
    start, update, fireAt,
    /** Step the rules engine directly, without waiting for frames. */
    step(dt) { if (!g) return []; const ev = R.step(g, dt); handleEvents(ev); if (g.phase === 'tally' && state === 'play') beginTally(); return ev; },
    finishTally,
    rules: R, cfg: CFG, ui: UI
  };
})();
