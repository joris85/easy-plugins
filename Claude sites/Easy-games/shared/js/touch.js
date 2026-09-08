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

  /** Build controls inside a .touchpad overlay. */
  mount(root, opts) {
    const o = Object.assign({ dpad: true, axis: 'both', action: null, action2: null }, opts || {});
    this.root = root;
    root.innerHTML = '';
    if (!this.available) return this;
    root.classList.add('on');

    if (o.dpad) {
      const pad = document.createElement('div');
      pad.className = 'tdpad';
      const dirs = o.axis === 'x' ? [['left', '◀', -1, 0], ['right', '▶', 1, 0]]
                 : o.axis === 'y' ? [['up', '▲', 0, -1], ['down', '▼', 0, 1]]
                 : [['up', '▲', 0, -1], ['left', '◀', -1, 0], ['right', '▶', 1, 0], ['down', '▼', 0, 1]];
      for (const [cls, glyph, dx, dy] of dirs) {
        const b = document.createElement('div');
        b.className = 'tbtn ' + cls;
        b.textContent = glyph;
        this._bindHold(b, () => { this.dir = { dx, dy }; }, () => {
          if (this.dir.dx === dx && this.dir.dy === dy) this.dir = { dx: 0, dy: 0 };
        });
        pad.appendChild(b);
      }
      root.appendChild(pad);
    }

    if (o.action) {
      const b = document.createElement('button');
      b.className = 'taction';
      b.textContent = o.action;
      this._bindHold(b, () => { this.held.a = true; this._tapped.add('a'); }, () => { this.held.a = false; });
      root.appendChild(b);
    }
    if (o.action2) {
      const b = document.createElement('button');
      b.className = 'taction second';
      b.textContent = o.action2;
      this._bindHold(b, () => { this.held.b = true; this._tapped.add('b'); }, () => { this.held.b = false; });
      root.appendChild(b);
    }
    return this;
  },

  _bindHold(el, on, off) {
    const down = (e) => { e.preventDefault(); el.classList.add('press'); on(); };
    const up = (e) => { e.preventDefault(); el.classList.remove('press'); off(); };
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
    el.addEventListener('pointerdown', (e) => { down = true; el.setPointerCapture(e.pointerId); report(e, 'down'); });
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
