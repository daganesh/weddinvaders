import { WEDDING_ITEMS } from './constants';

// ── level definitions ────────────────────────────────────────────────────────
//
//  priceScale   multiplies base item prices   (0.2 → rings cost $100 instead of $500)
//  itemSpeed    pixels/frame for flying items
//  rowAdvance   seconds between each row step (9 rows, 4 steps to meet → 4×interval)
//  hasMines     whether 💣 traps can appear
//  money        starting cash — only actually applied at level 1; from level 2
//               onward the player's carried-over balance is used instead (see
//               useGameState.js's getInitialState `carryOverMoney` param), so
//               this is really just level 1's number plus a documented
//               fallback for the others (must always be a multiple of $100 —
//               cash ammo costs $100/shot)
//  envelopes    starting 💌 envelope ammo — this DOES reset every level
//
export const LEVELS = [
  {
    id:           1,
    name:         'Save the Date',
    subtitle:     'Just the basics — one ring to rule them all!',
    required:     ['rings'],
    optional:     ['guest', 'cake', 'parent_bride', 'parent_groom', 'hourglass'],
    money:        600,    // was 9900 — way more than a single $50 ring could ever need
    priceScale:   0.1,    // rings cost $50 — one cash shot buys it
    itemSpeed:    1.5,    // snappy intro pace
    rowAdvance:   60,     // rows advance once per minute
    gameDuration: 300,    // 5 minutes — no pressure
    envelopes:    16,
    hasMines:     false,
  },
  {
    id:           2,
    name:         'The Ceremony',
    subtitle:     'Someone needs to officiate this thing.',
    required:     ['rings', 'officiant'],
    optional:     ['guest', 'suit', 'flowers', 'parent_bride', 'parent_groom', 'hourglass'],
    money:        800,
    priceScale:   0.4,
    itemSpeed:    2.0,
    rowAdvance:   30,
    gameDuration: 150,
    envelopes:    14,
    hasMines:     false,
  },
  {
    id:           3,
    name:         'The Reception',
    subtitle:     'You have to feed your guests!',
    required:     ['rings', 'officiant', 'catering'],
    optional:     ['guest', 'suit', 'flowers', 'cake', 'parent_bride', 'parent_groom', 'hourglass'],
    money:        1000,
    priceScale:   0.65,
    itemSpeed:    2.5,
    rowAdvance:   24,
    gameDuration: 110,
    envelopes:    14,
    hasMines:     false,
  },
  {
    id:           4,
    name:         'The Full Wedding',
    subtitle:     'Fashion matters. So does cake.',
    required:     ['rings', 'officiant', 'catering', 'flowers', 'suit'],
    optional:     ['guest', 'parent_bride', 'parent_groom', 'cake', 'discount', 'hourglass'],
    money:        1200,
    priceScale:   0.9,
    itemSpeed:    3.0,
    rowAdvance:   20,
    gameDuration: 95,
    envelopes:    17,
    hasMines:     true,
  },
  {
    id:           5,
    name:         'Dream Wedding',
    subtitle:     'The whole package. Watch out for traps!',
    required:     ['rings', 'officiant', 'catering', 'flowers', 'suit', 'cake'],
    optional:     ['guest', 'parent_bride', 'parent_groom', 'discount', 'hourglass'],
    money:        1400,
    priceScale:   1.2,
    itemSpeed:    3.5,
    rowAdvance:   16,
    gameDuration: 80,
    envelopes:    17,
    hasMines:     true,
  },
];

// Returns the subset of WEDDING_ITEMS that can spawn right now.
//
// Required items used to all be spawnable from the very first frame — with
// spawnWeight tied with the optional purchases, they got bought out almost
// immediately, leaving nothing but income items (guest/family) flying by for
// the rest of the level. `elapsedFraction` (0 at level start, 1 at the end —
// see useGameState.js's update()) staggers each required item's first
// appearance across the level instead: the item at `required[i]` only
// becomes spawnable once `elapsedFraction >= i / required.length`, so
// `required[0]` is available immediately (a single-required-item level like
// Level 1 behaves exactly as before) while a level with several required
// items spreads them out — each one keeps spawning once unlocked, same as
// before, just introduced gradually rather than all at once.
export function getSpawnPool(level, elapsedFraction = 1) {
  const allowed = new Set(level.optional);
  if (level.hasMines) allowed.add('mine');
  level.required.forEach((id, i) => {
    if (elapsedFraction >= i / level.required.length) allowed.add(id);
  });
  return WEDDING_ITEMS.filter(w => allowed.has(w.id));
}

// True when every required item has been acquired
export function isLevelComplete(level, acquiredItems) {
  return level.required.every(id => acquiredItems.includes(id));
}
