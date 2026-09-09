'use strict';

/* Easy Solitaire - drawing.

   Everything on the table is canvas paths. The suit marks are drawn, not
   typed, because a text glyph for a heart or a spade renders differently on
   every platform (and sometimes as an emoji), while a path looks the same on
   all of them. Each card face and the back are painted once into an offscreen
   canvas and blitted from then on, so a frame is fifty-two drawImage calls
   rather than fifty-two small paintings.

   Geometry is fixed for a 750 by 700 stage; the shell scales the whole canvas
   to fit the page. The only thing that adapts is the face-up overlap in a
   column, which tightens when a run grows long enough to reach the bottom. */

const SolRender = (function () {

  const G = {
    W: 750, H: 700,
    cw: 90, ch: 126,             // card size
    gap: 12, padX: 24,
    topY: 22,                    // stock, waste and foundations
    tabY: 176,                   // first tableau card
    downStep: 14,                // overlap of face-down cards
    upStep: 30,                  // overlap of face-up cards, when there is room
    fan: 24,                     // spread of the draw-three waste
    radius: 8,
    bottomPad: 14
  };

  const RED = '#c9303c';
  const BLACK = '#232838';

  const colX = (c) => G.padX + c * (G.cw + G.gap);

  /* ---------- where things are ---------- */

  const stockRect = () => ({ x: colX(0), y: G.topY, w: G.cw, h: G.ch });
  const wasteRect = () => ({ x: colX(1), y: G.topY, w: G.cw, h: G.ch });
  const foundRect = (i) => ({ x: colX(3 + i), y: G.topY, w: G.cw, h: G.ch });
  const tabSlotRect = (col) => ({ x: colX(col), y: G.tabY, w: G.cw, h: G.ch });

  /** Face-up overlap for a column, shrunk if the run would run off the stage. */
  function upStepFor(s, col) {
    const up = s.tab[col].length - s.down[col];
    if (up <= 1) return G.upStep;
    const avail = G.H - G.bottomPad - G.tabY - G.ch - s.down[col] * G.downStep;
    return Math.max(12, Math.min(G.upStep, avail / (up - 1)));
  }

  function tabCardRect(s, col, index) {
    const d = s.down[col];
    const y = index < d
      ? G.tabY + index * G.downStep
      : G.tabY + d * G.downStep + (index - d) * upStepFor(s, col);
    return { x: colX(col), y, w: G.cw, h: G.ch };
  }

  /** How many waste cards are shown fanned out. Draw three shows the top three
      so you can see what is coming; only the last is playable. */
  function fanCount(s) {
    return s.draw === 3 ? Math.min(3, s.waste.length) : Math.min(1, s.waste.length);
  }

  function wasteCardRect(s, index) {
    const n = s.waste.length, fan = fanCount(s);
    const k = index - (n - fan);          // 0..fan-1 for fanned cards, negative under
    const r = wasteRect();
    if (k > 0) r.x += k * G.fan;
    return r;
  }

  /** The rect of a card at rest, from a source descriptor plus an index. */
  function cardRect(s, loc) {
    if (loc.pile === 'tab') return tabCardRect(s, loc.col, loc.index);
    if (loc.pile === 'waste') return wasteCardRect(s, loc.index == null ? s.waste.length - 1 : loc.index);
    if (loc.pile === 'found') return foundRect(loc.idx);
    return stockRect();
  }

  /** The area a drop counts against: a foundation slot, or a whole column from
      its top card down to the bottom of the stage, so a long run can be
      dropped anywhere below the column rather than exactly on its last card. */
  function targetRect(s, dst) {
    if (dst.pile === 'found') return foundRect(dst.idx);
    const col = s.tab[dst.col];
    const y = col.length ? tabCardRect(s, dst.col, col.length - 1).y : G.tabY;
    return { x: colX(dst.col), y, w: G.cw, h: G.H - y };
  }

  function overlap(a, b) {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  }

  const inRect = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

  /* ---------- suit marks ---------- */

  function drawSuit(ctx, suit, cx, cy, size, colour) {
    const h = size / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = colour || (suit === 1 || suit === 2 ? RED : BLACK);
    ctx.beginPath();
    if (suit === 2) {                                  // diamond
      ctx.moveTo(0, -h); ctx.lineTo(h * 0.72, 0); ctx.lineTo(0, h); ctx.lineTo(-h * 0.72, 0);
      ctx.closePath();
    } else if (suit === 1) {                           // heart
      ctx.moveTo(0, h);
      ctx.bezierCurveTo(-h * 1.25, -h * 0.1, -h * 0.85, -h * 1.05, 0, -h * 0.45);
      ctx.bezierCurveTo(h * 0.85, -h * 1.05, h * 1.25, -h * 0.1, 0, h);
      ctx.closePath();
    } else if (suit === 0) {                           // spade: an upside-down heart on a stem
      ctx.moveTo(0, -h);
      ctx.bezierCurveTo(-h * 1.25, h * 0.15, -h * 0.85, h * 0.95, -h * 0.05, h * 0.42);
      ctx.bezierCurveTo(-h * 0.02, h * 0.7, -h * 0.25, h * 0.88, -h * 0.42, h);
      ctx.lineTo(h * 0.42, h);
      ctx.bezierCurveTo(h * 0.25, h * 0.88, h * 0.02, h * 0.7, h * 0.05, h * 0.42);
      ctx.bezierCurveTo(h * 0.85, h * 0.95, h * 1.25, h * 0.15, 0, -h);
      ctx.closePath();
    } else {                                           // club: three lobes on a stem
      const r = h * 0.42;
      ctx.arc(0, -h * 0.5, r, 0, Math.PI * 2);
      ctx.moveTo(-h * 0.5 + r, h * 0.18);
      ctx.arc(-h * 0.5, h * 0.18, r, 0, Math.PI * 2);
      ctx.moveTo(h * 0.5 + r, h * 0.18);
      ctx.arc(h * 0.5, h * 0.18, r, 0, Math.PI * 2);
      ctx.moveTo(-h * 0.1, 0);
      ctx.rect(-h * 0.1, 0, h * 0.2, h * 0.55);
      ctx.moveTo(-h * 0.42, h);
      ctx.lineTo(-h * 0.06, h * 0.45); ctx.lineTo(h * 0.06, h * 0.45); ctx.lineTo(h * 0.42, h);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  /* ---------- painting a card ---------- */

  const faces = [];
  let backImg = null;

  function newLayer() {
    const c = document.createElement('canvas');
    c.width = G.cw; c.height = G.ch;
    return c;
  }

  /** The pip grid: x in thirds, y as a fraction of the pip area; a third value
      marks pips drawn in the bottom half, which are turned upside down. */
  const PIPS = {
    2: [[1, 0], [1, 1, 1]],
    3: [[1, 0], [1, 0.5], [1, 1, 1]],
    4: [[0, 0], [2, 0], [0, 1, 1], [2, 1, 1]],
    5: [[0, 0], [2, 0], [1, 0.5], [0, 1, 1], [2, 1, 1]],
    6: [[0, 0], [2, 0], [0, 0.5], [2, 0.5], [0, 1, 1], [2, 1, 1]],
    7: [[0, 0], [2, 0], [1, 0.25], [0, 0.5], [2, 0.5], [0, 1, 1], [2, 1, 1]],
    8: [[0, 0], [2, 0], [1, 0.25], [0, 0.5], [2, 0.5], [1, 0.75, 1], [0, 1, 1], [2, 1, 1]],
    9: [[0, 0], [2, 0], [0, 0.333], [2, 0.333], [1, 0.5], [0, 0.667, 1], [2, 0.667, 1], [0, 1, 1], [2, 1, 1]],
    10: [[0, 0], [2, 0], [1, 0.167], [0, 0.333], [2, 0.333], [0, 0.667, 1], [2, 0.667, 1], [1, 0.833, 1], [0, 1, 1], [2, 1, 1]]
  };

  function paintFace(id) {
    const R = SolRules;
    const rank = R.rankOf(id), suit = R.suitOf(id);
    const colour = R.isRed(id) ? RED : BLACK;
    const c = newLayer();
    const ctx = c.getContext('2d');
    const w = G.cw, h = G.ch;

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fdfbf5');
    g.addColorStop(1, '#efe9dc');
    ctx.fillStyle = g;
    roundRect(ctx, 0.5, 0.5, w - 1, h - 1, G.radius);
    ctx.fill();
    ctx.strokeStyle = '#b8b09f';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Index in two corners, the second one turned so the card reads either way up.
    const label = rank === 10 ? '10' : R.RANKS[rank - 1];
    const corner = () => {
      ctx.fillStyle = colour;
      ctx.font = '700 19px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(label, 13, 22);
      drawSuit(ctx, suit, 13, 34, 13, colour);
    };
    corner();
    ctx.save(); ctx.translate(w, h); ctx.rotate(Math.PI); corner(); ctx.restore();

    if (rank === 1) {
      drawSuit(ctx, suit, w / 2, h / 2, suit === 0 ? 52 : 44, colour);
    } else if (rank >= 11) {
      paintCourt(ctx, rank, suit, colour);
    } else {
      // Pips live in a central area clear of the corner indices.
      const px = [w * 0.31, w * 0.5, w * 0.69];
      const top = 26, bottom = h - 26;
      for (const [col, fy, flip] of PIPS[rank]) {
        const x = px[col], y = top + (bottom - top) * fy;
        if (flip) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI); drawSuit(ctx, suit, 0, 0, 19, colour); ctx.restore(); }
        else drawSuit(ctx, suit, x, y, 19, colour);
      }
    }
    return c;
  }

  /** Court cards: a framed panel with a woven fill and the big letter. Ours
      rather than a copy of any deck's royals, and readable at half size. */
  function paintCourt(ctx, rank, suit, colour) {
    const w = G.cw, h = G.ch;
    const x = 17, y = 24, pw = w - 34, ph = h - 48;
    ctx.save();
    roundRect(ctx, x, y, pw, ph, 5);
    ctx.clip();
    ctx.fillStyle = colour === RED ? '#f7e4e2' : '#e3e7f0';
    ctx.fillRect(x, y, pw, ph);
    ctx.strokeStyle = colour === RED ? 'rgba(201,48,60,.22)' : 'rgba(35,40,56,.2)';
    ctx.lineWidth = 1;
    for (let d = -ph; d < pw + ph; d += 7) {
      ctx.beginPath(); ctx.moveTo(x + d, y); ctx.lineTo(x + d + ph, y + ph); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + d + ph, y); ctx.lineTo(x + d, y + ph); ctx.stroke();
    }
    // A plain plate behind the letter so the weave never fights it.
    ctx.fillStyle = 'rgba(253,251,245,.92)';
    roundRect(ctx, w / 2 - 19, h / 2 - 22, 38, 44, 4);
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, pw, ph, 5);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = colour;
    ctx.font = '800 30px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SolRules.RANKS[rank - 1], w / 2, h / 2 + 1);
    drawSuit(ctx, suit, x + pw - 10, y + 11, 12, colour);
    ctx.save(); ctx.translate(x + 10, y + ph - 11); ctx.rotate(Math.PI); drawSuit(ctx, suit, 0, 0, 12, colour); ctx.restore();
    // A small crown for the King, a ring for the Queen, nothing for the Jack.
    if (rank === 13) {
      ctx.beginPath();
      ctx.moveTo(w / 2 - 11, y + 16); ctx.lineTo(w / 2 - 11, y + 8); ctx.lineTo(w / 2 - 5, y + 13);
      ctx.lineTo(w / 2, y + 6); ctx.lineTo(w / 2 + 5, y + 13); ctx.lineTo(w / 2 + 11, y + 8); ctx.lineTo(w / 2 + 11, y + 16);
      ctx.closePath(); ctx.fill();
    } else if (rank === 12) {
      ctx.beginPath(); ctx.arc(w / 2, y + 12, 5, 0, Math.PI * 2);
      ctx.lineWidth = 2.5; ctx.strokeStyle = colour; ctx.stroke();
    }
  }

  /** The back: deep blue with an amber lattice inside a double border. */
  function paintBack() {
    const c = newLayer();
    const ctx = c.getContext('2d');
    const w = G.cw, h = G.ch;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#31548f');
    g.addColorStop(1, '#1f3a68');
    ctx.fillStyle = g;
    roundRect(ctx, 0.5, 0.5, w - 1, h - 1, G.radius);
    ctx.fill();
    ctx.strokeStyle = '#d8ddea';
    ctx.lineWidth = 1;
    ctx.stroke();

    const ix = 7, iy = 7, iw = w - 14, ih = h - 14;
    ctx.save();
    roundRect(ctx, ix, iy, iw, ih, 5);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,190,80,.55)';
    ctx.lineWidth = 1.2;
    const step = 11;
    for (let d = -ih; d < iw + ih; d += step) {
      ctx.beginPath(); ctx.moveTo(ix + d, iy); ctx.lineTo(ix + d + ih, iy + ih); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ix + d + ih, iy); ctx.lineTo(ix + d, iy + ih); ctx.stroke();
    }
    ctx.restore();
    roundRect(ctx, ix, iy, iw, ih, 5);
    ctx.strokeStyle = '#ffc861';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // A centre medallion so the back has a heart to it.
    ctx.fillStyle = '#1f3a68';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffc861'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffc861';
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2 - 10); ctx.lineTo(w / 2 + 8, h / 2); ctx.lineTo(w / 2, h / 2 + 10); ctx.lineTo(w / 2 - 8, h / 2);
    ctx.closePath(); ctx.fill();
    return c;
  }

  function face(id) {
    if (!faces[id]) faces[id] = paintFace(id);
    return faces[id];
  }

  function back() {
    if (!backImg) backImg = paintBack();
    return backImg;
  }

  function drawCard(ctx, id, x, y, faceUp) {
    ctx.drawImage(faceUp ? face(id) : back(), Math.round(x), Math.round(y));
  }

  /* ---------- the table ---------- */

  function drawTable(ctx) {
    const g = ctx.createRadialGradient(G.W / 2, G.H * 0.35, 80, G.W / 2, G.H * 0.5, G.W * 0.85);
    g.addColorStop(0, '#2a6b52');
    g.addColorStop(1, '#173d30');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, G.W, G.H);
  }

  /** An empty slot: a soft sunken outline with an optional mark inside. */
  function drawSlot(ctx, r, mark) {
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    roundRect(ctx, r.x, r.y, r.w, r.h, G.radius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (!mark) return;
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    if (mark === 'A' || mark === 'K') {
      ctx.font = '800 36px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mark, cx, cy + 1);
    } else if (mark === 'recycle') {
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(cx, cy, 15, -Math.PI * 0.35, Math.PI * 1.35); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 4, cy - 19); ctx.lineTo(cx + 13, cy - 11); ctx.lineTo(cx + 3, cy - 6);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.fill();
    } else if (mark === 'cross') {
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 12); ctx.lineTo(cx + 12, cy + 12);
      ctx.moveTo(cx + 12, cy - 12); ctx.lineTo(cx - 12, cy + 12);
      ctx.stroke();
    }
  }

  /** Amber outline used for drop targets and the tap selection. */
  function outline(ctx, r, strong) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,190,70,' + (strong ? '.9' : '.45') + ')';
    ctx.shadowBlur = strong ? 16 : 8;
    ctx.strokeStyle = strong ? '#ffd166' : 'rgba(255,200,90,.8)';
    ctx.lineWidth = strong ? 3.5 : 2.5;
    roundRect(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, G.radius + 2);
    ctx.stroke();
    ctx.restore();
  }

  return {
    G, colX,
    stockRect, wasteRect, foundRect, tabSlotRect, tabCardRect, wasteCardRect, cardRect,
    upStepFor, fanCount, targetRect, overlap, inRect,
    drawSuit, face, back, drawCard, drawTable, drawSlot, outline
  };
})();
