'use strict';

/* Easy Muncher - the controller.

   Everything that decides the game lives in rules.js and runs in fixed ticks.
   This file only reads the keys and the touch pad, feeds them in as a wanted
   direction, and draws whatever state comes back: the maze from a cached
   canvas, the pellets, the four ghosts with their eyes on the road, the
   muncher's mouth, the death spin and the score pop-ups. No image files, no
   audio files: every shape is a canvas path and every sound is a WebAudio
   oscillator. */

(function () {
  const R = MuncherRules;
  const COLS = R.COLS, ROWS = R.ROWS;
  const TILE = 24;
  const W = COLS * TILE;
  const STRIP_Y = ROWS * TILE;                // a one-tile strip under the maze for lives and fruit
  const H = STRIP_Y + TILE;
  const TAU = Math.PI * 2;

  const COL = {
    bg: '#0c0f18',
    wallFill: '#141a2e',
    wallEdge: '#6a5cff',
    wallFlash: '#f1f0ff',
    door: '#ff9ac4',
    pellet: '#ffd9a8',
    player: '#c8f542',
    playerDark: '#7fa315',
    fright: '#2b3cff',
    frightFlash: '#e9ecff',
    text: '#e8edfa'
  };

  let state = 'menu';          // menu | play | over
  let game = null;
  let mouthT = 0;
  let popups = [];             // { x, y, text, t, life, colour } in pixels
  let lastScore = -1, lastLives = -1, lastLevel = -1;
  let wakaHigh = false;
  let mazeNormal = null, mazeFlash = null;

  Shell.mount({
    name: 'Muncher',
    width: W, height: H, max: 560, pad: 250,
    tools: ['sound', 'pause', 'help'],
    foot: '<b>Arrows</b> or <b>WASD</b> to steer &middot; turns are buffered, so press early &middot; swipe or use the pad on a phone &middot; Escape pauses',
    rules: `
      <ul>
        <li>Eat every pellet in the maze to clear the level. Four ghosts try to stop you.</li>
        <li><b>Blaze</b> (red) comes straight for you. <b>Wisp</b> (pink) aims four tiles
            ahead of you to cut you off. <b>Echo</b> (teal) takes the spot two tiles ahead
            of you and mirrors it through Blaze, so it swings in from odd angles.
            <b>Muddle</b> (amber) chases until it gets close, then loses its nerve and
            runs for its corner.</li>
        <li>Every so often the ghosts stop hunting and <b>patrol their own corners</b>
            for a few seconds. They always turn around when they switch, which is your
            cue.</li>
        <li>The four big pellets turn the ghosts <b>blue</b>. Eat them then for 200,
            400, 800 and 1600 points. They flash just before they recover.</li>
        <li>The <b>tunnels</b> on the left and right wrap around. Ghosts crawl through
            them, you do not.</li>
        <li>Fruit appears below the ghost house twice a level. Later levels bring
            better fruit and faster ghosts, and an extra life comes at 10000.</li>
      </ul>
      <p>Turns are buffered: press the direction you want before the corner and you
         will take it, and pressing it a little early cuts the corner, which is how
         you gain on a ghost behind you. Eating pellets slows you slightly, so a
         cleared corridor is the fast way out.</p>`
  });

  Input.init();
  Input.claim(['KeyR', 'Enter', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);

  const ctx = Shell.ctx;

  /* ---------- sound ---------- */

  const Snd = {
    waka() {
      wakaHigh = !wakaHigh;
      Sfx.tone({ type: 'square', from: wakaHigh ? 420 : 560, to: wakaHigh ? 560 : 420, dur: 0.055, vol: 0.07 });
    },
    power() { Sfx.tone({ type: 'triangle', from: 220, to: 660, dur: 0.28, vol: 0.18 }); },
    ghost() {
      Sfx.tone({ type: 'square', from: 300, to: 900, dur: 0.12, vol: 0.14 });
      Sfx.tone({ type: 'square', from: 600, to: 1400, dur: 0.14, vol: 0.12, delay: 0.1 });
    },
    fruit() {
      [660, 880, 1320].forEach((f, i) => Sfx.tone({ type: 'triangle', from: f, to: f, dur: 0.09, vol: 0.16, delay: i * 0.07 }));
    },
    die() {
      Sfx.tone({ type: 'sawtooth', from: 520, to: 60, dur: 1.1, vol: 0.2 });
      Sfx.noise({ freqFrom: 700, freqTo: 90, dur: 0.6, vol: 0.12, delay: 0.5 });
    },
    clear() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => Sfx.tone({ type: 'triangle', from: f, to: f, dur: 0.15, vol: 0.18, delay: i * 0.1 }));
    },
    extra() {
      [880, 1108, 1318, 1760].forEach((f, i) => Sfx.tone({ type: 'square', from: f, to: f, dur: 0.1, vol: 0.12, delay: i * 0.08 }));
    },
    go() { [440, 660].forEach((f, i) => Sfx.tone({ type: 'square', from: f, to: f, dur: 0.12, vol: 0.12, delay: i * 0.15 })); },
    mode() { Sfx.tone({ type: 'sine', from: 180, to: 180, dur: 0.12, vol: 0.1 }); }
  };

  /* ---------- game flow ---------- */

  function start() {
    game = R.newGame({ seed: (Date.now() & 0xffff) || 1 });
    popups = [];
    lastScore = lastLives = lastLevel = -1;
    state = 'play';
    Shell.hide();
    Loop.resume();
    updateHud();
    Snd.go();
  }

  function gameOver() {
    state = 'over';
    const res = Scores.submit('muncher', game.score);
    Shell.gameOverCard({
      title: 'Game over',
      scoreLabel: 'Score',
      score: game.score,
      isNew: res.isNew && res.previous !== null,
      best: Scores.label('muncher'),
      extra: `<p class="tag" style="margin-top:8px">Reached level ${game.level}</p>`,
      buttons: [
        { label: 'Play again', act: 'start', primary: true },
        { label: 'Menu', act: 'menu' }
      ]
    });
  }

  function ghostLegend() {
    return R.GHOSTS.map((g) => {
      const what = {
        chaser: 'comes straight at you',
        ambusher: 'aims four tiles ahead of you',
        flanker: 'mirrors your position through Blaze',
        nervous: 'chases, then panics when close'
      }[g.mind];
      return `<div class="rowBetween" style="padding-top:8px"><span><span class="dot" style="background:${g.colour};display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;vertical-align:middle"></span><b style="color:var(--text)">${g.name}</b></span><span>${what}</span></div>`;
    }).join('');
  }

  function showMenu() {
    state = 'menu';
    game = R.newGame({ seed: 1 });                  // a still maze behind the card
    Shell.readouts([{ label: 'Best', value: Scores.label('muncher') }]);
    Shell.status('', '');
    Shell.startCard({
      blurb: 'Four ghosts, four different minds hunting you.',
      extra: ghostLegend() +
        `<div class="rowBetween" style="margin-top:8px"><span>Your best</span><b style="color:var(--text)">${Scores.label('muncher')}</b></div>`,
      buttons: [{ label: 'Play', act: 'start', primary: true }]
    });
  }

  Shell.on({
    start: () => start(),
    menu: () => showMenu()
  });

  window.addEventListener('keydown', (e) => {
    if (Shell.isOpen() && (e.code === 'Space' || e.code === 'Enter') && (state === 'menu' || state === 'over')) start();
    if (e.code === 'KeyR' && state === 'play' && !Shell.isOpen()) start();
  });

  /* ---------- input ---------- */

  function dirName(d) {
    if (d.dx > 0) return 'right';
    if (d.dx < 0) return 'left';
    if (d.dy > 0) return 'down';
    if (d.dy < 0) return 'up';
    return null;
  }

  function readInput() {
    // Player one's arrows, player two's WASD and the touch pad all steer the
    // one muncher. Whatever was pressed most recently wins.
    let d = Input.dirFor(0);
    if (!d.dx && !d.dy) d = Input.dirFor(1);
    if (!d.dx && !d.dy) d = Touch.dir;
    const name = dirName(d);
    if (name) R.setWant(game, name);
  }

  Touch.mount(Shell.els.touchpad, { dpad: true });
  Touch.swipe(Shell.els.stageWrap, (dir) => {
    if (state === 'play' && game) R.setWant(game, dir);
  });

  /* ---------- update ---------- */

  function update(dt) {
    for (const p of popups) p.t -= dt;
    popups = popups.filter((p) => p.t > 0);
    if (state !== 'play' || !game) return;

    readInput();
    if (game.phase === 'play' && game.player.moving && game.freezeT <= 0) mouthT += dt * 14;

    const events = R.update(game, dt);
    for (const e of events) onEvent(e);

    if (game.score !== lastScore || game.lives !== lastLives || game.level !== lastLevel) updateHud();
  }

  function onEvent(e) {
    switch (e.type) {
      case 'pellet': Snd.waka(); break;
      case 'power': Snd.power(); break;
      case 'ghost':
        Snd.ghost();
        popups.push({ x: e.x * TILE, y: e.y * TILE, text: String(e.points), t: 0.9, life: 0.9, colour: '#9fd8ff' });
        break;
      case 'fruitEaten':
        Snd.fruit();
        popups.push({ x: e.x * TILE, y: e.y * TILE, text: String(e.points), t: 1.2, life: 1.2, colour: '#ffd9a8' });
        break;
      case 'die': Snd.die(); break;
      case 'clear': Snd.clear(); break;
      case 'level': Shell.banner('Level ' + e.level); break;
      case 'extraLife': Snd.extra(); Shell.banner('Extra life'); break;
      case 'mode': Snd.mode(); break;
      case 'go': if (game.level > 1 || game.lives < 3) Snd.go(); break;
      case 'over': gameOver(); break;
    }
  }

  function updateHud() {
    lastScore = game.score; lastLives = game.lives; lastLevel = game.level;
    Shell.readouts([
      { label: 'Score', value: game.score, accent: true },
      { label: 'Level', value: game.level },
      { label: 'Lives', value: Math.max(0, game.lives - 1) },
      { label: 'Best', value: Scores.label('muncher') }
    ]);
    Shell.status(game.score, 'Level ' + game.level);
  }

  /* ---------- the maze, drawn once ---------- */

  function isWallTile(x, y) {
    if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return true;
    return R.MAP[y][x] === '#';
  }

  /** Render the walls to an offscreen canvas. Wall blocks are filled flat and
      every face that looks onto a corridor gets a glowing edge line. Ends of
      each line are pulled in at convex corners and pushed out at concave ones
      so neighbouring faces meet cleanly instead of leaving notches. */
  function buildMaze(edgeColour) {
    const c = document.createElement('canvas');
    c.width = W; c.height = STRIP_Y;
    const g = c.getContext('2d');
    const e = TILE * 0.22;

    g.fillStyle = COL.wallFill;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) if (isWallTile(x, y)) g.fillRect(x * TILE, y * TILE, TILE, TILE);
    }

    // Outward normal and one tangent for each side of a wall tile.
    const sides = [
      { nx: 0, ny: -1, tx: 1, ty: 0 },
      { nx: 1, ny: 0, tx: 0, ty: 1 },
      { nx: 0, ny: 1, tx: 1, ty: 0 },
      { nx: -1, ny: 0, tx: 0, ty: 1 }
    ];
    const segs = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!isWallTile(x, y)) continue;
        const cx = (x + 0.5) * TILE, cy = (y + 0.5) * TILE;
        for (const s of sides) {
          if (isWallTile(x + s.nx, y + s.ny)) continue;          // this face is buried
          const bx = cx + s.nx * (TILE / 2 - e), by = cy + s.ny * (TILE / 2 - e);
          const ext = (sign) => {
            const n = isWallTile(x + s.tx * sign, y + s.ty * sign);
            if (!n) return -e;                                    // convex corner: stop short
            const d = isWallTile(x + s.tx * sign + s.nx, y + s.ty * sign + s.ny);
            return d ? e : 0;                                     // concave: push out, straight: exact
          };
          const a = TILE / 2 + ext(1), b = TILE / 2 + ext(-1);
          segs.push([bx - s.tx * b, by - s.ty * b, bx + s.tx * a, by + s.ty * a]);
        }
      }
    }
    g.lineCap = 'round';
    g.strokeStyle = edgeColour;
    g.beginPath();
    for (const s of segs) { g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); }
    g.lineWidth = 7; g.globalAlpha = 0.16; g.stroke();
    g.lineWidth = 2.4; g.globalAlpha = 1; g.stroke();

    // The house door: a soft bar the ghosts pass through.
    g.fillStyle = COL.door;
    g.fillRect(13 * TILE, 12 * TILE + TILE * 0.38, 2 * TILE, TILE * 0.24);
    return c;
  }

  /* ---------- drawing ---------- */

  function draw() {
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, W, H);
    if (!game) return;
    if (!mazeNormal) { mazeNormal = buildMaze(COL.wallEdge); mazeFlash = buildMaze(COL.wallFlash); }

    const flashing = game.phase === 'clear' && Math.floor(game.phaseT * 4) % 2 === 0;
    ctx.drawImage(flashing ? mazeFlash : mazeNormal, 0, 0);

    drawPellets();
    if (game.fruit) drawFruit(game.fruit.kind, game.fruit.x * TILE, game.fruit.y * TILE, TILE * 0.42);
    if (game.phase !== 'clear') {
      drawPlayer();
      if (game.phase !== 'dying') for (const g of game.ghosts) drawGhostWrapped(g);
    }
    drawPopups();
    drawStrip();
    if (game.phase === 'ready') centreText(state === 'menu' ? '' : 'READY', COL.player);
    if (game.phase === 'over') centreText('GAME OVER', '#ff5470');
  }

  function centreText(text, colour) {
    if (!text) return;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colour;
    ctx.fillText(text, R.FRUIT_SPOT.x * TILE, R.FRUIT_SPOT.y * TILE + 1);
  }

  function drawPellets() {
    const pulse = 0.78 + 0.22 * Math.sin(performance.now() / 160);
    ctx.fillStyle = COL.pellet;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = game.tiles[y * COLS + x];
        if (c === '.') {
          ctx.fillRect(x * TILE + TILE / 2 - 2.5, y * TILE + TILE / 2 - 2.5, 5, 5);
        } else if (c === 'o') {
          ctx.beginPath();
          ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE * 0.3 * pulse, 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  function dirAngle(e) {
    if (e.dx > 0) return 0;
    if (e.dy > 0) return Math.PI / 2;
    if (e.dx < 0) return Math.PI;
    return -Math.PI / 2;
  }

  function drawPlayer() {
    const p = game.player;
    const px = p.x * TILE, py = p.y * TILE;
    drawMuncher(px, py);
    if (p.x < 1) drawMuncher(px + W, py);
    if (p.x > COLS - 1) drawMuncher(px - W, py);
  }

  /** The muncher: a lime disc with a chomping mouth and one keen eye. While
      dying the mouth opens all the way round and the body shrinks to nothing. */
  function drawMuncher(px, py) {
    const p = game.player;
    let r = TILE * 0.46;
    let open;                                    // half angle of the mouth
    if (game.phase === 'dying') {
      const t = 1 - game.phaseT / 2.0;
      if (t < 0.7) open = 0.25 + (t / 0.7) * (Math.PI - 0.25);
      else { open = Math.PI; r *= Math.max(0, 1 - (t - 0.7) / 0.3); }
    } else if (game.phase === 'ready' || !p.moving) {
      open = 0.22;
    } else {
      open = 0.06 + 0.58 * Math.abs(Math.sin(mouthT));
    }
    if (r <= 0.5) return;
    const a = dirAngle(p);
    ctx.fillStyle = COL.player;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, r, a + open, a + TAU - open);
    ctx.closePath();
    ctx.fill();
    if (open < Math.PI - 0.1) {
      // The eye sits above the mouth, on the side the muncher is facing.
      const ex = px + Math.cos(a - Math.PI / 2) * r * 0.45 + Math.cos(a) * r * 0.15;
      const ey = py + Math.sin(a - Math.PI / 2) * r * 0.45 + Math.sin(a) * r * 0.15;
      ctx.fillStyle = COL.playerDark;
      ctx.beginPath(); ctx.arc(ex, ey, r * 0.13, 0, TAU); ctx.fill();
    }
  }

  function drawGhostWrapped(g) {
    const px = g.x * TILE, py = g.y * TILE;
    drawGhost(g, px, py);
    if (g.x < 1) drawGhost(g, px + W, py);
    if (g.x > COLS - 1) drawGhost(g, px - W, py);
  }

  /** A ghost: a domed jelly with two feet that paddle as it moves, a crest
      that tells the four apart, and eyes that look where it is going. */
  function drawGhost(g, px, py) {
    const w = TILE * 0.88, h = TILE * 0.9;
    const x0 = px - w / 2, y0 = py - h / 2;
    const fr = game.fright;
    const flash = g.mode === 'fright' && fr.on && fr.t < game.spec.flashTime && Math.floor(fr.t * 4) % 2 === 1;
    const t = performance.now() / 1000;

    if (g.mode !== 'eyes') {
      const body = g.mode === 'fright' ? (flash ? COL.frightFlash : COL.fright) : g.colour;
      const paddle = Math.sin(t * 16 + g.id) * TILE * 0.06;
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + h * 0.45);
      ctx.arc(px, y0 + w / 2, w / 2, Math.PI, 0);                     // the dome
      ctx.lineTo(x0 + w, y0 + h * 0.78);
      // Two feet, one forward and one back, so the ghost seems to walk.
      ctx.arc(x0 + w * 0.75, y0 + h * 0.78 + paddle, w * 0.25, 0, Math.PI);
      ctx.arc(x0 + w * 0.25, y0 + h * 0.78 - paddle, w * 0.25, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

      if (g.mode !== 'fright') drawCrest(g, px, y0, w);
    }

    // Eyes: whites with pupils pushed toward the direction of travel.
    const ex = w * 0.2, ey = y0 + h * 0.4;
    if (g.mode === 'fright') {
      ctx.fillStyle = flash ? '#ff5470' : '#dfe6ff';
      ctx.beginPath();
      ctx.arc(px - ex, ey, w * 0.07, 0, TAU);
      ctx.arc(px + ex, ey, w * 0.07, 0, TAU);
      ctx.fill();
      // A worried zigzag mouth.
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const my = y0 + h * 0.66;
      for (let i = 0; i <= 6; i++) ctx.lineTo(x0 + w * 0.2 + (w * 0.6 / 6) * i, my + (i % 2 ? -2.2 : 2.2));
      ctx.stroke();
      return;
    }
    const lx = g.dx * w * 0.08, ly = g.dy * w * 0.08;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(px - ex + lx, ey + ly, w * 0.13, w * 0.16, 0, 0, TAU);
    ctx.ellipse(px + ex + lx, ey + ly, w * 0.13, w * 0.16, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b2350';
    ctx.beginPath();
    ctx.arc(px - ex + lx * 2, ey + ly * 2, w * 0.07, 0, TAU);
    ctx.arc(px + ex + lx * 2, ey + ly * 2, w * 0.07, 0, TAU);
    ctx.fill();
  }

  /** Each ghost wears something different on top so they read at a glance. */
  function drawCrest(g, px, top, w) {
    ctx.strokeStyle = g.colour;
    ctx.fillStyle = g.colour;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    switch (g.mind) {
      case 'chaser':                                   // two flame licks
        ctx.moveTo(px - w * 0.18, top + 2); ctx.lineTo(px - w * 0.1, top - w * 0.2);
        ctx.moveTo(px + w * 0.12, top + 2); ctx.lineTo(px + w * 0.22, top - w * 0.16);
        ctx.stroke();
        break;
      case 'ambusher':                                 // a single curl
        ctx.arc(px + w * 0.05, top - w * 0.08, w * 0.12, Math.PI * 0.9, Math.PI * 2.1);
        ctx.stroke();
        break;
      case 'flanker':                                  // two antennae with dots
        ctx.moveTo(px - w * 0.15, top + 2); ctx.lineTo(px - w * 0.28, top - w * 0.18);
        ctx.moveTo(px + w * 0.15, top + 2); ctx.lineTo(px + w * 0.28, top - w * 0.18);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px - w * 0.28, top - w * 0.2, 2, 0, TAU);
        ctx.arc(px + w * 0.28, top - w * 0.2, 2, 0, TAU);
        ctx.fill();
        break;
      case 'nervous':                                  // a nervous tuft
        for (let i = -1; i <= 1; i++) { ctx.moveTo(px + i * w * 0.1, top + 2); ctx.lineTo(px + i * w * 0.16, top - w * 0.14); }
        ctx.stroke();
        break;
    }
  }

  /** Fruit and prizes, each a couple of paths. */
  function drawFruit(kind, px, py, r) {
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    switch (kind) {
      case 'cherry':
        ctx.strokeStyle = '#4ad46f';
        ctx.beginPath(); ctx.moveTo(px - r * 0.35, py + r * 0.2); ctx.quadraticCurveTo(px, py - r * 1.1, px + r * 0.5, py - r * 0.9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px + r * 0.4, py + r * 0.3); ctx.quadraticCurveTo(px + r * 0.4, py - r * 0.6, px + r * 0.5, py - r * 0.9); ctx.stroke();
        ctx.fillStyle = '#ff3b4e';
        ctx.beginPath(); ctx.arc(px - r * 0.35, py + r * 0.35, r * 0.42, 0, TAU); ctx.arc(px + r * 0.4, py + r * 0.45, r * 0.42, 0, TAU); ctx.fill();
        break;
      case 'berry':
        ctx.fillStyle = '#ff5470';
        ctx.beginPath(); ctx.moveTo(px - r * 0.8, py - r * 0.3); ctx.quadraticCurveTo(px, py + r * 1.3, px + r * 0.8, py - r * 0.3); ctx.quadraticCurveTo(px, py - r * 0.9, px - r * 0.8, py - r * 0.3); ctx.fill();
        ctx.fillStyle = '#4ad46f';
        ctx.beginPath(); ctx.ellipse(px, py - r * 0.6, r * 0.5, r * 0.22, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd9a8';
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(px + Math.cos(i * 1.7) * r * 0.35, py + r * 0.1 + Math.sin(i * 1.7) * r * 0.35, 1.3, 0, TAU); ctx.fill(); }
        break;
      case 'lemon':
        ctx.fillStyle = '#ffe14d';
        ctx.beginPath(); ctx.ellipse(px, py, r * 0.95, r * 0.65, -0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4ad46f';
        ctx.beginPath(); ctx.ellipse(px + r * 0.5, py - r * 0.6, r * 0.3, r * 0.14, -0.6, 0, TAU); ctx.fill();
        break;
      case 'apple':
        ctx.fillStyle = '#ff3b4e';
        ctx.beginPath(); ctx.arc(px - r * 0.3, py + r * 0.1, r * 0.62, 0, TAU); ctx.arc(px + r * 0.3, py + r * 0.1, r * 0.62, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#8b5a2b';
        ctx.beginPath(); ctx.moveTo(px, py - r * 0.4); ctx.lineTo(px + r * 0.1, py - r * 1.0); ctx.stroke();
        ctx.fillStyle = '#4ad46f';
        ctx.beginPath(); ctx.ellipse(px + r * 0.4, py - r * 0.7, r * 0.32, r * 0.14, -0.5, 0, TAU); ctx.fill();
        break;
      case 'melon':
        ctx.fillStyle = '#4ad46f';
        ctx.beginPath(); ctx.arc(px, py, r * 0.9, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#1d9142';
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(px + i * r * 0.4, py - r * 0.8); ctx.quadraticCurveTo(px + i * r * 0.6, py, px + i * r * 0.4, py + r * 0.8); ctx.stroke(); }
        break;
      case 'star':
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 ? r * 0.45 : r;
          const a = -Math.PI / 2 + i * Math.PI / 5;
          ctx.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill();
        break;
      case 'gem':
        ctx.fillStyle = '#4da3ff';
        ctx.beginPath(); ctx.moveTo(px, py - r); ctx.lineTo(px + r * 0.8, py - r * 0.2); ctx.lineTo(px, py + r); ctx.lineTo(px - r * 0.8, py - r * 0.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#a5d2ff';
        ctx.beginPath(); ctx.moveTo(px, py - r); ctx.lineTo(px + r * 0.8, py - r * 0.2); ctx.lineTo(px - r * 0.8, py - r * 0.2); ctx.closePath(); ctx.fill();
        break;
      case 'crown':
        ctx.fillStyle = '#ffb02e';
        ctx.beginPath();
        ctx.moveTo(px - r, py + r * 0.6); ctx.lineTo(px - r, py - r * 0.5); ctx.lineTo(px - r * 0.5, py);
        ctx.lineTo(px, py - r); ctx.lineTo(px + r * 0.5, py); ctx.lineTo(px + r, py - r * 0.5); ctx.lineTo(px + r, py + r * 0.6);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff5470';
        ctx.beginPath(); ctx.arc(px, py + r * 0.25, r * 0.18, 0, TAU); ctx.fill();
        break;
    }
  }

  function drawPopups() {
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of popups) {
      ctx.globalAlpha = Math.min(1, p.t / p.life * 2);
      ctx.fillStyle = p.colour;
      ctx.fillText(p.text, p.x, p.y - (1 - p.t / p.life) * 10);
    }
    ctx.globalAlpha = 1;
  }

  /** Under the maze: a muncher per spare life and the fruit of levels passed. */
  function drawStrip() {
    const y = STRIP_Y + TILE / 2;
    const spare = Math.max(0, game.lives - 1);
    ctx.fillStyle = COL.player;
    for (let i = 0; i < spare; i++) {
      const x = TILE * (1 + i * 0.9);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, TILE * 0.32, 0.5, TAU - 0.5);
      ctx.closePath();
      ctx.fill();
    }
    const hist = game.fruitHistory;
    for (let i = 0; i < hist.length; i++) {
      drawFruit(hist[i], W - TILE * (1 + (hist.length - 1 - i) * 1.1), y, TILE * 0.3);
    }
  }

  /* ---------- boot ---------- */

  Loop.start(update, draw, { pauseOnHide: false });   // Shell handles tab-hide pausing
  showMenu();

  window.EasyMuncher = {
    get state() { return state; },
    game: () => game,
    rules: R,
    start,
    setWant: (dir) => game && R.setWant(game, dir),
    step: (dt) => game && R.update(game, dt == null ? R.TICK : dt),
    popups: () => popups
  };
})();
