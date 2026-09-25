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
| `render(ctx, state, assets, config)` | 790 | Exported entry point; resolves `cfg = config ?? DEFAULT_CONFIG`, dispatches `title`/`modeSelect`/`meeting` to their own draw functions and returns early, otherwise draws the full playing-phase scene. Computes `groomWaiting`/`brideWaiting` (`mode === 'solo' && soloRole !== <role>`) and `topRole === <role>` and passes them into each `drawPlayer` call, and threads `assets?.items` (see below) into every `drawItem`/`drawPanel` call. |
| `drawBackground(ctx, players, cfg)` | 52 | Play-field background, per-row shading. Gradient stops read `cfg.colors.bgTop/bgMid/bgBot`. |
| `drawPlayer(ctx, player, img, isGroom, isTop, waiting, frame, cfg)` | 95 | Draws one player sprite at its current position via `drawImageContain` (preserves the image's own aspect ratio, letterboxed within the `PLAYER_WIDTH × PLAYER_HEIGHT` box, instead of stretching/skewing it); falls back to `cfg.colors.brideColor`/`groomColor` + emoji when the image isn't loaded/overridden. Computes `inverted = isGroom !== isTop` — true when a role occupies the *other* role's usual physical slot (solo-as-groom's bottom-slot groom, or its parked top-slot bride) — and rotates the canvas 180° around the sprite's center before drawing it when so, so the sprite visually faces the direction it's actually shooting instead of the artwork's default top-slot-facing-down orientation; the rotation is undone (`ctx.restore()`) before the ammo-label text below, which is never rotated. `isTop` (physical slot, from `state.topRole`, not role identity) decides which side of the sprite the ammo-label text draws on. `waiting` (true only in solo mode, for the non-controlled role) fades the sprite to `globalAlpha = 0.35` for a periodic blink (`frame % 200 < 10`) and skips the ammo label entirely — the parked player has no ammo to show. Computes `s = PLAYER_WIDTH / 62` and multiplies every fallback-emoji/ammo-label font size and offset by it, so the mobile-portrait profile's larger `PLAYER_WIDTH` (`constants.md`) gets proportionally larger text instead of the same small desktop-tuned text floating in a bigger sprite box. |
| `drawBullet(ctx, b)` | 142 | Draws one projectile, colored by `ammoType`. |
| `drawItem(ctx, item, itemImg)` | 173 | Draws one flying wedding item: icon, remaining price, flash feedback on hit. `itemImg` is `assets.items[item.templateId]` — a preloaded `Image` when the active package overrides that item's icon; drawn via `drawImageContain` when loaded (`itemImg.complete && itemImg.naturalWidth`), else falls back to the item's emoji (today's default). Border is a low-alpha rgba (`rgba(255,215,0,0.35)` essential / `rgba(255,255,255,0.10)` non-essential) — intentionally faint, not solid. The income-item ammo-hint badge (top-right corner) is always 💌 now — both guest and family targets need the same `envelope` ammo, so there's nothing left to distinguish there (family paying more is conveyed by the icon/label, not this badge). Special-text branch includes `incomeType === 'time'` for the hourglass ("⏳ SLOW TIME"), alongside `income`/`mine`/`discount`. Like `drawPlayer`, computes `s = ITEM_WIDTH / 68` and scales every icon/font size, bar dimension, and offset inside the card by it, so the mobile-portrait profile's larger `ITEM_WIDTH` renders a proportionally bigger icon/label/price instead of desktop-sized text in a bigger card. |
| `drawPanel(ctx, state, cfg, itemImages)` | 255 | Right-side checklist panel, `PANEL_WIDTH` wide (110 desktop / 92 mobile portrait — see `constants.md`). `itemImages` is `assets.items` (keyed by `WEDDING_ITEMS` id, not `templateId` — these cards read the template directly, not a spawned instance), used the same emoji-or-image way as `drawItem`. Level name and `parent_bride`/`parent_groom` item labels are resolved through `cfg` via `getLevelText`/`getItemLabel`. Its own card-layout constants (`REQ_START_Y`, `REQ_CARD_H`, icon sizes, etc.) are **not** rescaled for mobile — the panel keeps its desktop proportions on every device, so a mobile-portrait canvas's much taller `GAME_HEIGHT` leaves visible empty space below the panel's item list; accepted trade-off, not a bug. |
| `drawHUD(ctx, state)` | 428 | Top HUD: money, ammo count, lives, timer. `ammo.envelope` is the one ammo readout now (was two, `ammo.invite`/`ammo.heart`); font sizes bumped from 13px to 15px bold so the "how much ammo is left" legend reads more clearly at a glance. When `state.livesFlashTimer > 0` (set by `useGameState.js` on a mine hit or a level failure — **not** an escaped item, which no longer costs a life), draws a fading red rect behind the heart icons before the rest of the HUD text, so losing a life reads clearly even off to the side of the player's focus — see `use-game-state.md`'s "Life-loss feedback". Update this when adding a new ammo type. Not customization-aware (out of scope — HUD/ammo labels aren't in the customizable text set). |
| `drawMessages(ctx, messages)` | 473 | Floating popup text — two styles depending on `m.big`. Normal (`m.big` falsy — "+$150" / "⏳ +15s reprieve!"): rises and fades from the triggering item's `x`/`y`, `msg()` in `useGameState.js`. `big` (`centerMsg()` — a mine hit's "−1 life" callout, or an escaped item's life-cost-free "⚠️ ... got away!" heads-up): bigger font, no rise, pinned at a screen-centered `x`/`y` regardless of where the triggering item was — needed for an escaped item in particular, which is already off-screen by the time its message fires. `m.text` is baked in at spawn/loss time in `useGameState.js`, generally from `WEDDING_ITEMS`' raw label — **not** customization-aware; see `use-game-state.md`. |
| `drawAdvanceAnim(ctx, anim)` | 491 | Row-advance flash animation. |
| `drawMeeting(ctx, state, assets, cfg)` | 510 | `meeting` phase: couple image + level result. Uses `cfg.text.winMessage` on the last level, `getLevelText(cfg, ...)` for the next level's name/subtitle otherwise. Its two `drawPlayer` calls always pass `waiting=false` and each role's *natural* `isGroom`/`isTop` pairing (both sprites always shown side by side in their default orientation, even in solo mode or after a solo-as-groom inversion — the meeting cutscene is a fixed couple moment, not a snapshot of mid-game slot assignment). When there's a next level (not the final one), also draws a "+$X & +N 💌 waiting for you!" line in the HUD strip below the play field, reading `LEVELS[currentLevel+1].money`/`.envelopes` directly — the same values `getInitialState`'s `carryOverMoney`/`carryOverEnvelopes` will add to on arrival, see `use-game-state.md`. |
| `drawFullScreenStarryBackground(ctx, cfg)` | 634 | Shared starfield backdrop factored out of `drawTitle` so `drawModeSelect` can reuse it without duplicating the star-field draw loop. |
| `drawTitle(ctx, cfg)` | 654 | `title` phase screen — draws only the starry background (via `drawFullScreenStarryBackground`) and the still-canvas-drawn side panel (`drawPanel`, empty state), no text. Practically unreachable in normal play: `Game.jsx` no longer shows a canvas `title` phase at all — the home page (`InviteScreen.jsx`, a separate pre-game DOM screen, not canvas-drawn) is shown first, and its embedded `GameTeaser.jsx`'s "▶ START GAME" link dispatches `START` immediately once `#/game` mounts, skipping straight to `modeSelect` before the canvas is ever mounted. Left in place as the dispatch table's default/safety case rather than removed. See `architecture.md`'s "Home screen (InviteScreen) and the game page". |
| `drawModeSelect(ctx, cfg)` | 664 | New `modeSelect` phase screen — reuses `drawFullScreenStarryBackground` then draws a heading + subheading; the actual Couple/Solo-as-X buttons (and the rules/explanation paragraph above them) are DOM overlay elements in `Game.jsx`, not canvas-drawn (this function only paints the backdrop and title text behind them). |
| `drawOverlay(ctx, state, assets, cfg)` | 701 | `levelComplete` / `gameComplete` / `lost` / `levelFailed` overlays. Uses `cfg.text.winMessage`/`loseMessage`, `getLevelText`, and `getItemLabel` (for the "Still needed:" missing-item list, via the shared `computeFailReason(level, acquiredItems, cfg)` helper — factored out so `lost` and `levelFailed` explain the same way). The `levelComplete` branch's next-level block also draws the same "+$X & +N 💌 waiting for you!" line as `drawMeeting` above — this is the other route into a new level (time ran out with all required items already acquired, rather than physically meeting). `levelFailed` (a level's objective wasn't met, but at least one life remains — see `use-game-state.md`'s "Level failure & retry") reuses `computeFailReason` for its reason line, then shows `−1 life · N lives left` and "Press any key to retry this level" instead of `lost`'s "Press R to try again" — it never ends the whole run. |

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
