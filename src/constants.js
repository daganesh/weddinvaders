// A phone held vertically is narrow and tall — the opposite aspect ratio of
// this game's default landscape-ish board. Rather than letterboxing a fixed
// desktop-shaped board inside a tall screen (leaving most of the height
// empty, as `max-width: 100%; height: auto` alone would), narrow/portrait
// viewports get their own, taller-and-narrower logical board. Every other
// module reads dimensions from these exported constants rather than hardcoding
// numbers, so this is the only place the two profiles need to be chosen —
// evaluated once at module load (no resize listener anywhere in this
// codebase yet), so rotating the device mid-session keeps whichever profile
// was picked at load.
const IS_MOBILE_PORTRAIT =
  typeof window !== 'undefined' &&
  window.innerWidth <= 640 &&
  window.innerHeight > window.innerWidth;

// Matches Game.css's `@media (max-width: 840px)` breakpoint — the same one
// that swaps the keyboard-control legend for on-screen touch buttons. Used
// by Game.jsx to hide the Couple mode-select option below that width: two
// players' worth of on-screen ammo/shoot buttons plus swipe gestures on one
// small screen was reported as too much to track at once, so Couple is
// desktop/keyboard-only — a touch-width viewport only offers Solo. Same
// load-time-only evaluation as `IS_MOBILE_PORTRAIT` above (no resize
// listener anywhere in this codebase).
export const IS_MOBILE_LAYOUT = typeof window !== 'undefined' && window.innerWidth <= 840;

export const GAME_WIDTH   = IS_MOBILE_PORTRAIT ? 460 : 800;
export const PANEL_WIDTH  = IS_MOBILE_PORTRAIT ? 92  : 110; // side checklist panel
export const CANVAS_WIDTH = GAME_WIDTH + PANEL_WIDTH; // 552 mobile / 910 desktop

export const TOTAL_ROWS   = 9; // rows 0-8, same board depth on every device
export const ROW_HEIGHT   = IS_MOBILE_PORTRAIT ? 80 : 60; // taller rows use more of a tall screen's height
export const PLAY_HEIGHT  = TOTAL_ROWS * ROW_HEIGHT;
export const HUD_HEIGHT   = 60;
export const GAME_HEIGHT  = PLAY_HEIGHT + HUD_HEIGHT; // 780 mobile / 600 desktop

// A narrower intrinsic canvas width means the same viewport width scales it
// up more (CSS `max-width: 100%` divides by a smaller CANVAS_WIDTH), so
// sprites/items/text drawn at the same logical pixel sizes below render
// visibly larger on a phone — no per-shape scaling math needed for that part.
// Concurrent flying items are capped lower on mobile so those now-larger
// item cards don't visually crowd/overlap a narrower play field.
export const MAX_CONCURRENT_ITEMS = IS_MOBILE_PORTRAIT ? 5 : 8;

// Player sizes and starting rows
export const PLAYER_WIDTH  = IS_MOBILE_PORTRAIT ? 96 : 62;
export const PLAYER_HEIGHT = IS_MOBILE_PORTRAIT ? 78 : 50;
export const PLAYER_SPEED  = 5;

export const GROOM_START_ROW = 0;                 // top
export const BRIDE_START_ROW = TOTAL_ROWS - 1;    // bottom = row 8

// Groom starts top-right corner, bride starts bottom-left
export const GROOM_START_X = GAME_WIDTH - PLAYER_WIDTH - 20;
export const BRIDE_START_X = 20;

// Projectiles
export const BULLET_SPEED  = 8;
export const BULLET_WIDTH  = 10;
export const BULLET_HEIGHT = 6;

// Flying items
export const ITEM_WIDTH  = IS_MOBILE_PORTRAIT ? 96 : 68;
export const ITEM_HEIGHT = IS_MOBILE_PORTRAIT ? 74 : 56; // fits in ROW_HEIGHT with a small margin top+bottom
export const ITEM_SPEED  = 1.5;

// Ammo labels used in HUD / cycling — only two types (feedback: three was
// confusing, and there was no real reason "guest" and "family" needed
// separate ammo). 💌 envelope now covers both guest and family targets;
// which one pays more is a property of the *item* (see WEDDING_ITEMS
// below), not the ammo.
export const AMMO_ORDER = ['cash', 'envelope'];
export const AMMO_META  = {
  cash:     { label: '💵', color: '#4caf50', description: 'Cash — pays for items' },
  envelope: { label: '💌', color: '#e91e63', description: 'Envelope — invites guests & family (family gives more)' },
};

// Item definitions
// spawnWeight controls relative spawn probability — higher = more common.
// Purchasable items (rings/officiant/catering/flowers/suit/cake) are weighted
// lower than before (10 → 6) so they don't crowd out everything else once
// several are unlocked at once late in a level — see levels.js's
// getSpawnPool() for the staggered-unlock pacing that works alongside this.
export const WEDDING_ITEMS = [
  // ── essentials (bought with cash) ──
  { id: 'rings',        emoji: '💍', label: 'Rings',          price: 500, essential: true,  exclusiveTo: null,    incomeType: null,       spawnWeight: 6 },
  { id: 'officiant',    emoji: '⛪', label: 'Officiant',       price: 300, essential: true,  exclusiveTo: null,    incomeType: null,       spawnWeight: 6 },
  { id: 'catering',     emoji: '🍽️', label: 'Catering',        price: 800, essential: true,  exclusiveTo: null,    incomeType: null,       spawnWeight: 6 },
  // ── income items — both need 💌 envelope ammo now; family pays more than
  // a regular guest, which is the only thing that still distinguishes them ──
  { id: 'guest',        emoji: '👥', label: 'Guest',       price: 0, essential: false, exclusiveTo: null,    incomeType: 'income', incomeAmount: 150, ammoRequired: 'envelope', spawnWeight: 5 },
  { id: 'parent_bride', emoji: '👩‍👧', label: 'Her Family',  price: 0, essential: false, exclusiveTo: 'bride', incomeType: 'income', incomeAmount: 400, ammoRequired: 'envelope', spawnWeight: 2 },
  { id: 'parent_groom', emoji: '👨‍👦', label: 'His Family',  price: 0, essential: false, exclusiveTo: 'groom', incomeType: 'income', incomeAmount: 400, ammoRequired: 'envelope', spawnWeight: 2 },
  // ── special ──
  { id: 'discount',     emoji: '🎀', label: 'Organizer',       price: 200, essential: false, exclusiveTo: null,    incomeType: 'discount', discountPct: 0.3,  ammoRequired: 'cash',  spawnWeight: 3 },
  { id: 'mine',         emoji: '💣', label: 'Trap',            price: 0,   essential: false, exclusiveTo: null,    incomeType: 'mine',     ammoRequired: null,                       spawnWeight: 3 },
  { id: 'hourglass',    emoji: '⏳', label: 'More Time',       price: 150, essential: false, exclusiveTo: null,    incomeType: 'time',     ammoRequired: 'cash',                     spawnWeight: 2 },
  // ── optional purchases ──
  { id: 'flowers',      emoji: '💐', label: 'Flowers',         price: 200, essential: false, exclusiveTo: 'bride', incomeType: null,       spawnWeight: 6 },
  { id: 'suit',         emoji: '🤵', label: 'Suit',            price: 250, essential: false, exclusiveTo: 'groom', incomeType: null,       spawnWeight: 6 },
  { id: 'cake',         emoji: '🎂', label: 'Cake',            price: 350, essential: false, exclusiveTo: null,    incomeType: null,       spawnWeight: 6 },
];

// Damage each ammo type does per bullet hit
export const AMMO_DAMAGE = { cash: 100, envelope: 1 };

// Timing
export const GAME_DURATION         = 90;  // seconds
export const ROW_ADVANCE_INTERVAL  = 18;  // seconds between each row advance
export const ROW_ADVANCE_SPEEDUP   = 2.5; // multiplier (row-advance *and* the time countdown) once all required items are acquired
export const HOURGLASS_SLOW_SECONDS = 15; // real seconds the hourglass item slows row-advance for
export const NO_AMMO_FASTFORWARD    = 10; // speed multiplier once cash and envelopes are both exhausted
