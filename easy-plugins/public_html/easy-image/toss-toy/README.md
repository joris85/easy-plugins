# Toss the Pics — Blocks waiting game (Easy Image)

A falling-blocks puzzle shown while uploads are processing.

Optional overlay while images process: a falling-blocks game played with your upload thumbnails. A piece gets a thin green border when that image finishes processing.

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
| `toss-toy.config.js` | Feature flag and game pacing |
| `toss-toy.css` | Overlay styles |
| `toss-toy.js` | Host shell + `TossToy.open()` API |
| `toss-toy-blocks.js` | The falling-blocks game |
| `toss-toy-bridge.js` | Hooks into Easy Image upload flow |

## Controls

- **Keyboard:** `←` `→` move, `↑` or `Space` rotate, `↓` soft drop
- **Click/tap the board:** a fun reminder to use your keys :-)

## Easter egg

Hover the **upload dropzone** — a hidden 👾 appears in the corner. Click it for the secret Blocks game (uses your previews if uploaded, otherwise silly placeholders).

Disable in `toss-toy.config.js`: `easterEgg: { enabled: false }`.

## When it appears

- **2 or more** images in one run (or **1 large image**)
- `prefers-reduced-motion`: static grid only, no game
