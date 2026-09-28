'use strict';

/* Touch controls: a virtual d-pad, up to two action buttons, swipe and drag.
   Games read Touch.dir and Touch.tapped exactly like they read Input. */

const Touch = {
  available: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
  dir: { dx: 0, dy: 0 },
  held: { a: false, b: false },
  _tapped: new Set(),
  _pads: {},
  root: null,

  /** Second player's controls, used only by a split deck (opts.players: 2). */
  p2: { dir: { dx: 0, dy: 0 }, held: { a: false, b: false } },

  /**
   * Build the controls. On a phone they form a strip of their own under the
   * stage (the "deck"), never on top of the game: drawn over the playfield
   * they hid the bottom third of Pong, Merge, Tilt and every arcade game.
   * opts: dpad, axis ('both' | 'x' | 'y'), action, action2, and players: 2
   * for a split deck, player one on the left and player two on the right.
   */
  mount(root, opts) {
    const o = Object.assign({ dpad: true, axis: 'both', action: null, action2: null, players: 1 }, opts || {});
    this.root = root;
    root.innerHTML = '';
    this.dir = { dx: 0, dy: 0 };
    this.held.a = false; this.held.b = false;
    this.p2 = { dir: { dx: 0, dy: 0 }, held: { a: false, b: false } };
    if (!this.available) return this;
    root.classList.add('on');
    root.classList.toggle('split', o.players === 2);
    document.body.classList.add('hasDeck');

    if (o.players === 2) {
      // Each side is a player: left and right, then their action.
      root.appendChild(this._side(this, 'a', o, false));
      root.appendChild(this._side(this.p2, 'p2a', o, true));
      return this;
    }

    if (o.dpad) root.appendChild(this._dpad(this, o.axis));
    const acts = document.createElement('div');
    acts.className = 'tacts';
    if (o.action2) acts.appendChild(this._action(this, 'b', o.action2, 'second'));
    if (o.action) acts.appendChild(this._action(this, 'a', o.action, ''));
    if (acts.children.length) root.appendChild(acts);
    return this;
  },

  /** Hide the deck, for a game screen that needs no controls (a menu). */
  show(on) {
    if (!this.root || !this.available) return this;
    this.root.classList.toggle('idle', !on);
    return this;
  },

  _dpad(target, axis) {
    const pad = document.createElement('div');
    pad.className = 'tdpad ' + (axis === 'x' ? 'x' : axis === 'y' ? 'y' : 'both');
    const dirs = axis === 'x' ? [['left', '\u25c0', -1, 0], ['right', '\u25b6', 1, 0]]
               : axis === 'y' ? [['up', '\u25b2', 0, -1], ['down', '\u25bc', 0, 1]]
               : [['up', '\u25b2', 0, -1], ['left', '\u25c0', -1, 0], ['right', '\u25b6', 1, 0], ['down', '\u25bc', 0, 1]];
    for (const [cls, glyph, dx, dy] of dirs) {
      const b = document.createElement('div');
      b.className = 'tbtn ' + cls;
      b.textContent = glyph;
      this._bindHold(b, () => { target.dir = { dx, dy }; }, () => {
        if (target.dir.dx === dx && target.dir.dy === dy) target.dir = { dx: 0, dy: 0 };
      });
      pad.appendChild(b);
    }
    return pad;
  },

  _action(target, name, label, cls) {
    const key = name === 'p2a' ? 'a' : name;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'taction' + (cls ? ' ' + cls : '');
    b.textContent = label;
    this._bindHold(b, () => { target.held[key] = true; this._tapped.add(name); }, () => { target.held[key] = false; });
    return b;
  },

  _side(target, name, o, mirror) {
    const side = document.createElement('div');
    side.className = 'tside' + (mirror ? ' mirror' : '');
    side.appendChild(this._dpad(target, o.axis));
    if (o.action) side.appendChild(this._action(target, name, o.action, ''));
    return side;
  },

  _bindHold(el, on, off) {
    // Stop the press reaching the stage underneath. Pong moves its paddle by
    // dragging anywhere on the stage, so a d-pad press that bubbled up jumped
    // the paddle to the button's own height before the d-pad even applied.
    const down = (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('press'); on(); };
    const up = (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('press'); off(); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  },

  tapped(name) { return this._tapped.has(name || 'a'); },

  endFrame() { this._tapped.clear(); },

  /** Swipe recognition. cb receives 'up' | 'down' | 'left' | 'right'. */
  swipe(el, cb, minDist) {
    const min = minDist || 24;
    let sx = 0, sy = 0, active = false;
    el.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; active = true; });
    el.addEventListener('pointerup', (e) => {
      if (!active) return;
      active = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) < min && Math.abs(dy) < min) return;
      cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
    el.addEventListener('pointercancel', () => { active = false; });
    return this;
  },

  /** Continuous drag, reporting position normalised to 0..1 inside el. */
  drag(el, cb) {
    let down = false;
    const report = (e, phase) => {
      const r = el.getBoundingClientRect();
      cb(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1), phase);
    };
    el.addEventListener('pointerdown', (e) => {
      // A press on a card button or a d-pad button is not a drag. Capturing
      // the pointer here retargets the release and the click to the stage, so
      // in every game that drags on the stage no card button worked with a real
      // mouse, and a d-pad press released itself before a frame had run.
      if (e.target.closest && e.target.closest('#overlay, #touchpad')) return;
      down = true; el.setPointerCapture(e.pointerId); report(e, 'down');
    });
    el.addEventListener('pointermove', (e) => { if (down) report(e, 'move'); });
    el.addEventListener('pointerup', (e) => { down = false; report(e, 'up'); });
    el.addEventListener('pointercancel', () => { down = false; });
    return this;
  },

  /** Canvas coordinates from a pointer event, in the canvas's own pixel space. */
  canvasPos(canvas, e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * canvas.width,
      y: (e.clientY - r.top) / r.height * canvas.height
    };
  }
};
