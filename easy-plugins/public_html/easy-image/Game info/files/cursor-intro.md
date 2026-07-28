# Context for Cursor — add a "waiting toy" to the EasyPlugins "Easy Image" tool

## What you're working on
This is an **existing WordPress plugin, EasyPlugins**, specifically its **"Easy Image"**
tool. When the user clicks **Process Image(s)**, the plugin processes the selected images,
which usually takes ~10–30 seconds. Today that wait is just a plain loading state.

## What we're adding
A small, optional waiting-screen overlay called **"Toss the Pics."** While images process,
an overlay drops in and the **thumbnails of the images being processed** fall in as bouncy
physics cards. The user can grab and fling them (mouse or touch); they bounce off the walls
and each other. As each image **actually finishes processing**, its card pops with a sparkle
and a green checkmark. When all are done, a **Continue** button activates and closes the
overlay. It's pure fidget/delight — no score, no goal — meant to make a short wait pleasant.

## Two reference files — read both before doing anything
1. **`toss-the-pics-prototype.html`** — a complete, working reference implementation. The
   physics engine, canvas rendering, fling/pointer handling, sparkles, progress bar, and
   done-states are **already built**. **Reuse this code — do not rewrite the physics from
   scratch.** In the prototype the cards are gradient placeholders and completion runs on
   fake timers; both get swapped for real data.
2. **`cursor-implementation-brief.md`** — the integration plan. It defines the public API to
   expose (`TossToy.open / markDone / finishAll / close`), how to swap placeholders for the
   real thumbnails, how to wire real progress, how to enqueue assets, and the quality floor
   (graceful failure, reduced-motion fallback, scroll lock, etc.). **Follow it.**

## Before writing code — explore the existing plugin first
Don't assume the structure. Inspect the codebase and locate:
- The **admin screen / hook** for the Easy Image page (needed to enqueue assets on that
  screen only, not site-wide).
- The existing **"Process Image" trigger** — the click handler / AJAX call that starts
  processing — since that's where the overlay opens.
- How the **selected images and their thumbnail URLs** are available at that point.
- **Critically:** whether processing runs **one AJAX request per image** (so each card can
  light up as it finishes) or **a single server-side request for the whole batch** (reveal
  progressively, then finish on response). This decides how progress is wired — see the brief.

## Hard constraints
- The toy is **flair, never a blocker.** Wrap its init in try/catch; if anything in the toy
  fails, image processing must still run completely normally.
- **Vanilla JS + Canvas 2D, no new dependencies.**
- Load the toy's CSS/JS **only on the Easy Image admin screen**, not site-wide.
- **Do not change or risk the existing processing logic.** You're adding an overlay *around*
  it — not touching how images are actually processed.

## Done when
The overlay appears on Process, shows the **real** thumbnails bouncing, lights each one
green as it finishes (or progressively then all-at-once if it's a single request), Continue
closes it, errors fall back cleanly to the plugin's normal error UI, and reduced-motion
users get a calm static version instead of the physics.
