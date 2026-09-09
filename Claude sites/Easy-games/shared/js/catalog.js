'use strict';

/* The game list, used by the landing page. Each entry draws its own thumbnail
   so there are no screenshots to keep in sync. Set soon:true until it is built. */

const CATALOG = [
  {
    slug: 'bomber', name: 'Easy Bomber', cat: 'party',
    desc: 'Blow up the maze, grab power-ups, be the last one standing.',
    tags: ['1-4 players', 'CPU bots'],
    thumb(c, w, h) {
      const t = 14;
      c.fillStyle = '#232b3d'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < Math.ceil(h / t); y++) {
        for (let x = 0; x < Math.ceil(w / t); x++) {
          const hard = x % 2 === 0 && y % 2 === 0;
          c.fillStyle = hard ? '#4d5773' : ((x + y) % 2 ? '#2c3446' : '#28303f');
          c.fillRect(x * t, y * t, t - 1, t - 1);
          if (!hard && (x * 7 + y * 3) % 5 < 2) { c.fillStyle = '#9a5c37'; c.fillRect(x * t, y * t, t - 1, t - 1); }
        }
      }
      // a blast and two bombers
      const g = c.createRadialGradient(w * 0.6, h * 0.45, 2, w * 0.6, h * 0.45, 34);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.5, 'rgba(255,200,90,.8)');
      g.addColorStop(1, 'rgba(220,60,20,0)');
      c.fillStyle = g; c.beginPath(); c.arc(w * 0.6, h * 0.45, 34, 0, 6.3); c.fill();
      Thumb.bomber(c, 22, h - 24, 11, '#ff4d5e');
      Thumb.bomber(c, w - 24, 24, 11, '#4da3ff');
    }
  },
  {
    slug: 'snake', name: 'Easy Snake', cat: 'arcade',
    desc: 'Eat, grow, do not bite yourself. Solo or two snakes at once.',
    tags: ['1-2 players', 'Touch'],
    thumb(c, w, h) {
      Thumb.field(c, w, h);
      const t = 13, body = [[3, 6], [4, 6], [5, 6], [6, 6], [6, 5], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4]];
      body.forEach((p, i) => {
        c.fillStyle = i === body.length - 1 ? '#7ee2a3' : '#4ad46f';
        roundRect(c, p[0] * t + 1, p[1] * t + 1, t - 2, t - 2, 3); c.fill();
      });
      c.fillStyle = '#ff5470';
      c.beginPath(); c.arc(13.5 * t, 7.5 * t, 4.5, 0, 6.3); c.fill();
    }
  },
  {
    slug: 'curve', name: 'Easy Curve', cat: 'party',
    desc: 'Steer a growing line. Do not touch anything. Up to eight players.',
    tags: ['2-8 players'],
    thumb(c, w, h) {
      Thumb.field(c, w, h);
      const draw = (col, ph, gapAt) => {
        c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath();
        for (let i = 0; i < 130; i++) {
          const a = ph + i * 0.055;
          const x = w / 2 + Math.cos(a) * (12 + i * 0.42);
          const y = h / 2 + Math.sin(a) * (12 + i * 0.36);
          if (i === gapAt) { c.stroke(); c.beginPath(); c.moveTo(x, y); continue; }
          if (i > gapAt && i < gapAt + 8) { c.moveTo(x, y); continue; }
          i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.stroke();
      };
      draw('#ff4d5e', 0, 60);
      draw('#4da3ff', 2.1, 95);
      draw('#ffcc3f', 4.2, 40);
    }
  },
  {
    slug: 'merge', name: 'Easy Merge', cat: 'puzzle',
    desc: 'Slide tiles, merge matching numbers, reach 2048.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) {
      c.fillStyle = '#20283a'; c.fillRect(0, 0, w, h);
      const vals = [2, 4, 0, 8, 16, 32, 4, 0, 0, 64, 128, 2, 8, 0, 256, 512];
      const s = Math.min(w, h) / 4.4, ox = (w - s * 4) / 2, oy = (h - s * 4) / 2;
      for (let i = 0; i < 16; i++) {
        const x = ox + (i % 4) * s, y = oy + Math.floor(i / 4) * s;
        const v = vals[i];
        c.fillStyle = v ? Thumb.tileColor(v) : '#2b3550';
        roundRect(c, x + 2, y + 2, s - 4, s - 4, 4); c.fill();
        if (v) {
          c.fillStyle = v <= 4 ? '#3a2d12' : '#fff';
          c.font = 'bold ' + Math.round(s * (v > 99 ? 0.3 : 0.42)) + 'px system-ui';
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(v, x + s / 2, y + s / 2);
        }
      }
    }
  },
  {
    slug: 'mines', name: 'Easy Mines', cat: 'puzzle',
    desc: 'Sweep the field by logic. First click is always safe.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) {
      c.fillStyle = '#1a2231'; c.fillRect(0, 0, w, h);
      const s = 21, cols = Math.ceil(w / s), rows = Math.ceil(h / s);
      const nums = ['', '#6fb4ff', '#5cd68a', '#ff6b7d', '#b98cff'];
      for (let r = 0; r < rows; r++) {
        for (let x = 0; x < cols; x++) {
          const k = (x * 7 + r * 5) % 11;
          const px = x * s, py = r * s;
          if (k < 5) {
            c.fillStyle = (x + r) % 2 === 0 ? '#232c40' : '#202839';
            c.fillRect(px, py, s, s);
            if (k > 0 && k < 5) {
              c.fillStyle = nums[k];
              c.font = '700 ' + Math.round(s * 0.56) + 'px system-ui';
              c.textAlign = 'center'; c.textBaseline = 'middle';
              c.fillText(k, px + s / 2, py + s / 2);
            }
          } else {
            const g = c.createLinearGradient(px, py, px, py + s);
            g.addColorStop(0, '#4a5a7e'); g.addColorStop(1, '#364463');
            c.fillStyle = g;
            roundRect(c, px + 1, py + 1, s - 2, s - 2, 3); c.fill();
            if (k === 9) {
              c.strokeStyle = '#cfd6e8'; c.lineWidth = 1.5;
              c.beginPath(); c.moveTo(px + s * .38, py + s * .24); c.lineTo(px + s * .38, py + s * .76); c.stroke();
              c.fillStyle = '#ff5470';
              c.beginPath(); c.moveTo(px + s * .38, py + s * .22);
              c.lineTo(px + s * .7, py + s * .35); c.lineTo(px + s * .38, py + s * .48);
              c.closePath(); c.fill();
            }
          }
        }
      }
    }
  },
  {
    slug: 'bricks', name: 'Easy Bricks', cat: 'arcade',
    desc: 'Bounce the ball, clear eight rows, keep it alive.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) {
      c.fillStyle = '#151b2a'; c.fillRect(0, 0, w, h);
      const bands = ['#e8453c', '#e8453c', '#e88a2a', '#e88a2a', '#3fb457', '#3fb457', '#d8c22e', '#d8c22e'];
      const light = ['#ff7d75', '#ff7d75', '#ffb066', '#ffb066', '#7de095', '#7de095', '#f5e070', '#f5e070'];
      const cols = 9, bw = (w - 16 - (cols - 1) * 2) / cols, bh = 9;
      for (let r = 0; r < 8; r++) {
        for (let x = 0; x < cols; x++) {
          if (r > 4 && (x * 3 + r) % 7 < 2) continue;
          const px = 8 + x * (bw + 2), py = 14 + r * (bh + 2);
          const g = c.createLinearGradient(px, py, px, py + bh);
          g.addColorStop(0, light[r]); g.addColorStop(1, bands[r]);
          c.fillStyle = g;
          roundRect(c, px, py, bw, bh, 2); c.fill();
        }
      }
      c.fillStyle = '#4da3ff';
      roundRect(c, w / 2 - 24, h - 16, 48, 7, 3); c.fill();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(w / 2 + 14, h - 38, 4, 0, 6.3); c.fill();
    }
  },
  {
    slug: 'rocks', name: 'Easy Rocks', cat: 'arcade',
    desc: 'Drift, thrust and shoot. Beware the small saucer.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) {
      c.fillStyle = '#0b0f1a'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        c.globalAlpha = 0.15 + (i % 5) * 0.1;
        c.fillStyle = '#dfe6f8';
        c.fillRect((i * 37) % w, (i * 53) % h, 1.2, 1.2);
      }
      c.globalAlpha = 1;
      const rock = (cx, cy, rad, seed) => {
        c.strokeStyle = '#aab6d4'; c.lineWidth = 1.6;
        c.fillStyle = 'rgba(120,134,170,.16)';
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * 6.283;
          const rr = rad * (0.75 + ((i * seed) % 5) * 0.09);
          const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
          i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.closePath(); c.fill(); c.stroke();
      };
      rock(48, 40, 22, 3); rock(160, 96, 13, 7); rock(150, 32, 9, 5);
      c.save();
      c.translate(88, 96); c.rotate(-0.5);
      c.strokeStyle = '#e8edfa'; c.lineWidth = 1.8;
      c.fillStyle = 'rgba(232,237,250,.12)';
      c.beginPath();
      c.moveTo(12, 0); c.lineTo(-8, -7); c.lineTo(-4, 0); c.lineTo(-8, 7);
      c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#ffb02e';
      c.beginPath(); c.moveTo(-5, -4); c.lineTo(-14, 0); c.lineTo(-5, 4); c.stroke();
      c.restore();
      c.fillStyle = '#ffd775';
      c.beginPath(); c.arc(118, 74, 2.4, 0, 6.3); c.fill();
      c.beginPath(); c.arc(132, 62, 2.4, 0, 6.3); c.fill();
    }
  },
  {
    slug: 'pong', name: 'Easy Pong', cat: 'party',
    desc: 'The original. Two paddles, one ball, first to eleven.',
    tags: ['1-2 players', 'Touch'],
    thumb(c, w, h) {
      c.fillStyle = '#141a29'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 3;
      c.setLineDash([8, 9]);
      c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
      c.setLineDash([]);
      c.fillStyle = 'rgba(255,255,255,.06)';
      c.font = '800 44px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('7', w * 0.28, h * 0.3); c.fillText('5', w * 0.72, h * 0.3);
      c.fillStyle = '#4da3ff'; roundRect(c, 14, h * 0.34, 8, 44, 4); c.fill();
      c.fillStyle = '#ff5470'; roundRect(c, w - 22, h * 0.5, 8, 44, 4); c.fill();
      for (let i = 0; i < 7; i++) {
        c.globalAlpha = i / 9;
        c.fillStyle = '#ffb02e';
        c.beginPath(); c.arc(w * 0.35 + i * 9, h * 0.62 - i * 4, 2 + i * 0.5, 0, 6.3); c.fill();
      }
      c.globalAlpha = 1;
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(w * 0.35 + 7 * 9, h * 0.62 - 7 * 4, 5, 0, 6.3); c.fill();
    }
  },
  {
    slug: 'lights', name: 'Easy Lights', cat: 'puzzle',
    desc: 'Every press flips a cross of lights. Turn them all off.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) {
      c.fillStyle = '#181f2f'; c.fillRect(0, 0, w, h);
      const n = 5, s = Math.min(w, h) / (n + 0.9);
      const ox = (w - s * n) / 2, oy = (h - s * n) / 2;
      const on = [0,1,0,1,1, 1,0,1,0,1, 1,0,1,1,1, 0,0,1,1,1, 1,1,0,1,1];
      for (let i = 0; i < n * n; i++) {
        const x = ox + (i % n) * s, y = oy + Math.floor(i / n) * s;
        if (on[i]) {
          const gl = c.createRadialGradient(x + s / 2, y + s / 2, s * .1, x + s / 2, y + s / 2, s);
          gl.addColorStop(0, 'rgba(255,196,77,.5)'); gl.addColorStop(1, 'rgba(255,176,46,0)');
          c.fillStyle = gl; c.fillRect(x - s * .45, y - s * .45, s * 1.9, s * 1.9);
        }
        const g = c.createLinearGradient(x, y, x, y + s);
        if (on[i]) { g.addColorStop(0, '#ffd775'); g.addColorStop(1, '#e8991a'); }
        else { g.addColorStop(0, '#2f3a55'); g.addColorStop(1, '#232c42'); }
        c.fillStyle = g;
        roundRect(c, x + 3, y + 3, s - 6, s - 6, 5); c.fill();
      }
    }
  },
  {
    slug: 'slide', name: 'Easy Slide', cat: 'puzzle',
    desc: 'Fifteen tiles, one gap, put them back in order.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) {
      c.fillStyle = '#1a2231'; c.fillRect(0, 0, w, h);
      const n = 4, s = Math.min(w, h) / (n + 0.8);
      const ox = (w - s * n) / 2, oy = (h - s * n) / 2;
      const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 12, 13, 14, 11, 0];
      for (let i = 0; i < 16; i++) {
        const v = vals[i];
        if (!v) continue;
        const x = ox + (i % n) * s, y = oy + Math.floor(i / n) * s;
        const home = v === i + 1;
        const g = c.createLinearGradient(x, y, x, y + s);
        if (home) { g.addColorStop(0, '#4fd07a'); g.addColorStop(1, '#2a9a52'); }
        else { g.addColorStop(0, '#48597e'); g.addColorStop(1, '#334463'); }
        c.fillStyle = g;
        roundRect(c, x + 2, y + 2, s - 4, s - 4, 5); c.fill();
        c.fillStyle = '#fff';
        c.font = '700 ' + Math.round(s * 0.42) + 'px system-ui';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(v, x + s / 2, y + s / 2);
      }
    }
  },
  {
    slug: 'lander', name: 'Easy Lander', cat: 'arcade',
    desc: 'Real lunar gravity, finite fuel, land it gently.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) {
      c.fillStyle = '#080b14'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        c.globalAlpha = 0.15 + (i % 4) * 0.12;
        c.fillStyle = '#dfe6f8';
        c.fillRect((i * 41) % w, (i * 29) % (h * 0.6), 1.2, 1.2);
      }
      c.globalAlpha = 1;
      const pts = [[0,110],[24,96],[46,104],[68,84],[96,84],[118,98],[140,90],[168,102],[190,88],[210,96]];
      c.beginPath(); c.moveTo(0, h);
      for (const p of pts) c.lineTo(p[0], p[1]);
      c.lineTo(w, h); c.closePath();
      const g = c.createLinearGradient(0, 70, 0, h);
      g.addColorStop(0, '#2b3550'); g.addColorStop(1, '#171d2c');
      c.fillStyle = g; c.fill();
      c.strokeStyle = '#8f9cba'; c.lineWidth = 1.5;
      c.beginPath();
      pts.forEach((p, i) => i === 0 ? c.moveTo(p[0], p[1]) : c.lineTo(p[0], p[1]));
      c.stroke();
      c.strokeStyle = '#4ad46f'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(68, 84); c.lineTo(96, 84); c.stroke();
      c.save();
      c.translate(82, 48); c.rotate(0.12);
      c.strokeStyle = '#e8edfa'; c.lineWidth = 1.6;
      c.fillStyle = 'rgba(200,212,240,.22)';
      c.beginPath();
      c.moveTo(0, -9); c.lineTo(7, -1); c.lineTo(7, 5); c.lineTo(-7, 5); c.lineTo(-7, -1);
      c.closePath(); c.fill(); c.stroke();
      c.beginPath();
      c.moveTo(-5, 5); c.lineTo(-9, 11); c.moveTo(5, 5); c.lineTo(9, 11);
      c.stroke();
      c.strokeStyle = '#ffb02e';
      c.beginPath(); c.moveTo(-4, 6); c.lineTo(0, 16); c.lineTo(4, 6); c.stroke();
      c.restore();
    }
  },
  {
    slug: 'cycles', name: 'Easy Cycles', cat: 'party',
    desc: 'Light cycles on a grid. Cut each other off.',
    tags: ['2-4 players'],
    thumb(c, w, h) {
      c.fillStyle = '#0d1220'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(120,160,255,.07)'; c.lineWidth = 1;
      for (let x = 0; x < w; x += 10) { c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, h); c.stroke(); }
      for (let y = 0; y < h; y += 10) { c.beginPath(); c.moveTo(0, y + .5); c.lineTo(w, y + .5); c.stroke(); }
      const trail = (col, pts) => {
        c.fillStyle = col;
        for (const p of pts) c.fillRect(p[0], p[1], 5, 5);
        const last = pts[pts.length - 1];
        c.shadowColor = col; c.shadowBlur = 10;
        c.fillRect(last[0] - 1, last[1] - 1, 7, 7);
        c.shadowBlur = 0;
      };
      const line = (x0, y0, dx, dy, n) => {
        const out = [];
        for (let i = 0; i < n; i++) out.push([x0 + dx * i * 5, y0 + dy * i * 5]);
        return out;
      };
      trail('#ff4d5e', line(20, 30, 1, 0, 14).concat(line(85, 30, 0, 1, 10)));
      trail('#4da3ff', line(180, 100, -1, 0, 16).concat(line(105, 100, 0, -1, 8)));
      trail('#4ad46f', line(40, 115, 1, 0, 9));
    }
  },
  {
    slug: 'four', name: 'Easy Four', cat: 'puzzle',
    desc: 'Four in a row. The centre column is the only winning opening.',
    tags: ['1-2 players', 'Touch'],
    thumb(c, w, h) {
      c.fillStyle = '#141a29'; c.fillRect(0, 0, w, h);
      const cols = 7, rows = 6, cell = Math.min(w / cols, (h - 14) / rows);
      const ox = (w - cell * cols) / 2, oy = h - cell * rows - 4;
      const board = [
        0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,
        0,0,0,2,0,0,0,
        0,0,2,1,0,0,0,
        0,0,1,2,1,0,0,
        0,1,2,1,2,1,0];
      c.save();
      c.beginPath();
      c.rect(ox, oy, cell * cols, cell * rows);
      for (let r = 0; r < rows; r++) for (let x = 0; x < cols; x++) {
        const px = ox + x * cell + cell / 2, py = oy + r * cell + cell / 2;
        c.moveTo(px + cell * .36, py);
        c.arc(px, py, cell * .36, 0, 6.283, true);
      }
      const bg = c.createLinearGradient(0, oy, 0, h);
      bg.addColorStop(0, '#2f6fbf'); bg.addColorStop(1, '#1d4d94');
      c.fillStyle = bg; c.fill('evenodd');
      c.restore();
      const cols2 = { 1: ['#ff4d5e', '#ff9aa4', '#a81f2f'], 2: ['#ffcc3f', '#ffe396', '#a87c00'] };
      for (let i = 0; i < board.length; i++) {
        const v = board[i]; if (!v) continue;
        const px = ox + (i % cols) * cell + cell / 2, py = oy + Math.floor(i / cols) * cell + cell / 2;
        const [base, light, dark] = cols2[v];
        const g = c.createRadialGradient(px - cell * .12, py - cell * .13, cell * .05, px, py, cell * .34);
        g.addColorStop(0, light); g.addColorStop(.6, base); g.addColorStop(1, dark);
        c.fillStyle = g;
        c.beginPath(); c.arc(px, py, cell * .34, 0, 6.283); c.fill();
      }
    }
  },
  {
    slug: 'code', name: 'Easy Code', cat: 'puzzle',
    desc: 'Crack the colour code, or watch Knuth\u2019s solver do it.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) {
      c.fillStyle = '#1a2231'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#141b28';
      roundRect(c, 8, 8, w - 16, h - 16, 8); c.fill();
      const pal = [['#ff4d5e','#ff9aa4','#a81f2f'],['#4da3ff','#a5d2ff','#175394'],
                   ['#4ad46f','#9aeab1','#187a38'],['#ffcc3f','#ffe396','#a87c00'],
                   ['#b98cff','#dbc6ff','#6a3fb5'],['#ff9038','#ffc08a','#b35400']];
      const rows = [[0,0,1,1,0,1],[2,3,4,5,2,0],[2,5,1,4,2,0],[2,5,0,1,3,0]];
      const r = 11, gap = 27;
      rows.forEach((row, i) => {
        const y = 26 + i * 28;
        for (let k = 0; k < 4; k++) {
          const x = 26 + k * gap;
          const [base, light, dark] = pal[row[k]];
          const g = c.createRadialGradient(x - 4, y - 4, 2, x, y, r);
          g.addColorStop(0, light); g.addColorStop(.6, base); g.addColorStop(1, dark);
          c.fillStyle = g;
          c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
        }
        let n = 0;
        for (let f = 0; f < 4; f++) {
          const fx = 152 + (f % 2) * 13, fy = y - 6 + Math.floor(f / 2) * 13;
          c.fillStyle = n < row[4] ? '#151a26' : (n < row[4] + row[5] ? '#eef2fa' : 'rgba(255,255,255,.08)');
          c.beginPath(); c.arc(fx, fy, 4.5, 0, 6.283); c.fill();
          n++;
        }
      });
      for (let k = 0; k < 4; k++) {
        c.fillStyle = '#2b3550';
        c.beginPath(); c.arc(26 + k * gap, h - 26, r, 0, 6.283); c.fill();
        c.fillStyle = 'rgba(255,255,255,.4)';
        c.font = '700 12px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('?', 26 + k * gap, h - 25);
      }
    }
  },
  {
    slug: 'words', name: 'Easy Words', cat: 'puzzle',
    desc: 'Five letters, six guesses, one word a day.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) { Thumb.field(c, w, h); }
  },
  {
    slug: 'blocks', name: 'Easy Blocks', cat: 'arcade',
    desc: 'Falling shapes, full rows clear. Wall kicks and all.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) { Thumb.field(c, w, h); }
  },
  {
    slug: 'invaders', name: 'Easy Invaders', cat: 'arcade',
    desc: 'They speed up as you thin them out. That is the trick.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) { Thumb.field(c, w, h); }
  },
  {
    slug: 'volley', name: 'Easy Volley', cat: 'party',
    desc: 'Two blobs, one net, absurd physics.',
    tags: ['1-2 players', 'Touch'],
    thumb(c, w, h) {
      const ground = h - 22;
      const sky = c.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, '#1b2540'); sky.addColorStop(1, '#243050');
      c.fillStyle = sky; c.fillRect(0, 0, w, ground);
      c.fillStyle = '#c9a86a'; c.fillRect(0, ground, w, h - ground);
      c.fillStyle = 'rgba(0,0,0,.15)';
      for (let x = 0; x < w; x += 18) c.fillRect(x, ground, 9, h - ground);
      c.fillStyle = '#e8edfa';
      roundRect(c, w / 2 - 3, ground - 46, 6, 46, 3); c.fill();
      const blob = (x, col, light, dark, faceLeft) => {
        const r = 26;
        c.fillStyle = 'rgba(0,0,0,.25)';
        c.beginPath(); c.ellipse(x, ground + 3, r * .9, 4, 0, 0, 6.3); c.fill();
        const g = c.createLinearGradient(x, ground - r, x, ground);
        g.addColorStop(0, light); g.addColorStop(.6, col); g.addColorStop(1, dark);
        c.fillStyle = g;
        c.beginPath(); c.arc(x, ground, r, Math.PI, 0); c.closePath(); c.fill();
        const ex = x + (faceLeft ? -8 : 8);
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(ex, ground - r * .5, 6, 0, 6.3); c.fill();
        c.fillStyle = '#151a26';
        c.beginPath(); c.arc(ex + (faceLeft ? -2 : 2), ground - r * .5 - 1, 2.8, 0, 6.3); c.fill();
      };
      blob(48, '#4da3ff', '#a5d2ff', '#1d61b8', false);
      blob(w - 48, '#ff4d5e', '#ff8b96', '#c02637', true);
      const bg = c.createRadialGradient(w / 2 - 12, 40, 1, w / 2 - 8, 44, 9);
      bg.addColorStop(0, '#fff6d8'); bg.addColorStop(1, '#f0b429');
      c.fillStyle = bg;
      c.beginPath(); c.arc(w / 2 - 8, 44, 9, 0, 6.3); c.fill();
    }
  },
  {
    slug: 'puck', name: 'Easy Puck', cat: 'party',
    desc: 'Air hockey. Best on a tablet with two thumbs.',
    tags: ['1-2 players', 'Touch'],
    thumb(c, w, h) {
      c.fillStyle = '#eef2fa'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#c3cee2'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
      c.beginPath(); c.arc(w / 2, h / 2, 26, 0, 6.3); c.stroke();
      const mouth = 70;
      c.strokeStyle = '#ff4d5e'; c.lineWidth = 6;
      c.beginPath(); c.moveTo((w - mouth) / 2, 3); c.lineTo((w + mouth) / 2, 3); c.stroke();
      c.strokeStyle = '#4da3ff';
      c.beginPath(); c.moveTo((w - mouth) / 2, h - 3); c.lineTo((w + mouth) / 2, h - 3); c.stroke();
      const mallet = (x, y, col, light, dark) => {
        c.fillStyle = 'rgba(0,0,0,.16)';
        c.beginPath(); c.ellipse(x, y + 3, 17, 15, 0, 0, 6.3); c.fill();
        const g = c.createRadialGradient(x - 5, y - 6, 2, x, y, 17);
        g.addColorStop(0, light); g.addColorStop(.6, col); g.addColorStop(1, dark);
        c.fillStyle = g;
        c.beginPath(); c.arc(x, y, 17, 0, 6.3); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)';
        c.beginPath(); c.arc(x, y, 7, 0, 6.3); c.fill();
      };
      mallet(w / 2 - 30, h - 28, '#4da3ff', '#a5d2ff', '#1d61b8');
      mallet(w / 2 + 24, 30, '#ff4d5e', '#ff8b96', '#c02637');
      for (let i = 0; i < 6; i++) {
        c.globalAlpha = i / 14;
        c.fillStyle = '#2b3550';
        c.beginPath(); c.arc(w / 2 - 26 + i * 7, h - 58 + i * 5, 4 + i * 0.7, 0, 6.3); c.fill();
      }
      c.globalAlpha = 1;
      const pg = c.createRadialGradient(w / 2 + 15, h - 30, 1, w / 2 + 18, h - 27, 9);
      pg.addColorStop(0, '#4a5573'); pg.addColorStop(1, '#171d2c');
      c.fillStyle = pg;
      c.beginPath(); c.arc(w / 2 + 18, h - 27, 9, 0, 6.3); c.fill();
    }
  },
  {
    slug: 'tanks', name: 'Easy Tanks', cat: 'party',
    desc: 'Shells bounce off walls, including into you.',
    tags: ['1-4 players', 'CPU bots'],
    thumb(c, w, h) {
      const t = 21;
      c.fillStyle = '#232b3d'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < Math.ceil(h / t); y++) {
        for (let x = 0; x < Math.ceil(w / t); x++) {
          const k = (x * 5 + y * 3) % 9;
          const px = x * t, py = y * t;
          if (k === 0) {
            c.fillStyle = '#39415a'; c.fillRect(px, py, t, t);
            c.fillStyle = '#4d5773'; c.fillRect(px + 1, py + 1, t - 2, t - 4);
            c.fillStyle = '#5f6b8b'; c.fillRect(px + 1, py + 1, t - 2, 2);
          } else if (k === 4) {
            c.fillStyle = '#6d3f28'; c.fillRect(px, py, t, t);
            c.fillStyle = '#9a5c37';
            roundRect(c, px + 1, py + 1, t - 2, t - 3, 2); c.fill();
          } else {
            c.fillStyle = (x + y) % 2 === 0 ? '#2c3446' : '#28303f';
            c.fillRect(px, py, t, t);
          }
        }
      }
      // a ricochet path
      c.strokeStyle = 'rgba(255,224,138,.5)';
      c.lineWidth = 1.5;
      c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo(44, 100); c.lineTo(150, 44); c.lineTo(196, 82);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#ffe08a';
      c.beginPath(); c.arc(150, 44, 3.5, 0, 6.3); c.fill();
      const tank = (x, y, ang, col, light, dark) => {
        c.save(); c.translate(x, y);
        c.fillStyle = 'rgba(0,0,0,.3)';
        c.beginPath(); c.ellipse(0, 4, 11, 9, 0, 0, 6.3); c.fill();
        c.rotate(ang);
        c.fillStyle = dark;
        roundRect(c, -10, -11, 20, 5, 2); c.fill();
        roundRect(c, -10, 6, 20, 5, 2); c.fill();
        const g = c.createLinearGradient(0, -8, 0, 8);
        g.addColorStop(0, light); g.addColorStop(.5, col); g.addColorStop(1, dark);
        c.fillStyle = g;
        roundRect(c, -9, -7, 18, 14, 3); c.fill();
        c.fillStyle = dark; c.fillRect(0, -2, 16, 4);
        c.fillStyle = light;
        c.beginPath(); c.arc(0, 0, 5.5, 0, 6.3); c.fill();
        c.restore();
      };
      tank(44, 100, -0.5, '#ff4d5e', '#ff9aa4', '#a81f2f');
      tank(196, 82, 2.6, '#4da3ff', '#a5d2ff', '#175394');
    }
  },
  {
    slug: 'missiles', name: 'Easy Missiles', cat: 'arcade',
    desc: 'Thirty interceptors, six cities, lead your shots.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) { Thumb.field(c, w, h); }
  },
  {
    slug: 'muncher', name: 'Easy Muncher', cat: 'arcade',
    desc: 'Four ghosts, four different minds hunting you.',
    tags: ['Solo', 'Touch'], soon: true,
    thumb(c, w, h) { Thumb.field(c, w, h); }
  },
  {
    slug: 'tilt', name: 'Easy Tilt', cat: 'puzzle',
    desc: 'Drop weighted marbles on see-saws. The pan that rises throws. Two players share a ring and throw marbles at each other.',
    tags: ['Solo', '2 players', 'Touch'],
    thumb(c, w, h) {
      c.fillStyle = '#161d2b'; c.fillRect(0, 0, w, h);
      const cols = 6, pitch = w / cols, D = pitch * 0.72, R = D / 2;
      const rail = h - 16, level = rail - 44;
      c.strokeStyle = 'rgba(255,84,112,.4)'; c.lineWidth = 1;
      c.setLineDash([5, 4]);
      c.beginPath(); c.moveTo(6, 26); c.lineTo(w - 6, 26); c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#39415a'; c.fillRect(4, rail, w - 8, 10);
      const pal = [['#e8453c','#ff8b83','#8e1c16'],['#3f8ef0','#95c6ff','#174f96'],
                   ['#3fb457','#8ee6a0','#157030'],['#e5b52a','#ffe083','#8d6a00'],
                   ['#9b6cf0','#d9c2ff','#5b2f9e'],['#f0842a','#ffbd82','#93460a']];
      const stacks = [[0,1],[2,2,0],[1],[3,3,3],[0,4],[5]];
      const tilts = [1, -1, 0];
      for (let i = 0; i < cols; i++) {
        const x = pitch * i + pitch / 2;
        const t = tilts[i >> 1];
        const down = (t > 0 && i % 2 === 1) || (t < 0 && i % 2 === 0);
        const cy = t === 0 ? level : level + (down ? D * 0.5 : -D * 0.5);
        c.fillStyle = '#4d5773';
        c.fillRect(x - 4, cy, 8, rail - cy);
        c.fillStyle = '#5f6b8b';
        roundRect(c, x - D * 0.46, cy - 4, D * 0.92, 8, 3); c.fill();
        stacks[i].forEach((colour, row) => {
          const by = cy - R - row * D;
          const [base, light, dark] = pal[colour];
          const g = c.createRadialGradient(x - R * .35, by - R * .4, R * .1, x, by, R);
          g.addColorStop(0, light); g.addColorStop(.55, base); g.addColorStop(1, dark);
          c.fillStyle = g;
          c.beginPath(); c.arc(x, by, R, 0, 6.283); c.fill();
          c.fillStyle = 'rgba(12,16,26,.7)';
          c.beginPath(); c.arc(x, by, R * .5, 0, 6.283); c.fill();
          c.fillStyle = '#fff';
          c.font = '800 ' + Math.round(R * .8) + 'px system-ui';
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(String(1 + (colour * 2) % 7), x, by + 1);
        });
      }
    }
  },
  {
    slug: 'sudoku', name: 'Easy Sudoku', cat: 'puzzle',
    desc: 'Graded by the logic it needs, not by how many blanks.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) { Thumb.grid(c, w, h, '#8f9cba'); }
  },
  {
    slug: 'picture', name: 'Easy Picture', cat: 'puzzle',
    desc: 'Number clues hide a picture. Solvable by pure logic.',
    tags: ['Solo', 'Touch'],
    thumb(c, w, h) { Thumb.grid(c, w, h, '#4ad46f'); }
  },
  {
    slug: 'solitaire', name: 'Easy Solitaire', cat: 'puzzle',
    desc: 'Klondike, draw one or draw three, unlimited undo.',
    tags: ['Solo', 'Touch'], soon: true,
    thumb(c, w, h) { Thumb.field(c, w, h); }
  }
];

/* Small drawing helpers shared by the thumbnails. */
const Thumb = {
  field(c, w, h) {
    c.fillStyle = '#1b2030'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.045)'; c.lineWidth = 1;
    for (let x = 0; x < w; x += 13) { c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, h); c.stroke(); }
    for (let y = 0; y < h; y += 13) { c.beginPath(); c.moveTo(0, y + .5); c.lineTo(w, y + .5); c.stroke(); }
  },

  grid(c, w, h, accent) {
    c.fillStyle = '#20283a'; c.fillRect(0, 0, w, h);
    const n = 5, s = Math.min(w, h) / (n + 1.2);
    const ox = (w - s * n) / 2, oy = (h - s * n) / 2;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const on = (x * 3 + y * 5) % 4 < 2;
        c.fillStyle = on ? accent : '#2b3550';
        roundRect(c, ox + x * s + 2, oy + y * s + 2, s - 4, s - 4, 3);
        c.fill();
      }
    }
  },

  bomber(c, cx, cy, r, col) {
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.beginPath(); c.ellipse(cx, cy + r * .9, r * .8, r * .3, 0, 0, 6.3); c.fill();
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(cx - r * .9, cy + r * .55);
    c.quadraticCurveTo(cx - r, cy - r * .6, cx, cy - r);
    c.quadraticCurveTo(cx + r, cy - r * .6, cx + r * .9, cy + r * .55);
    c.quadraticCurveTo(cx, cy + r * .95, cx - r * .9, cy + r * .55);
    c.fill();
    c.fillStyle = '#151a26';
    roundRect(c, cx - r * .6, cy - r * .5, r * 1.2, r * .68, 4); c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.ellipse(cx - r * .22, cy - r * .18, r * .15, r * .19, 0, 0, 6.3);
    c.ellipse(cx + r * .22, cy - r * .18, r * .15, r * .19, 0, 0, 6.3);
    c.fill();
  },

  tileColor(v) {
    const map = {
      2: '#cdd4e6', 4: '#b9c2da', 8: '#c0470f', 16: '#d4630f',
      32: '#e07020', 64: '#e88a1a', 128: '#c9a227', 256: '#b8952a',
      512: '#8a7bd4', 1024: '#6f5fc4', 2048: '#4ad46f'
    };
    return map[v] || '#4ad46f';
  }
};
