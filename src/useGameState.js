import { useEffect, useRef, useCallback } from 'react';
import {
  GAME_WIDTH, PLAY_HEIGHT,
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED,
  GROOM_START_ROW, BRIDE_START_ROW, GROOM_START_X, BRIDE_START_X,
  ROW_HEIGHT,
  BULLET_SPEED, BULLET_WIDTH, BULLET_HEIGHT,
  ITEM_WIDTH, ITEM_HEIGHT, MAX_CONCURRENT_ITEMS,
  AMMO_DAMAGE, AMMO_ORDER,
  ROW_ADVANCE_SPEEDUP, HOURGLASS_SLOW_SECONDS, NO_AMMO_FASTFORWARD,
} from './constants';
import { LEVELS, getSpawnPool, isLevelComplete } from './levels';

const FPS               = 60;
const ITEM_SPAWN_FRAMES = 90;   // ~1.5 s between spawns

// ── helpers ────────────────────────────────────────────────────────────────

function rowToY(row) {
  return row * ROW_HEIGHT + (ROW_HEIGHT - PLAYER_HEIGHT) / 2;
}

// `isTop` picks the physical starting corner (top-right, moving down vs.
// bottom-left, moving up) independent of role identity — in solo mode
// playing as groom, the human always starts at the bottom, so groom takes
// the "isTop = false" slot instead of its couple-mode default.
function makePlayer(role, isTop) {
  const row = isTop ? GROOM_START_ROW : BRIDE_START_ROW;
  return {
    role,
    x:            isTop ? GROOM_START_X : BRIDE_START_X,
    y:            rowToY(row),
    row,
    speed:        PLAYER_SPEED,
    alive:        true,
    selectedAmmo: 'cash',
  };
}

// Picks one template from the pool, weighted by each template's spawnWeight
function pickWeighted(pool) {
  const total = pool.reduce((sum, t) => sum + (t.spawnWeight ?? 1), 0);
  let roll = Math.random() * total;
  for (const t of pool) {
    roll -= (t.spawnWeight ?? 1);
    if (roll <= 0) return t;
  }
  return pool[pool.length - 1];
}

function spawnItem(topRow, bottomRow, level, acquiredItems = []) {
  const minRow = topRow + 1;
  const maxRow = bottomRow - 1;
  if (minRow > maxRow) return null;

  // Don't re-spawn purchasable/discount items already acquired — only income & mines keep spawning
  const spawnPool = getSpawnPool(level).filter(t =>
    t.incomeType === 'income' || t.incomeType === 'mine' || !acquiredItems.includes(t.id)
  );
  if (spawnPool.length === 0) return null;

  const row      = minRow + Math.floor(Math.random() * (maxRow - minRow + 1));
  const goLeft   = Math.random() < 0.5;
  const template = pickWeighted(spawnPool);
  const scaledPrice = Math.ceil(template.price * level.priceScale);

  // Randomise donation amounts so each guest/family arrival feels fresh
  let incomeAmount = template.incomeAmount ?? 0;
  if (template.incomeType === 'income' && incomeAmount > 0) {
    const isFamily  = template.id === 'parent_bride' || template.id === 'parent_groom';
    const pool = isFamily
      ? [300, 350, 400, 450, 500]   // family: $300–$500
      : [100, 150, 200, 250, 300];  // guests: $100–$300
    incomeAmount = pool[Math.floor(Math.random() * pool.length)];
  }

  return {
    id:           Math.random().toString(36).slice(2),
    templateId:   template.id,
    label:        template.label,
    emoji:        template.emoji,
    price:        scaledPrice,
    maxPrice:     scaledPrice,
    essential:    template.essential,
    exclusiveTo:  template.exclusiveTo,
    incomeType:   template.incomeType  ?? null,
    incomeAmount,
    discountPct:  template.discountPct  ?? 0,
    ammoRequired: template.ammoRequired ?? null,
    row,
    x:            goLeft ? GAME_WIDTH + ITEM_WIDTH : -ITEM_WIDTH,
    y:            row * ROW_HEIGHT + (ROW_HEIGHT - ITEM_HEIGHT) / 2,
    vx:           goLeft ? -level.itemSpeed : level.itemSpeed,
    flashTimer:   0,
  };
}

// ── initial state ──────────────────────────────────────────────────────────

// `mode` is 'couple' (both players controllable, groom top/bride bottom as
// always) or 'solo' (only `soloRole` is controllable; the other role is a
// parked, blinking placeholder). In solo mode the human always starts at the
// bottom row, so soloRole='groom' swaps which role occupies the top/bottom
// starting slot; row-advance/meeting logic below reads `topRole`/`bottomRole`
// rather than hardcoding groom=top, so this inversion doesn't have to touch
// the convergence math itself.
export function getInitialState(levelIndex = 0, mode = 'couple', soloRole = null) {
  const idx   = Math.min(levelIndex, LEVELS.length - 1);
  const level = LEVELS[idx];
  const invert  = mode === 'solo' && soloRole === 'groom';
  const topRole    = invert ? 'bride' : 'groom';
  const bottomRole = invert ? 'groom' : 'bride';
  return {
    phase:           'title',
    mode,
    soloRole,
    topRole,
    bottomRole,
    currentLevel:    idx,
    frame:           0,
    time:            level.gameDuration,
    money:           level.money,
    ammo:            { invite: level.invites, heart: level.hearts },
    discount:        1,
    lives:           3,
    players:         { [topRole]: makePlayer(topRole, true), [bottomRole]: makePlayer(bottomRole, false) },
    bullets:         [],
    items:           [],
    acquiredItems:   [],
    messages:        [],
    score:           0,
    spawnTimer:      0,
    rowAdvanceTimer: 0,
    advanceAnim:     0,
    meetingTimer:    0,   // counts up during 'meeting' phase for animations
    slowTimer:       0,   // frames remaining of hourglass row-advance slowdown
  };
}

// ── hook ───────────────────────────────────────────────────────────────────

// `active` gates keyboard handling — false while the invitation screen (not
// the canvas) is showing, so a stray keypress there can't silently advance a
// paused meeting/levelComplete screen or reset a finished game in the
// background. The render loop itself is separately started/stopped by the
// caller (see Game.jsx) for the same reason; this only covers the keydown
// listener, which stays mounted regardless so its closures see the latest
// `active` value without extra plumbing.
export function useGameState(active = true) {
  const stateRef          = useRef(getInitialState());
  const keysRef           = useRef(new Set());
  const rafRef            = useRef(null);
  const renderCallbackRef = useRef(null);

  const getState = ()        => stateRef.current;
  const setState = (updater) => {
    stateRef.current =
      typeof updater === 'function' ? updater(stateRef.current) : updater;
  };

  // ── helpers that update state ─────────────────────────────────────────

  const cycleAmmoFor = useCallback((role, dir) => {
    setState(s => {
      const cur  = s.players[role].selectedAmmo;
      const idx  = AMMO_ORDER.indexOf(cur);
      const next = AMMO_ORDER[(idx + dir + AMMO_ORDER.length) % AMMO_ORDER.length];
      return { ...s, players: { ...s.players, [role]: { ...s.players[role], selectedAmmo: next } } };
    });
  }, []);

  const shoot = useCallback((role) => {
    setState(s => {
      if (s.phase !== 'playing') return s;
      if (s.mode === 'solo' && role !== s.soloRole) return s; // waiting player can't act
      const player   = s.players[role];
      if (!player.alive) return s;

      const ammoType = player.selectedAmmo;
      if (ammoType === 'cash'   && s.money        < 100) return s;
      if (ammoType === 'invite' && s.ammo.invite  <= 0)  return s;
      if (ammoType === 'heart'  && s.ammo.heart   <= 0)  return s;

      // Direction depends on which physical slot this role occupies (top
      // shoots down, bottom shoots up), not the role identity itself — in
      // solo-as-groom, groom occupies the bottom slot instead of its usual top.
      const isTop = role === s.topRole;
      const vy = isTop ? BULLET_SPEED : -BULLET_SPEED;
      const bx = player.x + PLAYER_WIDTH  / 2 - BULLET_WIDTH  / 2;
      const by = isTop ? player.y + PLAYER_HEIGHT : player.y - BULLET_HEIGHT;

      const newMoney = ammoType === 'cash' ? s.money - 100 : s.money;
      const newAmmo  = ammoType !== 'cash'
        ? { ...s.ammo, [ammoType]: s.ammo[ammoType] - 1 }
        : s.ammo;

      return {
        ...s,
        money:   newMoney,
        ammo:    newAmmo,
        bullets: [...s.bullets, { id: Math.random().toString(36).slice(2), x: bx, y: by, vy, ammoType, role }],
      };
    });
  }, []);

  // ── keyboard input ────────────────────────────────────────────────────
  useEffect(() => {
    const scrollKeys = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);

    const onKey = (e) => {
      if (!active) return;
      if (scrollKeys.has(e.code)) e.preventDefault();
      if (e.type === 'keydown') keysRef.current.add(e.code);
      if (e.type === 'keyup')   keysRef.current.delete(e.code);

      const s = getState();

      // Meeting scene: any key advances once the couple image has appeared (>= 80 frames)
      if (s.phase === 'meeting' && e.type === 'keydown' && s.meetingTimer >= 80) {
        const nextLevel = s.currentLevel + 1;
        if (nextLevel < LEVELS.length) {
          setState({ ...getInitialState(nextLevel, s.mode, s.soloRole), phase: 'playing' });
        } else {
          setState(s => ({ ...s, phase: 'gameComplete' }));
        }
        return;
      }

      if (s.phase === 'levelComplete' && e.type === 'keydown') {
        const nextLevel = s.currentLevel + 1;
        setState({ ...getInitialState(nextLevel, s.mode, s.soloRole), phase: 'playing' }); return;
      }
      if (s.phase === 'gameComplete' && e.type === 'keydown') {
        // Not phase: 'title' — the canvas title screen no longer exists
        // (InviteScreen.jsx is the pre-game screen now), so a full replay
        // goes straight to mode-select instead of a screen nothing renders.
        setState({ ...getInitialState(0), phase: 'modeSelect' }); return;
      }
      if (s.phase === 'lost' && e.code === 'KeyR' && e.type === 'keydown') {
        setState({ ...getInitialState(0, s.mode, s.soloRole), phase: 'playing' }); return;
      }

      if (s.phase !== 'playing') return;

      if (e.type === 'keydown') {
        // N: fast-forward row advance when all required items are acquired
        if (e.code === 'KeyN') {
          const level = LEVELS[s.currentLevel];
          if (isLevelComplete(level, s.acquiredItems)) {
            setState(s => {
              const { topRole, bottomRole } = s;
              const topRow = s.players[topRole].row;
              const botRow = s.players[bottomRole].row;
              if (topRow >= botRow) return s;
              const newTopRow = topRow + 1;
              const newBotRow = botRow - 1;
              const newPlayers = {
                ...s.players,
                [topRole]:    { ...s.players[topRole],    row: newTopRow, y: rowToY(newTopRow) },
                [bottomRole]: { ...s.players[bottomRole], row: newBotRow, y: rowToY(newBotRow) },
              };
              const newItems = s.items.filter(it => it.row > newTopRow && it.row < newBotRow);
              return { ...s, players: newPlayers, items: newItems, rowAdvanceTimer: 0, advanceAnim: 60 };
            });
          }
          return;
        }

        // Only the controllable role(s) respond — in solo mode the waiting
        // role's keys are ignored so it stays parked.
        const brideControllable = s.mode !== 'solo' || s.soloRole === 'bride';
        const groomControllable = s.mode !== 'solo' || s.soloRole === 'groom';

        // Bride: S cycle ammo, W shoot; A/D move (handled in update loop)
        if (brideControllable && e.code === 'KeyS') cycleAmmoFor('bride',  1);
        if (brideControllable && e.code === 'KeyW') shoot('bride');
        // Groom: ↑/↓ cycle ammo, Space/Enter shoot; ←/→ move in update loop
        if (groomControllable && e.code === 'ArrowUp')   cycleAmmoFor('groom', -1);
        if (groomControllable && e.code === 'ArrowDown') cycleAmmoFor('groom',  1);
        if (groomControllable && (e.code === 'Space' || e.code === 'Enter')) shoot('groom');
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup',   onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup',   onKey);
    };
  }, [active, cycleAmmoFor, shoot]);

  // ── main update (runs every frame) ────────────────────────────────────

  const update = useCallback(() => {
    setState(s => {
      // Meeting phase: just tick the animation timer, no game logic
      if (s.phase === 'meeting') {
        return { ...s, meetingTimer: s.meetingTimer + 1 };
      }
      if (s.phase !== 'playing') return s;

      const level = LEVELS[s.currentLevel];

      const { mode, soloRole, topRole, bottomRole } = s;
      let { frame, time, money, ammo, discount, lives,
            players, bullets, items, acquiredItems,
            messages, score, spawnTimer, rowAdvanceTimer, advanceAnim,
            currentLevel, slowTimer } = s;

      frame++;
      advanceAnim = Math.max(0, advanceAnim - 1);
      slowTimer   = Math.max(0, slowTimer - 1);

      // ── timer & row advance ────────────────────────────────────────────
      // Speeds up once all required items are in hand (less time to "gear up"
      // on extras), tempered by a temporary slowdown from the hourglass item.
      const requiredDone = isLevelComplete(level, acquiredItems);
      let advanceRate = requiredDone ? ROW_ADVANCE_SPEEDUP : 1;
      if (slowTimer > 0) advanceRate *= 0.5;

      // Once cash, invites, and hearts are all spent, neither player can act
      // again — fast-forward to the level's outcome instead of waiting out
      // the real-time clock.
      const outOfAmmo = money < 100 && ammo.invite <= 0 && ammo.heart <= 0;
      const tickInterval = outOfAmmo ? Math.max(1, Math.round(FPS / NO_AMMO_FASTFORWARD)) : FPS;

      if (frame % tickInterval === 0) {
        time = Math.max(0, time - 1);
        rowAdvanceTimer += advanceRate;
      }

      let newPlayers = players;
      if (rowAdvanceTimer >= level.rowAdvance) {
        rowAdvanceTimer = 0;
        const topRow = players[topRole].row;
        const botRow = players[bottomRole].row;
        if (topRow < botRow) {
          const newTopRow = topRow + 1;
          const newBotRow = botRow - 1;
          newPlayers = {
            ...players,
            [topRole]:    { ...players[topRole],    row: newTopRow, y: rowToY(newTopRow) },
            [bottomRole]: { ...players[bottomRole], row: newBotRow, y: rowToY(newBotRow) },
          };
          advanceAnim = 60;
          items = items.filter(it => it.row > newTopRow && it.row < newBotRow);
        }
      }

      // ── player left / right movement ────────────────────────────────
      // In solo mode only the controllable role responds to keys — the
      // waiting role stays parked at its corner.
      const keys = keysRef.current;
      const moveX = (p, leftKey, rightKey) => {
        if (!p.alive) return p;
        let x = p.x;
        if (keys.has(leftKey))  x = Math.max(0, x - p.speed);
        if (keys.has(rightKey)) x = Math.min(GAME_WIDTH - PLAYER_WIDTH, x + p.speed);
        return x !== p.x ? { ...p, x } : p;
      };
      const groomControllable = mode !== 'solo' || soloRole === 'groom';
      const brideControllable = mode !== 'solo' || soloRole === 'bride';
      newPlayers = {
        ...newPlayers,
        groom: groomControllable ? moveX(newPlayers.groom, 'ArrowLeft', 'ArrowRight') : newPlayers.groom,
        bride: brideControllable ? moveX(newPlayers.bride, 'KeyA',      'KeyD')       : newPlayers.bride,
      };

      // ── bullets ──────────────────────────────────────────────────────
      bullets = bullets
        .map(b => ({ ...b, y: b.y + b.vy }))
        .filter(b => b.y > -20 && b.y < PLAY_HEIGHT + 20);

      // ── item spawn ───────────────────────────────────────────────────
      spawnTimer++;
      if (spawnTimer >= ITEM_SPAWN_FRAMES && items.length < MAX_CONCURRENT_ITEMS) {
        const it = spawnItem(newPlayers[topRole].row, newPlayers[bottomRole].row, level, acquiredItems);
        if (it) items = [...items, it];
        spawnTimer = 0;
      }

      // ── move items + tick flash ───────────────────────────────────────
      items = items.map(it => ({
        ...it,
        x:          it.x + it.vx,
        flashTimer: Math.max(0, it.flashTimer - 1),
      }));

      // ── items escaping off-screen → lose a life if essential and not yet acquired
      const escaped = items.filter(it =>
        it.x < -ITEM_WIDTH * 2 || it.x > GAME_WIDTH + ITEM_WIDTH * 2
      );
      if (escaped.some(it => it.essential && !acquiredItems.includes(it.templateId))) {
        lives = Math.max(0, lives - 1);
      }
      items = items.filter(it =>
        it.x >= -ITEM_WIDTH * 2 && it.x <= GAME_WIDTH + ITEM_WIDTH * 2
      );

      // ── bullet ↔ item collisions ──────────────────────────────────────
      let newMessages = messages
        .filter(m => m.timer > 0)
        .map(m => ({ ...m, timer: m.timer - 1 }));
      const newAcquired = [...acquiredItems];

      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b  = bullets[bi];
        let hit  = false;

        for (let ii = items.length - 1; ii >= 0; ii--) {
          const it = items[ii];

          if (b.x > it.x + ITEM_WIDTH  || b.x + BULLET_WIDTH  < it.x) continue;
          if (b.y > it.y + ITEM_HEIGHT || b.y + BULLET_HEIGHT < it.y) continue;

          hit = true;
          const ammoOK   = !it.ammoRequired || it.ammoRequired === b.ammoType;
          const playerOK = !it.exclusiveTo   || it.exclusiveTo  === b.role;

          if (!ammoOK || !playerOK) {
            items[ii] = { ...it, flashTimer: 12 };
            break;
          }

          const dmg      = AMMO_DAMAGE[b.ammoType] * discount;
          const newPrice = Math.max(0, it.price - dmg);

          if (newPrice <= 0) {
            items.splice(ii, 1);
            if (!newAcquired.includes(it.templateId)) newAcquired.push(it.templateId);

            if (it.incomeType === 'income') {
              money += it.incomeAmount;
              const isFamily = it.templateId === 'parent_bride' || it.templateId === 'parent_groom';
              const prefix   = isFamily ? '💕 Family donated' : '💌 Guest arrived';
              newMessages.push(msg(`${prefix}! +$${it.incomeAmount}`, it, '#4caf50'));
            } else if (it.incomeType === 'discount') {
              discount *= (1 - it.discountPct);
              newMessages.push(msg(`${Math.round(it.discountPct * 100)}% discount! ${it.emoji}`, it, '#ff9800'));
            } else if (it.incomeType === 'mine') {
              lives = Math.max(0, lives - 1);
              newMessages.push(msg('💣 TRAP! −1 life', it, '#f44336'));
            } else if (it.incomeType === 'time') {
              slowTimer = HOURGLASS_SLOW_SECONDS * FPS;
              newMessages.push(msg(`⏳ +${HOURGLASS_SLOW_SECONDS}s reprieve!`, it, '#64b5f6'));
            } else {
              // Purchasable item (required or optional) — award score
              const pts = it.maxPrice * 10;
              score += pts;
              newMessages.push(msg(`+${pts}pts`, it, it.essential ? '#ffd700' : '#b3e5ff'));
            }
          } else {
            items[ii] = { ...it, price: newPrice, flashTimer: 8 };
          }
          break;
        }

        if (hit) bullets.splice(bi, 1);
      }

      // ── win / lose check ─────────────────────────────────────────────
      const levelDone      = isLevelComplete(level, newAcquired);
      const playersHaveMet = newPlayers[topRole].row >= newPlayers[bottomRole].row;

      let phase = 'playing';
      if (lives <= 0) {
        phase = 'lost';
      } else if (playersHaveMet) {
        // Physical meeting → show couple scene
        phase = (levelDone && money >= 0) ? 'meeting' : 'lost';
      } else if (time <= 0) {
        if (levelDone && money >= 0) {
          phase = currentLevel + 1 < LEVELS.length ? 'levelComplete' : 'gameComplete';
        } else {
          phase = 'lost';
        }
      }

      return {
        ...s,
        phase, frame, time, money, ammo, discount, lives,
        players:         newPlayers,
        bullets,
        items,
        acquiredItems:   newAcquired,
        messages:        newMessages,
        score,
        spawnTimer,
        rowAdvanceTimer,
        advanceAnim,
        slowTimer,
      };
    });
  }, []);

  // ── game loop ─────────────────────────────────────────────────────────
  // `loopRef` lets the frame callback re-invoke itself without a
  // self-reference at declaration time (requestAnimationFrame needs a value,
  // not the not-yet-assigned `loop` binding). Assigned in an effect, not
  // during render, since refs shouldn't be written while rendering.

  const loopRef = useRef(null);
  const loop = useCallback(() => {
    update();
    renderCallbackRef.current?.(stateRef.current);
    rafRef.current = requestAnimationFrame(() => loopRef.current());
  }, [update]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const startLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => loopRef.current());
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const setRenderCallback = useCallback(cb => { renderCallbackRef.current = cb; }, []);

  const handleAction = useCallback((action) => {
    switch (action.type) {
      case 'START':
        setState(s => ({ ...s, phase: 'modeSelect' })); break;
      case 'CHOOSE_MODE':
        setState({ ...getInitialState(0, action.mode, action.soloRole ?? null), phase: 'playing' }); break;
      case 'RESTART':
        setState(s => ({ ...getInitialState(0, s.mode, s.soloRole), phase: 'playing' })); break;
      case 'NEXT_LEVEL': {
        const s = getState();
        // Guard: don't advance too early during meeting animation
        if (s.phase === 'meeting' && s.meetingTimer < 80) break;
        const nextLevel = s.currentLevel + 1;
        if (nextLevel < LEVELS.length) {
          setState({ ...getInitialState(nextLevel, s.mode, s.soloRole), phase: 'playing' });
        } else {
          setState({ ...s, phase: 'gameComplete' });
        }
        break;
      }
      case 'SHOOT':
        shoot(action.role); break;
      case 'CYCLE_AMMO':
        cycleAmmoFor(action.role, action.dir ?? 1); break;
      case 'DRAG_MOVE': {
        // Applied immediately (not queued through keysRef/update()'s per-frame
        // moveX) so the player tracks the finger 1:1 — deltaX is already in
        // game-pixel units (Game.jsx converts the raw touch delta using the
        // canvas's CSS-to-internal-resolution scale), so a fast flick covers
        // as much ground as an equally fast, deliberate drag.
        setState(s => {
          if (s.phase !== 'playing') return s;
          if (s.mode === 'solo' && action.role !== s.soloRole) return s;
          const player = s.players[action.role];
          if (!player || !player.alive) return s;
          const x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_WIDTH, player.x + action.deltaX));
          if (x === player.x) return s;
          return { ...s, players: { ...s.players, [action.role]: { ...player, x } } };
        });
        break;
      }
      case 'SELECT_AMMO':
        setState(s => ({
          ...s,
          players: { ...s.players, [action.role]: { ...s.players[action.role], selectedAmmo: action.ammoType } },
        })); break;
      default: break;
    }
  }, [shoot, cycleAmmoFor]);

  return { getState, startLoop, stopLoop, setRenderCallback, handleAction };
}

// ── tiny helper ────────────────────────────────────────────────────────────
function msg(text, item, color) {
  return { id: Math.random().toString(36).slice(2), text, x: item.x, y: item.y, timer: 90, color };
}
