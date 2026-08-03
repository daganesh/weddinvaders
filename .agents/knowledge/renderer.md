# Component: `renderer.js`

## Location
`src/renderer.js` — 717 lines, the largest file in the repo. Entry point `export function render(ctx, state, assets)` at line 687.

## Purpose
All canvas drawing lives here and only here — per `architecture.md`'s design decisions, this
module is pure: `(ctx, state, assets) → void`, no side effects, no state mutation. It reads the
state produced by `useGameState.js` every frame and paints it; it never changes gameplay logic.

## Construction
Not a class — a module of draw functions plus one exported entry point. Called from `Game.jsx`'s
render callback (registered via `setRenderCallback`, see [`game-jsx.md`](game-jsx.md)):
```js
render(ctx, state, assetsRef.current);
```

## Key Surface
| Function | Line | Purpose |
|---|---|---|
| `render(ctx, state, assets)` | 687 | Exported entry point; dispatches to the phase-appropriate draw functions below based on `state.phase`. |
| `drawBackground(ctx, players)` | 31 | Play-field background, per-row shading. |
| `drawPlayer(ctx, player, img, isGroom)` | 67 | Draws bride/groom sprite images at their current position. |
| `drawBullet(ctx, b)` | 95 | Draws one projectile, colored by `ammoType`. |
| `drawItem(ctx, item)` | 122 | Draws one flying wedding item: emoji, remaining price, flash feedback on hit. |
| `drawPanel(ctx, state)` | 192 | Right-side 110px checklist panel (required items + checkmarks). |
| `drawHUD(ctx, state)` | 354 | Top HUD: money, ammo counts, lives, timer. Update this when adding a new ammo type. |
| `drawMessages(ctx, messages)` | 399 | Floating "+$150" / "TRAP!" popup text. |
| `drawAdvanceAnim(ctx, anim)` | 417 | Row-advance flash animation. |
| `drawMeeting(ctx, state, assets)` | 436 | `meeting` phase: couple image + level result. |
| `drawTitle(ctx)` | 556 | `title` phase screen (controls + ammo legend). |
| `drawOverlay(ctx, state, assets)` | 605 | `levelComplete` / `gameComplete` / `lost` overlays. |

`roundRect()` (line 15) is a private drawing helper, not part of the public surface.

## Relationships / Cross-links
- Reads dimension/timing/item constants from `src/constants.js` — see [`constants.md`](constants.md).
- Reads `LEVELS` from `src/levels.js` (for level name/subtitle display).
- Consumes state produced by `useGameState.js` — see [`use-game-state.md`](use-game-state.md). Never mutates it.
- Called by `Game.jsx` — see [`game-jsx.md`](game-jsx.md).
- Does **not** import `src/pixelArt.js` — despite `pixelArt.js` defining `drawPixelSprite()`,
  actual sprites are drawn via `assets` (preloaded PNGs from `useAssets.js`), not pixel art. See
  the note in [`architecture.md`](architecture.md).
- Exercised by the manual checklist in [`testing.md`](testing.md) (visual regressions after any change here should be checked against that checklist).
