'use strict';

/* Easy Invaders.

   The rules live in rules.js and know nothing about the page. This file is the
   wiring: it reads the keyboard and the touch pad, feeds one tick per frame to
   the engine, turns the events it gets back into sound and particles, and draws
   the state with canvas rectangles. Every sprite is a small bitmap in rules.js
   scaled by three, so the whole game is a few hundred fillRect calls a frame.

   The one thing worth knowing about the feel: the march note plays once per
   formation step, so the beat is the speed. It is slow with fifty-five alive
   and a buzz with one, because the interval is base * alive / 55 and nothing
   smooths it. That is the original's accident kept on purpose. */

(function () {
  const R = InvadersRules;
  const CFG = R.CFG;
  const W = R.W, H = R.H, P = R.P;

  const COLOURS = {
    invader: ['#ffd775', '#7fd7ff', '#8de08d'],   // top row, middle rows, bottom rows
    shield: '#4ad46f',
    player: '#e8edfa',
    mystery: '#ff5470',
    playerShot: '#fff4c8',
    invaderShot: '#ff8fa3',
    ground: '#2e7f47'
  };

  // Four notes that fall and rise again, one per step. Own tune, not the original's.
  const MARCH = [98, 87, 78, 87];

  let state = 'menu';        // menu | play | over
  let g = null;              // the rules engine's game object
  let particles = [];
  let stars = [];
  let lastNoteAt = 0;
  let mysteryPing = 0;

  Shell.mount({
    name: 'Invaders',
    width: W, height: H, max: 660, pad: 240,
    tools: ['sound', 'pause', 'help'],
    foot: '<b>Left</b> and <b>right</b> move &middot; <b>space</b> fires &middot; drag on a phone',
    rules: `
      <ul>
        <li>Fifty-five invaders in five rows. The top row scores 30, the middle
            rows 20, the bottom rows 10.</li>
        <li>The formation steps sideways, drops when it reaches a wall, and
            <b>speeds up every time one dies</b>. The last few are very fast. That
            is the trick, and it is deliberate.</li>
        <li>Only <b>one of your shots</b> can be in the air at a time. Fire early
            and you wait; fire late and they are on you.</li>
        <li>Four <b>shields</b> soak up fire from both sides and wear away pixel by
            pixel. The formation eats through them when it reaches them.</li>
        <li>The <b>mystery ship</b> crosses the top now and then. It is worth 50 to
            300, and exactly 300 if you hit it with your 23rd shot, or every 15th
            shot after that.</li>
        <li>Three lives and an extra one at 1500. If an invader reaches your row
            the game ends whatever you have left.</li>
        <li>Every wave starts lower than the last, until the fifth.</li>
      </ul>`
  });

  Input.init();
  Input.claim(['KeyA', 'KeyD', 'KeyR', 'Space']);
  const ctx = Shell.ctx;

  for (let i = 0; i < 70; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * (H - 90), r: Math.random() * 1.2 + 0.4, a: Math.random() * 0.4 + 0.1 });
  }

  /* ---------- flow ---------- */

  function start() {
    g = R.makeGame((Math.random() * 0xffffffff) >>> 0);
    particles = [];
    state = 'play';
    Shell.hide();
    updateHud();
    Shell.banner('Wave 1');
    Sfx.roundStart();
  }

  function readInput() {
    return {
      left: Input.held('ArrowLeft') || Input.held('KeyA') || Touch.dir.dx === -1,
      right: Input.held('ArrowRight') || Input.held('KeyD') || Touch.dir.dx === 1,
      fire: Input.held('Space') || Touch.held.a
    };
  }

  /* ---------- simulation ---------- */

  function update(dt) {
    stepParticles(dt);
    if (state !== 'play') return;

    const events = R.tick(g, dt, readInput());
    for (const e of events) handle(e);

    if (g.mystery) {
      mysteryPing -= dt;
      if (mysteryPing <= 0) {
        mysteryPing = 0.16;
        Sfx.tone({ type: 'triangle', from: 640, to: 520, dur: 0.12, vol: 0.07 });
      }
    }

    if (g.phase === 'over') gameOver();
  }

  function handle(e) {
    switch (e.type) {
      case 'step': {
        // With one invader left there are sixty steps a second; sixty tones a
        // second is noise, so the beat is capped and the speed still shows.
        const now = performance.now();
        if (now - lastNoteAt > 70) {
          lastNoteAt = now;
          const f = MARCH[e.note];
          Sfx.tone({ type: 'square', from: f, to: f, dur: 0.11, vol: 0.14 });
        }
        break;
      }
      case 'playerShot':
        Sfx.tone({ type: 'square', from: 900, to: 260, dur: 0.1, vol: 0.1 });
        break;
      case 'invaderDied':
        Sfx.noise({ freqFrom: 2200, freqTo: 300, dur: 0.16, vol: 0.22 });
        boom(e.x, e.y, 14, COLOURS.invader[e.kind], 90);
        updateHud();
        break;
      case 'mysteryDied':
        Sfx.pickup();
        boom(e.x, e.y, 18, COLOURS.mystery, 140);
        Shell.banner('Mystery ' + e.points);
        updateHud();
        break;
      case 'shieldHit':
        Sfx.noise({ freqFrom: 900, freqTo: 200, dur: 0.08, vol: 0.08 });
        boom(e.x, e.y, 5, COLOURS.shield, 40);
        break;
      case 'shotsMet':
        Sfx.tick(false);
        boom(e.x, e.y, 6, COLOURS.playerShot, 60);
        break;
      case 'shotLost':
        boom(e.x, 4, 5, COLOURS.playerShot, 40);
        break;
      case 'playerDied':
        Sfx.die();
        boom(e.x, e.y, 26, COLOURS.player, 160);
        updateHud();
        break;
      case 'extraLife':
        Sfx.win();
        Shell.banner('Extra life');
        updateHud();
        break;
      case 'cleared':
        Sfx.win();
        break;
      case 'wave':
        Shell.banner('Wave ' + e.wave);
        Sfx.roundStart();
        updateHud();
        break;
      case 'over':
        if (e.reason === 'landed') Sfx.bad();
        break;
      default:
        break;
    }
  }

  function boom(x, y, n, col, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const s = speed * (0.3 + Math.random());
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                       life: 0.25 + Math.random() * 0.4, max: 0.65, size: 2 + Math.random() * 2, col });
    }
  }

  function stepParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  function gameOver() {
    state = 'over';
    const res = Scores.submit('invaders', g.score);
    Shell.gameOverCard({
      title: g.reason === 'landed' ? 'They landed' : 'Out of lives',
      scoreLabel: 'Score',
      score: g.score,
      isNew: res.isNew && res.previous !== null,
      best: Scores.label('invaders'),
      extra: `<p class="tag" style="margin-top:8px">You reached wave ${g.wave}${
        g.alive < 55 && g.alive > 0 ? ' with ' + g.alive + ' still marching' : ''}</p>`,
      buttons: [{ label: 'Play again', act: 'again', primary: true }, { label: 'Menu', act: 'menu' }]
    });
  }

  function updateHud() {
    Shell.readouts([
      { label: 'Score', value: g ? g.score : 0, accent: true },
      { label: 'Lives', value: g ? Math.max(0, g.lives) : CFG.lives },
      { label: 'Wave', value: g ? g.wave : 0 },
      { label: 'Best', value: Scores.label('invaders') }
    ]);
    Shell.status(g ? g.score : 0, g ? 'wave ' + g.wave : '');
  }

  /* ---------- drawing ---------- */

  /** A bitmap at (x, y), one fillRect per horizontal run of set units. */
  function drawSprite(spr, x, y, col) {
    ctx.fillStyle = col;
    for (let r = 0; r < spr.h; r++) {
      const row = spr.rows[r];
      let c = 0;
      while (c < spr.w) {
        if (row[c] !== '#') { c++; continue; }
        let end = c;
        while (end < spr.w && row[end] === '#') end++;
        ctx.fillRect(x + c * P, y + r * P, (end - c) * P, P);
        c = end;
      }
    }
  }

  function drawShield(sh) {
    ctx.fillStyle = COLOURS.shield;
    for (let y = 0; y < sh.h; y++) {
      let x = 0;
      while (x < sh.w) {
        if (!sh.px[y * sh.w + x]) { x++; continue; }
        let end = x;
        while (end < sh.w && sh.px[y * sh.w + end]) end++;
        ctx.fillRect(sh.x + x * P, sh.y + y * P, (end - x) * P, P);
        x = end;
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#0b0f1a';
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#dfe6f8';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // The ground line the invaders are marching for.
    ctx.fillStyle = COLOURS.ground;
    ctx.fillRect(0, H - 30, W, 2);

    if (g) drawGame();

    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawGame() {
    const f = g.formation;
    for (const inv of g.invaders) {
      if (!inv.alive) continue;
      const r = R.invaderRect(g, inv);
      drawSprite(R.SPRITES.invaders[inv.type][f.frame], r.x, r.y, COLOURS.invader[inv.type]);
    }

    for (const sh of g.shields) if (sh.left) drawShield(sh);

    if (g.mystery) {
      drawSprite(R.SPRITES.mystery, g.mystery.x, CFG.mysteryY, COLOURS.mystery);
    }

    const flip = Math.floor(g.time * 12) % 2;
    ctx.fillStyle = COLOURS.invaderShot;
    for (const s of g.invaderShots) {
      drawSprite(R.SPRITES.shots[s.kind][flip], s.x, s.y, COLOURS.invaderShot);
    }

    if (g.playerShot) {
      ctx.fillStyle = COLOURS.playerShot;
      ctx.fillRect(g.playerShot.x, g.playerShot.y, g.playerShot.w, g.playerShot.h);
    }

    // The player is not drawn while its explosion plays out, nor after the end.
    if (g.phase !== 'dying' && g.phase !== 'over') {
      drawSprite(R.SPRITES.player, g.player.x, CFG.playerY, COLOURS.player);
    }

    for (const p of g.popups) {
      ctx.globalAlpha = clamp(p.t, 0, 1);
      ctx.fillStyle = COLOURS.mystery;
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // Reserve ships, bottom left, under the ground line.
    for (let i = 0; i < Math.min(Math.max(0, g.lives - 1), 6); i++) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.translate(14 + i * 30, H - 22);
      ctx.scale(0.5, 0.5);
      drawSprite(R.SPRITES.player, 0, 0, COLOURS.player);
      ctx.restore();
    }

    if (g.phase === 'intro' && state === 'play') {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('Wave ' + g.wave, W / 2, CFG.shieldY - 40);
    }
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    // A fresh formation sits behind the card as the attract screen.
    g = R.makeGame(7);
    particles = [];
    Shell.status('', '');
    Shell.readouts([{ label: 'Best score', value: Scores.label('invaders') }]);
    Shell.startCard({
      blurb: 'They speed up as you thin them out. That is the trick.',
      extra: `<div class="rowBetween"><span>Invader values</span><b style="color:var(--text)">10 / 20 / 30</b></div>
              <div class="rowBetween"><span>Mystery ship</span><b style="color:var(--text)">50 to 300</b></div>
              <div class="rowBetween"><span>Extra life</span><b style="color:var(--text)">at 1500</b></div>`,
      buttons: [{ label: 'Play', act: 'again', primary: true }]
    });
  }

  Shell.on({ again: () => start(), menu: () => showMenu() });

  Touch.mount(Shell.els.touchpad, { dpad: true, axis: 'x', action: 'FIRE' });
  // Dragging anywhere on the stage also steers, for thumbs that prefer it.
  Touch.drag(Shell.els.stageWrap, (nx) => {
    if (state !== 'play' || Shell.isOpen()) return;
    R.setPlayerX(g, nx * W - CFG.playerW / 2);
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyR' && state !== 'menu') start();
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyInvaders = {
    get state() { return state; },
    get score() { return g ? g.score : 0; },
    get lives() { return g ? g.lives : 0; },
    get wave() { return g ? g.wave : 0; },
    get phase() { return g ? g.phase : null; },
    game: () => g,
    invaders: () => (g ? g.invaders : []),
    shields: () => (g ? g.shields : []),
    start, update,
    tick: (dt, input) => R.tick(g, dt, input),
    fire: () => R.firePlayer(g, []),
    kill: (n) => { for (const inv of g.invaders) { if (n <= 0) break; if (inv.alive) { R.killInvader(g, inv, []); n--; } } },
    snapshot: () => R.snapshot(g),
    rules: R, cfg: CFG
  };
})();
