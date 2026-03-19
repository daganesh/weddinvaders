# Dev Environment

## Prerequisites
- **Node.js** ≥ 18 (ESM project — `"type": "module"` in `package.json`)
- **npm** (comes with Node)

## Install
```bash
npm install
```

## Run / Build / Lint
```bash
npm run dev      # Vite dev server at http://localhost:5173 (HMR enabled)
npm run build    # Production build → dist/
npm run preview  # Serve production build locally
npm run lint     # ESLint 9 (flat config in eslint.config.js)
```

## Key Dependencies
| Package | Version | Role |
|---------|---------|------|
| react / react-dom | ^19.2 | UI shell only (canvas renders the game) |
| vite | ^7.3 | Dev server + bundler |
| @vitejs/plugin-react | ^5.1 | JSX transform |
| eslint + plugins | ^9.39 | Linting (react-hooks, react-refresh) |

## Vite Config
`vite.config.js` — minimal: only `@vitejs/plugin-react` plugin. No custom aliases or env vars required.

## Static Assets
PNG images (`bride-nobg.png`, `groom-nobg.png`, `couple-nobg.png`) live in `src/assets/` and are imported via `useAssets.js`. Vite handles asset hashing automatically.

## No environment variables required.

## Gotchas
- The game loop runs at ~60 fps via `requestAnimationFrame` — **never** add `console.log` inside the game loop (it tanks performance).
- `CANVAS_WIDTH = 910` (800 play + 110 panel) — ensure the canvas element uses `CANVAS_WIDTH`, not `GAME_WIDTH`.
- All game constants are in `src/constants.js` — do not hardcode magic numbers elsewhere.
- ESLint enforces React Hooks rules — all custom hooks must start with `use`.
