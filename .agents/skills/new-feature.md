# New Feature Workflow

Use this skill when adding new items, ammo types, levels, game phases, or UI changes.

## Steps

### Adding a new wedding item
1. Add an entry to `WEDDING_ITEMS` in `src/constants.js`:
   ```js
   { id: 'myItem', emoji: '🎵', label: 'Band', price: 400,
     essential: false, exclusiveTo: null, incomeType: null }
   ```
2. Add `'myItem'` to the `optional` or `required` array of the relevant level(s) in `src/levels.js`.
3. Verify the item spawns and can be purchased in the preview.

### Adding a new level
1. Append a level object to `LEVELS` in `src/levels.js`. Follow the existing shape exactly.
   - `money` **must** be a multiple of $100.
   - `required` must be a subset of items defined in `WEDDING_ITEMS`.
   - `id` must be sequential (next integer after last level).
2. No other files need changing — `getSpawnPool()` and `isLevelComplete()` are generic.

### Adding a new ammo type
1. Add the ammo key to `AMMO_ORDER` and `AMMO_META` in `src/constants.js`.
2. Add `AMMO_DAMAGE[newType]` in `src/constants.js`.
3. Add the ammo count to `getInitialState()` in `src/useGameState.js`.
4. Handle the ammo type in `fireBullet()` (cost deduction) and `handleCollision()` (effect).
5. Update `drawHUD()` in `src/renderer.js` to display the new ammo count.

### Adding a new game phase
1. Add phase handling to `update()` in `src/useGameState.js` (early-return for phases that pause the loop).
2. Add a draw branch in `render()` in `src/renderer.js`.
3. Add `handleCanvasClick` / keyboard handling in `src/Game.jsx`.
4. Update `game-design.md` phase table.

### UI / layout changes
- Canvas is `CANVAS_WIDTH × GAME_HEIGHT` (910×600). Play area is `GAME_WIDTH × PLAY_HEIGHT` (800×540). Panel is 110px wide on the right.
- All canvas drawing is in `src/renderer.js` — no DOM elements for game objects.
- CSS layout changes (wrapper, mobile controls) go in `src/Game.css`.

## Verify
```bash
npm run dev     # manual test per testing.md checklist
npm run lint    # must pass
npm run build   # must succeed
```

## After the feature
Update `.agents/knowledge/` if the change affects architecture, item IDs, level structure, or dev workflow — commit knowledge update separately from feature commit.
