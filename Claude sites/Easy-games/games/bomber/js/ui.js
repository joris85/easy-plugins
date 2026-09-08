'use strict';

/* Menus, HUD and overlays. Plain DOM on top of the canvas. */

const ITEM_LABEL = {
  kick: 'Kick',
  remote: 'Remote',
  pierce: 'Pierce',
  vest: 'Vest'
};

class UI {
  constructor(game) {
    this.game = null;
    this.overlay = document.getElementById('overlay');
    this.overlayInner = document.getElementById('overlayInner');
    this.hud = document.getElementById('hud');
    this.timerEl = document.getElementById('timer');
    this.roundEl = document.getElementById('round');
    this.bannerEl = document.getElementById('banner');
    this.cards = [];
    this.slots = this.loadSlots();
    this.winsTarget = this.loadWins();

    this.overlay.addEventListener('click', (e) => this.onClick(e));
  }

  attach(game) { this.game = game; }

  loadSlots() {
    try {
      const raw = localStorage.getItem('easybomber.slots');
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s) && s.length === 4) return s;
      }
    } catch (err) { /* ignore */ }
    return [
      { type: 'human', level: 'normal' },
      { type: 'human', level: 'normal' },
      { type: 'cpu', level: 'normal' },
      { type: 'cpu', level: 'normal' }
    ];
  }

  loadWins() {
    const v = parseInt(localStorage.getItem('easybomber.wins') || '3', 10);
    return isNaN(v) ? 3 : v;
  }

  persist() {
    try {
      localStorage.setItem('easybomber.slots', JSON.stringify(this.slots));
      localStorage.setItem('easybomber.wins', String(this.winsTarget));
    } catch (err) { /* ignore */ }
  }

  /* ---------- overlay plumbing ---------- */

  show(html, opts) {
    this.overlayInner.innerHTML = html;
    this.overlay.classList.remove('hidden');
    this.overlay.classList.toggle('transparent', !!(opts && opts.transparent));
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
    this.overlayInner.innerHTML = '';
    this._countKey = null;
  }

  onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const g = this.game;

    if (act === 'slot') {
      const i = +el.dataset.slot;
      this.slots[i].type = el.dataset.type;
      this.persist();
      this.showMenu(g);
      return;
    }
    if (act === 'level') {
      const i = +el.dataset.slot;
      this.slots[i].level = el.dataset.level;
      this.persist();
      this.showMenu(g);
      return;
    }
    if (act === 'wins') {
      this.winsTarget = +el.dataset.n;
      this.persist();
      this.showMenu(g);
      return;
    }
    if (act === 'start') {
      const active = this.slots.filter((s) => s.type !== 'off').length;
      if (active < 2) { this.flashBanner('Pick at least two bombers'); return; }
      Sfx.init(); Sfx.resume();
      this.hideOverlay();
      g.startMatch(this.slots, this.winsTarget);
      return;
    }
    if (act === 'controls') { this.showControls(g); return; }
    if (act === 'menu') { g.toMenu(); return; }
    if (act === 'rematch') {
      Sfx.init(); Sfx.resume();
      this.hideOverlay();
      g.startMatch(this.slots, this.winsTarget);
      return;
    }
    if (act === 'resume') { g.togglePause(); return; }
    if (act === 'resetkeys') { Input.resetBindings(); this.showControls(g); return; }
    if (act === 'rebind') {
      const p = +el.dataset.player, action = el.dataset.action;
      el.classList.add('capturing');
      el.textContent = 'press...';
      Input.startCapture(p, action, () => this.showControls(g));
      return;
    }
    if (act === 'help') { this.showHelp(g); return; }
  }

  /* ---------- screens ---------- */

  showMenu(game) {
    const rows = this.slots.map((s, i) => {
      const c = PALETTE[i];
      const b = Input.bindings[i];
      const keys = s.type === 'human'
        ? `<div class="keys">${Input.label(b.up)} ${Input.label(b.left)} ${Input.label(b.down)} ${Input.label(b.right)}
             &nbsp;·&nbsp; bomb <b>${Input.label(b.bomb)}</b> &nbsp;·&nbsp; detonate <b>${Input.label(b.boom)}</b></div>`
        : (s.type === 'cpu'
            ? `<div class="levels">${['easy', 'normal', 'hard'].map((l) =>
                `<button data-act="level" data-slot="${i}" data-level="${l}" class="chip ${s.level === l ? 'on' : ''}">${l}</button>`).join('')}</div>`
            : '<div class="keys dim">not playing</div>');

      return `<div class="slot ${s.type === 'off' ? 'off' : ''}">
        <span class="dot" style="background:${c.body}"></span>
        <span class="who">${c.name}</span>
        <div class="seg">
          ${['human', 'cpu', 'off'].map((t) =>
            `<button data-act="slot" data-slot="${i}" data-type="${t}" class="${s.type === t ? 'on' : ''}">${t === 'cpu' ? 'CPU' : t}</button>`).join('')}
        </div>
        ${keys}
      </div>`;
    }).join('');

    this.show(`
      <div class="card menu">
        <h1>Easy <span>Bomber</span></h1>
        <p class="tag">Blow up the maze, grab the power-ups, be the last one standing.</p>
        ${rows}
        <div class="winsRow">
          <span>Rounds to win</span>
          <div class="seg">
            ${[1, 2, 3, 5].map((n) => `<button data-act="wins" data-n="${n}" class="${this.winsTarget === n ? 'on' : ''}">${n}</button>`).join('')}
          </div>
        </div>
        <div class="btnRow">
          <button class="primary" data-act="start">Start match</button>
          <button data-act="controls">Controls</button>
          <button data-act="help">How to play</button>
        </div>
      </div>`);
    this.buildHud(game);
  }

  showControls(game) {
    const order = ['up', 'left', 'down', 'right', 'bomb', 'boom'];
    const rows = PALETTE.map((c, i) => `
      <div class="ctlRow">
        <span class="dot" style="background:${c.body}"></span>
        <span class="who">${c.name}</span>
        <div class="badges">
          ${order.map((a) => `
            <button class="badge" data-act="rebind" data-player="${i}" data-action="${a}">
              <em>${ACTION_LABELS[a]}</em>${Input.label(Input.bindings[i][a])}
            </button>`).join('')}
        </div>
      </div>`).join('');

    this.show(`
      <div class="card wide">
        <h2>Controls</h2>
        <p class="tag">Click a key, then press the key you want. Escape cancels.</p>
        ${rows}
        <div class="btnRow">
          <button class="primary" data-act="menu">Back</button>
          <button data-act="resetkeys">Reset to defaults</button>
        </div>
      </div>`);
  }

  showHelp() {
    this.show(`
      <div class="card wide">
        <h2>How to play</h2>
        <div class="helpGrid">
          <div>
            <h3>Basics</h3>
            <ul>
              <li>Drop a bomb, then get out of the cross shaped blast.</li>
              <li>Bombs fuse in 2.5 seconds. A blast sets off any bomb it touches.</li>
              <li>Blasts stop at steel pillars and eat one brick wall.</li>
              <li>You can step off your own bomb, but not back onto it.</li>
              <li>When the clock hits 36 seconds, steel blocks rain down and crush anyone underneath.</li>
            </ul>
          </div>
          <div>
            <h3>Power-ups</h3>
            <ul class="items">
              <li><b>Fire</b> longer blast, up to ${CFG.FIRE_MAX} tiles</li>
              <li><b>Bomb</b> one more bomb at a time, up to ${CFG.BOMB_MAX}</li>
              <li><b>Skate</b> move faster</li>
              <li><b>Kick</b> walk into a bomb to shove it</li>
              <li><b>Remote</b> blow your bombs when you choose</li>
              <li><b>Pierce</b> blast punches through brick walls</li>
              <li><b>Vest</b> flames cannot hurt you this round</li>
              <li><b>Skull</b> a random illness for 13 seconds, bump into someone to pass it on</li>
            </ul>
          </div>
        </div>
        <div class="btnRow"><button class="primary" data-act="menu">Back</button></div>
      </div>`);
  }

  showCountdown(n, roundNo) {
    // Called every frame, so only rebuild when the number actually changes or the
    // pop-in animation would restart forever and never become visible.
    const key = roundNo + ':' + n;
    if (this._countKey === key) return;
    this._countKey = key;
    const label = n > 0 ? n : 'GO';
    this.show(`<div class="count"><small>Round ${roundNo}</small><div class="big">${label}</div></div>`, { transparent: true });
  }

  showPause() {
    this.show(`
      <div class="card">
        <h2>Paused</h2>
        <div class="btnRow">
          <button class="primary" data-act="resume">Resume</button>
          <button data-act="menu">Quit to menu</button>
        </div>
      </div>`);
  }

  showRoundOver(game, winner, timeUp) {
    const title = winner
      ? `<span style="color:${winner.color.body}">${winner.name}</span> takes the round`
      : (timeUp ? 'Time up, nobody wins' : 'Everybody blew up');
    const score = game.players.map((p) =>
      `<span class="sc"><i style="background:${p.color.body}"></i>${p.wins}</span>`).join('');
    this.show(`<div class="card slim"><h2>${title}</h2><div class="scores">${score}</div></div>`, { transparent: true });
  }

  showMatchOver(game) {
    const w = game.matchWinner;
    this.show(`
      <div class="card">
        <h2><span style="color:${w.color.body}">${w.name}</span> wins the match</h2>
        <p class="tag">${game.players.map((p) => p.name + ' ' + p.wins).join(' · ')}</p>
        <div class="btnRow">
          <button class="primary" data-act="rematch">Rematch</button>
          <button data-act="menu">Menu</button>
        </div>
      </div>`);
  }

  flashBanner(text) {
    this.bannerEl.textContent = text;
    this.bannerEl.classList.remove('show');
    // Restart the CSS animation.
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('show');
  }

  /* ---------- HUD ---------- */

  buildHud(game) {
    this.hud.innerHTML = '';
    this.cards = [];
    const list = game.players.length ? game.players : [];
    for (const p of list) {
      const el = document.createElement('div');
      el.className = 'pcard';
      el.style.setProperty('--c', p.color.body);
      el.innerHTML = `
        <div class="pTop"><span class="dot"></span><span class="pname">${p.name}</span><span class="wins">0</span></div>
        <div class="stats">
          <span class="stat" title="Bombs">💣<b>1</b></span>
          <span class="stat" title="Blast">🔥<b>1</b></span>
          <span class="stat" title="Speed">👟<b>0</b></span>
        </div>
        <div class="abil"></div>`;
      this.hud.appendChild(el);
      this.cards.push({
        el,
        wins: el.querySelector('.wins'),
        stats: el.querySelectorAll('.stat b'),
        abil: el.querySelector('.abil')
      });
    }
  }

  updateHud(game) {
    this.timerEl.textContent = fmtTime(game.timeLeft);
    this.timerEl.classList.toggle('urgent', game.timeLeft <= CFG.SUDDEN_DEATH_AT);
    this.roundEl.textContent = game.roundNo ? 'Round ' + game.roundNo + ' · first to ' + game.winsTarget : '';

    game.players.forEach((p, i) => {
      const c = this.cards[i];
      if (!c) return;
      c.el.classList.toggle('dead', !p.alive);
      c.wins.textContent = p.wins;
      c.stats[0].textContent = p.maxBombs;
      c.stats[1].textContent = p.fire;
      c.stats[2].textContent = p.speedLevel;

      const tags = [];
      for (const k of ['kick', 'remote', 'pierce', 'vest']) {
        if (p[k]) tags.push(`<span class="ab ${k}">${ITEM_LABEL[k]}</span>`);
      }
      if (p.disease) tags.push(`<span class="ab sick">${DISEASE_LABEL[p.disease]}</span>`);
      const html = tags.join('');
      if (c.abil.dataset.h !== html) { c.abil.innerHTML = html; c.abil.dataset.h = html; }
    });
  }
}
