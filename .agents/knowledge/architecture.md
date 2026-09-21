# Architecture

## Stack
- **React 19** (JSX, hooks only — no class components)
- **Vite 7** (dev server + build)
- **HTML Canvas** for all game rendering — no DOM elements for game objects

## Directory Layout
```
src/
├── main.jsx          # React root mount
├── App.jsx           # Thin wrapper, renders <Game />
├── Game.jsx          # React shell: canvas element, keyboard/touch controls, game loop lifecycle
├── Game.css          # Layout styles (wrapper, mobile controls, key legend)
├── index.css         # Global reset
├── constants.js      # All magic numbers + WEDDING_ITEMS + AMMO_META
├── levels.js         # LEVELS array, getSpawnPool(), isLevelComplete()
├── useGameState.js   # Core game logic hook (update loop, input, collision)
├── renderer.js       # Pure canvas drawing — render(ctx, state, assets, config)
├── pixelArt.js       # 8×8 pixel-sprite definitions + drawPixelSprite() — currently UNUSED (not imported anywhere)
├── useAssets.js      # Preloads bride/groom/couple PNG images, preferring a customization override per role
├── customizationStore.js  # localStorage-backed customization config (images/colors/text) + DEFAULT_CONFIG + EIGHTIES_CONFIG — the only module that touches localStorage
├── useCustomization.js    # Ref-based hook wrapping customizationStore.getConfig()
├── imageProcessing.js     # fileToImageDataUrl() — SVG uploads pass through as-is; fileToProcessedPngDataUrl() downscales + re-encodes raster uploads to PNG, fades near-white pixels to transparent
├── InviteScreen.jsx  # Phase 1: the pre-game "digital wedding card" DOM screen — see "Invitation screen" below
├── InviteScreen.css
├── eventLinks.js     # Pure helpers: builds the Google Calendar / Venue Maps links + formats the header date from text.weddingDateTime/venueAddress
├── linkUtils.js       # withProtocol() — shared by Game.jsx and InviteScreen.jsx
├── LinksRow.jsx       # Shared pill-link row component — renders a package's opening-page links (used by both Game.jsx and InviteScreen.jsx)
├── AdminScreen.jsx   # Admin UI (reached via #/admin hash route) for editing the customization config
├── AdminScreen.css
└── assets/
    ├── bride-nobg.png
    ├── groom-nobg.png
    ├── couple-nobg.png
    ├── banner-default.svg  # bundled fallback for the header banner (Default package)
    ├── banner-80s.svg       # 80s Arcade package's pixel-art header banner
    └── icons/         # 12 hand-built 16×16 pixel-art SVGs (one per WEDDING_ITEMS id), the 80s Arcade system package's item images

public/
└── examples/         # static demo pages the Default/80s packages' seeded links point to —
    ├── style.css     # not part of the Vite/React build; served verbatim at <base>/examples/*
    ├── rsvp.html
    ├── registry.html
    └── songs.html
```

`App.jsx` is no longer a pure passthrough: it does a minimal hash-based route check
(`window.location.hash === '#/admin'`) and renders `<AdminScreen>` or `<Game>` accordingly —
no router dependency, since this is currently the only extra screen.

## Data Flow
```
Game.jsx                          → knowledge/game-jsx.md
  ├── showInvite  ←  React state, true by default (Phase 1: InviteScreen.jsx)
  │                  false once "Start Playing" is clicked (Phase 2: this canvas)
  ├── useGameState(!showInvite)  →  stateRef (never React state — avoids re-renders)
  │                                → knowledge/use-game-state.md
  ├── useAssets()     →  assetsRef
  ├── uiPhase/uiMode/uiSoloRole  ←  lightweight React-state mirrors, updated
  │                                 only on phase change (drive mode-select
  │                                 overlay + couple/solo control swap)
  └── requestAnimationFrame loop (started/stopped with showInvite, so
      leaving/returning to the invite screen pauses/resumes a run):
        update(stateRef)   ← pure mutation via setState(updater)
        render(ctx, state, assets, config)
                                   → knowledge/renderer.md
```
Both `useGameState.js` and `renderer.js` read shared data/config from
`constants.js` (dimensions, timing, `WEDDING_ITEMS`, `AMMO_META`) and
`levels.js` (`LEVELS`, `getSpawnPool()`, `isLevelComplete()`) — see
[`knowledge/constants.md`](constants.md).

`useAssets.js` and `renderer.js` additionally read the customization config from
`customizationStore.js` (`getActiveConfig()` / `DEFAULT_CONFIG`) — images, a small color palette,
a list of opening-page links, and a fixed set of wedding-text fields, backed by localStorage today
behind an interface designed to be swapped for a real API/DB later without touching call sites.
`images` holds `bride`/`groom`/
`couple` portrait slots, a `banner` slot, plus one slot per `WEDDING_ITEMS` id (e.g. `rings`, `cake`)
— an item slot left `null` falls back to that item's emoji in `renderer.js`, exactly like a null
portrait slot falls back to the bundled PNG. `banner` is the odd one out: unlike every other image
slot, it's never drawn on the canvas or preloaded through `useAssets.js` — it's a plain DOM
`<img className="game-banner">` rendered directly by `Game.jsx` in its header bar, alongside the
hamburger menu (`activeConfig.images.banner || <bundled banner-default.svg>`), since it's a page
header, not a game sprite. See `game-jsx.md`. `AdminScreen.jsx` is the only writer. Before an uploaded file reaches
that config, `AdminScreen.jsx` runs it through `imageProcessing.js`'s `fileToImageDataUrl()`: an SVG
upload passes through untouched (already vector, already transparent where needed, no pixel
dimension to downscale); anything else goes through `fileToProcessedPngDataUrl()`, which downscales
it (longest edge capped at `MAX_DIMENSION = 480`px — plenty for the largest in-game use, the
~320px-wide couple portrait; a raw phone photo can be 3000px+ and several MB once re-encoded
losslessly as PNG otherwise), then re-encodes it as PNG and fades near-white pixels to transparent
(a simple threshold chroma-key, not true background removal — can also fade genuinely white parts
of the subject). `writeStore()` catches a `QuotaExceededError` from `localStorage.setItem` and
rethrows a clear, user-facing message instead — copying a package with real (pre-downscale-fix)
large images into another package could roughly double storage usage and exceed the browser's quota
with no visible feedback (see `AdminScreen.jsx`'s modal error handling below).

### Packages

The store holds multiple named **packages** (each a full images/colors/text config), not just one
— the multi-tenant precursor for the white-label goal (one package per couple/wedding, eventually).
There are always two code-defined **system packages**, never persisted to localStorage, always
freshly derived from their source config: `default` (id `DEFAULT_PACKAGE_ID`, from `DEFAULT_CONFIG`
— today's emoji items, original color palette, `images.banner: null` → falls back to the bundled
`banner-default.svg`) and `80s` (id `EIGHTIES_PACKAGE_ID`, from `EIGHTIES_CONFIG` — every item's
emoji replaced by one of the pixel-art SVGs in `assets/icons/`, `images.banner` explicitly set to
the pixel-art `banner-80s.svg`, plus a matching dark/neon retro color palette; portraits are left
unset, same bundled photos as `default`). Both are **read-only** — `isDefault: true` on the package object — can't be edited,
renamed, or deleted, only selected as active or used as a "copy from" source for a new package.
Exactly one package is the **active** one at a time (`activePackageId`, persisted); that's the only
one `getActiveConfig()` resolves and the only one the running game ever renders. Editing a package
via `AdminScreen.jsx` does **not** implicitly activate it — "Save" and "Set active" are deliberately
separate actions, so an admin can author a package without disturbing whatever is currently live.
Full API: `listPackages()`, `getPackage(id)`, `getActivePackageId()`, `setActivePackage(id)`,
`createPackage(name, copyFromId = DEFAULT_PACKAGE_ID)`, `updatePackage(id, content)`,
`renamePackage(id, name)`, `deletePackage(id)` (all in `customizationStore.js`, all throwing on a
system-package id misuse or a duplicate — case-insensitive — package name). `AdminScreen.jsx`'s "+"
button next to the Packages heading opens a small modal (name + a "copy from" dropdown of every
existing package, system or custom) rather than always copying `default`; package chips show a
"system" tag for `default`/`80s`. Deleting the active package falls back to `default`.

**Modal error visibility gotcha**: `.admin-modal-overlay` has `z-index: 30`, which sits above the
page's bottom `.admin-actions` bar — so an error raised by an action taken *inside* an open modal
(e.g. `createPackage()` throwing) must never be shown via the page-level `flashStatus()`/`status`
state, since that renders into `.admin-actions` and would be invisible behind the modal. Show it
with modal-local state instead (see the new-package modal's `modalError`) and keep the modal open
on failure so the user can see the message and retry.

### Opening-page links

`links` (sibling to `images`/`colors`/`text` in a package's config) is a free-form array of
`{ id, label, url }` — RSVP, gift registry, song requests, or anything else an admin adds
(directions, wedding website, hotel block, dress code…). Rendered as a row of pill buttons via the
shared `LinksRow.jsx` component (hidden entirely if every `url` is blank), on `InviteScreen.jsx`
only — alongside two more *computed* entries, Add to Calendar / Venue Maps (see "Invitation screen"
below). `Game.jsx`'s game view (Phase 2) does **not** repeat this links row any more: an earlier
version kept a persistent post-game footer, but that duplicated what the invitation screen already
shows, so it was removed along with the old separate settings toolbar — see "Invitation screen"
below for what replaced both.
Unlike `images`/`colors` (fixed sets of named fields, merged key-by-key over `DEFAULT_CONFIG` so a
partial/legacy package never leaves one `undefined`), `links` is admin-managed free-form content —
`customizationStore.js`'s `mergeContent()` takes a package's own `links` array as-is (through
`sanitizeLinks()`, which repairs missing/non-string fields rather than merging entry-by-entry) and
only falls back to `DEFAULT_CONFIG.links` when the package has no `links` array at all (e.g. one
saved before this feature existed). `DEFAULT_CONFIG.links` seeds exactly three entries — ids `rsvp`,
`registry`, `songs` — each pointing at one of the bundled static demo pages in `public/examples/`
(`${import.meta.env.BASE_URL}examples/{rsvp,registry,songs}.html`) rather than an empty `url`: an
earlier version shipped these with a blank `url` (hidden entirely, per the "hide while blank" rule
below) on the theory that a dead placeholder link was worse than no link — in practice that just
made the whole feature look broken/invisible out of the box, since the *only* built-in packages are
these two read-only system ones and neither ever showed anything. Real demo pages fix that: the
Default/80s invitation screens now show all three links immediately, each opening its own simple
styled page (in a new tab) explaining it's a placeholder and naming where to swap in the couple's
real RSVP form / registry / playlist link. An admin can still set any `url` back to empty to hide a
link individually. `id` is a stable identifier never shown in `AdminScreen.jsx`'s UI: today every
entry (the three seeded ones and any the admin adds via "+ Add link") renders identically as a
plain link, but keeping a stable, well-known id on the three seeded ones is what would let a future
version single out *that specific* entry to upgrade into something richer (an embedded RSVP form, a
live song-request list, a registry checklist) without having to guess which entry is which from a
label the admin may have renamed — labels/order aren't reliable identity, ids are. An admin-added
custom link gets a generated id and stays a plain link indefinitely. `LinksRow.jsx` renders each
visible link's `href` through `linkUtils.js`'s `withProtocol()`, which prepends `https://` when the
admin typed a bare domain (`example.com/rsvp`) instead of a full URL, but leaves a site-relative
path (like the bundled examples' `/weddinvaders/examples/...` urls) untouched. Every link opens via
`target="_blank" rel="noopener noreferrer"` — a real anchor, not a canvas click handler — so it
always opens in a new tab and never navigates the game away.

### Invitation screen (Phase 1) vs. game view (Phase 2)

`Game.jsx` owns one more piece of UI state beyond the game's own phase machine: `showInvite`
(`true` by default). While true, `InviteScreen.jsx` renders instead of the canvas — a plain DOM
"digital wedding card" (couple names, wedding date/time, venue, the invitation copy, the links row
described above, and a teaser banner reusing `text.title`/`text.tagline` with a "▶ START PLAYING"
button) — and the `<canvas>` element isn't mounted at all, so it structurally can't receive touch
input while someone is just reading the invite. Clicking "Start Playing" sets `showInvite` false,
revealing the canvas/game view (Phase 2).

Above both phases sits a single `.game-header-bar`: the banner image and a "☰" hamburger menu, side
by side — nothing else. It's `position: sticky; top: 0` (with a solid background), so it stays
visible and reachable while scrolling on either screen, rather than only being present at the very
top of the page. There's no separate settings toolbar and no persistent "Back to Invite" nav bar;
instead, once Phase 2 is showing, the banner itself becomes the back-to-invite control (a
`<button className="banner-link">` wrapping the `<img>`, calling the same handler) — clicking it
returns to `InviteScreen`. It's non-interactive on the invitation screen itself, since that's
already where it would go. The hamburger opens a small dropdown with four items: "🏠 Invitation"
and "🎮 Game" (simple navigation between the two phases — the same `handleBackToInvite`/
`handleStartPlaying` handlers the banner and the invite screen's CTA already use, so picking
"Game" while a run is in progress resumes it rather than resetting), "⚙ Admin" (navigates
`#/admin`, same route `AdminScreen.jsx` has always used), and "ℹ️ About" (opens a modal showing a
fixed "Made with Weddin'Vaders" line plus, when set, an organizer credit — see below).
Everything else that's actually *game* content — the board, the on-screen mobile/solo controls, and
the keyboard-control legend — lives inside one bordered `.game-frame` card in `Game.jsx`, styled
like `InviteScreen.css`'s own card for visual consistency between the two phases; a small
"💌 Back to Invite & RSVP" nudge (`.end-of-level-banner`, described below) is the one thing that
still sits outside that frame, appearing only at level boundaries.

The canvas-drawn `title` phase (see `renderer.md`'s `drawTitle`) is skipped entirely — the first
"Start Playing" click dispatches `handleAction({type:'START'})` directly (a synchronous ref
mutation, so it lands before the canvas ever renders a frame), taking the game straight to
`modeSelect`. `useGameState.js`'s `active` parameter (`Game.jsx` passes `!showInvite`) gates the
keyboard-input effect for the same reason the loop is stopped/started with `showInvite` (see the
Data Flow diagram above): without it, a stray keypress while browsing the invitation screen could
silently advance a paused `meeting`/`levelComplete` screen or reset a finished game in the
background, since that listener is otherwise always mounted at the `window` level regardless of
what's currently visible.

"Back to Invite" pauses rather than resets: `stopLoop()` freezes `update()` (and therefore every
per-frame timer) mid-run, and `startLoop()` on the next "Start Playing" click picks up exactly
where it left off — `handleStartPlaying` only dispatches `START` when `phase === 'title'` (i.e. the
very first time), so a returning player doesn't get bounced back to mode-select. A small
"💌 Back to Invite & RSVP" banner (`Game.jsx`'s `.end-of-level-banner`) also appears on every level
boundary — a level win (`meeting`), the full-game win (`gameComplete`), a level loss (`lost`), or
time-out (`levelComplete`) — not just the final victory, since clearing all 5 levels takes several
wins and most runs will end at an earlier boundary.

Two new `text` fields drive the header/computed links: `weddingDateTime` (a `datetime-local` value,
**required** — `AdminScreen.jsx` blocks Save without one, since the Calendar link has no sensible
fallback) and `venueAddress` (optional — blank hides the header's location line and the Venue Maps
link entirely, and the generated Calendar event has no location). `eventLinks.js` is the only place
that builds the Google Calendar ("add event" render URL) and Google Maps (search URL) links from
these — both are plain string templates, no date/URL library needed — plus `formatEventDateTime()`
for the header's display string. See `invite-screen.md`.

Two more `text` fields, `organizerName`/`organizerUrl` (both optional, default `''`), drive the
About modal's organizer credit — a PR/marketing hook for the wedding-arranging company or venue
running the game as a white-label product, distinct from the couple themselves. Both blank hides
the line entirely; a name with no url renders as plain (non-link) text rather than a broken anchor.

### Game Modes

Two modes, chosen at a `modeSelect` phase reached from the title screen: **Couple** (both roles
controllable, the original/default game) and **Solo** (one human-picked role — bride or groom —
controllable; the other is a parked, occasionally-blinking placeholder, aimed at mobile players who
want simpler one-thumb controls: swipe to move, tap to shoot, one button to cycle ammo). Rather than
hardcoding "groom starts top-right, bride starts bottom-left" throughout the row-advance/meeting/
spawn math, `getInitialState()` (`useGameState.js`) computes `topRole`/`bottomRole` once per level —
swapped when playing solo as groom, so the human always starts at the bottom regardless of which
character they picked — and every place that used to key off `players.bride`/`players.groom`
positionally reads `players[topRole]`/`players[bottomRole]` instead. See `use-game-state.md`'s "Solo
mode" section for the full rationale and `renderer.md`'s `drawPlayer` (`isTop`/`waiting` params) for
the rendering-side equivalent. `game-jsx.md` covers the DOM side: the `modeSelect` overlay and the
solo-only mobile control surface.

## Key Design Decisions
- **`useRef` for game state**, not `useState` — the loop runs at 60 fps; React re-renders would be too slow.
- **`setState(updater)` pattern** — always pass a function so the closure reads the latest state.
- **`renderer.js` is pure** — takes `(ctx, state, assets, config)`, returns nothing, has no side-effects. `config` defaults to `DEFAULT_CONFIG` when omitted (no `localStorage` access inside `renderer.js` itself).
- **Canvas dimensions are responsive, chosen once at load**: desktop is `CANVAS_WIDTH = 910` (800
  play area + 110 panel), `GAME_HEIGHT = 600` (540 play + 60 HUD); a narrow/portrait viewport
  (`constants.js`'s `IS_MOBILE_PORTRAIT`) instead gets `CANVAS_WIDTH = 552` (460 + 92),
  `GAME_HEIGHT = 780` (720 + 60) — taller and narrower, so a phone held vertically fills far more of
  its own screen instead of letterboxing the desktop-shaped board. See `constants.md` and
  `game-jsx.md` (`Game.css`'s matching media query) for the full mobile-portrait layout story.
- **No light theme, anywhere** — the game is dark-only by design (`Game.css` hardcodes a dark body
  background unconditionally). `index.css` no longer has a `@media (prefers-color-scheme: light)`
  override (removed — it was unused Vite-template boilerplate that flipped button backgrounds to
  near-white without ever setting a matching text color, producing unreadable white-on-white
  buttons whenever the browser/OS preferred light mode). Any plain `<button>` added anywhere in the
  app should still set its own explicit `background`/`color` rather than relying on `index.css`'s
  base button style, since `AdminScreen.css` does exactly that as a defensive rule
  (`.admin-screen button`).

## Entry Point
`src/main.jsx` → `<App />` → `<Game />` — the canvas is the only meaningful DOM node.

## Component Files
| File | Covers |
|------|--------|
| [`knowledge/use-game-state.md`](use-game-state.md) | `useGameState()` hook in `src/useGameState.js` — core game logic, input, update loop |
| [`knowledge/renderer.md`](renderer.md) | `render()` and draw functions in `src/renderer.js` — all canvas drawing |
| [`knowledge/game-jsx.md`](game-jsx.md) | `Game` component in `src/Game.jsx` — React shell wiring hooks + canvas + controls |
| [`knowledge/invite-screen.md`](invite-screen.md) | `InviteScreen` component in `src/InviteScreen.jsx` — Phase 1 pre-game DOM screen |
| [`knowledge/constants.md`](constants.md) | `src/constants.js` — shared dimensions, timing, `WEDDING_ITEMS`, `AMMO_META` schema |
