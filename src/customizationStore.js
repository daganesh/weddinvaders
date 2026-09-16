const STORAGE_KEY = 'weddinvaders:customization:v1';

// Mirrors every currently-hardcoded value in renderer.js/constants.js/levels.js,
// so an empty/first-run localStorage produces today's game unchanged.
export const DEFAULT_CONFIG = {
  version: 1,
  images: {
    bride: null,   // data URL or null -> fall back to bundled bride-nobg.png
    groom: null,
    couple: null,
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

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mergeConfig(partial) {
  if (!partial) return structuredClone(DEFAULT_CONFIG);
  return {
    version: DEFAULT_CONFIG.version,
    images: { ...DEFAULT_CONFIG.images, ...partial.images },
    colors: { ...DEFAULT_CONFIG.colors, ...partial.colors },
    text: {
      ...DEFAULT_CONFIG.text,
      ...partial.text,
      familyLabels: { ...DEFAULT_CONFIG.text.familyLabels, ...partial.text?.familyLabels },
      levels: DEFAULT_CONFIG.text.levels.map((d, i) => ({ ...d, ...partial.text?.levels?.[i] })),
    },
  };
}

// Storage boundary: this is the only module that touches localStorage directly,
// so it can be swapped for a real API/DB client later without changing callers.
export function getConfig() {
  return mergeConfig(readRaw());
}

export function saveConfig(config) {
  const merged = mergeConfig(config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export function resetToDefaults() {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(DEFAULT_CONFIG);
}
