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
1. **Home page (InviteScreen)** — loads at `#/` (or no hash) without errors; couple names/date/venue
   header, then a two-column area: the RSVP form at ~66% width (left/top), a small animated game
   preview + "▶ START GAME" at ~33% (right/bottom) — stacks to a single column, RSVP first, under a
   760px viewport width. Below that, page-nav pills for Registry and (if enabled) Songs/Food show a
   🔒 and dimmed style before any RSVP (RSVP itself has no pill — it's the form right there). "START
   GAME" navigates to `#/game` regardless of RSVP status (canvas inside a bordered game frame,
   jumping straight to mode-select — no title screen in between — with a short rules/explanation
   paragraph shown once above the Couple/Solo/Solo buttons). **Use in-app links to navigate
   (click, or the hamburger), not the browser's address bar/`page.goto` in a test script** — a full
   page load resets all component state, which looks identical to a real bug (an in-progress run
   resetting) but isn't one.
2. **RSVP flow** — on the home page: fill name + pick attending/declining (big choice buttons, not a
   dropdown) → guest-count +/- stepper appears only when attending → submit ("💌 SEND WITH LOVE",
   disabled until name + a choice are set) → confirmation view (in place of the form, still at 66%
   width) shows a tailored message and buttons into Songs/Food (attending only, respecting the
   enabled toggles) and Registry (always) — this **is** the "confirmation + do you want to request
   songs/food" screen, there's no separate one. Reload the page — should show the confirmation
   again, not a blank form. Query-string prefill: the query string must come *before* the hash (e.g.
   `?name=Test&email=a@b.com#/` or the equivalent `#/rsvp` alias — `?name=...#/rsvp` also works, but
   `#/rsvp?name=...` does **not**, since everything after `#` is the hash, not `location.search`)
   and should pre-fill those fields when no RSVP exists yet.
2b. **Gating** — before any RSVP: Registry/Songs/Food show a "Not yet!" `GateNotice` linking back to
   the home page ("💌 Go to RSVP", `href="#/"`); the home page's page-nav pills and the hamburger's
   items show 🔒. After RSVP: Registry unlocks (even if declined); Songs/Food additionally require
   attending=yes. Lock icons should update **immediately** after submitting, without needing to
   navigate elsewhere first.
2c. **Songs/Food pages** — add/remove a song request; save food/allergy notes and see the
   confirmation line. Toggling `songsEnabled`/`foodEnabled` off in Admin's Pages section should hide
   the corresponding page-nav pill/menu item and show a plain "not collecting this" message if
   visited directly.
2d. **Registry** — set a Registry URL in Admin's Pages section; verify the unlocked page's button
   opens it in a new tab (via `withProtocol()` — a bare domain gets `https://` prepended).
3. **Header** — the "☰" menu (sticky — present on every page, stays visible while scrolling) lists
   "💌 Invitation & RSVP" (one entry, not two) plus every other page and Admin/About; clicking the
   banner navigates home. About opens a modal with a
   fixed credit line, plus an organizer link/name when set in Admin's "About / Organizer Credit"
   section — verify it closes via its Close button and via clicking outside it.
4. **Player movement** — Groom: ←/→ move, ↑/↓ cycle ammo, Space/Enter shoot. Bride: A/D move, W shoot, S cycle ammo.
5. **Ammo types** — 💵 cash reduces item HP; 💌 invite targets guest items; 💕 heart targets family items.
6. **Item acquisition** — shoot item to 0 HP → popup message, item added to acquired list, side panel checkmark updates.
7. **Income items** — shooting a guest with invite gives random $100–$300; family with heart gives $300–$500.
8. **Side panel** — right 110px shows required items with checkmarks as acquired.
9. **Level complete** — acquire all required items → players walk to center → couple image appears → "Level Complete!" → press any key → next level. A "💌 Back to Invite & RSVP" link should also appear on this screen (and on every other level boundary — full-game win, a loss, or time-out).
10. **N key fast-forward** — once all required items acquired, press N to advance rows toward center.
11. **Game over** — lose all lives → lost overlay → click to restart.
12. **All 5 levels** — play through or use browser console to jump levels if needed.

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
