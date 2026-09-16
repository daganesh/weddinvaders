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
`customizationStore.js` (`getConfig()` / `DEFAULT_CONFIG`) — images, a small color palette, and a
fixed set of wedding-text fields, backed by localStorage today (single active config, no
multi-tenant keying yet) behind an interface designed to be swapped for a real API/DB later
without touching call sites. `AdminScreen.jsx` is the only writer (`saveConfig()`/`resetToDefaults()`).
Before an uploaded file reaches that config, `AdminScreen.jsx` runs it through
`imageProcessing.js`'s `fileToProcessedPngDataUrl()`, which re-encodes it as PNG and fades
near-white pixels to transparent (a simple threshold chroma-key, not true background removal —
can also fade genuinely white parts of the subject).

## Key Design Decisions
- **`useRef` for game state**, not `useState` — the loop runs at 60 fps; React re-renders would be too slow.
- **`setState(updater)` pattern** — always pass a function so the closure reads the latest state.
- **`renderer.js` is pure** — takes `(ctx, state, assets, config)`, returns nothing, has no side-effects. `config` defaults to `DEFAULT_CONFIG` when omitted (no `localStorage` access inside `renderer.js` itself).
- **Canvas dimensions**: `CANVAS_WIDTH = 910` (800 play area + 110 panel), `GAME_HEIGHT = 600` (540 play + 60 HUD).

## Entry Point
`src/main.jsx` → `<App />` → `<Game />` — the canvas is the only meaningful DOM node.

## Component Files
| File | Covers |
|------|--------|
| [`knowledge/use-game-state.md`](use-game-state.md) | `useGameState()` hook in `src/useGameState.js` — core game logic, input, update loop |
| [`knowledge/renderer.md`](renderer.md) | `render()` and draw functions in `src/renderer.js` — all canvas drawing |
| [`knowledge/game-jsx.md`](game-jsx.md) | `Game` component in `src/Game.jsx` — React shell wiring hooks + canvas + controls |
| [`knowledge/constants.md`](constants.md) | `src/constants.js` — shared dimensions, timing, `WEDDING_ITEMS`, `AMMO_META` schema |
