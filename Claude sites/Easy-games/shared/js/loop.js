'use strict';

/* The frame loop, shared by every game.

   Two hard rules learned the painful way while building Easy Bomber:

   1. Contain errors. An uncaught exception inside update() means
      requestAnimationFrame is never called again and the game freezes for good.
   2. Clamp dt. A long stall must never teleport anything through a wall. */

const Loop = {
  running: false,
  paused: false,
  time: 0,          // seconds of accumulated running time
  frames: 0,
  _last: 0,
  _raf: 0,
  _update: null,
  _draw: null,
  _faults: 0,
  _opts: null,

  start(update, draw, opts) {
    this._update = update;
    this._draw = draw;
    this._opts = Object.assign({ maxDt: 0.05, pauseOnHide: true }, opts || {});
    this._faults = 0;
    this.time = 0;
    this.frames = 0;
    this.paused = false;
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    this._raf = requestAnimationFrame((t) => this._frame(t));

    if (this._opts.pauseOnHide && !this._boundVis) {
      this._boundVis = true;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.pause();
      });
    }
  },

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  },

  pause() {
    if (this.paused || !this.running) return;
    this.paused = true;
    if (this._opts && this._opts.onPause) this._opts.onPause();
  },

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this._last = performance.now();     // discard the paused interval
    if (this._opts && this._opts.onResume) this._opts.onResume();
  },

  toggle() { this.paused ? this.resume() : this.pause(); },

  _frame(now) {
    if (!this.running) return;
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (dt > this._opts.maxDt) dt = this._opts.maxDt;
    if (dt < 0) dt = 0;

    try {
      if (!this.paused) {
        this._update(dt);
        this.time += dt;
        this.frames++;
      }
      this._draw(dt);
    } catch (err) {
      // One bad frame must never take the whole game down with it.
      if (this._faults++ < 5) console.error('Frame error:', err);
    }

    if (typeof Input !== 'undefined') Input.endFrame();
    if (typeof Touch !== 'undefined') Touch.endFrame();

    this._raf = requestAnimationFrame((t) => this._frame(t));
  }
};
