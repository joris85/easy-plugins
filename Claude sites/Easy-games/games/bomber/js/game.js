'use strict';

/* Match and round flow, input wiring, win conditions. */

const STATE = {
  MENU: 'menu',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ROUNDOVER: 'roundover',
  MATCHOVER: 'matchover'
};

class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.arena = new Arena();
    this.arena.game = this;
    this.players = [];
    this.byId = new Array(4).fill(null);
    this.state = STATE.MENU;
    this.timeLeft = CFG.ROUND_TIME;
    this.countdown = 0;
    this.stateTimer = 0;
    this.roundNo = 0;
    this.winsTarget = CFG.WINS_TARGET;
    this.lastTick = -1;
    this.roundWinner = null;
    this.matchWinner = null;
    this.hudTimer = 0;

    canvas.width = CFG.COLS * CFG.TILE;
    canvas.height = CFG.ROWS * CFG.TILE;
  }

  playerById(id) { return this.byId[id]; }

  startMatch(slots, winsTarget) {
    this.winsTarget = winsTarget || CFG.WINS_TARGET;
    this.players = [];
    this.byId = new Array(4).fill(null);
    slots.forEach((s, i) => {
      if (s.type === 'off') return;
      const p = new Player(i, {
        isBot: s.type === 'cpu',
        botLevel: s.level,
        name: s.type === 'cpu' ? 'CPU ' + PALETTE[i].name : 'Player ' + (i + 1)
      });
      this.players.push(p);
      this.byId[i] = p;
    });
    this.roundNo = 0;
    this.matchWinner = null;
    for (const p of this.players) p.wins = 0;
    this.ui.buildHud(this);
    this.startRound();
  }

  startRound() {
    this.roundNo++;
    this.arena.generate(this.players.map((p) => SPAWNS[p.id]));
    for (const p of this.players) p.resetForRound(SPAWNS[p.id]);
    this.timeLeft = CFG.ROUND_TIME;
    this.lastTick = -1;
    this.roundWinner = null;
    this.state = STATE.COUNTDOWN;
    this.countdown = 2.6;
    Sfx.roundStart();
    this.ui.showCountdown(3, this.roundNo);
    this.ui.updateHud(this);
  }

  toMenu() {
    this.state = STATE.MENU;
    this.ui.showMenu(this);
  }

  togglePause() {
    if (this.state === STATE.PLAYING) {
      this.state = STATE.PAUSED;
      this.ui.showPause();
    } else if (this.state === STATE.PAUSED) {
      this.state = STATE.PLAYING;
      this.ui.hideOverlay();
    }
  }

  /* ---------- per frame ---------- */

  update(dt) {
    switch (this.state) {
      case STATE.COUNTDOWN: {
        this.countdown -= dt;
        const n = Math.ceil(this.countdown - 0.6);
        this.ui.showCountdown(n > 0 ? n : 0, this.roundNo);
        // Bombs and flames from nothing, but keep particles alive.
        this.arena.update(dt, this);
        if (this.countdown <= 0) {
          this.state = STATE.PLAYING;
          this.ui.hideOverlay();
        }
        break;
      }
      case STATE.PLAYING: {
        this.updatePlaying(dt);
        break;
      }
      case STATE.ROUNDOVER: {
        this.stateTimer -= dt;
        this.arena.update(dt, this);
        if (this.stateTimer <= 0) {
          if (this.matchWinner) {
            this.state = STATE.MATCHOVER;
            this.ui.showMatchOver(this);
          } else {
            this.startRound();
          }
        }
        break;
      }
      default:
        break;
    }

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      this.ui.updateHud(this);
    }
  }

  updatePlaying(dt) {
    // Clock.
    this.timeLeft -= dt;
    const secs = Math.ceil(this.timeLeft);
    if (secs !== this.lastTick) {
      this.lastTick = secs;
      if (secs <= 10 && secs > 0) Sfx.tick(secs <= 5);
    }
    if (!this.arena.suddenDeath && this.timeLeft <= CFG.SUDDEN_DEATH_AT) {
      this.arena.startSuddenDeath();
      this.ui.flashBanner('Sudden death');
    }

    // Intents.
    for (const p of this.players) {
      if (!p.alive) continue;
      if (p.isBot) {
        Bot.update(p, this, dt);
      } else {
        const b = Input.bindings[p.id];
        const d = Input.dirFor(p.id);
        p.intent.dx = d.dx;
        p.intent.dy = d.dy;
        p.intent.bomb = Input.tapped(b.bomb);
        p.intent.boom = Input.tapped(b.boom);
      }
    }

    for (const p of this.players) p.update(dt, this);
    for (const p of this.players) { p.intent.bomb = false; p.intent.boom = false; }

    this.arena.update(dt, this);

    // Flames kill, unless you found the vest.
    for (const p of this.players) {
      if (!p.alive || p.vest) continue;
      if (this.arena.flameAt(p.tx, p.ty)) this.killPlayer(p, 'burned');
    }

    this.spreadDiseases();

    if (this.timeLeft <= 0) {
      this.endRound(null, true);
      return;
    }
    this.checkRoundEnd();
  }

  /** Bumping into an infected player passes the illness on and cures the carrier. */
  spreadDiseases() {
    const now = performance.now();
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const a = this.players[i], b = this.players[j];
        if (!a.alive || !b.alive) continue;
        const sick = (a.disease ? 1 : 0) + (b.disease ? 1 : 0);
        if (sick !== 1) continue;                            // need exactly one carrier
        const carrier = a.disease ? a : b;
        const target = a.disease ? b : a;
        if (now - carrier.lastTouch < CFG.DISEASE_TOUCH_COOLDOWN) continue;
        const h = CFG.TILE * CFG.PLAYER_HALF;
        if (Math.abs(a.px - b.px) < h * 2 && Math.abs(a.py - b.py) < h * 2) {
          target.infect(carrier.disease);
          target.lastTouch = now;
          carrier.disease = null;
          carrier.lastTouch = now;
          Sfx.bad();
        }
      }
    }
  }

  killPlayer(p, cause) {
    if (!p.alive) return;
    p.alive = false;
    p.deathAt = performance.now();
    p.deathCause = cause;
    p.intent.dx = 0; p.intent.dy = 0;
    this.arena.spawnDebris(p.tx, p.ty, p.color.body, 14);
    Sfx.die();
    // Bombs already on the field still go off, they just no longer count.
    for (const b of this.arena.bombs) if (b.owner === p.id) b.remote = false;
  }

  checkRoundEnd() {
    const alive = this.players.filter((p) => p.alive);
    if (alive.length <= 1) this.endRound(alive[0] || null, false);
  }

  endRound(winner, timeUp) {
    this.roundWinner = winner;
    this.state = STATE.ROUNDOVER;
    this.stateTimer = 2.4;
    if (winner) {
      winner.wins++;
      Sfx.win();
      if (winner.wins >= this.winsTarget) this.matchWinner = winner;
    }
    this.ui.showRoundOver(this, winner, timeUp);
  }

  draw() {
    Render.draw(this.ctx, this);
  }
}
