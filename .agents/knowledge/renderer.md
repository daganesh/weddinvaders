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
labels, bride/groom names) that used to be hardcoded literals. It defaults to `DEFAULT_CONFIG` when
the 4th argument is omitted, so `render(ctx, state, assets)` still renders today's exact defaults.
Two small helpers, `getLevelText(cfg, index)` and `getItemLabel(item, cfg)`, resolve level text and
the `parent_bride`/`parent_groom` family labels through the config (falling back to `WEDDING_ITEMS`'
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
| `render(ctx, state, assets, config)` | 775 | Exported entry point; resolves `cfg = config ?? DEFAULT_CONFIG`, dispatches `title`/`modeSelect`/`meeting` to their own draw functions and returns early, otherwise draws the full playing-phase scene. Computes `groomWaiting`/`brideWaiting` (`mode === 'solo' && soloRole !== <role>`) and `topRole === <role>` and passes them into each `drawPlayer` call, and threads `assets?.items` (see below) into every `drawItem`/`drawPanel` call. |
| `drawBackground(ctx, players, cfg)` | 52 | Play-field background, per-row shading. Gradient stops read `cfg.colors.bgTop/bgMid/bgBot`. |
| `drawPlayer(ctx, player, img, isGroom, isTop, waiting, frame, cfg)` | 95 | Draws one player sprite at its current position via `drawImageContain` (preserves the image's own aspect ratio, letterboxed within the `PLAYER_WIDTH × PLAYER_HEIGHT` box, instead of stretching/skewing it); falls back to `cfg.colors.brideColor`/`groomColor` + emoji when the image isn't loaded/overridden. `isTop` (physical slot, from `state.topRole`, not role identity) decides which side of the sprite the ammo-label text draws on. `waiting` (true only in solo mode, for the non-controlled role) fades the sprite to `globalAlpha = 0.35` for a periodic blink (`frame % 200 < 10`) and skips the ammo label entirely — the parked player has no ammo to show. Computes `s = PLAYER_WIDTH / 62` and multiplies every fallback-emoji/ammo-label font size and offset by it, so the mobile-portrait profile's larger `PLAYER_WIDTH` (`constants.md`) gets proportionally larger text instead of the same small desktop-tuned text floating in a bigger sprite box. |
| `drawBullet(ctx, b)` | 127 | Draws one projectile, colored by `ammoType`. |
| `drawItem(ctx, item, itemImg)` | 158 | Draws one flying wedding item: icon, remaining price, flash feedback on hit. `itemImg` is `assets.items[item.templateId]` — a preloaded `Image` when the active package overrides that item's icon; drawn via `drawImageContain` when loaded (`itemImg.complete && itemImg.naturalWidth`), else falls back to the item's emoji (today's default). Border is a low-alpha rgba (`rgba(255,215,0,0.35)` essential / `rgba(255,255,255,0.10)` non-essential) — intentionally faint, not solid. Special-text branch includes `incomeType === 'time'` for the hourglass ("⏳ SLOW TIME"), alongside `income`/`mine`/`discount`. Like `drawPlayer`, computes `s = ITEM_WIDTH / 68` and scales every icon/font size, bar dimension, and offset inside the card by it, so the mobile-portrait profile's larger `ITEM_WIDTH` renders a proportionally bigger icon/label/price instead of desktop-sized text in a bigger card. |
| `drawPanel(ctx, state, cfg, itemImages)` | 239 | Right-side checklist panel, `PANEL_WIDTH` wide (110 desktop / 92 mobile portrait — see `constants.md`). `itemImages` is `assets.items` (keyed by `WEDDING_ITEMS` id, not `templateId` — these cards read the template directly, not a spawned instance), used the same emoji-or-image way as `drawItem`. Level name and `parent_bride`/`parent_groom` item labels are resolved through `cfg` via `getLevelText`/`getItemLabel`. Its own card-layout constants (`REQ_START_Y`, `REQ_CARD_H`, icon sizes, etc.) are **not** rescaled for mobile — the panel keeps its desktop proportions on every device, so a mobile-portrait canvas's much taller `GAME_HEIGHT` leaves visible empty space below the panel's item list; accepted trade-off, not a bug. |
| `drawHUD(ctx, state)` | 412 | Top HUD: money, ammo counts, lives, timer. Update this when adding a new ammo type. Not customization-aware (out of scope — HUD/ammo labels aren't in the customizable text set). |
| `drawMessages(ctx, messages)` | 457 | Floating "+$150" / "TRAP!" / "⏳ +15s reprieve!" popup text. Renders `m.text`, which is baked in at spawn time in `useGameState.js` from `WEDDING_ITEMS`' raw label — **not** customization-aware; see `use-game-state.md`. |
| `drawAdvanceAnim(ctx, anim)` | 475 | Row-advance flash animation. |
| `drawMeeting(ctx, state, assets, cfg)` | 494 | `meeting` phase: couple image + level result. Uses `cfg.text.winMessage` on the last level, `getLevelText(cfg, ...)` for the next level's name/subtitle otherwise. Its two `drawPlayer` calls always pass `waiting=false` (both sprites always shown, even in solo mode — the meeting cutscene is a couple moment regardless of who was controllable). |
| `drawFullScreenStarryBackground(ctx, cfg)` | 618 | Shared starfield backdrop factored out of `drawTitle` so `drawModeSelect` can reuse it without duplicating the star-field draw loop. |
| `drawTitle(ctx, cfg)` | 632 | `title` phase screen. Draws only the starry background (via `drawFullScreenStarryBackground`) and the still-canvas-drawn side panel (`drawPanel`, empty state) behind it — no text. Every piece of the title screen's text (game title, tagline, the customizable wedding-invitation copy, the opening-page links, and the control/ammo instructions) moved to a DOM overlay, `Game.jsx`'s `.title-overlay`, for the same reason `drawModeSelect`'s buttons are DOM: the invitation text is admin-customizable and arbitrary-length (needs real text wrapping), and the links need to be real anchors. See `game-jsx.md` and `architecture.md`'s "Opening-page links". |
| `drawModeSelect(ctx, cfg)` | 674 | New `modeSelect` phase screen — reuses `drawFullScreenStarryBackground` then draws a heading + subheading; the actual Couple/Solo-as-X buttons are DOM overlay elements in `Game.jsx`, not canvas-drawn (this function only paints the backdrop and title text behind them). |
| `drawOverlay(ctx, state, assets, cfg)` | 690 | `levelComplete` / `gameComplete` / `lost` overlays. Uses `cfg.text.winMessage`/`loseMessage`, `getLevelText`, and `getItemLabel` (for the "Still needed:" missing-item list). |

Note: like the pre-existing `discount` item, `hourglass` has `price > 0`, so `drawItem()`'s
`if (maxPrice > 0)` branch (HP bar + `$price`) takes priority over the `incomeType === 'time'`
special-text branch — the "⏳ SLOW TIME" label is effectively unreachable today, same as
`discount`'s "−30% OFF". This is an existing rendering quirk, not something introduced or fixed
here; the player still sees the correct price/HP bar while shooting it down.

`roundRect()`, `getLevelText(cfg, index)`, `getItemLabel(item, cfg)`, and
`drawImageContain(ctx, img, x, y, w, h)` (near the top of the file) are private helpers, not part
of the public surface. `drawImageContain` is the CSS `object-fit: contain` equivalent for canvas —
used by `drawPlayer`, `drawItem`, and `drawPanel`'s item-icon images alike (the couple-portrait
draws in `drawMeeting`/`drawOverlay` already compute their own height from the image's aspect ratio
inline).

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
- Does **not** import `src/pixelArt.js` — despite `pixelArt.js` defining `drawPixelSprite()`
  (an 8×8 grid, unrelated to and unused by the 16×16 SVGs in `assets/icons/`), item icons are
  drawn via `assets.items` (preloaded images from `useAssets.js`, sourced from the active
  package's `images`), falling back to emoji — see `architecture.md`'s Packages section.
- Exercised by the manual checklist in [`testing.md`](testing.md) (visual regressions after any change here should be checked against that checklist).
