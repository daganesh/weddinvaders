# Testing

## Framework
**No automated test suite.** Verification is 100% manual using the Vite preview server.

## How to Verify Changes

### Start the dev server
```bash
npm run dev
# → http://localhost:5173
```

### Manual test checklist (run after any change)
1. **Title screen** — loads without errors; ammo legend visible; click/Space starts game.
2. **Player movement** — Groom: ←/→ move, ↑/↓ cycle ammo, Space/Enter shoot. Bride: A/D move, W shoot, S cycle ammo.
3. **Ammo types** — 💵 cash reduces item HP; 💌 invite targets guest items; 💕 heart targets family items.
4. **Item acquisition** — shoot item to 0 HP → popup message, item added to acquired list, side panel checkmark updates.
5. **Income items** — shooting a guest with invite gives random $100–$300; family with heart gives $300–$500.
6. **Side panel** — right 110px shows required items with checkmarks as acquired.
7. **Level complete** — acquire all required items → players walk to center → couple image appears → "Level Complete!" → press any key → next level.
8. **N key fast-forward** — once all required items acquired, press N to advance rows toward center.
9. **Game over** — lose all lives → lost overlay → click to restart.
10. **All 5 levels** — play through or use browser console to jump levels if needed.

## Browser Console Checks
Open DevTools → Console. After each major change verify:
- No uncaught errors or warnings during gameplay
- No "undefined" or "NaN" appearing in HUD values

## Build Verification
```bash
npm run build   # must complete without errors
npm run preview # spot-check the production build looks identical to dev
```

## Lint
```bash
npm run lint    # must pass with 0 errors before committing
```
