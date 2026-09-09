# Easy Games - handoff

State as of the end of the Swing/Tilt work. Everything below is verified, not
assumed: `node games/tilt/test/rules.test.js` is the check, and it passes 272.

---

## What this project is

A static browser games site. No dependencies, no build step, no image or audio
files - every graphic is canvas paths, every sound is synthesised WebAudio. Plain
`<script>` tags rather than ES modules, so any game runs from `file://`.

**27 games, all built.** Nothing is queued any more. The bulk of the deep work
has been on **Easy Tilt**, a rebuild of the 1997 Software 2000 puzzle game
*Swing* / *Marble Master*, in solo and two-player versions.

## Running it

```bash
python3 -m http.server 8899
```

Then `http://localhost:8899/`. There is a `.claude/launch.json` entry named
`easy-games` that does the same thing; it takes whatever port it is given
(`autoPort`), since 8899 is often held by a `php -S` from another project.

```bash
node games/tilt/test/rules.test.js      # 368 checks, exits non-zero on failure

# every suite at once: 1610 checks across nine games
for g in tilt missiles invaders words sudoku picture blocks solitaire muncher; do
  printf '%-10s ' "$g"; node "games/$g/test/rules.test.js" | tail -1
done
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
  Passive kinds (Heart, Joker, Stars) are never "wasted" this way.
- Any special ball thrown off the field **returns as a Bomb**, Stars and Stones
  included.
- **A marble thrown across can end the opponent's game the moment it lands.**
  Overflow used to be checked only on the dropping board.
- **Score weighs the marbles** (manual: weight x count x level x bonus), and the
  bonus is the original's real-time lamps x1..x4, not the cascade depth. The
  engine has no clock: the controller passes `now` (seconds) into
  `dropFromDepot` and calls `tickBonus` each frame.
- **A landing over capacity loses at once**, judged at the tilt it causes.
- **Shapes stop at the walls**; nothing reaches round the edge of a field.
- **The first press picks up** a marble from wherever the crane stands.

---

## Two player

`games/tilt/versus.html`. Two ordinary eight-column boards told they are
neighbours - so all the local rules needed no change at all. The two fields are
one closed ring of sixteen columns, and **the only thing that crosses is a
throw**.

- **Arcade**: survival. A marble thrown across arrives as a **Stone** (cannot
  match, blocks). Nothing is dealt into the supply; every extra is **earned by
  clearing**, and the parity decides whose it is: an **odd** clear pays you
  something helpful, an **even** clear pays you an **attack** extra which does
  nothing in your own field and must be catapulted into theirs. Last one
  standing wins. The extra earned depends on the clear size (`REWARD_TABLE`).
- **Competition**: a scoring race. Plays exactly like solo; a marble thrown
  across arrives as a **Heart**. An eliminated player drops out and the other
  plays on alone; the round ends when both have fallen and the **higher score**
  wins it, whoever fell first.

`applyMode()` in versus.js is the single place these differences live.

> An earlier build had clears automatically spraying stones at the opponent. That
> is nowhere in the manual - it was invented to solve a frequency problem and has
> been removed. Do not reintroduce it without saying so.

## Saving

Both modes save after every settled move, including the generator's position, so
a resumed game continues with exactly the marbles that were coming. Keys:
`easygames.tilt.save` and `easygames.tilt.match`. A refresh mid-game asks for
confirmation; leaving deliberately via the back links does not.

---

## Reviews, 2026-09-08 and 09

Three fresh-context agents reviewed and played Easy Tilt: one read it against
the German manual's own text, one played it solo to destruction (656k drops),
one played it as both players (1.26M drops). Verdict of the first: solo solid,
two-player not. Everything any of them found as a bug or a source contradiction
is fixed and has a regression test under `== REVIEW: ... ==` or
`== SOLO REVIEW: ... ==` in the suite.

The three worth remembering, because they were all invisible in play:

- A **Joker could only see left**. One left-to-right pass claimed it for the run
  it had just closed, so "green Joker red red" never cleared while the mirror
  image did: 710 incidents across 300 games. The fix carries trailing Jokers
  into the next run - but only when a real marble broke it, never across a gap,
  which is the bug the first fix introduced (scattered Jokers cleared as a trio).
- **Competition mode collapsed into survivor-wins**, because the loser sat
  watching for 200 to 750 drops. The survivor now plays on for 50 drops with a
  countdown, then the higher score takes the round.
- A **Blocker earned at home sealed its own see-saw's partner column**, so it
  could never be launched. Brute force: 119,808 attempts, zero escapes.

Left deliberately as documented departures: matching in visual rows, and "throw
towards the heavy side" (OBSERVED from the original running, not in any
document). The Joker-every-15 counter is Joris's own observation from
screenshots (the manual only says "next extra"). Reward tables follow the
manual's legible fragments ordered by clear size (INFERRED).

## Open items

1. **Nobody has judged how Swing FEELS.** Everything is verified correct;
   nothing is verified enjoyable. A browser play-test agent was running when the
   session ended and was stopped mid-way, so there is no report. That is the one
   real gap: animation pacing (launch 0.46s + landing 0.34s - too slow for a
   fast player?), whether the first-press pick-up is discoverable, whether a
   two-player match reads at a glance, and how it behaves on a phone. Relaunch a
   browser agent for this, or just play it yourself for ten minutes.
2. **Arcade vs Competition default.** Currently Arcade. A play decision, not a
   code one, and now a fairer comparison since Competition was fixed.
3. **The manual's reward tables are only half recovered.** The pairs and their
   75/25 odds are legible; the clear sizes they sit at are my reading. A clean
   scan of those two pages would settle it.
4. Not implemented: the Question Mark resolving into arcade extras during solo
   (deliberate - they would do nothing there).
5. **Easy Missiles, Invaders, Words, Sudoku, Picture, Blocks, Solitaire and
   Muncher** were each built by their own agent, verified headlessly and smoke
   tested in a browser by me, but none has had a human play it. Each has its own
   `test/rules.test.js` and its own known-gaps note in the commit message.

## Two traps this project has already sprung

- **Exit codes lied.** Every suite ended with `process.exit()`, and on node 24.7
  that segfaults about one run in ten when the file was loaded with an indirect
  `(0, eval)` - which is how all of them load a plain browser script. The crash
  lands after the summary prints, so the tests pass, the output looks perfect,
  and the shell sees 139. All nine now set `process.exitCode` instead. If a
  suite ever exits non-zero with a clean summary again, suspect this first.
- **The git root is `~/Sites`**, a checkout shared with other projects and
  sessions. Always stage this directory by path; never `git add -A`.

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
