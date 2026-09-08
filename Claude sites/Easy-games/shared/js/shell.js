'use strict';

/* Page chrome for every game: header, stage, overlay cards, HUD, touch layer.
   A game's HTML is then just a script tag; the shell builds the rest. */

const Shell = {
  cfg: null,
  canvas: null,
  ctx: null,
  els: {},
  _acts: {},

  mount(cfg) {
    this.cfg = Object.assign({
      name: 'Game',
      width: 720,
      height: 624,
      max: 720,
      pad: 250,
      tools: ['sound', 'pause', 'help'],
      hud: true,
      // The page column is 940px by default, which is right for a single board
      // but silently clamps a wide one: two boards side by side were being
      // squeezed into less width than one board gets. A game that needs more
      // room asks for it here.
      wrapMax: 0,
      foot: '',
      rules: '',
      root: '../../index.html'
    }, cfg);
    const c = this.cfg;

    const host = document.getElementById('app') || document.body;
    host.innerHTML = `
      <div class="wrap">
        <header class="topbar">
          <a class="back" href="${c.root}">&#9664; Games</a>
          <div class="brand">Easy <span>${c.name}</span></div>
          <div class="clock">
            <div class="statusMain" id="statusMain"></div>
            <div class="statusSub" id="statusSub"></div>
          </div>
          <div class="tools" id="tools"></div>
        </header>
        <div class="stageWrap" id="stageWrap">
          <canvas id="stage" width="${c.width}" height="${c.height}"></canvas>
          <div class="banner" id="banner"></div>
          <div class="touchpad" id="touchpad"></div>
          <div class="overlay hidden" id="overlay"><div id="overlayInner"></div></div>
        </div>
        <div class="hud" id="hud"></div>
        <p class="foot" id="foot">${c.foot}</p>
      </div>`;

    this.els = {
      stageWrap: document.getElementById('stageWrap'),
      canvas: document.getElementById('stage'),
      banner: document.getElementById('banner'),
      overlay: document.getElementById('overlay'),
      overlayInner: document.getElementById('overlayInner'),
      hud: document.getElementById('hud'),
      touchpad: document.getElementById('touchpad'),
      statusMain: document.getElementById('statusMain'),
      statusSub: document.getElementById('statusSub'),
      tools: document.getElementById('tools'),
      foot: document.getElementById('foot')
    };

    this.canvas = this.els.canvas;
    this.ctx = this.canvas.getContext('2d');

    if (c.wrapMax) {
      const wrap = host.querySelector('.wrap');
      if (wrap) wrap.style.maxWidth = c.wrapMax + 'px';
      // The readout row is centred on its own narrower column, which looks
      // stranded under a much wider stage.
      this.els.hud.style.maxWidth = Math.min(c.wrapMax, 1100) + 'px';
    }

    const w = this.els.stageWrap.style;
    w.setProperty('--stage-max', c.max + 'px');
    w.setProperty('--stage-ratio', (c.width / c.height).toFixed(4));
    w.setProperty('--stage-pad', c.pad + 'px');

    this._buildTools();
    this._bindKeys();
    this._bindOverlay();

    if (!c.hud) this.els.hud.style.display = 'none';
    return this;
  },

  /** Change the stage dimensions after mount, for games with variable boards. */
  resize(w, h, max) {
    this.canvas.width = w;
    this.canvas.height = h;
    const st = this.els.stageWrap.style;
    st.setProperty('--stage-max', (max || w) + 'px');
    st.setProperty('--stage-ratio', (w / h).toFixed(4));
    return this;
  },

  /* ---------- tools ---------- */

  _buildTools() {
    const defs = {
      sound: { label: 'Sound on', fn: () => this._toggleMute() },
      pause: { label: 'Pause', fn: () => this.togglePause() },
      restart: { label: 'Restart', fn: () => this._acts.restart && this._acts.restart() },
      help: { label: 'How to play', fn: () => this.showRules() }
    };
    for (const name of this.cfg.tools) {
      const d = defs[name];
      if (!d) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = d.label;
      b.dataset.tool = name;
      b.addEventListener('click', d.fn);
      this.els.tools.appendChild(b);
    }
  },

  _toggleMute() {
    Sfx.init();
    Sfx.setMuted(!Sfx.muted);
    const b = this.els.tools.querySelector('[data-tool="sound"]');
    if (b) { b.textContent = Sfx.muted ? 'Sound off' : 'Sound on'; b.classList.toggle('off', Sfx.muted); }
  },

  _bindKeys() {
    const unlock = () => { Sfx.init(); Sfx.resume(); };
    window.addEventListener('keydown', (e) => {
      unlock();
      if (typeof Input !== 'undefined' && Input.capture) return;
      if (e.code === 'Escape') { this.togglePause(); return; }
      if (e.code === 'KeyM' && !this._boundToPlayer('KeyM')) this._toggleMute();
    });
    window.addEventListener('pointerdown', unlock, { once: true });

    // Leaving the tab pauses, so nobody comes back to a dead snake.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && Loop.running && !Loop.paused && !this.isOpen()) this.togglePause();
    });
  },

  _boundToPlayer(code) {
    if (typeof Input === 'undefined' || !Input.bindings) return false;
    for (let p = 0; p < Input.bindings.length; p++) {
      for (const a in Input.bindings[p]) if (Input.bindings[p][a] === code) return true;
    }
    return false;
  },

  togglePause() {
    if (!Loop.running) return;
    if (Loop.paused) {
      // Only the pause card may be dismissed this way.
      if (this._pauseOpen) { this.hide(); this._pauseOpen = false; Loop.resume(); }
    } else if (!this.isOpen()) {
      Loop.pause();
      this._pauseOpen = true;
      this.overlay(`
        <div class="card">
          <h2>Paused</h2>
          <div class="btnRow">
            <button class="primary" data-act="resume">Resume</button>
            <a class="back" href="${this.cfg.root}" style="padding:7px 12px">Quit to games</a>
          </div>
        </div>`);
    }
  },

  /** Register handlers for [data-act] clicks inside overlay cards. */
  on(map) { Object.assign(this._acts, map); return this; },

  _bindOverlay() {
    this.els.overlay.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      const act = el.dataset.act;
      if (act === 'resume') { this.hide(); this._pauseOpen = false; Loop.resume(); return; }
      if (act === 'closeRules') {
        // Resume FIRST, on every path. Returning to the previous card while
        // still paused leaves the game frozen with no way back short of a reload.
        const back = this._rulesReturn;
        this._rulesReturn = null;
        if (this._rulesWasPaused) { this._rulesWasPaused = false; Loop.resume(); }
        if (back) { this.overlay(back); return; }
        this.hide();
        return;
      }
      if (this._acts[act]) this._acts[act](el);
    });
  },

  /* ---------- overlay ---------- */

  overlay(html, opts) {
    this.els.overlayInner.innerHTML = html;
    this.els.overlay.classList.remove('hidden');
    this.els.overlay.classList.toggle('transparent', !!(opts && opts.transparent));
    return this;
  },

  hide() {
    this.els.overlay.classList.add('hidden');
    this.els.overlayInner.innerHTML = '';
    this._countKey = null;
    return this;
  },

  isOpen() { return !this.els.overlay.classList.contains('hidden'); },

  showRules() {
    if (!this.cfg.rules) return;
    // Remember whatever card is open so "Got it" returns to it. Without this,
    // reading the rules from a start card leaves an empty board and no way back.
    this._rulesReturn = this.isOpen() ? this.els.overlayInner.innerHTML : null;
    this._rulesWasPaused = !Loop.paused && Loop.running;
    if (this._rulesWasPaused) Loop.pause();
    this.overlay(`<div class="card wide">
      <h2>How to play</h2>
      ${this.cfg.rules}
      <div class="btnRow"><button class="primary" data-act="closeRules">Got it</button></div>
    </div>`);
  },

  /** Start screen. buttons: [{label, act, primary}] */
  startCard(opts) {
    const btns = (opts.buttons || [{ label: 'Start', act: 'start', primary: true }])
      .map((b) => `<button class="${b.primary ? 'primary' : ''}" data-act="${b.act}">${b.label}</button>`).join('');
    this.overlay(`<div class="card">
      <h1>Easy <span>${this.cfg.name}</span></h1>
      <p class="tag">${opts.blurb || ''}</p>
      ${opts.extra || ''}
      <div class="btnRow">${btns}</div>
    </div>`);
  },

  /** Game over screen with score and personal best. */
  gameOverCard(opts) {
    const btns = (opts.buttons || [{ label: 'Play again', act: 'start', primary: true }])
      .map((b) => `<button class="${b.primary ? 'primary' : ''}" data-act="${b.act}">${b.label}</button>`).join('');
    const bestLine = opts.best == null ? '' :
      `<div class="rowBetween"><span>Your best</span><b style="color:var(--text)">${opts.best}</b></div>`;
    this.overlay(`<div class="card">
      <h2>${opts.title || 'Game over'}</h2>
      ${opts.scoreLabel ? `<p class="tag" style="margin-bottom:4px">${opts.scoreLabel}</p>` : ''}
      ${opts.score != null ? `<div class="bigNum">${opts.score}</div>` : ''}
      ${opts.isNew ? '<p class="tag" style="color:var(--good);margin-top:6px">New personal best</p>' : ''}
      ${opts.extra || ''}
      ${bestLine}
      <div class="btnRow">${btns}</div>
    </div>`);
  },

  /** Countdown that only rebuilds when the number changes, so the CSS pop animation runs. */
  countdown(n, label) {
    const key = label + ':' + n;
    if (this._countKey === key) return;
    this._countKey = key;
    this.overlay(`<div style="text-align:center">
      <div style="font-size:13px;color:var(--dim);letter-spacing:2px;text-transform:uppercase">${label || ''}</div>
      <div class="bigNum" style="font-size:clamp(56px,16vw,120px);color:#fff">${n > 0 ? n : 'GO'}</div>
    </div>`, { transparent: true });
  },

  /* ---------- readouts ---------- */

  status(main, sub) {
    if (main != null) this.els.statusMain.textContent = main;
    if (sub != null) this.els.statusSub.textContent = sub;
    return this;
  },

  urgent(on) { this.els.statusMain.classList.toggle('urgent', !!on); return this; },

  hud(html) { this.els.hud.innerHTML = html; return this; },

  /** Convenience: a row of LABEL / VALUE readout tiles. */
  readouts(items) {
    this.els.hud.innerHTML = '<div class="readouts">' + items.map((i) =>
      `<div class="readout ${i.accent ? 'accent' : ''}"><em>${i.label}</em><b>${i.value}</b></div>`).join('') + '</div>';
    return this;
  },

  banner(text) {
    const el = this.els.banner;
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;      // restart the animation
    el.classList.add('show');
    return this;
  },

  foot(html) { this.els.foot.innerHTML = html; return this; },

  touch(opts) { Touch.mount(this.els.touchpad, opts); return this; }
};
