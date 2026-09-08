# Swing / Marble Master - complete rules reference

Software 2000, 1997. Released in the US as **Marble Master**, on Game Boy Color
as **Swing**, and re-released years later on mobile as **Color-X-Plode**.

This is everything I could establish about how the original actually worked,
written up because the mechanics are genuinely unusual and every casual summary
of the game gets at least one of them wrong.

---

## How much to trust each claim

The game is poorly documented online, and the single best source is the official
PlayStation manual, which is an image-only scan with no text layer. Everything
below is graded:

| Grade | Meaning |
|---|---|
| **SCREENSHOT** | Read directly off in-game screenshots, and verified by arithmetic that could not come out right by chance |
| **OBSERVED** | Reported from watching the original game actually run, where no document states it either way |
| **CONFIRMED** | Stated in the PlayStation manual and corroborated by at least one independent source |
| **MANUAL** | Stated in the manual, no independent corroboration found |
| **INFERRED** | Not stated anywhere; the only reading consistent with what is stated |
| **UNKNOWN** | Genuinely not recoverable from any public source |

Sources used, in rough order of authority:

1. Official **Marble Master (USA) PlayStation manual**, 32 pages
2. **MANIAC.de** classic test of the PlayStation version
3. **mag64.de** review of the Game Boy Color version
4. **German** and **English Wikipedia**
5. A **GameFAQs FAQ** by Sitorimon, reachable only through search excerpts
6. Squakenet, old-games.com, MobyGames, ModDB, My Abandonware
7. **XSwing Plus**, an open-source fan remake - useful as a working model, never
   as proof, and see the warning about it at the end
8. **In-game screenshots** of the PC version at levels 6 and 9, plus the game's
   own Extras browser and main menu. These turned out to be the strongest source
   of all for the things the manual is vague about, because the HUD numbers can
   be checked against each other

---

## 1. The board

**CONFIRMED.** Four see-saws. Each see-saw carries two scales, which the manual
calls pans, so there are **eight columns** in total, coupled in pairs: (1,2)
(3,4) (5,6) (7,8).

Each see-saw is **not a plank on a pivot**. Screenshots show a pair of vertical
sliding pillars, each topped with a shallow cup that cradles the bottom marble of
its column, meshed by a small cog at floor level. Rack and pinion: one pillar
rises exactly as far as the other falls.

**Above the columns sits the depot**, two rows of eight marbles. This is where
almost everyone misreads the game. It is **not a preview queue** of what is
coming next. It is a **supply**, and it is per column: each of the eight columns
has its own queue, two deep. Choosing a column therefore also chooses which
marble you get. That is a large part of the strategy and it is invisible if you
assume it is a shared "next piece" display.

### How the depot actually hands you marbles

**SCREENSHOT.** Between the depot and the playfield hangs a **claw**, and the
claw holds exactly one marble. The full cycle is:

1. The claw carries **one specific marble**, and it keeps carrying that same
   marble however far you slide it. Moving never swaps it for a different one.
2. You release it into the column you are standing over.
3. You are immediately handed the **bottom marble of that column's depot stack**
   - the column you dropped into, not the one you picked up from.
4. The marble above it **falls down** into the vacated slot, and a fresh marble
   drops in at the top. That falling is the "gravity" you can watch happen.

The consequence is the single most important thing to understand about playing
well, and it is why the depot feels strange at first: **every drop is two
decisions at once.** Where this marble goes, and which marble you want to be
holding for the turn after. You cannot go shopping - sliding along the row to
find a nicer marble does nothing, because you are still holding the old one. You
can only choose your next marble by choosing where to let go of this one.

### The weight strip

**SCREENSHOT.** Below the columns runs a strip of eight numbers, one under each
pan, and each is **the total weight of the marbles currently in that pan**.

This is checkable, and it checks out. From a level 6 board reading
`8 0 3 5 0 18 12 7`:

| Pan | Contents | Total |
|---|---|---|
| 6 | teal 2, teal 3, teal 1, teal 12 | **18** |
| 7 | red 5, red 5, blue 2, a Heart | **12** |
| 8 | purple 2, red 2, red 3 | **7** |
| 1 | green 4, green 4, two Stones | **8** |
| 3 | blue 3 | **3** |
| 4 | purple 5 | **5** |

Six independent columns agreeing is not coincidence. Two further facts fall out
of the same arithmetic for free:

- **Stones weigh nothing.** Pan 1 holds two Stones and still totals exactly the
  8 of its two green 4s. Pan 5 holds a single Stone and reads **0**.
- **Hearts weigh nothing either.** Pan 7's total is exactly its three numbered
  marbles; the Heart adds zero. So a Heart is an extra like any other, and
  dropping one is balance-neutral.

On the easier difficulties the indicator flashes as a warning when the marble you
are about to drop would move that see-saw.

### The Joker counter

**SCREENSHOT.** Bottom right of the HUD sits a multicolour marble with a number
beside it, and that number **counts down** - it reads 5, 13 and 7 across three
captures of the same session. It is the countdown to the next guaranteed
multicolour Joker: **one arrives every fifteen marbles**, on a fixed cadence,
independently of the random extras.

That makes the Joker a scheduled resource rather than a lucky break, and it is
something you can plan around: when the counter is low, it is worth setting up a
line that only needs one wild marble to complete.

---

## 2. Each marble

**CONFIRMED.** An ordinary marble has two independent properties:

- a **colour**, which is what matching cares about
- a **weight**, printed as a number on its face, which is what the balance cares
  about

The two are unrelated. A heavy red is no more or less likely than a light red.

**Extras carry no weight at all**, and that includes Stones and Hearts. They are
animated rather than numbered, and they never disturb a balance. The manual says
so, and the pan-total arithmetic in section 1 confirms it independently. It
matters enormously: dropping an extra is always balance-neutral, so it is the
safe move when a see-saw is on a knife edge.

**Weight range: partly settled.** The manual never states one, but the pan-total
arithmetic pins down individual marbles too. Ordinary marbles legible in
screenshots run **1 to 9**, and single digits are clearly the normal spawn range.
Marbles reading **12, 17 and 26** also appear, always sitting deep in a stack -
consistent with these being **merged** marbles carrying a combined weight (see
section 5) rather than anything that can be dealt to you fresh. What is still
unknown is whether the spawn range widens with the level.

---

## 3. The balance rule - the heart of the game

This is the rule that makes Swing unlike any other match-three, and it is the one
most often described incorrectly.

### When does a see-saw tip?

**CONFIRMED.** When its two pans hold **unequal total weight**. It compares only
the two pans of that one see-saw against each other, not against any other
column.

### What gets launched?

**CONFIRMED, and this is the counter-intuitive part.** The marble catapulted away
is the **top marble of the LIGHTER side**. The lighter pan rises, and the marble
sitting on top of it is flung off.

This is worth dwelling on because it inverts the instinct. Loading a pan heavily
does not fire that pan's marbles - it fires the *opposite* pan's. Being light is
what launches you.

The English Wikipedia phrasing here is ambiguous ("sending the top ball flying"),
which is very likely why so many descriptions of this game get it backwards. The
manual is explicit, MANIAC.de states the same in German, and at least one
download-site description independently says the lighter marbles are the ones
that pop out of the balance.

### How far does it fly?

**CONFIRMED, and fully specified.** The **weight difference between the two pans
equals the number of columns the marble travels.** A difference of three throws
it three columns.

That single rule is what turns the printed numbers from decoration into an aiming
mechanism. If you want to place a marble seven columns away, you engineer a
difference of seven.

### Which way does it fly?

**OBSERVED.** No source states this, and it is easy to get backwards - we did.

**The marble flies towards the heavy side.** It comes up off the rising pan, over
the pivot, and travels in the direction of whichever pan is carrying the weight.
Weight on the left of a see-saw and the marble goes left; weight on the right and
it goes right.

The tempting guess is the opposite - that a rising pan flings its marble
*outward*, away from the pivot, the way you would imagine being catapulted off
the end of a plank. That is wrong, and wrong in a way that is nearly invisible:
the throw distances stay correct, so the board still behaves plausibly, it just
mirrors every single throw. Worth stating explicitly because nothing in the
manual contradicts the wrong version.

Note what this implies for the smallest case: **a difference of one lands the
marble in its own partner pan**, the other side of the same see-saw. That moves
weight from the light side onto the heavy side, which deepens the imbalance
rather than correcting it, but cannot flip the see-saw back - so it settles
rather than oscillating.

### The flight path

**OBSERVED.** The marble does not travel in an arc. It rises **straight up** to
the top of the play area, moves **sideways** by the number of columns it owes,
and then drops **straight down** into its destination. Three straight legs.

### Ties

**INFERRED.** The manual only ever describes tipping as a consequence of
*unequal* weight. Equal weight producing no tip is the only consistent reading,
but it is not stated outright.

---

## 4. Matching

**CONFIRMED.** Three or more marbles of the same colour **adjacent horizontally**
form a trio and clear.

**Vertical alignment alone never clears anything.** A stack of three reds in one
pan does nothing. This surprises people constantly, because every other
match-three game rewards it.

### The flood

**CONFIRMED.** Once a trio is found, the clear **spreads**. Every marble of that
same colour connected to the trio - above it, below it, or beside it - goes with
it, and the spread propagates outward. Diagonals never count, in either role.

So a trio is a detonator, not the whole explosion. A well-placed third marble can
take out a large connected mass of that colour.

### What a Joker may stand in for

**SCREENSHOT.** The game's own Extras browser describes the Joker as the first
Extra, one that can replace the heart and any colour, and that its use is to help
you score a three.

Two things follow from how that is worded. The Joker is wild for **matching**,
which was already known. But the **Heart is named separately from colour**, which
strongly implies Hearts do not carry a matchable colour at all - they are their
own group, matched Heart-to-Heart, with a Joker able to stand in for one. That
fits how they are drawn: a Heart shows a heart and no colour, so a player could
never see a Heart's colour in order to plan around it.

### After a clear

**CONFIRMED.** Marbles above a cleared gap fall down onto the pan. The pan gets
lighter, which can change which way that see-saw leans, which can in turn set off
further consequences. Cascades in Swing come from the *balance system*, not from
a match-three gravity chain.

---

## 5. Five in a column - the merge

**CONFIRMED.** Five marbles of the same colour stacked **vertically** in one pan
melt together into a **single marble carrying their combined weight**.

This is not a clear and it does not score. It is a compaction move, and it is how
you manufacture the very heavy marbles that let you make long throws. It is the
constructive use of the vertical axis, which otherwise does nothing.

**If a drop would create both a trio and a five, the trio takes precedence.**

---

## 6. How you lose

**CONFIRMED, and this is the most elegant rule in the game.**

A pan's capacity depends on where its end of the see-saw currently sits:

| Position | Capacity |
|---|---|
| Tilted **down** | **8** marbles |
| **Level** | **7** marbles |
| Raised **up** | **6** marbles |

Overloading any pan ends the game immediately.

The reason this is elegant: the ceiling is fixed. A pan that has sunk has more
room beneath the ceiling; a pan that has risen has less. So loading one side both
raises the other **and shrinks what the other can hold**. The see-saw is
constantly squeezing your lighter stacks toward death.

Warning lights and warning sounds fire when a column approaches its limit.

---

## 7. The edge is a ring

**CONFIRMED, and one of the strangest rules in the game.**

A marble thrown clean off the side of the play area does not disappear. It
**re-enters on the opposite side, transformed**:

- an ordinary marble comes back as a **Heart**
- a **Heart** thrown off comes back as a **Bomb**
- a **Bomb** thrown off reverts to a **Heart**
- any other extra thrown off comes back as a **Bomb**

So the board is a torus with a type-transformation at the seam, and deliberately
hurling something off the edge is a way to manufacture bombs.

---

## 8. Levels and progression

**CONFIRMED.** A level is exactly **50 marbles dropped**. Completing one awards a
**Silver Star** (see the extras below).

**CONFIRMED.** A new type of extra enters play at every even-numbered level from
6 through 36. The exact schedule is in the table in section 10.

**Colour count: UNKNOWN.** Multiple sources agree that more colours appear as you
progress, and one German review notes this is what makes late levels hard. Nobody
states the starting count or the rate.

**Speed: nothing accelerates.** No source describes any speed-up, and there is no
descending ceiling or drop timer. The pace is entirely player-driven: you choose
when to drop. Screenshots of a single session show an elapsed timer past nine
minutes with the board only then filling. This is a deliberate design difference
from Tetris-likes and is worth preserving.

Difficulty presets are **easy, normal, hard, absurd and free**, plus a separate
competition setting. The tip-warning flash on the weight strip appears on easy
and normal only.

---

## 9. Scoring

**Recovered.** The manual introduces the formula with a sentence and then prints
it as a graphic, and that graphic is **blank in the surviving scan** - genuinely
empty, not merely faint. So it looked lost. It is not: the surviving player guide
states it in plain text, and the five factors it names line up exactly with what
the HUD shows.

A trio is worth its **total weight**, multiplied by the **number of marbles**
cleared, the **level**, the **bonus**, and the **difficulty setting**.

Two of those deserve emphasis, because they change how you play:

- Score scales with **weight**, not just count. So a merged marble carrying the
  combined weight of five is worth far more than five light ones, and the
  five-stack merge is a scoring engine rather than just a tidying move.
- **Bonus** is the decaying lamp bank. Clear again before the lamps go out and
  the bonus multiplies, which is what makes speed pay.

Graded **MANUAL** rather than CONFIRMED: the German manual names the factors and
the player guide gives the product, which is two sources agreeing on the shape,
but neither is a second independent witness to the exact arithmetic. It is consistent with everything visible on
the HUD, which is weak support but not nothing.

What is independently established:

- **CONFIRMED.** Forming a trio lights all four bonus lamps, marked x1 x2 x3 x4.
- **CONFIRMED.** Forming another trio *immediately* pays bonus points.
- **CONFIRMED.** The lamps decay after a short time, so speed is rewarded.
- **MANUAL.** The current level feeds into the score.
- **CONFIRMED.** A Silver Star sweep scores **nothing**. A Golden Star sweep
  scores **full points**. That difference is the entire reason to build Gold.

---

## 10. Every special marble

**Sources.** The catalogue below is the surviving player guide's list, which is
the only complete enumeration anybody has published, cross-checked against the
German manual wherever the manual says anything at all. Counts agree: **6
always-available + 16 level-gated + 9 Arcade-only = 31**.

Two rules apply to every extra without exception:

- **CONFIRMED (manual).** Extras are **animated rather than numbered** and carry
  **no weight**. Dropping one is always balance-neutral, which makes it the safe
  move when a see-saw is on a knife edge.
- **CONFIRMED (guide).** An extra **must land on top of something**. Dropped into
  an empty pan it simply does not work. The Bomb is the near-exception: it does
  not go off either, it lies there armed and detonates when something lands on
  it later.

### Always available

| Marble | What it does |
|---|---|
| **Silver Star** | Awarded once every 50 marbles, i.e. one per level. Three in a row clears the entire field but pays **nothing** |
| **Golden Star** | Two Silver Stars stacked merge into one. Three in a row clears the field **and pays** for it |
| **Question Mark** | Becomes *any* marble in the game, including the Arcade-only ones. It stays blank in the depot until you actually collect it |
| **Heart** | What an ordinary marble becomes when thrown off the field. Throw a Heart off and it returns a **Bomb** |
| **Stone** | An obstruction. Cannot form a trio or a five. Removable only by a Cutter or a Zap |
| **Shadow** | Blacks out marbles so you cannot read them. Their properties are unchanged - only your knowledge is |

### Level-gated, one every second level

The schedule starts at level 6 and adds one every second level up to 36.

| Level | Marble | What it does |
|---|---|---|
| 6 | **Joker** | Stands in for any colour, and for a Heart |
| 8 | **Bomb** | Destroys a 3x3 area around itself |
| 10 | **Cutter** | Destroys an entire vertical line |
| 12 | **Colour Zap** | Destroys every marble of the colour it lands on |
| 14 | **Tint** | Repaints its whole column to the colour of the marble it landed on |
| 16 | **Flash** | Within a triangle spreading from it, converts two random marbles per row to the landed colour |
| 18 | **Colour Joker** | Turns every marble of the landed colour into Jokers |
| 20 | **Diagonal Zap** | A Zap, cut diagonally |
| 22 | **Top Zap** | Removes the top marble of every column |
| 24 | **Tiny Depot** | Recolours the whole bottom row to the colour it lands on |
| 26 | **Flash Diagonal** | Recolours everything diagonally beneath it |
| 28 | **Colour Bomb** | Turns every marble of the landed colour into Bombs |
| 30 | **Zap Horizontal** | A Zap, cut horizontally |
| 32 | **Multicolour Zap** | Destroys the whole column beneath it |
| 34 | **Tint 3x3** | Recolours a 3x3 area to the landed colour |
| 36 | **Triangle Flash** | Recolours everything in a triangle beneath it |

The families are easier to hold than the list. For most shapes there is a **Zap**
that destroys it, a **Tint** that repaints it, and a **Flash** that converts it.
Same geometry, three different verbs. The **colour converters** are the fourth
family: Colour Zap destroys a colour, Colour Joker turns it wild, Colour Bomb
turns it explosive, and in Arcade the Colour Stone Maker turns it to rubble.

### Arcade-only: the attack arsenal

**This is the direct answer to "what do they do against your opponent".** These
nine exist *only* in the competitive Arcade mode. They are what an even-sized
clear hands you, and they only take effect once thrown into someone else's
field.

| Marble | What it does to the field it lands in |
|---|---|
| **Stonemaker** | Turns a 3x3 area into Stones |
| **Colour Stone Maker** | Turns every marble of the landed colour into Stones |
| **Tower** | Fills an entire column to the brim with Stones |
| **Blocker** | Blocks the squares to its left and right. Nothing can be dropped or thrown into them until it is gone |
| **Twister** | Scoops every marble off one scale and scatters them across the field |
| **The Leveller** | Sets every weight in a column to zero, wrecking the victim's balance arithmetic |
| **Shadowmaker** | Darkens a 3x3 area so they cannot read it |
| **Shadow Clock** | Darkens their **entire** field |
| **Sting** | Punctures the marbles above and below it - but only while its spines are extended |

Note what the arsenal is *made of*. Four of the nine bury the victim in Stones,
which is the only marble that can neither match nor be cleared by an ordinary
move. Two attack their **information** rather than their board. One attacks
their **weights**, which in a game built on balance is arguably the cruellest.

---

## 11. Two-player, and what crossing actually does

**CONFIRMED (manual).** Players sit in a **ring**, each with a left and a right
neighbour, so with two players you are on both sides of your opponent at once. A
marble catapulted off the edge of your field does not come back to you - it flies
into a neighbour's field. That is the whole attack mechanism: there is no
separate "send garbage" control, just the balance rule reaching across the gap.

### The two modes differ in one rule, and it changes everything

| | **Competition** | **Arcade** |
|---|---|---|
| How you win | Highest **score** | Be the **last one standing** |
| A marble thrown into a neighbour's field arrives as | a **Heart** | a **Stone** |
| Extras | fall into your supply as usual | must be **earned** by clearing |

**A Heart is not an attack.** It behaves exactly as it would coming back round
your own ring in single player. So in Competition, throwing marbles at your
opponent is close to neutral - the mode is a scoring race that happens to share
a ring.

**A Stone is a genuine attack.** It cannot form a trio or a five, so it occupies
a slot in their pan that no ordinary play will ever free. That single
substitution is what turns the same board into a fight.

### How you earn an attack in Arcade

**CONFIRMED (manual).** Extras stop arriving on the level schedule. You earn them
by clearing, and the parity of the clear decides who the extra is for:

- Clear an **odd** number of marbles: you get an extra that **benefits you**.
- Clear an **even** number of marbles: you get an **attack** extra, which must
  first be thrown into an opponent's field and only takes effect once it lands
  there.

That is a genuinely elegant piece of design. Every clear is a fork, and the
choice is made not by a menu but by *how many marbles you took* - so building a
four rather than a three is a deliberate decision to arm yourself rather than
help yourself.

**UNKNOWN.** The manual prints two tables mapping the exact number of marbles
cleared to the extra you receive - one for the helpful extras, one for the
attacks - with 75%/25% probability splits where a count can yield either of two.
The scan's OCR destroys the table structure. Legible fragments include Bomb;
Cutter (75%) / Sting (25%); a Multicolour Zap paired with Bomb (25%); and
Blocker. The full mapping is not recoverable from any public source.


## 12. Controls

**CONFIRMED.** Simpler than you would guess from the depth.

- **Left and right** move a crane across the eight columns.
- **One button** picks a marble up from the supply, and the same button drops it
  into the column under the crane.
- **Start** opens an in-game extras help screen, so you can look up what a
  special marble does mid-game.
- Buttons are remappable per player.

**There is no aiming and no queue rotation.** Choosing a column is the entire
input space. All of the depth comes from *which* of the eight columns you feed,
given what is queued above each one.

---

## 13. What is genuinely not known

Being blunt about the gaps:

1. **The Arcade reward tables.** The manual maps the exact number of marbles
   cleared to the extra you receive - one table for helpful extras, one for
   attacks, with 75%/25% splits where a count can yield either of two - and the
   scan's OCR destroys the table structure. Legible fragments only: Bomb; Cutter
   (75%) / Sting (25%); a Multicolour Zap paired with Bomb (25%); Blocker. This
   is now the single biggest recoverable-in-principle gap: a clean scan of those
   two pages would close it.
2. **The exact weighting inside the score formula.** Section 9 recovers the five
   factors, but not how difficulty scales or how the bonus is computed.
3. **How the weight range grows with level.** The range itself is now largely
   settled (section 2); what is not known is whether harder levels deal heavier
   marbles, or only add colours.
4. **Tie behaviour** on a perfectly balanced see-saw.
5. **The colour count** and the schedule by which colours are added. Screenshots
   at level 6 and level 9 show at least **eight distinguishable colours** in play
   - red, dark red, green, dark green, teal, blue, purple and black - which is
   more than most descriptions assume.
6. **Where exactly a catapulted marble sits** if its destination pan is full or
   would be overloaded by it.
7. Whether a clear that rebalances a see-saw also causes a catapult, or only a
   newly placed marble does.

---

## 14. A warning about the fan remake

**XSwing Plus** is an open-source Java remake and it is easy to find. It is a
useful reference for the depot and level structure, but **do not use it as a
reference for the balance mechanic**: its weight function is an empty stub and
its scale-tipping is never implemented. It draws the see-saws and never tips
them. The one mechanic that makes Swing distinctive is the one the remake does
not have.

---

## 15. What Easy Tilt does differently, and why

Our rebuild follows everything marked SCREENSHOT and CONFIRMED above. Where the
record is silent, we made deliberate choices rather than pretending.

Things watching the original play corrected, now matched exactly:

- **Throws go towards the heavy side**, over the pivot - not outward away from
  it. Every throw on the board was previously mirrored.
- **The flight is up, across, down**, not a parabola. Two separate faults made
  it look as though the marble vanished off the top and a different one dropped
  back in. The arc's apex genuinely climbed out of the play area on long throws
  from tall stacks; and separately, the landing was animated from the crane
  regardless of how the marble had arrived, so a catapulted marble snapped back
  to the top of the screen and replayed its whole descent. The rise-and-traverse
  now belong to the launch and the fall belongs to the landing, sharing one
  travel height so the two cannot disagree.
- **A wrapping marble keeps its appearance until it actually crosses the edge.**
  It is genuinely replaced by a transformed marble at that point, so drawing the
  new one from the moment of launch made it look swapped in mid-air.
- **The depot hangs the way gravity does**, with the next marble out in the
  lowest slot nearest the claw and the queue stacked above it.

Things the screenshots corrected, now matched exactly:

- **The crane holds one marble and keeps it.** Moving no longer swaps what you
  are about to drop; where you release decides what you are handed next, from
  that column's depot, with the marble above falling down to replace it.
- **Every fifteenth marble is a Joker**, on a counter shown in the HUD.
- **Stones and Hearts weigh nothing**, so dropping either is balance-neutral.
- **Only an ordinary marble carries a colour the player can see.** This turned
  out to be one rule that fixes four separate bugs, and it is worth stating
  plainly because it is easy to get wrong in a codebase where every marble has a
  colour field.

  Every marble is given a colour, extras included, because generating one is
  cheaper than special-casing it. But an extra is *drawn* as its glyph with no
  colour showing. So matching an extra on that field clears it for a reason that
  is invisible on screen - which is a bug wearing a rule's clothing. The
  consequences were: a colour clear could swallow an **armed Bomb** (the one
  extra that sits on the board waiting, so the only one really exposed - about
  one game in nineteen); five Jokers could merge into an unpredictable coloured
  marble weighing nothing; a Tint reported repainting marbles that never changed
  appearance; and Hearts cleared on a colour nobody could read.

  Hearts and Stars therefore match by **kind**, as their own groups. A Joker may
  stand in for a Heart, as the original's own Extras text says; a Joker still may
  not fake a Star, because a Star trio sweeps the whole board and that has to be
  earned. Every other extra never matches at all.
- **Any special ball off the edge returns as a Bomb, Stars and Stones included.**
  An earlier pass exempted Stars, reasoning that destroying a level reward could
  not be intended. The manual says otherwise in plain words - a Heart "as well
  as every other special ball" comes back as a Bomb - so that exemption was a
  design opinion, and it is gone. Throwing a Star out costs you the Star.
- **Five stacked Hearts do not merge.** The merge sums weights and returns an
  ordinary marble, which would quietly convert Hearts into something else.

Deliberate departures:

- **Matching runs in visual rows.** Because a pan tilted down physically sits a
  whole marble lower, two marbles at the same position in their stacks are not
  side by side on screen. Tipping a see-saw therefore re-aligns a stack against
  its neighbours and can complete a line that did not exist a moment earlier.
- **A see-saw tips on placement**, not as a standing condition, and a marble
  flies at most once per cascade. Without both, a single heavy marble bounces
  around the board forever.
- **Extras arrive far earlier.** The original's schedule of level 6 through 36
  assumed much longer games; measured play in our version reaches about level 4,
  so that schedule would mean nobody ever saw a single extra. The **order** is
  the manual's; only the levels are compressed.
- **Every marble wears the same plain ring.** An earlier build gave each colour
  its own silhouette - circle, triangle, square - as colour-blind redundancy.
  On a full board that read as a diagram rather than a pile of marbles, so the
  high-contrast weight numeral carries that load alone now.
- **The throw hints can be switched off.** The preview has two layers: the
  landing circle and the overload warning answer "is this move legal" and are
  always on; the hints showing which marble the tip will fling and where it ends
  up teach the game, and are exactly what a player who already knows it will
  find noisy.
- **A game survives a refresh.** The original had no save at all, and a session
  runs to hundreds of drops, so losing one to a mistyped keystroke is a harsh
  punishment. The board is written to local storage after every settled move,
  including its position in the random stream, so a resumed game continues with
  exactly the marbles that were coming. The most that can ever be lost is the
  drop currently in mid-air. A refresh also asks for confirmation first.

  One edge worth recording, because it was a live defect: the engine resolves a
  whole drop instantly while the animation plays out over the following second,
  so the game can already be lost while the death is still on screen. The save
  had to be discarded at the moment of the fatal drop rather than when the
  game-over card appears - otherwise refreshing during that second resumed from
  just before the fatal drop and undid the loss.
- **The game teaches itself.** The best-documented failure of the original is not
  difficulty but comprehension: multiple players describe enjoying it for years
  while treating the weight numbers as noise, and the PC release shipped with no
  in-game help at all. Ours explains each mechanic the first time it happens.
- **A preview shows the consequence** before you commit: where the marble lands,
  which marble the tip will throw, where that one ends up, and whether any of it
  overloads a pan.
- **The per-pan weight totals and the see-saw difference are both on screen.**
  The original shows the totals; it makes you subtract the pair yourself every
  single turn, even though that difference *is* the launch distance.

**Two players are built**, as the closed ring described in section 11: two
fields side by side, throws crossing between them by physics, arriving as Stones
in Arcade and Hearts in Competition. The two modes follow the manual's two
modes: Arcade is survival, with nothing dealt into the supply and every extra
earned by clearing on the odd/even rule; Competition plays like the solo game
and the higher score takes the round whoever fell over.

An earlier build had clears automatically spraying stones at the opponent. That
is nowhere in the manual; it was invented to solve a frequency problem and it
was removed the moment it was challenged. Attacking is exactly the manual's
route now: earn a weapon with an even clear, and catapult it across.

All 31 extras are implemented and documented in the game's own guide. What is
still not reproduced is the manual's exact mapping from clear size to a specific
extra, with its 75%/25% splits, because the scan's OCR destroys the tables
(section 13). The helpful and attack pools are drawn from uniformly instead.

**A fresh-eyes review on 2026-09-08**, run against the manual text rather than
this document, found and led to these further corrections:

- A marble thrown across could not end the opponent's game at the moment it
  landed - overflow was only checked on the board that dropped, so the victim
  lived until their own next move, which then took the blame. Zero kills had
  ever registered at the attacking drop.
- Competition awarded the round to the survivor; the manual says the highest
  score.
- Arcade still dealt random extras into the supply, against "Die Extras fallen
  nicht ohne weiteres in den Vorrat".
- Tint, Colour Zap and Colour Joker still read the hidden colour of a Heart or
  a Star beneath them - the "only an ordinary marble carries a visible colour"
  rule had been applied to matching but not to every extra that reads a colour.
- The score ignored weight, though the manual names it first among the factors.
- Tower always overflowed; the guide says "full to the brim".
- The Blocker vanished on landing and sealed against drops only; the guide says
  nothing can be dropped *or thrown* beside it "until its gone".
- The first marble was forced on the player from column three; the original
  lets you pick it up from wherever you stand.
- Shapes wrapped round the edge of the field, which in a match is the other
  player's board; they now stop at the walls, as the guide's "the 2 walls"
  suggests.

