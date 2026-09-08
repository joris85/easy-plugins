'use strict';

/* CPU bombers. Everything runs off a danger map (which tiles are about to be on
   fire, and in how many milliseconds) plus breadth first search over the grid.
   A bot only drops a bomb when it can prove an escape route exists. */

const Bot = {
  LEVELS: {
    easy:   { interval: 330, aggression: 0.30, panic: 0.72, greed: 0.55 },
    normal: { interval: 165, aggression: 0.62, panic: 0.96, greed: 0.85 },
    hard:   { interval: 85,  aggression: 0.92, panic: 1.00, greed: 1.00 }
  },

  update(p, game, dt) {
    const lv = this.LEVELS[p.botLevel] || this.LEVELS.normal;
    p.bot.t -= dt * 1000;
    if (p.bot.t <= 0) {
      p.bot.t = lv.interval * (0.85 + Math.random() * 0.3);
      this.think(p, game, lv);
    }
  },

  dangerMap(game) {
    const a = game.arena;
    const n = a.cols * a.rows;
    const d = new Float64Array(n);
    d.fill(Infinity);
    for (const b of a.bombs) {
      const t = b.remote ? 1200 : b.fuse;
      for (const c of a.blastCells(b)) {
        const i = a.idx(c.x, c.y);
        if (t < d[i]) d[i] = t;
      }
    }
    const now = performance.now();
    for (let i = 0; i < n; i++) if (a.flameUntil[i] > now) d[i] = 0;
    return d;
  },

  bfs(a, sx, sy, blockedFn) {
    const n = a.cols * a.rows;
    const dist = new Int32Array(n).fill(-1);
    const prev = new Int32Array(n).fill(-1);
    const start = a.idx(sx, sy);
    const q = [start];
    dist[start] = 0;
    for (let h = 0; h < q.length; h++) {
      const cur = q[h];
      const cx = cur % a.cols;
      const cy = (cur - cx) / a.cols;
      for (const dir of DIRS) {
        const nx = cx + dir.dx, ny = cy + dir.dy;
        if (!a.inBounds(nx, ny)) continue;
        const ni = a.idx(nx, ny);
        if (dist[ni] !== -1) continue;
        if (blockedFn(nx, ny)) continue;
        dist[ni] = dist[cur] + 1;
        prev[ni] = cur;
        q.push(ni);
      }
    }
    return { dist, prev, start };
  },

  /** Direction of the first move along the path from start to goal. */
  firstStep(a, prev, start, goal) {
    if (goal === start || goal < 0) return { dx: 0, dy: 0 };
    let cur = goal;
    let guard = 0;
    while (prev[cur] !== -1 && prev[cur] !== start && guard++ < 4096) cur = prev[cur];
    if (prev[cur] !== start) return { dx: 0, dy: 0 };
    const sx = start % a.cols, sy = (start - sx) / a.cols;
    const cx = cur % a.cols, cy = (cur - cx) / a.cols;
    return { dx: Math.sign(cx - sx), dy: Math.sign(cy - sy) };
  },

  blockedBasic(a, p) {
    return (x, y) => {
      if (a.tileAt(x, y) !== TT.EMPTY) return true;
      const b = a.bombAt(x, y);
      return !!(b && !b.pass.has(p.id));
    };
  },

  think(p, game, lv) {
    const a = game.arena;
    const danger = this.dangerMap(game);
    const sx = p.tx, sy = p.ty;
    const start = a.idx(sx, sy);
    const msPerTile = 1000 * CFG.TILE / p.speed();

    p.intent.bomb = false;
    p.intent.boom = false;

    const basic = this.blockedBasic(a, p);
    const cautious = (x, y) => basic(x, y) || danger[a.idx(x, y)] < 520;

    // Detonate a remote bomb if it catches somebody else and not us.
    if (p.remote) {
      for (const b of a.bombs) {
        if (b.owner !== p.id || !b.remote) continue;
        const cells = a.blastCells(b);
        let hitsEnemy = false, hitsSelf = false;
        for (const c of cells) {
          for (const q of game.players) {
            if (!q.alive) continue;
            if (q.tx === c.x && q.ty === c.y) {
              if (q.id === p.id) hitsSelf = true; else hitsEnemy = true;
            }
          }
        }
        if (hitsEnemy && !hitsSelf) { p.intent.boom = true; break; }
      }
    }

    // 1. Standing somewhere that is about to burn: get out.
    if (danger[start] < Infinity && Math.random() < lv.panic) {
      const safe = this.bfs(a, sx, sy, cautious);
      let goal = -1, goalDist = 1e9;
      for (let i = 0; i < safe.dist.length; i++) {
        if (safe.dist[i] < 0) continue;
        if (danger[i] === Infinity && safe.dist[i] < goalDist) { goalDist = safe.dist[i]; goal = i; }
      }
      if (goal === -1) {
        // Nothing fully safe is reachable. Head for whatever burns last.
        const loose = this.bfs(a, sx, sy, basic);
        let bestScore = -Infinity;
        for (let i = 0; i < loose.dist.length; i++) {
          if (loose.dist[i] < 0) continue;
          const score = Math.min(danger[i], 9999) - loose.dist[i] * msPerTile;
          if (score > bestScore) { bestScore = score; goal = i; }
        }
        this.setStep(p, this.firstStep(a, loose.prev, loose.start, goal));
      } else {
        this.setStep(p, this.firstStep(a, safe.prev, safe.start, goal));
      }
      return;
    }

    // 2. Worth dropping a bomb right here?
    const enemyClose = this.enemyInBlastLine(a, game, p, sx, sy);
    const softNear = this.softAdjacent(a, sx, sy);
    const wantBomb = (enemyClose && Math.random() < lv.aggression) ||
                     (softNear && Math.random() < lv.greed);

    if (wantBomb && p.bombsActive < p.maxBombs && !a.bombAt(sx, sy) &&
        this.escapeExists(p, a, danger, sx, sy)) {
      p.intent.bomb = true;
      p.intent.dx = 0; p.intent.dy = 0;
      return;
    }

    // 3. Go somewhere useful: items first, then blocks to farm, then opponents.
    const walk = this.bfs(a, sx, sy, cautious);
    let goal = -1, bestScore = -Infinity;

    for (const [i, it] of a.items) {
      if (!it.revealed || it.type === ITEM.SKULL) continue;
      if (walk.dist[i] < 0) continue;
      const score = 300 - walk.dist[i] * 10;
      if (score > bestScore) { bestScore = score; goal = i; }
    }

    if (goal === -1) {
      for (let i = 0; i < walk.dist.length; i++) {
        if (walk.dist[i] < 0) continue;
        const x = i % a.cols, y = (i - x) / a.cols;
        if (!this.softAdjacent(a, x, y)) continue;
        const score = 150 - walk.dist[i] * 10;
        if (score > bestScore) { bestScore = score; goal = i; }
      }
    }

    if (goal === -1) {
      for (const q of game.players) {
        if (!q.alive || q.id === p.id) continue;
        const qi = a.idx(q.tx, q.ty);
        if (walk.dist[qi] < 0) continue;
        const score = 100 - walk.dist[qi] * 10;
        if (score > bestScore) { bestScore = score; goal = qi; }
      }
    }

    if (goal === -1) {
      // Nothing reachable, shuffle around so we are not a sitting target.
      const opts = [];
      for (let i = 0; i < walk.dist.length; i++) if (walk.dist[i] > 0 && walk.dist[i] < 6) opts.push(i);
      goal = opts.length ? pick(opts) : -1;
    }

    if (goal === -1) { this.setStep(p, { dx: 0, dy: 0 }); return; }
    this.setStep(p, this.firstStep(a, walk.prev, walk.start, goal));
  },

  setStep(p, step) {
    p.intent.dx = step.dx;
    p.intent.dy = step.dy;
    // Never both axes at once, the player only walks in four directions.
    if (p.intent.dx !== 0) p.intent.dy = 0;
  },

  enemyInBlastLine(a, game, p, sx, sy) {
    const radius = p.disease === DISEASE.LOWPOWER ? 1 : p.fire;
    for (const q of game.players) {
      if (!q.alive || q.id === p.id) continue;
      if (q.tx === sx && q.ty === sy) return true;
    }
    for (const dir of DIRS) {
      for (let i = 1; i <= radius; i++) {
        const x = sx + dir.dx * i, y = sy + dir.dy * i;
        const t = a.tileAt(x, y);
        if (t !== TT.EMPTY) break;
        for (const q of game.players) {
          if (!q.alive || q.id === p.id) continue;
          if (q.tx === x && q.ty === y) return true;
        }
      }
    }
    return false;
  },

  softAdjacent(a, x, y) {
    for (const d of DIRS) if (a.tileAt(x + d.dx, y + d.dy) === TT.SOFT) return true;
    return false;
  },

  /** Would a bomb dropped here still leave a reachable safe tile before it blows? */
  escapeExists(p, a, danger, sx, sy) {
    const radius = p.disease === DISEASE.LOWPOWER ? 1 : p.fire;
    const fake = { x: sx, y: sy, radius, pierce: p.pierce };
    const inBlast = new Set(a.blastCells(fake).map((c) => a.idx(c.x, c.y)));

    const fuse = p.disease === DISEASE.SHORTFUSE ? CFG.FUSE_SHORT : CFG.BOMB_FUSE;
    const msPerTile = 1000 * CFG.TILE / p.speed();
    const maxSteps = Math.floor((fuse - 260) / msPerTile);
    if (maxSteps < 1) return false;

    const { dist } = this.bfs(a, sx, sy, (x, y) => {
      if (a.tileAt(x, y) !== TT.EMPTY) return true;
      const b = a.bombAt(x, y);
      if (b && !b.pass.has(p.id)) return true;
      return danger[a.idx(x, y)] < 900;
    });

    for (let i = 0; i < dist.length; i++) {
      if (dist[i] > 0 && dist[i] <= maxSteps && !inBlast.has(i) && danger[i] === Infinity) return true;
    }
    return false;
  }
};
