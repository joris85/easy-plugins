'use strict';

/* Easy Solitaire - the rules engine.

   Klondike, the solitaire everybody means when they say "solitaire". Seven
   tableau columns dealt one to seven cards deep with only the top card face up,
   a stock of the remaining twenty-four, four foundations built up by suit from
   the Ace, and columns built down in alternating colours.

   Pure logic: no canvas, no DOM, seeded randomness. Every rule below is driven
   and asserted from test/rules.test.js in node, which is the only reason it can
   be trusted. The controller never touches a pile directly; it asks this file.

   CARDS ARE INTEGERS. A card is its index in a fresh deck, 0..51, suit first:
   id = suit * 13 + rank - 1, with suits spades, hearts, diamonds, clubs. That
   makes a state a handful of small arrays, which is what keeps the solver's
   cloning and hashing cheap enough to run at deal time.

   FACE-DOWN CARDS ARE A COUNT, not a flag per card. Only the bottom of a column
   is ever face down and it is turned up strictly from the top, so `down[col]`
   is all the information there is. A flip is `down[col]--`, an undo of a flip
   is `down[col]++`.

   UNDO IS A LOG. Every applied move records exactly what it changed, including
   the flip it caused and the score before it, and undo pops the log and
   reverses it. The solver is built on the very same apply and undo, so the
   depth-first search never copies a state: it walks forward and backs out. */

const SolRules = (function () {

  const SUITS = ['S', 'H', 'D', 'C'];          // 0 spades, 1 hearts, 2 diamonds, 3 clubs
  const RANKS = 'A23456789TJQK';

  const rankOf = (id) => id % 13 + 1;
  const suitOf = (id) => (id / 13) | 0;
  const isRed = (id) => { const s = suitOf(id); return s === 1 || s === 2; };
  const cardId = (rank, suit) => suit * 13 + rank - 1;

  /** "QH", "TS", "AC"; the notation the tests build positions with. */
  const name = (id) => RANKS[rankOf(id) - 1] + SUITS[suitOf(id)];
  const parse = (str) => cardId(RANKS.indexOf(str[0]) + 1, SUITS.indexOf(str[1]));

  /* ---------- randomness ---------- */

  /** mulberry32. One 32-bit counter, so a seed reproduces a deal exactly. */
  function makeRng(seed) {
    let a = (seed == null ? 1 : seed) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeDeck() {
    const d = [];
    for (let i = 0; i < 52; i++) d.push(i);
    return d;
  }

  function shuffled(rng) {
    const d = makeDeck();
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  }

  /* ---------- the state ---------- */

  const DEFAULTS = {
    draw: 1,                  // cards turned per stock click, 1 or 3
    scoring: 'standard',      // 'standard' | 'vegas'
    seed: 1
  };

  /** How many times the stock may be gone through. Vegas is the casino deal:
      draw one gets a single pass, draw three gets three. Standard is unlimited. */
  function passesFor(draw, scoring) {
    if (scoring !== 'vegas') return Infinity;
    return draw === 3 ? 3 : 1;
  }

  function makeState(opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    return {
      draw: o.draw,
      scoring: o.scoring,
      maxPasses: passesFor(o.draw, o.scoring),
      seed: o.seed >>> 0,
      tab: [[], [], [], [], [], [], []],
      down: [0, 0, 0, 0, 0, 0, 0],
      found: [[], [], [], []],
      stock: [],                 // last element is the top, the next card drawn
      waste: [],                 // last element is the top, the only playable one
      passes: 0,                 // recycles so far; pass number is passes + 1
      score: o.scoring === 'vegas' ? -52 : 0,   // Vegas: you paid a dollar a card
      moves: 0,
      undos: 0,
      log: [],
      verified: false,           // labelled winnable by the solver
      won: false
    };
  }

  /** The classic deal: column c gets c + 1 cards, all but the last face down. */
  function deal(opts) {
    const s = makeState(opts);
    const deck = shuffled(makeRng(s.seed));
    for (let col = 0; col < 7; col++) {
      for (let k = 0; k <= col; k++) s.tab[col].push(deck.pop());
      s.down[col] = col;
    }
    s.stock = deck;              // 24 left; the top of the deck is the top of the stock
    return s;
  }

  /** Deep copy of the piles without the log, for the solver and for previews. */
  function clone(s) {
    return {
      draw: s.draw, scoring: s.scoring, maxPasses: s.maxPasses, seed: s.seed,
      tab: s.tab.map((c) => c.slice()),
      down: s.down.slice(),
      found: s.found.map((f) => f.slice()),
      stock: s.stock.slice(),
      waste: s.waste.slice(),
      passes: s.passes, score: s.score, moves: s.moves, undos: s.undos,
      log: [], verified: s.verified, won: s.won
    };
  }

  /** Build a position from notation, for tests and the console. Columns are
      arrays of card names with the face-down count alongside. */
  function fromText(spec) {
    const s = makeState(spec.opts);
    (spec.tab || []).forEach((col, i) => { s.tab[i] = col.map(parse); });
    (spec.down || []).forEach((n, i) => { s.down[i] = n; });
    (spec.found || []).forEach((f, i) => { s.found[i] = f.map(parse); });
    s.stock = (spec.stock || []).map(parse);
    s.waste = (spec.waste || []).map(parse);
    if (spec.score != null) s.score = spec.score;
    if (spec.passes != null) s.passes = spec.passes;
    return s;
  }

  function toText(s) {
    const col = (c, i) => c.map((id, k) => (k < s.down[i] ? '(' + name(id) + ')' : name(id))).join(' ');
    return [
      'found: ' + s.found.map((f) => (f.length ? name(f[f.length - 1]) : '--')).join(' '),
      'stock: ' + s.stock.length + '  waste: ' + s.waste.map(name).join(' '),
      ...s.tab.map((c, i) => 'tab' + i + ': ' + col(c, i))
    ].join('\n');
  }

  /* ---------- reading the position ---------- */

  const top = (pile) => (pile.length ? pile[pile.length - 1] : -1);

  /** The cards a source descriptor names, in order bottom to top, or null.
      src is {pile:'waste'} | {pile:'tab', col, index} | {pile:'found', idx}. */
  function cardsAt(s, src) {
    if (src.pile === 'waste') return s.waste.length ? [top(s.waste)] : null;
    if (src.pile === 'found') return s.found[src.idx] && s.found[src.idx].length ? [top(s.found[src.idx])] : null;
    if (src.pile === 'tab') {
      const col = s.tab[src.col];
      if (!col || src.index < s.down[src.col] || src.index >= col.length) return null;
      return col.slice(src.index);
    }
    return null;
  }

  /** Where a card could go up: the foundation index, or -1. An Ace takes the
      first empty slot, so the four piles are never tied to a fixed suit. */
  function foundationFor(s, id) {
    const r = rankOf(id);
    for (let i = 0; i < 4; i++) {
      const f = s.found[i];
      if (f.length && suitOf(top(f)) === suitOf(id) && rankOf(top(f)) === r - 1) return i;
    }
    if (r === 1) for (let i = 0; i < 4; i++) if (!s.found[i].length) return i;
    return -1;
  }

  /** Foundation height per suit, 0..13, whichever slot holds it. */
  function foundHeights(s) {
    const h = [0, 0, 0, 0];
    for (const f of s.found) if (f.length) h[suitOf(f[0])] = f.length;
    return h;
  }

  function canMove(s, src, dst) {
    const cards = cardsAt(s, src);
    if (!cards) return false;
    const c0 = cards[0];
    if (dst.pile === 'found') {
      if (cards.length !== 1 || src.pile === 'found') return false;
      const f = s.found[dst.idx];
      if (!f) return false;
      if (!f.length) return rankOf(c0) === 1;
      return suitOf(top(f)) === suitOf(c0) && rankOf(top(f)) === rankOf(c0) - 1;
    }
    if (dst.pile === 'tab') {
      if (src.pile === 'tab' && src.col === dst.col) return false;
      const col = s.tab[dst.col];
      if (!col) return false;
      if (!col.length) return rankOf(c0) === 13;
      const t = top(col);
      return isRed(t) !== isRed(c0) && rankOf(t) === rankOf(c0) + 1;
    }
    return false;
  }

  /* ---------- scoring ---------- */

  /* Standard is the familiar desktop scheme: 10 for every card that reaches a
     foundation, 5 for a waste card played to the tableau, 5 for turning a card
     face up, 15 back for taking a card off a foundation, 20 for recycling the
     stock in draw three, and a time bonus at the end. It never drops below zero.

     Vegas is money: start at -52 (a dollar a card), win 5 for each card that
     goes home, lose it again if you take one back. Break even at eleven cards. */
  function moveScore(s, src, dst) {
    const vegas = s.scoring === 'vegas';
    if (dst.pile === 'found') return vegas ? 5 : 10;
    if (src.pile === 'found') return vegas ? -5 : -15;
    if (src.pile === 'waste') return vegas ? 0 : 5;
    return 0;
  }

  const FLIP_SCORE = 5;
  const RECYCLE_PENALTY = 20;

  function addScore(s, delta) {
    s.score += delta;
    if (s.scoring !== 'vegas' && s.score < 0) s.score = 0;
  }

  /** The end-of-game bonus in standard scoring, the desktop formula: 700000
      divided by the seconds taken, awarded only to games longer than 30s. */
  function timeBonus(scoring, seconds) {
    if (scoring === 'vegas' || !(seconds >= 30)) return 0;
    return Math.floor(700000 / seconds);
  }

  /* ---------- moving ---------- */

  function isWon(s) {
    return s.found.every((f) => f.length === 13);
  }

  /** Apply a move and log it. Returns the log entry, or null when illegal. */
  function applyMove(s, src, dst) {
    if (!canMove(s, src, dst)) return null;
    const entry = { type: 'move', src, dst, n: 0, flipped: false, scoreBefore: s.score };
    let cards;
    if (src.pile === 'waste') cards = [s.waste.pop()];
    else if (src.pile === 'found') cards = [s.found[src.idx].pop()];
    else {
      cards = s.tab[src.col].splice(src.index);
      // Emptying the face-up part of a column turns the next card over.
      if (s.tab[src.col].length && s.tab[src.col].length === s.down[src.col]) {
        s.down[src.col]--;
        entry.flipped = true;
      }
    }
    entry.n = cards.length;
    if (dst.pile === 'found') s.found[dst.idx].push(cards[0]);
    else for (const c of cards) s.tab[dst.col].push(c);

    addScore(s, moveScore(s, src, dst) + (entry.flipped && s.scoring !== 'vegas' ? FLIP_SCORE : 0));
    s.moves++;
    s.log.push(entry);
    if (isWon(s)) s.won = true;
    return entry;
  }

  function canRecycle(s) {
    return s.stock.length === 0 && s.waste.length > 0 && s.passes + 1 < s.maxPasses;
  }

  /** Is a stock click going to do anything at all? */
  function canDraw(s) {
    return s.stock.length > 0 || canRecycle(s);
  }

  /** Turn the next card(s), or put the waste back as the stock when it is
      empty. Returns 'draw', 'recycle' or null. */
  function draw(s) {
    if (s.stock.length === 0) {
      if (!canRecycle(s)) return null;
      // The first card drawn must be the first card drawn again, so the waste
      // goes back reversed: its bottom becomes the stock's top.
      s.stock = s.waste.reverse();
      s.waste = [];
      s.passes++;
      const entry = { type: 'recycle', scoreBefore: s.score };
      if (s.draw === 3 && s.scoring !== 'vegas') addScore(s, -RECYCLE_PENALTY);
      s.moves++;
      s.log.push(entry);
      return 'recycle';
    }
    const n = Math.min(s.draw, s.stock.length);
    for (let i = 0; i < n; i++) s.waste.push(s.stock.pop());
    s.moves++;
    s.log.push({ type: 'draw', n });
    return 'draw';
  }

  /** Reverse the last logged action exactly. Returns the entry, or null. */
  function undo(s) {
    const e = s.log.pop();
    if (!e) return null;
    if (e.type === 'draw') {
      for (let i = 0; i < e.n; i++) s.stock.push(s.waste.pop());
    } else if (e.type === 'recycle') {
      s.waste = s.stock.reverse();
      s.stock = [];
      s.passes--;
      s.score = e.scoreBefore;
    } else {
      let cards;
      if (e.dst.pile === 'found') cards = [s.found[e.dst.idx].pop()];
      else cards = s.tab[e.dst.col].splice(s.tab[e.dst.col].length - e.n);
      if (e.src.pile === 'waste') s.waste.push(cards[0]);
      else if (e.src.pile === 'found') s.found[e.src.idx].push(cards[0]);
      else {
        for (const c of cards) s.tab[e.src.col].push(c);
        if (e.flipped) s.down[e.src.col]++;
      }
      s.score = e.scoreBefore;
    }
    // The move count is a record of what was played, undos included, so it is
    // not wound back; the undo count sits beside it for honesty.
    s.undos++;
    s.won = false;
    return e;
  }

  /* ---------- helpers for the controller ---------- */

  function allFaceUp(s) {
    return s.down.every((d) => d === 0);
  }

  /** Auto-complete is offered only when it cannot fail: every tableau card is
      face up, so each column is a proper run with its lowest card on top, and
      the lowest card not yet home is therefore always reachable. The stock is
      fine too in draw one with unlimited passes, where every card comes round;
      in draw three or a Vegas deal the stock must already be used up. */
  function canAutoComplete(s) {
    if (s.won || !allFaceUp(s)) return false;
    if (s.stock.length + s.waste.length === 0) return true;
    return s.draw === 1 && s.maxPasses === Infinity;
  }

  /** One step of the auto-complete: send a card home, or turn the stock. */
  function autoStep(s) {
    for (let col = 0; col < 7; col++) {
      const c = s.tab[col];
      if (!c.length) continue;
      const f = foundationFor(s, top(c));
      if (f >= 0) {
        const src = { pile: 'tab', col, index: c.length - 1 }, dst = { pile: 'found', idx: f };
        applyMove(s, src, dst);
        return { src, dst };
      }
    }
    if (s.waste.length) {
      const f = foundationFor(s, top(s.waste));
      if (f >= 0) {
        const src = { pile: 'waste' }, dst = { pile: 'found', idx: f };
        applyMove(s, src, dst);
        return { src, dst };
      }
    }
    if (canDraw(s)) { draw(s); return { type: 'draw' }; }
    return null;
  }

  /** Every legal card move from a source, for drop highlighting. */
  function targetsFor(s, src) {
    const out = [];
    for (let i = 0; i < 4; i++) if (canMove(s, src, { pile: 'found', idx: i })) out.push({ pile: 'found', idx: i });
    for (let c = 0; c < 7; c++) if (canMove(s, src, { pile: 'tab', col: c })) out.push({ pile: 'tab', col: c });
    return out;
  }

  /** Is there any card move or useful draw left? For the stuck warning. */
  function hasAnyMove(s) {
    if (canDraw(s)) return true;
    if (s.waste.length && targetsFor(s, { pile: 'waste' }).length) return true;
    for (let col = 0; col < 7; col++) {
      for (let i = s.down[col]; i < s.tab[col].length; i++) {
        if (targetsFor(s, { pile: 'tab', col, index: i }).length) return true;
      }
    }
    return false;
  }

  /* ---------- the solver ---------- */

  /* A bounded depth-first search over real moves, used to label a deal
     winnable before it is served. It plays forward with applyMove and backs
     out with undo, so it never copies a position, and it remembers every
     position it has stood in so cycling the stock cannot loop.

     Three pieces of Klondike lore keep it fast enough to run at deal time:
     - A card is SAFE to send home when both foundations of the other colour
       have already reached one rank below it, because then nothing will ever
       need to be built on it. A safe move is taken without considering
       alternatives, which removes most of the branching.
     - A partial run is only worth splitting when the card it uncovers can go
       straight to a foundation. Every other split is a wasted branch.
     - A King-led run already sitting on an empty column has nothing to gain by
       moving to another empty column, so it does not.
     Foundation-to-tableau moves are left out entirely; the search is a label,
     not a coach, and the deals it misses are simply dealt again. */

  function isSafeHome(s, id, heights) {
    const r = rankOf(id);
    if (r <= 2) return true;
    const red = isRed(id);
    const others = red ? [heights[0], heights[3]] : [heights[1], heights[2]];
    return others[0] >= r - 1 && others[1] >= r - 1;
  }

  function solverMoves(s) {
    const out = [];
    const heights = foundHeights(s);
    const push = (pri, mv) => { mv.pri = pri; out.push(mv); };

    // Cards that can go home, from the tableau tops and the waste.
    for (let col = 0; col < 7; col++) {
      const c = s.tab[col];
      if (!c.length) continue;
      const f = foundationFor(s, top(c));
      if (f < 0) continue;
      const mv = { src: { pile: 'tab', col, index: c.length - 1 }, dst: { pile: 'found', idx: f } };
      if (isSafeHome(s, top(c), heights)) return [mv];
      push(1, mv);
    }
    if (s.waste.length) {
      const f = foundationFor(s, top(s.waste));
      if (f >= 0) {
        const mv = { src: { pile: 'waste' }, dst: { pile: 'found', idx: f } };
        if (isSafeHome(s, top(s.waste), heights)) return [mv];
        push(1, mv);
      }
    }

    // Tableau to tableau.
    for (let col = 0; col < 7; col++) {
      const c = s.tab[col];
      for (let i = s.down[col]; i < c.length; i++) {
        const whole = i === s.down[col];
        if (!whole && foundationFor(s, c[i - 1]) < 0) continue;
        const kingOnFloor = whole && i === 0 && rankOf(c[0]) === 13;
        for (let to = 0; to < 7; to++) {
          if (to === col) continue;
          if (kingOnFloor && !s.tab[to].length) continue;
          const src = { pile: 'tab', col, index: i }, dst = { pile: 'tab', col: to };
          if (!canMove(s, src, dst)) continue;
          // Uncovering a face-down card is the point of the game; deeper
          // columns first because they are the ones that strand you.
          const pri = whole ? (s.down[col] > 0 ? 1.5 - s.down[col] * 0.01 : 3) : 2;
          push(pri, { src, dst });
        }
      }
    }

    if (s.waste.length) {
      for (let to = 0; to < 7; to++) {
        const src = { pile: 'waste' }, dst = { pile: 'tab', col: to };
        if (canMove(s, src, dst)) push(2.5, { src, dst });
      }
    }

    if (canDraw(s)) push(4, { type: 'draw' });
    out.sort((a, b) => a.pri - b.pri);
    return out;
  }

  /** A position key. Foundations are by suit height so two states that differ
      only in which slot holds which suit are the same state. */
  function hash(s) {
    let k = foundHeights(s).join('') + '|' + s.waste.join('.') + '|' + s.stock.join('.');
    for (let col = 0; col < 7; col++) k += '|' + s.down[col] + ':' + s.tab[col].join('.');
    if (s.maxPasses !== Infinity) k += '|p' + s.passes;
    return k;
  }

  function perform(s, mv) {
    return mv.type === 'draw' ? draw(s) !== null : applyMove(s, mv.src, mv.dst) !== null;
  }

  /** Returns { status: 'won' | 'lost' | 'unknown', moves, nodes }. 'lost' means
      the whole reachable tree was searched within the rules above; 'unknown'
      means the node budget ran out first. */
  function solve(state, opts) {
    const o = Object.assign({ maxNodes: 40000, maxDepth: 400 }, opts || {});
    const s = clone(state);
    const seen = new Set();
    let nodes = 0, solution = null, complete = true;

    function dfs(depth) {
      if (s.won) {
        solution = s.log.map((e) => (e.type === 'move' ? { src: e.src, dst: e.dst } : { type: 'draw' }));
        return true;
      }
      const key = hash(s);
      if (seen.has(key)) return false;
      seen.add(key);
      if (++nodes > o.maxNodes || depth > o.maxDepth) { complete = false; return false; }
      for (const mv of solverMoves(s)) {
        if (!perform(s, mv)) continue;
        if (dfs(depth + 1)) return true;
        undo(s);
        if (!complete) return false;
      }
      return false;
    }

    const won = dfs(0);
    return { status: won ? 'won' : (complete ? 'lost' : 'unknown'), moves: solution, nodes };
  }

  /** Deal until the solver finds a winning line. Tries consecutive seeds so
      the result is still reproducible from the seed it settled on. */
  function dealWinnable(opts, tries, solveOpts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    let s = null;
    const max = tries || 40;
    for (let i = 0; i < max; i++) {
      s = deal(Object.assign({}, o, { seed: (o.seed + i) >>> 0 }));
      const r = solve(s, solveOpts);
      if (r.status === 'won') { s.verified = true; s.solution = r.moves; return s; }
    }
    s.verified = false;
    return s;
  }

  return {
    SUITS, RANKS, DEFAULTS,
    rankOf, suitOf, isRed, cardId, name, parse,
    makeRng, makeDeck, shuffled, passesFor,
    makeState, deal, dealWinnable, clone, fromText, toText,
    top, cardsAt, foundationFor, foundHeights, canMove, moveScore, timeBonus,
    applyMove, canDraw, canRecycle, draw, undo, isWon,
    allFaceUp, canAutoComplete, autoStep, targetsFor, hasAnyMove,
    solve, solverMoves, hash, isSafeHome
  };
})();
