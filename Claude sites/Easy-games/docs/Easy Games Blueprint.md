# Easy Games - master plan

A complete specification for a browser games site on SiteGround: 27 games, one
shared engine, one deploy pipeline. Every game below has been researched against
the original so the mechanics are exact rather than approximate.

Written 17 August 2026. Easy Bomber is built and working; everything else is
specified but not yet started.

---

## Part 0. How to read this

- **Part 1** sets the constraints that shape every decision.
- **Part 2** describes the shared engine, most of which already exists inside Easy Bomber and needs extracting.
- **Part 3** is the site architecture: URLs, page anatomy, the scores API, SEO.
- **Part 4** is the meat: exact mechanics for all 27 games.
- **Part 5** is the SiteGround build and deploy plan.
- **Part 6** is the roadmap with effort estimates.
- **Part 7** lists the decisions that need your input.

Effort scale used throughout:

| Tag | Meaning |
|---|---|
| **S** | One sitting. Roughly 150 to 450 lines of game code |
| **M** | Two or three sittings. Needs real design work, a generator, or an AI |
| **L** | A project of its own. Content pipeline, engine, or asset dependency |

---

## Part 1. Principles and constraints

### 1.1 What SiteGround can and cannot do

SiteGround shared and cloud plans run Apache with PHP and MySQL. There is no
Node.js, no persistent process, and no WebSocket upgrade. That single fact
determines the whole architecture:

- **Every game is 100% client side.** The server only serves files.
- **PHP is used for exactly three things**: the highscore API, the daily puzzle seed, and page shells that need shared markup.
- **No real time online multiplayer.** Local multiplayer on one keyboard is the multiplayer story. If online is ever wanted, the route is an external realtime service (Ably, Pusher, Supabase Realtime) with the site staying on SiteGround.
- **PHP on the CLI is old on SiteGround.** Always call `php84` explicitly, in hooks and in cron. This is already the convention in your easy-mail deploy scripts.
- **No shell crontab.** Cron entries go in Site Tools, Devs, Cron Jobs.
- **OPcache is file based** and lives in `~/.opcache`. A deploy that does not flush it serves old code.

### 1.2 Rules I am holding myself to

1. **No dependencies.** No frameworks, no bundlers, no npm. Plain scripts, canvas, and WebAudio. Easy Bomber proves this works and it means zero build fragility on a shared host.
2. **No binary assets unless unavoidable.** Graphics are canvas paths, sound is synthesized. This keeps every game under about 40 KB and makes them instant to load. Two games break this rule and I flag them where they do.
3. **Mechanics are copied, names and artwork never are.** Reimplementing rules is legal. Names, sprites and distinctive visual presentation are not. See 1.3.
4. **Each game is self contained.** A game is a folder with an HTML file and its own JS. It imports shared modules but nothing else imports it. You can delete any game without touching anything else.
5. **Everything works on a phone.** Touch controls for single player games, and honest messaging that local multiplayer wants a keyboard.
6. **Exact mechanics or a deliberate, documented deviation.** Where I depart from the original I say so and why.

### 1.3 The legal position, stated plainly

Game mechanics, rules and systems are not protected by copyright. Names, logos,
characters, sprites and music are. Trade dress, meaning the overall distinctive
look, can also be protected.

| Original | Rights holder | Our name | Risk |
|---|---|---|---|
| Bomberman | Konami | Easy Bomber | Low, already avoided the name |
| Tetris | Tetris Holding | Easy Blocks | **Highest on this list, see below** |
| Pac-Man | Bandai Namco | Easy Muncher | Medium, avoid the maze layout and character shapes |
| Asteroids, Missile Command, Breakout, Lunar Lander | Atari | Easy Rocks, Easy Missiles, Easy Bricks, Easy Lander | Low, geometric shapes are not distinctive |
| Space Invaders | Taito | Easy Invaders | Medium, do not copy the crab and squid sprites |
| Frogger | Konami | not included | n/a |
| Wordle | The New York Times | Easy Words | Low if the name and share-grid styling differ |
| Simon | Hasbro | Easy Simon or Easy Signal | Low, four coloured buttons is not protectable |
| Mastermind | Hasbro | Easy Code | Low |
| Connect Four | Hasbro | Easy Four | Low |
| Sudoku, Minesweeper, Nonogram, Solitaire, 2048, Lights Out, 15-puzzle | generic or open | own names | None |

**Tetris is the genuine outlier.** In *Tetris Holding v. Xio Interactive* (2012) a
US court held that the piece shapes, the playfield dimensions and the overall
look were protected expression, not just unprotectable rules. So: build the
mechanics, but give it a different name, a different palette, a visibly
different playfield presentation, and do not market it as Tetris. I would put
this one last in the roadmap, after everything safe is shipped.

2048 is safe: the original by Gabriele Cirulli is MIT licensed, and it was itself
a clone of Threes.

---

## Part 2. The shared engine

### 2.1 What already exists

Easy Bomber contains five modules that are game agnostic. Step one of this whole
plan is extracting them to `/shared/` unchanged in behaviour.

| Module | Current file | What it gives every game |
|---|---|---|
| **Input** | `js/input.js` | Keyboard state, four independent player key maps, press-order direction resolution, edge detection, click-to-rebind, localStorage persistence, `preventDefault` for game keys |
| **Sfx** | `js/audio.js` | WebAudio synthesis: tones with pitch envelopes, filtered noise bursts, a reusable noise buffer, master gain and mute. No audio files |
| **Utils** | `js/utils.js` | `clamp`, `approach`, `shuffle`, `randInt`, `pick`, `roundRect`, `fmtTime`, direction table |
| **UI shell** | `js/ui.js` | Overlay card system, menu builder, HUD builder, transient banners, localStorage settings |
| **Loop** | `js/main.js` | Fixed-clamped delta loop, error containment so one bad frame cannot kill the game, audio unlock on first gesture, debug hook |

Two hard lessons already learned in Bomberman, which become engine rules:

1. **The frame loop must contain errors.** An uncaught exception inside `update()` means `requestAnimationFrame` is never called again and the game freezes permanently. The loop wraps update and draw in try/catch and logs the first five faults.
2. **Never iterate a mutable collection by index while a nested call can splice it.** The bomb chain-reaction bug was exactly this. Walk a snapshot and check membership.

### 2.2 New shared modules to write

| Module | Purpose | Effort |
|---|---|---|
| `shared/loop.js` | Extract the frame loop into a reusable `GameLoop(update, draw)` with pause, resume, visibility handling and the error guard | S |
| `shared/scene.js` | Tiny state machine: `menu`, `playing`, `paused`, `gameover`. Every game has these states, none should re-implement them | S |
| `shared/scores.js` | Local best scores in localStorage, plus optional POST to the scores API, plus rendering a leaderboard table | S |
| `shared/touch.js` | Virtual d-pad, swipe recognition, and tap targets, so single player games work on a phone | S |
| `shared/grid.js` | Tile grid helpers: index maths, neighbours, flood fill, BFS, A\*. Minesweeper, Sudoku, Nonogram, Lights Out, Slide, Muncher and Bomber all want this | S |
| `shared/cards.js` | A 52 card deck: representation, shuffle with a seeded RNG, canvas card rendering with suits and pips, drag and drop | M |
| `shared/rng.js` | Seeded PRNG (mulberry32 or xorshift128). Required for daily puzzles and for replay verification | S |
| `shared/sprite.js` | Procedural sprite helpers: bevelled blocks, glow, particle system, screen shake. Currently inline in Bomberman's renderer | S |
| `shared/quiz.js` | The brain-pack harness: trial sequencing, stimulus timing, reaction capture, per-trial logging, results summary. Twelve games share this | M |

### 2.3 The contract every game implements

```js
// games/<slug>/js/game.js
const Game = {
  meta: { slug, title, players: [1,4], touch: true, category },
  init(canvas, opts) {},     // build state, do not start
  start() {},                // begin a run
  update(dt) {},             // dt in seconds, already clamped
  draw(ctx) {},              // no state changes here
  onKey(code, down) {},      // optional, for games not using the 4-player Input map
  score() {},                // current score for shared/scores.js
  destroy() {}
};
```

Keeping update and draw separate is not decoration. It is what let me verify
Easy Bomber's entire ruleset by stepping `update()` 9000 times under a virtual
clock without rendering a single frame. Every game gets that same testability
for free, and I will use it on every game in Part 4.

### 2.4 Testing approach, which is already proven

For each game I run a headless harness in the browser console:

1. Patch `performance.now()` to a virtual clock.
2. Step `update(1/60)` thousands of times.
3. Assert invariants after every step.

On Bomberman this caught two real bugs and confirmed nine mechanics. Per-game
invariants are listed in each spec in Part 4 under **Invariants to assert**.

---

## Part 3. Site architecture

### 3.1 URL scheme

```
/                          landing page, game grid
/games/bomber/             one folder per game
/games/curve/
/brain/                    brain pack index
/brain/reaction/           each test is its own page for search traffic
/brain/sequence/
/api/scores.php            GET and POST
/api/daily.php             today's puzzle seed
/about/  /privacy/
```

Each game is a directory with `index.html`, so URLs are clean without rewrite
rules and a missing trailing slash still works.

### 3.2 Page anatomy

Every game page is the same shell:

1. `<head>` with per-game title, meta description, Open Graph image, and `Game` JSON-LD structured data
2. Site header with a game switcher
3. The canvas or DOM playfield
4. HUD
5. **Below the fold: an actual rules explanation.** This is not filler. It is the SEO payload and it is what makes the site useful rather than just another clone farm
6. Local best scores, and the global leaderboard if enabled for that game
7. Footer

### 3.3 Landing page

A responsive grid of cards, each with a live canvas thumbnail that animates on
hover, drawn by the game's own renderer in a demo mode. No screenshots to keep
in sync. Filters: players, category, phone friendly.

### 3.4 The scores API

Two endpoints, both plain PHP 8.4 with PDO and prepared statements.

```
GET  /api/scores.php?game=bomber&period=all|month|today&limit=20
POST /api/scores.php   { game, name, score, meta, token }
```

Schema:

```sql
CREATE TABLE scores (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  game        VARCHAR(32)      NOT NULL,
  player_name VARCHAR(24)      NOT NULL,
  score       BIGINT           NOT NULL,
  meta        JSON             NULL,      -- seed, duration, difficulty, input hash
  ip_hash     BINARY(16)       NOT NULL,  -- HMAC of IP, never the raw address
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_board (game, score DESC),
  INDEX idx_recent (game, created_at DESC),
  INDEX idx_rate (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**On cheating, honestly.** A browser game cannot stop a determined cheater. The
score is computed on the client, and anyone can POST whatever they like. What is
achievable:

- Per-IP rate limiting via the `idx_rate` index, for example 10 submissions per hour
- Plausibility bounds per game: reject a Minesweeper expert win in under 3 seconds, or a 2048 score that is not reachable from the tile-merge maths
- Require a duration that matches the score, for example a typing test of 60 seconds cannot arrive 4 seconds after the page loaded
- Store the RNG seed and an input digest in `meta` so the top entries can be replayed and verified offline, using the same deterministic `update()` the tests use
- Name filtering and a manual delete tool

I would ship local best scores first, and only add global boards for the games
where a leaderboard actually adds something. Chasing perfect anti-cheat on a
static site is wasted effort.

### 3.5 Daily puzzles without server state

`/api/daily.php` returns a seed derived from the UTC date plus a per-game salt:

```php
$seed = crc32(hash_hmac('sha256', $date . ':' . $game, DAILY_SALT, true));
```

Every visitor gets the same puzzle, no rows written, no generation cost. Works
for Easy Words, Easy Sudoku, Easy Picture, Easy Mines and Easy Code. The client
can even compute it offline from the date if the API is unreachable.

### 3.6 SEO and content

The searchable value is in the rules pages and the brain tests. Each game page
needs a genuine 300 to 600 word explanation of how to play, written once,
properly. `Game` and `FAQPage` JSON-LD. A sitemap generated at deploy time. The
brain pack alone is a dozen indexable pages for roughly one game's worth of code.

---

## Part 4. Game specifications

### Wave A. Local multiplayer, one keyboard

These reuse Bomberman's four-player Input module directly. This is the site's
differentiator: almost nothing else on the web does good four-player-on-one-keyboard.

---

#### A1. Easy Bomber - BUILT

Status: complete and verified. See the repo README for the full ruleset.

Summary of what is implemented: 15x13 grid with a hard border and the classic
even-coordinate pillar lattice, giving a 13x11 playfield. Bombs fuse at 2500 ms.
Blast is a cross that stops at steel, consumes exactly one brick, and chain
detonates any bomb it touches. Eight power-ups (fire, bomb, skate, kick, remote,
pierce, vest, skull) with caps of 8 bombs, 8 fire, 4 speed levels. Seven skull
diseases lasting 13 seconds, contagious on contact with the carrier being cured.
Sudden death at 36 seconds remaining, pressure blocks falling in a clockwise
spiral at 340 ms intervals. Best-of-N rounds. CPU bots at three difficulties
using a danger map plus BFS, only bombing when an escape route is provable.

Two things deliberately left out: the boxing glove and power glove, so each
player needs only six keys; and the single player campaign.

**Possible follow-ups:** the classic campaign with the eight enemy archetypes
(Valcom, Onil, Dahl, Minvo, Ovape, Doria, Pass, Pontan, each with distinct speed
and whether it phases through bricks) and the exit door hidden under a random
brick. That is an **M** on top of the existing engine.

---

#### A2. Easy Curve

The single best fun-per-line ratio on this entire list. Originally *Achtung, die
Kurve!* by Filip Oscadal and Kamil Dolezal, 1995.

**Mechanics.** Each player is a dot moving at constant speed, leaving a permanent
solid trail behind it. Two keys per player: turn left, turn right. Held keys turn
continuously, so you steer a smooth curve rather than snapping to 90 degrees.
Movement is free-angle, not grid based. You die on contact with any trail
including your own, or with the arena wall. Last one alive wins the round.

**The gap mechanic, which is what makes it work.** Every trail periodically stops
drawing for a short distance, leaving a hole. Without gaps the arena fills up and
rounds become unwinnable stalemates. With them, a player boxed in can thread a
hole. Implementation: each player has a countdown; on expiry, stop appending trail
segments for 100 to 140 ms, then resume and reset the countdown to a random 1800
to 3400 ms.

| Parameter | Value |
|---|---|
| Arena | 900x700 logical px, no obstacles |
| Speed | 105 px/s, constant |
| Turn rate | 3.1 rad/s |
| Trail width | 4 px, collision radius 3 px |
| Gap interval | random 1800 to 3400 ms |
| Gap length | 100 to 140 ms of travel |
| Self-collision grace | the newest 12 px of own trail is ignored |
| Round start | random positions at least 120 px apart, random headings, 900 ms freeze |
| Scoring | 1 point per surviving opponent per round; first to (players - 1) x 10 |

**Collision detection.** Do not test against a list of line segments, it degrades
as trails grow. Rasterise trails into an off-screen `Uint8Array` collision mask
at 1 px per cell, ~630 KB, and test the 4 pixels at the head. O(1) per player per
frame regardless of trail length. Redraw the mask fresh each round.

**Controls.** Left and right only, so 8 players fit on one keyboard comfortably.
Defaults: `Z/X`, `,/.`, `Left/Right arrows`, `Q/W`, `numpad 1/2`, `V/B`, `9/0`, `N/M`.

**Optional power-ups** (the 2010 remake added these; I would ship without them
first): speed up, slow down, thicker trail, thinner trail, invert opponents'
controls for 4 seconds, pass through trails for 3 seconds, clear all trails.

**Invariants to assert.** Trail mask pixel count only ever increases within a
round except during gaps. No player dies during the start freeze. Exactly one or
zero survivors when the round ends. A player in a fully enclosed region with no
gap always dies within the enclosure traverse time.

**Effort: S.** Genuinely small. Perhaps 350 lines.

---

#### A3. Easy Cycles

Tron light cycles. The grid-locked cousin of Easy Curve, and worth having both
because they play completely differently.

**Mechanics.** Movement is locked to 4 directions on a grid. You cannot reverse
into your own trail. Trails are solid walls, one cell wide. Speed is constant and
increases every 15 seconds. Last alive wins.

| Parameter | Value |
|---|---|
| Grid | 120x90 cells at 8 px |
| Speed | 14 cells/s, +2 every 15 s, cap 26 |
| Turn queue | one buffered input, applied at the next cell boundary |
| Scoring | last alive takes the round, first to 10 |

The buffered turn is the detail that makes it feel good: without it, inputs
between cell boundaries get dropped and the game feels unresponsive.

**Effort: S.** Around 200 lines. Reuses `shared/grid.js`.

---

#### A4. Easy Volley

Slime volleyball. Two players, one net, absurd physics, and an extremely high
laughs-per-line ratio.

**Mechanics.** Each player is a semicircle that can move left and right and jump.
The ball is affected by gravity and bounces off the ground, the walls, the net and
the players. Bounce off a player depends on the contact angle relative to the
player's centre, so the semicircle acts as a curved deflector, plus a fraction of
the player's own velocity is added. A point is scored when the ball touches the
ground on the opponent's side. First to 11.

| Parameter | Value |
|---|---|
| Court | 800x400 logical px, net at centre, 90 px tall |
| Gravity | 1400 px/s² |
| Player speed | 320 px/s |
| Jump impulse | 620 px/s, no double jump |
| Player radius | 40 px, semicircle |
| Ball radius | 12 px |
| Ball restitution | 1.0 off players, 0.9 off ground and walls |
| Velocity transfer | 0.35 of player velocity added on contact |
| Max ball speed | clamp to 900 px/s or it becomes untrackable |
| Serve | ball spawns 250 px above the player who lost the point |

**Controls.** 3 keys each: `A/D` plus `W`, and `Left/Right` plus `Up`.

**The one hard part** is the ball-versus-net collision. Treat the net as a
rectangle with a rounded cap on top, because a bare rectangle produces
unsatisfying corner bounces that feel like a bug.

**Effort: S.**

---

#### A5. Easy Puck

Air hockey for two players.

**Mechanics.** Each player drags a mallet inside their own half. The puck slides
with light friction and bounces off walls. Goals at each end. Mallet-puck
collision is a circle-circle elastic response with the mallet's velocity
transferred, which is what makes a smash feel like a smash.

| Parameter | Value |
|---|---|
| Table | 600x900 logical px, portrait, goal mouth 200 px |
| Puck radius | 16 px, friction 0.995/frame, max speed 1100 px/s |
| Mallet radius | 30 px, speed 520 px/s, confined to own half |
| Restitution | 0.92 off walls, 1.0 off mallets |
| Match | first to 7 |

**Sub-stepping is required.** At 1100 px/s the puck travels 18 px per frame,
enough to tunnel through a mallet or a wall. Sub-step the physics at a fixed
4 ms internally. This is the single most common bug in air hockey clones.

**Controls.** Keyboard for both, plus multi-touch on a tablet where each player
uses a thumb. The tablet version is genuinely the better way to play it.

**Effort: S**, plus care on the sub-stepping.

---

#### A6. Easy Tanks

The Wii Play tank game, which is the best local multiplayer shooter design in a
small space.

**Mechanics.** Top-down arena with walls. Each tank moves and rotates, and fires
shells that **bounce off walls** up to a limited number of times before expiring.
Your own shells kill you. Limited shells in flight. Optional mines that explode
in a radius after a delay, destroying walls and tanks.

| Parameter | Value |
|---|---|
| Arena | 20x15 tiles at 40 px, mix of solid and destructible walls |
| Tank speed | 90 px/s, rotate 2.4 rad/s, turret aims independently |
| Shell speed | 260 px/s, 1 bounce, lifetime 3.5 s, max 5 in flight |
| Mine | 2 max, 3 s fuse, 1.5 tile radius |
| Round | last alive, first to 5 |

**CPU bots** reuse the Bomberman approach almost directly: a danger map (shell
trajectories projected forward including their bounces), BFS for movement, and
line-of-fire checks including one bounce for aiming. The bounce prediction is the
interesting part and is just ray reflection.

**Effort: M**, mostly the bounce-aware bot.

---

### Wave B. The brain pack

Twelve games sharing one shell (`shared/quiz.js`) and one visual language. Each
is small, each is its own indexable page, and people search for these by name.
This is the highest content-per-effort item on the whole list.

All twelve share: a start screen, a trial runner with precise stimulus timing via
`performance.now()`, per-trial logging, a results card with your score plus a
percentile against stored results, local history with a sparkline, and a share
image drawn on canvas.

**One methodological note.** Timing accuracy in a browser is limited by display
refresh, roughly 16.7 ms at 60 Hz, plus input latency. Reaction times will read
20 to 50 ms slower than lab equipment. I will state this on the page rather than
pretend to millisecond precision.

---

#### B1. Easy Reaction

Wait for the screen to turn green, click as fast as you can.

| Parameter | Value |
|---|---|
| Trials | 5, then average |
| Delay before green | random 1500 to 4500 ms, uniform |
| Early click | trial voided, "too soon", does not count |
| Result | mean of 5, plus best single |
| Reference | median adult around 273 ms; under 200 ms is exceptional |

**Effort: S.** Perhaps 120 lines. The care goes into measuring from the actual
paint of the green frame, not from when the timer fired.

---

#### B2. Easy Sequence

Tiles light up in a growing order, you repeat it.

| Parameter | Value |
|---|---|
| Grid | 3x3 |
| Sequence | starts at length 1, grows by 1 each success |
| Playback | 500 ms lit, 200 ms gap |
| Lives | 3 |
| Score | longest sequence completed |
| Reference | typical adult span 8 to 10 |

Distinct from Simon in that the tiles are silent and spatial rather than
colour-and-tone paired.

**Effort: S.**

---

#### B3. Easy Visual

A grid flashes a set of cells, you click them back.

| Parameter | Value |
|---|---|
| Grid | starts 3x3, grows to 4x4, 5x5 and beyond as you advance |
| Cells flashed | equals the level number |
| Flash duration | 1000 ms |
| Lives | 3, one lost per level failed |
| Score | highest level reached |

Tests spatial pattern memory rather than order, which is what separates it from
Easy Sequence.

**Effort: S.**

---

#### B4. Easy Digits

A number appears, then disappears, then you type it.

| Parameter | Value |
|---|---|
| Start | 1 digit, +1 per success |
| Display duration | 1000 ms + 100 ms per digit |
| Presentation | digits joined with no spaces, to prevent chunking |
| Correct | exact string match required |
| Lives | 1, the run ends on the first miss |
| Reference | average around 7, matching Miller's classic digit span |

**Effort: S.**

---

#### B5. Easy Words

Not the word guessing game, this is verbal recognition memory. Words appear one
at a time and you answer SEEN or NEW.

| Parameter | Value |
|---|---|
| Word pool | 800 to 1500 common words, own list, English and Dutch |
| New word probability | 50%, drawn from the unseen pool |
| Seen word | drawn from a queue of previously shown words, weighted toward older ones |
| Lives | 3 |
| Score | correct answers before 3 mistakes |

**Naming clash.** This collides with the word guessing game below. Call this one
**Easy Recall** and keep Easy Words for the Wordle-style game.

**Effort: S**, plus building the word lists.

---

#### B6. Easy Chimp

A working replica of the Ayumu chimpanzee working memory experiment, where
chimpanzees outperformed humans.

| Parameter | Value |
|---|---|
| Start | 4 numbered squares at random grid positions |
| Reveal | numbers visible until the first click, then all hide |
| Task | click the squares in ascending numeric order |
| Progression | +1 square per success |
| Strikes | 3 |
| Score | highest count completed |
| Reference | most people fail around 8 or 9 |

**Effort: S.** Worth a short note on the page about the actual primate study,
which is genuinely interesting and good for dwell time.

---

#### B7. Easy Aim

Click 30 targets as fast as possible.

| Parameter | Value |
|---|---|
| Targets | 30 |
| Target size | 40 px radius, never within 60 px of the previous position |
| Result | mean ms per target |
| Miss | click outside the target logs a miss, no time penalty |

**Effort: S.**

---

#### B8. Easy Typing

Words per minute over 60 seconds.

| Parameter | Value |
|---|---|
| Duration | 60 s, started by the first keystroke |
| Text | random common words from a 200 word pool, not a quotation |
| WPM | (characters typed / 5) / minutes, the standard definition |
| Accuracy | correct chars / typed chars, shown alongside |
| Backspace | allowed, corrections count |
| Display | current word highlighted, per-character colouring |

Using random words rather than a passage avoids both a copyright question and
the memorisation advantage on repeat runs.

**Effort: S.**

---

#### B9. Easy Stroop

The colour-word interference test, and a real piece of cognitive psychology.

| Parameter | Value |
|---|---|
| Trials | 60 |
| Congruent share | 50%, for example the word "red" printed in red |
| Task | respond to the **ink colour**, not the word |
| Response | 4 keys mapped to colours, or 4 on-screen buttons |
| Timeout | 2000 ms per trial, then counted as a miss |
| Inter-trial | 400 ms blank |
| Primary output | interference score = mean RT incongruent minus mean RT congruent |
| Also report | accuracy per condition |

The interference score is the scientifically meaningful number, not raw speed, so
that is what the results card leads with.

**Effort: S.**

---

#### B10. Easy N-Back

Working memory training, the most demanding test in the pack.

| Parameter | Value |
|---|---|
| n | selectable 1, 2, 3 |
| Trials | 72 per block |
| Target rate | 25% |
| Stimulus | a square in one of 8 grid positions, 500 ms on, 2000 ms response window |
| Task | press MATCH when the current position equals the one n steps back |
| Accuracy | 1 - ((commissions + omissions) / total possible) as a percentage |
| Advanced | also report d' = z(hit rate) - z(false alarm rate) |

**Sequence generation matters.** Naive random placement produces accidental
targets and skews the target rate. Generate deliberately: choose target positions
first, then fill non-targets with positions that do not match n back, and cap
lures, meaning near-misses at n-1 and n+1, at about 15%.

**Effort: M**, entirely because of correct sequence generation and d' maths.

---

#### B11. Easy Grid

The Schulte table, an attention and peripheral vision drill.

| Parameter | Value |
|---|---|
| Grid | 5x5 with 1 to 25 scattered randomly |
| Task | click in ascending order as fast as possible |
| Wrong click | 300 ms red flash penalty, no reset |
| Result | total seconds, plus per-number split times |
| Variants | 4x4 and 6x6, plus a mode where you must fixate the centre |

**Effort: S.** Around 100 lines.

---

#### B12. Easy Pairs

Concentration, the classic card matching memory game. The one game in the pack
that is genuinely a party game, supporting up to 4 players taking turns.

**Mechanics.** Cards face down in a grid. Flip two. Match keeps them face up and
you go again. No match flips them back after a delay. Game ends when all pairs are
found. Most pairs wins.

| Parameter | Value |
|---|---|
| Grid sizes | 4x3, 4x4, 6x4, 6x6, 8x6 (6 to 24 pairs) |
| Face designs | procedural: 24 distinct shape-and-colour combinations drawn as canvas paths, no image files |
| Mismatch delay | 900 ms, skippable by clicking |
| Players | 1 to 4 hot seat, match keeps your turn |
| Solo scoring | moves used, and time; local best per grid size |
| Optional | a timed mode, and a "peek" that reveals all for 2 s at the cost of 5 moves |

Procedural card faces are the interesting design constraint: combining 6 shapes
x 4 colour schemes x 2 fill patterns gives 48 distinct faces with no assets.

**Effort: S.**

---

#### B13. Easy Signal

Simon. Four coloured buttons, each with its own tone, repeat the growing sequence.

**Exact tones from the original hardware.** The four notes are based on a bugle's
G1, C2, E2 and G2, produced imprecisely by the 1978 chip:

| Button | Frequency |
|---|---|
| Green | 415 Hz |
| Red | 310 Hz |
| Yellow | 252 Hz |
| Blue | 209 Hz |

Using these exact frequencies rather than a clean major chord is the difference
between a Simon clone that sounds right and one that does not. Our `Sfx` module
plays them directly.

| Parameter | Value |
|---|---|
| Sequence | +1 per round |
| Tone duration | 420 ms at start, shortening at rounds 6, 14 and 32 |
| Gap | 50 ms |
| Input window | 3000 ms per press, then a fail |
| Win | the original's skill level 4 completes at 31; level 1 ends at 8 |
| Lives | 1 |

**Effort: S.**

---

### Wave C. Puzzle

---

#### C1. Easy Merge (2048)

**Mechanics.** 4x4 grid. Each move slides every tile as far as possible in the
chosen direction. Two tiles of equal value that collide merge into their sum.

Three rules that clones routinely get wrong:

1. **A tile can merge only once per move.** Given `2 2 2 2` pressing left gives
   `4 4`, never `8`.
2. **Merge resolution order is from the direction of travel.** Given `2 2 2`
   pressing left gives `4 2`, not `2 4`.
3. **A move is only legal if something actually changes.** If nothing slides and
   nothing merges, no new tile spawns and the move is rejected.

| Parameter | Value |
|---|---|
| Grid | 4x4 |
| Start | 2 tiles |
| Spawn per move | 1 tile in a random empty cell, value 2 at 90%, value 4 at 10% |
| Score | += the value of each tile created by a merge |
| Win | reach 2048, then offer continue |
| Lose | no empty cell and no legal merge in any direction |
| Extras | undo one move, and 5x5 and 6x6 variants |

**Implementation note.** Implement one direction properly as a row transform,
then rotate the board to reuse it for the other three. Roughly a quarter of the
code and a quarter of the bugs.

**Invariants to assert.** Score always equals the sum over all merges performed.
Tile count never exceeds 16. A rejected move must not spawn a tile. Every merged
value is a power of two.

**Effort: S.** Around 250 lines including smooth slide-and-pop animation.

---

#### C2. Easy Mines (Minesweeper)

**Mechanics.** Reveal cells. A revealed cell shows the count of mines in its 8
neighbours. Revealing a 0 flood-fills its neighbours. Flag suspected mines. Win
when all non-mine cells are revealed.

| Difficulty | Grid | Mines | Density |
|---|---|---|---|
| Beginner | 9x9 | 10 | 12.3% |
| Intermediate | 16x16 | 40 | 15.6% |
| Expert | 30x16 | 99 | 20.6% |
| Custom | up to 50x30 | user set | capped so it stays solvable |

**The two features that separate a good implementation from a bad one:**

1. **First click safe.** Mines are placed *after* the first click, excluding the
   clicked cell **and all 8 of its neighbours**, guaranteeing the first click
   opens a zero region rather than a lone number. This is the modern standard.
2. **Chording.** Clicking a revealed number that already has exactly that many
   flags around it reveals all its other neighbours at once. Bound to left+right
   click together, and to middle click. If a flag is wrong you detonate. This is
   the core speed technique and its absence makes the game feel broken to anyone
   who plays Minesweeper seriously.

Also required: a mine counter, a timer, question-mark flags as an option, and
losing revealing all mines with the fatal one highlighted.

**Optional but valuable: a no-guess generator.** Generate, then run a
constraint solver; if the board cannot be completed by logic alone, regenerate.
Removes the frustration of 50/50 guesses at the end. This is an **M** on its own
and I would add it as a second pass.

**Effort: S** for the standard game, **M** with the no-guess generator.

---

#### C3. Easy Lights (Lights Out)

**Mechanics.** 5x5 grid of lights. Pressing a cell toggles it and its 4 orthogonal
neighbours, a plus shape. Turn all lights off.

**The mathematics, which directly determines how to generate puzzles.** Over
GF(2), the puzzle is a linear system. For the 5x5 grid the toggle matrix has a
2-dimensional null space, meaning two non-trivial "quiet patterns" that toggle
nothing. Consequences:

- Only **1 in 4** of the 2^25 possible light configurations is solvable.
- A configuration is solvable if and only if it has an even number of lights in
  common with each quiet pattern.
- Every solvable configuration has exactly **4** distinct solutions, and pressing
  order never matters, only whether each cell is pressed an odd number of times.

**So never generate a random configuration.** Start from all-off and apply a
random subset of presses. The result is solvable by construction, and you know the
minimum solution length. Difficulty is the size of the minimal press set.

| Parameter | Value |
|---|---|
| Sizes | 3x3, 4x4, 5x5, 6x6 |
| Generation | random press subset from solved, minimum press count as difficulty |
| Hint | reveal one cell of a minimal solution |
| Solver | Gaussian elimination over GF(2), used for hints and for "show solution" |
| Score | presses used versus the known minimum |

**Effort: S**, and the Gaussian elimination is about 40 lines.

---

#### C4. Easy Slide (15-puzzle)

**Mechanics.** 4x4 frame, 15 numbered tiles, one gap. Slide tiles into the gap to
order them.

**Solvability, which matters because half of all random shuffles are impossible.**
For the 4x4 puzzle, count inversions across the tiles read in row-major order,
ignoring the blank. The position is solvable if either the blank is on an even row
counted from the bottom and the inversion count is odd, or the blank is on an odd
row from the bottom and the inversion count is even.

Two ways to guarantee a solvable start. Either shuffle randomly and test with the
parity rule, regenerating on failure, or apply a few thousand random legal moves
from the solved state. I would do the second: it is trivially correct, and the
move count gives a rough difficulty measure.

| Parameter | Value |
|---|---|
| Sizes | 3x3, 4x4, 5x5 |
| Shuffle | 2000 random legal moves from solved |
| Input | click a tile in line with the gap to slide the whole row or column |
| Score | moves and time, local best per size |
| Solver | IDA\* with a Manhattan-distance plus linear-conflict heuristic, for the hint button |
| Optional | an image mode, which is the one place a user-supplied image is worth it |

**Effort: S**, or **M** if the IDA\* solver is included.

---

#### C5. Easy Code (Mastermind)

**Mechanics.** The computer picks a secret code of 4 pegs from 6 colours, with
repeats allowed, giving 1296 possible codes. Each guess is scored with black pegs
for right colour in the right position, and white pegs for right colour in the
wrong position.

**The peg scoring algorithm, which is the classic bug.** It must handle duplicates
correctly:

1. Count exact positional matches, these are the black pegs.
2. For each colour, take the minimum of its count in the guess and in the secret.
   Sum those minima.
3. White pegs = that sum minus the black pegs.

Naive per-peg matching double counts and produces wrong feedback.

| Parameter | Value |
|---|---|
| Code length | 4, selectable 3 to 6 |
| Colours | 6, selectable 4 to 10 |
| Repeats | allowed, with a no-repeats option |
| Guesses | 10 |
| Feedback | black and white pegs, unordered, so no positional leak |

**A solver worth building.** Knuth's five-guess algorithm from 1977 opens with
`1122`, then applies minimax over all 1296 codes, choosing the guess that
minimises the worst-case remaining candidate count. It solves any code in at most
5 guesses, averaging 4.478. Two uses: a "how would a computer do it" demo, which
is genuinely interesting content, and a hint button. It also inverts nicely into a
mode where the human sets the code and the computer breaks it.

**Effort: S** for the game, **M** with the Knuth solver.

---

#### C6. Easy Sudoku

**Mechanics.** Fill the 9x9 grid so every row, column and 3x3 box contains 1 to 9
exactly once, with a unique solution.

**Generation, which is the whole job.**

1. **Build a full valid grid** by backtracking with shuffled candidates. Fast and
   uniform enough in practice.
2. **Dig holes.** Repeatedly remove a clue, then verify the puzzle still has
   exactly one solution by running a counting solver that aborts at 2 solutions.
   If uniqueness breaks, put the clue back and try another cell.
3. **Stop when the target clue count is reached** or no further removal preserves
   uniqueness.

**Known bounds:** the minimum clue count for a uniquely solvable classic Sudoku is
**17**, proved exhaustively by McGuire's team at University College Dublin in 2012.
There is no 16-clue puzzle. Typical published puzzles carry 22 to 30 clues.

**Difficulty grading, done properly.** Clue count is a poor proxy. Instead, run a
*logical* solver that applies human techniques in escalating order and record the
hardest technique needed:

| Grade | Techniques required |
|---|---|
| Easy | Naked single, hidden single only |
| Medium | plus naked and hidden pairs, box-line reduction |
| Hard | plus naked and hidden triples, X-wing |
| Expert | plus swordfish, XY-wing, simple colouring |
| Evil | requires forcing chains or trial and error |

A puzzle needing only singles and naked pairs is Easy by definition. This is more
work than counting clues and it is the difference between a real Sudoku and a
random one.

| Feature | Detail |
|---|---|
| Pencil marks | auto-candidates plus manual notes, toggleable |
| Error check | optional, highlight conflicts as you type |
| Hint | name the technique and the cell, do not just fill it in |
| Daily | seeded from the date so everyone shares a puzzle |
| Input | click a cell then a number, keyboard, and arrow key navigation |

**Effort: M**, realistically the largest puzzle item here, because the logical
solver is a real piece of work. Worth doing once and doing well since the solver
also powers hints, grading and the no-guess Minesweeper generator conceptually.

---

#### C7. Easy Picture (Nonogram)

**Mechanics.** A grid with number clues per row and column describing runs of
filled cells in order. Deduce the picture.

**Generation and the uniqueness problem.** A puzzle is properly solvable when
every cell is inferable by logic. The standard approach:

1. Start from a target bitmap, either drawn by hand or generated.
2. Derive the row and column clues from it.
3. Run a **line solver**: for each line, enumerate all placements of its clue runs
   that are consistent with the currently known cells, and mark any cell that is
   the same in all of them. Use a priority queue ordered by expected information
   gain, adding a line back to the queue whenever a crossing line changes.
4. If the line solver completes the grid, the puzzle is line-solvable, meaning
   solvable by pure logic with no guessing. If the queue empties with cells
   unknown, the puzzle needs guessing. **Reject it and adjust the bitmap.**

This matters because line-solvability is what humans can actually do. Puzzles
needing a search are miserable to solve by hand.

| Parameter | Value |
|---|---|
| Sizes | 5x5, 10x10, 15x15, 20x20 |
| Cell states | empty, filled, marked-as-blank |
| Difficulty | number of line-solver sweeps needed to complete |
| Input | click and drag to paint, right-drag to mark blanks |
| Assist | auto-cross completed clue numbers, highlight the active line |
| Content | 40 to 60 hand-designed pictures per size, which is the real cost |

**Effort: M** for the engine, plus ongoing content design. The line solver is
about 120 lines and doubles as the difficulty grader.

---

#### C8. Easy Words (Wordle-style)

**Mechanics.** Guess a 5 letter word in 6 tries. Each guess is coloured per
letter: green for right letter right place, yellow for right letter wrong place,
grey for absent.

**The colouring algorithm, which is where nearly every clone is wrong.** It is a
strict two-pass count-limited match:

1. **Pass one:** mark every position where guess and answer letters are equal as
   green, and decrement that letter's remaining count in the answer.
2. **Pass two:** left to right over the non-green positions, if that letter still
   has a remaining count above zero, mark it yellow and decrement. Otherwise grey.

So with answer `APPLE` and guess `ALLEY`: `A` green, first `L` yellow (the answer
has one L, elsewhere), second `L` grey (count exhausted), `E` yellow, `Y` grey.
About a third of real answers contain a duplicate letter, so this path is hit
constantly.

| Parameter | Value |
|---|---|
| Length | 5, with 4 and 6 letter variants |
| Guesses | 6 |
| Answer list | curated common words, a few thousand |
| Guess list | a much larger valid-word list, so obscure guesses are accepted but never the answer |
| Modes | daily seeded by date, plus unlimited practice |
| Languages | English and Dutch, separate lists |
| Hard mode | revealed hints must be reused in later guesses |
| Share | a canvas-drawn emoji-style grid, visually distinct from the NYT one |

**Word lists** need care: an open-licensed source, filtered for offensive and
obscure entries. This is the one real content dependency in Wave C.

**Effort: S** for the game, plus list curation.

---

#### C9. Easy Four (Connect Four)

**Mechanics.** 7 columns, 6 rows. Players alternate dropping discs into a column;
the disc falls to the lowest empty cell. Four in a row horizontally, vertically or
diagonally wins. All 42 cells filled is a draw.

**The game is strongly solved.** James D. Allen and Victor Allis independently
solved it in October 1988. With perfect play **the first player wins by starting
in the centre column**. Starting in either column adjacent to the centre lets the
second player force a draw. Starting in any of the four outer columns lets the
**second player win**. This is a great fact to put on the rules page, and it also
tells you what the AI must know.

| AI level | Implementation |
|---|---|
| Easy | random legal move, but blocks an immediate win |
| Medium | negamax depth 4 with a simple threat-count evaluation |
| Hard | negamax depth 9 or more, alpha-beta pruning, move ordering centre-out |
| Perfect | bitboard representation, alpha-beta with a transposition table and iterative deepening. Solvable in real time in JS from the opening |

Bitboards make this pleasant: the whole position fits in two 49-bit masks, and
win detection is four shift-and-mask operations. In JavaScript use `BigInt` or
split into two 32-bit halves.

**Effort: S** up to Hard, **M** for the perfect solver.

---

#### C10. Easy Solitaire (Klondike)

**Mechanics.** One 52 card deck. Seven tableau columns dealt 1 to 7 cards, only
the top card of each face up, using 28 cards. The remaining 24 form the stock.
Build four foundations up by suit from Ace. Build tableau columns down in
alternating colours. Only a King may move to an empty column. Sequences move as a
unit.

| Variant | Rule |
|---|---|
| Draw 1 | one card turned per stock click, unlimited passes |
| Draw 3 | three turned at a time, only the top playable, and traditionally three passes in Vegas scoring |

**Two scoring systems, both worth implementing:**

*Standard:* +10 per card to a foundation, +5 per card moved from waste to tableau,
+5 per face-down card turned up, -20 per stock recycle in draw-3, and a time bonus.

*Vegas:* start at -52, +5 per card to a foundation, so breaking even means
finishing 11 cards. Three passes maximum.

| Feature | Detail |
|---|---|
| Input | drag and drop, plus double-click to auto-send to a foundation |
| Undo | unlimited, which requires a full move history |
| Winnable deals | optionally pre-verify solvability with a solver, so no unwinnable deal is served |
| Auto-complete | when only foundation moves remain, fly them home |
| Cards | procedurally drawn, no image files, using `shared/cards.js` |

**Effort: M.** Drag and drop with correct drop-target detection plus unlimited
undo is most of the work, not the rules.

---

### Wave D. Arcade

---

#### D1. Easy Snake

The obvious second game on any games site, and a good five-minute palate cleanser
between bigger builds.

| Parameter | Value |
|---|---|
| Grid | 25x25 cells |
| Speed | 8 cells/s, increasing to 18 as the snake grows |
| Growth | +1 segment per food |
| Death | wall or own body, with an optional wrap-around mode |
| Turn buffer | one queued input applied at the next cell step, essential for responsiveness |
| Score | 10 per food, plus a speed bonus |
| Variants | a 2-player mode where both snakes share the board, which reuses the Input module |

**One detail people miss:** the direction change must be validated against the
direction *at the last step*, not the current queued one, or a fast double-tap
lets you reverse into yourself.

**Effort: S.** Perhaps 180 lines.

---

#### D2. Easy Bricks (Breakout)

**Exact original mechanics**, which are more specific than most clones assume.

| Element | Value |
|---|---|
| Brick rows | 8, in 4 colour bands of 2 rows each |
| Colours bottom-up | yellow, green, orange, red |
| Points | yellow 1, green 3, orange 5, red 7 |
| Paddle | halves in width after the ball breaks through the red row and reaches the top wall |
| Ball speed increases | after 4 hits, after 12 hits, and on first contact with the orange and the red rows |
| Lives | 3 |
| Screens | 2 to clear, maximum score 896 |

Modern additions I would include, clearly separated as an "arcade plus" mode:
paddle-position-dependent deflection angle, multi-ball, a widening power-up, and
a sticky paddle. The purist mode keeps the 1976 numbers exactly.

**Physics note.** Reflect the ball using the contact point on the paddle rather
than a pure angle-of-incidence bounce, or the game becomes uncontrollable. Clamp
the vertical component so the ball can never travel nearly horizontally.

**Effort: S.**

---

#### D3. Easy Rocks (Asteroids)

**Mechanics.** A ship with rotation, thrust and inertia in a frictionless
wrap-around field. Shoot rocks, which split. Vector graphics, which suits our
no-assets rule perfectly.

| Element | Value |
|---|---|
| Large asteroid | 20 points, splits into 2 medium |
| Medium asteroid | 50 points, splits into 2 small |
| Small asteroid | 100 points, destroyed outright |
| Large saucer | 200 points, fires inaccurately |
| Small saucer | 1000 points, fires accurately, and after 40000 points only this one appears |
| Wave 1 | 4 large asteroids, +2 per wave, capped around 10 to 12 |
| Extra ship | every 10000 points |
| Bullets | maximum 4 on screen, with a limited lifetime |
| Hyperspace | teleports to a random location with zero velocity, and **fails destructively 25% of the time** (the original rolls 0 to 31 and dies on 24 to 31) |

The 25% hyperspace death chance is the detail that makes it a real decision rather
than a free escape. Keep it.

**Physics.** Thrust applies acceleration along the facing, with no friction, so
velocity persists. A small drag coefficient is a common clone deviation and it
ruins the feel. Screen wrap applies to everything including bullets.

**Effort: S.** Vector rendering, simple physics, no assets. One of the best
effort-to-impression ratios on the list.

---

#### D4. Easy Pong

Worth building purely as the smallest possible two-player game, and as the
canonical test of the shared engine.

| Parameter | Value |
|---|---|
| Paddle | 12x80 px, speed 420 px/s |
| Ball | starts 300 px/s, +20 px/s per paddle hit, cap 780 px/s |
| Deflection | vertical component from the contact offset on the paddle |
| Serve | toward the player who last conceded, after a 700 ms pause |
| Match | first to 11, win by 2 |
| CPU | tracks the ball's predicted intercept with a reaction delay and an aim error that scale with difficulty |

The CPU imperfection model matters: a perfect tracker is unbeatable and boring.
Give it a reaction delay of 90 to 220 ms and a target error of 5 to 30 px.

**Effort: S.** Under 150 lines.

---

#### D5. Easy Invaders

**Exact original structure.**

| Element | Value |
|---|---|
| Formation | 5 rows x 11 columns, 55 aliens |
| Points | bottom two rows 10, middle two rows 20, top row 30 |
| UFO | 50 to 300 points, and famously 300 on the 23rd shot and every 15th shot after |
| Movement | the whole formation steps sideways, dropping one row and reversing on reaching a wall |
| **Speed** | scales inversely with the number of aliens remaining, so the last few are very fast |
| Shields | 4 destructible bunkers, eroded by both alien and player fire |
| Extra life | at 1500 points |
| Loss | an alien reaching the player's row, or all lives lost |

The accelerating formation was originally a hardware artifact: the CPU could only
update one alien per frame, so fewer aliens meant faster movement. It became the
defining mechanic. Reproduce it deliberately with `stepInterval = base * (aliensAlive / 55)`.

**Shield erosion** should be per-pixel on an offscreen canvas rather than
tile-based. It is what makes the bunkers feel real, and it is easy: punch a
circle out of an alpha mask and test collisions against it.

**Effort: S** to **M**, the shields being the interesting part.

---

#### D6. Easy Lander (Lunar Lander)

Pure physics, no assets, and a genuinely tense game.

| Parameter | Value |
|---|---|
| Gravity | 1.62 m/s², actual lunar, scaled to pixels |
| Thrust | 2.5x gravity at full throttle, throttle is analogue via key hold |
| Fuel | finite, consumed proportionally to throttle |
| Rotation | 1.8 rad/s, no reaction-mass cost |
| Safe landing | vertical speed under 2.5 m/s, horizontal under 1.5 m/s, tilt under 8 degrees, and on a flat pad |
| Terrain | procedurally generated by midpoint displacement, with 1 to 3 flat pads carrying score multipliers |
| Score | fuel remaining, landing gentleness, and the pad multiplier |

**Effort: S.**

---

#### D7. Easy Missiles (Missile Command)

**Mechanics.** Defend 6 cities with 3 missile batteries. Click a point in the sky;
an interceptor flies there and detonates into an expanding sphere that destroys
any incoming warhead it touches. The expanding-then-contracting blast, and chaining
one blast into the next incoming wave, is the whole game.

| Element | Value |
|---|---|
| Batteries | 3, each with **10 missiles**, so 30 shots per wave, and they do not refill mid-wave |
| Cities | 6 |
| Interceptor speed | differs per battery, the centre battery being fastest in the original |
| Blast | expands to a radius over about 0.6 s, holds, then contracts. Destroys anything inside |
| Incoming | ICBMs, some splitting **MIRV** style into multiple warheads mid-flight |
| Smart bombs | steer around a blast that is not perfectly placed |
| End-of-wave bonus | per unused missile and per surviving city, multiplied by a wave multiplier of 1 to 6 |
| Bonus city | awarded every 8000 to 12000 points, replacing a destroyed one |
| Loss | all 6 cities destroyed |

**Leading the target is the skill.** The interceptor takes time to arrive, so you
must click ahead of the warhead. Do not add any aim assist.

**Effort: M**, mostly the smart bomb evasion and the MIRV split timing.

---

#### D8. Easy Blocks (Tetris-like)

The biggest traffic draw and the highest legal caution. Build it to the modern
Tetris Guideline standard, because anything less feels wrong to anyone who plays
seriously, but present it as its own thing.

**Rotation: SRS.** The Super Rotation System defines spawn orientations, rotation
states, and **wall kicks**. Each rotation attempt tests up to **5 offset
candidates** in order: the plain rotation, then right or left kicks, then floor
kicks. The first that fits is used; if none fit the rotation fails. Wall kicks are
what make T-spins possible at all, so they are not optional.

**Randomiser: 7-bag.** Shuffle all 7 piece types, deal them, then shuffle a new
bag. Guarantees you never wait more than 12 pieces for any given piece, and never
get the flood of S and Z pieces that a naive random generator produces.

| Element | Value |
|---|---|
| Playfield | 10 wide x 20 visible, with a hidden buffer above for spawns |
| Next queue | 5 pieces visible |
| Hold | 1 piece, usable once per placement |
| Lock delay | 500 ms, reset on movement or rotation, capped at 15 resets to prevent infinite stalling |
| Gravity per level | `(0.8 - (level-1) * 0.007) ^ (level-1)` seconds per cell, the Guideline formula |
| Line clear score | single 100, double 300, triple 500, quad 800, all x level |
| T-spin score | single 800, double 1200, triple 1600, x level |
| Back-to-back | x1.5 for consecutive quads or T-spins |
| Combo | escalating bonus per consecutive clearing placement |
| Soft drop | 1 point per cell. Hard drop 2 points per cell |
| DAS and ARR | delayed auto shift about 170 ms, auto repeat rate about 30 ms, both configurable |
| Level up | every 10 lines |

**T-spin detection.** A T piece placement counts as a T-spin when the placement's
last successful action was a rotation and at least 3 of the 4 diagonal cells
around the T's centre are occupied. Mini versus full T-spin depends on which
corners. Getting this right is what separates a real implementation from a
lookalike.

**Presentation must differ.** Own palette, own board framing, own piece styling,
own name. See 1.3 for why this specific game needs that care.

**Effort: M**, and the most detail-sensitive game on the list. SRS kick tables
alone are 4 tables of 5 offsets per rotation transition.

---

#### D9. Easy Muncher (Pac-Man-like)

The most sophisticated AI on the list, and it is all deterministic target-tile
rules rather than anything learned.

**Ghost behaviour, from Jamey Pittman's Pac-Man Dossier, which is the definitive
reverse engineering.** Each ghost picks a target tile every frame and moves toward
it greedily, choosing at each intersection the direction that minimises Euclidean
distance to its target, and **never reversing** unless a mode change forces it.

| Ghost | Chase target |
|---|---|
| Red | the player's current tile, directly |
| Pink | 4 tiles ahead of the player's current direction, so it tries to cut you off |
| Cyan | take the tile 2 ahead of the player, draw a vector from Red's position to it, and **double that vector**. The result is wildly variable and depends on where Red is |
| Orange | if further than 8 tiles from the player, target the player like Red. Within 8 tiles, target its own scatter corner, so it visibly loses its nerve |

**Scatter targets** are the four maze corners, one per ghost, which produces the
looping patrol patterns.

**Mode timing on level 1:** scatter 7 s, chase 20 s, scatter 7 s, chase 20 s,
scatter 5 s, chase 20 s, scatter 5 s, then chase permanently. Later levels shorten
the scatter phases toward zero.

**Other exact details worth reproducing:**

- **Pink's up-direction bug.** When the player faces up, Pink targets 4 tiles up *and 4 tiles left*, an overflow bug in the original. It is famous, it changes strategy, and I would keep it and document it.
- **Cruise Elroy.** Red speeds up when the remaining pellet count drops below a level-dependent threshold, twice, becoming faster than the player.
- **Frightened mode.** Ghosts reverse immediately, turn blue, move slowly, and choose directions pseudo-randomly. Duration shrinks with level and eventually reaches zero.
- **Ghost eating** scores 200, 400, 800, 1600 within one power pellet.
- **Tunnels** slow ghosts down, giving the player an escape route.
- Pellet 10, power pellet 50, plus fruit values per level.

| Element | Value |
|---|---|
| Maze | 28x31 tiles, **our own layout**, not the original |
| Pellets | around 240 including 4 power pellets |
| Lives | 3, extra at 10000 |
| Player speed | slightly faster than base ghost speed, and pellet-eating costs a frame, which is the actual reason the original is beatable |

**Legal note.** The maze layout and character designs are the protected part.
Design an original maze and original character shapes. The AI rules are just rules.

**Effort: M** to **L**. The AI is well documented so it is transcription rather
than invention, but the tuning table across levels is large.

---

## Part 5. Building on SiteGround

### 5.1 Repository layout

```
easy-games/
  public_html/                  <- the document root
    index.html                  landing page
    games/
      bomber/  index.html  js/  css/
      curve/   index.html  js/
      ...
    brain/
      index.html
      reaction/ sequence/ visual/ digits/ recall/ chimp/
      aim/ typing/ stroop/ nback/ grid/ pairs/ signal/
    shared/
      js/    input.js audio.js utils.js loop.js scene.js scores.js
             touch.js grid.js cards.js rng.js sprite.js quiz.js
      css/   base.css shell.css
    api/
      scores.php  daily.php  _bootstrap.php
    assets/
      icons/  og/            <- generated Open Graph images
    .htaccess
    sitemap.xml               <- generated at deploy
  config/
    config.php                <- DB credentials, above the document root
  db/
    migrations/               <- plain SQL files, applied in order
  scripts/
    deploy.sh
    post-receive
    build.sh                  <- version stamping, sitemap, minify
  docs/
    PLAN.md                   <- this file
  tools/
    verify.js                 <- the headless test harness
```

The critical structural point: **`config/` sits above `public_html/`** so database
credentials are never web reachable, even if PHP breaks and files get served as
plain text.

### 5.2 Local development with MAMP

Symlink the repo into MAMP's document root:

```bash
ln -s "/Users/jorisstolker/Sites/Claude sites/Easy-games/public_html" /Applications/MAMP/htdocs/easy-games
```

Then `http://localhost:8888/easy-games/`. MAMP is needed only for the PHP API and
the daily seed. Every game itself opens straight from the filesystem by double
clicking its `index.html`, because we use plain scripts rather than ES modules and
never `fetch()` for game logic. That is a deliberate choice: it keeps the
inner development loop instant.

Local MySQL for the scores table, created once from `db/migrations/`.

### 5.3 Deploy: git over SSH, matching your existing sites

This mirrors what easy-mail already does, so there is one pattern across your
sites rather than two.

**One-time server setup** over SSH on port 18765:

```bash
mkdir -p ~/repos && git init --bare ~/repos/easy-games.git
# copy scripts/post-receive into ~/repos/easy-games.git/hooks/post-receive
chmod +x ~/repos/easy-games.git/hooks/post-receive
mkdir -p ~/www/easygames.<tld>
```

**One-time local setup:**

```bash
git remote add production ssh://USER@HOST:18765/home/USER/repos/easy-games.git
```

**Every deploy:**

```bash
./scripts/deploy.sh production
```

**The `post-receive` hook**, following your existing conventions, with `php84`
called explicitly and the OPcache directory flushed:

```bash
#!/usr/bin/env bash
set -euo pipefail

SITE_DIR="$HOME/www/easygames.<tld>"
GIT_DIR="$(pwd)"

echo "==> Checking out to ${SITE_DIR}"
mkdir -p "${SITE_DIR}"
git --work-tree="${SITE_DIR}" --git-dir="${GIT_DIR}" checkout -f main

cd "${SITE_DIR}"

echo "==> Stamping build id for cache busting"
BUILD="$(git --git-dir="${GIT_DIR}" rev-parse --short HEAD)"
echo "${BUILD}" > config/build.txt

echo "==> Applying database migrations"
php84 scripts/migrate.php || echo "    migrations skipped"

echo "==> Regenerating sitemap"
php84 scripts/sitemap.php

echo "==> Flushing SiteGround file-based OPcache"
rm -rf "$HOME/.opcache/"* 2>/dev/null || true

echo "==> Deploy complete: ${BUILD}"
```

There is no `composer install` step because there are no PHP dependencies. Three
small PHP files do not need a package manager.

### 5.4 Cache busting, which is the one thing that will bite you

A static JS game is aggressively cached by browsers. Ship a fix and returning
players keep running the old code. I hit exactly this while testing Bomberman:
the browser served a stale `arena.js` and the bug I had just fixed still
reproduced.

**Solution.** The deploy writes a short git SHA to `config/build.txt`. Game pages
are `.php` and emit versioned asset URLs:

```php
<?php $b = trim(@file_get_contents(__DIR__.'/../../config/build.txt')) ?: 'dev'; ?>
<script src="/shared/js/input.js?v=<?= $b ?>"></script>
<script src="js/game.js?v=<?= $b ?>"></script>
```

With `.htaccess` then safely setting a long cache on the assets themselves:

```apache
<IfModule mod_headers.c>
  <FilesMatch "\.(js|css|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\.(html|php)$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>
</IfModule>
```

The pages are always fresh, the assets are cached forever, and a deploy changes
every asset URL at once. This is the correct pattern and it costs almost nothing.

Trade-off to accept: game pages become `.php` rather than `.html`. They still
serve at clean directory URLs, and they remain fully static output.

### 5.5 The PHP API, concretely

`api/_bootstrap.php` handles the shared concerns:

- Load `config/config.php` from above the document root
- Open a PDO connection with `ERRMODE_EXCEPTION` and emulated prepares off
- JSON request parsing with a size limit
- A rate limiter that counts rows in `scores` by `ip_hash` within the last hour
- `ip_hash` computed as `hash_hmac('sha256', $ip, IP_SALT, true)` truncated to 16 bytes, so raw IPs are never stored, which is the GDPR-friendly choice
- A strict CORS policy: same origin only
- Consistent JSON error envelopes

`api/scores.php` validates: game slug against a whitelist, score against a
per-game plausible range, name length and character class, and an elapsed-time
plausibility check. Then inserts, and returns the player's rank.

`api/daily.php` returns `{ date, game, seed }` with a 1 hour `Cache-Control`, so
it is nearly free to serve.

### 5.6 Security checklist

- All SQL through prepared statements, no string interpolation anywhere
- Player names escaped on output, and a profanity filter on input
- No file uploads anywhere on the site
- `.htaccess` denying access to `db/`, `scripts/`, `tools/` and any dotfile
- No secrets in the repo: `config/config.php` is created on the server once and gitignored, with `config/config.example.php` committed
- HTTPS enforced by redirect, and HSTS once you are confident
- A Content-Security-Policy header. Everything is same origin and inline-free except where a small inline script is unavoidable, in which case use a nonce
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- Rate limiting on the only write endpoint

### 5.7 Cron, via Site Tools

No shell crontab on SiteGround, so these go in Site Tools, Devs, Cron Jobs, each
calling `php84` explicitly:

| Schedule | Job | Purpose |
|---|---|---|
| Daily 03:00 | `php84 ~/www/easygames.<tld>/scripts/prune.php` | Delete score rows older than 12 months except per-game top 100 |
| Daily 03:15 | `php84 .../scripts/sitemap.php` | Regenerate the sitemap, in case content changed without a deploy |
| Weekly | `php84 .../scripts/verify-top.php` | Replay stored seeds and input digests for the top entries, and flag implausible ones |

### 5.8 Performance targets

Since we control everything and there are no dependencies, these should be easy:

| Metric | Target |
|---|---|
| Landing page transfer | under 60 KB gzipped |
| A game page transfer | under 90 KB gzipped including shared modules |
| Time to interactive | under 400 ms on a warm cache |
| Frame rate | a locked 60 fps on a 5 year old laptop, and on mid-range phones |
| Lighthouse performance | 95 or above |

Concrete measures: no fonts loaded over the network, use the system font stack;
SVG or canvas icons rather than an icon font; a single shared CSS file; and
`defer` on all scripts.

### 5.9 Backups and rollback

Deploys are git checkouts, so rollback is `git push production <old-sha>:main
--force` followed by the hook running again. The database holds only scores, so
SiteGround's own daily backups are sufficient. Nothing here is business critical,
which is worth remembering before over-engineering it.

---

## Part 6. Roadmap

### Phase 0. Extract the engine, 1 session

Move Input, Sfx, Utils, the loop and the UI shell out of Bomberman into
`/shared/`, add `loop.js`, `scene.js`, `rng.js`, `grid.js` and `scores.js`. Point
Bomberman at the shared copies and confirm it still passes its verification
harness. **This must come first**, because doing it after five games exist means
migrating five games.

### Phase 1. Site shell, 1 session

Landing page with the game grid, the shared header, the page template, the `.php`
version stamping, `.htaccess`, and the scores API with local-only scores at first.
Bomberman becomes game one in a real site rather than a standalone folder.

### Phase 2. Easy Curve, 1 session

Small, immediately fun, and it proves the shared Input module works outside
Bomberman. **S**

### Phase 3. The brain pack, 3 to 4 sessions

Build `shared/quiz.js` plus all thirteen tests. Roughly a dozen indexable pages.
This is where the site starts attracting search traffic. **M** total.

### Phase 4. Puzzle batch one, 2 sessions

Easy Merge, Easy Mines, Easy Lights, Easy Slide. All **S**, all self-contained, all
evergreen.

### Phase 5. Arcade batch, 2 to 3 sessions

Easy Snake, Easy Bricks, Easy Rocks, Easy Pong, Easy Lander. Heavy code sharing
between them: one particle system, one starfield, one vector renderer, one
game-over flow. All **S**.

### Phase 6. Local multiplayer batch, 2 to 3 sessions

Easy Cycles, Easy Volley, Easy Puck, Easy Tanks. Rounds out the party section to
six games, which is a genuinely distinctive offering.

### Phase 7. The heavier ones, 1 to 2 sessions each

Easy Words with list curation, Easy Four with the solver, Easy Code with the
Knuth solver, Easy Invaders, Easy Missiles, Easy Solitaire.

### Phase 8. The big two, 2 to 3 sessions each

Easy Sudoku with the grading solver, and Easy Picture with the line solver.

### Phase 9. Highest risk and highest reward, last

Easy Blocks and Easy Muncher. Both **M** to **L**, both needing the most care,
and Easy Blocks needing the most legal caution. Ship them once everything safe is
live and the site has traffic.

### Summary count

| Wave | Games | Total effort |
|---|---|---|
| A. Local multiplayer | 6 (1 built) | 1 M, 4 S remaining |
| B. Brain pack | 13 | 2 M, 11 S |
| C. Puzzle | 10 | 4 M, 6 S |
| D. Arcade | 9 | 3 M, 6 S |
| **Total** | **38 pages, 27 distinct games** | roughly 18 to 24 sessions |

---

## Part 7. Decisions needed from you

1. **Domain.** A new domain such as `easygames.nl`, or a subdirectory on an existing site? This affects the deploy target and the SEO strategy.
2. **Language.** English only, Dutch only, or both? Both doubles the content writing and needs a language switcher plus `hreflang`, but Dutch has far less competition for these keywords.
3. **Global leaderboards.** Ship them, or start with local best scores only? Local only means zero database, zero API, zero abuse surface for Phase 1.
4. **Do the games need to be embeddable?** If you want them usable on your other sites via iframe, that changes the page shell and the CSP now rather than later.
5. **Ads or entirely clean?** This is the single biggest influence on the design, and retrofitting ad slots later is unpleasant.
6. **Build order.** I have proposed engine first, then Curve, then the brain pack. If you would rather see a specific game next, say which.
7. **Easy Blocks.** Build it with the naming and presentation precautions, or leave it out? Your call, and I would want it in writing either way.

---

## Part 8. Sources

Mechanics were verified against these references rather than reconstructed from
memory.

- Tetris Guideline, SRS and wall kicks: [tetris.wiki Tetris Guideline](https://tetris.wiki/Tetris_Guideline), [tetris.wiki SRS](https://tetris.wiki/Super_Rotation_System), [harddrop SRS](https://harddrop.com/wiki/SRS)
- Pac-Man ghost AI and mode timings: [The Pac-Man Dossier](https://www.gamedeveloper.com/design/the-pac-man-dossier)
- Space Invaders formation, scoring, UFO cycle: [Shmups Wiki](https://www.shmups.wiki/library/Space_Invaders), [Space Invaders Wiki UFO](https://spaceinvaders.fandom.com/wiki/UFO)
- Asteroids scoring, waves, hyperspace failure rate: [ClassicGaming play guide](https://www.classicgaming.cc/classics/asteroids/play-guide), [Asteroids disassembly](https://6502disassembly.com/va-asteroids/)
- Breakout rows, points, paddle shrink, speed steps: [StrategyWiki Breakout](https://strategywiki.org/wiki/Breakout)
- Missile Command batteries, bonuses, MIRV: [Grokipedia Missile Command](https://grokipedia.com/page/Missile_Command)
- Minesweeper board sizes, first-click safety, chording: [Minesweeper Wiki chording](https://minesweeper.fandom.com/wiki/Chording), [minesweepergame.com first click](https://minesweepergame.com/strategy/first-click.php)
- Sudoku 17-clue minimum: [There is no 16-Clue Sudoku, McGuire et al.](https://arxiv.org/pdf/1201.0749) - difficulty grading: [Difficulty Rating of Sudoku Puzzles](https://arxiv.org/pdf/1403.7373), [Beer, generating difficult Sudoku quickly](https://dlbeer.co.nz/articles/sudoku.html)
- Nonogram line solving and uniqueness: [On the Difficulty of Nonograms](https://liacs.leidenuniv.nl/~kosterswa/nonodec2012.pdf), [Constructing Simple Nonograms of Varying Difficulty](https://liacs.leidenuniv.nl/~kosterswa/constru.pdf)
- Lights Out quiet patterns and solvability: [Jaap's Puzzle Page, Lights Out mathematics](https://www.jaapsch.net/puzzles/lomath.htm)
- 15-puzzle parity: [Parity in practice, the 15-Puzzle](https://groupsmadesimple.wordpress.com/2020/06/06/parity-in-practice-the-15-puzzle/)
- Mastermind and Knuth's five-guess algorithm: [Five-guess algorithm implementation](https://github.com/NathanDuran/Mastermind-Five-Guess-Algorithm)
- Connect Four solution: [Solving Connect Four, gamesolver.org](http://blog.gamesolver.org/solving-connect-four/01-introduction/)
- Klondike rules and scoring systems: [Solitaire scoring explained](https://playsolitairegaming.com/blog/solitaire-scoring-explained), [Vegas scoring](https://www.vegassolitaire.com/scoring/)
- 2048 spawn probability and merge rules: [2048 tile merging mechanics](https://www.onlinepuzzles.org/blog/2048-tile-merging-mechanics-complete-guide)
- Wordle duplicate letter colouring: [Wordle duplicate letter rules](https://5letterwords.io/blog/wordle-duplicate-letter-rules)
- Simon tone frequencies and hardware: [Reverse engineering an MB Simon](https://www.waitingforfriday.com/?p=586), [Simon on Wikipedia](https://en.wikipedia.org/wiki/Simon_(game))
- Achtung die Kurve: [Wikipedia](https://en.wikipedia.org/wiki/Achtung,_die_Kurve!)
- Stroop and N-back protocols: [Is the N-Back Task a Valid Neuropsychological Measure](https://pmc.ncbi.nlm.nih.gov/articles/PMC2770861/), [Stroop Test overview](https://www.sciencedirect.com/topics/medicine-and-dentistry/stroop-test)
- Tetris legal precedent: *Tetris Holding, LLC v. Xio Interactive, Inc.*, 863 F. Supp. 2d 394 (D.N.J. 2012)
