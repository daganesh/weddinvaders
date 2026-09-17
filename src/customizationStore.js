import { WEDDING_ITEMS } from './constants';

import ringsIcon        from './assets/icons/rings.svg';
import officiantIcon    from './assets/icons/officiant.svg';
import cateringIcon     from './assets/icons/catering.svg';
import guestIcon        from './assets/icons/guest.svg';
import parentBrideIcon  from './assets/icons/parent_bride.svg';
import parentGroomIcon  from './assets/icons/parent_groom.svg';
import discountIcon     from './assets/icons/discount.svg';
import mineIcon         from './assets/icons/mine.svg';
import hourglassIcon    from './assets/icons/hourglass.svg';
import flowersIcon      from './assets/icons/flowers.svg';
import suitIcon         from './assets/icons/suit.svg';
import cakeIcon         from './assets/icons/cake.svg';

const STORAGE_KEY = 'weddinvaders:customization:v2';

export const DEFAULT_PACKAGE_ID  = 'default';
export const EIGHTIES_PACKAGE_ID = '80s';

// Every id in WEDDING_ITEMS doubles as an `images` key, so each collectible
// can carry its own customizable icon alongside the bride/groom/couple slots.
const ITEM_IMAGE_KEYS = WEDDING_ITEMS.map(w => w.id);

function emptyItemImages() {
  return Object.fromEntries(ITEM_IMAGE_KEYS.map(id => [id, null]));
}

// Mirrors every currently-hardcoded value in renderer.js/constants.js/levels.js,
// so the default package produces today's game unchanged. Also used by
// renderer.js as its ultimate fallback when called without a config at all.
// Every item-icon slot is null here — renderer.js falls back to the item's
// emoji, exactly like a null bride/groom/couple slot falls back to the
// bundled portrait PNG.
export const DEFAULT_CONFIG = {
  images: {
    bride: null,   // data URL or null -> fall back to bundled bride-nobg.png
    groom: null,
    couple: null,
    ...emptyItemImages(),
  },
  colors: {
    bgTop: '#1a3a70',
    bgMid: '#22478a',
    bgBot: '#1a3a70',
    accent: '#ffd700',
    brideColor: '#ff69b4',
    groomColor: '#4169e1',
  },
  text: {
    title: "WEDDIN'VADERS",
    tagline: 'Buy the wedding of your dreams!',
    winMessage: "🎉 YOU'RE MARRIED! 🎉",
    loseMessage: '💔 Wedding Failed!',
    names: { bride: 'Bride', groom: 'Groom' },
    familyLabels: { bride: 'Her Family', groom: 'His Family' },
    // Parallel array to LEVELS in levels.js, indexed by array position.
    levels: [
      { name: 'Save the Date', subtitle: 'Just the basics — one ring to rule them all!' },
      { name: 'The Ceremony', subtitle: 'Someone needs to officiate this thing.' },
      { name: 'The Reception', subtitle: 'You have to feed your guests!' },
      { name: 'The Full Wedding', subtitle: 'Fashion matters. So does cake.' },
      { name: 'Dream Wedding', subtitle: 'The whole package. Watch out for traps!' },
    ],
  },
};

// Second built-in, protected package: swaps every item's icon for the
// hand-built 80s-arcade pixel-art SVGs (see src/assets/icons/) and a matching
// retro palette. Portraits are left unset (same bundled photos as Default).
export const EIGHTIES_CONFIG = {
  ...structuredClone(DEFAULT_CONFIG),
  images: {
    bride: null,
    groom: null,
    couple: null,
    rings: ringsIcon,
    officiant: officiantIcon,
    catering: cateringIcon,
    guest: guestIcon,
    parent_bride: parentBrideIcon,
    parent_groom: parentGroomIcon,
    discount: discountIcon,
    mine: mineIcon,
    hourglass: hourglassIcon,
    flowers: flowersIcon,
    suit: suitIcon,
    cake: cakeIcon,
  },
  colors: {
    bgTop: '#0d0d1f',
    bgMid: '#161636',
    bgBot: '#0d0d1f',
    accent: '#ffd23f',
    brideColor: '#ff3fa0',
    groomColor: '#33e6ff',
  },
};

// Protected, code-defined packages available out of the box on every deploy —
// never persisted to localStorage, can't be edited/renamed/deleted, only
// selected as active or used as a "copy from" source for a new package.
const SYSTEM_PACKAGES = {
  [DEFAULT_PACKAGE_ID]:  { name: 'Default',    config: DEFAULT_CONFIG },
  [EIGHTIES_PACKAGE_ID]: { name: '80s Arcade', config: EIGHTIES_CONFIG },
};

function isSystemId(id) {
  return Object.prototype.hasOwnProperty.call(SYSTEM_PACKAGES, id);
}

function systemPackage(id) {
  const { name, config } = SYSTEM_PACKAGES[id];
  return { id, name, isDefault: true, ...structuredClone(config) };
}

// Deep-merges a partial content object (images/colors/text) over DEFAULT_CONFIG,
// so a partial/missing/corrupt package never leaves a field undefined.
function mergeContent(partial) {
  return {
    images: { ...DEFAULT_CONFIG.images, ...partial?.images },
    colors: { ...DEFAULT_CONFIG.colors, ...partial?.colors },
    text: {
      ...DEFAULT_CONFIG.text,
      ...partial?.text,
      names: { ...DEFAULT_CONFIG.text.names, ...partial?.text?.names },
      familyLabels: { ...DEFAULT_CONFIG.text.familyLabels, ...partial?.text?.familyLabels },
      levels: DEFAULT_CONFIG.text.levels.map((d, i) => ({ ...d, ...partial?.text?.levels?.[i] })),
    },
  };
}

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// Builds the full { activePackageId, packages } store, always including the
// (code-defined, never persisted) system packages plus any saved custom ones.
function normalizeStore(raw) {
  const packages = {};
  for (const id of Object.keys(SYSTEM_PACKAGES)) packages[id] = systemPackage(id);
  if (raw?.packages && typeof raw.packages === 'object') {
    for (const [id, pkg] of Object.entries(raw.packages)) {
      if (isSystemId(id) || !pkg || typeof pkg.name !== 'string') continue;
      packages[id] = { id, name: pkg.name, isDefault: false, ...mergeContent(pkg) };
    }
  }
  const activePackageId = raw?.activePackageId && packages[raw.activePackageId]
    ? raw.activePackageId
    : DEFAULT_PACKAGE_ID;
  return { activePackageId, packages };
}

function writeStore(store) {
  const packages = {};
  for (const [id, pkg] of Object.entries(store.packages)) {
    if (isSystemId(id)) continue; // derived from code, never persisted
    packages[id] = pkg;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, activePackageId: store.activePackageId, packages }));
}

function isNameTaken(store, name, excludeId) {
  const norm = name.trim().toLowerCase();
  return Object.values(store.packages).some(p => p.id !== excludeId && p.name.trim().toLowerCase() === norm);
}

// ── Public API — the only surface every other module should depend on.

export function listPackages() {
  const { packages } = normalizeStore(readRaw());
  return Object.values(packages).sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function getActivePackageId() {
  return normalizeStore(readRaw()).activePackageId;
}

export function getPackage(id) {
  const { packages } = normalizeStore(readRaw());
  return packages[id] ?? packages[DEFAULT_PACKAGE_ID];
}

// Resolves the config the running game should actually render with.
export function getActiveConfig() {
  const store = normalizeStore(readRaw());
  return store.packages[store.activePackageId] ?? store.packages[DEFAULT_PACKAGE_ID];
}

export function setActivePackage(id) {
  const store = normalizeStore(readRaw());
  if (!store.packages[id]) throw new Error('Package not found.');
  store.activePackageId = id;
  writeStore(store);
  return id;
}

// Creates a new package seeded from another package's values (default,
// unless a different copyFromId is given — a system package or any existing
// custom package both work).
export function createPackage(name, copyFromId = DEFAULT_PACKAGE_ID) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) throw new Error('Package name is required.');
  const store = normalizeStore(readRaw());
  if (isNameTaken(store, trimmed)) throw new Error(`A package named "${trimmed}" already exists.`);
  const source = store.packages[copyFromId] ?? store.packages[DEFAULT_PACKAGE_ID];
  const id = `pkg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const pkg = {
    id,
    name: trimmed,
    isDefault: false,
    ...structuredClone({ images: source.images, colors: source.colors, text: source.text }),
  };
  store.packages[id] = pkg;
  writeStore(store);
  return pkg;
}

// Overwrites a non-system package's content (images/colors/text).
export function updatePackage(id, content) {
  if (isSystemId(id)) throw new Error('System packages are read-only.');
  const store = normalizeStore(readRaw());
  const existing = store.packages[id];
  if (!existing) throw new Error('Package not found.');
  const updated = { ...existing, ...mergeContent(content) };
  store.packages[id] = updated;
  writeStore(store);
  return updated;
}

export function renamePackage(id, newName) {
  if (isSystemId(id)) throw new Error('System packages cannot be renamed.');
  const trimmed = (newName ?? '').trim();
  if (!trimmed) throw new Error('Package name is required.');
  const store = normalizeStore(readRaw());
  if (!store.packages[id]) throw new Error('Package not found.');
  if (isNameTaken(store, trimmed, id)) throw new Error(`A package named "${trimmed}" already exists.`);
  store.packages[id] = { ...store.packages[id], name: trimmed };
  writeStore(store);
  return store.packages[id];
}

export function deletePackage(id) {
  if (isSystemId(id)) throw new Error('System packages cannot be removed.');
  const store = normalizeStore(readRaw());
  if (!store.packages[id]) return;
  delete store.packages[id];
  if (store.activePackageId === id) store.activePackageId = DEFAULT_PACKAGE_ID;
  writeStore(store);
}
