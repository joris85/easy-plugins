'use strict';

/* The grid, the soft blocks, the hidden items, the bombs, the flames,
   the debris particles and the sudden death pressure blocks. */

class Arena {
  constructor() {
    this.game = null;              // set by Game, needed to credit bombs back to owners
    this.cols = CFG.COLS;
    this.rows = CFG.ROWS;
    this.grid = new Uint8Array(this.cols * this.rows);
    this.items = new Map();          // index -> { type, revealed, shieldUntil, bob }
    this.bombs = [];
    this.flames = [];                // visual cells
    this.flameUntil = new Float64Array(this.cols * this.rows);
    this.particles = [];
    this.falling = [];               // pressure blocks in mid air
    this.spiral = [];
    this.spiralIndex = 0;
    this.sdTimer = 0;
    this.suddenDeath = false;
    this.shake = 0;
  }

  idx(x, y) { return y * this.cols + x; }

  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.cols && y < this.rows; }

  tileAt(x, y) { return this.inBounds(x, y) ? this.grid[this.idx(x, y)] : TT.HARD; }

  isBlock(x, y) { return this.tileAt(x, y) !== TT.EMPTY; }

  /* ---------- generation ---------- */

  generate(activeSpawns) {
    this.grid.fill(TT.EMPTY);
    this.items.clear();
    this.bombs.length = 0;
    this.flames.length = 0;
    this.flameUntil.fill(0);
    this.particles.length = 0;
    this.falling.length = 0;
    this.spiralIndex = 0;
    this.sdTimer = 0;
    this.suddenDeath = false;
    this.shake = 0;

    // Border plus the classic pillar lattice on even coordinates.
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const border = x === 0 || y === 0 || x === this.cols - 1 || y === this.rows - 1;
        if (border || (x % 2 === 0 && y % 2 === 0)) this.grid[this.idx(x, y)] = TT.HARD;
      }
    }

    // Keep an L shaped pocket free at every spawn corner so nobody starts boxed in.
    const keepFree = new Set();
    for (const s of activeSpawns) {
      keepFree.add(this.idx(s.x, s.y));
      for (const d of DIRS) {
        const x = s.x + d.dx, y = s.y + d.dy;
        if (this.tileAt(x, y) === TT.EMPTY) {
          keepFree.add(this.idx(x, y));
          const x2 = s.x + d.dx * 2, y2 = s.y + d.dy * 2;
          if (this.tileAt(x2, y2) === TT.EMPTY) keepFree.add(this.idx(x2, y2));
        }
      }
    }

    const softCells = [];
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        const i = this.idx(x, y);
        if (this.grid[i] !== TT.EMPTY || keepFree.has(i)) continue;
        if (Math.random() < CFG.SOFT_DENSITY) {
          this.grid[i] = TT.SOFT;
          softCells.push(i);
        }
      }
    }

    // Hide items under a random selection of the soft blocks.
    shuffle(softCells);
    let cursor = 0;
    for (const type in CFG.ITEM_COUNTS) {
      let n = CFG.ITEM_COUNTS[type];
      while (n-- > 0 && cursor < softCells.length) {
        this.items.set(softCells[cursor++], { type, revealed: false, shieldUntil: 0, bob: Math.random() * 6.28 });
      }
    }

    this.buildSpiral();
  }

  buildSpiral() {
    this.spiral = [];
    const rings = Math.ceil(Math.min(this.cols - 2, this.rows - 2) / 2);
    for (let r = 0; r < rings; r++) {
      const x0 = 1 + r, x1 = this.cols - 2 - r;
      const y0 = 1 + r, y1 = this.rows - 2 - r;
      if (x0 > x1 || y0 > y1) break;
      for (let x = x0; x <= x1; x++) this.spiral.push([x, y0]);
      for (let y = y0 + 1; y <= y1; y++) this.spiral.push([x1, y]);
      if (y1 > y0) for (let x = x1 - 1; x >= x0; x--) this.spiral.push([x, y1]);
      if (x1 > x0) for (let y = y1 - 1; y > y0; y--) this.spiral.push([x0, y]);
    }
  }

  /* ---------- queries ---------- */

  bombAt(x, y) {
    for (const b of this.bombs) if (b.x === x && b.y === y) return b;
    return null;
  }

  itemAt(x, y) {
    const it = this.items.get(this.idx(x, y));
    return it && it.revealed ? it : null;
  }

  flameAt(x, y) {
    if (!this.inBounds(x, y)) return false;
    return this.flameUntil[this.idx(x, y)] > performance.now();
  }

  /** Solid from the point of view of a given player id (bombs can be walked off). */
  solidFor(pid, x, y) {
    if (!this.inBounds(x, y)) return true;
    if (this.grid[this.idx(x, y)] !== TT.EMPTY) return true;
    const b = this.bombAt(x, y);
    if (b && !b.pass.has(pid)) return true;
    return false;
  }

  /** Solid for a bomb sliding across the floor. */
  solidForBomb(x, y, self) {
    if (!this.inBounds(x, y)) return true;
    if (this.grid[this.idx(x, y)] !== TT.EMPTY) return true;
    const b = this.bombAt(x, y);
    if (b && b !== self) return true;
    return false;
  }

  /* ---------- bombs ---------- */

  placeBomb(p, players) {
    if (p.disease === DISEASE.NOBOMB) return false;
    if (p.bombsActive >= p.maxBombs) return false;
    const x = tileOf(p.px), y = tileOf(p.py);
    if (this.isBlock(x, y) || this.bombAt(x, y)) return false;

    const bomb = {
      x, y,
      px: centerOf(x), py: centerOf(y),
      owner: p.id,
      fuse: p.disease === DISEASE.SHORTFUSE ? CFG.FUSE_SHORT : CFG.BOMB_FUSE,
      radius: p.disease === DISEASE.LOWPOWER ? 1 : p.fire,
      pierce: p.pierce,
      remote: p.remote,
      born: performance.now(),
      vel: null,
      target: null,
      pass: new Set()
    };

    // Anyone standing on the tile right now may step off before it becomes solid.
    for (const q of players) {
      if (q.alive && this.overlapsTile(q, x, y)) bomb.pass.add(q.id);
    }

    this.bombs.push(bomb);
    p.bombsActive++;
    Sfx.place();
    return true;
  }

  overlapsTile(p, x, y) {
    const h = CFG.TILE * CFG.PLAYER_HALF;
    const tx0 = x * CFG.TILE, ty0 = y * CFG.TILE;
    return p.px + h > tx0 && p.px - h < tx0 + CFG.TILE &&
           p.py + h > ty0 && p.py - h < ty0 + CFG.TILE;
  }

  detonateRemote(p) {
    const mine = this.bombs.filter((b) => b.owner === p.id && b.remote);
    if (!mine.length) return;
    const seen = new Set();
    for (const b of mine) this.explode(b, seen);
  }

  kickBomb(bomb, dx, dy) {
    if (bomb.vel) return;
    const nx = bomb.x + dx, ny = bomb.y + dy;
    if (this.solidForBomb(nx, ny, bomb)) return;
    bomb.vel = { dx, dy };
    bomb.target = { x: nx, y: ny };
    Sfx.kick();
  }

  stopBomb(bomb) {
    bomb.vel = null;
    bomb.target = null;
    bomb.px = centerOf(bomb.x);
    bomb.py = centerOf(bomb.y);
  }

  /** The cells a bomb would set on fire right now, without changing anything. */
  blastCells(bomb) {
    const out = [{ x: bomb.x, y: bomb.y }];
    for (const d of DIRS) {
      for (let i = 1; i <= bomb.radius; i++) {
        const x = bomb.x + d.dx * i, y = bomb.y + d.dy * i;
        const t = this.tileAt(x, y);
        if (t === TT.HARD) break;
        out.push({ x, y });
        if (t === TT.SOFT && !bomb.pierce) break;
      }
    }
    return out;
  }

  explode(bomb, seen) {
    const i0 = this.bombs.indexOf(bomb);
    if (i0 === -1) return;                    // already gone this frame
    if (seen.has(bomb)) return;
    seen.add(bomb);
    this.bombs.splice(i0, 1);

    // Hand the bomb back so the owner can place another one.
    const owner = this.game && this.game.byId[bomb.owner];
    if (owner) owner.bombsActive = Math.max(0, owner.bombsActive - 1);

    const now = performance.now();
    const until = now + CFG.FLAME_MS;
    const touched = [];

    this.addFlame(bomb.x, bomb.y, 'center', null, until, touched);

    for (const d of DIRS) {
      for (let i = 1; i <= bomb.radius; i++) {
        const x = bomb.x + d.dx * i, y = bomb.y + d.dy * i;
        const t = this.tileAt(x, y);
        if (t === TT.HARD) break;

        if (t === TT.SOFT) {
          this.destroySoft(x, y, until);
          this.addFlame(x, y, 'end', d, until, touched);
          if (!bomb.pierce) break;
          continue;
        }
        const last = i === bomb.radius;
        this.addFlame(x, y, last ? 'end' : 'arm', d, until, touched);
      }
    }

    this.shake = Math.min(14, this.shake + 5 + bomb.radius);
    Sfx.boom();
    this.spawnBlastSparks(bomb.x, bomb.y);

    // Chain reactions, and burn any exposed items caught in the blast.
    for (const c of touched) {
      const other = this.bombAt(c.x, c.y);
      if (other) this.explode(other, seen);
      const it = this.items.get(this.idx(c.x, c.y));
      if (it && it.revealed && it.shieldUntil < now) {
        this.items.delete(this.idx(c.x, c.y));
        this.spawnDebris(c.x, c.y, '#ffd45e', 6);
      }
    }
    return bomb;
  }

  addFlame(x, y, kind, dir, until, touched) {
    if (!this.inBounds(x, y)) return;
    const i = this.idx(x, y);
    this.flameUntil[i] = Math.max(this.flameUntil[i], until);
    this.flames.push({ x, y, kind, dir, born: performance.now(), until });
    touched.push({ x, y });
  }

  destroySoft(x, y, blastUntil) {
    const i = this.idx(x, y);
    this.grid[i] = TT.EMPTY;
    this.spawnDebris(x, y, '#a9714a', 10);
    Sfx.brick();
    const it = this.items.get(i);
    if (it && !it.revealed) {
      it.revealed = true;
      it.shieldUntil = blastUntil + 30;   // the block shielded it from this blast
    }
  }

  /* ---------- particles ---------- */

  spawnDebris(tx, ty, color, n) {
    const cx = centerOf(tx), cy = centerOf(ty);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 150;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * CFG.TILE * 0.6,
        y: cy + (Math.random() - 0.5) * CFG.TILE * 0.6,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: 0.35 + Math.random() * 0.4, max: 0.75,
        size: 2 + Math.random() * 4, color, grav: 520
      });
    }
  }

  spawnBlastSparks(tx, ty) {
    const cx = centerOf(tx), cy = centerOf(ty);
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 90 + Math.random() * 240;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.2 + Math.random() * 0.3, max: 0.5,
        size: 2 + Math.random() * 3,
        color: Math.random() < 0.5 ? '#ffd45e' : '#ff8a2b', grav: 40
      });
    }
  }

  /* ---------- per frame ---------- */

  update(dt, game) {
    const now = performance.now();

    // Bombs: fuse, sliding. Walk a snapshot, because one bomb going off can
    // chain others out of this.bombs from anywhere in the list.
    const ticking = this.bombs.slice();
    for (const b of ticking) {
      if (this.bombs.indexOf(b) === -1) continue;      // already went off in a chain
      if (!b.remote) {
        b.fuse -= dt * 1000;
        if (b.fuse <= 0) { this.explode(b, new Set()); continue; }
      }
      if (b.vel) this.moveBomb(b, dt, game);
    }

    // Bombs stop being walkable once the player has stepped clear.
    for (const b of this.bombs) {
      if (!b.pass.size) continue;
      for (const pid of Array.from(b.pass)) {
        const p = game.byId[pid];
        if (!p || !p.alive || !this.overlapsTile(p, b.x, b.y)) b.pass.delete(pid);
      }
    }

    // Expire flame visuals.
    for (let i = this.flames.length - 1; i >= 0; i--) {
      if (this.flames[i].until <= now) this.flames.splice(i, 1);
    }

    // Particles.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Bobbing items.
    for (const it of this.items.values()) if (it.revealed) it.bob += dt * 4;

    // Pressure blocks.
    if (this.suddenDeath) this.updateSuddenDeath(dt, game);

    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      f.t += dt;
      if (f.t >= f.dur) {
        this.landBlock(f, game);
        this.falling.splice(i, 1);
      }
    }

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 40);
  }

  moveBomb(b, dt, game) {
    const step = CFG.KICK_SPEED * dt;
    const tx = centerOf(b.target.x), ty = centerOf(b.target.y);
    b.px = approach(b.px, tx, step);
    b.py = approach(b.py, ty, step);

    if (Math.abs(b.px - tx) < 0.5 && Math.abs(b.py - ty) < 0.5) {
      b.px = tx; b.py = ty;
      b.x = b.target.x; b.y = b.target.y;
      b.pass.clear();                          // it moved away from whoever placed it

      const nx = b.x + b.vel.dx, ny = b.y + b.vel.dy;
      if (this.solidForBomb(nx, ny, b) || this.playerBlocks(game, nx, ny)) {
        this.stopBomb(b);
      } else {
        b.target = { x: nx, y: ny };
      }
    }
  }

  playerBlocks(game, x, y) {
    for (const p of game.players) {
      if (p.alive && tileOf(p.px) === x && tileOf(p.py) === y) return true;
    }
    return false;
  }

  startSuddenDeath() {
    if (this.suddenDeath) return;
    this.suddenDeath = true;
    this.sdTimer = 0;
  }

  updateSuddenDeath(dt, game) {
    this.sdTimer += dt * 1000;
    while (this.sdTimer >= CFG.SD_INTERVAL && this.spiralIndex < this.spiral.length) {
      this.sdTimer -= CFG.SD_INTERVAL;
      const [x, y] = this.spiral[this.spiralIndex++];
      if (this.tileAt(x, y) === TT.HARD) continue;
      this.falling.push({ x, y, t: 0, dur: 0.28 });
    }
  }

  landBlock(f, game) {
    const i = this.idx(f.x, f.y);
    this.grid[i] = TT.HARD;
    this.items.delete(i);

    const b = this.bombAt(f.x, f.y);
    if (b) {
      const owner = game.byId[b.owner];
      if (owner) owner.bombsActive = Math.max(0, owner.bombsActive - 1);
      this.bombs.splice(this.bombs.indexOf(b), 1);
    }

    for (const p of game.players) {
      if (p.alive && tileOf(p.px) === f.x && tileOf(p.py) === f.y) game.killPlayer(p, 'crushed');
    }

    this.spawnDebris(f.x, f.y, '#6f7a90', 8);
    this.shake = Math.min(10, this.shake + 3);
    Sfx.crush();
  }
}
