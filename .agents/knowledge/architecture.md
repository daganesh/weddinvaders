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
├── customizationStore.js  # localStorage-backed customization config (images/colors/text) + DEFAULT_CONFIG + EIGHTIES_CONFIG — the only module that touches localStorage
├── useCustomization.js    # Ref-based hook wrapping customizationStore.getConfig()
├── imageProcessing.js     # fileToImageDataUrl() — SVG uploads pass through as-is; fileToProcessedPngDataUrl() downscales + re-encodes raster uploads to PNG, fades near-white pixels to transparent
├── AdminScreen.jsx   # Admin UI (reached via #/admin hash route) for editing the customization config
├── AdminScreen.css
└── assets/
    ├── bride-nobg.png
    ├── groom-nobg.png
    ├── couple-nobg.png
    ├── banner-default.svg  # bundled fallback for the header banner (Default package)
    ├── banner-80s.svg       # 80s Arcade package's pixel-art header banner
    └── icons/         # 12 hand-built 16×16 pixel-art SVGs (one per WEDDING_ITEMS id), the 80s Arcade system package's item images
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
  ├── uiPhase/uiMode/uiSoloRole  ←  lightweight React-state mirrors, updated
  │                                 only on phase change (drive mode-select
  │                                 overlay + couple/solo control swap)
  └── requestAnimationFrame loop:
        update(stateRef)   ← pure mutation via setState(updater)
        render(ctx, state, assets, config)
                                   → knowledge/renderer.md
```
Both `useGameState.js` and `renderer.js` read shared data/config from
`constants.js` (dimensions, timing, `WEDDING_ITEMS`, `AMMO_META`) and
`levels.js` (`LEVELS`, `getSpawnPool()`, `isLevelComplete()`) — see
[`knowledge/constants.md`](constants.md).

`useAssets.js` and `renderer.js` additionally read the customization config from
`customizationStore.js` (`getActiveConfig()` / `DEFAULT_CONFIG`) — images, a small color palette,
and a fixed set of wedding-text fields, backed by localStorage today behind an interface designed
to be swapped for a real API/DB later without touching call sites. `images` holds `bride`/`groom`/
`couple` portrait slots, a `banner` slot, plus one slot per `WEDDING_ITEMS` id (e.g. `rings`, `cake`)
— an item slot left `null` falls back to that item's emoji in `renderer.js`, exactly like a null
portrait slot falls back to the bundled PNG. `banner` is the odd one out: unlike every other image
slot, it's never drawn on the canvas or preloaded through `useAssets.js` — it's a plain DOM
`<img className="game-banner">` rendered directly by `Game.jsx` above the toolbar (`activeConfig.
images.banner || <bundled banner-default.svg>`), since it's a page header, not a game sprite. See
`game-jsx.md`. `AdminScreen.jsx` is the only writer. Before an uploaded file reaches
that config, `AdminScreen.jsx` runs it through `imageProcessing.js`'s `fileToImageDataUrl()`: an SVG
upload passes through untouched (already vector, already transparent where needed, no pixel
dimension to downscale); anything else goes through `fileToProcessedPngDataUrl()`, which downscales
it (longest edge capped at `MAX_DIMENSION = 480`px — plenty for the largest in-game use, the
~320px-wide couple portrait; a raw phone photo can be 3000px+ and several MB once re-encoded
losslessly as PNG otherwise), then re-encodes it as PNG and fades near-white pixels to transparent
(a simple threshold chroma-key, not true background removal — can also fade genuinely white parts
of the subject). `writeStore()` catches a `QuotaExceededError` from `localStorage.setItem` and
rethrows a clear, user-facing message instead — copying a package with real (pre-downscale-fix)
large images into another package could roughly double storage usage and exceed the browser's quota
with no visible feedback (see `AdminScreen.jsx`'s modal error handling below).

### Packages

The store holds multiple named **packages** (each a full images/colors/text config), not just one
— the multi-tenant precursor for the white-label goal (one package per couple/wedding, eventually).
There are always two code-defined **system packages**, never persisted to localStorage, always
freshly derived from their source config: `default` (id `DEFAULT_PACKAGE_ID`, from `DEFAULT_CONFIG`
— today's emoji items, original color palette, `images.banner: null` → falls back to the bundled
`banner-default.svg`) and `80s` (id `EIGHTIES_PACKAGE_ID`, from `EIGHTIES_CONFIG` — every item's
emoji replaced by one of the pixel-art SVGs in `assets/icons/`, `images.banner` explicitly set to
the pixel-art `banner-80s.svg`, plus a matching dark/neon retro color palette; portraits are left
unset, same bundled photos as `default`). Both are **read-only** — `isDefault: true` on the package object — can't be edited,
renamed, or deleted, only selected as active or used as a "copy from" source for a new package.
Exactly one package is the **active** one at a time (`activePackageId`, persisted); that's the only
one `getActiveConfig()` resolves and the only one the running game ever renders. Editing a package
via `AdminScreen.jsx` does **not** implicitly activate it — "Save" and "Set active" are deliberately
separate actions, so an admin can author a package without disturbing whatever is currently live.
Full API: `listPackages()`, `getPackage(id)`, `getActivePackageId()`, `setActivePackage(id)`,
`createPackage(name, copyFromId = DEFAULT_PACKAGE_ID)`, `updatePackage(id, content)`,
`renamePackage(id, name)`, `deletePackage(id)` (all in `customizationStore.js`, all throwing on a
system-package id misuse or a duplicate — case-insensitive — package name). `AdminScreen.jsx`'s "+"
button next to the Packages heading opens a small modal (name + a "copy from" dropdown of every
existing package, system or custom) rather than always copying `default`; package chips show a
"system" tag for `default`/`80s`. Deleting the active package falls back to `default`.

**Modal error visibility gotcha**: `.admin-modal-overlay` has `z-index: 30`, which sits above the
page's bottom `.admin-actions` bar — so an error raised by an action taken *inside* an open modal
(e.g. `createPackage()` throwing) must never be shown via the page-level `flashStatus()`/`status`
state, since that renders into `.admin-actions` and would be invisible behind the modal. Show it
with modal-local state instead (see the new-package modal's `modalError`) and keep the modal open
on failure so the user can see the message and retry.

### Game Modes

Two modes, chosen at a `modeSelect` phase reached from the title screen: **Couple** (both roles
controllable, the original/default game) and **Solo** (one human-picked role — bride or groom —
controllable; the other is a parked, occasionally-blinking placeholder, aimed at mobile players who
want simpler one-thumb controls: swipe to move, tap to shoot, one button to cycle ammo). Rather than
hardcoding "groom starts top-right, bride starts bottom-left" throughout the row-advance/meeting/
spawn math, `getInitialState()` (`useGameState.js`) computes `topRole`/`bottomRole` once per level —
swapped when playing solo as groom, so the human always starts at the bottom regardless of which
character they picked — and every place that used to key off `players.bride`/`players.groom`
positionally reads `players[topRole]`/`players[bottomRole]` instead. See `use-game-state.md`'s "Solo
mode" section for the full rationale and `renderer.md`'s `drawPlayer` (`isTop`/`waiting` params) for
the rendering-side equivalent. `game-jsx.md` covers the DOM side: the `modeSelect` overlay and the
solo-only mobile control surface.

## Key Design Decisions
- **`useRef` for game state**, not `useState` — the loop runs at 60 fps; React re-renders would be too slow.
- **`setState(updater)` pattern** — always pass a function so the closure reads the latest state.
- **`renderer.js` is pure** — takes `(ctx, state, assets, config)`, returns nothing, has no side-effects. `config` defaults to `DEFAULT_CONFIG` when omitted (no `localStorage` access inside `renderer.js` itself).
- **Canvas dimensions are responsive, chosen once at load**: desktop is `CANVAS_WIDTH = 910` (800
  play area + 110 panel), `GAME_HEIGHT = 600` (540 play + 60 HUD); a narrow/portrait viewport
  (`constants.js`'s `IS_MOBILE_PORTRAIT`) instead gets `CANVAS_WIDTH = 552` (460 + 92),
  `GAME_HEIGHT = 780` (720 + 60) — taller and narrower, so a phone held vertically fills far more of
  its own screen instead of letterboxing the desktop-shaped board. See `constants.md` and
  `game-jsx.md` (`Game.css`'s matching media query) for the full mobile-portrait layout story.
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
