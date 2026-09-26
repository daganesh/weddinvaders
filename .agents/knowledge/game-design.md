# Game Design

## Concept
Two-player cooperative Space Invaders-style game. The **Bride** (bottom) and **Groom** (top) move toward each other across 9 rows, shooting flying wedding items to buy everything needed for their wedding before they meet in the middle.

## Game Phases
Before any of these, the app shows `InviteScreen.jsx` — a separate pre-game DOM screen (couple
names/date/venue, the invitation copy, the embedded RSVP form, and `GameTeaser.jsx`'s "▶ START GAME"
CTA), not part of this phase machine at all. That CTA skips the canvas `title` phase entirely, going
straight to `modeSelect` (see `architecture.md`'s "Home screen (InviteScreen) and the game page"),
where a short rules/explanation paragraph is shown once, above the mode buttons.

| Phase | Description |
|-------|-------------|
| `title` | The game's initial internal phase — no canvas screen is ever shown for it in normal play (superseded by `InviteScreen.jsx`); kept as `useGameState.js`'s starting state and `renderer.js`'s dispatch-table default. |
| `modeSelect` | Choose Couple or Solo (and which character) before the first level — see "Game Modes" below |
| `playing` | Main gameplay loop |
| `meeting` | Players reached the same row → couple image shown, then level result |
| `levelComplete` | Time ran out with all required items bought → next level |
| `gameComplete` | All 5 levels cleared |
| `levelFailed` | Failed this level's objective (see "Win / Lose Conditions" below) with at least one life left → costs one life, retries the **same** level on a keypress |
| `lost` | Ran out of lives entirely — the whole game ends |

## Game Modes
- **Couple** (default/original) — both bride and groom are controllable, exactly as described below.
  **Desktop/keyboard only** — the `modeSelect` screen hides this option below `constants.js`'s
  `IS_MOBILE_LAYOUT` width (840px, matching `Game.css`'s touch-controls breakpoint): two players'
  worth of on-screen ammo/shoot buttons plus swipe gestures on one small screen was reported as too
  much to track at once, so a touch-width viewport only offers Solo. See `game-jsx.md`.
- **Solo** — chosen at the `modeSelect` screen (Couple / Solo as Bride / Solo as Groom), reached from
  the title screen. Only the chosen role can move/shoot/cycle ammo; the other role is a parked,
  occasionally-blinking placeholder at its own **usual** starting corner (mainly for mobile, where the
  controls are simplified to swipe-to-move, tap-canvas-to-shoot, and a single "switch ammo" button —
  see `game-jsx.md`). **Neither role's starting corner, facing direction, or sprite orientation ever
  changes based on who's playing them** — groom is always top-right shooting down, bride is always
  bottom-left shooting up, in Couple mode and both Solo variants alike; picking "Solo as Groom" only
  changes which role responds to input, nothing about where it starts or which way it faces. (An
  earlier version inverted groom/bride's starting corners and rotated the sprite 180° so the
  human-controlled character always started at the bottom — feedback was that this was confusing/
  unwanted, so it was removed; see `use-game-state.md`'s `topRole`/`bottomRole`.) The row-advance/
  timer/win-lose rules are otherwise **unchanged** from Couple mode — solo is simply harder because
  only one shooter is acting against the same pace.

## Players
- **Groom** — starts top-right (row 0), moves down. Controls: ←/→ move, ↑/↓ cycle ammo, Space/Enter shoot.
- **Bride** — starts bottom-left (row 8), moves up. Controls: A/D move, W shoot, S cycle ammo.
- Both move one row at a time on a timed `rowAdvanceTimer`.
- Key bindings are handled in `onKey()` / `moveX()` in [`knowledge/use-game-state.md`](use-game-state.md).
- In Solo mode, only the chosen role's keys/taps do anything; the other role's inputs are ignored so
  it stays parked at its own usual corner (see "Game Modes") — the starting corner/movement direction
  described above is the same in every mode, including Solo as Groom.

## Ammo Types
Only two — feedback on an earlier three-ammo version (separate `invite`/`heart` types for guests vs.
family) was that it was confusing, with no real payoff for the extra complexity. 💌 envelope now
covers both; which target pays more is a property of the *item*, not the ammo (see Item Types below).

| Type | Key | Cost | Effect |
|------|-----|------|--------|
| 💵 Cash | `cash` | $100/shot (deducted from `money`) | Damages purchasable items (HP = price × priceScale) |
| 💌 Envelope | `envelope` | 1 envelope | Hits `guest` **or** `parent_bride`/`parent_groom` — family pays more (see below) |

## Item Types (defined in `src/constants.js` `WEDDING_ITEMS` — see [`knowledge/constants.md`](constants.md))
| ID | Emoji | Type | Notes |
|----|-------|------|-------|
| `rings` | 💍 | purchase (required) | Always required |
| `officiant` | ⛪ | purchase (required) | Level 2+ |
| `catering` | 🍽️ | purchase (required) | Level 3+ |
| `flowers` | 💐 | purchase (optional) | Bride-exclusive in Couple mode¹ |
| `suit` | 🤵 | purchase (optional) | Groom-exclusive in Couple mode¹ |
| `cake` | 🎂 | purchase (optional) | Level 4+ |
| `guest` | 👥 | income (envelope ammo) | Gives $100–$300 |
| `parent_bride` | 👩‍👧 | income (envelope ammo) | Bride-exclusive in Couple mode¹, gives $300–$500 |
| `parent_groom` | 👨‍👦 | income (envelope ammo) | Groom-exclusive in Couple mode¹, gives $300–$500 |

¹ **Not exclusive at all in Solo mode** — with only one shooter, restricting half the field to a role
nobody is playing would make those items (and, worse, Level 4/5's `suit`+`flowers` *required* items)
permanently unacquirable. `useGameState.js`'s collision check drops the `exclusiveTo` restriction
entirely when `mode === 'solo'`, so the solo player can hit and acquire everything.
| `discount` | 🎀 | discount | Reduces remaining item prices by 30% |
| `mine` | 💣 | trap | Explodes on contact, costs a life |
| `hourglass` | ⏳ | time (cash ammo) | Rare; slows row-advance pace *and the time countdown* for `HOURGLASS_SLOW_SECONDS` (15s) |

Family (`parent_bride`/`parent_groom`) and guests both need the same envelope ammo — the only thing
that still tells them apart is the payout (family gives noticeably more) plus their own icon/label,
same as before this change. "No ammo distinction between his family and her family" was already true
even in the old three-ammo version (both required `heart`); what changed is that guests now need the
same ammo as family too, instead of a separate `invite` type.

### Spawn Probability
Every item template has a `spawnWeight` in `WEDDING_ITEMS` (`constants.js`); `spawnItem()`
(`useGameState.js`'s `pickWeighted()`) does a cumulative-weight random pick, not a uniform one.
Purchasable items (rings/officiant/catering/flowers/suit/cake) are weight `6` (lowered from `10` —
see "Required-Item Pacing" below for why), `guest` is `5`, `parent_bride`/`parent_groom` are `2`
(rare), `discount`/`mine` are `3`, and `hourglass` is `2` (rare, same tier as family).

### Required-Item Pacing
Required items used to all be spawnable from level start, and — tied for the highest spawn weight —
got bought out almost immediately, leaving nothing but guest/family income items flying by for the
rest of the level (feedback: "very soon you buy all the items you need, and you're left with only
guests and family... until you finish the level"). `levels.js`'s `getSpawnPool(level,
elapsedFraction)` staggers each required item's first appearance across the level instead: the item
at `required[i]` only becomes spawnable once `elapsedFraction >= i / required.length` (0 at level
start, 1 at the end) — so `required[0]` is available immediately (Level 1's single required item,
`rings`, behaves exactly as before) while a level with several required items introduces them
gradually. Once unlocked, an item keeps spawning until acquired, same as always — only the *first*
appearance is delayed. Combined with the lower spawnWeight above, this keeps required items from
front-loading a level or crowding the field once several are unlocked at once.

That fraction is capped at `MAX_REQUIRED_GATE_FRACTION` (0.3) so it can't push a required item too
far into the level: without the cap, the *last* required item on an N-required level doesn't unlock
until `(N-1)/N` of the level's duration — Level 2's `officiant` (2 required items) didn't appear
until 50% of its 150s duration (75s in), leaving a long guests-only stretch with nothing else to
shoot for (feedback: "one of the items appears only very late in the game, after a long time of no
items at all"). Capping the threshold at 30% keeps the stagger (so a level with several required
items still doesn't dump them all at once) while guaranteeing every required item is spawnable well
before a level's back half, whatever `required.length` is — for Level 2 specifically, `officiant`
now unlocks at 45s instead of 75s.

## Level Structure (`src/levels.js`)
5 levels with increasing difficulty:

| Level | Name | Required Items | money¹ | envelopes¹ | priceScale | itemSpeed | hasMines |
|-------|------|---------------|-------|-----------|-----------|-----------|---------|
| 1 | Save the Date | rings | $600 | 16 | 0.1× | 1.5 | No |
| 2 | The Ceremony | rings, officiant | +$800 | +14 | 0.4× | 2.0 | No |
| 3 | The Reception | rings, officiant, catering | +$1000 | +14 | 0.65× | 2.5 | No |
| 4 | The Full Wedding | rings, officiant, catering, flowers, suit | +$1200 | +17 | 0.9× | 3.0 | Yes |
| 5 | Dream Wedding | rings, officiant, catering, flowers, suit, cake | +$1400 | +17 | 1.2× | 3.5 | Yes |

¹ Level 1's `money`/`envelopes` are the real starting amounts for a fresh game; every other level's
are a **top-up added to whatever's carried over** from the previous level, not a reset — see "Money
and Envelopes Persist Across Levels" below. Money must always be a multiple of $100 either way (cash
ammo costs $100/shot).

## Money and Envelopes Persist Across Levels
Both used to reset to each level's `money`/`invites`+`hearts` fields at the start of every level —
feedback was that starting money was "waaaaayyyy too much" (Level 1 alone was $9900, when its one
required item costs $50) and that a full reset per level removed any incentive to play carefully or
farm income early. Now: only Level 1's `money`/`envelopes` are the real starting amounts for a fresh
game (`CHOOSE_MODE`/`RESTART` in `useGameState.js`'s `handleAction`, which pass no carry-over at all);
every level-advance call site instead passes the player's current balance and envelope count as
`getInitialState`'s `carryOverMoney`/`carryOverEnvelopes` params, which are **added to** (not
replaced by) the new level's `money`/`envelopes` — so whatever's left over (or earned via
income) carries straight into the next level, topped up with a fresh grant on arrival. Retrying a
*failed* level (`RETRY_LEVEL`, see "Win / Lose Conditions" below) is the one exception: it passes
back the same `carryOverMoney`/`carryOverEnvelopes` the failed attempt itself started with (saved as
`levelStartMoney`/`levelStartEnvelopes`), recreating that level's original starting balance rather
than whatever was left after the failed attempt's spending.
This makes the early, easy levels an actual opportunity to build a cushion for the pricier required
items later on, rather than something to blow through carelessly since the next level "resets" it
anyway. What the next level will add is shown to the player ahead of time — a
"+$X & +N 💌 waiting for you!" line on both the `meeting` cutscene (`renderer.js`'s `drawMeeting`)
and the `levelComplete` overlay (`drawOverlay`), next to the "Next: Level N — name" text, reading
directly from `LEVELS[currentLevel + 1].money`/`.envelopes` — not shown after the final level, since
there's no next level to top up.

## Win / Lose Conditions
- **Win level**: All `required` items acquired when players meet (or time runs out with money ≥ 0).
- **Level failure** (players meet, or time runs out, without all required items — or money goes
  negative): costs exactly **one life** and, as long as a life remains, drops into the `levelFailed`
  phase — a screen explaining what was missing (reusing the same reason text as `lost`'s), how many
  lives are left, and a "press any key to retry this level" prompt. Retrying (`RETRY_LEVEL` action)
  restarts the **same** level — not the whole game — using the exact money/envelope balance it
  started with (`levelStartMoney`/`levelStartEnvelopes`, captured in `getInitialState`) and the
  reduced life count, rather than a fresh $/envelope grant or a full 3 lives. This used to send any
  such failure straight to full game-over; see `use-game-state.md`'s win/lose check.
- **Full game over** (`lost` phase): only when lives actually reach **0** — either from a level
  failure with no lives left, or from a mine hit while already down to the last one.
- **A missed required item costs nothing.** An essential item flying off-screen unacquired does
  **not** cost a life — only an actual level failure (or a mine hit) does. This used to also cost a
  life, silently; feedback ("failing a level should only reduce one life... it should restart the
  level with one life less" — and separately, that missing an item shouldn't be conflated with that)
  led to splitting the two: a level failure is now the *only* thing lives track, other than mines.
- **Starting money must be a multiple of $100** (cash ammo costs $100/shot — leftover cents are unspendable).

## Life-Loss Feedback
Losing a life used to be silent — a mine hit had a floating "💣 TRAP! −1 life" toast, but a level
failure (before it retried the level, see above) and an escaped required item (before it stopped
costing a life at all) had no explanation at all — feedback: "it is not clear in the game when and
why player loses lives... there should be a very good reason for that". Both remaining life-cost
paths — a mine hit, and a level failure (via its own `levelFailed` overlay, see above) — get a large,
screen-centered message (not tied to any item's on/off-screen position, unlike the normal per-item
toasts) naming what happened, plus a brief red flash behind the HUD's heart icons
(`livesFlashTimer`, ~⅔s) so the moment reads even if the player's eyes are on the play field, not the
HUD — see `useGameState.js`'s `centerMsg()`.

A missed required item still gets its own callout (`⚠️ <emoji> <item> got away!`, no "−1 life"
wording, no HUD flash, orange rather than red) purely as a heads-up, since it has no real
consequence — the same `centerMsg()` mechanism, just without the life-loss framing.
- A full-game or level failure additionally gets its own explanatory overlay (`lost`/`levelFailed`
  above) rather than relying on the toast alone.

## Row-Advance Pacing
- Once all `required` items for the level are acquired, **both** row-advance and the time countdown
  itself speed up by `ROW_ADVANCE_SPEEDUP` (`constants.js`, default `2.5×`) — there's nothing left to
  do but wait out income items at that point, so the level wraps up sooner instead of dragging (the
  displayed clock visibly counts down faster, not just the row-advance rate).
- The `hourglass` item temporarily halves whatever the current rate is (including during the
  speedup) for `HOURGLASS_SLOW_SECONDS` (15s) — a player-earned reprieve, not a hard freeze, and
  since it now applies to the same shared rate as the time countdown, it genuinely buys more real
  time, not just a slower row-advance. The two effects compose rather than override each other; see
  `use-game-state.md`.
- Once cash and envelopes are **both** exhausted (`money < 100` and `ammo.envelope <= 0`), neither
  player can act again — the game fast-forwards the timer/row-advance by `NO_AMMO_FASTFORWARD`
  (`constants.js`, `10×`) straight to that level's outcome (win or lose) instead of making the player
  wait out the real-time clock. Takes priority over the requiredDone speedup above. See
  `use-game-state.md`.

## Customization Layer
An admin can override a small set of visuals/text — first step toward a white-label product for
wedding-arranging companies. Reached via a `#/admin` hash route, one item in a "☰" hamburger menu
next to the banner (shown on every page — there's no separate settings toolbar); config is stored
in `localStorage` behind
`src/customizationStore.js` as named **packages** (see `architecture.md`'s "Packages" section) — a
permanent read-only `default` plus any number of admin-created ones, exactly one of which is
"active" (used by the running game) at a time. In scope per package: the bride/groom/couple images
and a header banner image shown above the game on every screen (file upload → data URL, auto
re-encoded to PNG with near-white background pixels faded to transparent), a small color palette
(background gradient, accent, bride/groom fallback colors), and specific wedding text (title,
tagline, an invitation message, the wedding date/time and venue address, win/lose messages, each
level's name/subtitle, and the "Her Family"/"His Family" labels). The banner defaults to a bundled
stylized graphic reading "Bride & Groom's Wedding!" (a pixel-art version in the 80s Arcade system
package) — see `architecture.md`'s "Packages" section and `game-jsx.md`'s `.game-banner`.

The Colors section's six free-form pickers are backed by `customizationStore.js`'s
`COLOR_PRESETS` — three named, pre-vetted palettes ("Classic Gold", "Midnight Arcade", "Ink &
Gold") shown as one-click swatch buttons above the pickers. Each pairs a bright accent against a
near-black/navy background and keeps `brideColor`/`groomColor` distinguishable under red-green
color blindness and (by relative brightness alone) full color blindness — a low-contrast pairing
like dark orange on black is exactly what these exist to steer an admin away from; a bright
yellow/gold accent on a near-black background is the safe baseline every preset follows. Applying
one overwrites the whole `colors` object at once; the individual pickers stay available
afterward for fine-tuning.

The invitation message (`text.invitation`) is the actual wedding-invite copy — freeform, no
placeholder substitution — shown as its own paragraph on the home page (`InviteScreen.jsx` — see
`architecture.md`); blank hides it. The wedding date/time (`text.weddingDateTime`, a **required**
date-time field) and venue address (`text.venueAddress`, optional — blank omits the venue
everywhere) drive that same page's header and its two computed links, Add to Calendar and Venue
Maps (see `invite-screen.md`'s `eventLinks.js`).

**RSVP, Gift Registry, Song Requests, and Food Requests are real in-app pages now**, not external
links to bundled demo HTML (an earlier version worked that way) — see `architecture.md`'s "Routing &
pages" and `rsvp-pages.md`. RSVP (always open) gates the other three: Registry unlocks once a guest
submits any RSVP response (even "not attending" — they may still send a gift), Songs/Food unlock
only once they've confirmed they're attending. This gate is **local-only**: it lives in the guest's
own browser (`rsvpStore.js`), not a real guest-list a couple can see — a genuine backend or
third-party form service is a deliberate, separate later decision. Songs/Food are each individually
toggleable (`text.songsEnabled`/`foodEnabled`, both default `true`) for a couple not collecting one
or the other. Separately, an admin-managed list of **opening-page links** (anything external without
its own page — directions, wedding website, hotel block, dress code…) still shows as pill buttons
in the home page's "Extra Links" row, hidden individually while blank; see `architecture.md`'s
"Opening-page links" for why each entry carries a stable id.

Also in scope: a Gift Registry destination URL (`text.registryUrl`, optional — the Registry page
just links out to it, blank shows a "not set up yet" message), and an **organizer credit**
(`text.organizerName`/`organizerUrl`, both optional) shown in the "About" menu item (in the same
hamburger menu every page shares) — a PR/marketing hook for the wedding-arranging company or venue
running the game, not the couple. Blank hides the credit line entirely.

Out of scope: control-legend/instruction text, the dynamic lose-reason phrasing, per-item labels
beyond family, and the floating pickup-toast text (spawn-time snapshot, not customization-aware —
see `use-game-state.md`). See `renderer.md` and `architecture.md` for how the config threads
through rendering.

## Key Constraints
- Items spawn on rows between the two players (never on their rows).
- `exclusiveTo: 'bride'` items can only be shot by bride; `'groom'` items only by groom — **Couple
  mode only**; Solo mode drops this restriction entirely (see "Item Types" above), since there's only
  one shooter to begin with.
- Rows advance on `rowAdvanceTimer`; press **N** (when level complete) to fast-forward — on mobile,
  where there's no keyboard, a "⏩ Skip" button appears next to solo mode's Ammo button once the
  level's required items are all acquired, doing the same thing (see `game-jsx.md`).
- `priceScale` multiplies each item's base `price` — e.g., rings at 0.1× cost $50 instead of $500.
