'use strict';

/* All sound is synthesized with WebAudio, so the game ships without audio files. */

const Sfx = {
  ctx: null,
  master: null,
  muted: false,
  noiseBuf: null,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    // One second of white noise, reused for explosions and debris.
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  },

  now() { return this.ctx ? this.ctx.currentTime : 0; },

  tone(opts) {
    if (!this.ctx || this.muted) return;
    const t0 = this.now() + (opts.delay || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(opts.from, t0);
    if (opts.to && opts.to !== opts.from) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + opts.dur);
    }
    const vol = opts.vol == null ? 0.2 : opts.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + opts.dur + 0.02);
  },

  noise(opts) {
    if (!this.ctx || this.muted) return;
    const t0 = this.now() + (opts.delay || 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = opts.filter || 'lowpass';
    filt.frequency.setValueAtTime(opts.freqFrom, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(60, opts.freqTo), t0 + opts.dur);
    filt.Q.value = opts.q || 1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(opts.vol == null ? 0.35 : opts.vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + opts.dur + 0.02);
  },

  place() { this.tone({ type: 'square', from: 520, to: 190, dur: 0.09, vol: 0.13 }); },

  boom() {
    this.noise({ freqFrom: 2600, freqTo: 110, dur: 0.42, vol: 0.4 });
    this.tone({ type: 'sine', from: 150, to: 38, dur: 0.34, vol: 0.4 });
  },

  brick() { this.noise({ freqFrom: 1800, freqTo: 700, dur: 0.1, vol: 0.12, filter: 'bandpass', q: 2 }); },

  pickup() {
    this.tone({ type: 'triangle', from: 700, to: 700, dur: 0.07, vol: 0.18 });
    this.tone({ type: 'triangle', from: 1050, to: 1050, dur: 0.09, vol: 0.18, delay: 0.07 });
    this.tone({ type: 'triangle', from: 1400, to: 1400, dur: 0.11, vol: 0.15, delay: 0.15 });
  },

  bad() {
    this.tone({ type: 'sawtooth', from: 300, to: 90, dur: 0.36, vol: 0.2 });
    this.tone({ type: 'square', from: 210, to: 70, dur: 0.36, vol: 0.12, delay: 0.05 });
  },

  kick() { this.tone({ type: 'square', from: 240, to: 340, dur: 0.06, vol: 0.12 }); },

  die() {
    this.tone({ type: 'sawtooth', from: 620, to: 60, dur: 0.7, vol: 0.24 });
    this.noise({ freqFrom: 900, freqTo: 120, dur: 0.5, vol: 0.16 });
  },

  tick(urgent) {
    this.tone({ type: 'square', from: urgent ? 1200 : 880, to: urgent ? 1200 : 880, dur: 0.05, vol: 0.1 });
  },

  crush() { this.noise({ freqFrom: 500, freqTo: 90, dur: 0.2, vol: 0.3 }); },

  win() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => this.tone({ type: 'triangle', from: f, to: f, dur: 0.16, vol: 0.2, delay: i * 0.11 }));
  },

  roundStart() {
    [440, 440, 660].forEach((f, i) => this.tone({ type: 'square', from: f, to: f, dur: 0.13, vol: 0.16, delay: i * 0.32 }));
  }
};
