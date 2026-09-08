# Easy Games - handoff

State as of the end of the Swing/Tilt work. Everything below is verified, not
assumed: `node games/tilt/test/rules.test.js` is the check, and it passes 272.

---

## What this project is

A static browser games site. No dependencies, no build step, no image or audio
files - every graphic is canvas paths, every sound is synthesised WebAudio. Plain
`<script>` tags rather than ES modules, so any game runs from `file://`.

19 games playable. The recent work has all been on **Easy Tilt**, a rebuild of
the 1997 Software 2000 puzzle game *Swing* / *Marble Master*.

## Running it

```bash
python3 -m http.server 8899
```

Then `http://localhost:8899/`. There is a `.claude/launch.json` entry named
`easy-bomber` that does the same thing on port 8899.

```bash
node games/tilt/test/rules.test.js      # 272 checks, exits non-zero on failure
```

---

## Easy Tilt: how it is built

| File | Lines | What it is |
|---|---|---|
| `games/tilt/js/rules.js` | ~1700 | The engine. Pure logic, no DOM, seeded randomness |
| `games/tilt/js/render.js` | ~690 | All drawing, plus the marble catalogue |
| `games/tilt/js/tilt.js` | ~1000 | Single player controller |
| `games/tilt/js/versus.js` | ~1040 | Two player controller |
| `games/tilt/test/rules.test.js` | - | The suite |

**The architecture that makes it testable.** The engine resolves an entire drop
instantly and returns an ordered list of events. The controller replays that list
as animation against a *display copy* of the board. So the simulation never waits
on the animation, and the two can never disagree - and `verifyView()` asserts
exactly that after every settled move.

That is also why the whole game can be tested in node with no browser, and why
the preview can answer "would this drop kill me?" by cloning the board and simply
playing the drop.

### The rules, in one paragraph

Eight columns on four see-saws. Each marble has a colour and a weight. A see-saw
tips when its pans hold unequal weight; **the pan that RISES catapults its top
marble**, and it flies **towards the heavy side** a number of columns equal to
the weight difference. Three or more of a colour side by side clear, and the
clear floods to every connected marble of that colour. Five of a colour stacked
in one pan merge into one carrying their combined weight. A pan tilted down holds
8, level 7, raised only 6 - overload any pan and the game ends.

### Things that were wrong and are now right

Each of these was a real defect found by measurement or by reading the manual,
and each has a regression test:

- Throws go **towards the heavy side**, not outward. Getting this backwards
  mirrors every throw on the board while looking entirely plausible.
- The crane **holds one marble** and keeps it; where you drop decides which
  marble you are handed next, from that column's depot.
- **Only an ordinary marble carries a matchable colour.** Extras have a colour
  field but are drawn as glyphs, so matching on it clears things for reasons the
  player cannot see. This one rule fixed four separate bugs.
- The **preview plays the drop on a clone** rather than reasoning about it. The
  old capacity check was wrong in both directions - 0.17% false alarms and 5.6%
  of fatal drops unwarned.
- An extra **must land on top of something**; on an empty pan it does nothing.
- Any special ball thrown off the field **returns as a Bomb**, Stars included.

---

## Two player

`games/tilt/versus.html`. Two ordinary eight-column boards told they are
neighbours - so all the local rules needed no change at all. The two fields are
one closed ring of sixteen columns, and **the only thing that crosses is a
throw**.

- **Arcade**: a marble thrown across arrives as a **Stone** (cannot match, blocks).
- **Competition**: it arrives as a **Heart** (neutral - a scoring race).

Extras are **earned by clearing**, and the parity decides whose they are: an
**odd** clear pays you something helpful, an **even** clear pays you an **attack**
extra which does nothing in your own field and must be catapulted into theirs.

> An earlier build had clears automatically spraying stones at the opponent. That
> is nowhere in the manual - it was invented to solve a frequency problem and has
> been removed. Do not reintroduce it without saying so.

## Saving

Both modes save after every settled move, including the generator's position, so
a resumed game continues with exactly the marbles that were coming. Keys:
`easygames.tilt.save` and `easygames.tilt.match`. A refresh mid-game asks for
confirmation; leaving deliberately via the back links does not.

---

## Open items

1. **Eight games still queued**: Words, Solitaire, Invaders, Missiles, Blocks,
   Muncher, Sudoku, Picture. Specified in `docs/Easy Games Blueprint.md`.
2. **Nothing is committed.** The entire repo is untracked. Worth a first commit.
3. **Arcade vs Competition default.** Currently Arcade. Competition is the more
   interesting idea (attacking helps them, so you win by outlasting) but takes a
   round to click. A play decision, not a code one.
4. **The manual's reward tables are unrecoverable.** The original maps exact
   clear size to a specific extra with 75%/25% splits; the scan's OCR destroys
   the table. We draw from a helpful pool and an attack pool at random instead.
   A clean scan of those two pages would close the last real gap.
5. Not implemented: the Question Mark resolving into arcade extras during solo
   (deliberate - they would do nothing there).

## Sources

`docs/Swing Rules Reference.md` is the research, with every claim graded by how
well it is sourced (SCREENSHOT / OBSERVED / CONFIRMED / MANUAL / INFERRED /
UNKNOWN). The two primary sources are the German manual, which has a full text
layer at `archive.org/details/swing-1997-handbuch`, and a player guide on
GameFAQs which is the only complete enumeration of the 31 extras anybody has
published.

**A warning that costs time if ignored**: the open-source remake *XSwing Plus* is
the obvious reference and is a trap. Its weight function is an empty stub and its
see-saws never move - the one mechanic that makes Swing distinctive is the one
the remake does not have.
