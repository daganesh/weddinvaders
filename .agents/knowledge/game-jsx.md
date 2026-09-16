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
| `useAssets()` call | 10 | Preloads bride/groom/couple images into `assetsRef`, preferring a customization override per role (see `useAssets.js` / `customizationStore.js`). |
| `useCustomization()` call | 12 | Ref-based hook reading the customization config once at mount into `configRef` — see `architecture.md`. |
| `useGameState()` call | 13 | Destructures `{ getState, startLoop, stopLoop, setRenderCallback, handleAction }` — see [`use-game-state.md`](use-game-state.md). |
| render-callback effect | 15–24 | Registers a callback that calls `render(ctx, state, assets, config)` (see [`renderer.md`](renderer.md)) every frame, and starts/stops the `requestAnimationFrame` loop on mount/unmount. |
| `.game-toolbar` / `.admin-btn` | in JSX | A row above the `<canvas>` holding the "⚙" button that navigates to the admin screen via `window.location.hash = '#/admin'` (routing handled in `App.jsx`, see `architecture.md`). Deliberately laid out in normal flow above the canvas, not absolutely positioned over it — an earlier version overlapped the on-canvas side panel (`drawPanel`'s "LEVEL" header) since both sat in the same top-right corner. |
| `handleCanvasClick` | 24–31 | Maps a canvas click to the right `handleAction` for the current phase (`START`, `NEXT_LEVEL`, `RESTART`). |
| `<canvas>` element | 39–45 | Sized `CANVAS_WIDTH × GAME_HEIGHT` from `src/constants.js`; the only meaningful DOM node for gameplay. |
| `.mobile-controls` block | 48–92 | On-screen ammo-select and shoot buttons for touch devices, dispatching `SELECT_AMMO` / `SHOOT` actions per role. |
| `.key-legend` | 94–97 | On-screen text listing keyboard controls — kept in sync with the real bindings in `useGameState.js` (bride: A/D move · S ammo · W shoot; groom: ←/→ move · ↑/↓ ammo · Space shoot). |

## Relationships / Cross-links
- Constructs and is the sole caller of `useGameState()` — see [`use-game-state.md`](use-game-state.md).
- Constructs `useAssets()` (`src/useAssets.js`, not a dedicated component file — small/single-purpose).
- Constructs `useCustomization()` (`src/useCustomization.js`) and reads `customizationStore.js`'s
  `getConfig()` directly for the DOM shoot-button colors (not via the ref, since refs shouldn't be
  read during render) — see `architecture.md`.
- Calls `render()` from `src/renderer.js` — see [`renderer.md`](renderer.md).
- Rendered by `App.jsx` alongside `AdminScreen.jsx` behind a `#/admin` hash-route check (`App.jsx`
  is no longer a pure passthrough) — see `architecture.md`.
- Imports layout/dimension constants from `src/constants.js` — see [`constants.md`](constants.md).
- Styling lives in `src/Game.css`, imported here (line 6).
- Manual verification of this component's wiring is covered by [`testing.md`](testing.md) and [`write-test.md`](../skills/write-test.md).
