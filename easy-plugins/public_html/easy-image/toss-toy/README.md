# Toss the Pics — Tetris waiting game (Easy Image)

Optional overlay while images process: play Tetris with your upload thumbnails. Blocks get a thin green border when that image finishes.

## Enable / disable

**Quick off (keep files):** edit `toss-toy.config.js`:

```js
window.TOSS_TOY_CONFIG = {
    enabled: false,  // ← set to false
    ...
};
```

**PHP off:** edit `index.php` and set:

```php
$easyImageTossToyEnabled = false;
```

## Remove completely

1. Set `$easyImageTossToyEnabled = false` in `index.php`, or delete the `<?php if ($easyImageTossToyEnabled): ?> … <?php endif; ?>` block.
2. Delete the `toss-toy/` folder.
3. Remove the four `TossToyBridge` hook lines in `js/app.js` (search for `TossToyBridge`).

## Files

| File | Purpose |
|------|---------|
| `toss-toy.config.js` | Feature flag and Tetris pacing |
| `toss-toy.css` | Overlay styles |
| `toss-toy.js` | Host shell + `TossToy.open()` API |
| `toss-toy-tetris.js` | Image Tetris game |
| `toss-toy-bridge.js` | Hooks into Easy Image upload flow |

## Controls

- **Keyboard:** `←` `→` move, `↑` or `Space` rotate, `↓` soft drop
- **Click/tap the board:** a fun reminder to use your keys :-)

## Easter egg

Hover the **upload dropzone** — a hidden 👾 appears in the corner. Click it for secret Tetris (uses your previews if uploaded, otherwise silly placeholders).

Disable in `toss-toy.config.js`: `easterEgg: { enabled: false }`.

## When it appears

- **2 or more** images in one run (or **1 large image**)
- `prefers-reduced-motion`: static grid only, no Tetris
