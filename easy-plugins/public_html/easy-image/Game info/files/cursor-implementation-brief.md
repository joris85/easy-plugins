# EasyPlugins "Easy Image" — Waiting Toy ("Toss the Pics") Integration Brief

## Goal
While the "Easy Image" tool processes images (typically 10–30s), show a friendly overlay
with a small physics toy: the thumbnails of the images being processed drop in as bouncy
cards the user can grab and fling. Each card lights up **green with a checkmark** as that
image actually finishes. When all are done, a **Continue** button activates.

A working reference prototype is provided (`toss-the-pics-prototype.html`). It contains the
full physics engine, rendering, and pointer/fling handling. **Reuse that code directly** —
the work below is mostly wiring it into the plugin and swapping fake data for real data.

---

## Architecture

Three new assets, plus two integration points.

```
easyplugins/
  assets/
    js/toss-toy.js      <- physics engine + toy (refactored from prototype)
    css/toss-toy.css     <- overlay styles (from prototype <style>)
  includes/
    class-toss-toy.php   <- enqueue + pass image data to JS (optional helper)
```

### The toy as a small public API
Refactor the prototype's IIFE into a class/object so the plugin controls it cleanly:

```js
const toy = TossToy.open({
  mount: document.body,          // where the overlay attaches
  images: [                      // the real images being processed
    { id: 123, thumb: 'https://.../img-123-150x150.jpg' },
    { id: 124, thumb: 'https://.../img-124-150x150.jpg' },
    // ...
  ],
  onContinue: () => toy.close(), // called when user clicks Continue after completion
});

toy.markDone(123);   // call when image 123 finishes -> that card pops green
toy.finishAll();     // optional: mark everything done + enable Continue
toy.close();         // remove overlay
```

Internally `markDone(id)` finds the matching card, sets `done = true`, fires the sparkle
burst + green badge (all already in the prototype), and updates the progress bar/count.

### Rendering real thumbnails
The prototype draws gradient placeholders in `drawCard()`. Replace that placeholder block
with the real image:
- Preload each thumbnail into an `Image()` before/at open; store on the card as `card.img`.
- In `drawCard()`, after clipping to the rounded rect, use
  `ctx.drawImage(card.img, -s/2+4, -s/2+4, s-8, s-8)` (cover-fit; crop to square).
- Keep the white frame, shadow, green "done" border, checkmark badge, and flash exactly
  as in the prototype.
- If an image hasn't loaded yet, fall back to a neutral grey fill so nothing flickers.

---

## Integration point 1 — show the overlay when processing starts

Find where "Process Image(s)" is triggered in the existing admin JS (the click handler /
AJAX call that kicks off processing). Right there:

1. Collect the list of images about to be processed (their attachment IDs + thumbnail URLs).
   - If the UI already has selected items in the DOM, read thumb URLs from those `<img>`s.
   - Otherwise expose them from PHP via `wp_localize_script` / `wp_add_inline_script`.
2. `TossToy.open({ images, onContinue })`.
3. **Threshold guard:** only open the toy if more than one image, or if processing is
   expected to take more than ~1.5s. For a single instant op, skip the toy (don't flash it).

## Integration point 2 — drive real progress

This is the one place the design depends on how processing currently works. Two cases:

**A) Per-image processing (AJAX loop, or progress events per file)** — *preferred.*
After each image finishes, call `toy.markDone(thatImageId)`. The user sees photos light up
one by one, perfectly synced. This is the best experience — wire it this way if possible.

**B) Single blocking request (all images processed server-side in one call)**
You can't get per-image events. Two acceptable fallbacks:
- Stagger reveals on a timer while the request is in flight (like the prototype's fake
  timers), then call `toy.finishAll()` the moment the AJAX response returns. The staggering
  is cosmetic but reads fine.
- Or show a single progress state and call `toy.finishAll()` on response.
Prefer (A); only use (B) if the backend genuinely can't report per-image progress.

When processing returns (success or error):
- Success → `toy.finishAll()` if not already all done; user clicks **Continue** → `onContinue`
  closes the overlay and the plugin shows its normal results.
- Error → close the toy and surface the plugin's existing error UI. Don't trap the user in
  the toy on failure.

---

## Enqueueing (PHP)

Only load on the Easy Image admin screen, not site-wide:

```php
add_action('admin_enqueue_scripts', function ($hook) {
  // Replace with the actual screen/hook for the Easy Image page
  if ($hook !== 'easyplugins_page_easy-image') return;

  wp_enqueue_style('toss-toy', plugins_url('assets/css/toss-toy.css', EASYPLUGINS_FILE));
  wp_enqueue_script('toss-toy', plugins_url('assets/js/toss-toy.js', EASYPLUGINS_FILE), [], '1.0.0', true);
});
```

Keep it dependency-free (vanilla JS, Canvas 2D) — no libraries needed, which keeps the
plugin lightweight. *(Optional upgrade path: if you ever want richer collision quality,
matter.js is a drop-in, but the custom engine in the prototype is intentionally tiny.)*

---

## Quality floor (please don't skip)

- **Graceful failure:** wrap toy init in `try/catch`. If the toy throws, processing must
  still proceed normally — the toy is flair, never a blocker.
- **`prefers-reduced-motion`:** if set, skip the physics and show a calm static overlay
  (progress bar + "Working on your images…" + the same green check-offs, no bouncing).
- **Scroll lock** the body while the overlay is open; restore on close.
- **Keyboard / a11y:** overlay is `role="dialog"` with an accessible label (already in the
  prototype). Continue button focusable; Esc does nothing destructive (don't let Esc
  cancel processing).
- **Many images:** cap rendered cards at ~12 for performance; if more, render 12 and show a
  small "+N more" label. Progress count still reflects the true total.
- **Single image:** still works (one card) — just make sure the threshold guard allows it
  if the wait is long enough.
- **Cleanup:** on close, cancel the `requestAnimationFrame` loop and remove event listeners
  so nothing leaks if the page stays open.
- **Retina:** prototype already handles DPR scaling on the canvas — keep that.

---

## Suggested task order for Cursor
1. Drop `toss-toy.css` and `toss-toy.js` (refactored from the prototype) into `assets/`.
2. Wrap the prototype IIFE into the `TossToy.open / markDone / finishAll / close` API above.
3. Swap gradient placeholders for real `ctx.drawImage(card.img, …)` thumbnail rendering.
4. Enqueue both assets on the Easy Image admin screen only.
5. Hook `TossToy.open()` into the existing "Process Image" trigger, passing real thumbs.
6. Wire real progress: `markDone(id)` per finished image (case A) or `finishAll()` on
   response (case B).
7. Add the threshold guard, reduced-motion fallback, scroll lock, and try/catch safety net.
8. Test: 1 image, 7 images, 20+ images, a processing error, and reduced-motion on.

---

## One thing to confirm before wiring progress
How does Easy Image currently process the batch — **one AJAX request per image** (so we can
light each card up as it finishes), or **a single request that does them all server-side**?
That decides whether you wire path A or path B above. If you're not sure, search the plugin
JS for the process trigger and check whether it loops per file or fires once.
