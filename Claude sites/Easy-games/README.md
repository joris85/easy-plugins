# Easy Games

A small collection of browser games. No game engine, no dependencies, no build
step, no image files and no audio files. Every graphic is drawn with canvas paths
and every sound is synthesized with WebAudio, so each game is a few tens of KB
and the whole site is static.

## Playable now

| Game | Players | What it is |
|---|---|---|
| [Easy Bomber](games/bomber/index.html) | 1 to 4 plus CPU bots | Bomb maze battle. Power-ups, diseases, sudden death, best of N rounds |
| [Easy Curve](games/curve/index.html) | 2 to 8 | Steer a line that never stops. Do not touch anything |
| [Easy Cycles](games/cycles/index.html) | 2 to 4 | Light cycles on a grid. Buffered turns, speed that keeps climbing |
| [Easy Volley](games/volley/index.html) | 1 to 2 | Two semicircles and a net. Silly physics, first to eleven |
| [Easy Puck](games/puck/index.html) | 1 to 2 | Air hockey. Two thumbs at once on a tablet |
| [Easy Tanks](games/tanks/index.html) | 1 to 4 plus CPU bots | Shells ricochet off steel. Mines blow holes in the walls |
| [Easy Pong](games/pong/index.html) | 1 to 2 | Two paddles, one ball. CPU at three difficulties |
| [Easy Snake](games/snake/index.html) | 1 to 2 | Snake, with or without walls, or two snakes on one board |
| [Easy Bricks](games/bricks/index.html) | 1 | Brick breaker with the original 1976 numbers, or with power-ups |
| [Easy Rocks](games/rocks/index.html) | 1 | Frictionless drift, splitting rocks, two saucers, a risky hyperspace |
| [Easy Lander](games/lander/index.html) | 1 | Real lunar gravity, finite fuel, pads worth x2, x4 and x8 |
| [Easy Merge](games/merge/index.html) | 1 | Slide and combine tiles to 2048, on 4x4, 5x5 or 6x6 |
| [Easy Mines](games/mines/index.html) | 1 | Minesweeper with a safe first click and chording |
| [Easy Slide](games/slide/index.html) | 1 | The fifteen puzzle. Every shuffle guaranteed solvable |
| [Easy Four](games/four/index.html) | 1 to 2 | Connect four. CPU searches eight moves ahead |
| [Easy Code](games/code/index.html) | 1 | Mastermind, with Knuth's five-guess solver to watch |
| [Easy Tilt](games/tilt/index.html) | 1 | Weighted marbles on see-saws. The rising pan throws towards the weight |
| [Easy Tilt Versus](games/tilt/versus.html) | 2 | Two boards as one ring. Throw marbles into the other player's field |
| [Easy Lights](games/lights/index.html) | 1 | Each press flips a cross of lights. Turn them all off |
| [Easy Missiles](games/missiles/index.html) | 1 | Thirty interceptors, six cities. Lead your shots and let the blast do the work |

Seven more are specified and queued. See
[docs/Easy Games Blueprint.md](docs/Easy%20Games%20Blueprint.md) for the exact
mechanics of every one of them plus the build plan.

## Running it

The games are plain scripts, not ES modules, and never `fetch()` anything, so
**double clicking any game's `index.html` works**. For the landing page and clean
URLs, serve the folder:

```bash
ln -s "/Users/jorisstolker/Sites/Claude sites/Easy-games" /Applications/MAMP/htdocs/easy-games
```

Then open `http://localhost:8888/easy-games/`. Any static server works too, for
example `python3 -m http.server 8899`.

## Layout

```
index.html              landing page with the game grid
shared/
  css/base.css          design tokens and all shared chrome
  js/utils.js           small helpers
  js/input.js           keyboard, four player key maps, click-to-rebind
  js/audio.js           synthesized sound effects
  js/loop.js            frame loop with error containment and dt clamping
  js/touch.js           virtual d-pad, action buttons, swipe, drag
  js/scores.js          local best scores in localStorage
  js/shell.js           page chrome: header, stage, overlay cards, HUD
  js/catalog.js         the game list and its thumbnails
games/<slug>/           one folder per game, self contained
docs/                   the blueprint
```

Each game exposes a debug hook on `window` (for example `window.EasyMerge`) so
its rules can be driven and asserted from the browser console without rendering.
That is how every game here is tested.

## Two engine rules, learned the hard way

1. **The frame loop contains errors.** An uncaught exception inside `update()`
   means `requestAnimationFrame` never gets called again and the game freezes
   permanently. `shared/js/loop.js` wraps update and draw in try/catch.
2. **Never walk a mutable collection by index while a nested call can splice it.**
   A chain reaction in Easy Bomber removed bombs from anywhere in the list while
   the loop cursor was mid-array, which read a hole and threw. Walk a snapshot
   and check membership.

## Two players on one keyboard

`games/tilt/versus.html` puts two ordinary eight-column boards side by side and
tells the rules engine they are neighbours. Everything local - matching, the
zaps, capacity, losing - stays inside one board and needed no change at all,
which is why the versus mode is one extra file rather than a fork of the engine.

What crosses is a **throw**. The two fields are treated as a single closed ring
of sixteen columns, so tipping a see-saw hard enough hurls a marble out of your
field and into theirs, where it lands as stone (Arcade) or as a Joker that helps
them (Competition). Clearing more than three also sends the surplus across, and
attacks arrive by landing rather than being stacked in place, so they tip the
receiver's see-saws and can overload a pan like anything else.

## Saved games

Easy Tilt writes its board to `localStorage` after every settled move, so a
refresh does not lose the game. The save includes the generator's position, so a
resumed game continues with exactly the marbles that were coming rather than a
fresh random stream. Everything else is a single sitting.

## Local scores only

There is no server, no database and no leaderboard. Best scores live in
`localStorage` on your own machine. The blueprint covers what adding a global
leaderboard would involve, including the honest limits on stopping cheating in a
browser game.

## Naming

Mechanics are free to reimplement; names, sprites and distinctive presentation
are not. Every game here has its own name, its own artwork and its own
presentation. See part 1.3 of the blueprint for the case by case position.
