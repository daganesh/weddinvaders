# Architecture

## Stack
- **React 19** (JSX, hooks only — no class components)
- **Vite 7** (dev server + build)
- **HTML Canvas** for all game rendering — no DOM elements for game objects

## Directory Layout
```
src/
├── main.jsx          # React root mount
├── App.jsx           # Thin wrapper, renders <Game />
├── Game.jsx          # React shell: canvas element, keyboard/touch controls, game loop lifecycle
├── Game.css          # Layout styles (wrapper, mobile controls, key legend)
├── index.css         # Global reset
├── constants.js      # All magic numbers + WEDDING_ITEMS + AMMO_META
├── levels.js         # LEVELS array, getSpawnPool(), isLevelComplete()
├── useGameState.js   # Core game logic hook (update loop, input, collision)
├── renderer.js       # Pure canvas drawing — render(ctx, state, assets, config)
├── pixelArt.js       # 8×8 pixel-sprite definitions + drawPixelSprite() — currently UNUSED (not imported anywhere)
├── useAssets.js      # Preloads bride/groom/couple PNG images, preferring a customization override per role
├── customizationStore.js  # localStorage-backed customization config (images/colors/text) + DEFAULT_CONFIG — the only module that touches localStorage
├── useCustomization.js    # Ref-based hook wrapping customizationStore.getConfig()
├── imageProcessing.js     # fileToProcessedPngDataUrl() — canvas-based upload processing: re-encodes to PNG, fades near-white pixels to transparent
├── AdminScreen.jsx   # Admin UI (reached via #/admin hash route) for editing the customization config
├── AdminScreen.css
└── assets/
    ├── bride-nobg.png
    ├── groom-nobg.png
    └── couple-nobg.png
```

`App.jsx` is no longer a pure passthrough: it does a minimal hash-based route check
(`window.location.hash === '#/admin'`) and renders `<AdminScreen>` or `<Game>` accordingly —
no router dependency, since this is currently the only extra screen.

## Data Flow
```
Game.jsx                          → knowledge/game-jsx.md
  ├── useGameState()  →  stateRef (never React state — avoids re-renders)
  │                                → knowledge/use-game-state.md
  ├── useAssets()     →  assetsRef
  └── requestAnimationFrame loop:
        update(stateRef)   ← pure mutation via setState(updater)
        render(ctx, state, assets)
                                   → knowledge/renderer.md
```
Both `useGameState.js` and `renderer.js` read shared data/config from
`constants.js` (dimensions, timing, `WEDDING_ITEMS`, `AMMO_META`) and
`levels.js` (`LEVELS`, `getSpawnPool()`, `isLevelComplete()`) — see
[`knowledge/constants.md`](constants.md).

`useAssets.js` and `renderer.js` additionally read the customization config from
`customizationStore.js` (`getActiveConfig()` / `DEFAULT_CONFIG`) — images, a small color palette,
and a fixed set of wedding-text fields, backed by localStorage today behind an interface designed
to be swapped for a real API/DB later without touching call sites. `AdminScreen.jsx` is the only
writer. Before an uploaded file reaches that config, `AdminScreen.jsx` runs it through
`imageProcessing.js`'s `fileToProcessedPngDataUrl()`, which downscales it (longest edge capped at
`MAX_DIMENSION = 480`px — plenty for the largest in-game use, the ~320px-wide couple portrait; a
raw phone photo can be 3000px+ and several MB once re-encoded losslessly as PNG otherwise), then
re-encodes it as PNG and fades near-white pixels to transparent (a simple threshold chroma-key, not
true background removal — can also fade genuinely white parts of the subject). `writeStore()`
catches a `QuotaExceededError` from `localStorage.setItem` and rethrows a clear, user-facing message
instead — copying a package with real (pre-downscale-fix) large images into another package could
roughly double storage usage and exceed the browser's quota with no visible feedback (see
`AdminScreen.jsx`'s modal error handling below).

### Packages

The store holds multiple named **packages** (each a full images/colors/text config), not just one
— the multi-tenant precursor for the white-label goal (one package per couple/wedding, eventually).
There is always a code-defined `default` package (id `DEFAULT_PACKAGE_ID`, never persisted to
localStorage, always freshly derived from `DEFAULT_CONFIG`) which is **read-only** — it can't be
edited or deleted, only used as a starting point (`createPackage()` seeds a new package from it) or
selected as active. Exactly one package is the **active** one at a time (`activePackageId`,
persisted); that's the only one `getActiveConfig()` resolves and the only one the running game
ever renders. Editing a package via `AdminScreen.jsx` does **not** implicitly activate it — "Save"
and "Set active" are deliberately separate actions, so an admin can author a package without
disturbing whatever is currently live. Full API: `listPackages()`, `getPackage(id)`,
`getActivePackageId()`, `setActivePackage(id)`, `createPackage(name, copyFromId = DEFAULT_PACKAGE_ID)`,
`updatePackage(id, content)`, `renamePackage(id, name)`, `deletePackage(id)` (all in
`customizationStore.js`, all throwing on `DEFAULT_PACKAGE_ID` misuse or a duplicate —
case-insensitive — package name). `AdminScreen.jsx`'s "+" button next to the Packages heading opens
a small modal (name + a "copy from" dropdown of every existing package) rather than always copying
`default`. Deleting the active package falls back to `default`.

**Modal error visibility gotcha**: `.admin-modal-overlay` has `z-index: 30`, which sits above the
page's bottom `.admin-actions` bar — so an error raised by an action taken *inside* an open modal
(e.g. `createPackage()` throwing) must never be shown via the page-level `flashStatus()`/`status`
state, since that renders into `.admin-actions` and would be invisible behind the modal. Show it
with modal-local state instead (see the new-package modal's `modalError`) and keep the modal open
on failure so the user can see the message and retry.

## Key Design Decisions
- **`useRef` for game state**, not `useState` — the loop runs at 60 fps; React re-renders would be too slow.
- **`setState(updater)` pattern** — always pass a function so the closure reads the latest state.
- **`renderer.js` is pure** — takes `(ctx, state, assets, config)`, returns nothing, has no side-effects. `config` defaults to `DEFAULT_CONFIG` when omitted (no `localStorage` access inside `renderer.js` itself).
- **Canvas dimensions**: `CANVAS_WIDTH = 910` (800 play area + 110 panel), `GAME_HEIGHT = 600` (540 play + 60 HUD).
- **No light theme, anywhere** — the game is dark-only by design (`Game.css` hardcodes a dark body
  background unconditionally). `index.css` no longer has a `@media (prefers-color-scheme: light)`
  override (removed — it was unused Vite-template boilerplate that flipped button backgrounds to
  near-white without ever setting a matching text color, producing unreadable white-on-white
  buttons whenever the browser/OS preferred light mode). Any plain `<button>` added anywhere in the
  app should still set its own explicit `background`/`color` rather than relying on `index.css`'s
  base button style, since `AdminScreen.css` does exactly that as a defensive rule
  (`.admin-screen button`).

## Entry Point
`src/main.jsx` → `<App />` → `<Game />` — the canvas is the only meaningful DOM node.

## Component Files
| File | Covers |
|------|--------|
| [`knowledge/use-game-state.md`](use-game-state.md) | `useGameState()` hook in `src/useGameState.js` — core game logic, input, update loop |
| [`knowledge/renderer.md`](renderer.md) | `render()` and draw functions in `src/renderer.js` — all canvas drawing |
| [`knowledge/game-jsx.md`](game-jsx.md) | `Game` component in `src/Game.jsx` — React shell wiring hooks + canvas + controls |
| [`knowledge/constants.md`](constants.md) | `src/constants.js` — shared dimensions, timing, `WEDDING_ITEMS`, `AMMO_META` schema |
