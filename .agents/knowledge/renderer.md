# Component: `renderer.js`

## Location
`src/renderer.js` — the largest file in the repo (line numbers below drift as it grows; re-verify
rather than assuming). Entry point `export function render(ctx, state, assets, config)`.

## Purpose
All canvas drawing lives here and only here — per `architecture.md`'s design decisions, this
module is pure: `(ctx, state, assets, config) → void`, no side effects, no state mutation. It reads
the state produced by `useGameState.js` every frame and paints it; it never changes gameplay logic.

`config` (from `customizationStore.js`) supplies the customizable palette (`config.colors.*`) and
wedding text (`config.text.*` — title, tagline, win/lose messages, level names/subtitles, family
labels) that used to be hardcoded literals. It defaults to `DEFAULT_CONFIG` when the 4th argument
is omitted, so `render(ctx, state, assets)` still renders today's exact defaults. Two small helpers,
`getLevelText(cfg, index)` and `getItemLabel(item, cfg)`, resolve level text and the
`parent_bride`/`parent_groom` family labels through the config (falling back to `WEDDING_ITEMS`'
own `label` for every other item) — every draw function that used to read a hardcoded color or
string now takes `cfg` as its trailing argument instead.

## Construction
Not a class — a module of draw functions plus one exported entry point. Called from `Game.jsx`'s
render callback (registered via `setRenderCallback`, see [`game-jsx.md`](game-jsx.md)):
```js
render(ctx, state, assetsRef.current, configRef.current);
```

## Key Surface
| Function | Line | Purpose |
|---|---|---|
| `render(ctx, state, assets, config)` | 706 | Exported entry point; resolves `cfg = config ?? DEFAULT_CONFIG`, then dispatches to the phase-appropriate draw functions below based on `state.phase`. |
| `drawBackground(ctx, players, cfg)` | 38 | Play-field background, per-row shading. Gradient stops read `cfg.colors.bgTop/bgMid/bgBot`. |
| `drawPlayer(ctx, player, img, isGroom, cfg)` | 88 | Draws bride/groom sprite images at their current position via `drawImageContain` (preserves the image's own aspect ratio, letterboxed within the `PLAYER_WIDTH × PLAYER_HEIGHT` box, instead of stretching/skewing it — matters since a customization upload can be any aspect ratio); falls back to `cfg.colors.brideColor`/`groomColor` + emoji when the image isn't loaded/overridden. |
| `drawBullet(ctx, b)` | 102 | Draws one projectile, colored by `ammoType`. |
| `drawItem(ctx, item)` | 129 | Draws one flying wedding item: emoji, remaining price, flash feedback on hit. Border is a low-alpha rgba (`rgba(255,215,0,0.35)` essential / `rgba(255,255,255,0.10)` non-essential) — intentionally faint, not solid. Special-text branch includes `incomeType === 'time'` for the hourglass ("⏳ SLOW TIME"), alongside `income`/`mine`/`discount`. |
| `drawPanel(ctx, state, cfg)` | 203 | Right-side 110px checklist panel (required items + checkmarks). Level name and `parent_bride`/`parent_groom` item labels are resolved through `cfg` via `getLevelText`/`getItemLabel`. |
| `drawHUD(ctx, state)` | 366 | Top HUD: money, ammo counts, lives, timer. Update this when adding a new ammo type. Not customization-aware (out of scope — HUD/ammo labels aren't in the customizable text set). |
| `drawMessages(ctx, messages)` | 411 | Floating "+$150" / "TRAP!" / "⏳ +15s reprieve!" popup text. Renders `m.text`, which is baked in at spawn time in `useGameState.js` from `WEDDING_ITEMS`' raw label — **not** customization-aware; see `use-game-state.md`. |
| `drawAdvanceAnim(ctx, anim)` | 429 | Row-advance flash animation. |
| `drawMeeting(ctx, state, assets, cfg)` | 448 | `meeting` phase: couple image + level result. Uses `cfg.text.winMessage` on the last level, `getLevelText(cfg, ...)` for the next level's name/subtitle otherwise. |
| `drawTitle(ctx, cfg)` | 572 | `title` phase screen (controls + ammo legend). Title/tagline/accent color come from `cfg.text`/`cfg.colors`; the control-legend lines below them are intentionally left hardcoded (out of customization scope). |
| `drawOverlay(ctx, state, assets, cfg)` | 621 | `levelComplete` / `gameComplete` / `lost` overlays. Uses `cfg.text.winMessage`/`loseMessage`, `getLevelText`, and `getItemLabel` (for the "Still needed:" missing-item list). |

Note: like the pre-existing `discount` item, `hourglass` has `price > 0`, so `drawItem()`'s
`if (maxPrice > 0)` branch (HP bar + `$price`) takes priority over the `incomeType === 'time'`
special-text branch — the "⏳ SLOW TIME" label is effectively unreachable today, same as
`discount`'s "−30% OFF". This is an existing rendering quirk, not something introduced or fixed
here; the player still sees the correct price/HP bar while shooting it down.

`roundRect()`, `getLevelText(cfg, index)`, `getItemLabel(item, cfg)`, and
`drawImageContain(ctx, img, x, y, w, h)` (near the top of the file) are private helpers, not part
of the public surface. `drawImageContain` is the CSS `object-fit: contain` equivalent for canvas —
used only by `drawPlayer`, since the couple-portrait draws in `drawMeeting`/`drawOverlay` already
compute their own height from the image's aspect ratio inline.

## Relationships / Cross-links
- Reads dimension/timing/item constants from `src/constants.js` — see [`constants.md`](constants.md).
- Reads `LEVELS` from `src/levels.js` (ids/required/optional — the *displayed* name/subtitle come
  from `cfg.text.levels` via `getLevelText`, defaulting to `DEFAULT_CONFIG.text.levels`, which
  mirrors `levels.js`'s original values).
- Reads customization config from `src/customizationStore.js` (`DEFAULT_CONFIG`, used as the
  fallback when `render()`'s 4th argument is omitted) — see `architecture.md`. Never imports or
  touches `localStorage` directly; that stays behind `customizationStore.js`.
- Consumes state produced by `useGameState.js` — see [`use-game-state.md`](use-game-state.md). Never mutates it.
- Called by `Game.jsx` — see [`game-jsx.md`](game-jsx.md).
- Does **not** import `src/pixelArt.js` — despite `pixelArt.js` defining `drawPixelSprite()`,
  actual sprites are drawn via `assets` (preloaded PNGs from `useAssets.js`), not pixel art. See
  the note in [`architecture.md`](architecture.md).
- Exercised by the manual checklist in [`testing.md`](testing.md) (visual regressions after any change here should be checked against that checklist).
