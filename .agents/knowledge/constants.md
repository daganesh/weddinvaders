# Component: `src/constants.js`

## Location
`src/constants.js` — ~98 lines. No exported class; a flat module of exported constants.

## Purpose
The single source of truth for every dimension, timing value, and the item/ammo data schema.
It's the highest-fan-in module in the repo — imported by `levels.js`, `useGameState.js`,
`renderer.js`, and `Game.jsx` — which is exactly why `dev-environment.md`'s gotcha list says
"do not hardcode magic numbers elsewhere." Anything that looks like a game-balance number
(price, speed, timer length) should be traced back here first.

### Mobile-portrait responsive profile
`IS_MOBILE_PORTRAIT` (top of file, not exported) is computed once at module load —
`window.innerWidth <= 640 && window.innerHeight > window.innerWidth` — and several dimension
constants below branch on it to give a phone held vertically its own, taller-and-narrower logical
board instead of letterboxing the desktop-shaped one (which left most of a tall screen's height
empty under plain `max-width: 100%; height: auto` scaling). Because `CANVAS_WIDTH` is smaller on
mobile, the *same* viewport width scales everything up more (dividing by a smaller number), so
fonts/icons/sprites drawn at the values in `renderer.js` render visibly larger on a phone with no
extra scaling math needed there — except `drawItem`/`drawPlayer`, which derive their own `s = ITEM_WIDTH/68` / `PLAYER_WIDTH/62` scale factors so their *internal* icon/text sizing keeps up with
enlarged card/sprite dimensions too (see `renderer.md`). This is a load-time-only decision — there's
no resize listener anywhere in this codebase, so rotating the device mid-session keeps whichever
profile was picked at load (known limitation, matches the codebase's existing no-dynamic-resize
pattern elsewhere, e.g. `useAssets`/`useCustomization`). `Game.css`'s own `(max-width: 640px) and
(orientation: portrait)` media query is the CSS-side equivalent — see `game-jsx.md`.

## Key Surface
| Export | Line | Purpose |
|---|---|---|
| `GAME_WIDTH`, `PANEL_WIDTH`, `CANVAS_WIDTH` | ~16–18 | Play-area width, side panel width, total canvas width — 800/110/910 desktop, **460/92/552 mobile portrait** (see above). |
| `TOTAL_ROWS`, `ROW_HEIGHT`, `PLAY_HEIGHT`, `HUD_HEIGHT`, `GAME_HEIGHT` | ~20–24 | 9 rows on every device; `ROW_HEIGHT` 60 desktop / 80 mobile portrait → `PLAY_HEIGHT` 540/720; `HUD_HEIGHT` fixed 60; `GAME_HEIGHT` derived as `PLAY_HEIGHT + HUD_HEIGHT` (600 desktop / 780 mobile). |
| `MAX_CONCURRENT_ITEMS` | ~32 | Cap on simultaneous flying items (`useGameState.js`'s spawn check) — 8 desktop / 5 mobile portrait, lower on mobile so the larger item cards there don't visually crowd a narrower play field. |
| `PLAYER_WIDTH`, `PLAYER_HEIGHT`, `PLAYER_SPEED` | ~35–37 | Player sprite size (62×50 desktop / 96×78 mobile portrait) and per-frame move speed (unchanged, 5, on both — DRAG_MOVE bypasses this for mobile touch anyway, see `use-game-state.md`). |
| `GROOM_START_ROW`/`_X`, `BRIDE_START_ROW`/`_X` | ~39–44 | Groom starts row 0 top-right; bride starts row 8 (`TOTAL_ROWS - 1`) bottom-left. Formulas, not hardcoded, so they adapt automatically to whichever `GAME_WIDTH`/`PLAYER_WIDTH` profile is active. |
| `BULLET_SPEED`, `BULLET_WIDTH`, `BULLET_HEIGHT` | ~47–49 | Projectile physics/size — not branched by mobile profile. |
| `ITEM_WIDTH`, `ITEM_HEIGHT`, `ITEM_SPEED` | ~52–54 | Flying-item size — 68×56 desktop / 96×74 mobile portrait; `ITEM_SPEED` here is a fallback — each level overrides it via `itemSpeed` in `levels.js`. |
| `AMMO_ORDER`, `AMMO_META` | 34–39 | Cycling order (`['cash','invite','heart']`) and per-ammo `{label, color, description}` used by the HUD and mobile buttons. |
| `WEDDING_ITEMS` | 43–60 | The item schema: `id, emoji, label, price, essential, exclusiveTo, incomeType, incomeAmount?, ammoRequired?, discountPct?, spawnWeight`. This is the data `game-design.md`'s item table describes. `spawnWeight` drives `useGameState.js`'s weighted spawn pick (`pickWeighted()`) — higher is more common. **`parent_bride`/`parent_groom`'s `label` ("Her Family"/"His Family") is a default only** — `renderer.js`'s panel/lost-reason code resolves the *displayed* label through `customizationStore.js`'s `cfg.text.familyLabels` via `getItemLabel(item, cfg)`, not by reading this field directly; `useGameState.js`'s spawn-time item snapshot (used for floating pickup toasts) still copies this raw field, so it is not customization-aware — see `use-game-state.md`. |
| `AMMO_DAMAGE` | 63 | Per-shot damage by ammo type: `{cash: 100, invite: 1, heart: 1}`. |
| `INITIAL_MONEY`, `INITIAL_INVITE`, `INITIAL_HEART` | 66–68 | Fallback starting resources (levels in `levels.js` override money/invites/hearts per level). |
| `GAME_DURATION`, `ROW_ADVANCE_INTERVAL` | 71–72 | Fallback timing (also overridden per level by `gameDuration`/`rowAdvance` in `levels.js`). |
| `ROW_ADVANCE_SPEEDUP` | 73 | Multiplier applied to the row-advance rate once all required items are acquired (default `2.5`). See `game-design.md`'s "Row-Advance Pacing". |
| `HOURGLASS_SLOW_SECONDS` | 74 | Real seconds the `hourglass` item halves the row-advance rate for (default `15`). |
| `NO_AMMO_FASTFORWARD` | 75 | Speed multiplier applied to the timer/row-advance tick rate once cash, invites, and hearts are all exhausted (default `10`) — see `game-design.md`'s "Row-Advance Pacing" and `use-game-state.md`. |

## Relationships / Cross-links
- Consumed by `src/levels.js` (`WEDDING_ITEMS` → `getSpawnPool()`), `src/useGameState.js`, `src/renderer.js`, and `src/Game.jsx` — see [`use-game-state.md`](use-game-state.md), [`renderer.md`](renderer.md), [`game-jsx.md`](game-jsx.md).
- `WEDDING_ITEMS` and `AMMO_META` are the data source for the tables in [`game-design.md`](game-design.md) — that file describes the *rules*, this file (and `levels.js`) hold the *numbers*. If they disagree, trust this file.
- Per-level overrides (`money`, `priceScale`, `itemSpeed`, `rowAdvance`, `gameDuration`, `invites`, `hearts`, `hasMines`) live in `src/levels.js`, not here — not split into its own component file (100 lines, two pure helper functions, already covered by `game-design.md`'s level table).
