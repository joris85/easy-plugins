'use strict';

/* Easy Tilt - the rules engine.
   Original artwork and code; the mechanics follow the 1997 Software 2000 game
   Swing / Marble Master, whose rules are documented in its PlayStation manual.

   Pure logic: no canvas, no DOM, seeded randomness. Everything is testable by
   stepping it directly, which is how every rule below is verified.

   THE BOARD. Four see-saws, each with a left and a right pan, so eight columns
   coupled in pairs. Above each column sits a two-deep depot of marbles waiting
   to be dropped into it.

   THE DEPOT IS POSITIONAL, and this is the rule players find strangest. The
   crane HOLDS one specific marble, and it keeps holding it however far you
   travel - moving never swaps it for a different one. What the column under you
   decides is not what you throw, it is what you get NEXT: the moment you let go,
   the bottom marble of the depot column you dropped into is handed to you, the
   one above it falls down to take its place, and a fresh marble drops in on top.
   So every drop is really two decisions - where this marble goes, and which
   marble you want to be holding afterwards.

   THE CORE RULE, and the one that makes this game unlike any match-three:
   a see-saw tips when its two pans hold unequal weight, and the pan that RISES
   catapults its top marble away. The marble flies a number of columns equal to
   the weight difference, and it flies TOWARDS THE HEAVY SIDE - up off the
   rising pan and over the pivot. So the numbers printed on the marbles are not
   decoration, they are the aiming mechanism: the weight difference sets the
   distance and the heavier side sets the direction. Being light is what
   launches you; being heavy is what you get aimed at.

   CAPACITY MOVES WITH THE TILT. A pan tilted down holds eight marbles, a level
   pan seven, a raised pan only six. Overloading any pan ends the game. So
   loading one side both raises the other and shrinks what it can hold.

   THE EDGE IS A RING. A marble thrown clean off the board re-enters on the far
   side, transformed: an ordinary marble becomes a Heart, a Heart becomes a Bomb,
   a Bomb reverts to a Heart. */

const TiltRules = (function () {

  const DEFAULTS = {
    scales: 4,                 // see-saws; columns = scales * 2
    colours: 3,                 // grows with the level; see coloursFor
    depotDepth: 2,             // marbles queued above each column
    matchLen: 3,               // horizontally adjacent marbles needed for a trio
    fiveLen: 5,                // vertically stacked marbles that merge into one
    capDown: 8,                // a pan tilted down holds this many
    capLevel: 7,
    capUp: 6,                  // a raised pan holds fewer, which is the squeeze
    weightMin: 1,
    weightMax: 5,              // grows with level; see weightRangeFor
    marblesPerLevel: 50,
    maxCascade: 80,            // safety valve
    specialChance: 0.09,
    jokerEvery: 15,            // a guaranteed Joker enters the depot this often
    bonusWindow: 6,            // seconds the bonus lamps stay lit after a clear
    bonusMax: 4,               // x1 .. x4, as on the original's HUD
    wrapTransforms: true       // thrown off the edge, a marble comes back changed
  };

  /* ---------- marble kinds ---------- */

  const KIND = {
    PLAIN:   'plain',
    JOKER:   'joker',      // counts as any colour
    BOMB:    'bomb',       // blows a 3x3 hole
    CRUSHER: 'crusher',    // destroys the whole pan it lands in
    COLZAP:  'colzap',     // destroys every marble of the colour it lands on
    TINT:    'tint',       // repaints a pan to its top marble's colour
    COLJOKER:'coljoker',   // turns every marble of that colour into Jokers
    ZAPTOP:  'zaptop',     // removes the top marble of every column
    ZAPROW:  'zaprow',     // removes the whole row it lands in
    ZAPPILE: 'zappile',    // removes everything beneath it in the pan
    HEART:   'heart',      // what a marble becomes when thrown off the edge
    STONE:   'stone',      // obstacle, never part of a trio; in the original these
                           // arrive from an opponent in Arcade mode, so nothing
                           // spawns them in single player by design
    SILVER:  'silver',     // awarded for finishing a level
    GOLD:    'gold',       // two silver stars stacked melt into one

    /* The Arcade arsenal. These exist only in a match, they are earned by
       clearing, and - this is the rule that makes them what they are - they do
       NOTHING in your own field. The manual is specific: an attack extra must
       first be thrown into an opponent's field before it releases its effect
       there. So earning one is only half the job; landing it is the other half,
       and the way you land it is the see-saw catapult. */
    /* The rest of the level-gated catalogue. The families are the point: for
       most shapes there is a ZAP that destroys it, a TINT that repaints it and
       a FLASH that converts it - same geometry, three different verbs. */
    QUESTION:  'question',     // becomes any other extra when you collect it
    SHADOW:    'shadow',       // blacks out a column so you cannot read it
    FLASH:     'flash',        // two per row inside a triangle take its colour
    ZAPDIAG:   'zapdiag',      // destroys the diagonals crossing it
    TINYDEPOT: 'tinydepot',    // repaints the bottom marble of every column
    FLASHDIAG: 'flashdiag',    // repaints the diagonals beneath it
    COLBOMB:   'colbomb',      // every marble of one colour becomes a Bomb
    TINT3:     'tint3',        // repaints a 3x3 block
    TRIFLASH:  'triflash',     // repaints a whole triangle beneath it

    STONEMAKER:  'stonemaker',   // a 3x3 block turns to stone
    COLSTONE:    'colstone',     // every marble of one colour turns to stone
    TOWER:       'tower',        // fills a column to the brim with stone
    TWISTER:     'twister',      // scoops a pan and scatters it across the field
    LEVELLER:    'leveller',     // every weight in a column drops to nothing
    BLOCKER:     'blocker',      // seals the columns either side of it
    SHADOWMAKER: 'shadowmaker',  // blacks out a 3x3 block
    SHADOWCLOCK: 'shadowclock',  // blacks out the whole field
    STING:       'sting'         // punctures the marbles above and below it
  };

  /** Earned by an EVEN clear, and inert until thrown into someone else's field. */
  const ATTACKS = [
    KIND.STONEMAKER, KIND.COLSTONE, KIND.TOWER, KIND.TWISTER,
    KIND.LEVELLER, KIND.BLOCKER, KIND.SHADOWMAKER, KIND.SHADOWCLOCK
  ];

  /** Earned by an ODD clear, and useful the moment it lands at home. */
  const HELPFUL = [
    KIND.BOMB, KIND.CRUSHER, KIND.COLZAP, KIND.ZAPPILE,
    KIND.ZAPROW, KIND.ZAPTOP, KIND.ZAPDIAG, KIND.JOKER, KIND.STING,
    KIND.TINT, KIND.TINT3, KIND.COLJOKER, KIND.COLBOMB, KIND.FLASH
  ];

  const isAttack = (m) => !!m && ATTACKS.indexOf(m.kind) >= 0;

  /** Kinds with no landing effect at all. Nothing is wasted by dropping one on
      an empty pan, so the "it needs to land on something" rule must not fire. */
  const PASSIVE = new Set([KIND.PLAIN, KIND.STONE, KIND.HEART, KIND.JOKER,
                           KIND.SILVER, KIND.GOLD, KIND.QUESTION, KIND.BLOCKER]);

  /* The level at which each extra enters play.

     The manual prints an exact level beside each extra: Joker 6, Bomb 8,
     Crusher 10, Color ZAP 12, Tint 14, Color Joker 18, ZAP Top 22, ZAP
     Horizontal 30, Multicolor ZAP 32. That schedule assumed far longer games
     than this version produces - measured play reaches about level 4, so it
     would mean almost nobody ever saw an extra at all. The ORDER below is the
     manual's exactly; only the levels are compressed, which is a deliberate
     playability change rather than a gap in the source. The original shipped an
     editor for exactly this (manual p.16). */
  const UNLOCK = [
    { level: 1, kind: KIND.JOKER },        // 6 in the original
    { level: 2, kind: KIND.BOMB },         // 8
    { level: 2, kind: KIND.CRUSHER },      // 10
    { level: 3, kind: KIND.STING },        // paired with the Cutter in the manual's table
    { level: 3, kind: KIND.COLZAP },       // 12
    { level: 3, kind: KIND.TINT },         // 14
    { level: 4, kind: KIND.FLASH },        // 16
    { level: 4, kind: KIND.COLJOKER },     // 18
    { level: 5, kind: KIND.ZAPDIAG },      // 20
    { level: 5, kind: KIND.ZAPTOP },       // 22
    { level: 6, kind: KIND.TINYDEPOT },    // 24
    { level: 6, kind: KIND.FLASHDIAG },    // 26
    { level: 7, kind: KIND.COLBOMB },      // 28
    { level: 7, kind: KIND.ZAPROW },       // 30
    { level: 8, kind: KIND.ZAPPILE },      // 32
    { level: 8, kind: KIND.TINT3 },        // 34
    { level: 9, kind: KIND.TRIFLASH },     // 36
    { level: 9, kind: KIND.SHADOW },
    { level: 10, kind: KIND.QUESTION }
  ];

  /** Extras carry no weight at all, so they never disturb a balance. */
  const WEIGHTLESS = new Set([
    KIND.JOKER, KIND.BOMB, KIND.CRUSHER, KIND.COLZAP, KIND.TINT,
    KIND.COLJOKER, KIND.ZAPTOP, KIND.ZAPROW, KIND.ZAPPILE, KIND.HEART,
    KIND.STONE, KIND.SILVER, KIND.GOLD,
    KIND.STONEMAKER, KIND.COLSTONE, KIND.TOWER, KIND.TWISTER,
    KIND.LEVELLER, KIND.BLOCKER, KIND.SHADOWMAKER, KIND.SHADOWCLOCK, KIND.STING,
    KIND.QUESTION, KIND.SHADOW, KIND.FLASH, KIND.ZAPDIAG, KIND.TINYDEPOT,
    KIND.FLASHDIAG, KIND.COLBOMB, KIND.TINT3, KIND.TRIFLASH
  ]);

  const isExtra = (m) => m.kind !== KIND.PLAIN && m.kind !== KIND.STONE;

  /* ---------- two boards, one ring ---------- */

  /**
   * A two-player match is two ordinary eight-column boards that have been told
   * about each other. Everything local - matching, flooding, the zaps, capacity,
   * game over - stays inside one board and needs no change at all, which is the
   * whole reason for doing it this way rather than building one wide board and
   * then teaching every rule where the middle is.
   *
   * The only thing that crosses is a THROW. The two fields are treated as a
   * single closed ring of sixteen columns: your column 7 is followed by their
   * column 0, and going left off your column 0 arrives at their column 7. So a
   * hard enough tip on your own see-saw hurls a marble into their field, which
   * is how you attack. There is no separate "send garbage" mechanic; it is the
   * balance rule reaching across the gap.
   */
  function link(a, b, attack) {
    a.neighbour = b; b.neighbour = a;
    a.side = 0; b.side = 1;
    a.attack = b.attack = attack || KIND.STONE;
    return [a, b];
  }

  /** Stamp each event with the board it happened on, for a two-board replay. */
  function emit(events, board, ev) {
    ev.side = board.side || 0;
    events.push(ev);
    return ev;
  }

  /* ---------- deterministic randomness ---------- */

  function makeRng(seed) {
    let a = (seed == null ? 1 : seed) >>> 0;
    const next = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // The whole generator is one 32-bit counter, so a saved game can resume with
    // the same marbles still to come rather than a fresh random stream.
    next.state = () => a >>> 0;
    next.seed = (v) => { a = v >>> 0; };
    return next;
  }

  /* ---------- construction ---------- */

  let nextId = 1;

  function makeBoard(cfg, seed) {
    const c = Object.assign({}, DEFAULTS, cfg || {});
    const cols = c.scales * 2;
    const board = {
      cfg: c,
      cols,
      stacks: Array.from({ length: cols }, () => []),
      depot: Array.from({ length: cols }, () => []),
      held: null,                            // the marble in the crane right now
      since: 0,                              // marbles made since the last Joker
      tilt: new Array(c.scales).fill(0),     // -1 left down, 0 level, +1 right down
      rng: makeRng(seed),
      darkUntil: 0,                          // whole-field blackout, in drops
      side: 0,                               // which half of a versus match
      neighbour: null,                       // the other player's board, if any
      attack: KIND.STONE,                    // what a marble becomes crossing over
      earnExtras: false,                     // Arcade: clears pay out extras
      level: 1,
      dropped: 0,
      score: 0,
      cleared: 0,
      chainBest: 0,
      bonus: 1,                              // the lit lamp: multiplies the next clear
      bonusUntil: null,                      // real time the lamps go out, or null
      over: false
    };
    for (let i = 0; i < cols; i++) fillDepot(board, i);
    return board;
  }

  /** Weights widen as the levels climb, so later boards are harder to balance. */
  function weightRangeFor(board) {
    const c = board.cfg;
    // The clamp must never drop below the configured minimum, or the range
    // inverts and marbles come out lighter than the config allows.
    return { min: c.weightMin, max: Math.max(c.weightMin, Math.min(c.weightMax + Math.floor((board.level - 1) / 3), 13)) };
  }

  function coloursFor(board) {
    return Math.min(board.cfg.colours + Math.floor((board.level - 1) / 3), 7);
  }

  function unlockedKinds(board) {
    const out = [];
    for (const u of UNLOCK) if (board.level >= u.level) out.push(u.kind);
    return out;
  }

  function makeMarble(board, opts) {
    const o = opts || {};
    const kind = o.kind || KIND.PLAIN;
    const r = weightRangeFor(board);
    let weight = o.weight;
    if (weight == null) {
      weight = WEIGHTLESS.has(kind) ? 0
             : (kind === KIND.STONE ? 0
             : r.min + Math.floor(board.rng() * (r.max - r.min + 1)));
    }
    const colour = o.colour == null ? Math.floor(board.rng() * coloursFor(board)) : o.colour;
    return { id: nextId++, kind, colour, weight };
  }

  /**
   * Every fifteenth marble to enter the depot is a multicolour Joker, on a
   * countdown the player can see. It is a guaranteed supply running alongside
   * the random extras, so a board can never dry up completely.
   *
   * It appears IN the depot rather than straight in your hand, which is the
   * whole point: you can see which column caught it and decide whether it is
   * worth steering there to collect it.
   */
  function randomMarble(board) {
    if (board.cfg.jokerEvery > 0 && ++board.since >= board.cfg.jokerEvery) {
      board.since = 0;
      return makeMarble(board, { kind: KIND.JOKER });
    }
    const kinds = unlockedKinds(board);
    if (kinds.length && board.rng() < board.cfg.specialChance) {
      return makeMarble(board, { kind: kinds[Math.floor(board.rng() * kinds.length)] });
    }
    return makeMarble(board);
  }

  /** Marbles still to come before the next guaranteed Joker. */
  function jokerIn(board) {
    return board.cfg.jokerEvery > 0 ? board.cfg.jokerEvery - board.since : 0;
  }

  function fillDepot(board, col) {
    while (board.depot[col].length < board.cfg.depotDepth) {
      board.depot[col].push(randomMarble(board));
    }
  }

  /* ---------- geometry ---------- */

  const scaleOf = (col) => col >> 1;
  const partnerOf = (col) => (col % 2 === 0 ? col + 1 : col - 1);
  const isRightPan = (col) => col % 2 === 1;

  function weightOf(board, col) {
    let w = 0;
    for (const m of board.stacks[col]) w += m.weight;
    return w;
  }

  /** Signed difference for a see-saw: positive means the right pan is heavier. */
  function diffOf(board, scale) {
    return weightOf(board, scale * 2 + 1) - weightOf(board, scale * 2);
  }

  /** How many marbles this pan may hold, which depends on where its end sits. */
  function capacityOf(board, col) {
    return capacityAt(board, col, board.tilt[scaleOf(col)]);
  }

  /** Capacity of a pan under a given tilt, without touching the board. */
  function capacityAt(board, col, t) {
    const c = board.cfg;
    if (t === 0) return c.capLevel;
    const down = (t > 0 && isRightPan(col)) || (t < 0 && !isRightPan(col));
    return down ? c.capDown : c.capUp;
  }

  function refreshTilt(board, scale) {
    const d = diffOf(board, scale);
    board.tilt[scale] = d === 0 ? 0 : (d > 0 ? 1 : -1);
  }

  /* ---------- visual rows ---------- */

  /**
   * A pan tilted DOWN sits one ball diameter lower than a level one, and a
   * raised pan one higher. So two marbles at the same stack index are not
   * necessarily side by side on screen. Matching is horizontal in the world, not
   * in the arrays, so it has to run in VISUAL rows.
   *
   * A happy consequence: tipping a see-saw shifts a whole stack up or down a
   * row, which re-aligns it against its neighbours and can complete a line that
   * was not there a moment ago.
   */
  function rowOffset(board, col) {
    const t = board.tilt[scaleOf(col)];
    if (t === 0) return 0;
    const down = (t > 0 && isRightPan(col)) || (t < 0 && !isRightPan(col));
    return down ? 1 : -1;
  }

  const toVisual = (board, col, row) => row - rowOffset(board, col);
  const toIndex = (board, col, vrow) => vrow + rowOffset(board, col);

  function atVisual(board, col, vrow) {
    if (col < 0 || col >= board.cols) return undefined;
    return board.stacks[col][toIndex(board, col, vrow)];
  }

  /* ---------- matching ---------- */

  function matchable(m) {
    return !!m && m.kind !== KIND.STONE;
  }

  const isStar = (m) => !!m && (m.kind === KIND.SILVER || m.kind === KIND.GOLD);
  const isHeart = (m) => !!m && m.kind === KIND.HEART;

  /**
   * Only an ORDINARY marble carries a colour the player can see.
   *
   * Every marble has a colour field, including extras, because it is cheaper to
   * generate one than to special-case it. But an extra is drawn as its glyph
   * with no colour showing, so matching one on that field clears it for a reason
   * that is invisible on screen. Colour Zap and Colour Joker already guard
   * against exactly this; matching did not, and the victim was the armed Bomb -
   * the one extra that sits on the board waiting - which a colour clear could
   * swallow roughly once every nineteen games.
   */
  const isColoured = (m) => !!m && m.kind === KIND.PLAIN;

  /**
   * Stars and Hearts match by KIND, not by colour.
   *
   * Every marble carries a colour field, but a Star and a Heart are DRAWN as a
   * star and a heart with no colour showing. Matching them on that hidden field
   * clears marbles for a reason the player cannot see, which is the same defect
   * that made Colour Zap eat level rewards. So they form their own groups.
   *
   * The original's own Extras screen settles what a Joker may stand in for:
   * "The Joker is the first Extra, and can replace the heart and any color."
   * The Heart is named alongside colour, not as one - so a Joker joins a Heart
   * run, and Hearts never join a colour run.
   */
  function sameColour(a, b) {
    if (!matchable(a) || !matchable(b)) return false;
    // No Joker can impersonate a Star: a Star trio sweeps the board, and that
    // reward has to be earned with real stars.
    if (isStar(a) || isStar(b)) return isStar(a) && isStar(b) && a.kind === b.kind;
    if (isHeart(a) || isHeart(b)) {
      if (a.kind === KIND.JOKER || b.kind === KIND.JOKER) return true;
      return isHeart(a) && isHeart(b);
    }
    if (a.kind === KIND.JOKER || b.kind === KIND.JOKER) return true;
    return isColoured(a) && isColoured(b) && a.colour === b.colour;
  }

  /**
   * A run carries ONE established identity. Comparing each marble only against
   * its predecessor lets a Joker bridge two different colours, so red-joker-blue
   * would clear - the Joker is meant to stand in for a colour, not to join two.
   */
  function newRun() { return { kind: null, colour: null, cols: [] }; }

  function runAccepts(run, m) {
    if (!matchable(m)) return false;
    // A kind-run (Stars, Hearts) can only start where no colour has been set.
    if (isStar(m) || isHeart(m)) return run.kind === null ? run.colour === null : run.kind === m.kind;
    if (run.kind === KIND.HEART) return m.kind === KIND.JOKER;   // a Joker may stand in for a Heart
    if (run.kind !== null) return false;                 // a star run takes nothing else
    if (m.kind === KIND.JOKER) return true;              // wild, but sets nothing
    if (!isColoured(m)) return false;                    // a working extra is not a colour
    return run.colour === null || run.colour === m.colour;
  }

  function runAdd(run, m, col) {
    const kinded = isStar(m) || isHeart(m);
    if (kinded && run.kind === null) run.kind = m.kind;
    else if (!kinded && m.kind !== KIND.JOKER && run.colour === null) run.colour = m.colour;
    run.cols.push(col);
  }

  const at = (board, col, row) => board.stacks[col] ? board.stacks[col][row] : undefined;

  /**
   * The Jokers at the tail of a run that has just been broken. A Joker is wild,
   * so it can serve the run on its RIGHT as well as the one on its left - but
   * a single left-to-right pass claimed it for the run it closed, and "green
   * Joker red red" never cleared while "red red Joker green" did. A play soak
   * found that standing on the board in 229 games out of 300.
   */
  function trailingJokers(run, look) {
    const out = [];
    for (let i = run.cols.length - 1; i >= 0; i--) {
      const m = look(run.cols[i]);
      if (!m || m.kind !== KIND.JOKER) break;
      out.unshift(run.cols[i]);
    }
    return out;
  }

  /**
   * A trio is three or more of one colour ADJACENT IN A ROW - horizontally only,
   * measured in visual rows so it means "physically side by side".
   * Once found it spreads: every connected marble of that colour, up, down or
   * sideways, goes with it. A vertical run alone never triggers a clear.
   */
  function findClear(board) {
    const cols = board.cols;
    let lo = 0, hi = 0;
    for (let c = 0; c < cols; c++) {
      const off = rowOffset(board, c);
      lo = Math.min(lo, -off);
      hi = Math.max(hi, board.stacks[c].length - 1 - off);
    }

    for (let vrow = lo; vrow <= hi; vrow++) {
      let run = newRun();
      for (let col = 0; col <= cols; col++) {
        const m = col < cols ? atVisual(board, col, vrow) : undefined;
        if (m && runAccepts(run, m)) {
          runAdd(run, m, col);
        } else {
          if (run.cols.length >= board.cfg.matchLen) return floodFrom(board, run, vrow);
          // Carry the trailing Jokers ONLY when a real marble broke the run, so
          // they stay next to what they are joining. An empty cell ends the run
          // outright: carrying across a gap built runs out of marbles that are
          // nowhere near each other, and three Jokers scattered down the row
          // cleared as a trio.
          const carried = m ? trailingJokers(run, (c) => atVisual(board, c, vrow)) : [];
          run = newRun();
          for (const c of carried) runAdd(run, atVisual(board, c, vrow), c);
          if (m && runAccepts(run, m)) runAdd(run, m, col);
        }
      }
    }
    return null;
  }

  /** Grow a trio into every connected marble of the same identity, four ways. */
  function floodFrom(board, run, vrow) {
    const wantKind = run.kind;
    const colour = run.colour;
    const seen = new Set();
    const out = [];
    const stack = run.cols.map((c) => ({ col: c, vrow }));

    const fits = (m) => {
      if (!matchable(m)) return false;
      // Hearts spread through Jokers; Stars do not.
      if (wantKind === KIND.HEART) return m.kind === KIND.HEART || m.kind === KIND.JOKER;
      if (wantKind) return m.kind === wantKind;
      if (isStar(m) || isHeart(m)) return false;
      // A run of nothing but Jokers has no colour. Treating that as "matches
      // anything" would let three Jokers sweep the whole connected board, which
      // is the reward reserved for a trio of Stars - and Colour Joker can mint
      // Jokers board-wide, so it is reachable on purpose.
      if (colour === null) return m.kind === KIND.JOKER;
      return m.kind === KIND.JOKER || (isColoured(m) && m.colour === colour);
    };

    while (stack.length) {
      const cell = stack.pop();
      const key = cell.col + ':' + cell.vrow;
      if (seen.has(key)) continue;
      if (!fits(atVisual(board, cell.col, cell.vrow))) continue;
      seen.add(key);
      out.push({ col: cell.col, row: toIndex(board, cell.col, cell.vrow) });
      stack.push({ col: cell.col, vrow: cell.vrow + 1 });
      stack.push({ col: cell.col, vrow: cell.vrow - 1 });
      stack.push({ col: cell.col + 1, vrow: cell.vrow });
      stack.push({ col: cell.col - 1, vrow: cell.vrow });
    }
    return { cells: out, colour, star: isStar({ kind: wantKind }) ? wantKind : null, kind: wantKind };
  }

  /**
   * Five of a colour stacked in one pan melt into a single marble carrying their
   * combined weight. A trio always takes precedence over a five.
   */
  function findFive(board) {
    for (let col = 0; col < board.cols; col++) {
      const stack = board.stacks[col];

      // Two Silver Stars stacked melt into a Golden Star.
      for (let row = 0; row + 1 < stack.length; row++) {
        if (stack[row].kind === KIND.SILVER && stack[row + 1].kind === KIND.SILVER) {
          return { col, rows: [row, row + 1], toGold: true };
        }
      }

      let run = newRun();
      for (let row = 0; row < stack.length; row++) {
        const m = stack[row];
        const mergeable = runAccepts(run, m) && !isStar(m) && !isHeart(m);
        if (mergeable) {
          runAdd(run, m, row);
        } else {
          const carried = trailingJokers(run, (r) => stack[r]);   // same flaw, vertically
          run = newRun();
          for (const r of carried) runAdd(run, stack[r], r);
          if (runAccepts(run, m) && !isStar(m) && !isHeart(m)) runAdd(run, m, row);
        }
        // A run of nothing but Jokers has no colour to merge INTO. Falling back
        // to a Joker's hidden colour turned five wilds into an unpredictable
        // coloured marble weighing nothing, which is not a thing the player can
        // see coming or plan around. Let them sit there instead.
        if (run.cols.length >= board.cfg.fiveLen && run.colour !== null) {
          return { col, rows: run.cols.slice() };
        }
      }
    }
    return null;
  }

  /* ---------- removal ---------- */

  /** A Bomb going off: three by three, measured in visual rows. */
  function detonate(board, col, idx, events) {
    const vrow = toVisual(board, col, idx);
    const removed = [];
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        // Bounded by the walls. The board is a ring for THROWS, but a blast
        // at column 0 reaching round to column 7 is not something the player
        // guide describes, and in a match column 7 of the ring is the other
        // player's field.
        const c = col + dc;
        if (c < 0 || c >= board.cols) continue;
        const r = toIndex(board, c, vrow + dr);
        if (board.stacks[c][r]) removed.push({ col: c, row: r, marble: board.stacks[c][r] });
      }
    }
    if (!removed.length) return;
    const cells = uniqueCells(removed);
    emit(events, board, { type: 'blast', kind: KIND.BOMB, col, cells: cells.slice() });
    removeCells(board, cells);
    board.score += cells.length * 12;
    relevel(board, events);
  }

  /**
   * One cell can be named twice: a blast at the edge wraps the ring back onto
   * itself, and a Colour Zap sweeps its own colour and then adds itself. Left in,
   * the duplicate splices twice - destroying the marble underneath - and scores
   * twice. Everything that removes cells goes through here first.
   */
  function uniqueCells(cells) {
    const seen = new Set();
    return cells.filter((c) => {
      const k = c.col + ':' + c.row;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  /**
   * Remove a set of {col,row} cells, top down per column so indices stay valid.
   * Rows are de-duplicated: naming one cell twice would splice twice and quietly
   * destroy the marble beneath it. A blast that wraps the ring can genuinely
   * name the same cell twice, so this is reachable, not theoretical.
   */
  function removeCells(board, cells) {
    const byCol = new Map();
    for (const c of cells) {
      if (!byCol.has(c.col)) byCol.set(c.col, new Set());
      byCol.get(c.col).add(c.row);
    }
    for (const [col, rowSet] of byCol) {
      const rows = Array.from(rowSet).sort((a, b) => b - a);
      for (const r of rows) if (board.stacks[col][r]) board.stacks[col].splice(r, 1);
    }
  }

  /* ---------- the drop ---------- */

  /**
   * Hand the crane the bottom marble of a depot column. The column falls by one
   * and a fresh marble enters at the top - that is the gravity the player sees.
   */
  function takeFromDepot(board, col) {
    const m = board.depot[col].shift() || null;
    fillDepot(board, col);
    // A Question Mark stays blank in the depot and only decides what it is at
    // the moment you collect it, which is exactly what makes it a gamble.
    if (m && m.kind === KIND.QUESTION) {
      const pool = board.earnExtras ? HELPFUL.concat(ATTACKS) : HELPFUL;
      m.kind = pool[Math.floor(board.rng() * pool.length)];
      m.weight = 0;
    }
    return m;
  }

  /** Load the crane at the start of a game, before anything has been dropped. */
  function pickUp(board, col) {
    if (isBlocked(board, col)) return board.held;     // a sealed depot hands out nothing
    if (!board.held) board.held = takeFromDepot(board, col);
    return board.held;
  }

  /**
   * Drop the marble the crane is HOLDING into this column, then collect the
   * next one from this same column's depot.
   *
   * The two halves are the whole tactical shape of the game. You cannot shop
   * for a marble by sliding the crane around: what you hold is fixed the moment
   * you receive it. But you choose where you receive the next one from, so a
   * drop is simultaneously a placement and a pick.
   *
   * Returns an ordered event list for the renderer to animate.
   */
  function dropFromDepot(board, col, now) {
    if (board.over) return [{ type: 'rejected', reason: 'over' }];
    if (col < 0 || col >= board.cols) return [{ type: 'rejected', reason: 'range' }];
    if (isBlocked(board, col)) return [{ type: 'rejected', reason: 'blocked' }];
    const marble = board.held || takeFromDepot(board, col);
    if (!marble) return [{ type: 'rejected', reason: 'empty' }];
    board.held = null;
    board.dropped++;
    tickBonus(board, now);
    const events = dropMarble(board, col, marble, now);
    // Reload from where the marble was released, not from where it was taken.
    board.held = takeFromDepot(board, col);
    emit(events, board, { type: 'reload', col, marble: board.held });
    if (board.dropped % board.cfg.marblesPerLevel === 0 && !board.over) {
      board.level++;
      // Finishing a level pays a Silver Star. Stack two for a Gold, line up
      // three of either and the board is swept.
      const best = stockDepot(board, makeMarble(board, { kind: KIND.SILVER, weight: 0 }));
      emit(events, board, { type: 'level', level: board.level, star: best });
    }
    return events;
  }

  /** Drop a specific marble, for tests and for marbles arriving from elsewhere. */
  function dropMarble(board, col, marble, now) {
    if (board.over) return [{ type: 'rejected', reason: 'over' }];
    if (col < 0 || col >= board.cols) return [{ type: 'rejected', reason: 'range' }];
    const events = [];
    const ctx = { flown: new Set(), depth: 1, guard: 0, now: now == null ? null : now };
    landMarble(board, col, marble, events, ctx);
    checkOverflow(board, events);
    return events;
  }

  function landMarble(board, col, marble, events, ctx, flown) {
    // The real cap lives in tipScale, which checks before every recursion, so
    // this is a backstop for direct callers rather than the normal path.
    if (ctx.guard++ > board.cfg.maxCascade) {
      emit(events, board, { type: 'land', col, row: board.stacks[col].length, marble, chain: ctx.depth, flown: !!flown });
      emit(events, board, { type: 'cascadeCapped', col });
      board.stacks[col].push(marble);
      return;
    }

    // flown: it arrived by catapult, so it is already up at travel height and
    // must fall from there. Dropping it from the crane instead teleports it back
    // to the top of the screen and replays the whole descent.
    emit(events, board, { type: 'land', col, row: board.stacks[col].length, marble, chain: ctx.depth, flown: !!flown });
    board.stacks[col].push(marble);

    // Anything arriving in this pan sets off a Bomb that was ALREADY lying
    // dormant in it. Snapshot before the extra acts: a Colour Bomb lays fresh
    // mines in this same column, and firing one of those immediately turned
    // "the board becomes a minefield" into a crater at the landing point.
    const dormant = new Set();
    for (const q of board.stacks[col]) if (q && q.armed && q !== marble) dormant.add(q.id);

    applyExtra(board, col, marble, events, ctx);

    // The guide's losing rule is physical - a column that reaches the crane -
    // and it is checked the moment it happens, AFTER the arriving marble has
    // acted: a Crusher dropped into a full column empties it as it lands, and
    // judging the column first killed the player and then showed them an empty
    // column on the game-over card. Judged at the tilt this landing CAUSES, not
    // the one before it: a raised pan that takes a heavy marble sinks under it,
    // and a sunk pan holds eight. The tilt itself is applied later by tipScale,
    // because changing it here would hide the flip from the throw.
    const d = diffOf(board, scaleOf(col));
    const capNow = capacityAt(board, col, d === 0 ? 0 : (d > 0 ? 1 : -1));
    if (!board.over && board.stacks[col].length > capNow) {
      board.over = true;
      emit(events, board, { type: 'overflow', col, height: board.stacks[col].length, cap: capNow });
    }

    for (let r = board.stacks[col].length - 1; r >= 0; r--) {
      const q = board.stacks[col][r];
      if (q && q.armed && dormant.has(q.id)) { q.armed = false; detonate(board, col, r, events); break; }
    }
    settle(board, events, ctx);
    tipScale(board, scaleOf(col), events, ctx);
  }

  /**
   * Bring the board to rest: clear trios, merge fives, and re-level any see-saw
   * whose weight changed as a result.
   *
   * Re-levelling matters for more than looks. Moving a pan shifts its whole
   * stack by one visual row, which re-aligns it against its neighbours and can
   * complete a line that did not exist a moment ago. So this loops to a fixpoint
   * rather than running once.
   */
  function settle(board, events, ctx) {
    let guard = 0;
    while (guard++ < board.cfg.maxCascade) {
      const clear = findClear(board);
      if (clear && clear.star) {
        // A trio of stars sweeps the whole board. Silver clears it for nothing;
        // Gold clears it and pays, which is what makes Gold worth building.
        const all = [];
        for (let c = 0; c < board.cols; c++) {
          for (let r = 0; r < board.stacks[c].length; r++) all.push({ col: c, row: r, marble: board.stacks[c][r] });
        }
        const gain = clear.star === KIND.GOLD ? scoreFor(all.length, weightOfCells(board, all), board.bonus, board.level) * 2 : 0;
        board.score += gain;
        board.cleared += all.length;
        board.chainBest = Math.max(board.chainBest, ctx.depth);
        emit(events, board, { type: 'starclear', star: clear.star, cells: all, chain: ctx.depth, bonus: board.bonus, gain });
        lightBonus(board, ctx);
        for (let c = 0; c < board.cols; c++) board.stacks[c].length = 0;
        relevel(board, events);
        ctx.depth++;
        continue;
      }
      if (clear) {
        const gain = scoreFor(clear.cells.length, weightOfCells(board, clear.cells), board.bonus, board.level);
        board.score += gain;
        board.cleared += clear.cells.length;
        board.chainBest = Math.max(board.chainBest, ctx.depth);
        emit(events, board, {
          type: 'clear',
          cells: clear.cells.map((c) => Object.assign({}, c, { marble: at(board, c.col, c.row) })),
          colour: clear.colour, chain: ctx.depth, bonus: board.bonus, gain
        });
        lightBonus(board, ctx);
        removeCells(board, clear.cells);
        relevel(board, events);
        // In a match, clearing is how extras are earned, and the PARITY of the
        // clear decides who the extra is for: an odd count pays you something
        // useful, an even count pays you a weapon you still have to deliver.
        // So building a four instead of a three is a deliberate choice to arm
        // yourself rather than help yourself.
        if (board.earnExtras) awardExtra(board, clear.cells.length, events);
        ctx.depth++;
        continue;
      }

      const five = findFive(board);
      if (five && five.toGold) {
        // Two Silver Stars stacked melt into a Golden Star.
        const gold = makeMarble(board, { kind: KIND.GOLD, weight: 0 });
        emit(events, board, { type: 'merge', col: five.col, rows: five.rows.slice(), marble: gold, weight: 0, toGold: true });
        removeCells(board, five.rows.map((r) => ({ col: five.col, row: r })));
        board.stacks[five.col].splice(five.rows[0], 0, gold);
        relevel(board, events);
        continue;
      }
      if (five) {
        const stack = board.stacks[five.col];
        let total = 0, colour = null;
        for (const r of five.rows) {
          total += stack[r].weight;
          if (colour == null && stack[r].kind !== KIND.JOKER) colour = stack[r].colour;
        }
        // findFive guarantees at least one real colour in the run, so there is
        // no all-Joker case left to fall back for.
        const merged = makeMarble(board, { colour, weight: total });
        emit(events, board, { type: 'merge', col: five.col, rows: five.rows.slice(), marble: merged, weight: total });
        removeCells(board, five.rows.map((r) => ({ col: five.col, row: r })));
        board.stacks[five.col].splice(five.rows[0], 0, merged);
        relevel(board, events);
        continue;
      }
      return;
    }
  }

  /**
   * Update every see-saw to match its current weights, reporting the movement.
   * This is settling, not tipping: a scale that merely rebalances after a clear
   * moves, but it does not throw. Only a newly placed marble throws.
   */
  function relevel(board, events) {
    for (let s = 0; s < board.cfg.scales; s++) {
      const d = diffOf(board, s);
      const after = d === 0 ? 0 : (d > 0 ? 1 : -1);
      if (after !== board.tilt[s]) {
        emit(events, board, { type: 'tilt', scale: s, from: board.tilt[s], to: after, diff: d, settling: true });
        board.tilt[s] = after;
      }
    }
  }

  /**
   * Tip a see-saw if the arriving marble changed which way it leans. The pan that
   * RISES throws its top marble, and it flies as many columns as the weight
   * difference between the two pans.
   */
  function tipScale(board, scale, events, ctx) {
    const before = board.tilt[scale];
    const d = diffOf(board, scale);
    const after = d === 0 ? 0 : (d > 0 ? 1 : -1);
    if (after === before) return;

    board.tilt[scale] = after;
    emit(events, board, { type: 'tilt', scale, from: before, to: after, diff: d });
    if (after === 0) { settle(board, events, ctx); return; }   // levelling out throws nothing

    // The lighter pan is the one that rises.
    const light = after > 0 ? scale * 2 : scale * 2 + 1;
    const stack = board.stacks[light];
    const top = stack[stack.length - 1];
    // An empty raised pan has nothing to throw, and a marble flies only once per
    // cascade. Either way the board still moved, so it must be re-checked.
    if (!top || ctx.flown.has(top.id)) { settle(board, events, ctx); return; }

    const fromRow = stack.length - 1;
    stack.pop();
    ctx.flown.add(top.id);
    relevel(board, events);
    // If the cascade budget is about to trip, put it back rather than let it
    // evaporate mid-flight with no landing event.
    if (ctx.guard >= board.cfg.maxCascade) {
      stack.push(top);
      emit(events, board, { type: 'cascadeCapped', col: light });
      return;
    }
    settle(board, events, ctx);

    // DIRECTION IS SET BY THE HEAVY SIDE, not by which pan happens to throw.
    // The rising pan flings its marble up and over the pivot, so it travels
    // TOWARDS the side carrying the weight: weight on the left and the marble
    // goes left, weight on the right and it goes right. Sending it outward
    // instead - away from the pivot - is the intuitive guess and it is wrong,
    // and it silently mirrors every throw on the board.
    const distance = Math.abs(d);
    const dir = after;                             // +1 right pan heavy, -1 left
    const raw = light + dir * distance;

    let landing = landingFor(board, raw);
    // A Blocker seals the columns beside it against throws as well as drops, so
    // a marble bound for a sealed column carries on to the next open one.
    for (let step = 1; isBlocked(landing.board, landing.col) && step <= board.cols * 2; step++) {
      landing = landingFor(board, raw + dir * step);
    }
    const target = landing.board;
    const crossed = target !== board;

    let flying = top;
    if (crossed) {
      if (isAttack(top)) {
        // An earned attack extra crosses as ITSELF, and arriving is what arms
        // it. This is the whole point of the arsenal: you earn it, you carry it,
        // and you have to land it.
        flying = top;
        flying.crossed = true;
      } else {
        // An ordinary marble is converted on the way over: to a Stone in Arcade,
        // which blocks and cannot be matched, or to a Heart in Competition,
        // which is the same thing it would become coming round your own ring.
        flying = makeMarble(target, { kind: target.attack, colour: top.colour, weight: 0 });
      }
      emit(events, board, { type: 'cross', from: light, to: landing.col,
                            toSide: target.side, marble: flying, was: top.kind,
                            armed: isAttack(top) });
    } else if (landing.wrapped && board.cfg.wrapTransforms) {
      flying = transformOnWrap(board, top);
      // Only announce a transformation that happened. Some marbles cross unchanged.
      if (flying !== top) emit(events, board, { type: 'wrap', from: light, marble: flying, was: top.kind });
    }

    emit(events, board, {
      type: 'launch', from: light, row: fromRow, to: landing.col, marble: flying,
      toSide: target.side, crossed,
      // What it looked like BEFORE crossing the edge. A wrapped throw returns a
      // different marble, and showing that one from the moment of launch makes
      // it look as though a marble was swapped out in mid-air.
      original: top,
      distance, wrapped: landing.wrapped, dir, chain: ctx.depth
    });
    ctx.depth++;
    landMarble(target, landing.col, flying, events, ctx, true);
    // Overflow is otherwise only checked at the end of dropMarble, on the board
    // that DROPPED. A marble that crossed can overload the other board right
    // now, and if nobody looks, the victim survives until their own next move -
    // which then gets the blame. A review soak found zero kills ever registering
    // at the attacking drop before this line existed.
    if (crossed) checkOverflow(target, events);
  }

  /**
   * Where a throw from this board actually ends up.
   *
   * Alone, the board is its own ring - off one edge and back on the other. With
   * a neighbour the two fields form ONE ring twice as long, laid out as
   * [mine 0..7][theirs 0..7], so leaving your field to the right arrives at
   * their column 0 and leaving to the left arrives at their column 7. Working in
   * that joint coordinate space means any distance, however large, lands
   * somewhere sensible without special cases.
   */
  function landingFor(board, raw) {
    if (!board.neighbour) {
      const w = wrapColumn(board, raw);
      return { board, col: w.col, wrapped: w.wrapped };
    }
    const mine = board.cols;
    const ring = mine + board.neighbour.cols;
    const at = ((raw % ring) + ring) % ring;
    return at < mine
      ? { board, col: at, wrapped: raw < 0 || raw >= mine }
      : { board: board.neighbour, col: at - mine, wrapped: true };
  }

  /** The board is a ring: fly off one end and you come back on the other. */
  function wrapColumn(board, raw) {
    const n = board.cols;
    const wrapped = raw < 0 || raw >= n;
    return { col: ((raw % n) + n) % n, wrapped };
  }

  /** Crossing the edge changes what a marble is. */
  function transformOnWrap(board, m) {
    /* The German manual is explicit and leaves no room: an ordinary ball thrown
       out of the field returns as a Heart, and a Heart "as well as every other
       special ball" thrown out returns as a Bomb, and the other way round.

       An earlier pass here exempted Stars, on the reasoning that silently
       destroying a level reward could not be intended. That was a design
       opinion dressed up as a bug fix, and the manual contradicts it: throwing a
       Star out of the field really does cost you the Star. It is a risk the
       player is meant to manage, which is why the surviving player guide warns
       you to keep stars and bombs apart. */
    if (m.kind === KIND.HEART) return makeMarble(board, { kind: KIND.BOMB, colour: m.colour });
    if (m.kind === KIND.BOMB) return makeMarble(board, { kind: KIND.HEART, colour: m.colour });
    // "Every other special ball" includes a Stone; isExtra deliberately excludes
    // Stones elsewhere, which is why this cannot use it.
    if (m.kind !== KIND.PLAIN) return makeMarble(board, { kind: KIND.BOMB, colour: m.colour });
    return makeMarble(board, { kind: KIND.HEART, colour: m.colour });
  }

  /* ---------- shapes the extras act on ---------- */

  /* All measured in VISUAL rows, so a shape is what the player sees rather than
     what the arrays happen to hold. A pan tilted down sits a whole marble lower,
     so array indices and screen rows are not the same thing. All bounded by the
     walls of the field: the player guide describes the Flash as spanning "the 2
     walls", and nothing suggests a shape wraps round the edge. */

  /** The 3x3 block centred on a cell. */
  function blockAround(board, col, idx) {
    const vrow = toVisual(board, col, idx);
    const out = [];
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const c = col + dc;
        if (c < 0 || c >= board.cols) continue;
        const r = toIndex(board, c, vrow + dr);
        if (board.stacks[c][r]) out.push({ col: c, row: r });
      }
    }
    return uniqueCells(out);
  }

  /** Both diagonals crossing a cell, out to the edges of the field. */
  function diagonalsFrom(board, col, idx) {
    const vrow = toVisual(board, col, idx);
    const out = [];
    for (const step of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      for (let k = 1; k < board.cols; k++) {
        const c = col + step[0] * k;
        if (c < 0 || c >= board.cols) continue;
        const r = toIndex(board, c, vrow + step[1] * k);
        if (board.stacks[c][r]) out.push({ col: c, row: r });
      }
    }
    return uniqueCells(out);
  }

  /** Only the two diagonals running DOWN from a cell - "beneath", per the guide. */
  function diagonalsBelow(board, col, idx) {
    const vrow = toVisual(board, col, idx);
    const out = [];
    for (const step of [[1, -1], [-1, -1]]) {
      for (let k = 1; k < board.cols; k++) {
        const c = col + step[0] * k;
        if (c < 0 || c >= board.cols) continue;
        const r = toIndex(board, c, vrow + step[1] * k);
        if (board.stacks[c][r]) out.push({ col: c, row: r });
      }
    }
    return uniqueCells(out);
  }

  /** A triangle widening downwards from a cell. */
  function triangleBelow(board, col, idx) {
    const vrow = toVisual(board, col, idx);
    const out = [];
    for (let d = 1; d < board.cols; d++) {
      for (let dc = -d; dc <= d; dc++) {
        const c = col + dc;
        if (c < 0 || c >= board.cols) continue;
        const r = toIndex(board, c, vrow - d);
        if (board.stacks[c][r]) out.push({ col: c, row: r });
      }
    }
    return uniqueCells(out);
  }

  /** Repaint cells. Only marbles that actually show a colour can be repainted. */
  function paint(board, cells, colour, events, except) {
    const before = [], done = [];
    for (const c of cells) {
      const m = at(board, c.col, c.row);
      if (m === except) continue;           // an extra does not act on itself
      if (!isColoured(m)) continue;
      before.push({ id: m.id, colour: m.colour });
      m.colour = colour;
      done.push(c);
    }
    if (done.length) emit(events, board, { type: 'tint', cells: done, colour, before });
    return done.length;
  }

  /** Convert cells to another kind, carrying the old look for the animation. */
  function convertTo(board, cells, kind, events, except) {
    const before = [], done = [];
    for (const c of cells) {
      const m = at(board, c.col, c.row);
      if (m === except) continue;           // an extra does not act on itself
      // A Star is a level reward, not raw material for somebody else's extra.
      if (!m || m.kind === kind || isStar(m)) continue;
      before.push({ id: m.id, kind: m.kind, colour: m.colour, weight: m.weight });
      m.kind = kind;
      m.weight = 0;                     // everything convertible to is weightless
      if (kind === KIND.BOMB) m.armed = false;
      done.push(c);
    }
    if (done.length) emit(events, board, { type: 'jokerise', cells: done, before });
    return done.length;
  }

  /** Black out marbles for a while. They keep their properties; you lose sight. */
  function darken(board, cells, drops, events) {
    const until = board.dropped + drops;
    const done = [];
    for (const c of cells) {
      const m = at(board, c.col, c.row);
      if (!m) continue;
      m.dark = Math.max(m.dark || 0, until);
      done.push(c);
    }
    if (done.length) emit(events, board, { type: 'darken', cells: done, until });
    return done.length;
  }

  /** Every marble of one visible colour, anywhere on this board. */
  function allOfColour(board, colour) {
    const out = [];
    for (let c = 0; c < board.cols; c++) {
      for (let r = 0; r < board.stacks[c].length; r++) {
        if (isColoured(board.stacks[c][r]) && board.stacks[c][r].colour === colour) out.push({ col: c, row: r });
      }
    }
    return out;
  }

  /** The marble an extra landed on, or null if it cannot name one. */
  function targetUnder(board, col, idx) {
    const m = board.stacks[col][idx - 1];
    return isColoured(m) ? m : null;
  }

  /* ---------- extras ---------- */

  function applyExtra(board, col, m, events, ctx) {
    const stack = board.stacks[col];
    const idx = stack.indexOf(m);
    if (idx < 0) return;

    /* AN EXTRA THAT LANDS ON AN EMPTY PAN DOES NOTHING. The surviving player
       guide states it as a general rule and lists it as a tip worth
       remembering: a special ball has to land on top of something to work.
       Previously only Top Zap honoured it, so every other extra fired into an
       empty pan and quietly gave the player a free effect the original never
       granted.

       The Bomb is the documented exception, and not really an exception at all:
       it does not go off either, it lies there armed and detonates when
       something lands on it later. */
    if (idx === 0 && !PASSIVE.has(m.kind) && m.kind !== KIND.BOMB) {
      emit(events, board, { type: 'fizzle', col, row: idx, kind: m.kind });
      return;
    }

    /* AN ATTACK EXTRA DOES NOTHING IN YOUR OWN FIELD. The manual is explicit:
       an extra earned from an even clear "must first be thrown into an
       opponent's field before it releases its effect there". So earning one is
       only half the job - landing it is the other half, and the only way to
       land it is the see-saw catapult. It sits in your pan meanwhile, taking up
       a slot, which is its own kind of pressure. */
    if (isAttack(m) && !m.crossed) {
      emit(events, board, { type: 'inert', col, row: idx, kind: m.kind });
      return;
    }
    const removed = [];
    const push = (c, r) => { if (at(board, c, r)) removed.push({ col: c, row: r, marble: at(board, c, r) }); };

    switch (m.kind) {
      case KIND.BOMB: {
        // Dropped on an empty pan a Bomb lies dormant and goes off when
        // something lands on it later (manual p.21).
        if (idx === 0) { m.armed = true; emit(events, board, { type: 'arm', col, row: idx }); return; }
        detonate(board, col, idx, events);
        return;
      }
      case KIND.CRUSHER: {
        // Takes everything, Stones included - the manual makes the Crusher the
        // only thing that can destroy one.
        for (let r = 0; r < stack.length; r++) push(col, r);
        break;
      }
      case KIND.ZAPPILE: {
        /* Everything beneath it, Stones included. The player guide is specific
           that a Stone can be destroyed "by using a cutter or zap ball", so
           sparing them here made the one marble that is meant to be removable
           by force immune to most of the force in the game.

           That does leave this and the Crusher nearly identical, since an extra
           always lands on top so "everything beneath" is the whole column. In
           the original they are also nearly identical - the Cutter arrives at
           level 10 and the Multicolour Zap at level 32 - so the overlap is
           faithful rather than an oversight. */
        for (let r = 0; r < idx; r++) push(col, r);
        push(col, idx);
        break;
      }
      case KIND.ZAPROW: {
        // A line across the board is a VISUAL row. Using the array index cuts a
        // physically crooked line, and on shorter neighbours cuts nothing.
        const vrow = toVisual(board, col, idx);
        for (let c = 0; c < board.cols; c++) push(c, toIndex(board, c, vrow));
        break;
      }
      case KIND.ZAPTOP: {
        // The extra is itself the top of its own column, so that column's real
        // top sits one below. Without this it is the one column left untouched.
        // (The empty-pan case is handled for every extra at the top of this
        // function, so it cannot reach here.)
        for (let c = 0; c < board.cols; c++) {
          push(c, c === col ? idx - 1 : board.stacks[c].length - 1);
        }
        push(col, idx);
        break;
      }
      case KIND.COLZAP: {
        // targetUnder answers null for a Heart, a Star or another extra: they
        // carry a colour field, but not one anybody can see.
        const target = targetUnder(board, col, idx);
        if (target) {
          for (let c = 0; c < board.cols; c++) {
            for (let r = 0; r < board.stacks[c].length; r++) {
              const q = at(board, c, r);
              // Only ordinary marbles. Every marble carries a random colour
              // field including extras and Stars, which are drawn by kind, so
              // without this a Colour Zap silently eats your level rewards.
              if (q && q.kind === KIND.PLAIN && q.colour === target.colour) push(c, r);
            }
          }
        }
        push(col, idx);
        break;
      }
      case KIND.TINT: {
        // Nothing with a visible colour underneath means nothing to copy. The
        // old fallback painted the column in the Tint's OWN hidden colour,
        // which is a colour nobody had ever seen.
        const top = targetUnder(board, col, idx);
        if (!top) { push(col, idx); break; }
        const colour = top.colour;
        const painted = [];
        const before = [];
        for (let r = 0; r < stack.length; r++) {
          // Only marbles that SHOW a colour. Repainting an extra changes a field
          // nothing draws and nothing matches on any more, so it would report a
          // change the player never sees.
          if (stack[r] !== m && isColoured(stack[r])) {
            before.push({ id: stack[r].id, colour: stack[r].colour });
            stack[r].colour = colour;
            painted.push(r);
          }
        }
        emit(events, board, { type: 'tint', col, rows: painted, colour, before });
        push(col, stack.indexOf(m));
        break;
      }
      case KIND.COLJOKER: {
        const target = targetUnder(board, col, idx);
        if (target) {
          const turned = [];
          const before = [];
          for (let c = 0; c < board.cols; c++) {
            for (let r = 0; r < board.stacks[c].length; r++) {
              const q = at(board, c, r);
              if (matchable(q) && q.colour === target.colour && q.kind === KIND.PLAIN) {
                before.push({ id: q.id, kind: q.kind, colour: q.colour, weight: q.weight });
                q.kind = KIND.JOKER;
                q.weight = 0;          // it is an extra now, and extras weigh nothing
                turned.push({ col: c, row: r });
              }
            }
          }
          emit(events, board, { type: 'jokerise', cells: turned, colour: target.colour, before });
        }
        push(col, stack.indexOf(m));
        break;
      }
      case KIND.ZAPDIAG: {
        // Both diagonals crossing it. The ZAP family destroys; same shapes recur
        // in the TINT family, which repaints instead.
        for (const c of diagonalsFrom(board, col, idx)) push(c.col, c.row);
        push(col, idx);
        break;
      }
      case KIND.STING: {
        // Punctures its immediate neighbours, up and down, and goes with them.
        push(col, idx - 1);
        push(col, idx + 1);
        push(col, idx);
        break;
      }

      /* The repainting family. None of them destroys anything; they change what
         a marble counts as, which is often worth more than removing it. */
      case KIND.TINT3: {
        const t = targetUnder(board, col, idx);
        if (t) paint(board, blockAround(board, col, idx), t.colour, events, m);
        push(col, stack.indexOf(m));
        break;
      }
      case KIND.TRIFLASH: {
        const t = targetUnder(board, col, idx);
        if (t) paint(board, triangleBelow(board, col, idx), t.colour, events, m);
        push(col, stack.indexOf(m));
        break;
      }
      case KIND.FLASHDIAG: {
        const t = targetUnder(board, col, idx);
        if (t) paint(board, diagonalsBelow(board, col, idx), t.colour, events, m);
        push(col, stack.indexOf(m));
        break;
      }
      case KIND.FLASH: {
        // A triangle, but only TWO marbles per row take the colour - which is
        // what separates it from the Triangle Flash it grows up into.
        const t = targetUnder(board, col, idx);
        if (!t) { push(col, stack.indexOf(m)); break; }
        const colour = t.colour;
        const byRow = new Map();
        for (const c of triangleBelow(board, col, idx)) {
          const v = toVisual(board, c.col, c.row);
          if (!byRow.has(v)) byRow.set(v, []);
          byRow.get(v).push(c);
        }
        const picked = [];
        for (const row of byRow.values()) {
          for (let n = 0; n < 2 && row.length; n++) {
            picked.push(row.splice(Math.floor(board.rng() * row.length), 1)[0]);
          }
        }
        paint(board, picked, colour, events, m);
        push(col, stack.indexOf(m));
        break;
      }
      case KIND.TINYDEPOT: {
        // The bottom marble of every column, which is the row a see-saw moves.
        const t = targetUnder(board, col, idx);
        const floor = [];
        for (let c = 0; c < board.cols; c++) if (board.stacks[c].length) floor.push({ col: c, row: 0 });
        if (t) paint(board, floor, t.colour, events, m);
        push(col, stack.indexOf(m));
        break;
      }
      case KIND.COLBOMB: {
        // Turns a whole colour into Bombs. They lie there armed, so the board
        // becomes a minefield rather than a crater.
        const t = targetUnder(board, col, idx);
        if (t) {
          const cells = allOfColour(board, t.colour);
          convertTo(board, cells, KIND.BOMB, events, m);
          for (const c of cells) { const q = at(board, c.col, c.row); if (q) q.armed = true; }
        }
        push(col, stack.indexOf(m));
        break;
      }
      case KIND.SHADOW: {
        // Blacks out its own column. The marbles are unchanged - only your
        // knowledge of them is, which in a game of planning is the real loss.
        const cells = [];
        for (let r = 0; r < stack.length; r++) if (stack[r] !== m) cells.push({ col, row: r });
        darken(board, cells, 12, events);
        push(col, stack.indexOf(m));
        break;
      }

      /* The Arcade arsenal. Everything below here only ever runs on a board it
         was thrown into, because of the isAttack guard at the top. */
      case KIND.STONEMAKER: {
        convertTo(board, blockAround(board, col, idx), KIND.STONE, events, m);
        push(col, stack.indexOf(m));
        break;
      }
      case KIND.COLSTONE: {
        const t = targetUnder(board, col, idx);
        if (t) convertTo(board, allOfColour(board, t.colour), KIND.STONE, events, m);
        push(col, stack.indexOf(m));
        break;
      }
      case KIND.TOWER: {
        // "Full to the brim": exactly to capacity, never past it. It still kills,
        // just not by itself - a full pan dies the moment its see-saw rises and
        // the capacity drops from under it, and there is no room left to work.
        const room = capacityOf(board, col) - stack.length;
        const added = [];
        for (let i = 0; i < room; i++) {
          const stone = makeMarble(board, { kind: KIND.STONE, colour: 0, weight: 0 });
          stack.push(stone);
          added.push({ col, row: stack.length - 1, marble: stone });
        }
        emit(events, board, { type: 'tower', col, cells: added });
        // The Tower becomes part of its own wall. Left as a Tower it could be
        // catapulted again later and fire on whoever it landed on, its owner
        // included, since a delivered weapon stays armed for good.
        convertTo(board, [{ col, row: stack.indexOf(m) }], KIND.STONE, events, null);
        break;
      }
      case KIND.LEVELLER: {
        // Every weight in the column drops to nothing. On a board built entirely
        // out of balance arithmetic, that is a wrecking ball.
        const before = [];
        for (let r = 0; r < stack.length; r++) {
          if (stack[r].weight) { before.push({ id: stack[r].id, weight: stack[r].weight }); stack[r].weight = 0; }
        }
        emit(events, board, { type: 'level0', col, before });
        push(col, stack.indexOf(m));
        break;
      }
      case KIND.TWISTER: {
        // Scoops the pan and scatters it across the field at random. The event
        // says exactly what left and exactly where it landed, so a display copy
        // can follow it step by step; the Twister itself stays at the foot of
        // the emptied column and leaves by the ordinary route below, with a
        // blast of its own - previously it vanished with no event at all.
        const taken = stack.filter((q) => q !== m).map((q, r) => ({ col, row: stack.indexOf(q), marble: q }));
        stack.length = 0;
        stack.push(m);
        const landed = [];
        for (const t of taken) {
          let best = Math.floor(board.rng() * board.cols);
          for (let n = 0; n < board.cols; n++) {
            const c = (best + n) % board.cols;
            if (board.stacks[c].length < capacityOf(board, c)) { best = c; break; }
          }
          board.stacks[best].push(t.marble);
          landed.push({ col: best, row: board.stacks[best].length - 1, marble: t.marble });
        }
        emit(events, board, { type: 'twister', col, taken, landed });
        relevel(board, events);
        push(col, stack.indexOf(m));
        break;
      }
      case KIND.BLOCKER: {
        // It stays put, and the columns either side are sealed for as long as it
        // does: nothing dropped or thrown lands there ("until its gone", in the
        // guide's words). It removes nothing - it takes away their options - and
        // it goes the way a Stone goes, to a Crusher, a zap or a blast.
        const cols = [col - 1, col + 1].filter((c) => c >= 0 && c < board.cols);
        emit(events, board, { type: 'blocked', col, cols });
        break;
      }
      case KIND.SHADOWMAKER: {
        darken(board, blockAround(board, col, idx), 12, events);
        push(col, stack.indexOf(m));
        break;
      }
      case KIND.SHADOWCLOCK: {
        board.darkUntil = Math.max(board.darkUntil, board.dropped + 10);
        emit(events, board, { type: 'blackout', until: board.darkUntil });
        push(col, stack.indexOf(m));
        break;
      }

      default:
        return;                                    // plain, joker, heart, stone: nothing on landing
    }

    if (removed.length) {
      const cells = uniqueCells(removed);
      emit(events, board, { type: 'blast', kind: m.kind, col, cells: cells.slice() });
      removeCells(board, cells);
      board.score += cells.length * 12;
      relevel(board, events);
    }
  }

  /**
   * Pay out the extra a clear has earned, into the roomiest depot column so it
   * is visible and has to be walked to rather than simply appearing in hand.
   */
  /* The manual maps the exact number of marbles cleared to the extra earned,
     with a 75%/25% split where a count can pay either of two. The scan's OCR
     destroys the table layout, but the pairs themselves are legible, and their
     order in the text is the order of increasing clear size. This is that
     reconstruction, graded INFERRED: the pairs are the manual's, the sizes they
     sit at are the reading. Anything beyond the fragments is drawn uniformly
     from what is left of the pool, so the rarest weapons stay rare. */
  const REWARD_TABLE = {
    odd: {
      3: [[KIND.BOMB, 1]],
      5: [[KIND.CRUSHER, 0.75], [KIND.STING, 0.25]],
      7: [[KIND.ZAPPILE, 0.75], [KIND.BOMB, 0.25]]
    },
    even: {
      4: [[KIND.STONEMAKER, 0.75], [KIND.COLSTONE, 0.25]],
      6: [[KIND.TWISTER, 0.75], [KIND.TOWER, 0.25]]
    }
  };

  function rewardFor(board, size) {
    const attack = size % 2 === 0;
    const table = attack ? REWARD_TABLE.even : REWARD_TABLE.odd;
    const row = table[size];
    if (row) {
      let roll = board.rng();
      for (const [kind, p] of row) { if ((roll -= p) < 0) return kind; }
      return row[row.length - 1][0];
    }
    // Past the fragments: whatever the table never names, drawn evenly.
    const named = new Set([].concat(...Object.values(table)).map((r) => r[0]));
    const rest = (attack ? ATTACKS : HELPFUL).filter((k) => !named.has(k));
    return rest[Math.floor(board.rng() * rest.length)];
  }

  /**
   * Put an awarded marble at the front of a depot column without destroying
   * anything special already waiting there. Blind truncation lost 3.8% of
   * earned extras in a review soak: a third award into the same roomiest
   * column pushed the first one off the back before it could be collected.
   * The column with the fewest specials waiting wins; then the roomiest pan.
   * Nothing makes way: the column simply holds one more until it drains, and
   * fillDepot only tops up to the drawn depth, so it drains back on its own.
   * Removing even a plain marble here destroyed something the player could see
   * - 15% of level stars made a visible marble vanish.
   */
  function stockDepot(board, marble) {
    const specials = (c) => board.depot[c].filter((m) => m.kind !== KIND.PLAIN).length;
    let best = 0;
    for (let c = 1; c < board.cols; c++) {
      if (specials(c) < specials(best) ||
          (specials(c) === specials(best) && headroom(board, c) > headroom(board, best))) best = c;
    }
    board.depot[best].unshift(marble);
    return best;
  }

  function awardExtra(board, size, events) {
    const attack = size % 2 === 0;
    const kind = rewardFor(board, size);
    const best = stockDepot(board, makeMarble(board, { kind, weight: 0 }));
    emit(events, board, { type: 'earn', col: best, kind, size, attack });
  }

  /* ---------- scoring ---------- */

  /* The manual states a trio formula but the surviving scan lost the graphic, so
     this shape is our own: it rewards big flood clears and deep chains, and
     scales gently with level. */
  /* The manual names the factors in plain text: the summed WEIGHT of the
     cleared marbles, their number, the level, the bonus, and the difficulty;
     the player guide gives it as their product. So a clear built from heavy
     marbles is worth more than the same clear built from light ones, which is
     what makes the five-stack merge a scoring engine and not just tidying. The
     original's bonus is a bank of lamps that decays with time; this version
     pays the cascade depth instead, since a drop resolves instantly here. */
  function scoreFor(count, weight, bonus, level) {
    return Math.round(Math.max(1, weight) * count * level * bonus);
  }

  /**
   * The bonus lamps, as the manual describes them (CONFIRMED): forming a trio
   * lights ALL the lamps, x1 to x4, and they go out one by one over a few
   * seconds. The next clear pays whatever is still lit. So the reward is not
   * for a long chain of clears but for the NEXT one coming quickly - four
   * times the points inside the first moment, dwindling to nothing extra once
   * the last lamp is dark. An earlier build lit one lamp per clear, which is
   * the same mechanic inverted.
   *
   * The engine has no clock of its own; the controller passes the time in with
   * each drop and ticks it between drops so the HUD can show the lamps dying.
   * Headless callers that pass nothing keep the lamps lit indefinitely, which
   * keeps every replay deterministic.
   */
  function tickBonus(board, now) {
    if (now == null || board.bonusUntil == null) return false;
    const remaining = board.bonusUntil - now;
    const lit = remaining <= 0 ? 1 : 1 + Math.ceil((board.cfg.bonusMax - 1) * remaining / board.cfg.bonusWindow);
    if (remaining <= 0) board.bonusUntil = null;
    if (lit === board.bonus) return false;
    board.bonus = lit;
    return true;
  }

  function lightBonus(board, ctx) {
    board.bonus = board.cfg.bonusMax;
    if (ctx.now != null) board.bonusUntil = ctx.now + board.cfg.bonusWindow;
  }

  const weightOfCells = (board, cells) =>
    cells.reduce((w, c) => w + ((at(board, c.col, c.row) || {}).weight || 0), 0);

  /* ---------- end of game ---------- */

  function checkOverflow(board, events) {
    if (board.over) return;                  // a landing may already have called it
    for (let col = 0; col < board.cols; col++) {
      if (board.stacks[col].length > capacityOf(board, col)) {
        board.over = true;
        emit(events, board, { type: 'overflow', col, height: board.stacks[col].length, cap: capacityOf(board, col) });
        return;
      }
    }
  }

  /* ---------- save and restore ---------- */

  /**
   * A game as a plain object: small enough for localStorage, and complete enough
   * that the restored board is indistinguishable from the saved one - including
   * the position in the random stream, so even the marbles still to come match.
   */
  function serialize(board) {
    const pack = (x) => x && { i: x.id, k: x.kind, c: x.colour, w: x.weight, a: x.armed ? 1 : 0,
                              d: x.dark || 0, x: x.crossed ? 1 : 0 };
    return {
      v: 1,
      cfg: board.cfg,
      stacks: board.stacks.map((col) => col.map(pack)),
      depot: board.depot.map((col) => col.map(pack)),
      held: pack(board.held),
      // Not board state - the controller parks the crane column here so it can
      // ride along in the save. It is the one visible thing a resume would
      // otherwise get wrong, since the player chose where it was standing.
      crane: board.crane == null ? null : board.crane,
      tilt: board.tilt.slice(),
      rng: board.rng.state(),
      level: board.level, dropped: board.dropped, score: board.score,
      cleared: board.cleared, chainBest: board.chainBest,
      bonus: board.bonus,
      since: board.since, over: !!board.over,
      darkUntil: board.darkUntil || 0
    };
  }

  /**
   * Rebuild a board from serialize(). Returns null on ANYTHING unrecognisable.
   *
   * This parses data that has been sitting in localStorage, where it can be
   * stale from an older version, truncated by a crash, or edited by hand. It
   * must never throw: the caller's fallback is to start a new game, and an
   * exception here happens at boot and takes the whole page with it.
   */
  function restore(data) {
    try {
      return rebuild(data);
    } catch (e) {
      return null;
    }
  }

  function rebuild(data) {
    if (!data || data.v !== 1) return null;
    // The cfg is deliberately NOT taken from the save. Storing it means any
    // future change to DEFAULTS would never reach a game already in progress -
    // the stale config would be restored verbatim forever. Rebuilding from
    // DEFAULTS instead makes a shape change invalidate old saves, which is the
    // honest outcome, and it stops a hand-edited cfg from steering the engine.
    const cols = DEFAULTS.scales * 2;
    const grid = (g) => Array.isArray(g) && g.length === cols && g.every(Array.isArray);
    if (!grid(data.stacks) || !grid(data.depot)) return null;
    if (!Array.isArray(data.tilt) || data.tilt.length !== cols / 2) return null;

    const num = (x, lo, hi) => typeof x === 'number' && isFinite(x) && x >= lo && x <= hi;
    // Whole numbers only. A fractional weight produces a fractional launch
    // distance, which indexes stacks[3.5] and throws; a fractional colour
    // indexes past the end of the palette and throws once per frame in the
    // draw loop. Neither is reachable from play, both are from an edited save.
    const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    const okMarble = (x) => !!x && typeof x.k === 'string' && int(x.i, 1, Number.MAX_SAFE_INTEGER) &&
                            int(x.c, 0, 63) && int(x.w, 0, 1e6);
    for (const col of data.stacks) if (!col.every(okMarble)) return null;
    for (const col of data.depot) if (!col.every(okMarble)) return null;
    // held may legitimately be null: a board that has been built up but never
    // had its crane loaded. The caller picks one up on resume.
    if (data.held != null && !okMarble(data.held)) return null;
    if (!int(data.rng, 0, 4294967295) || !int(data.level, 1, 1e6) ||
        !int(data.dropped, 0, 1e9) || !num(data.score, 0, 1e15) ||
        !int(data.since, 0, 1e6)) return null;
    // Every other numeric field is checked, so these two were the only way junk
    // could reach the game-over card and render as [object Object].
    if (!int(data.cleared, 0, 1e9) || !int(data.chainBest, 0, 1e6)) return null;

    const unpack = (x) => {
      const m = { id: x.i, kind: x.k, colour: x.c, weight: x.w, armed: !!x.a };
      if (int(x.d, 1, 1e9)) m.dark = x.d;
      if (x.x) m.crossed = true;
      return m;
    };
    const board = makeBoard({}, 1);
    board.stacks = data.stacks.map((col) => col.map(unpack));
    board.depot = data.depot.map((col) => col.map(unpack));
    board.held = data.held ? unpack(data.held) : null;
    board.tilt = data.tilt.map((t) => (t > 0 ? 1 : t < 0 ? -1 : 0));
    board.rng.seed(data.rng);
    board.level = data.level; board.dropped = data.dropped; board.score = data.score;
    board.cleared = data.cleared; board.chainBest = data.chainBest;
    // The clock does not survive a reload, so neither can the lamp: kept lit
    // with no clock it never went out, and a refresh banked x4 for ever.
    board.bonus = 1;
    board.bonusUntil = null;
    board.crane = int(data.crane, 0, cols - 1) ? data.crane : null;
    board.since = data.since; board.over = !!data.over;
    board.darkUntil = int(data.darkUntil, 0, 1e9) ? data.darkUntil : 0;

    // Ids must never be reissued. The view matches marbles by identity, so a
    // fresh marble carrying a restored marble's id would animate the wrong one.
    let top = 0;
    const ids = new Set();
    let dup = false;
    const bump = (x) => {                                        // held may be null
      if (!x) return;
      if (ids.has(x.id)) dup = true;
      ids.add(x.id);
      if (x.id > top) top = x.id;
    };
    for (const col of board.stacks) col.forEach(bump);
    for (const col of board.depot) col.forEach(bump);
    bump(board.held);
    // Two marbles sharing an id is not reachable from play, but a save with one
    // silently misbehaves: the twin can never be catapulted in the same cascade
    // because ctx.flown keys on the id, and the view matches the wrong marble.
    if (dup) return null;
    if (nextId <= top) nextId = top + 1;
    return board;
  }

  /* ---------- queries ---------- */

  function tallest(board) {
    let n = 0;
    for (const s of board.stacks) n = Math.max(n, s.length);
    return n;
  }

  function totalMarbles(board) {
    let n = 0;
    for (const s of board.stacks) n += s.length;
    return n;
  }

  function isSettled(board) {
    return !findClear(board) && !findFive(board);
  }

  /**
   * Would dropping into this column end the game?
   *
   * DEPRECATED for the on-screen warning - see predictDrop. This compares the
   * target column against its CURRENT capacity, and is wrong in both
   * directions: dropping into a raised pan can tip it down and grow its cap
   * from six to eight (a safe move reported fatal), and a drop can just as
   * easily kill a DIFFERENT pan by raising it, levelling it, or catapulting a
   * marble into it (a fatal move reported safe). Kept only as the cheap
   * heuristic the bots use to pick a roomy column.
   */
  function wouldOverflow(board, col) {
    return board.stacks[col].length + 1 > capacityOf(board, col);
  }

  /**
   * A board copy deep enough that playing on it cannot touch the original.
   *
   * In a versus match this MUST take the neighbour with it. A trial drop can
   * throw a marble across the gap, and a clone that still pointed at the real
   * opponent would drop Stones onto a live board every time the preview
   * refreshed.
   */
  function cloneLinked(board) {
    const mine = cloneBoard(board);
    if (board.neighbour) {
      const theirs = cloneBoard(board.neighbour);
      mine.neighbour = theirs;
      theirs.neighbour = mine;
    }
    return mine;
  }

  function cloneBoard(board) {
    const copy = Object.assign({}, board);
    copy.neighbour = null;                  // cloneLinked re-attaches a copy
    copy.stacks = board.stacks.map((c) => c.map((m) => Object.assign({}, m)));
    copy.depot = board.depot.map((c) => c.map((m) => Object.assign({}, m)));
    copy.held = board.held ? Object.assign({}, board.held) : null;
    copy.tilt = board.tilt.slice();
    // Its own generator at the same position, so a trial run cannot consume
    // randomness the real game is going to need.
    copy.rng = makeRng(0);
    copy.rng.seed(board.rng.state());
    return copy;
  }

  /**
   * What WOULD happen if the held marble went into this column - answered by
   * actually playing it out on a copy.
   *
   * Nothing cheaper is correct. The consequences of a drop are not local: it
   * can tip a see-saw, which resizes BOTH pans, shifts two whole stacks by a
   * visual row, completes lines that did not exist, and catapults a marble
   * somewhere else entirely, which can cascade. Predicting that with a
   * capacity check means reimplementing the engine badly. The engine is pure
   * and fast, so the honest answer is to ask it.
   *
   * Returns { fatal, overflowCol, events } and never mutates the real board.
   */
  function predictDrop(board, col, marble) {
    const m = marble || board.held;
    if (!m || col < 0 || col >= board.cols || board.over) return null;
    if (isBlocked(board, col)) return null;            // nothing can be dropped there
    // "Kills" means we END them. An opponent already out stays out; every
    // crossing drop after that was being painted THIS ENDS THEM in red.
    const foeAlive = !!(board.neighbour && !board.neighbour.over);
    const trial = cloneLinked(board);
    const events = dropMarble(trial, col, Object.assign({}, m));
    // Only OUR overflow ends our game. Filling the opponent up is a win, and it
    // must never paint the fatal marker on our own board.
    const spill = events.find((e) => e.type === 'overflow' && e.side === trial.side);
    return {
      fatal: !!trial.over,
      overflowCol: spill ? spill.col : -1,
      // Did this drop just send something across? Worth showing before committing.
      attacks: events.some((e) => e.type === 'cross'),
      kills: foeAlive && !!(trial.neighbour && trial.neighbour.over),
      events
    };
  }

  /**
   * Sealed while a DELIVERED Blocker sits in the column beside it. Derived,
   * never stored. A Blocker still at home has not been thrown yet and is inert
   * like every other weapon; sealing on it turned your own reward into a wound,
   * and because it sealed its own see-saw's partner column that see-saw could
   * never be flipped to launch it - a review brute-forced 119,808 attempts and
   * found no way out.
   */
  function isBlocked(board, col) {
    for (const c of [col - 1, col + 1]) {
      if (c < 0 || c >= board.cols) continue;
      if (board.stacks[c].some((m) => m.kind === KIND.BLOCKER && m.crossed)) return true;
    }
    return false;
  }

  /** Is this board currently blacked out by a Shadow Clock? */
  function isDark(board) {
    return board.darkUntil > board.dropped;
  }

  /** How much room is left in a pan, given where its end currently sits. */
  function headroom(board, col) {
    return capacityOf(board, col) - board.stacks[col].length;
  }

  /** True when this pan is within one of its limit, for the warning light. */
  function isCritical(board, col) {
    return board.stacks[col].length >= capacityOf(board, col);
  }

  return {
    DEFAULTS, KIND, UNLOCK, WEIGHTLESS,
    makeBoard, makeMarble, randomMarble, makeRng, fillDepot,
    takeFromDepot, pickUp, jokerIn,
    dropFromDepot, dropMarble, landMarble, tipScale, settle, applyExtra,
    findClear, findFive, floodFrom, removeCells, wrapColumn, transformOnWrap,
    weightOf, diffOf, capacityOf, capacityAt, refreshTilt, scaleOf, partnerOf, isRightPan,
    sameColour, matchable, isExtra, isStar, isHeart, isColoured, uniqueCells, scoreFor, relevel, detonate,
    newRun, runAccepts, runAdd,
    rowOffset, toVisual, toIndex, atVisual,
    weightRangeFor, coloursFor, unlockedKinds,
    tallest, totalMarbles, isSettled, isCritical, wouldOverflow, headroom,
    cloneBoard, cloneLinked, predictDrop, link, landingFor, emit,
    ATTACKS, HELPFUL, isAttack,
    blockAround, diagonalsFrom, diagonalsBelow, triangleBelow, paint, convertTo, darken, PASSIVE,
    allOfColour, targetUnder, awardExtra, stockDepot, rewardFor, REWARD_TABLE, tickBonus, isBlocked, isDark,
    serialize, restore
  };
})();
