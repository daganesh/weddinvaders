# Component: `Game` (`src/Game.jsx`)

## Location
`src/Game.jsx` — `export default function Game({ active })`. Line numbers below drift as the file
grows; re-verify rather than assuming (per the README's guidance).

## Purpose
The `'game'` route's content — the canvas, its on-screen controls, and the game loop lifecycle.
It's the one place that wires the two core game modules together: it constructs `useGameState()`
and `useAssets()`, owns the `<canvas>` element, and translates DOM events (click, on-screen mobile
buttons) into `handleAction()` calls. It no longer owns any page chrome (banner, hamburger, About
modal) or routing — those moved to `PageHeader.jsx`/`App.jsx` when RSVP/Registry/Songs/Food became
real sibling pages; see `architecture.md`'s "Routing & pages".

## Construction
Rendered by `App.jsx`, always mounted alongside every other page (see `architecture.md`):
```jsx
<div style={{ display: route === 'game' ? undefined : 'none' }}>
  <Game active={route === 'game'} />
</div>
```
`active` is the only prop. It's kept mounted (not conditionally rendered by the router) specifically
so its state — most importantly the running game itself, held in `useGameState()`'s `stateRef` —
survives navigating to another page and back, rather than being destroyed and rebuilt.

## Key Surface
| Element | Purpose |
|---|---|
| `useAssets()` call | Preloads bride/groom/couple images plus any per-item icon override into `assetsRef` (`{ bride, groom, couple, items: { [itemId]: Image }, loaded }`), preferring the active package's `images` per role/item id (see `useAssets.js` / `customizationStore.js`). Runs regardless of `active` — assets preload as soon as the app loads, not only once a guest navigates to `#/game`. |
| `useCustomization()` call | Ref-based hook reading the customization config once at mount into `configRef` — see `architecture.md`. |
| `useGameState(active)` call | Destructures `{ getState, startLoop, stopLoop, setRenderCallback, handleAction }` — see [`use-game-state.md`](use-game-state.md). `active` is the same `active` gate covered below. |
| `uiPhase`/`uiMode`/`uiSoloRole` state | Lightweight React-state mirrors of `state.phase`/`state.mode`/`state.soloRole`, updated only inside the render callback when `state.phase` actually changes (tracked via `prevPhaseRef`) — not every frame. Game state itself stays ref-based for 60fps perf (see `architecture.md`'s "Key Design Decisions"), but the DOM layer needs to reactively show/hide the mode-select overlay and swap between couple/solo on-screen controls, which plain refs can't drive. |
| render-callback effect | Registers a callback that calls `render(ctx, state, assets, config)` (see [`renderer.md`](renderer.md)) every frame and updates the `uiPhase`/`uiMode`/`uiSoloRole` mirrors on phase change. Registered once (deps don't include `active`) — starting/stopping the loop itself is a separate concern, see the next row. |
| loop start/stop effect | `if (!active) return; startLoop(); return () => stopLoop();` — the loop runs only while this page is the current route. This is what makes navigating away a real pause rather than a reset: a mid-run phase like `playing`/`meeting` ticks its timers inside `update()` every frame, so stopping the loop freezes a run in place, and starting it again on return resumes exactly where it left off. `useGameState.js`'s `active` gate is the equivalent guard for keyboard input (see that file's doc). |
| `START`-dispatch effect | `if (active && getState().phase === 'title') handleAction({type:'START'})` — fires whenever `active` becomes true. Skips the old canvas title notice entirely (its content lives on the invitation/RSVP pages now), taking a first-time arrival straight to `modeSelect`. Guarded by `phase === 'title'` so navigating away and back doesn't reset an in-progress run — `START` unconditionally sets `phase: 'modeSelect'`, so it must not fire again once a run is underway. |
| `handleCanvasClick` | Maps a canvas click to the right `handleAction` for the current phase: `playing` in solo mode → `SHOOT` for `soloRole` (a couple-mode click does nothing — shooting stays on dedicated keys/buttons since both roles share the canvas); `meeting`/`levelComplete` → `NEXT_LEVEL`; `gameComplete`/`lost` → `RESTART`. No `title` branch — by the time the canvas is ever clickable, the `START`-dispatch effect has already skipped past that phase. |
| `handleTouchStart`/`handleTouchMove`/`handleTouchEnd` | Solo-mode drag-to-move. `handleTouchMove` fires on every native `touchmove`, computing the delta since the *previous* touch position (not since touch start) and dispatching `handleAction({ type: 'DRAG_MOVE', role: soloRole, deltaX })` each time — the player tracks the finger continuously and proportionally, rather than a fixed-speed nudge triggered once on touch end. The raw screen-pixel delta is rescaled by `CANVAS_WIDTH / canvas.getBoundingClientRect().width` before dispatching, since the canvas renders at `max-width: 100%; height: auto` and can be smaller on-screen than its internal resolution — the rescale keeps "1:1" tracking the visible sprite, not the raw internal canvas pixels. A short tap (negligible travel) still falls through to the browser's synthesized `click`, which `handleCanvasClick` treats as shoot — real drag distance suppresses that synthetic click on its own, so tap-to-shoot and drag-to-move don't need manual disambiguation. |
| `showControls` | `uiPhase !== 'modeSelect'` — gates `.mobile-controls`/`.solo-controls` below. |
| `.game-frame` | The root element this component returns. A single bordered card (same visual language as `InviteScreen.css`'s `.invite-screen`) wrapping **only** game content — `.canvas-wrapper`, the on-screen `.mobile-controls`/`.solo-controls`, and `.key-legend`, in that order (controls sit right below the board, the legend right below that). `.end-of-level-banner` (below) is a **sibling** of `.game-frame`, not nested in it — the component returns a Fragment containing both. |
| `.canvas-wrapper` | Wraps the `<canvas>` so the `modeSelect` overlay (an absolutely-positioned DOM layer) can sit directly on top of it; see `Game.css`. |
| `<canvas>` element | Sized `CANVAS_WIDTH × GAME_HEIGHT` from `src/constants.js`; also wired with `onTouchStart`/`onTouchEnd` for solo-mode swipe detection, and `touch-action: none` in CSS so the browser doesn't intercept the gesture as a page scroll. Always in the DOM (this component is always mounted) — hidden via the parent's `display: none` while `route !== 'game'`, not by conditionally rendering the canvas itself. |
| `.mode-select-overlay` | Shown only when `uiPhase === 'modeSelect'` — three DOM buttons (Couple / Solo as Bride / Solo as Groom) dispatching `handleAction({ type: 'CHOOSE_MODE', mode, soloRole })`. Canvas-drawn backdrop/heading is `drawModeSelect` in `renderer.js`; the buttons themselves are DOM, not canvas, since they need normal click handling and text reflow. |
| `.mobile-controls` block | Inside `.game-frame`. Couple-mode-only (`showControls && uiMode === 'couple'`) on-screen ammo-select and shoot buttons for touch devices, dispatching `SELECT_AMMO` / `SHOOT` actions per role. |
| `.solo-controls` block | Inside `.game-frame`. Solo-mode-only (`showControls && uiMode === 'solo'`) mobile control surface: a hint line ("Swipe canvas to move · Tap to shoot") and a single "🔄 Switch Ammo" button dispatching `CYCLE_AMMO` for `uiSoloRole` — deliberately simpler than the couple-mode ammo-select row, per the mobile-first goal of solo mode. |
| `.key-legend` | Inside `.game-frame`, right after the mobile/solo controls. On-screen text listing keyboard controls — kept in sync with the real bindings in `useGameState.js` (bride: A/D move · S ammo · W shoot; groom: ←/→ move · ↑/↓ ammo · Space shoot). Switches between the couple two-line legend and a single-role line (with a "(or swipe/tap)" suffix) based on `uiMode`/`uiSoloRole`. The displayed name (default "Bride"/"Groom") comes from `activeConfig.text.names`, same source and same non-ref read pattern as the shoot-button colors below. |
| `.end-of-level-banner` | A sibling **after** `.game-frame` (not inside it — see that row above). Shown when `uiPhase` is `meeting`, `levelComplete`, `gameComplete`, or `lost` (`END_OF_LEVEL_PHASES`, a module-level `Set`) — a plain block, not overlaid on the canvas, holding a "💌 Back to Invite & RSVP" link (`<a className="back-to-invite-btn" href="#/rsvp">` — plain hash nav now, not a callback prop). Appears on every level boundary, not just the final win, since clearing all 5 levels takes several wins and most runs end earlier. |

## Relationships / Cross-links
- Constructs and is the sole caller of `useGameState()` — see [`use-game-state.md`](use-game-state.md).
- Constructs `useAssets()` (`src/useAssets.js`, not a dedicated component file — small/single-purpose).
- Constructs `useCustomization()` (`src/useCustomization.js`) and reads `customizationStore.js`'s
  `getActiveConfig()` directly for the `.key-legend` names (not via the ref, since refs shouldn't be
  read during render) — see `architecture.md`.
- Calls `render()` from `src/renderer.js` — see [`renderer.md`](renderer.md).
- Does **not** render `InviteScreen`, the header/hamburger, or the About modal any more — those are
  `App.jsx`/`PageHeader.jsx`'s job now (see `architecture.md`'s "Routing & pages"). This component
  is page content only.
- Rendered by `App.jsx` alongside every other page, always mounted (see `architecture.md`).
- Imports layout/dimension constants from `src/constants.js` — see [`constants.md`](constants.md).
- Styling lives in `src/Game.css`, imported here. Its `(max-width: 640px) and
  (orientation: portrait)` media query is the CSS-side counterpart of `constants.js`'s
  `IS_MOBILE_PORTRAIT` (same threshold, checked independently since CSS media queries can't read a
  JS module's constant): `.game-container.is-playing` (added by `App.jsx` when `route === 'game'`)
  is pinned to `calc(100dvh - 16px)` (subtracting `.game-wrapper`'s own 8px top+bottom padding,
  which otherwise pushes the layout 16px past the viewport), and `.game-frame` (not
  `.canvas-wrapper` directly, since the frame also holds the on-screen controls/key-legend below
  the board) becomes a `flex: 1 1 0` section filling whatever the header bar and end-of-level
  banner leave over; `.canvas-wrapper` inside it in turn takes `flex: 1 1 auto` to fill whatever
  the frame's own controls/legend leave over — so the canvas, now intrinsically taller/narrower on
  mobile portrait (see `constants.md`), gets as much of that space as possible instead of a short
  landscape-shaped box centered in a mostly-empty tall screen. `flex-basis: 0` (not `auto`) on
  `.game-frame` matters here: with `auto`, the browser sizes this flex item from its content's
  preferred height before shrinking, which under-shrinks it and pushes couple mode's taller two-row
  `.mobile-controls` bar off the bottom of the screen. The same query also shrinks `.game-banner`'s
  `max-height` from 90px to 44px, and `.title-link`'s padding/font-size, since on a phone that
  vertical space is much better spent on the canvas. Other routes' `.game-container` (no
  `.is-playing`) is left unscoped by that query — normal scrollable content, no forced
  viewport-height pinning.
- Manual verification of this component's wiring is covered by [`testing.md`](testing.md) and [`write-test.md`](../skills/write-test.md).
