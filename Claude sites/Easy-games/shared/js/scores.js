'use strict';

/* Local best scores in localStorage. No server, no leaderboard, no accounts.
   Every write is wrapped because localStorage throws in private mode. */

const Scores = {
  _key(game, variant) { return 'easygames.' + game + (variant ? '.' + variant : ''); },

  /** Stored record: { best, at, runs } */
  record(game, variant) {
    try {
      const raw = localStorage.getItem(this._key(game, variant));
      if (raw) return JSON.parse(raw);
    } catch (err) { /* unavailable or corrupt */ }
    return { best: null, at: 0, runs: 0 };
  },

  best(game, variant) { return this.record(game, variant).best; },

  /** Returns { best, isNew, previous }. Set lower:true for time-style scores. */
  submit(game, score, opts) {
    const o = opts || {};
    const rec = this.record(game, o.variant);
    const previous = rec.best;
    const better = previous === null || (o.lower ? score < previous : score > previous);
    if (better) { rec.best = score; rec.at = Date.now(); }
    rec.runs = (rec.runs || 0) + 1;
    try {
      localStorage.setItem(this._key(game, o.variant), JSON.stringify(rec));
    } catch (err) { /* ignore */ }
    return { best: rec.best, isNew: better, previous };
  },

  reset(game, variant) {
    try { localStorage.removeItem(this._key(game, variant)); } catch (err) { /* ignore */ }
  },

  /** "Best 1240" or "Best --" for a readout. */
  label(game, variant, fmt) {
    const b = this.best(game, variant);
    if (b === null) return '--';
    return fmt ? fmt(b) : String(b);
  }
};
