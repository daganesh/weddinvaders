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
| `.game-toolbar` / `.admin-btn` | in JSX | A row above the `<canvas>` holding the "⚙" button that navigates to the admin screen via `window.location.hash = '#/admin'` (routing handled in `App.jsx`, see `architecture.md`). Deliberately laid out in normal flow above the canvas, not absolutely positioned over it — an earlier version overlapped the on-canvas side panel (`drawPanel`'s "LEVEL" header) since both sat in the same top-right corner. |
| `handleCanvasClick` | 44–52 | Maps a canvas click to the right `handleAction` for the current phase: `title` → `START`; `playing` in solo mode → `SHOOT` for `soloRole` (a couple-mode click does nothing — shooting stays on dedicated keys/buttons since both roles share the canvas); `meeting`/`levelComplete` → `NEXT_LEVEL`; `gameComplete`/`lost` → `RESTART`. |
| `handleTouchStart`/`handleTouchEnd` | 60–73 | Solo-mode swipe-to-move. Tracks the touch's starting `clientX`; on touch end, if `phase === 'playing' && mode === 'solo'` and the horizontal delta exceeds `SWIPE_THRESHOLD` (30px), dispatches `SWIPE_MOVE` with the direction. A short tap (no real swipe) does nothing here and falls through to the browser's synthesized `click`, which `handleCanvasClick` treats as shoot — the two gestures don't need manual disambiguation because a genuine swipe suppresses the browser's synthetic click on its own. |
| `.canvas-wrapper` | in JSX | Wraps the `<canvas>` so the `modeSelect` overlay (an absolutely-positioned DOM layer) can sit directly on top of it; see `Game.css`. |
| `<canvas>` element | in JSX | Sized `CANVAS_WIDTH × GAME_HEIGHT` from `src/constants.js`; also wired with `onTouchStart`/`onTouchEnd` for solo-mode swipe detection, and `touch-action: none` in CSS so the browser doesn't intercept the gesture as a page scroll. |
| `.mode-select-overlay` | in JSX | Shown only when `uiPhase === 'modeSelect'` — three DOM buttons (Couple / Solo as Bride / Solo as Groom) dispatching `handleAction({ type: 'CHOOSE_MODE', mode, soloRole })`. Canvas-drawn backdrop/heading is `drawModeSelect` in `renderer.js`; the buttons themselves are DOM, not canvas, since they need normal click handling and text reflow. |
| `.mobile-controls` block | in JSX | Couple-mode-only (`showControls && uiMode === 'couple'`) on-screen ammo-select and shoot buttons for touch devices, dispatching `SELECT_AMMO` / `SHOOT` actions per role. |
| `.solo-controls` block | in JSX | Solo-mode-only (`showControls && uiMode === 'solo'`) mobile control surface: a hint line ("Swipe canvas to move · Tap to shoot") and a single "🔄 Switch Ammo" button dispatching `CYCLE_AMMO` for `uiSoloRole` — deliberately simpler than the couple-mode ammo-select row, per the mobile-first goal of solo mode. |
| `.key-legend` | in JSX | On-screen text listing keyboard controls — kept in sync with the real bindings in `useGameState.js` (bride: A/D move · S ammo · W shoot; groom: ←/→ move · ↑/↓ ammo · Space shoot). Switches between the couple two-line legend and a single-role line (with a "(or swipe/tap)" suffix) based on `uiMode`/`uiSoloRole`. The displayed name (default "Bride"/"Groom") comes from `activeConfig.text.names`, same source and same non-ref read pattern as the shoot-button colors below. |

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
- Styling lives in `src/Game.css`, imported here (line 6).
- Manual verification of this component's wiring is covered by [`testing.md`](testing.md) and [`write-test.md`](../skills/write-test.md).
