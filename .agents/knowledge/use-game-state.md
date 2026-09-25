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
`getInitialState(levelIndex = 0, mode = 'couple', soloRole = null, carryOverMoney, carryOverEnvelopes, carryOverLives)`
(`useGameState.js:117`) — see "Money and envelopes persist across levels" below for the 4th/5th params
and "Level failure & retry" below for the 6th.

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
| `getInitialState(levelIndex, mode, soloRole, carryOverMoney, carryOverEnvelopes, carryOverLives)` | 117 | Builds a fresh state object for a given level/mode (money, ammo, players, timers, `slowTimer`, `livesFlashTimer`, `topRole`/`bottomRole`). Authoritative shape — a field missing here becomes `undefined` after a level restart. `money` is `(carryOverMoney ?? 0) + level.money` and `ammo.envelope` is `(carryOverEnvelopes ?? 0) + level.envelopes` — **additive**, not a fallback — see "Money and envelopes persist across levels" below. `lives` is `carryOverLives ?? 3` — only a failed-level retry passes a value here (see "Level failure & retry" below); every other caller gets a fresh 3. Also stashes `levelStartMoney`/`levelStartEnvelopes` (`carryOverMoney`/`carryOverEnvelopes` as given, defaulting to `0`) so a later retry of *this* level can reconstruct its original starting balance. `ammo` is just `{ envelope }` (one pool, not two). |
| `useGameState()` | 159 | The hook itself; returns `{ getState, startLoop, stopLoop, setRenderCallback, handleAction }`. |
| `onKey(e)` (internal, in the hook's keyboard effect) | 243 | Bails immediately if `active` is false. Otherwise routes `keydown`/`keyup`: several non-`playing` phases advance on any key (`meeting`/`levelComplete`/`gameComplete`/`lost` → next level, replay, etc. — `gameComplete`'s replay lands on `modeSelect`, not `title`, since the canvas title screen no longer exists); `lost` only advances on `KeyR` specifically (a full restart is a bigger commitment than the other any-key transitions); `levelFailed` advances on any key like the others, retrying the same level (see "Level failure & retry" below) rather than restarting the game. While `playing`, dispatches shoot/cycle-ammo **only for the controllable role(s)** — in solo mode the waiting role's keys are ignored via `brideControllable`/`groomControllable` checks. `KeyN` just calls `skipAdvance()` (see below). There is no `title`-phase branch here any more — `Game.jsx`'s `handleStartPlaying` dispatches `handleAction({type:'START'})` directly instead of waiting for a keypress. |
| `shoot(role)` | 182 | Validates ammo/money (`money < 100` for cash, `ammo.envelope <= 0` for envelope) and that `role` is controllable in the current mode, deducts cost, spawns a bullet — direction (`vy`, spawn `y`) is based on `role === s.topRole`, not the role identity, so solo-as-groom (now in the bottom slot) shoots upward correctly. Called for both keyboard shortcuts and `handleAction({type:'SHOOT'})`. |
| `skipAdvance()` | 218 | Fast-forwards both players one row toward the center, same as the level's normal row-advance but immediate — a no-op unless `isLevelComplete()` and the rows haven't already met. Factored out so both the desktop `KeyN` handler and the mobile "⏩ Skip" button (`handleAction({type:'SKIP_ADVANCE'})`, see `game-jsx.md`) share one implementation. |
| `update()` | 307 | Runs every animation frame: row advance (rate-adjusted, see below, using `topRole`/`bottomRole`), player movement (`moveX`, gated per-role by controllability), bullet travel, item spawn/movement (capped at `MAX_CONCURRENT_ITEMS` on screen at once — 8 desktop / 5 mobile portrait, see `constants.md`), escaped-item heads-up (a `centerMsg()` callout, but **no** life cost — see "Escaped items: a heads-up, not a life cost" below), **bullet↔item collision** (inline, not a separate function — see "Bullet↔item eligibility" below for the `ammoOK`/`playerOK` gate), win/lose phase transition (see "Level failure & retry" below). |
| `loop()` / `startLoop()` / `stopLoop()` | ~521–535 | `requestAnimationFrame` driver; calls `update()` then the render callback registered via `setRenderCallback`. |
| `handleAction(action)` | 542 | Dispatch table for UI-originated actions: `START` (→ `modeSelect`), `CHOOSE_MODE` (→ fresh `playing` state via `getInitialState(0, mode, soloRole)` — no carry-over, this is a genuinely fresh game), `RESTART`, `RETRY_LEVEL` (retries the current level after a `levelFailed` — see "Level failure & retry" below), `NEXT_LEVEL` (carries `s.money`/`s.ammo.envelope` forward via `carryOverMoney`/`carryOverEnvelopes`), `SHOOT`, `CYCLE_AMMO`, `SKIP_ADVANCE`, `DRAG_MOVE`, `SELECT_AMMO` — used by `Game.jsx`'s click/touch handlers and on-screen mobile buttons. `RESTART`/`NEXT_LEVEL`/`RETRY_LEVEL` preserve the current `mode`/`soloRole` rather than resetting to Couple; `RESTART` does **not** carry money/envelopes/lives forward (a full game over restarts fresh). `DRAG_MOVE` (mobile drag/swipe gesture) moves `action.role`'s player by `action.deltaX` immediately — bypassing `keysRef`/`update()`'s per-frame `moveX` entirely — clamped to the play-field bounds; `Game.jsx` computes `deltaX` from the raw per-`touchmove` screen delta so the player tracks the finger 1:1 (a fast flick covers as much ground as an equally fast, deliberate drag), not a fixed-speed nudge. |
| `spawnItem(topRow, bottomRow, level, acquiredItems, elapsedFraction)` (internal) | 51 | Builds one flying item from the level's weighted spawn pool; randomizes `incomeAmount` for guest/family items. `elapsedFraction` (0 at level start, 1 at the end — computed in `update()` from `time`/`level.gameDuration`) is forwarded to `levels.js`'s `getSpawnPool()` to stagger required items' first appearance — see `game-design.md`'s "Required-Item Pacing". **Not customization-aware**: the spawned item's `label` (used later for the floating pickup message in `drawMessages`, `renderer.js`) is copied straight from `WEDDING_ITEMS` in `constants.js` at spawn time. If an admin customizes the "Her Family"/"His Family" labels via `customizationStore.js`, already-spawned/queued items still show the old label in their floating "+$400 Her Family" toast — only the side-panel checklist (which resolves labels live via `renderer.js`'s `getItemLabel(item, cfg)`) reflects the change immediately. Known v1 limitation, not a bug. |
| `pickWeighted(pool)` (internal) | 41 | Cumulative-weight random pick over a pool's `spawnWeight` fields — used by `spawnItem()` instead of a uniform pick. See `constants.md`'s `WEDDING_ITEMS.spawnWeight`. |

### Money and envelopes persist across levels
`getInitialState`'s 4th/5th params, `carryOverMoney`/`carryOverEnvelopes`, are **added to**
`level.money`/`level.envelopes` when given — not a fallback (`??`), an actual sum. Every call site
that advances to a new level (the meeting-phase and `levelComplete`-phase branches in `onKey`, and
`handleAction`'s `NEXT_LEVEL` case) passes the outgoing state's `s.money`/`s.ammo.envelope` here, so
a level no longer resets the player's balance/ammo — it tops both up on top of whatever's left. Only
`CHOOSE_MODE` (a fresh game) and `RESTART` (restarting after a loss) leave both `undefined`, so they
contribute `0` and `level.money`/`level.envelopes` end up being the real starting amounts. See
`game-design.md`'s "Money and Envelopes Persist Across Levels" for the design rationale and the
in-game "+$X & +N 💌 waiting for you!" notice shown ahead of each new level.

### Level failure & retry
The win/lose check at the end of `update()` (~line 484) used to send **any** failure straight to
`'lost'` (full game over): players meeting without every required item, or time running out the same
way. Now, that same condition costs exactly one life and — as long as `lives` is still above 0 after
the decrement — sets `phase: 'levelFailed'` instead of `'lost'`; only an *already-empty* life pool
(checked first, before the meeting/timeout branches) or a failure that drains the last life still
produces `'lost'`. `livesFlashTimer` is set to `40` on this decrement too, same as the other
life-loss paths (see "Life-loss feedback" below).

`levelFailed` is a display-only stop, structurally like `meeting`/`levelComplete` — `update()` leaves
the failed attempt's final state in place (so its overlay can show what was missing) and only
`onKey`'s `levelFailed` branch / `handleAction`'s `RETRY_LEVEL` case actually rebuild the level, via:
```js
getInitialState(s.currentLevel, s.mode, s.soloRole, s.levelStartMoney, s.levelStartEnvelopes, s.lives)
```
Passing back `s.levelStartMoney`/`s.levelStartEnvelopes` (not `s.money`/`s.ammo.envelope`) is
deliberate — it recreates the level's original starting balance, not whatever the failed attempt had
spent it down to. Passing `s.lives` (rather than omitting it, which would default to a fresh 3) is
what makes the failure actually cost something across the retry.

### Life-loss feedback
Only two paths decrement `lives`: a mine hit and a level failure above (an escaped required item does
**not** — see below). Both also set `livesFlashTimer = 40` (~⅔s), read by `renderer.js`'s `drawHUD`
to flash red behind the hearts, and push a `centerMsg()` — a big, screen-centered, non-drifting
message (`{ ..., big: true }`, rendered by `drawMessages`'s `m.big` branch) instead of the normal
per-item toast (`msg()`, tied to the triggering item's `x`/`y`). This matters for the level-failure
case (its `levelFailed` overlay is the actual explanation) and especially the mine hit, whose item is
still on-screen but easy to miss amid other action.

### Escaped items: a heads-up, not a life cost
An essential item flying off-screen unacquired (`update()`'s `escapedEssential` check, right before
the collision loop) pushes its own `centerMsg()` — `⚠️ <emoji> <item> got away!`, in orange rather
than red, with **no** "−1 life" text — but does not touch `lives` or `livesFlashTimer` at all. This
used to cost a life (silently, originally, then with the same treatment as a mine hit); feedback
was that a life should be lost *only* on an actual level failure, not for missing an item along the
way, so the two were split apart. The `centerMsg()` treatment still applies here on its own
merits — the item is already off-screen by the time this fires, so anchoring the message to its
`x`/`y` (like the mine-hit toast) would put the text off-screen too — it just no longer implies a
life was lost, because none was.

### Bullet↔item eligibility (inside `update()`'s collision loop, ~line 441)
```js
const ammoOK   = !it.ammoRequired || it.ammoRequired === b.ammoType;
const playerOK = mode === 'solo' || !it.exclusiveTo || it.exclusiveTo === b.role;
```
A hit only does anything (damages/acquires the item) when both are true; otherwise the item just
flashes (`flashTimer = 12`) and stays untouched. `playerOK` used to be `!it.exclusiveTo ||
it.exclusiveTo === b.role` unconditionally — correct for Couple mode (bride can't take groom's
`suit`/`parent_groom`, and vice versa), but in Solo mode `b.role` is always `soloRole` (the only role
that can ever shoot, per `shoot()`'s own early-out), so an exclusive item belonging to the *other*
role was simply unhittable forever — worse, Level 4/5 *require* both `flowers` (bride-exclusive) and
`suit` (groom-exclusive), which made those levels uncompletable in Solo mode at all. `mode === 'solo'`
now short-circuits `playerOK` to `true` unconditionally, so the one shooter can acquire everything —
see `game-design.md`'s "Item Types" footnote.

### Row-advance rate & the time countdown (inside `update()`, ~lines 327–344)
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

### Controls (verified against `onKey`/`moveX`, `useGameState.js:288–292,371`)
- **Bride**: `KeyA`/`KeyD` move, `KeyW` shoot, `KeyS` cycle ammo.
- **Groom**: `ArrowLeft`/`ArrowRight` move, `ArrowUp`/`ArrowDown` cycle ammo, `Space`/`Enter` shoot.
- These are the reverse of what an earlier version of `game-design.md`/`testing.md` claimed — fixed as part of this pass; re-verify here (not from memory) if they're ever in question again.

## Relationships / Cross-links
- Consumes constants and item/ammo schema from `src/constants.js` — see [`constants.md`](constants.md).
- Consumes `LEVELS`, `getSpawnPool()`, `isLevelComplete()` from `src/levels.js` (documented inline in [`game-design.md`](game-design.md), not split into its own component file).
- Constructed by and handed to `Game.jsx` — see [`game-jsx.md`](game-jsx.md).
- Its output state is the sole input to `render()` in `src/renderer.js` — see [`renderer.md`](renderer.md).
- Exercised by the manual checklist in [`testing.md`](testing.md) and the [`bug-fix.md`](../skills/bug-fix.md) / [`new-feature.md`](../skills/new-feature.md) skills.
