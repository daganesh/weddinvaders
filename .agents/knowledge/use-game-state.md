# Component: `useGameState()`

## Location
`src/useGameState.js:156` — exported hook `useGameState()`. ~600 lines total; the largest logic module in the repo.

## Purpose
The core game-logic engine. Owns all mutable game state, keyboard input, the 60fps update loop
(movement, spawning, collisions, win/lose checks), and phase transitions (`title` → `playing` →
`meeting`/`levelComplete` → …). It's the single node in the [`architecture.md`](architecture.md)
data flow that turns raw input into the next frame's state; `renderer.md` only reads what this
produces.

## Construction
Called once per mount from `Game.jsx` (see [`game-jsx.md`](game-jsx.md)):
```js
const { getState, startLoop, stopLoop, setRenderCallback, handleAction } = useGameState(active);
```
`active` (default `true`) gates the keyboard-input effect — `Game.jsx` passes the `active` prop it
receives from `App.jsx` (true only while the `#/game` route is showing). Without this, the keydown
listener (which is always mounted at the `window` level, independent of whether the canvas is
visible) could silently advance a paused `meeting`/`levelComplete` screen or reset a finished game
from a stray keypress while the player is on another page — see `game-jsx.md`'s pause/resume, which
stops/starts the render loop for the equivalent per-frame case.

Internally, state lives in `stateRef` (a `useRef`, not `useState` — see architecture.md's "Key
Design Decisions") seeded by
`getInitialState(levelIndex = 0, mode = 'couple', soloRole = null, carryOverMoney)`
(`useGameState.js:114`) — see "Money persists across levels" below for the 4th param.

### Solo mode: `topRole`/`bottomRole`
`mode` (`'couple'`/`'solo'`) and `soloRole` (`'bride'`/`'groom'`/`null`) are stored in state and
carried through every level/restart transition (`getInitialState`'s callers all pass `s.mode,
s.soloRole` through — see `handleAction`/`onKey` below). Rather than hardcoding "groom is always the
top-right mover, bride is always the bottom-left mover" (true in Couple mode and Solo-as-Bride),
`getInitialState` also computes `topRole`/`bottomRole` — swapped to `bride`/`groom` when
`soloRole === 'groom'`, so the human always starts at the bottom regardless of which character they
picked. Every place that used to read `players.groom`/`players.bride` positionally (row-advance,
the meeting check, `spawnItem`'s row bounds, the `N`-key fast-forward, and `shoot()`'s bullet
direction/spawn side) now reads `players[topRole]`/`players[bottomRole]` instead, so the inversion
doesn't require special-casing groom vs. bride anywhere in that math — see `renderer.md` for the
rendering-side equivalent (`isTop` passed to `drawPlayer`).

## Key Surface
| Export / function | Line | Purpose |
|---|---|---|
| `getInitialState(levelIndex, mode, soloRole, carryOverMoney)` | 114 | Builds a fresh state object for a given level/mode (money, ammo, players, timers, `slowTimer`, `topRole`/`bottomRole`). Authoritative shape — a field missing here becomes `undefined` after a level restart. `money` is `carryOverMoney ?? level.money` — see "Money persists across levels" below. `ammo` is now just `{ envelope: level.envelopes }` (one pool, not two). |
| `useGameState()` | 156 | The hook itself; returns `{ getState, startLoop, stopLoop, setRenderCallback, handleAction }`. |
| `onKey(e)` (internal, in the hook's keyboard effect) | 240 | Bails immediately if `active` is false. Otherwise routes `keydown`/`keyup`: several non-`playing` phases advance on any key (`meeting`/`levelComplete`/`gameComplete`/`lost` → next level, replay, etc. — `gameComplete`'s replay lands on `modeSelect`, not `title`, since the canvas title screen no longer exists); while `playing`, dispatches shoot/cycle-ammo **only for the controllable role(s)** — in solo mode the waiting role's keys are ignored via `brideControllable`/`groomControllable` checks. `KeyN` just calls `skipAdvance()` (see below). There is no `title`-phase branch here any more — `Game.jsx`'s `handleStartPlaying` dispatches `handleAction({type:'START'})` directly instead of waiting for a keypress. |
| `shoot(role)` | 179 | Validates ammo/money (`money < 100` for cash, `ammo.envelope <= 0` for envelope) and that `role` is controllable in the current mode, deducts cost, spawns a bullet — direction (`vy`, spawn `y`) is based on `role === s.topRole`, not the role identity, so solo-as-groom (now in the bottom slot) shoots upward correctly. Called for both keyboard shortcuts and `handleAction({type:'SHOOT'})`. |
| `skipAdvance()` | 215 | Fast-forwards both players one row toward the center, same as the level's normal row-advance but immediate — a no-op unless `isLevelComplete()` and the rows haven't already met. Factored out so both the desktop `KeyN` handler and the mobile "⏩ Skip" button (`handleAction({type:'SKIP_ADVANCE'})`, see `game-jsx.md`) share one implementation. |
| `update()` | 304 | Runs every animation frame: row advance (rate-adjusted, see below, using `topRole`/`bottomRole`), player movement (`moveX`, gated per-role by controllability), bullet travel, item spawn/movement (capped at `MAX_CONCURRENT_ITEMS` on screen at once — 8 desktop / 5 mobile portrait, see `constants.md`), escaped-item life loss, **bullet↔item collision** (inline, not a separate function), win/lose phase transition. |
| `loop()` / `startLoop()` / `stopLoop()` | ~518–532 | `requestAnimationFrame` driver; calls `update()` then the render callback registered via `setRenderCallback`. |
| `handleAction(action)` | 539 | Dispatch table for UI-originated actions: `START` (→ `modeSelect`), `CHOOSE_MODE` (→ fresh `playing` state via `getInitialState(0, mode, soloRole)` — no carry-over, this is a genuinely fresh game), `RESTART`, `NEXT_LEVEL` (carries `s.money` forward via `carryOverMoney`), `SHOOT`, `CYCLE_AMMO`, `SKIP_ADVANCE`, `DRAG_MOVE`, `SELECT_AMMO` — used by `Game.jsx`'s click/touch handlers and on-screen mobile buttons. `RESTART`/`NEXT_LEVEL` preserve the current `mode`/`soloRole` rather than resetting to Couple; `RESTART` does **not** carry money forward (a loss restarts the whole game fresh). `DRAG_MOVE` (mobile drag/swipe gesture) moves `action.role`'s player by `action.deltaX` immediately — bypassing `keysRef`/`update()`'s per-frame `moveX` entirely — clamped to the play-field bounds; `Game.jsx` computes `deltaX` from the raw per-`touchmove` screen delta so the player tracks the finger 1:1 (a fast flick covers as much ground as an equally fast, deliberate drag), not a fixed-speed nudge. |
| `spawnItem(topRow, bottomRow, level, acquiredItems, elapsedFraction)` (internal) | 51 | Builds one flying item from the level's weighted spawn pool; randomizes `incomeAmount` for guest/family items. `elapsedFraction` (0 at level start, 1 at the end — computed in `update()` from `time`/`level.gameDuration`) is forwarded to `levels.js`'s `getSpawnPool()` to stagger required items' first appearance — see `game-design.md`'s "Required-Item Pacing". **Not customization-aware**: the spawned item's `label` (used later for the floating pickup message in `drawMessages`, `renderer.js`) is copied straight from `WEDDING_ITEMS` in `constants.js` at spawn time. If an admin customizes the "Her Family"/"His Family" labels via `customizationStore.js`, already-spawned/queued items still show the old label in their floating "+$400 Her Family" toast — only the side-panel checklist (which resolves labels live via `renderer.js`'s `getItemLabel(item, cfg)`) reflects the change immediately. Known v1 limitation, not a bug. |
| `pickWeighted(pool)` (internal) | 41 | Cumulative-weight random pick over a pool's `spawnWeight` fields — used by `spawnItem()` instead of a uniform pick. See `constants.md`'s `WEDDING_ITEMS.spawnWeight`. |

### Money persists across levels
`getInitialState`'s 4th param, `carryOverMoney`, overrides `level.money` when given. Every call site
that advances to a new level (the meeting-phase and `levelComplete`-phase branches in `onKey`, and
`handleAction`'s `NEXT_LEVEL` case) passes the outgoing state's `s.money` here, so a level no longer
resets the player's balance — only `CHOOSE_MODE` (a fresh game) and `RESTART` (restarting after a
loss) leave it `undefined`, falling back to `level.money`. See `game-design.md`'s "Money Persists
Across Levels" for the design rationale; `ammo.envelope` is *not* carried this way and does reset
every level (`getInitialState` always reads it fresh from `level.envelopes`).

### Row-advance rate & the time countdown (inside `update()`, ~lines 324–341)
```js
const requiredDone = isLevelComplete(level, acquiredItems); // this frame's incoming items
let advanceRate = requiredDone ? ROW_ADVANCE_SPEEDUP : 1;
if (slowTimer > 0) advanceRate *= 0.5;

const outOfAmmo = money < 100 && ammo.envelope <= 0;
const speedMultiplier = outOfAmmo ? NO_AMMO_FASTFORWARD : advanceRate;
const tickInterval = Math.max(1, Math.round(FPS / speedMultiplier));

if (frame % tickInterval === 0) {
  time = Math.max(0, time - 1);
  rowAdvanceTimer += 1;
}
```
Both the displayed countdown (`time`) and `rowAdvanceTimer` share one tick, gated by `tickInterval`
— `speedMultiplier` decides how many real-time frames that tick spans, so speeding it up makes the
clock visibly count down faster, not just the row-advance rate (a deliberate change: it used to only
speed up row-advance, keeping the displayed timer at a flat 1-second-per-second pace even once
required items were done). `slowTimer > 0` (an active hourglass reprieve) halves `advanceRate`,
which — now that it drives the shared tick — genuinely buys more real time rather than just slowing
row-advance. The `incomeType === 'time'` collision branch (~line 460) sets
`slowTimer = HOURGLASS_SLOW_SECONDS * FPS` when an hourglass item is shot down. See
`game-design.md`'s "Row-Advance Pacing".

Once cash and envelopes are both spent (`outOfAmmo`), neither player can act again, so
`speedMultiplier` becomes `NO_AMMO_FASTFORWARD` (`10`) regardless of `advanceRate` — the level races
to its win/lose outcome instead of idling out the real-time clock. This only scales the
timer/row-advance ticks; `slowTimer`'s own countdown and item spawning/movement still run at their
normal per-frame rate.

### Controls (verified against `onKey`/`moveX`, `useGameState.js:285–289,368`)
- **Bride**: `KeyA`/`KeyD` move, `KeyW` shoot, `KeyS` cycle ammo.
- **Groom**: `ArrowLeft`/`ArrowRight` move, `ArrowUp`/`ArrowDown` cycle ammo, `Space`/`Enter` shoot.
- These are the reverse of what an earlier version of `game-design.md`/`testing.md` claimed — fixed as part of this pass; re-verify here (not from memory) if they're ever in question again.

## Relationships / Cross-links
- Consumes constants and item/ammo schema from `src/constants.js` — see [`constants.md`](constants.md).
- Consumes `LEVELS`, `getSpawnPool()`, `isLevelComplete()` from `src/levels.js` (documented inline in [`game-design.md`](game-design.md), not split into its own component file).
- Constructed by and handed to `Game.jsx` — see [`game-jsx.md`](game-jsx.md).
- Its output state is the sole input to `render()` in `src/renderer.js` — see [`renderer.md`](renderer.md).
- Exercised by the manual checklist in [`testing.md`](testing.md) and the [`bug-fix.md`](../skills/bug-fix.md) / [`new-feature.md`](../skills/new-feature.md) skills.
