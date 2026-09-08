'use strict';

/* Easy Bomber - tunables and constants. */

const CFG = {
  TILE: 48,
  COLS: 15,               // includes the 1 tile hard border
  ROWS: 13,

  SOFT_DENSITY: 0.86,     // chance an eligible interior tile becomes a soft block

  BOMB_FUSE: 2500,        // ms, classic 2.5s
  FUSE_SHORT: 950,        // ms, short fuse disease
  FLAME_MS: 460,

  SPEED_BASE: 126,        // px/s
  SPEED_STEP: 30,
  SPEED_MAX_LEVEL: 4,
  SPEED_DISEASE_FAST: 285,
  SPEED_DISEASE_SLOW: 58,

  BOMB_MAX: 8,
  FIRE_MAX: 8,

  KICK_SPEED: 250,        // px/s for kicked bombs

  ROUND_TIME: 121,        // seconds
  SUDDEN_DEATH_AT: 36,    // seconds remaining when pressure blocks start
  SD_INTERVAL: 340,       // ms between falling blocks

  DISEASE_MS: 13000,
  DISEASE_TOUCH_COOLDOWN: 900,

  WINS_TARGET: 3,

  PLAYER_HALF: 0.33,      // collision box half-size as a fraction of a tile
  ITEM_HALF: 0.30,

  ITEM_COUNTS: {
    fire: 9,
    bomb: 9,
    speed: 4,
    kick: 2,
    remote: 1,
    pierce: 1,
    vest: 1,
    skull: 3
  }
};

const TT = { EMPTY: 0, HARD: 1, SOFT: 2 };

const ITEM = {
  BOMB: 'bomb',
  FIRE: 'fire',
  SPEED: 'speed',
  KICK: 'kick',
  REMOTE: 'remote',
  PIERCE: 'pierce',
  VEST: 'vest',
  SKULL: 'skull'
};

const DISEASE = {
  FAST: 'fast',
  SLOW: 'slow',
  DIARRHEA: 'diarrhea',
  LOWPOWER: 'lowpower',
  SHORTFUSE: 'shortfuse',
  NOBOMB: 'nobomb',
  REVERSE: 'reverse'
};

const DISEASE_LIST = [
  DISEASE.FAST, DISEASE.SLOW, DISEASE.DIARRHEA,
  DISEASE.LOWPOWER, DISEASE.SHORTFUSE, DISEASE.NOBOMB, DISEASE.REVERSE
];

// Plate colours behind each pickup icon.
const ITEM_STYLE = {
  fire:   { bg1: '#6b2107', bg2: '#c0470f', edge: '#ffc478' },
  bomb:   { bg1: '#1e2439', bg2: '#3d4864', edge: '#93a4cc' },
  speed:  { bg1: '#063546', bg2: '#0d7ea8', edge: '#7fe4ff' },
  kick:   { bg1: '#0f3a22', bg2: '#1d8a4c', edge: '#86eeb0' },
  remote: { bg1: '#291e50', bg2: '#5a44b8', edge: '#c2b2ff' },
  pierce: { bg1: '#560f0f', bg2: '#b32222', edge: '#ff9b9b' },
  vest:   { bg1: '#0d2c52', bg2: '#1f6fd0', edge: '#9fdcff' },
  skull:  { bg1: '#281333', bg2: '#5b2a72', edge: '#e5a8ff' }
};

const DISEASE_LABEL = {
  fast: 'Hyper',
  slow: 'Sluggish',
  diarrhea: 'Bomb runs',
  lowpower: 'Low power',
  shortfuse: 'Short fuse',
  nobomb: 'No bombs',
  reverse: 'Reversed'
};

const PALETTE = [
  { id: 0, name: 'Red',    body: '#ff4d5e', dark: '#c02637', light: '#ff8b96' },
  { id: 1, name: 'Blue',   body: '#4da3ff', dark: '#1d61b8', light: '#95c8ff' },
  { id: 2, name: 'Green',  body: '#4ad46f', dark: '#1d9142', light: '#96e9ac' },
  { id: 3, name: 'Yellow', body: '#ffcc3f', dark: '#c08d00', light: '#ffe396' }
];

// Spawn corners in tile coordinates, matched to PALETTE order.
const SPAWNS = [
  { x: 1, y: 1 },
  { x: CFG.COLS - 2, y: 1 },
  { x: 1, y: CFG.ROWS - 2 },
  { x: CFG.COLS - 2, y: CFG.ROWS - 2 }
];
