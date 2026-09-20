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
| `useGameState(!showInvite)` call | 16 | Destructures `{ getState, startLoop, stopLoop, setRenderCallback, handleAction }` — see [`use-game-state.md`](use-game-state.md). `!showInvite` is the `active` gate covered below. |
| `showInvite` state | ~19 | `true` by default — Phase 1 (`InviteScreen.jsx`) is the default view; the canvas isn't mounted at all while this is true. Set false by `handleStartPlaying`, true again by `handleBackToInvite`. See "Invitation screen / game phases" below. |
| `.game-wrapper` inline style | in JSX | Sets three CSS custom properties from `activeConfig.colors` — `--wv-bride-color`, `--wv-groom-color`, `--wv-accent-color` — read by `Game.css`'s `.bride-shoot`/`.groom-shoot` mobile shoot-button gradients and by `InviteScreen.css`'s couple-names/date/CTA-button accents, so both screens match whatever palette the active package sets instead of a hardcoded gold. |
| `uiPhase`/`uiMode`/`uiSoloRole` state | 21–24 | Lightweight React-state mirrors of `state.phase`/`state.mode`/`state.soloRole`, updated only inside the render callback when `state.phase` actually changes (tracked via `prevPhaseRef`) — not every frame. Game state itself stays ref-based for 60fps perf (see `architecture.md`'s "Key Design Decisions"), but the DOM layer needs to reactively show/hide the mode-select overlay and swap between couple/solo on-screen controls, which plain refs can't drive. |
| render-callback effect | ~35–48 | Registers a callback that calls `render(ctx, state, assets, config)` (see [`renderer.md`](renderer.md)) every frame and updates the `uiPhase`/`uiMode`/`uiSoloRole` mirrors on phase change. Registered once (deps don't include `showInvite`) — starting/stopping the loop itself is a separate concern, see the next row. |
| loop start/stop effect | ~53–61 | `if (showInvite) return; startLoop(); return () => stopLoop();` — the loop runs only while Phase 2 (the game view) is showing. This is what makes "Back to Invite" a real pause rather than a reset: a mid-run phase like `playing`/`meeting` ticks its timers inside `update()` every frame, so stopping the loop freezes a run in place, and starting it again on return resumes exactly where it left off. `useGameState.js`'s `active` gate is the equivalent guard for keyboard input (see that file's doc). |
| `handleStartPlaying` | ~63–70 | `InviteScreen`'s `onStartPlaying` callback. Dispatches `handleAction({type:'START'})` **only if** `getState().phase === 'title'` (i.e. the very first time — the ref mutation is synchronous, so it lands before the canvas ever renders a frame, skipping the canvas `title` phase entirely) before setting `showInvite` false. The guard matters because `START` unconditionally sets `phase: 'modeSelect'` — calling it again on a later "Start Playing" (after a mid-run "Back to Invite") would silently reset an in-progress run. |
| `handleBackToInvite` | ~72 | `() => setShowInvite(true)` — used by both `.banner-link` (the clickable banner, Phase 2 only) and `.end-of-level-banner`'s button. |
| `menuOpen` / `showAbout` state | in JSX | Local UI state for the hamburger dropdown and the About modal it opens — plain `useState`, no ref/game-state involvement. |
| `.game-header-bar` | in JSX | The **only** thing rendered above the invite card / game frame, on both phases: the banner and the hamburger menu, side by side. No separate toolbar row, no persistent "Back to Invite" bar — see `.banner-link` and `.game-menu-anchor` below. |
| `.game-banner` / `.banner-link` | in JSX | The banner `<img>` — `activeConfig.images.banner || <bundled banner-default.svg>` (mirrors the null-falls-back-to-bundled-asset pattern portraits use, see `architecture.md`). Unlike every other customizable image, it's plain DOM, not canvas-drawn or preloaded via `useAssets.js`. On the invitation screen it's a plain non-interactive `<img>` (already where it would link to); once Phase 2 (`!showInvite`) is showing, it's wrapped in a `<button className="banner-link">` calling `handleBackToInvite` — the banner **is** the "back to invite" control now, there's no separate nav bar above the frame (a second, equivalent control still exists below on every level boundary — see `.end-of-level-banner`). |
| `.game-menu-anchor` / `.hamburger-btn` / `.game-menu-dropdown` | in JSX | A "☰" button toggling `menuOpen`; when open, a `.game-menu-backdrop` (full-viewport, click-to-close — same pattern as `AdminScreen.css`'s `.admin-modal-overlay`) sits behind a small dropdown with two items: "⚙ Admin" (navigates `window.location.hash = '#/admin'`, replacing the old standalone gear button) and "ℹ️ About" (sets `showAbout` true). Rendered on both phases, top-right, next to the banner — the only settings entry point now; there's no separate `.game-toolbar` row any more. |
| About modal | in JSX (outside the `showInvite ? … : …` split, so it can open on either phase) | `.about-modal-overlay`/`.about-modal`, shown when `showAbout` is true. Always shows a fixed "Made with 🎮 Weddin'Vaders" line; additionally shows an organizer credit line when `activeConfig.text.organizerName` or `.organizerUrl` is non-empty — a link (via `linkUtils.js`'s `withProtocol()`) if a url is set, otherwise plain text. This is the PR/marketing hook for the wedding-arranging company or venue running the game as a white-label product (see `architecture.md`'s "Opening-page links" sibling section and `customizationStore.js`). Both fields default to `''`, so a plain package shows no organizer line at all. |
| `<InviteScreen>` | in JSX | Rendered when `showInvite` is true, in place of everything below — see [`invite-screen.md`](invite-screen.md). Receives `config={activeConfig}` and `onStartPlaying={handleStartPlaying}`. |
| `.game-container.is-playing` | in JSX | `` `game-container${showInvite ? '' : ' is-playing'}` `` — the modifier class scopes `Game.css`'s mobile-portrait "pin to viewport height" rule to Phase 2 only (see Cross-links below), so the invitation screen (normal scrollable content) isn't forced into a fixed-height box with empty space below a short card. |
| `handleCanvasClick` | in JSX | Maps a canvas click to the right `handleAction` for the current phase: `playing` in solo mode → `SHOOT` for `soloRole` (a couple-mode click does nothing — shooting stays on dedicated keys/buttons since both roles share the canvas); `meeting`/`levelComplete` → `NEXT_LEVEL`; `gameComplete`/`lost` → `RESTART`. No `title` branch any more — by the time the canvas is ever clickable, `handleStartPlaying` has already skipped past that phase. |
| `handleTouchStart`/`handleTouchMove`/`handleTouchEnd` | in JSX | Solo-mode drag-to-move. `handleTouchMove` fires on every native `touchmove`, computing the delta since the *previous* touch position (not since touch start) and dispatching `handleAction({ type: 'DRAG_MOVE', role: soloRole, deltaX })` each time — the player tracks the finger continuously and proportionally, rather than a fixed-speed nudge triggered once on touch end. The raw screen-pixel delta is rescaled by `CANVAS_WIDTH / canvas.getBoundingClientRect().width` before dispatching, since the canvas renders at `max-width: 100%; height: auto` and can be smaller on-screen than its internal resolution — the rescale keeps "1:1" tracking the visible sprite, not the raw internal canvas pixels. A short tap (negligible travel) still falls through to the browser's synthesized `click`, which `handleCanvasClick` treats as shoot — real drag distance suppresses that synthetic click on its own, so tap-to-shoot and drag-to-move don't need manual disambiguation. |
| `showControls` | in JSX | `uiPhase !== 'modeSelect'` — gates `.mobile-controls`/`.solo-controls` below. No `'title'` exclusion any more (there's no title phase left to exclude, see `handleStartPlaying` above). |
| `.game-frame` | in JSX | Phase 2 only. A single bordered card (same visual language as `InviteScreen.css`'s `.invite-screen`) wrapping **only** game content — `.canvas-wrapper`, the on-screen `.mobile-controls`/`.solo-controls`, and `.key-legend`, in that order (controls sit right below the board, the legend right below that). Nothing else (no links, no back-to-invite nav) lives inside it — those are siblings above (`.game-header-bar`) or below (`.end-of-level-banner`) the frame. |
| `.canvas-wrapper` | in JSX | Wraps the `<canvas>` so the `modeSelect` overlay (an absolutely-positioned DOM layer) can sit directly on top of it; see `Game.css`. |
| `<canvas>` element | in JSX | Sized `CANVAS_WIDTH × GAME_HEIGHT` from `src/constants.js`; also wired with `onTouchStart`/`onTouchEnd` for solo-mode swipe detection, and `touch-action: none` in CSS so the browser doesn't intercept the gesture as a page scroll. Only mounted while `!showInvite`. |
| `.mode-select-overlay` | in JSX | Shown only when `uiPhase === 'modeSelect'` — three DOM buttons (Couple / Solo as Bride / Solo as Groom) dispatching `handleAction({ type: 'CHOOSE_MODE', mode, soloRole })`. Canvas-drawn backdrop/heading is `drawModeSelect` in `renderer.js`; the buttons themselves are DOM, not canvas, since they need normal click handling and text reflow. |
| `.mobile-controls` block | in JSX | Inside `.game-frame`. Couple-mode-only (`showControls && uiMode === 'couple'`) on-screen ammo-select and shoot buttons for touch devices, dispatching `SELECT_AMMO` / `SHOOT` actions per role. |
| `.solo-controls` block | in JSX | Inside `.game-frame`. Solo-mode-only (`showControls && uiMode === 'solo'`) mobile control surface: a hint line ("Swipe canvas to move · Tap to shoot") and a single "🔄 Switch Ammo" button dispatching `CYCLE_AMMO` for `uiSoloRole` — deliberately simpler than the couple-mode ammo-select row, per the mobile-first goal of solo mode. |
| `.key-legend` | in JSX | Inside `.game-frame`, right after the mobile/solo controls. On-screen text listing keyboard controls — kept in sync with the real bindings in `useGameState.js` (bride: A/D move · S ammo · W shoot; groom: ←/→ move · ↑/↓ ammo · Space shoot). Switches between the couple two-line legend and a single-role line (with a "(or swipe/tap)" suffix) based on `uiMode`/`uiSoloRole`. The displayed name (default "Bride"/"Groom") comes from `activeConfig.text.names`, same source and same non-ref read pattern as the shoot-button colors below. |
| `.end-of-level-banner` | in JSX | Phase 2 only, a sibling **after** `.game-frame` (not inside it). Shown when `uiPhase` is `meeting`, `levelComplete`, `gameComplete`, or `lost` (`END_OF_LEVEL_PHASES`, a module-level `Set`) — a plain block, not overlaid on the canvas, holding a "💌 Back to Invite & RSVP" button (`.back-to-invite-btn`, the same class the banner-link's styling doesn't use — this one's a real button, not an image wrapper). Appears on every level boundary, not just the final win, since clearing all 5 levels takes several wins and most runs end earlier. |
| `<LinksRow>` | — | No longer used by `Game.jsx` itself — the post-game links footer was removed (that information now lives only on `InviteScreen.jsx`, which still renders it via the shared `src/LinksRow.jsx`/`linkUtils.js`). Kept as a shared component since `InviteScreen.jsx` needs it; see [`invite-screen.md`](invite-screen.md) and `architecture.md`'s "Opening-page links". |

## Relationships / Cross-links
- Constructs and is the sole caller of `useGameState()` — see [`use-game-state.md`](use-game-state.md).
- Constructs `useAssets()` (`src/useAssets.js`, not a dedicated component file — small/single-purpose).
- Constructs `useCustomization()` (`src/useCustomization.js`) and reads `customizationStore.js`'s
  `getActiveConfig()` directly for the DOM shoot-button colors and the `.key-legend` names (not via
  the ref, since refs shouldn't be read during render) — see `architecture.md`.
- Calls `render()` from `src/renderer.js` — see [`renderer.md`](renderer.md).
- Renders `InviteScreen` (`src/InviteScreen.jsx`) for Phase 1 — see [`invite-screen.md`](invite-screen.md).
- Imports `withProtocol()` from `src/linkUtils.js` for the About modal's organizer link. Does
  **not** import `LinksRow` itself any more — that's `InviteScreen.jsx`'s alone now (see above).
- Rendered by `App.jsx` alongside `AdminScreen.jsx` behind a `#/admin` hash-route check (`App.jsx`
  is no longer a pure passthrough) — see `architecture.md`.
- Imports layout/dimension constants from `src/constants.js` — see [`constants.md`](constants.md).
- Styling lives in `src/Game.css`, imported here. Its `(max-width: 640px) and
  (orientation: portrait)` media query is the CSS-side counterpart of `constants.js`'s
  `IS_MOBILE_PORTRAIT` (same threshold, checked independently since CSS media queries can't read a
  JS module's constant): `.game-container.is-playing` (Phase 2 only — see the Key Surface row above)
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
  vertical space is much better spent on the canvas. Plain `.game-container` (Phase 1, the
  invitation screen) is left unscoped by that query — normal scrollable content, no forced
  viewport-height pinning.
- Manual verification of this component's wiring is covered by [`testing.md`](testing.md) and [`write-test.md`](../skills/write-test.md).
