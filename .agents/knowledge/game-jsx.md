# Component: `Game` (`src/Game.jsx`)

## Location
`src/Game.jsx` — `export default function Game()`. Line numbers below drift as the file grows;
re-verify rather than assuming (per the README's guidance).

## Purpose
The React shell and orchestrator. It's the one place that wires the two core modules together:
it constructs `useGameState()` and `useAssets()`, owns the `<canvas>` element, drives the
render/game loop lifecycle, and translates DOM events (click, on-screen mobile buttons) into
`handleAction()` calls. Per `architecture.md`'s data flow, this is the root node — everything
else in `src/` is either a hook it calls or a pure function it calls into.

## Construction
Rendered by `App.jsx` (`<Game />`, no props) → the only consumer is `src/main.jsx`'s React root.

## Key Surface
| Element | Line | Purpose |
|---|---|---|
| `useAssets()` call | 14 | Preloads bride/groom/couple images plus any per-item icon override into `assetsRef` (`{ bride, groom, couple, items: { [itemId]: Image }, loaded }`), preferring the active package's `images` per role/item id (see `useAssets.js` / `customizationStore.js`). |
| `useCustomization()` call | 15 | Ref-based hook reading the customization config once at mount into `configRef` — see `architecture.md`. |
| `useGameState()` call | 16 | Destructures `{ getState, startLoop, stopLoop, setRenderCallback, handleAction }` — see [`use-game-state.md`](use-game-state.md). |
| `uiPhase`/`uiMode`/`uiSoloRole` state | 21–24 | Lightweight React-state mirrors of `state.phase`/`state.mode`/`state.soloRole`, updated only inside the render callback when `state.phase` actually changes (tracked via `prevPhaseRef`) — not every frame. Game state itself stays ref-based for 60fps perf (see `architecture.md`'s "Key Design Decisions"), but the DOM layer needs to reactively show/hide the mode-select overlay and swap between couple/solo on-screen controls, which plain refs can't drive. |
| render-callback effect | 26–42 | Registers a callback that calls `render(ctx, state, assets, config)` (see [`renderer.md`](renderer.md)) every frame, updates the `uiPhase`/`uiMode`/`uiSoloRole` mirrors on phase change, and starts/stops the `requestAnimationFrame` loop on mount/unmount. |
| `.game-banner` | in JSX | An `<img>` header shown above the toolbar, on every phase — `activeConfig.images.banner || <bundled banner-default.svg>` (mirrors the null-falls-back-to-bundled-asset pattern portraits use, see `architecture.md`). Unlike every other customizable image, it's plain DOM, not canvas-drawn or preloaded via `useAssets.js` — a page header has no reason to go through the sprite-preload path. `flex-shrink: 0` in `Game.css` so it keeps its own height even where `.canvas-wrapper` is `flex: 1` (mobile portrait). |
| `.game-toolbar` / `.admin-btn` | in JSX | A row above the `<canvas>` holding the "⚙" button that navigates to the admin screen via `window.location.hash = '#/admin'` (routing handled in `App.jsx`, see `architecture.md`). Deliberately laid out in normal flow above the canvas, not absolutely positioned over it — an earlier version overlapped the on-canvas side panel (`drawPanel`'s "LEVEL" header) since both sat in the same top-right corner. |
| `handleCanvasClick` | 44–52 | Maps a canvas click to the right `handleAction` for the current phase: `title` → `START`; `playing` in solo mode → `SHOOT` for `soloRole` (a couple-mode click does nothing — shooting stays on dedicated keys/buttons since both roles share the canvas); `meeting`/`levelComplete` → `NEXT_LEVEL`; `gameComplete`/`lost` → `RESTART`. |
| `handleTouchStart`/`handleTouchMove`/`handleTouchEnd` | 60–86 | Solo-mode drag-to-move. `handleTouchMove` fires on every native `touchmove`, computing the delta since the *previous* touch position (not since touch start) and dispatching `handleAction({ type: 'DRAG_MOVE', role: soloRole, deltaX })` each time — the player tracks the finger continuously and proportionally, rather than a fixed-speed nudge triggered once on touch end. The raw screen-pixel delta is rescaled by `CANVAS_WIDTH / canvas.getBoundingClientRect().width` before dispatching, since the canvas renders at `max-width: 100%; height: auto` and can be smaller on-screen than its internal resolution — the rescale keeps "1:1" tracking the visible sprite, not the raw internal canvas pixels. A short tap (negligible travel) still falls through to the browser's synthesized `click`, which `handleCanvasClick` treats as shoot — real drag distance suppresses that synthetic click on its own, so tap-to-shoot and drag-to-move don't need manual disambiguation. |
| `.canvas-wrapper` | in JSX | Wraps the `<canvas>` so the `modeSelect` overlay (an absolutely-positioned DOM layer) can sit directly on top of it; see `Game.css`. |
| `<canvas>` element | in JSX | Sized `CANVAS_WIDTH × GAME_HEIGHT` from `src/constants.js`; also wired with `onTouchStart`/`onTouchEnd` for solo-mode swipe detection, and `touch-action: none` in CSS so the browser doesn't intercept the gesture as a page scroll. |
| `.mode-select-overlay` | in JSX | Shown only when `uiPhase === 'modeSelect'` — three DOM buttons (Couple / Solo as Bride / Solo as Groom) dispatching `handleAction({ type: 'CHOOSE_MODE', mode, soloRole })`. Canvas-drawn backdrop/heading is `drawModeSelect` in `renderer.js`; the buttons themselves are DOM, not canvas, since they need normal click handling and text reflow. |
| `.mobile-controls` block | in JSX | Couple-mode-only (`showControls && uiMode === 'couple'`) on-screen ammo-select and shoot buttons for touch devices, dispatching `SELECT_AMMO` / `SHOOT` actions per role. |
| `.solo-controls` block | in JSX | Solo-mode-only (`showControls && uiMode === 'solo'`) mobile control surface: a hint line ("Swipe canvas to move · Tap to shoot") and a single "🔄 Switch Ammo" button dispatching `CYCLE_AMMO` for `uiSoloRole` — deliberately simpler than the couple-mode ammo-select row, per the mobile-first goal of solo mode. |
| `.key-legend` | in JSX | On-screen text listing keyboard controls — kept in sync with the real bindings in `useGameState.js` (bride: A/D move · S ammo · W shoot; groom: ←/→ move · ↑/↓ ammo · Space shoot). Switches between the couple two-line legend and a single-role line (with a "(or swipe/tap)" suffix) based on `uiMode`/`uiSoloRole`. The displayed name (default "Bride"/"Groom") comes from `activeConfig.text.names`, same source and same non-ref read pattern as the shoot-button colors below. |
| `.title-links` block | in JSX | Title-phase-only (`uiPhase === 'title'`) row of real `<a target="_blank" rel="noopener noreferrer">` pill links, one per `activeConfig.links` entry whose `url` is non-empty (`visibleLinks`, computed the same non-ref way as `activeConfig` above) — see `architecture.md`'s "Opening-page links". Both system packages ship with all three seeded links pointing at bundled pages, so this is visible out of the box, not just after an admin fills something in. Each `href` goes through the module-level `withProtocol()` helper: it prepends `https://` when the admin typed a bare domain (`example.com/rsvp`), but leaves a site-relative path (starting with `/`, `./`, or `../` — e.g. the bundled examples' urls) untouched, since prepending a scheme to those would break them. Real anchors, not canvas-drawn or an absolutely-positioned overlay: they sit in normal flow below `.canvas-wrapper`, so a click lands on the `<a>` itself and never reaches `handleCanvasClick` (which would otherwise treat any title-phase click as `START`) — `target="_blank"` plus this DOM placement is what guarantees a link always opens in a new tab instead of navigating the game away; verified via Playwright that clicking a link opens a new tab without advancing the game phase. `flex-shrink: 0` in `Game.css`, same reasoning as `.game-banner`. |

## Relationships / Cross-links
- Constructs and is the sole caller of `useGameState()` — see [`use-game-state.md`](use-game-state.md).
- Constructs `useAssets()` (`src/useAssets.js`, not a dedicated component file — small/single-purpose).
- Constructs `useCustomization()` (`src/useCustomization.js`) and reads `customizationStore.js`'s
  `getActiveConfig()` directly for the DOM shoot-button colors and the `.key-legend` names (not via
  the ref, since refs shouldn't be read during render) — see `architecture.md`.
- Calls `render()` from `src/renderer.js` — see [`renderer.md`](renderer.md).
- Rendered by `App.jsx` alongside `AdminScreen.jsx` behind a `#/admin` hash-route check (`App.jsx`
  is no longer a pure passthrough) — see `architecture.md`.
- Imports layout/dimension constants from `src/constants.js` — see [`constants.md`](constants.md).
- Styling lives in `src/Game.css`, imported here (line 6). Its `(max-width: 640px) and
  (orientation: portrait)` media query is the CSS-side counterpart of `constants.js`'s
  `IS_MOBILE_PORTRAIT` (same threshold, checked independently since CSS media queries can't read a
  JS module's constant): `.game-container` is pinned to `calc(100dvh - 16px)` (subtracting
  `.game-wrapper`'s own 8px top+bottom padding, which otherwise pushes the layout 16px past the
  viewport) and `.canvas-wrapper` becomes a `flex: 1 1 0` middle section between the toolbar and
  on-screen controls, so the canvas — now intrinsically taller/narrower on mobile portrait, see
  `constants.md` — fills whatever vertical space those two smaller elements leave, instead of a
  short landscape-shaped box centered in a mostly-empty tall screen. `flex-basis: 0` (not `auto`)
  matters here: with `auto`, the browser sizes this flex item from the canvas's own preferred
  (aspect-ratio-driven) height before shrinking, which under-shrinks it and pushes couple mode's
  taller two-row `.mobile-controls` bar off the bottom of the screen. The same query also shrinks
  `.game-banner`'s `max-height` from 90px to 44px, and `.title-link`'s padding/font-size, since on a
  phone that vertical space is much better spent on the canvas.
- Manual verification of this component's wiring is covered by [`testing.md`](testing.md) and [`write-test.md`](../skills/write-test.md).
