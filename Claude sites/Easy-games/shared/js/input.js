'use strict';

/* Keyboard handling for up to four players on one keyboard.
   Bindings are remappable and persisted in localStorage. */

const DEFAULT_BINDINGS = [
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', bomb: 'Space', boom: 'ShiftRight' },
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', bomb: 'ShiftLeft', boom: 'KeyQ' },
  { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', bomb: 'Semicolon', boom: 'KeyP' },
  { up: 'Numpad8', down: 'Numpad5', left: 'Numpad4', right: 'Numpad6', bomb: 'Numpad0', boom: 'NumpadAdd' }
];

const ACTION_LABELS = { up: 'Up', down: 'Down', left: 'Left', right: 'Right', bomb: 'Bomb', boom: 'Detonate' };

const Input = {
  down: Object.create(null),
  pressTime: Object.create(null),
  justDown: new Set(),
  bindings: null,
  capture: null,        // { player, action, done(code) } while remapping

  init() {
    this.bindings = this.load();
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => { this.down = Object.create(null); });
  },

  load() {
    try {
      const raw = localStorage.getItem('easybomber.bindings');
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length === 4) {
          // Merge so a new action added later still gets a default.
          return saved.map((b, i) => Object.assign({}, DEFAULT_BINDINGS[i], b));
        }
      }
    } catch (err) { /* ignore corrupt storage */ }
    return DEFAULT_BINDINGS.map((b) => Object.assign({}, b));
  },

  save() {
    try {
      localStorage.setItem('easybomber.bindings', JSON.stringify(this.bindings));
    } catch (err) { /* storage may be unavailable */ }
  },

  resetBindings() {
    this.bindings = DEFAULT_BINDINGS.map((b) => Object.assign({}, b));
    this.save();
  },

  /** True when `code` is already used by a different player/action. */
  conflict(code, player, action) {
    for (let p = 0; p < this.bindings.length; p++) {
      for (const a in this.bindings[p]) {
        if (this.bindings[p][a] === code && !(p === player && a === action)) return { player: p, action: a };
      }
    }
    return null;
  },

  startCapture(player, action, done) {
    this.capture = { player, action, done };
  },

  cancelCapture() { this.capture = null; },

  onKeyDown(e) {
    if (this.capture) {
      e.preventDefault();
      const cap = this.capture;
      this.capture = null;
      if (e.code !== 'Escape') {
        const clash = this.conflict(e.code, cap.player, cap.action);
        if (clash) this.bindings[clash.player][clash.action] = null;
        this.bindings[cap.player][cap.action] = e.code;
        this.save();
      }
      cap.done(e.code);
      return;
    }
    if (this.isGameKey(e.code)) e.preventDefault();
    if (!this.down[e.code]) {
      this.justDown.add(e.code);
      this.pressTime[e.code] = performance.now();
    }
    this.down[e.code] = true;
  },

  onKeyUp(e) {
    if (this.isGameKey(e.code)) e.preventDefault();
    this.down[e.code] = false;
  },

  /** Extra key codes a game wants swallowed, on top of the player bindings. */
  claimed: new Set(),
  claim(codes) { for (const c of codes) this.claimed.add(c); return this; },

  isGameKey(code) {
    if (code === 'Space' || code === 'Tab' || code.startsWith('Arrow')) return true;
    if (this.claimed.has(code)) return true;
    for (let p = 0; p < 4; p++) {
      const b = this.bindings[p];
      for (const a in b) if (b[a] === code) return true;
    }
    return false;
  },

  held(code) { return !!(code && this.down[code]); },

  tapped(code) { return !!(code && this.justDown.has(code)); },

  /** Direction for a player: whichever held direction key was pressed most recently. */
  dirFor(playerIndex) {
    const b = this.bindings[playerIndex];
    let best = null, bestT = -1;
    const opts = [
      { code: b.up, dx: 0, dy: -1 },
      { code: b.down, dx: 0, dy: 1 },
      { code: b.left, dx: -1, dy: 0 },
      { code: b.right, dx: 1, dy: 0 }
    ];
    for (const o of opts) {
      if (this.held(o.code)) {
        const t = this.pressTime[o.code] || 0;
        if (t > bestT) { bestT = t; best = o; }
      }
    }
    return best ? { dx: best.dx, dy: best.dy } : { dx: 0, dy: 0 };
  },

  endFrame() { this.justDown.clear(); },

  /** Human readable name for a key code. */
  label(code) {
    if (!code) return '--';
    const map = {
      ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
      Space: 'Space', ShiftLeft: 'L Shift', ShiftRight: 'R Shift',
      ControlLeft: 'L Ctrl', ControlRight: 'R Ctrl',
      AltLeft: 'L Alt', AltRight: 'R Alt',
      Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/',
      BracketLeft: '[', BracketRight: ']', Backslash: '\\', Backquote: '`',
      Minus: '-', Equal: '=', Enter: 'Enter', Tab: 'Tab', Backspace: 'Bksp',
      NumpadAdd: 'Num +', NumpadSubtract: 'Num -', NumpadEnter: 'Num Enter',
      NumpadMultiply: 'Num *', NumpadDecimal: 'Num .'
    };
    if (map[code]) return map[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
    return code;
  }
};
