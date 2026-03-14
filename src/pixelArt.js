// ---------------------------------------------------------------------------
//  Pixel-art sprite definitions  (8 × 8 grid, 5 px per cell = 40 × 40 px)
// ---------------------------------------------------------------------------

const P = {
  '.': null,
  W: '#f5f5f0',   // white / cream
  G: '#ffd700',   // gold
  g: '#b09000',   // dark gold
  R: '#e05070',   // rose / pink
  r: '#a03060',   // dark rose
  P: '#d050e0',   // purple
  K: '#1a1a2e',   // near-black
  O: '#c06010',   // orange-brown
  E: '#40b858',   // green
  e: '#208040',   // dark green
  B: '#5080e0',   // blue
  N: '#c87840',   // brown / tan
  Y: '#ffee44',   // yellow
};

const SPRITES = {
  rings: [
    '..GgGg..',
    '.G....G.',
    'G..WW..G',
    'G.WWWW.G',
    'G..WW..G',
    '.G....G.',
    '..GgGg..',
    '........',
  ],
  officiant: [
    '...WW...',
    '...WW...',
    '.WWWWWW.',
    'WWWWWWWW',
    '.WW..WW.',
    '.WW..WW.',
    '.WWWWWW.',
    '........',
  ],
  catering: [
    '........',
    'WWWWWWWW',
    'W......W',
    'W.OOOO.W',
    'WWWWWWWW',
    '...WW...',
    '.WWWWWW.',
    '........',
  ],
  guest: [
    '.WW.WW..',
    '.WW.WW..',
    'WWWWWWW.',
    'WW....WW',
    '.W....W.',
    '.W....W.',
    '........',
    '........',
  ],
  parent_bride: [
    '.WW.WW..',
    '.WW.WW..',
    'WWWWWWW.',
    '.W..WW..',
    '.W..WW..',
    '....WW..',
    '........',
    '........',
  ],
  parent_groom: [
    '.KK.KK..',
    '.KK.KK..',
    'KKKKKKK.',
    '.K..KK..',
    '.K..KK..',
    '....KK..',
    '........',
    '........',
  ],
  discount: [
    'P.....P.',
    'PP...PP.',
    '.PPPPP..',
    '..PPP...',
    '.PPPPP..',
    'PP...PP.',
    'P.....P.',
    '........',
  ],
  mine: [
    '....Y...',
    '..KKKK..',
    '.KKKKKK.',
    'KK.K.KKK',
    '.KKKKKK.',
    '..KKKK..',
    '....K...',
    '........',
  ],
  flowers: [
    'R.R.R.R.',
    'RRRRRRRR',
    '.RRRRRR.',
    '..GGGG..',
    '...Ee...',
    '..EEEE..',
    '...EE...',
    '........',
  ],
  suit: [
    '.KKKKKK.',
    'KK.WW.KK',
    'KK.WW.KK',
    'KKWWWWKK',
    '.KK..KK.',
    '.KK..KK.',
    '........',
    '........',
  ],
  cake: [
    '..R.R...',
    '.RRRRR..',
    '.RWWWR..',
    'WWWWWWWW',
    '.RWWWR..',
    'WWWWWWWW',
    '........',
    '........',
  ],
};

// Pixels per cell (40 × 40 sprite at scale 5)
export const PIXEL_SIZE   = 5;
export const SPRITE_COLS  = 8;
export const SPRITE_ROWS  = 8;
export const SPRITE_W     = SPRITE_COLS * PIXEL_SIZE; // 40
export const SPRITE_H     = SPRITE_ROWS * PIXEL_SIZE; // 40

export function drawPixelSprite(ctx, templateId, x, y, scale = 1) {
  const sprite = SPRITES[templateId] ?? SPRITES.rings;
  const ps = PIXEL_SIZE * scale;
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const color = P[sprite[row][col]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x + col * ps), Math.floor(y + row * ps), ps, ps);
    }
  }
}
