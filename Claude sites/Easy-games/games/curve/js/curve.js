'use strict';

/* Easy Curve, after Achtung die Kurve (Filip Oscadal and Kamil Dolezal, 1995).

   Two implementation decisions carry this game:

   1. Collision is tested against a 1 byte per pixel bitmask, not a list of line
      segments. Trails grow without bound, so segment testing degrades badly.
      The mask makes every test O(1) no matter how full the arena is.

   2. A player's own trail is stamped into the mask on a delay, so the newest
      stretch behind the head simply is not there to collide with. That is much
      cleaner than special casing self collision. */

(function () {
  const W = 900, H = 700;

  const CFG = {
    speed: 105,          // px/s
    turn: 3.1,           // rad/s
    lineWidth: 4,
    radius: 3,           // collision radius at the head
    grace: 14,           // px of own trail behind the head that is not yet solid
    gapMin: 1800, gapMax: 3400,
    gapLenMin: 100, gapLenMax: 140,
    freeze: 900,         // ms before a round starts moving
    minSpawnDist: 120,
    roundGap: 1900
  };

  const PLAYERS = [
    { name: 'Red',    col: '#ff4d5e', left: 'ArrowLeft', right: 'ArrowRight' },
    { name: 'Blue',   col: '#4da3ff', left: 'KeyZ',      right: 'KeyX' },
    { name: 'Green',  col: '#4ad46f', left: 'KeyN',      right: 'KeyM' },
    { name: 'Yellow', col: '#ffcc3f', left: 'KeyQ',      right: 'KeyW' },
    { name: 'Purple', col: '#b98cff', left: 'KeyV',      right: 'KeyB' },
    { name: 'Cyan',   col: '#3fe0d0', left: 'Digit1',    right: 'Digit2' },
    { name: 'Orange', col: '#ff9038', left: 'Comma',     right: 'Period' },
    { name: 'Pink',   col: '#ff7ad5', left: 'Numpad1',   right: 'Numpad2' }
  ];

  let active = [];          // indices of participating players
  let players = [];
  let state = 'menu';       // menu | freeze | play | roundover | matchover
  let timer = 0;
  let target = 10;
  let mask, trail, tctx;

  Shell.mount({
    name: 'Curve',
    width: W, height: H, max: 900, pad: 250,
    tools: ['sound', 'pause', 'help'],
    foot: 'Two keys each, left and right &middot; Escape pauses',
    rules: `
      <ul>
        <li>Your line moves forward on its own and never stops. You only steer left and right.</li>
        <li>Touching any line, your own included, or the wall, ends your round.</li>
        <li>Every line briefly stops drawing now and then, leaving a <b>gap</b>. Those holes
            are your escape route once the arena fills up.</li>
        <li>Each round you score one point for every player who dies before you.</li>
        <li>First to the target score wins the match.</li>
      </ul>
      <p>Turning is continuous, so hold a key to curve rather than tapping to snap.
         Wide turns are slow but safe, tight turns box you in.</p>`
  });

  Input.init();
  Input.claim(PLAYERS.flatMap((p) => [p.left, p.right]).concat(['KeyR', 'Enter']));

  const ctx = Shell.ctx;

  // Offscreen trail canvas: the permanent drawing. Redrawn only when it changes.
  trail = document.createElement('canvas');
  trail.width = W; trail.height = H;
  tctx = trail.getContext('2d');
  mask = new Uint8Array(W * H);

  /* ---------- mask ---------- */

  function clearBoard() {
    mask.fill(0);
    tctx.clearRect(0, 0, W, H);
  }

  function stamp(x, y, col) {
    // Solid disc into the collision mask, and the same dot onto the trail canvas.
    const r = CFG.lineWidth / 2;
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.ceil(y + r));
    const rr = r * r;
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dx = px - x, dy = py - y;
        if (dx * dx + dy * dy <= rr) mask[py * W + px] = 1;
      }
    }
    tctx.fillStyle = col;
    tctx.beginPath();
    tctx.arc(x, y, r, 0, 6.283);
    tctx.fill();
  }

  function blocked(x, y) {
    const r = CFG.radius;
    if (x < r || y < r || x > W - r || y > H - r) return true;
    // Sample the head disc: centre plus eight points on the rim is plenty at this speed.
    if (mask[(y | 0) * W + (x | 0)]) return true;
    for (let a = 0; a < 8; a++) {
      const ang = a * 0.785;
      const px = (x + Math.cos(ang) * r) | 0;
      const py = (y + Math.sin(ang) * r) | 0;
      if (px < 0 || py < 0 || px >= W || py >= H) return true;
      if (mask[py * W + px]) return true;
    }
    return false;
  }

  /* ---------- rounds ---------- */

  function makePlayer(idx) {
    return {
      idx, def: PLAYERS[idx], score: 0,
      x: 0, y: 0, ang: 0, alive: true, pending: [], gapTimer: 0, gapLeft: 0, deathAt: 0
    };
  }

  function startMatch() {
    players = active.map(makePlayer);
    target = Math.max(4, (players.length - 1) * 5);
    state = 'menu';
    startRound();
  }

  function startRound() {
    clearBoard();
    const spots = [];
    for (const p of players) {
      p.alive = true;
      p.pending.length = 0;
      p.gapTimer = CFG.gapMin + Math.random() * (CFG.gapMax - CFG.gapMin);
      p.gapLeft = 0;
      p.ang = Math.random() * 6.283;
      // Rejection sample a spawn that is not on top of anybody else.
      let tries = 0;
      do {
        p.x = 90 + Math.random() * (W - 180);
        p.y = 90 + Math.random() * (H - 180);
        tries++;
      } while (tries < 200 && spots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < CFG.minSpawnDist));
      spots.push({ x: p.x, y: p.y });
    }
    state = 'freeze';
    timer = CFG.freeze;
    Sfx.roundStart();
    Shell.hide();
    updateHud();
  }

  /* ---------- simulation ---------- */

  function update(dt) {
    if (state === 'freeze') {
      timer -= dt * 1000;
      Shell.countdown(Math.ceil(timer / 300), 'Get ready');
      if (timer <= 0) { state = 'play'; Shell.hide(); }
      return;
    }
    if (state === 'roundover') {
      timer -= dt * 1000;
      if (timer <= 0) {
        const champ = players.find((p) => p.score >= target);
        if (champ) matchOver(champ); else startRound();
      }
      return;
    }
    if (state !== 'play') return;

    const step = CFG.speed * dt;

    for (const p of players) {
      if (!p.alive) continue;

      // Steer.
      let turn = 0;
      if (Input.held(p.def.left)) turn -= 1;
      if (Input.held(p.def.right)) turn += 1;
      if (p.idx === active[0]) {
        if (Touch.held.a) turn += 1;
        if (Touch.held.b) turn -= 1;
      }
      p.ang += turn * CFG.turn * dt;

      // Gap bookkeeping. A gap ending starts a fresh stroke so the drawn line
      // does not get joined straight back across the hole.
      let drawing = true;
      if (p.gapLeft > 0) {
        p.gapLeft -= dt * 1000;
        drawing = false;
        if (p.gapLeft <= 0) {
          p.gapTimer = CFG.gapMin + Math.random() * (CFG.gapMax - CFG.gapMin);
          p.newStroke = true;
        }
      } else {
        p.gapTimer -= dt * 1000;
        if (p.gapTimer <= 0) {
          p.gapLeft = CFG.gapLenMin + Math.random() * (CFG.gapLenMax - CFG.gapLenMin);
          drawing = false;
        }
      }

      // Move in small increments so a fast frame cannot jump over a trail.
      let remaining = step;
      while (remaining > 0.0001 && p.alive) {
        const s = Math.min(1.5, remaining);
        remaining -= s;
        const nx = p.x + Math.cos(p.ang) * s;
        const ny = p.y + Math.sin(p.ang) * s;
        if (blocked(nx, ny)) { kill(p); break; }
        p.x = nx; p.y = ny;
        if (drawing) {
          p.pending.push({ x: nx, y: ny, brk: !!p.newStroke });
          p.newStroke = false;
        }
      }

      // Anything more than `grace` behind the head becomes solid. Distance is
      // measured along the path, so a gap counts toward it too.
      let held = 0;
      for (let i = p.pending.length - 1; i > 0; i--) {
        held += Math.hypot(p.pending[i].x - p.pending[i - 1].x, p.pending[i].y - p.pending[i - 1].y);
        if (held > CFG.grace) {
          for (let k = 0; k < i; k++) stamp(p.pending[k].x, p.pending[k].y, p.def.col);
          p.pending.splice(0, i);
          break;
        }
      }
    }

    const alive = players.filter((p) => p.alive);
    if (alive.length <= 1 && players.length > 1) endRound(alive[0] || null);
  }

  function kill(p) {
    if (!p.alive) return;
    p.alive = false;
    p.deathAt = performance.now();
    // Everyone still alive gets a point for outliving this player.
    for (const q of players) if (q.alive && q !== p) q.score++;
    Sfx.die();
    updateHud();
  }

  function endRound(survivor) {
    state = 'roundover';
    timer = CFG.roundGap;
    if (survivor) Sfx.win();
    const title = survivor
      ? `<span style="color:${survivor.def.col}">${survivor.def.name}</span> survives`
      : 'Everybody crashed';
    Shell.overlay(`<div class="card slim"><h2>${title}</h2>${scoreStripHtml()}</div>`, { transparent: true });
    updateHud();
  }

  function matchOver(champ) {
    state = 'matchover';
    Sfx.win();
    Shell.overlay(`<div class="card">
      <h2><span style="color:${champ.def.col}">${champ.def.name}</span> wins the match</h2>
      ${scoreStripHtml()}
      <div class="btnRow">
        <button class="primary" data-act="rematch">Rematch</button>
        <button data-act="menu">Change players</button>
      </div>
    </div>`);
  }

  function scoreStripHtml() {
    return '<div class="scoreStrip">' + players.slice().sort((a, b) => b.score - a.score).map((p) =>
      `<div class="scoreChip ${p.alive ? '' : 'dead'}" style="--c:${p.def.col}">
         <i></i>${p.score}<small>${p.def.name}</small></div>`).join('') + '</div>';
  }

  function updateHud() {
    Shell.hud(scoreStripHtml());
    Shell.status(players.filter((p) => p.alive).length + '/' + players.length, 'first to ' + target);
  }

  /* ---------- drawing ---------- */

  function draw() {
    ctx.fillStyle = '#13182a';
    ctx.fillRect(0, 0, W, H);

    // Faint grid so motion reads clearly against the ground.
    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;
    for (let x = 50; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); }
    for (let y = 50; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); }

    ctx.strokeStyle = 'rgba(255,176,46,.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, W - 4, H - 4);

    ctx.drawImage(trail, 0, 0);

    // The stretch just behind each head is not solid yet, so it is not in the
    // trail canvas either. Draw it here, honouring stroke breaks from gaps.
    for (const p of players) {
      if (!p.pending.length) continue;
      ctx.strokeStyle = p.def.col;
      ctx.lineWidth = CFG.lineWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      let started = false;
      for (const q of p.pending) {
        if (!started || q.brk) { ctx.moveTo(q.x, q.y); started = true; }
        else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }

    for (const p of players) drawHead(p);
  }

  function drawHead(p) {
    if (!p.alive) {
      const t = (performance.now() - p.deathAt) / 500;
      if (t > 1) return;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.def.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 + t * 22, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    ctx.fillStyle = p.def.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, CFG.radius + 1.5, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.ang) * 1.6, p.y + Math.sin(p.ang) * 1.6, 1.5, 0, 6.283);
    ctx.fill();

    if (state === 'freeze') {
      // Show which way you are pointing before the round starts.
      ctx.strokeStyle = p.def.col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.ang) * 34, p.y + Math.sin(p.ang) * 34);
      ctx.stroke();
      ctx.globalAlpha = .35;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, 6.283);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- menu ---------- */

  let chosen = [true, true, false, false, false, false, false, false];

  function showMenu() {
    state = 'menu';
    players = [];
    clearBoard();
    Shell.hud('');
    Shell.status('', '');
    const rows = PLAYERS.map((p, i) => `
      <div class="playerRow ${chosen[i] ? '' : 'off'}">
        <span class="dot" style="background:${p.col}"></span>
        <span class="who">${p.name}</span>
        <span class="keyPair"><span class="kp">${Input.label(p.left)}</span><span class="kp">${Input.label(p.right)}</span></span>
        <button class="toggle ${chosen[i] ? 'primary' : ''}" data-act="toggle" data-i="${i}">${chosen[i] ? 'in' : 'out'}</button>
      </div>`).join('');

    Shell.overlay(`<div class="card wide">
      <h1>Easy <span>Curve</span></h1>
      <p class="tag">Steer a line that never stops. Last one alive takes the round.</p>
      ${rows}
      <div class="btnRow">
        <button class="primary" data-act="play">Start match</button>
        <button data-act="help2">How to play</button>
      </div>
    </div>`);
  }

  Shell.on({
    toggle: (el) => { const i = +el.dataset.i; chosen[i] = !chosen[i]; showMenu(); },
    play: () => {
      active = chosen.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
      if (active.length < 2) { Shell.banner('Pick at least two players'); return; }
      Sfx.init(); Sfx.resume();
      startMatch();
    },
    help2: () => Shell.showRules(),
    rematch: () => { for (const p of players) p.score = 0; startRound(); },
    menu: () => showMenu()
  });

  Touch.mount(Shell.els.touchpad, { dpad: false, action: 'RIGHT', action2: 'LEFT' });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && state === 'menu') Shell.els.overlay.querySelector('[data-act="play"]').click();
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  window.EasyCurve = {
    get state() { return state; },
    players: () => players,
    mask: () => mask,
    force(list) {
      chosen = chosen.map((_, i) => list.indexOf(i) >= 0);
      active = list.slice();
    },
    startMatch, startRound, update,
    cfg: CFG
  };
})();
