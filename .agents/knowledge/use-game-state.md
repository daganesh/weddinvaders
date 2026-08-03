# Component: `useGameState()`

## Location
`src/useGameState.js:112` — exported hook `useGameState()`. 477 lines total; the largest logic module in the repo.

## Purpose
The core game-logic engine. Owns all mutable game state, keyboard input, the 60fps update loop
(movement, spawning, collisions, win/lose checks), and phase transitions (`title` → `playing` →
`meeting`/`levelComplete` → …). It's the single node in the [`architecture.md`](architecture.md)
data flow that turns raw input into the next frame's state; `renderer.md` only reads what this
produces.

## Construction
Called once per mount from `Game.jsx` (see [`game-jsx.md`](game-jsx.md)):
```js
const { getState, startLoop, stopLoop, setRenderCallback, handleAction } = useGameState();
```
Internally, state lives in `stateRef` (a `useRef`, not `useState` — see architecture.md's "Key
Design Decisions") seeded by `getInitialState(levelIndex = 0)` (`useGameState.js:85`).

## Key Surface
| Export / function | Line | Purpose |
|---|---|---|
| `getInitialState(levelIndex)` | 85 | Builds a fresh state object for a given level (money, ammo, players, timers). Authoritative shape — a field missing here becomes `undefined` after a level restart. |
| `useGameState()` | 112 | The hook itself; returns `{ getState, startLoop, stopLoop, setRenderCallback, handleAction }`. |
| `onKey(e)` (internal, in the hook's keyboard effect) | 128 | Routes `keydown`/`keyup`. Non-`playing` phases (title/meeting/levelComplete/gameComplete/lost) advance on any key; while `playing`, dispatches shoot/cycle-ammo. |
| `shoot(role)` | 214 | Validates ammo/money, deducts cost, spawns a bullet. Called for both keyboard shortcuts and `handleAction({type:'SHOOT'})`. |
| `update()` | 245 | Runs every animation frame: row advance, player movement (`moveX`), bullet travel, item spawn/movement, escaped-item life loss, **bullet↔item collision** (inline, not a separate function), win/lose phase transition. |
| `loop()` / `startLoop()` / `stopLoop()` | 425–438 | `requestAnimationFrame` driver; calls `update()` then the render callback registered via `setRenderCallback`. |
| `handleAction(action)` | 442 | Dispatch table for UI-originated actions: `START`, `RESTART`, `NEXT_LEVEL`, `SHOOT`, `SELECT_AMMO` — used by `Game.jsx`'s click handler and on-screen mobile buttons. |
| `spawnItem(groomRow, brideRow, level, acquiredItems)` (internal) | 36 | Builds one flying item from the level's spawn pool; randomizes `incomeAmount` for guest/family items. |

### Controls (verified against `onKey`/`moveX`, `useGameState.js:186–191,296–297`)
- **Bride**: `KeyA`/`KeyD` move, `KeyW` shoot, `KeyS` cycle ammo.
- **Groom**: `ArrowLeft`/`ArrowRight` move, `ArrowUp`/`ArrowDown` cycle ammo, `Space`/`Enter` shoot.
- These are the reverse of what an earlier version of `game-design.md`/`testing.md` claimed — fixed as part of this pass; re-verify here (not from memory) if they're ever in question again.

## Relationships / Cross-links
- Consumes constants and item/ammo schema from `src/constants.js` — see [`constants.md`](constants.md).
- Consumes `LEVELS`, `getSpawnPool()`, `isLevelComplete()` from `src/levels.js` (documented inline in [`game-design.md`](game-design.md), not split into its own component file).
- Constructed by and handed to `Game.jsx` — see [`game-jsx.md`](game-jsx.md).
- Its output state is the sole input to `render()` in `src/renderer.js` — see [`renderer.md`](renderer.md).
- Exercised by the manual checklist in [`testing.md`](testing.md) and the [`bug-fix.md`](../skills/bug-fix.md) / [`new-feature.md`](../skills/new-feature.md) skills.
