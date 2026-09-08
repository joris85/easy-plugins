'use strict';

/* Everything is drawn with canvas paths, so the game needs no image assets. */

const Render = {
  draw(ctx, game) {
    const T = CFG.TILE;
    const a = game.arena;
    const now = performance.now();

    ctx.save();
    if (a.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * a.shake, (Math.random() - 0.5) * a.shake);
    }

    this.drawFloor(ctx, a);

    // Items sit on the floor, blocks cover them until destroyed.
    for (const [i, it] of a.items) {
      if (!it.revealed) continue;
      const x = i % a.cols, y = (i - x) / a.cols;
      this.drawItem(ctx, x, y, it);
    }

    for (let y = 0; y < a.rows; y++) {
      for (let x = 0; x < a.cols; x++) {
        const t = a.tileAt(x, y);
        if (t === TT.HARD) this.drawHard(ctx, x * T, y * T, T);
        else if (t === TT.SOFT) this.drawSoft(ctx, x * T, y * T, T);
      }
    }

    for (const b of a.bombs) this.drawBomb(ctx, b, now);

    const order = game.players.slice().sort((p, q) => p.py - q.py);
    for (const p of order) this.drawPlayer(ctx, p, now);

    // Flames go over everything so the danger is never ambiguous.
    ctx.globalCompositeOperation = 'lighter';
    for (const f of a.flames) this.drawFlame(ctx, f, now);
    ctx.globalCompositeOperation = 'source-over';

    for (const f of a.falling) this.drawFallingBlock(ctx, f);

    for (const p of a.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  },

  drawFloor(ctx, a) {
    const T = CFG.TILE;
    ctx.fillStyle = '#1b2030';
    ctx.fillRect(0, 0, a.cols * T, a.rows * T);
    for (let y = 1; y < a.rows - 1; y++) {
      for (let x = 1; x < a.cols - 1; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#2c3446' : '#28303f';
        ctx.fillRect(x * T, y * T, T, T);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let y = 1; y < a.rows - 1; y++) {
      for (let x = 1; x < a.cols - 1; x++) ctx.strokeRect(x * T + 0.5, y * T + 0.5, T - 1, T - 1);
    }
  },

  drawHard(ctx, x, y, T) {
    ctx.fillStyle = '#39415a';
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = '#4d5773';
    ctx.fillRect(x + 2, y + 2, T - 4, T - 8);
    ctx.fillStyle = '#5f6b8b';
    ctx.fillRect(x + 2, y + 2, T - 4, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x + 2, y + T - 8, T - 4, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(x + 6, y + 8, 3, 3);
    ctx.fillRect(x + T - 9, y + 8, 3, 3);
    ctx.fillRect(x + 6, y + T - 15, 3, 3);
    ctx.fillRect(x + T - 9, y + T - 15, 3, 3);
  },

  drawSoft(ctx, x, y, T) {
    ctx.fillStyle = '#6d3f28';
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = '#9a5c37';
    roundRect(ctx, x + 2, y + 2, T - 4, T - 5, 4);
    ctx.fill();
    ctx.fillStyle = '#b06f43';
    ctx.fillRect(x + 3, y + 3, T - 6, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.30)';
    ctx.lineWidth = 2;
    const h = (T - 8) / 3;
    for (let r = 0; r < 3; r++) {
      const yy = y + 6 + r * h;
      ctx.beginPath();
      ctx.moveTo(x + 3, yy + h);
      ctx.lineTo(x + T - 3, yy + h);
      ctx.stroke();
      const off = r % 2 === 0 ? T / 2 : T / 4;
      ctx.beginPath();
      ctx.moveTo(x + off, yy);
      ctx.lineTo(x + off, yy + h);
      ctx.stroke();
    }
  },

  drawFallingBlock(ctx, f) {
    const T = CFG.TILE;
    const p = clamp(f.t / f.dur, 0, 1);
    const eased = p * p;
    const y = (f.y - 3.2) * T + eased * 3.2 * T;
    ctx.globalAlpha = 0.35 + p * 0.65;
    this.drawHard(ctx, f.x * T, y, T);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,80,80,' + (0.25 + 0.25 * Math.sin(f.t * 40)) + ')';
    ctx.lineWidth = 2;
    ctx.strokeRect(f.x * T + 2, f.y * T + 2, T - 4, T - 4);
  },

  drawBomb(ctx, b, now) {
    const T = CFG.TILE;
    const cx = b.px, cy = b.py;
    const life = b.remote ? 0.5 : 1 - clamp(b.fuse / CFG.BOMB_FUSE, 0, 1);
    const pulse = 1 + 0.10 * Math.sin(now / (b.remote ? 220 : 110 - life * 60));
    const r = T * 0.34 * pulse;

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.75, r * 0.95, r * 0.4, 0, 0, 6.283);
    ctx.fill();

    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.2, cx, cy, r);
    g.addColorStop(0, b.pierce ? '#ff7d7d' : '#4a5163');
    g.addColorStop(0.5, b.pierce ? '#c62b2b' : '#20242f');
    g.addColorStop(1, b.pierce ? '#7d1414' : '#101319');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.283);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.22, r * 0.14, -0.6, 0, 6.283);
    ctx.fill();

    // Fuse and spark.
    ctx.strokeStyle = '#c9a06a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.35, cy - r * 0.8);
    ctx.quadraticCurveTo(cx + r * 0.9, cy - r * 1.25, cx + r * 0.45, cy - r * 1.5);
    ctx.stroke();

    if (b.remote) {
      ctx.fillStyle = '#8f7dff';
      ctx.beginPath();
      ctx.arc(cx + r * 0.45, cy - r * 1.5, 3.5 + Math.sin(now / 150), 0, 6.283);
      ctx.fill();
    } else {
      const s = 2.5 + Math.random() * 3 + life * 3;
      ctx.fillStyle = Math.random() < 0.5 ? '#fff2b0' : '#ff9c26';
      ctx.beginPath();
      ctx.arc(cx + r * 0.45, cy - r * 1.5, s, 0, 6.283);
      ctx.fill();
    }
  },

  drawFlame(ctx, f, now) {
    const T = CFG.TILE;
    const t = clamp((now - f.born) / CFG.FLAME_MS, 0, 1);
    // Snap out fast, fade out slower.
    const grow = t < 0.18 ? t / 0.18 : 1;
    const fade = t > 0.62 ? 1 - (t - 0.62) / 0.38 : 1;
    const cx = centerOf(f.x), cy = centerOf(f.y);
    const size = T * 0.5 * grow * (0.9 + 0.1 * Math.sin(now / 40));

    ctx.globalAlpha = fade;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, size * 1.25);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(255,220,120,0.85)');
    g.addColorStop(0.7, 'rgba(255,130,30,0.55)');
    g.addColorStop(1, 'rgba(200,40,20,0)');
    ctx.fillStyle = g;

    if (f.kind === 'center') {
      ctx.beginPath();
      ctx.arc(cx, cy, size * 1.2, 0, 6.283);
      ctx.fill();
    } else {
      const horiz = f.dir && f.dir.dy === 0;
      const w = horiz ? T : size * 1.7;
      const h = horiz ? size * 1.7 : T;
      ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.85, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  drawItem(ctx, tx, ty, it) {
    const T = CFG.TILE;
    const st = ITEM_STYLE[it.type] || ITEM_STYLE.bomb;
    const bob = Math.sin(it.bob) * 2.5;
    const cx = centerOf(tx), cy = centerOf(ty) + bob;
    const r = T * CFG.ITEM_HALF;

    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(cx, centerOf(ty) + r * 0.9, r * 0.8, r * 0.3, 0, 0, 6.283);
    ctx.fill();

    // Coloured plate so each pickup is recognisable at a glance.
    const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    g.addColorStop(0, st.bg2);
    g.addColorStop(1, st.bg1);
    ctx.fillStyle = g;
    roundRect(ctx, cx - r, cy - r, r * 2, r * 2, 7);
    ctx.fill();
    ctx.strokeStyle = st.edge;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(ctx, cx - r + 3, cy - r + 3, r * 2 - 6, r * 0.5, 4);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    this.drawItemIcon(ctx, it.type, r);
    ctx.restore();
  },

  drawItemIcon(ctx, type, r) {
    const s = r * 0.94;
    switch (type) {
      case ITEM.FIRE: {
        const g = ctx.createLinearGradient(0, -s, 0, s);
        g.addColorStop(0, '#fff3c4');
        g.addColorStop(0.5, '#ffc046');
        g.addColorStop(1, '#ff7a18');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(s * 0.9, -s * 0.1, s * 0.45, s * 0.6);
        ctx.quadraticCurveTo(0, s, -s * 0.45, s * 0.6);
        ctx.quadraticCurveTo(-s * 0.9, -s * 0.1, 0, -s);
        ctx.fill();
        break;
      }
      case ITEM.BOMB: {
        ctx.fillStyle = '#dfe6f8';
        ctx.beginPath();
        ctx.arc(0, s * 0.15, s * 0.72, 0, 6.283);
        ctx.fill();
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(s * 0.3, -s * 0.45);
        ctx.lineTo(s * 0.6, -s * 0.9);
        ctx.stroke();
        break;
      }
      case ITEM.SPEED: {
        ctx.fillStyle = '#a9ecff';
        ctx.beginPath();
        ctx.moveTo(-s * 0.15, -s);
        ctx.lineTo(s * 0.6, -s * 0.1);
        ctx.lineTo(s * 0.1, -s * 0.05);
        ctx.lineTo(s * 0.45, s);
        ctx.lineTo(-s * 0.6, s * 0.05);
        ctx.lineTo(-s * 0.1, 0);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case ITEM.KICK: {
        ctx.fillStyle = '#adf2c9';
        roundRect(ctx, -s * 0.85, -s * 0.15, s * 1.1, s * 0.9, 3);
        ctx.fill();
        roundRect(ctx, -s * 0.85, -s * 0.8, s * 0.5, s * 1.4, 3);
        ctx.fill();
        ctx.fillStyle = '#2f8a56';
        ctx.fillRect(-s * 0.9, s * 0.6, s * 1.8, s * 0.25);
        break;
      }
      case ITEM.REMOTE: {
        ctx.fillStyle = '#d9d0ff';
        roundRect(ctx, -s * 0.55, -s * 0.5, s * 1.1, s * 1.35, 3);
        ctx.fill();
        ctx.strokeStyle = '#d9d0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s * 0.3, -s * 0.5);
        ctx.lineTo(s * 0.55, -s);
        ctx.stroke();
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(0, -s * 0.1, s * 0.2, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = '#2b2340';
        ctx.fillRect(-s * 0.35, s * 0.3, s * 0.7, s * 0.15);
        break;
      }
      case ITEM.PIERCE: {
        ctx.fillStyle = '#ffd2d2';
        ctx.beginPath();
        ctx.arc(0, s * 0.15, s * 0.7, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = '#c02222';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(-s * 0.75 + i * s * 0.55, s * 0.05, s * 0.28, s * 0.2);
        }
        break;
      }
      case ITEM.VEST: {
        const g = ctx.createLinearGradient(0, -s, 0, s);
        g.addColorStop(0, '#eaf8ff');
        g.addColorStop(1, '#8ccbff');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.8, -s * 0.55);
        ctx.lineTo(s * 0.65, s * 0.45);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.65, s * 0.45);
        ctx.lineTo(-s * 0.8, -s * 0.55);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case ITEM.SKULL: {
        ctx.fillStyle = '#eef1ff';
        ctx.beginPath();
        ctx.arc(0, -s * 0.15, s * 0.65, 0, 6.283);
        ctx.fill();
        ctx.fillRect(-s * 0.35, s * 0.25, s * 0.7, s * 0.45);
        ctx.fillStyle = '#2a2136';
        ctx.beginPath();
        ctx.arc(-s * 0.26, -s * 0.2, s * 0.17, 0, 6.283);
        ctx.arc(s * 0.26, -s * 0.2, s * 0.17, 0, 6.283);
        ctx.fill();
        ctx.fillRect(-s * 0.08, s * 0.05, s * 0.16, s * 0.16);
        break;
      }
    }
  },

  drawPlayer(ctx, p, now) {
    const T = CFG.TILE;
    let alpha = 1, scale = 1, spin = 0;

    if (!p.alive) {
      const raw = (now - p.deathAt) / 700;
      if (raw > 1) return;
      const t = clamp(raw, 0, 1);      // a clock hiccup must not inflate the sprite
      alpha = 1 - t;
      scale = 1 - t * 0.4;
      spin = t * 4;
    }

    const cx = p.px;
    const cy = p.py;
    const bounce = p.moving ? Math.abs(Math.sin(p.walkPhase)) * 2.6 : 0;
    const r = T * 0.31 * scale;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Ground ring makes it easy to see who is who at a glance.
    ctx.strokeStyle = p.color.body;
    ctx.globalAlpha = alpha * 0.35;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.95, r * 0.95, r * 0.36, 0, 0, 6.283);
    ctx.stroke();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.95, r * 0.8, r * 0.3, 0, 0, 6.283);
    ctx.fill();

    ctx.translate(cx, cy - bounce);
    if (spin) ctx.rotate(spin);

    // Feet.
    const step = p.moving ? Math.sin(p.walkPhase) * r * 0.3 : 0;
    ctx.fillStyle = p.color.dark;
    roundRect(ctx, -r * 0.62 + step, r * 0.55, r * 0.5, r * 0.42, 3); ctx.fill();
    roundRect(ctx, r * 0.12 - step, r * 0.55, r * 0.5, r * 0.42, 3); ctx.fill();

    // Body.
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, p.color.light);
    g.addColorStop(0.45, p.color.body);
    g.addColorStop(1, p.color.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * 0.92, r * 0.55);
    ctx.quadraticCurveTo(-r * 1.05, -r * 0.55, 0, -r * 1.0);
    ctx.quadraticCurveTo(r * 1.05, -r * 0.55, r * 0.92, r * 0.55);
    ctx.quadraticCurveTo(0, r * 0.95, -r * 0.92, r * 0.55);
    ctx.fill();

    // Antenna.
    ctx.strokeStyle = p.color.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.98);
    ctx.lineTo(0, -r * 1.35);
    ctx.stroke();
    ctx.fillStyle = p.vest ? '#7fd7ff' : p.color.light;
    ctx.beginPath();
    ctx.arc(0, -r * 1.42, r * 0.16, 0, 6.283);
    ctx.fill();

    // Visor, or the back of the helmet when walking away from the camera.
    if (p.dir === 'up') {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      roundRect(ctx, -r * 0.5, -r * 0.5, r, r * 0.62, 5);
      ctx.fill();
    } else {
      const shift = p.dir === 'left' ? -r * 0.18 : (p.dir === 'right' ? r * 0.18 : 0);
      ctx.fillStyle = '#151a26';
      roundRect(ctx, -r * 0.62, -r * 0.52, r * 1.24, r * 0.7, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      const ey = -r * 0.2;
      ctx.beginPath();
      ctx.ellipse(-r * 0.22 + shift, ey, r * 0.15, r * 0.19, 0, 0, 6.283);
      ctx.ellipse(r * 0.22 + shift, ey, r * 0.15, r * 0.19, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#1b2030';
      ctx.beginPath();
      ctx.arc(-r * 0.2 + shift * 1.6, ey + r * 0.03, r * 0.07, 0, 6.283);
      ctx.arc(r * 0.24 + shift * 1.6, ey + r * 0.03, r * 0.07, 0, 6.283);
      ctx.fill();
    }

    if (p.vest) {
      ctx.strokeStyle = 'rgba(140,220,255,' + (0.4 + 0.3 * Math.sin(now / 180)) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * 1.25, 0, 6.283);
      ctx.stroke();
    }

    ctx.restore();

    if (p.alive && p.disease) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#c58cff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const wob = Math.sin(now / 160) * 2;
      ctx.fillText('☠', cx + wob, cy - r * 1.9);
      ctx.restore();
    }
  }
};
