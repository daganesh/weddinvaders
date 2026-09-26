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
   760px viewport width, where the game preview box should span the **full** width of the column
   (same width as the RSVP form above/below it), not just a narrow strip — check its actual
   bounding-box width against `.home-main`'s, since it's easy for this to silently regress back to
   shrink-wrapped. Below that, only the admin's external "Extra Links" (Add to Calendar/Venue
   Maps/custom links, if any) appear — there's no separate Registry/Songs/Food link row on the home
   page itself; that navigation lives in the RSVP confirmation view's buttons and the header
   hamburger (see 2b). "START GAME" navigates to `#/game` regardless of RSVP status (canvas inside a
   bordered game frame, jumping straight to mode-select — no title screen in between — with a short
   rules/explanation paragraph shown once above the mode buttons). **Use in-app links to navigate
   (click, or the hamburger), not the browser's address bar/`page.goto` in a test script** — a full
   page load resets all component state, which looks identical to a real bug (an in-progress run
   resetting) but isn't one.
2. **RSVP flow** — on the home page: fill name + pick attending/declining (big choice buttons, not a
   dropdown) → guest-count +/- stepper appears only when attending → submit ("💌 SEND WITH LOVE",
   disabled until name + a choice are set) → confirmation view (in place of the form, still at 66%
   width) shows a tailored message and buttons into Songs/Food (attending only, respecting the
   enabled toggles), Registry (always), and "Change my RSVP" — this **is** the "confirmation + do you
   want to request songs/food" screen, there's no separate one, and these buttons are the **only**
   in-app Registry/Songs/Food navigation on the home page (besides the header hamburger) — there
   should be no second, smaller link row duplicating them further down the page. All of these buttons
   should look like one uniform stack — same width, same height (check via the browser inspector or a
   bounding-box comparison if unsure; a few px of height difference from a button's own border is a
   regression, see `PagesShared.css`'s `.big-btn`), not a mix of full-width and side-by-side-halved
   buttons. Reload the page — should show the confirmation again, not a blank form. Query-string
   prefill: the query string must come *before* the hash (e.g. `?name=Test&email=a@b.com#/` or the
   equivalent `#/rsvp` alias —
   `?name=...#/rsvp` also works, but `#/rsvp?name=...` does **not**, since everything after `#` is
   the hash, not `location.search`) and should pre-fill those fields when no RSVP exists yet.
2b. **Gating** — before any RSVP: Registry/Songs/Food show a "Not yet!" `GateNotice` linking back to
   the home page ("💌 Go to RSVP", `href="#/"`); the hamburger's items show 🔒 (the home page itself
   has no separate locked pill row of its own — see 1 above). After RSVP: Registry unlocks (even if
   declined); Songs/Food additionally require attending=yes. Lock icons should update **immediately**
   after submitting, without needing to navigate elsewhere first.
2c. **Songs/Food pages** — add/remove a song request; save food/allergy notes and see the
   confirmation line. Toggling `songsEnabled`/`foodEnabled` off in Admin's Pages section should hide
   the corresponding hamburger menu item and show a plain "not collecting this" message if
   visited directly.
2d. **Registry** — set a Registry URL in Admin's Pages section; verify the unlocked page's button
   opens it in a new tab (via `withProtocol()` — a bare domain gets `https://` prepended).
3. **Header** — the "☰" menu (sticky — present on every page, stays visible while scrolling) lists
   "💌 Invitation & RSVP" (one entry, not two) plus every other page and Admin/About; clicking the
   banner navigates home. About opens a modal with a
   fixed credit line, plus an organizer link/name when set in Admin's "About / Organizer Credit"
   section — verify it closes via its Close button and via clicking outside it.
4. **Player movement** — Groom: ←/→ move, ↑/↓ cycle ammo, Space/Enter shoot. Bride: A/D move, W shoot, S cycle ammo.
5. **Ammo types (only two now)** — 💵 cash reduces purchasable-item HP; 💌 envelope targets **both**
   guest and family items — hitting family (👩‍👧/👨‍👦) should pay noticeably more ($300–$500) than a
   guest (👥, $100–$300). Cycling ammo (S / ↑↓) should only ever land on cash or envelope — no third
   type.
5b. **HUD layout and ammo visibility** — the HUD's top row should show 💌 envelope count (left) and
   💰 money (right) flanking the timer, in the **same font and size** as each other — noticeably
   larger than the small "which ammo is selected" labels — and both should turn red once low (money
   `< $200`, envelope `≤ 2`) the same way, not just money. The ❤️ lives readout should be on the
   **bottom** row (left), not the top. Spend both ammo types all the way to zero — shooting should
   stop entirely (`use-game-state.md`'s `outOfAmmo` fast-forward kicks in), and the HUD numbers
   should make it obvious why, without needing to guess.
5c. **First-time ammo hint** — clear `localStorage`, then start a brand-new game (mode-select →
   any mode): a bordered banner should appear **vertically centered in the play field** (not pinned
   to the very top), with clearly large text (close in size to the floating "−1 life"/"got away"
   callouts, not small HUD-label-sized text), for the first several seconds of Level 1, showing a
   short cash tip ("💵 Cash → buy wedding items"), then — after a few seconds — swap to an equally
   short envelope tip ("💌 Envelope → guests & family"), then fade out for good. On a narrow mobile
   viewport, check the text doesn't overflow its bordered box. Reload the page and start another
   game (without clearing storage again) — the banner should **not** reappear, on Level 1 or any
   other level, however many times the game is restarted/replayed in that browser afterward.
5d. **Floating item toasts on mobile** — on a narrow/mobile-portrait viewport, shoot an item to
   acquire it or hit a guest/family member for income — the floating "+$150"/"+250pts"-style toast
   that pops up should read at a clearly legible size (scaled up along with the larger mobile item
   cards/sprites — `constants.md`'s `ITEM_WIDTH`), not the same small size as on desktop.
6. **Item acquisition** — shoot item to 0 HP → popup message, item added to acquired list, side panel checkmark updates.
7. **Income items** — shooting a guest with an envelope gives random $100–$300; family gives $300–$500.
8. **Side panel** — right 110px shows required items with checkmarks as acquired.
8b. **Required-item pacing** — on a level with 2+ required items (e.g. Level 2 — rings + officiant),
   the side panel's second required item shouldn't be spawnable from the very first second; it should
   start appearing only partway into the level (staggered by `elapsedFraction` — see
   `game-design.md`'s "Required-Item Pacing"). You shouldn't be able to acquire every required item
   in the first 10–15 seconds the way an earlier version allowed.
8c. **Money and envelopes persist across levels, topped up** — note the money/envelope totals right
   before a level ends, then check the new level's starting totals equal what carried over **plus**
   that level's grant (e.g. carrying $340 into Level 2 should start Level 2 at $340 + $800 = $1140),
   not a flat reset to a fixed per-level amount. Level 1 itself should start at $600 / ×16 envelopes
   (the fresh-game amounts), not the old $9900. The "+$X & +N 💌 waiting for you!" line should appear
   on both the meeting cutscene and the levelComplete overlay before advancing, showing the exact
   grant the next level is about to add (not the final level, which has nothing further to add to).
8d. **Time speeds up after required items are done** — once a level's required items are all
   acquired, the on-screen clock (not just the row-advance rate) should visibly count down faster
   than 1 second per real second.
9. **Level complete** — acquire all required items → players walk to center → couple image appears → "Level Complete!" → press any key → next level. A "💌 Back to Invite & RSVP" link should also appear on this screen (and on every other level boundary — full-game win, a loss, or time-out).
10. **N key fast-forward (desktop) / Skip button (mobile)** — once all required items acquired,
    press N (desktop) to advance rows toward center; on a narrow/mobile viewport in **solo mode**, a
    "⏩ Skip" button should appear next to "🔄 Switch Ammo" once required items are done (and not
    before), doing the same thing. The hint text ("Swipe canvas to move · Tap to shoot") should sit
    *below* that button row, not above it.
11. **No orientation flip in solo-as-groom** — choose "Solo as Groom": the controllable groom sprite
    should still start at its **usual top-right corner**, facing/shooting down, exactly like Couple
    mode and Solo as Bride — not moved to the bottom-left or rotated. The parked bride placeholder
    should sit at the bottom-left the whole time. (An earlier version inverted this so the
    human-controlled character always started at the bottom; that was reverted per feedback.)
12. **Game over** — lose all lives → lost overlay → click to restart (this resets money/envelopes to
    a fresh Level 1 start, unlike advancing to a next level, which carries the balance forward).
12b. **Life-loss feedback** — get hit by a mine (Level 4+): a big, screen-centered "💣 TRAP! −1 life"
    message should appear immediately, plus a brief red flash behind the HUD's hearts — not just a
    heart silently disappearing. Separately, let a required item fly all the way off-screen without
    shooting it: a big, screen-centered orange "⚠️ <item> got away!" message should appear (no "−1
    life" wording), but the heart count should **not** change and the HUD should **not** flash — a
    missed item is a heads-up only, it costs nothing.
12c. **Level failure retries the level, not the whole game** — let a level's timer run out (or let
    the players meet) without acquiring every required item: a "💔 Level Failed" overlay should
    appear (not the full "Wedding Failed!" game-over screen) naming what was missing, "−1 life · N
    lives left", and "Press any key to retry this level". Pressing any key (or clicking, on mobile)
    should restart the **same** level with the same starting money/envelopes it began with (not a
    reset, not carrying over the failed attempt's spending) and one fewer life. Repeating this until
    lives hit 0 should **then** show the real "Wedding Failed!" full game-over overlay with "❤️ Ran
    out of lives" and "Press R to try again".
12d. **Level 2's required items don't leave a long guests-only gap** — playing Level 2 without
    shooting anything required, the second required item (officiant) should become spawnable well
    before the level's midpoint (around 30% of its duration, not 50%) — you shouldn't see several
    spawn cycles of nothing but guests/family/extras before it first appears.
13. **All 5 levels** — play through or use browser console to jump levels if needed.
14. **Couple mode hidden on mobile** — at a viewport ≤840px wide, the mode-select screen should show
    only "Solo as Bride"/"Solo as Groom", no "👰🤵 Couple" button; above 840px, all three should
    appear. Since this check runs once at page load (`IS_MOBILE_LAYOUT`, `constants.js`), resizing an
    already-open tab won't change it — reload at the target width to test.
15. **No exclusivity in Solo mode** — playing Solo as Bride, "His Family" (👨‍👦) and "Suit" (🤵,
    Level 4+) should be hittable and acquirable with the right ammo, same as playing Solo as Groom
    should let you acquire "Her Family" (👩‍👧) and "Flowers" (💐, Level 4+) — none of these should
    just flash and stay untouched the way they would (correctly) in Couple mode when the wrong role
    shoots them. Couple mode itself is unaffected — bride still can't take groom's exclusive items
    and vice versa.

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
