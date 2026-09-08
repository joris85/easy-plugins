'use strict';

/* A bomber. Movement is pixel based but lane aligned, which is what makes the
   original feel right: you slide onto the centre of a lane as you walk. */

class Player {
  constructor(id, opts) {
    this.id = id;
    this.color = PALETTE[id];
    this.name = opts.name || ('P' + (id + 1));
    this.isBot = !!opts.isBot;
    this.botLevel = opts.botLevel || 'normal';
    this.wins = 0;
    this.intent = { dx: 0, dy: 0, bomb: false, boom: false };
    this.bot = { t: 0, path: null, goal: null, seed: Math.random() };
    this.resetForRound({ x: SPAWNS[id].x, y: SPAWNS[id].y });
  }

  resetForRound(spawn) {
    this.px = centerOf(spawn.x);
    this.py = centerOf(spawn.y);
    this.dir = spawn.y > CFG.ROWS / 2 ? 'up' : 'down';
    this.alive = true;
    this.maxBombs = 1;
    this.bombsActive = 0;
    this.fire = 1;
    this.speedLevel = 0;
    this.kick = false;
    this.remote = false;
    this.pierce = false;
    this.vest = false;
    this.disease = null;
    this.diseaseUntil = 0;
    this.lastTouch = 0;
    this.walkPhase = 0;
    this.moving = false;
    this.deathAt = 0;
    this.deathCause = null;
    this.intent = { dx: 0, dy: 0, bomb: false, boom: false };
    this.bot.t = 0;
    this.bot.goal = null;
  }

  get tx() { return tileOf(this.px); }
  get ty() { return tileOf(this.py); }

  speed() {
    if (this.disease === DISEASE.FAST) return CFG.SPEED_DISEASE_FAST;
    if (this.disease === DISEASE.SLOW) return CFG.SPEED_DISEASE_SLOW;
    return CFG.SPEED_BASE + this.speedLevel * CFG.SPEED_STEP;
  }

  freeAt(cx, cy, arena) {
    const h = CFG.TILE * CFG.PLAYER_HALF - 0.5;
    const x0 = tileOf(cx - h), x1 = tileOf(cx + h);
    const y0 = tileOf(cy - h), y1 = tileOf(cy + h);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (arena.solidFor(this.id, x, y)) return false;
      }
    }
    return true;
  }

  /** Ease the off-axis coordinate toward the centre of the lane. */
  alignAxis(axis, target, maxStep, arena) {
    const cur = axis === 'y' ? this.py : this.px;
    const delta = clamp(target - cur, -maxStep, maxStep);
    if (delta === 0) return;
    const sign = Math.sign(delta);
    let remaining = Math.abs(delta);
    while (remaining > 0.0001) {
      const s = Math.min(1, remaining);
      const nx = axis === 'x' ? this.px + sign * s : this.px;
      const ny = axis === 'y' ? this.py + sign * s : this.py;
      if (!this.freeAt(nx, ny, arena)) break;
      this.px = nx; this.py = ny;
      remaining -= s;
    }
  }

  /** Walk along one axis, one pixel at a time so we stop flush against walls. */
  stepAxis(dx, dy, dist, arena) {
    let remaining = dist;
    let moved = 0;
    while (remaining > 0.0001) {
      const s = Math.min(1, remaining);
      const nx = this.px + dx * s, ny = this.py + dy * s;
      if (!this.freeAt(nx, ny, arena)) {
        if (this.kick) {
          const h = CFG.TILE * CFG.PLAYER_HALF + 2;
          const b = arena.bombAt(tileOf(this.px + dx * h), tileOf(this.py + dy * h));
          if (b && !b.pass.has(this.id)) arena.kickBomb(b, dx, dy);
        }
        break;
      }
      this.px = nx; this.py = ny;
      remaining -= s;
      moved += s;
    }
    return moved;
  }

  update(dt, game) {
    if (!this.alive) return;
    const arena = game.arena;
    const now = performance.now();

    if (this.disease && now > this.diseaseUntil) this.disease = null;

    let dx = this.intent.dx, dy = this.intent.dy;
    if (this.disease === DISEASE.REVERSE) { dx = -dx; dy = -dy; }

    const dist = this.speed() * dt;
    let moved = 0;

    if (dx !== 0) {
      this.dir = dx > 0 ? 'right' : 'left';
      this.alignAxis('y', centerOf(this.ty), dist * 0.85, arena);
      moved = this.stepAxis(dx, 0, dist, arena);
    } else if (dy !== 0) {
      this.dir = dy > 0 ? 'down' : 'up';
      this.alignAxis('x', centerOf(this.tx), dist * 0.85, arena);
      moved = this.stepAxis(0, dy, dist, arena);
    }

    this.moving = moved > 0.01;
    if (this.moving) this.walkPhase += dt * 9;

    if (this.intent.bomb || this.disease === DISEASE.DIARRHEA) {
      arena.placeBomb(this, game.players);
    }
    if (this.intent.boom) arena.detonateRemote(this);

    // Pick up whatever is lying on this tile.
    const it = arena.itemAt(this.tx, this.ty);
    if (it) {
      arena.items.delete(arena.idx(this.tx, this.ty));
      this.collect(it.type);
    }
  }

  collect(type) {
    switch (type) {
      case ITEM.BOMB: this.maxBombs = Math.min(CFG.BOMB_MAX, this.maxBombs + 1); break;
      case ITEM.FIRE: this.fire = Math.min(CFG.FIRE_MAX, this.fire + 1); break;
      case ITEM.SPEED: this.speedLevel = Math.min(CFG.SPEED_MAX_LEVEL, this.speedLevel + 1); break;
      case ITEM.KICK: this.kick = true; break;
      case ITEM.REMOTE: this.remote = true; break;
      case ITEM.PIERCE: this.pierce = true; break;
      case ITEM.VEST: this.vest = true; break;
      case ITEM.SKULL: this.infect(pick(DISEASE_LIST)); Sfx.bad(); return;
    }
    Sfx.pickup();
  }

  infect(kind) {
    this.disease = kind;
    this.diseaseUntil = performance.now() + CFG.DISEASE_MS;
  }
}
