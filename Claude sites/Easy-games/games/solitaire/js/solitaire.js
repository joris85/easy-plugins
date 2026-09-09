'use strict';

/* Easy Solitaire - the controller.

   The rules engine owns the piles. This file owns everything a player sees and
   touches: where cards sit, what a drag does, what a tap does, the flights
   that carry a card to its new home, the timer and the cards on the overlay.

   ONE INPUT MODEL FOR MOUSE AND TOUCH. Everything comes in as pointer events.
   Press and move past a few pixels and it is a drag; press and release in
   place and it is a tap. Two taps on the same card send it home, which is the
   double-click, and tap-then-tap-elsewhere moves a card without dragging at
   all, which is the comfortable way to play on a phone.

   MOVES ARE INSTANT, FLIGHTS ARE COSMETIC. A move is applied to the rules the
   moment it is decided, and the cards it moved are hidden from their new pile
   while a short flight carries the picture over. So the board is never in a
   state the rules disagree with, and a fast player is never waiting. */

(function () {
  const R = SolRules;
  const V = SolRender;
  const G = V.G;

  const FLIGHT_MS = 140;
  const SNAP_MS = 160;
  const AUTO_MS = 95;              // between cards during auto-complete
  const DRAG_START = 6;            // pixels of movement before a press is a drag
  const DOUBLE_MS = 380;           // two taps closer than this send a card home

  let s = null;                    // the rules state
  let state = 'menu';              // menu | play | auto | won
  let opts = loadOpts();
  let elapsed = 0;
  let running = false;             // the clock starts on the first action
  let pressed = null;              // { src, p } between pointerdown and a decision
  let drag = null;                 // { src, ids, x, y, dx, dy, targets, over }
  let sel = null;                  // tap-tap selection, a source descriptor
  let lastTap = { key: '', at: 0 };
  let flights = [];                // cards in the air
  const hidden = new Set();        // card ids currently in a flight
  let autoClock = 0;
  let stuckTold = false;

  Shell.mount({
    name: 'Solitaire',
    width: G.W, height: G.H, max: 750, pad: 230,
    tools: ['sound', 'pause', 'help'],
    foot: 'Drag a card, or tap it and then tap where it goes &middot; <b>double-click</b> sends a card home &middot; <b>space</b> turns the stock &middot; <b>Z</b> undoes &middot; <b>N</b> deals again',
    rules: `
      <ul>
        <li>Build the four <b>foundations</b> at the top right up by suit, from the Ace to the King. Fill all four and you have won.</li>
        <li>Build the seven <b>columns</b> down in alternating colours: a red six on a black seven. A run of cards in order moves as one.</li>
        <li>Only a <b>King</b> (or a run led by one) may move into an empty column.</li>
        <li>Click the <b>stock</b> at the top left to turn cards onto the waste. Only the top waste card is in play. When the stock runs out, clicking it turns the waste over to go through again.</li>
        <li><b>Draw three</b> turns three cards at a time, so you only reach every third card each pass; <b>draw one</b> shows them all.</li>
        <li>A card can come back down from a foundation to the columns if you need it there.</li>
        <li><b>Undo</b> is unlimited. Once every card in the columns is face up, the rest plays itself.</li>
      </ul>
      <p><b>Standard</b> scoring gives 10 for each card that reaches a foundation, 5 for
         turning a card up or playing one from the waste, takes 15 back for a card
         that leaves a foundation and 20 for recycling the stock in draw three, and
         adds a time bonus for finishing under pace.
         <b>Vegas</b> is money: you start at -52, get 5 for every card that goes home,
         and the stock only goes round once in draw one or three times in draw three.
         Eleven cards home and you have broken even.</p>
      <p><b>Winnable deals</b> are checked by a solver before they are dealt, so there
         is always a way through. It looks for a proof of a win, so the deals it
         passes are hard to lose only in the sense that a line exists, not that it
         is easy to find.</p>`
  });

  Input.init();
  Input.claim(['KeyZ', 'KeyN', 'KeyR', 'KeyD']);
  const ctx = Shell.ctx;
  addTools();

  /* ---------- options ---------- */

  function loadOpts() {
    const d = { draw: 1, scoring: 'standard', winnable: true };
    try {
      const raw = localStorage.getItem('easygames.solitaire.opts');
      if (raw) return Object.assign(d, JSON.parse(raw));
    } catch (err) { /* unavailable or corrupt */ }
    return d;
  }

  function saveOpts() {
    try { localStorage.setItem('easygames.solitaire.opts', JSON.stringify(opts)); } catch (err) { /* ignore */ }
  }

  const variant = () => 'd' + opts.draw + '-' + opts.scoring;
  const variantLabel = (o) => 'Draw ' + o.draw + ' · ' + (o.scoring === 'vegas' ? 'Vegas' : 'Standard');

  /* ---------- sounds, all synthesized ---------- */

  const sfx = {
    place() { Sfx.noise({ freqFrom: 1600, freqTo: 500, dur: 0.06, vol: 0.14, filter: 'bandpass', q: 1.4 }); },
    flip() { Sfx.noise({ freqFrom: 2400, freqTo: 900, dur: 0.05, vol: 0.1, filter: 'bandpass', q: 2 }); },
    home() { Sfx.tone({ type: 'triangle', from: 660, to: 990, dur: 0.09, vol: 0.14 }); },
    draw() { Sfx.noise({ freqFrom: 1200, freqTo: 400, dur: 0.05, vol: 0.1, filter: 'bandpass', q: 1.2 }); },
    bad() { Sfx.tone({ type: 'sine', from: 220, to: 160, dur: 0.09, vol: 0.12 }); },
    undo() { Sfx.tone({ type: 'square', from: 420, to: 300, dur: 0.07, vol: 0.08 }); },
    recycle() { Sfx.noise({ freqFrom: 900, freqTo: 300, dur: 0.16, vol: 0.12 }); }
  };

  /* ---------- new game ---------- */

  function newGame(seed) {
    const base = { draw: opts.draw, scoring: opts.scoring, seed: seed == null ? (Math.random() * 0xffffffff) >>> 0 : seed };
    // The winnable search is synchronous and usually a few hundred
    // milliseconds; twelve tries is the ceiling before we deal honestly unverified.
    if (seed != null) {
      // A restart must reproduce the same deal exactly; the label is re-derived.
      s = R.deal(base);
      if (opts.winnable) s.verified = R.solve(s).status === 'won';
    } else {
      s = opts.winnable ? R.dealWinnable(base, 12) : R.deal(base);
    }
    elapsed = 0;
    running = false;
    pressed = null; drag = null; sel = null;
    flights = []; hidden.clear();
    stuckTold = false;
    state = 'play';
    Shell.hide();
    updateHud();
  }

  function restart() { if (s) newGame(s.seed); }

  /* ---------- doing things ---------- */

  function startClock() { if (!running) { running = true; } }

  /** Move a card or run, with a flight from where it was to where it lands.
      `fromRect` is where the cards are drawn right now, so a drag can hand
      over from the pointer position and a tap from the card's resting place. */
  function tryMove(src, dst, fromRect) {
    if (state !== 'play' || !R.canMove(s, src, dst)) return false;
    const from = fromRect || V.cardRect(s, src);
    const entry = R.applyMove(s, src, dst);
    const ids = R.cardsAt(s, dst.pile === 'found'
      ? { pile: 'found', idx: dst.idx }
      : { pile: 'tab', col: dst.col, index: s.tab[dst.col].length - entry.n });
    const to = dst.pile === 'found' ? V.foundRect(dst.idx) : V.tabCardRect(s, dst.col, s.tab[dst.col].length - entry.n);
    fly(ids, from, to, dst.pile === 'found' ? 0 : V.upStepFor(s, dst.col), FLIGHT_MS);
    startClock();
    if (dst.pile === 'found') sfx.home(); else sfx.place();
    if (entry.flipped) setTimeout(() => sfx.flip(), 80);
    afterAction();
    return true;
  }

  /** Double-click and double-tap: straight to a foundation if one takes it. */
  function tryHome(src) {
    const cards = R.cardsAt(s, src);
    if (!cards || cards.length !== 1) return false;
    const f = R.foundationFor(s, cards[0]);
    if (f < 0) return false;
    return tryMove(src, { pile: 'found', idx: f });
  }

  function turnStock() {
    if (state !== 'play') return false;
    const what = R.draw(s);
    if (!what) { sfx.bad(); return false; }
    if (what === 'draw') sfx.draw(); else sfx.recycle();
    startClock();
    sel = null;
    afterAction();
    return true;
  }

  function undo() {
    if (state !== 'play' || !s.log.length) return false;
    R.undo(s);
    sfx.undo();
    sel = null;
    flights = []; hidden.clear();
    stuckTold = false;
    updateHud();
    return true;
  }

  /** After every action: the HUD, the auto-complete trigger, the stuck note. */
  function afterAction() {
    updateHud();
    if (s.won) { win(); return; }
    if (R.canAutoComplete(s)) { state = 'auto'; autoClock = AUTO_MS; sel = null; return; }
    if (!stuckTold && !R.hasAnyMove(s)) {
      stuckTold = true;
      Shell.banner('No moves left');
    }
  }

  /** One card per tick flies home until the foundations are full. */
  function autoTick(dt) {
    autoClock -= dt * 1000;
    if (autoClock > 0) return;
    autoClock = AUTO_MS;
    const mv = R.autoStep(s);
    if (!mv) { if (s.won) win(); else state = 'play'; return; }
    if (mv.src) {
      // The card has already left its pile, so its old rect is the slot its
      // former pile now ends at: one past the new top.
      const from = mv.src.pile === 'waste'
        ? V.wasteCardRect(s, s.waste.length)
        : V.tabCardRect(s, mv.src.col, s.tab[mv.src.col].length);
      const id = R.top(s.found[mv.dst.idx]);
      fly([id], from, V.foundRect(mv.dst.idx), 0, FLIGHT_MS);
      sfx.home();
    }
    updateHud();
    if (s.won) { state = 'won'; setTimeout(win, FLIGHT_MS + 60); }
  }

  function win() {
    state = 'won';
    running = false;
    const bonus = R.timeBonus(s.scoring, elapsed);
    s.score += bonus;
    const res = Scores.submit('solitaire', s.score, { variant: variant() });
    updateHud();
    Sfx.win();
    Shell.gameOverCard({
      title: 'You won',
      scoreLabel: 'Score',
      score: fmtScore(s.score),
      isNew: res.isNew && res.previous !== null,
      best: fmtScore(res.best),
      extra: `<p class="tag" style="margin-top:8px">${fmtTime(elapsed)} and ${s.moves} moves${s.undos ? ', ' + s.undos + ' undone' : ''}${bonus ? ' · time bonus +' + bonus : ''}</p>`,
      buttons: [{ label: 'Deal again', act: 'again', primary: true }, { label: 'Options', act: 'menu' }]
    });
  }

  /* ---------- flights ---------- */

  function fly(ids, from, to, step, dur) {
    for (const id of ids) hidden.add(id);
    flights.push({ ids, from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, step, t: 0, dur });
  }

  function stepFlights(dt) {
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      f.t += dt * 1000 / f.dur;
      if (f.t >= 1) {
        for (const id of f.ids) hidden.delete(id);
        flights.splice(i, 1);
      }
    }
  }

  /* ---------- hud ---------- */

  function fmtScore(v) {
    if (s && s.scoring === 'vegas') return (v < 0 ? '-' : '') + '$' + Math.abs(v);
    return String(v);
  }

  function updateHud() {
    if (!s) return;
    const best = Scores.best('solitaire', variant());
    Shell.readouts([
      { label: 'Score', value: fmtScore(s.score), accent: true },
      { label: 'Moves', value: s.moves },
      { label: 'Time', value: fmtTime(elapsed) },
      { label: 'Best', value: best === null ? '--' : fmtScore(best) }
    ]);
    Shell.status(fmtScore(s.score), variantLabel(opts) + (s.verified ? ' · winnable' : ''));
  }

  /* ---------- tools ---------- */

  /** Undo and New deal sit with the shell's own tool buttons in the header. */
  function addTools() {
    const mk = (label, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', fn);
      Shell.els.tools.insertBefore(b, Shell.els.tools.firstChild);
      return b;
    };
    mk('New deal', () => { if (state !== 'menu') newGame(); });
    mk('Undo', () => undo());
  }

  /* ---------- pointer input ---------- */

  /** What is under the point: the stock, a face-up card, or an empty slot. */
  function hit(p) {
    if (V.inRect(V.stockRect(), p.x, p.y)) return { kind: 'stock' };
    for (let i = 0; i < 4; i++) {
      const r = V.foundRect(i);
      if (!V.inRect(r, p.x, p.y)) continue;
      if (s.found[i].length) return { kind: 'card', src: { pile: 'found', idx: i }, rect: r };
      return { kind: 'slot', dst: { pile: 'found', idx: i } };
    }
    if (s.waste.length) {
      const r = V.wasteCardRect(s, s.waste.length - 1);
      if (V.inRect(r, p.x, p.y)) return { kind: 'card', src: { pile: 'waste' }, rect: r };
    }
    for (let col = 0; col < 7; col++) {
      const x = V.colX(col);
      if (p.x < x || p.x >= x + G.cw || p.y < G.tabY) continue;
      const cards = s.tab[col];
      for (let i = cards.length - 1; i >= 0; i--) {
        const r = V.tabCardRect(s, col, i);
        if (!V.inRect(r, p.x, p.y)) continue;
        if (i < s.down[col]) return { kind: 'slot', dst: { pile: 'tab', col } };
        return { kind: 'card', src: { pile: 'tab', col, index: i }, rect: r };
      }
      return { kind: 'slot', dst: { pile: 'tab', col } };
    }
    return null;
  }

  /** The column or foundation a card belongs to, as a drop destination. */
  function dstOf(src) {
    return src.pile === 'tab' ? { pile: 'tab', col: src.col } : (src.pile === 'found' ? { pile: 'found', idx: src.idx } : null);
  }

  const srcKey = (src) => src.pile + ':' + (src.col != null ? src.col + ':' + src.index : (src.idx != null ? src.idx : ''));
  const sameSrc = (a, b) => a && b && srcKey(a) === srcKey(b);

  function onDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (state !== 'play') return;
    const p = Touch.canvasPos(Shell.canvas, e);
    const h = hit(p);
    Shell.canvas.setPointerCapture(e.pointerId);
    if (!h) { sel = null; return; }
    if (h.kind === 'stock') { turnStock(); return; }
    if (h.kind === 'slot') {
      if (sel) { if (!tryMove(sel, h.dst)) sfx.bad(); sel = null; }
      return;
    }
    pressed = { src: h.src, rect: h.rect, p };
  }

  function onMove(e) {
    if (!pressed && !drag) return;
    const p = Touch.canvasPos(Shell.canvas, e);
    if (pressed && !drag) {
      if (Math.hypot(p.x - pressed.p.x, p.y - pressed.p.y) < DRAG_START) return;
      const ids = R.cardsAt(s, pressed.src);
      if (!ids) { pressed = null; return; }
      drag = {
        src: pressed.src, ids,
        x: p.x, y: p.y,
        dx: pressed.p.x - pressed.rect.x, dy: pressed.p.y - pressed.rect.y,
        step: pressed.src.pile === 'tab' ? V.upStepFor(s, pressed.src.col) : 0,
        targets: R.targetsFor(s, pressed.src),
        over: null
      };
      for (const id of ids) hidden.add(id);
      sel = null;
      pressed = null;
    }
    if (drag) {
      drag.x = p.x; drag.y = p.y;
      drag.over = bestTarget();
    }
  }

  /** The destination the dragged top card overlaps most, valid or not. */
  function bestTarget() {
    const card = { x: drag.x - drag.dx, y: drag.y - drag.dy, w: G.cw, h: G.ch };
    let best = null, bestA = 0;
    const consider = (dst) => {
      const a = V.overlap(card, V.targetRect(s, dst));
      if (a > bestA) { bestA = a; best = dst; }
    };
    for (let i = 0; i < 4; i++) consider({ pile: 'found', idx: i });
    for (let c = 0; c < 7; c++) consider({ pile: 'tab', col: c });
    return best;
  }

  function onUp() {
    if (drag) {
      const d = drag;
      drag = null;
      for (const id of d.ids) hidden.delete(id);
      const here = { x: d.x - d.dx, y: d.y - d.dy };
      const valid = d.over && d.targets.some((t) => t.pile === d.over.pile && t.col === d.over.col && t.idx === d.over.idx);
      if (valid && tryMove(d.src, d.over, here)) return;
      // Not a legal spot: the cards slide back to where they came from.
      fly(d.ids, here, V.cardRect(s, d.src), d.step, SNAP_MS);
      if (d.over) sfx.bad();
      return;
    }
    if (!pressed) return;
    const src = pressed.src;
    pressed = null;
    const now = performance.now();
    const key = srcKey(src);
    if (lastTap.key === key && now - lastTap.at < DOUBLE_MS) {
      lastTap = { key: '', at: 0 };
      // No foundation takes it: keep it selected, the second tap was not a cancel.
      if (tryHome(src)) sel = null; else { sel = src; sfx.bad(); }
      return;
    }
    lastTap = { key, at: now };
    if (sel) {
      if (sameSrc(sel, src)) { sel = null; return; }
      const dst = dstOf(src);
      if (dst && tryMove(sel, dst)) { sel = null; return; }
      // Tapping somewhere it cannot go re-selects the tapped card instead,
      // which is what people mean far more often than "cancel".
    }
    sel = src;
  }

  function onCancel() {
    if (drag) {
      const d = drag;
      drag = null;
      for (const id of d.ids) hidden.delete(id);
      fly(d.ids, { x: d.x - d.dx, y: d.y - d.dy }, V.cardRect(s, d.src), d.step, SNAP_MS);
    }
    pressed = null;
  }

  Shell.canvas.addEventListener('pointerdown', onDown);
  Shell.canvas.addEventListener('pointermove', onMove);
  Shell.canvas.addEventListener('pointerup', onUp);
  Shell.canvas.addEventListener('pointercancel', onCancel);

  window.addEventListener('keydown', (e) => {
    if (state === 'menu' || Shell.isOpen()) return;
    if (e.code === 'KeyZ') { e.preventDefault(); undo(); }
    else if (e.code === 'Space' || e.code === 'KeyD') { e.preventDefault(); turnStock(); }
    else if (e.code === 'KeyN') newGame();
    else if (e.code === 'KeyR') restart();
  });

  /* ---------- loop ---------- */

  function update(dt) {
    if (state === 'play' && running) {
      elapsed += dt;
      if (Loop.frames % 30 === 0) updateHud();
    }
    if (state === 'auto') autoTick(dt);
    stepFlights(dt);
  }

  function draw() {
    V.drawTable(ctx);
    if (!s) {
      // The menu sits over an empty table rather than a blank one.
      V.drawSlot(ctx, V.stockRect(), null);
      V.drawSlot(ctx, V.wasteRect(), null);
      for (let i = 0; i < 4; i++) V.drawSlot(ctx, V.foundRect(i), 'A');
      for (let c = 0; c < 7; c++) V.drawSlot(ctx, V.tabSlotRect(c), null);
      return;
    }

    // Stock: a thin stack, or the slot showing whether another pass is allowed.
    const st = V.stockRect();
    if (s.stock.length) {
      const layers = Math.min(4, 1 + Math.floor(s.stock.length / 7));
      for (let i = layers - 1; i >= 0; i--) V.drawCard(ctx, 0, st.x - i * 1.5, st.y - i * 1.5, false);
    } else {
      V.drawSlot(ctx, st, s.waste.length ? (R.canRecycle(s) ? 'recycle' : 'cross') : null);
    }
    const passText = s.maxPasses === Infinity ? 'pass ' + (s.passes + 1) : 'pass ' + (s.passes + 1) + ' of ' + s.maxPasses;
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.font = '600 11px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(passText, st.x + st.w / 2, st.y + st.h + 17);

    // Waste: whatever is under the fan as one card, then the fan itself.
    const wr = V.wasteRect();
    const fan = V.fanCount(s);
    if (!s.waste.length) V.drawSlot(ctx, wr, null);
    else {
      const under = s.waste.length - fan;
      if (under > 0 && !hidden.has(s.waste[under - 1])) V.drawCard(ctx, s.waste[under - 1], wr.x, wr.y, true);
      for (let i = under; i < s.waste.length; i++) {
        if (hidden.has(s.waste[i])) continue;
        const r = V.wasteCardRect(s, i);
        V.drawCard(ctx, s.waste[i], r.x, r.y, true);
      }
    }

    for (let i = 0; i < 4; i++) {
      const r = V.foundRect(i);
      const f = s.found[i];
      // With the top card in flight, the one beneath is what shows.
      let k = f.length - 1;
      while (k >= 0 && hidden.has(f[k])) k--;
      if (k >= 0) V.drawCard(ctx, f[k], r.x, r.y, true);
      else V.drawSlot(ctx, r, 'A');
    }

    for (let col = 0; col < 7; col++) {
      const cards = s.tab[col];
      if (!cards.length) { V.drawSlot(ctx, V.tabSlotRect(col), 'K'); continue; }
      for (let i = 0; i < cards.length; i++) {
        if (hidden.has(cards[i])) continue;
        const r = V.tabCardRect(s, col, i);
        V.drawCard(ctx, cards[i], r.x, r.y, i >= s.down[col]);
      }
    }

    // Drop targets glow while dragging; the one under the card glows harder.
    if (drag) {
      for (const t of drag.targets) {
        const r = t.pile === 'found' ? V.foundRect(t.idx)
          : (s.tab[t.col].length ? V.tabCardRect(s, t.col, s.tab[t.col].length - 1) : V.tabSlotRect(t.col));
        const strong = drag.over && drag.over.pile === t.pile && drag.over.col === t.col && drag.over.idx === t.idx;
        V.outline(ctx, r, strong);
      }
    }

    // A tap selection, outlined as one block.
    if (sel && !drag) {
      const ids = R.cardsAt(s, sel);
      if (ids) {
        const r = V.cardRect(s, sel);
        const step = sel.pile === 'tab' ? V.upStepFor(s, sel.col) : 0;
        V.outline(ctx, { x: r.x, y: r.y, w: r.w, h: r.h + step * (ids.length - 1) }, true);
      }
    }

    for (const f of flights) {
      const e = 1 - Math.pow(1 - Math.min(1, f.t), 3);
      const x = f.from.x + (f.to.x - f.from.x) * e;
      const y = f.from.y + (f.to.y - f.from.y) * e;
      drawStack(f.ids, x, y, f.step, true);
    }

    if (drag) drawStack(drag.ids, drag.x - drag.dx, drag.y - drag.dy, drag.step, true);
  }

  /** A run of face-up cards with a lifted shadow, for drags and flights. */
  function drawStack(ids, x, y, step, lifted) {
    ctx.save();
    if (lifted) {
      ctx.shadowColor = 'rgba(0,0,0,.45)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
    }
    for (let i = 0; i < ids.length; i++) V.drawCard(ctx, ids[i], x, y + i * step, true);
    ctx.restore();
  }

  /* ---------- menu ---------- */

  function showMenu() {
    state = 'menu';
    running = false;
    drag = null; pressed = null; sel = null;
    Shell.status('', '');
    const combos = [{ draw: 1, scoring: 'standard' }, { draw: 3, scoring: 'standard' }, { draw: 1, scoring: 'vegas' }, { draw: 3, scoring: 'vegas' }];
    Shell.readouts(combos.map((c) => {
      const b = Scores.best('solitaire', 'd' + c.draw + '-' + c.scoring);
      const val = b === null ? '--' : (c.scoring === 'vegas' ? (b < 0 ? '-' : '') + '$' + Math.abs(b) : b);
      return { label: variantLabel(c), value: val };
    }));
    const seg = (act, pairs, cur) => `<div class="seg">${pairs.map(([v, label]) =>
      `<button data-act="${act}" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    Shell.startCard({
      blurb: 'Klondike. Build the four foundations up from the Ace, and turn every card face up on the way.',
      extra: `
        <div class="rowBetween"><span>Turn from the stock</span>${seg('draw', [[1, 'One card'], [3, 'Three cards']], opts.draw)}</div>
        <div class="rowBetween"><span>Scoring</span>${seg('scoring', [['standard', 'Standard'], ['vegas', 'Vegas']], opts.scoring)}</div>
        <div class="rowBetween"><span>Deals</span>${seg('winnable', [[true, 'Winnable only'], [false, 'Any deal']], opts.winnable)}</div>`,
      buttons: [{ label: 'Deal', act: 'again', primary: true }]
    });
  }

  Shell.on({
    again: () => newGame(),
    menu: () => showMenu(),
    draw: (el) => { opts.draw = +el.dataset.v; saveOpts(); showMenu(); },
    scoring: (el) => { opts.scoring = el.dataset.v; saveOpts(); showMenu(); },
    winnable: (el) => { opts.winnable = el.dataset.v === 'true'; saveOpts(); showMenu(); }
  });

  Loop.start(update, draw, { pauseOnHide: false });
  showMenu();

  /* The debug hook. Drive the rules from the console without touching the
     canvas: EasySolitaire.newGame(42); EasySolitaire.draw(); EasySolitaire.text(). */
  window.EasySolitaire = {
    get state() { return state; },
    get game() { return s; },
    get elapsed() { return elapsed; },
    rules: R,
    render: V,
    opts,
    newGame, restart, showMenu,
    move: (src, dst) => tryMove(src, dst),
    home: (src) => tryHome(src),
    draw: () => turnStock(),
    undo,
    text: () => (s ? R.toText(s) : ''),
    /** Skip every flight, for scripted checks that read the board at once. */
    settle() { for (const f of flights) for (const id of f.ids) hidden.delete(id); flights = []; },
    /** Replace the position with one built from notation; see SolRules.fromText. */
    load(spec) { s = R.fromText(spec); state = 'play'; elapsed = 0; running = false; sel = null; drag = null; Shell.hide(); updateHud(); return s; }
  };
})();
