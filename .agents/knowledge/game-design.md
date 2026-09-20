# Game Design

## Concept
Two-player cooperative Space Invaders-style game. The **Bride** (bottom) and **Groom** (top) move toward each other across 9 rows, shooting flying wedding items to buy everything needed for their wedding before they meet in the middle.

## Game Phases
Before any of these, the app shows `InviteScreen.jsx` — a separate pre-game DOM screen (couple
names/date/venue, the invitation copy, links, and a "Start Playing" CTA), not part of this phase
machine at all. Its "Start Playing" button skips the canvas `title` phase entirely, going straight
to `modeSelect` (see `architecture.md`'s "Invitation screen (Phase 1) vs. game view (Phase 2)").

| Phase | Description |
|-------|-------------|
| `title` | The game's initial internal phase — no canvas screen is ever shown for it in normal play (superseded by `InviteScreen.jsx`); kept as `useGameState.js`'s starting state and `renderer.js`'s dispatch-table default. |
| `modeSelect` | Choose Couple or Solo (and which character) before the first level — see "Game Modes" below |
| `playing` | Main gameplay loop |
| `meeting` | Players reached the same row → couple image shown, then level result |
| `levelComplete` | Time ran out with all required items bought → next level |
| `gameComplete` | All 5 levels cleared |
| `lost` | Ran out of lives, money went negative, or met without completing requirements |

## Game Modes
- **Couple** (default/original) — both bride and groom are controllable, exactly as described below.
- **Solo** — chosen at the `modeSelect` screen (Couple / Solo as Bride / Solo as Groom), reached from
  the title screen. Only the chosen role can move/shoot/cycle ammo; the other role is a parked,
  occasionally-blinking placeholder at its starting corner (mainly for mobile, where the controls
  are simplified to swipe-to-move, tap-canvas-to-shoot, and a single "switch ammo" button — see
  `game-jsx.md`). **The human-controlled character always starts at the bottom row** — playing solo
  as groom inverts which physical corner groom/bride start from (groom takes bride's usual
  bottom-left start and shoots upward instead of down), rather than groom always starting top-right.
  The row-advance/timer/win-lose rules are otherwise **unchanged** from Couple mode — solo is simply
  harder because only one shooter is acting against the same pace. See `use-game-state.md`'s
  `topRole`/`bottomRole` for how the inversion is implemented without hardcoding role names into the
  convergence math.

## Players
- **Groom** — starts top-right (row 0), moves down. Controls: ←/→ move, ↑/↓ cycle ammo, Space/Enter shoot.
- **Bride** — starts bottom-left (row 8), moves up. Controls: A/D move, W shoot, S cycle ammo.
- Both move one row at a time on a timed `rowAdvanceTimer`.
- Key bindings are handled in `onKey()` / `moveX()` in [`knowledge/use-game-state.md`](use-game-state.md).
- In Solo mode, only the chosen role's keys/taps do anything; the other role's inputs are ignored so
  it stays parked (see "Game Modes"). The starting corner/movement direction described above is
  Couple mode's default and Solo-as-Bride's layout — Solo-as-Groom swaps it.

## Ammo Types
| Type | Key | Cost | Effect |
|------|-----|------|--------|
| 💵 Cash | `cash` | $100/shot (deducted from `money`) | Damages purchasable items (HP = price × priceScale) |
| 💌 Invite | `invite` | 1 envelope | Hits `guest` items → guest attends, brings $100–$300 random gift |
| 💕 Heart | `heart` | 1 heart | Hits `parent_bride`/`parent_groom` → family donates $300–$500 random |

## Item Types (defined in `src/constants.js` `WEDDING_ITEMS` — see [`knowledge/constants.md`](constants.md))
| ID | Emoji | Type | Notes |
|----|-------|------|-------|
| `rings` | 💍 | purchase (required) | Always required |
| `officiant` | ⛪ | purchase (required) | Level 2+ |
| `catering` | 🍽️ | purchase (required) | Level 3+ |
| `flowers` | 💐 | purchase (optional) | Bride-exclusive |
| `suit` | 🤵 | purchase (optional) | Groom-exclusive |
| `cake` | 🎂 | purchase (optional) | Level 4+ |
| `guest` | 👥 | income (invite ammo) | Gives $100–$300 |
| `parent_bride` | 👩‍👧 | income (heart ammo) | Bride-exclusive, gives $300–$500 |
| `parent_groom` | 👨‍👦 | income (heart ammo) | Groom-exclusive, gives $300–$500 |
| `discount` | 🎀 | discount | Reduces remaining item prices by 30% |
| `mine` | 💣 | trap | Explodes on contact, costs a life |
| `hourglass` | ⏳ | time (cash ammo) | Rare; slows row-advance pace for `HOURGLASS_SLOW_SECONDS` (15s) |

### Spawn Probability
Every item template has a `spawnWeight` in `WEDDING_ITEMS` (`constants.js`); `spawnItem()`
(`useGameState.js`'s `pickWeighted()`) does a cumulative-weight random pick, not a uniform one.
Purchasable items (rings/officiant/catering/flowers/suit/cake) are weight `10` (most common),
`guest` is `5`, `parent_bride`/`parent_groom` are `2` (rare), `discount`/`mine` are `3`, and the
new `hourglass` is `2` (rare, same tier as family).

## Level Structure (`src/levels.js`)
5 levels with increasing difficulty:

| Level | Name | Required Items | money | priceScale | itemSpeed | hasMines |
|-------|------|---------------|-------|-----------|-----------|---------|
| 1 | Save the Date | rings | $9900 | 0.1× | 1.5 | No |
| 2 | The Ceremony | rings, officiant | $3000 | 0.4× | 2.0 | No |
| 3 | The Reception | rings, officiant, catering | $2500 | 0.65× | 2.5 | No |
| 4 | The Full Wedding | rings, officiant, catering, flowers, suit | $2000 | 0.9× | 3.0 | Yes |
| 5 | Dream Wedding | rings, officiant, catering, flowers, suit, cake | $1800 | 1.2× | 3.5 | Yes |

## Win / Lose Conditions
- **Win level**: All `required` items acquired when players meet (or time runs out with money ≥ 0).
- **Lose**: Lives reach 0, OR players meet without all required items, OR money goes negative.
- **Starting money must be a multiple of $100** (cash ammo costs $100/shot — leftover cents are unspendable).

## Row-Advance Pacing
- Once all `required` items for the level are acquired, row-advance speeds up by
  `ROW_ADVANCE_SPEEDUP` (`constants.js`, default `2.5×`) — this limits how long players can keep
  farming optional items/money instead of finishing the level.
- The `hourglass` item temporarily halves whatever the current rate is (including during the
  speedup) for `HOURGLASS_SLOW_SECONDS` (15s) — a player-earned reprieve, not a hard freeze. The
  two effects compose rather than override each other; see `use-game-state.md`.
- Once cash, invites, and hearts are **all** exhausted (`money < 100` and both ammo counts `0`),
  neither player can act again — the game fast-forwards the timer/row-advance by
  `NO_AMMO_FASTFORWARD` (`constants.js`, `10×`) straight to that level's outcome (win or lose)
  instead of making the player wait out the real-time clock. See `use-game-state.md`.

## Customization Layer
An admin can override a small set of visuals/text — first step toward a white-label product for
wedding-arranging companies. Reached via a `#/admin` hash route, one item in a "☰" hamburger menu
next to the banner (shown on both the invitation screen and the game view — there's no separate
settings toolbar); config is stored in `localStorage` behind
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

The invitation message (`text.invitation`) is the actual wedding-invite copy — freeform, no
placeholder substitution — shown as its own paragraph on the invitation screen (`InviteScreen.jsx`,
Phase 1 of the app, shown before the game itself — see `architecture.md`); blank hides it. The
wedding date/time (`text.weddingDateTime`, a **required** date-time field) and venue address
(`text.venueAddress`, optional — blank omits the venue everywhere) drive that same screen's
header and its two computed links, Add to Calendar and Venue Maps (see `invite-screen.md`'s
`eventLinks.js`). Also in scope: an admin-managed list of **opening-page links** (RSVP, gift
registry, song requests, and anything else — directions, wedding website, hotel block…), shown as
pill buttons on the invitation screen only (alongside the two computed links above) — hidden
individually while blank. There's no repeat of these on the game view any more; an earlier version
kept a persistent post-game footer, but it duplicated the invitation screen for no benefit and was
removed along with the old standalone settings toolbar (see "Invitation screen" below and
`architecture.md`). Both system packages seed the three well-known ones (RSVP/registry/songs) with
a real url out of the box, pointing at simple static demo pages bundled in `public/examples/` (each
opens in a new tab and explains it's a placeholder), so the feature is visible without any admin
setup — an earlier version left them blank by default, which just made the feature invisible.
Plain links today; see `architecture.md`'s "Opening-page links" for why each entry carries a stable
id (so specific well-known ones could later become an embedded RSVP form, song-request list, or
registry checklist instead of just a link).

Also in scope: an **organizer credit** (`text.organizerName`/`organizerUrl`, both optional) shown in
the game view's "About" menu item (next to "Admin" in the same hamburger menu) — a PR/marketing hook
for the wedding-arranging company or venue running the game, not the couple. Blank hides the credit
line entirely.

Out of scope: control-legend/instruction text, the dynamic lose-reason phrasing, per-item labels
beyond family, and the floating pickup-toast text (spawn-time snapshot, not customization-aware —
see `use-game-state.md`). See `renderer.md` and `architecture.md` for how the config threads
through rendering.

## Key Constraints
- Items spawn on rows between the two players (never on their rows).
- `exclusiveTo: 'bride'` items can only be shot by bride; `'groom'` items only by groom.
- Rows advance on `rowAdvanceTimer`; press **N** (when level complete) to fast-forward.
- `priceScale` multiplies each item's base `price` — e.g., rings at 0.1× cost $50 instead of $500.
