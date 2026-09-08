'use strict';

/* Easy Tilt - drawing.

   The geometry here encodes the one idea that makes the board readable: the
   CEILING IS FIXED. A cup tilted down sits a ball's diameter lower and so has
   room for eight; a level cup holds seven; a raised cup only six. All three
   stacks reach exactly the same height. That is why loading one pan squeezes
   the other, and the danger line makes it visible at a glance.

   Accessibility decisions, taken deliberately because the original struggled here:
   - The weight numeral sits on a flat high-contrast plate, so it stays readable
     whatever the ball beneath it is doing. It is the primary signal, which is
     why every marble wears the same plain ring rather than a per-colour
     silhouette: the symbols were competing with the numbers for attention.
   - The clear flash is drawn UNDER the marbles and capped in opacity, so it
     never hides the board at the moment you most need to read it.
   - A ghost preview shows where the marble will land and which scale it will
     tip, before you commit. */

const TiltRender = (function () {

  const G = {
    W: 600, H: 620,
    cols: 8,
    pitch: 66,
    ballD: 46,
    get ballR() { return this.ballD / 2; },
    firstX: 69,                 // centre of column 0
    cupLevelY: 470,             // cup surface when the see-saw is level
    ceilingY: 148,              // the danger line; every stack tops out here
    depotY: 34,
    depotGap: 32,
    craneY: 108,
    railY: 556,
    weightY: 588
  };

  const COLOURS = [
    { name: 'red',    base: '#e8453c', light: '#ff8b83', dark: '#8e1c16' },
    { name: 'blue',   base: '#3f8ef0', light: '#95c6ff', dark: '#174f96' },
    { name: 'green',  base: '#3fb457', light: '#8ee6a0', dark: '#157030' },
    { name: 'yellow', base: '#e5b52a', light: '#ffe083', dark: '#8d6a00' },
    { name: 'purple', base: '#9b6cf0', light: '#d9c2ff', dark: '#5b2f9e' },
    { name: 'orange', base: '#f0842a', light: '#ffbd82', dark: '#93460a' },
    { name: 'cyan',   base: '#2fc9c0', light: '#96eee9', dark: '#0d7770' },
    { name: 'pink',   base: '#ef6bbf', light: '#ffb6e2', dark: '#96276e' }
  ];

  /* Every drawing routine positions itself through colX, so shifting one number
     moves an entire field. That is how a versus match puts two boards side by
     side without any of them knowing there is a second one. */
  let originX = 0;
  const setOrigin = (x) => { originX = x; };
  const colX = (col) => originX + G.firstX + col * G.pitch;
  const fieldWidth = () => G.firstX * 2 + (G.cols - 1) * G.pitch;

  /** Cup surface height for a column, given its see-saw's tilt state. */
  function cupY(tilt, col) {
    if (tilt === 0) return G.cupLevelY;
    const down = (tilt > 0 && col % 2 === 1) || (tilt < 0 && col % 2 === 0);
    return G.cupLevelY + (down ? G.ballD : -G.ballD);
  }

  /** Centre of the marble at `row` in a column whose cup sits at `cy`. */
  const rowY = (cy, row) => cy - G.ballR - row * G.ballD;

  /* ---------- background ---------- */

  /** The playfield panel only, so two of them can sit on one canvas. */
  function drawBackground(ctx) {
    // Everything here is measured from the field origin, not the canvas, so a
    // second field can be painted beside the first.
    const ox = originX;
    ctx.fillStyle = '#161d2b';
    ctx.fillRect(ox, 0, G.W, G.H);

    // Lane gutters, so the eight columns read as separate shafts.
    for (let c = 0; c < G.cols; c++) {
      const x = colX(c);
      ctx.fillStyle = c % 2 === 0 ? 'rgba(255,255,255,.022)' : 'rgba(255,255,255,.038)';
      ctx.fillRect(x - G.pitch / 2 + 2, G.ceilingY - 14, G.pitch - 4, G.railY - G.ceilingY + 14);
    }

    // The danger line: every stack, whatever its tilt, tops out here.
    ctx.strokeStyle = 'rgba(255,84,112,.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 7]);
    ctx.beginPath();
    ctx.moveTo(ox + 14, G.ceilingY);
    ctx.lineTo(ox + G.W - 14, G.ceilingY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,84,112,.55)';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('OVERLOAD', ox + 16, G.ceilingY - 4);

    // Floor rail the cogs sit on.
    const g = ctx.createLinearGradient(0, G.railY - 8, 0, G.railY + 16);
    g.addColorStop(0, '#39415a');
    g.addColorStop(1, '#222a3d');
    ctx.fillStyle = g;
    ctx.fillRect(ox + 10, G.railY - 8, G.W - 20, 24);
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    ctx.fillRect(ox + 10, G.railY - 8, G.W - 20, 3);
  }

  /* ---------- the see-saw mechanism ---------- */

  /**
   * Two vertical pillars with cupped tops, meshed by a cog at floor level, so
   * one rises exactly as far as the other falls. Not a plank on a pivot.
   */
  function drawScale(ctx, scale, tiltAnim) {
    const left = scale * 2, right = left + 1;
    const lx = colX(left), rx = colX(right);
    const mid = (lx + rx) / 2;

    drawPillar(ctx, lx, animCupY(tiltAnim, left));
    drawPillar(ctx, rx, animCupY(tiltAnim, right));

    // Cog between them, rotated by the tilt so the linkage reads.
    const cogR = 15;
    ctx.save();
    ctx.translate(mid, G.railY);
    ctx.rotate(tiltAnim * 0.5);
    ctx.fillStyle = '#4d5773';
    ctx.beginPath();
    ctx.arc(0, 0, cogR, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = '#68739a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * 6.283;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * cogR * 0.72, Math.sin(a) * cogR * 0.72);
      ctx.lineTo(Math.cos(a) * (cogR + 4), Math.sin(a) * (cogR + 4));
      ctx.stroke();
    }
    ctx.fillStyle = '#2b3550';
    ctx.beginPath();
    ctx.arc(0, 0, cogR * 0.35, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }

  // Smoothed cup height, driven by an animated tilt value in [-1, 1].
  function animCupY(t, col) {
    const down = col % 2 === 1 ? t : -t;         // +1 when this pan is down
    return G.cupLevelY + down * G.ballD;
  }

  function drawPillar(ctx, x, cy) {
    // Shaft with ratchet teeth down its inner edge.
    const w = 14;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#2b3550');
    g.addColorStop(0.5, '#4d5773');
    g.addColorStop(1, '#2b3550');
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, cy, w, G.railY - cy);

    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1.5;
    for (let y = cy + 8; y < G.railY; y += 9) {
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x + w / 2, y);
      ctx.stroke();
    }

    // The cup the bottom marble rests in.
    const cw = G.ballD * 0.92;
    ctx.fillStyle = '#5f6b8b';
    ctx.beginPath();
    ctx.moveTo(x - cw / 2, cy + 12);
    ctx.quadraticCurveTo(x - cw / 2, cy - 4, x, cy - 4);
    ctx.quadraticCurveTo(x + cw / 2, cy - 4, x + cw / 2, cy + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.fillRect(x - cw / 2, cy - 4, cw, 3);
  }

  /* The whole catalogue, in one place, so the game can explain itself and both
     the single player and versus screens tell the same story.
     group: 'basic'  - always in play
            'level'  - arrives as the levels climb
            'arcade' - a match only, earned by clearing, useless until thrown
                       into the other player's field */
  const MARBLE_INFO = [
    ['plain',      'Marble',          'basic',  'Carries a weight. Match three side by side.'],
    ['joker',      'Joker',           'basic',  'Stands in for any colour, or for a Heart. One arrives every fifteen marbles.'],
    ['heart',      'Heart',           'basic',  'What a marble becomes thrown off the edge. Throw a Heart off and it returns a Bomb.'],
    ['stone',      'Stone',           'basic',  'Dead weightless rubble. Never matches. Only a Crusher or a zap removes one.'],
    ['silver',     'Silver Star',     'basic',  'One per level. Three in a row sweeps the whole board, but pays nothing.'],
    ['gold',       'Golden Star',     'basic',  'Two Silver Stars stacked melt into one. Three in a row sweeps the board AND pays.'],
    ['question',   'Question Mark',   'level',  'Stays blank in the depot and only decides what it is the moment you collect it.'],
    ['shadow',     'Shadow',          'level',  'Blacks out its own column for a while. The marbles are unchanged; you just cannot read them.'],

    ['bomb',       'Bomb',            'level',  'Blows a three by three hole. On an empty pan it lies armed instead, and goes off when something lands on it.'],
    ['crusher',    'Crusher',         'level',  'Destroys the entire column it lands in, stones included.'],
    ['sting',      'Sting',           'level',  'Punctures the marbles directly above and below it.'],
    ['zappile',    'Pile Zap',        'level',  'Destroys everything beneath it in the column.'],
    ['zaprow',     'Row Zap',         'level',  'Destroys the whole row it lands in, straight across the board.'],
    ['zaptop',     'Top Zap',         'level',  'Takes the top marble off every column at once.'],
    ['zapdiag',    'Diagonal Zap',    'level',  'Destroys both diagonals crossing it.'],
    ['colzap',     'Colour Zap',      'level',  'Destroys every marble of the colour it lands on, anywhere on the board.'],

    ['tint',       'Tint',            'level',  'Repaints its whole column to the colour it landed on. Destroys nothing.'],
    ['tint3',      'Tint 3x3',        'level',  'Repaints a three by three block to the colour it landed on.'],
    ['tinydepot',  'Tiny Depot',      'level',  'Repaints the bottom marble of every column - the row the see-saws actually move.'],
    ['flash',      'Flash',           'level',  'Repaints two marbles per row inside a triangle spreading down from it.'],
    ['flashdiag',  'Flash Diagonal',  'level',  'Repaints both diagonals beneath it.'],
    ['triflash',   'Triangle Flash',  'level',  'Repaints an entire triangle beneath it. The widest brush in the game.'],
    ['coljoker',   'Colour Joker',    'level',  'Turns every marble of one colour into Jokers.'],
    ['colbomb',    'Colour Bomb',     'level',  'Turns every marble of one colour into armed Bombs. The board becomes a minefield.'],

    ['stonemaker', 'Stonemaker',      'arcade', 'Turns a three by three block of their board to stone.'],
    ['colstone',   'Colour Stone',    'arcade', 'Turns every marble of one colour in their field to stone.'],
    ['tower',      'Tower',           'arcade', 'Fills one of their columns to the brim with stone. Often straight over the top.'],
    ['blocker',    'Blocker',         'arcade', 'Seals the columns either side of it. They cannot drop there until it lifts.'],
    ['twister',    'Twister',         'arcade', 'Scoops one of their pans and scatters the marbles across their field.'],
    ['leveller',   'Leveller',        'arcade', 'Drops every weight in one of their columns to nothing, wrecking their balance.'],
    ['shadowmaker','Shadowmaker',     'arcade', 'Blacks out a three by three block of their board.'],
    ['shadowclock','Shadow Clock',    'arcade', 'Blacks out their entire field for a while.']
  ];

  /**
   * The marble reference card, built from the catalogue above so it can never
   * drift from what the game actually has. Grouped, because 32 entries in one
   * list is a wall rather than an explanation.
   *
   * versus: show the Arcade arsenal as live rather than as a locked preview.
   */
  function marbleList(R, board, versus) {
    const unlocked = board ? R.unlockedKinds(board) : [];
    const GROUPS = [
      ['basic',  'Always in play', ''],
      ['level',  'Arriving as the levels climb',
       'Every one of these needs to land on top of something. Dropped into an empty pan it simply does not work.'],
      ['arcade', versus ? 'The arsenal - earned by clearing' : 'The arsenal - two player games only',
       versus
         ? 'Clear an ODD number of marbles and you earn something useful. Clear an EVEN number and you earn one of these, which does nothing in your own field. You have to catapult it into theirs.'
         : 'These only exist in a two player match, where they are earned by clearing and thrown at the other player.']
    ];

    let html = '<p class="tag" style="margin:0 0 4px">A special is <b>weightless</b> and carries a <b>symbol</b> instead of a number. ' +
               'They turn up in any colour, so it is the symbol that identifies them.</p>';

    for (const [group, title, note] of GROUPS) {
      const rows = MARBLE_INFO.filter((r) => r[2] === group).map((r, i) => {
        const kind = r[0], name = r[1], what = r[3];
        const rule = R.UNLOCK.find((u) => u.kind === kind);
        const locked = !versus && rule && unlocked.indexOf(kind) < 0;
        const dim = locked || (group === 'arcade' && !versus);
        const tag = locked ? ' <span class="gtag">level ' + rule.level + '</span>' : '';
        // Ordinary marbles show a weight; every special is weightless and shows
        // its symbol instead. Colours are cycled purely so the strip is not one
        // flat block of the same hue.
        const swatch = marbleSwatch(R.KIND, kind, i % COLOURS.length,
                                    kind === 'plain' ? 4 : 0, 34);
        return '<div style="opacity:' + (dim ? 0.5 : 1) + ';display:flex;gap:9px;align-items:flex-start">' +
               '<span style="flex:0 0 34px;line-height:0">' + swatch + '</span>' +
               '<span><b>' + name + '</b>' + tag + '<br>' + what + '</span></div>';
      }).join('');
      html += '<h3 style="margin:16px 0 6px;font-size:14px;color:var(--accent)">' + title +
              ' <span style="color:var(--dim);font-weight:400">(' +
              MARBLE_INFO.filter((r) => r[2] === group).length + ')</span></h3>' +
              (note ? '<p class="tag" style="margin:0 0 8px">' + note + '</p>' : '') +
              '<div class="specials">' + rows + '</div>';
    }
    return html;
  }

  /** The same catalogue wrapped as a standalone card. */
  function marbleCard(R, board, versus) {
    return '<div class="card wide"><h2>The marbles</h2>' +
      '<p class="tag">Specials weigh nothing at all, so dropping one never tips a scale.</p>' +
      marbleList(R, board, versus);
  }

  /**
   * A picture of the marble itself, drawn by the same routine that draws it on
   * the board, so the reference can never show something the game does not.
   * A text glyph told you the symbol; it did not tell you what to look for.
   */
  function marbleSwatch(K, kind, colour, weight, px) {
    const side = G.ballD + 14;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const cv = document.createElement('canvas');
    cv.width = Math.round(side * dpr);
    cv.height = Math.round(side * dpr);
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    drawMarble(c, { id: -1, kind, colour, weight }, side / 2, side / 2 - 2, 1, K);
    return '<img alt="" width="' + px + '" height="' + px + '" src="' + cv.toDataURL() + '">';
  }

  function glyphFor(kind) {
    if (kind === 'plain') return '\u25cf';
    if (kind === 'stone') return '\u2b22';
    return EXTRA_GLYPH[kind] || '?';
  }

  /* ---------- marbles ---------- */

  /* One ring for every marble, sized to sit just outside the number plate.
     Earlier builds gave each colour its own silhouette - circle, triangle,
     square - as colour-blind redundancy. On a full board that read as a
     diagram rather than a pile of marbles, so the ring is uniform now and the
     high-contrast weight numeral carries the load instead. */
  function drawRing(ctx, r) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, 0, 6.283);
    ctx.stroke();
  }

  /** One marble, at a given centre and scale. */
  function drawMarble(ctx, m, x, y, scale, K) {
    const r = G.ballR * (scale == null ? 1 : scale);
    if (r <= 0.5) return;

    // _disp holds the appearance the player should still be seeing, when the
    // simulation has already changed the marble but the animation has not
    // reached that event yet.
    const shown = m._disp || m;
    if (shown.kind === K.STONE) return drawStone(ctx, x, y, r);
    // Blacked out by a Shadow. The marble is unchanged underneath - the player
    // has lost the information, not the marble.
    if (m.darkNow) return drawDark(ctx, x, y, r);

    const c = COLOURS[shown.colour % COLOURS.length];
    const extra = shown.kind !== K.PLAIN;

    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.82, r * 0.82, r * 0.3, 0, 0, 6.283);
    ctx.fill();

    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.12, x, y, r);
    g.addColorStop(0, c.light);
    g.addColorStop(0.55, c.base);
    g.addColorStop(1, c.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.283);
    ctx.fill();

    // The specular highlight goes on BEFORE the symbol, or it erases the
    // upper-left of the very thing that carries the colour-blind information.
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.34, y - r * 0.42, r * 0.24, r * 0.15, -0.6, 0, 6.283);
    ctx.fill();

    // A dark underlay beneath the white ring, so it stays visible on the pale
    // colours where a white stroke alone would vanish.
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10,14,22,.55)';
    ctx.lineWidth = Math.max(2.6, r * 0.15);
    drawRing(ctx, r);
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = Math.max(1.6, r * 0.09);
    drawRing(ctx, r);
    ctx.restore();

    ctx.strokeStyle = 'rgba(0,0,0,.32)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.283);
    ctx.stroke();

    if (extra) drawExtraBadge(ctx, shown, x, y, r, K);
    else drawWeight(ctx, m.weight, x, y, r);
  }

  /** The numeral on a flat high-contrast plate, so it reads over any decoration. */
  function drawWeight(ctx, weight, x, y, r) {
    const pr = r * 0.46;
    ctx.fillStyle = 'rgba(12,16,26,.72)';
    ctx.beginPath();
    ctx.arc(x, y, pr, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    const digits = String(weight).length;
    const size = digits > 2 ? 0.46 : (digits > 1 ? 0.62 : 0.8);
    ctx.font = '800 ' + (r * size).toFixed(1) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(weight, x, y + 1);
  }

  /* One glyph per kind. They are grouped so the families read at a glance:
     arrows destroy, circles repaint, and the Arcade arsenal is all heavy
     blocks and shapes you would not want landing in your field. */
  const EXTRA_GLYPH = {
    // The stars had no glyph at all and were falling through to the '?'
    // fallback - the two biggest rewards in the game, drawn as unknowns.
    silver: '☆', gold: '★', joker: '✦', bomb: '✹', crusher: '▼', heart: '♥',
    sting: '✸', question: '?',
    // zaps destroy along a shape
    colzap: '✖', zaptop: '▲', zaprow: '↔', zappile: '↓', zapdiag: '✕',
    // tints and flashes repaint a shape
    tint: '◐', tint3: '◍', flash: '◇', flashdiag: '◈', triflash: '▽', tinydepot: '▁',
    // colour converters
    coljoker: '✧', colbomb: '❂', colstone: '⬢',
    // the arcade arsenal
    stonemaker: '⬣', tower: '⏏', twister: '✺', leveller: '⊟',
    blocker: '⊠', shadowmaker: '◧', shadowclock: '◑', shadow: '◒'
  };

  function drawExtraBadge(ctx, m, x, y, r, K) {
    // Extras never carry a number, because they never carry weight.
    ctx.fillStyle = 'rgba(12,16,26,.78)';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffe08a';
    ctx.font = '700 ' + (r * 0.78).toFixed(1) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(EXTRA_GLYPH[m.kind] || '?', x, y + 1);
  }

  /** A marble you cannot read. Deliberately featureless. */
  function drawDark(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.82, r * 0.82, r * 0.3, 0, 0, 6.283);
    ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#2a3044');
    g.addColorStop(1, '#0a0d15');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.30)';
    ctx.font = '700 ' + (r * 0.9).toFixed(1) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x, y + 1);
  }

  function drawStone(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.82, r * 0.8, r * 0.28, 0, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = '#5a6377';
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * 6.283;
      const rr = r * (0.82 + ((i * 37) % 5) * 0.04);
      i === 0 ? ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
              : ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3b4356';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /* ---------- the weight readout ---------- */

  /**
   * Per-column totals, plus - on each see-saw - the DIFFERENCE. That number is
   * the launch distance, so without it the player subtracts pairs by eye every
   * single turn.
   */
  function drawWeights(ctx, weights, tilts, critical) {
    for (let s = 0; s < tilts.length; s++) {
      const l = s * 2, r = l + 1;
      const d = weights[r] - weights[l];
      const mid = (colX(l) + colX(r)) / 2;
      if (d === 0) {
        ctx.fillStyle = 'rgba(255,255,255,.30)';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('level', mid, G.railY - 28);
      } else {
        ctx.fillStyle = '#ffb02e';
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((d > 0 ? '\u25b6 ' : '\u25c0 ') + Math.abs(d), mid, G.railY - 28);
      }
    }
    for (let c = 0; c < G.cols; c++) {
      const x = colX(c);
      const crit = critical[c];
      ctx.fillStyle = crit ? 'rgba(255,84,112,.22)' : 'rgba(255,255,255,.05)';
      roundRect(ctx, x - G.pitch / 2 + 5, G.weightY - 13, G.pitch - 10, 26, 6);
      ctx.fill();
      ctx.strokeStyle = crit ? 'rgba(255,84,112,.7)' : 'rgba(255,255,255,.10)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = crit ? '#ff8b96' : '#c3ccdf';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(weights[c], x, G.weightY + 1);
    }
  }

  /* ---------- depot and crane ---------- */

  /**
   * Drawn bottom-up. Index 0 is the marble the crane will be handed NEXT, so it
   * hangs in the LOWEST slot, nearest the claw, with the rest of the queue
   * stacked above it. Drawing it at the top instead reads as "this one is next"
   * to anyone used to a preview queue, and it contradicts the gravity they then
   * watch happen when the marble above drops into the vacated slot.
   */
  function drawDepot(ctx, depot, K, craneCol, depth) {
    const slots = depth || 2;
    for (let c = 0; c < G.cols; c++) {
      const x = colX(c);
      for (let d = depot[c].length - 1; d >= 0; d--) {
        const y = G.depotY + (slots - 1 - d) * G.depotGap;
        const s = d === 0 ? 0.7 : 0.58;
        ctx.globalAlpha = d === 0 ? 1 : 0.82;
        drawMarble(ctx, depot[c][d], x, y, s, K);
        ctx.globalAlpha = 1;
      }
      if (c === craneCol) {
        ctx.strokeStyle = 'rgba(255,176,46,.7)';
        ctx.lineWidth = 2;
        roundRect(ctx, x - G.pitch / 2 + 4, G.depotY - 22, G.pitch - 8, G.depotGap + 42, 8);
        ctx.stroke();
      }
    }
  }

  function drawCrane(ctx, col, held, K) {
    const x = colX(col);
    ctx.strokeStyle = '#68739a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(originX + 20, G.craneY - 22);
    ctx.lineTo(originX + G.W - 20, G.craneY - 22);
    ctx.stroke();

    ctx.fillStyle = '#4d5773';
    roundRect(ctx, x - 22, G.craneY - 30, 44, 18, 4);
    ctx.fill();
    ctx.strokeStyle = '#68739a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 12, G.craneY - 12); ctx.lineTo(x - 12, G.craneY - 2);
    ctx.moveTo(x + 12, G.craneY - 12); ctx.lineTo(x + 12, G.craneY - 2);
    ctx.stroke();

    if (held) drawMarble(ctx, held, x, G.craneY + 12, 1, K);
  }

  /* ---------- the ghost preview ---------- */

  /**
   * Before you commit: where it lands, whether that kills you, which marble the
   * tip will throw, and where that one ends up. The original made the player do
   * all of this in their head, which is the best-documented reason people
   * played it for years without understanding it.
   */
  function drawGhost(ctx, info, K) {
    const x = colX(info.col);
    const y = rowY(animCupY(info.cupTilt, info.col), info.row);

    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = info.fatal ? 'rgba(255,84,112,.95)' : 'rgba(255,176,46,.75)';
    ctx.lineWidth = info.fatal ? 3 : 2;
    ctx.beginPath();
    ctx.arc(x, y, G.ballR - 2, 0, 6.283);
    ctx.stroke();
    ctx.setLineDash([]);

    if (info.fatal) {
      // The pan that overflows is often NOT the one being dropped into: a drop
      // can raise a neighbour below its own height, level a see-saw so a full
      // pan loses its eighth slot, or catapult a marble into a pan that is
      // already full. Mark the pan that actually dies, or the warning points at
      // the wrong end of the board.
      const fc = info.fatalCol == null || info.fatalCol < 0 ? info.col : info.fatalCol;
      const elsewhere = fc !== info.col;
      const fx = colX(fc);
      const fy = elsewhere ? rowY(animCupY(info.fatalCupTilt, fc), info.fatalRow) : y;

      if (elsewhere) {
        // Still show where the marble itself goes, then draw a line to the pan
        // it kills, so the connection is visible rather than a guess.
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(255,84,112,.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(fx, fy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.strokeStyle = 'rgba(255,84,112,.95)';
      ctx.lineWidth = 3;
      const k = G.ballR * 0.4;
      ctx.beginPath();
      ctx.moveTo(fx - k, fy - k); ctx.lineTo(fx + k, fy + k);
      ctx.moveTo(fx + k, fy - k); ctx.lineTo(fx - k, fy + k);
      ctx.stroke();
      ctx.fillStyle = '#ff8b96';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(elsewhere ? 'overloads that pan' : 'overloads this pan',
                   fx, fy - G.ballR - 12);
      ctx.restore();
      return;
    }

    if (info.tip) {
      const t = info.tip;
      const fx = colX(t.from);
      const fy = rowY(animCupY(t.fromCupTilt, t.from), t.marbleRow);
      const tx = colX(t.to);
      const ty = rowY(animCupY(t.toCupTilt, t.to), t.landRow);

      // Ring the marble that is about to be thrown.
      ctx.strokeStyle = 'rgba(255,176,46,.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(fx, fy, G.ballR + 3, 0, 6.283);
      ctx.stroke();

      // And the arc it will travel.
      ctx.strokeStyle = 'rgba(255,176,46,.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      if (t.wrapped) {
        const edge = t.dir < 0 ? -G.ballR : G.W + G.ballR;
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo((fx + edge) / 2, fy - 60, edge, fy - 30);
        ctx.stroke();
        ctx.beginPath();
        const inEdge = t.dir < 0 ? G.W + G.ballR : -G.ballR;
        ctx.moveTo(inEdge, ty - 30);
        ctx.quadraticCurveTo((inEdge + tx) / 2, ty - 60, tx, ty);
      } else {
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo((fx + tx) / 2, Math.min(fy, ty) - 70, tx, ty);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Landing marker.
      ctx.strokeStyle = t.landFatal ? 'rgba(255,84,112,.95)' : 'rgba(255,176,46,.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(tx, ty, G.ballR - 4, 0, 6.283);
      ctx.stroke();

      ctx.fillStyle = '#ffb02e';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('throws ' + t.distance + (t.wrapped ? ' (wraps)' : ''), fx, fy - G.ballR - 14);
    }
    ctx.restore();
  }

  return {
    G, COLOURS, EXTRA_GLYPH, MARBLE_INFO, marbleCard, marbleList,
    setOrigin, fieldWidth,
    colX, cupY, animCupY, rowY,
    drawBackground, drawScale, drawPillar, drawMarble, drawWeight, drawStone, drawDark,
    drawWeights, drawDepot, drawCrane, drawGhost
  };
})();
