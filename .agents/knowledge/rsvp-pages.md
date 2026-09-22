# Components: RSVP/Registry/Songs/Food pages, `PageHeader`, `GateNotice`

## Location
`src/RsvpPage.jsx`, `src/RegistryPage.jsx`, `src/SongsPage.jsx`, `src/FoodPage.jsx`,
`src/PageHeader.jsx`, `src/GateNotice.jsx`, plus their shared store/hook: `src/rsvpStore.js`,
`src/useRsvpStatus.js`. Shared look lives in `src/PagesShared.css` (`.page-card`, `.big-btn`,
`.choice-row`/`.choice-btn`, `.stepper`, `.field-label`, `.locked-notice`).

## Purpose
Together these turn RSVP/Registry/Songs/Food from external links to bundled static demo pages into
real, working in-app pages (see `architecture.md`'s "Routing & pages"), with a **local-only** gate:
a guest's RSVP unlocks Registry/Songs/Food *for them, on their own device* — there is no backend, so
none of this is collected anywhere the couple can see it yet (a real backend or third-party form
service is a deliberate, separate later decision — same posture `customizationStore.js` documents
for admin config).

## `rsvpStore.js` — the local RSVP store
Mirrors `customizationStore.js`'s shape (a single `localStorage` key, `weddinvaders:rsvp:v1`,
read/written through small guarded functions) but for the *guest's* own response, not admin config:
- `getRsvpResponse()` — the stored `{ name, email, phone, guests, attending, message, submittedAt }`
  or `null` if nothing's been submitted yet.
- `hasRsvped()` — `getRsvpResponse() !== null`. Unlocks `RegistryPage`.
- `isAttending()` — `getRsvpResponse()?.attending === true`. Unlocks `SongsPage`/`FoodPage`.
  Deliberately **not** the same as `hasRsvped()` — a guest can RSVP "not attending" and still want
  to send a gift, but has no reason to request songs or flag dietary needs for an event they're not
  attending.
- `saveRsvpResponse(draft)` — trims/coerces fields (`guests` clamped to `>= 1`), stamps
  `submittedAt`, writes it, and calls `notify()` (see below).
- `clearRsvpResponse()` — removes the key (not currently wired to any UI — available for a future
  "start over" affordance).

### Reactivity: `notify()`/`subscribeRsvp()` + `useRsvpStatus.js`
Several components (`PageHeader`'s hamburger, `InviteScreen`'s page-links row,
`RegistryPage`/`SongsPage`/`FoodPage`'s own gate) read this store during render. That's enough when
the read happens because of navigation (arriving at a page always re-renders it), but not when a
*sibling* needs to react to a change — e.g. `RsvpPage` calling `saveRsvpResponse()` doesn't itself
cause `PageHeader` (a sibling under `App.jsx`, not a parent/child of `RsvpPage`) to re-render, so its
lock icons would stay stale until the next navigation. `rsvpStore.js` exports a tiny pub-sub
(`subscribeRsvp(fn)` / internal `notify()`, called by `saveRsvpResponse`/`clearRsvpResponse`) and
`useRsvpStatus.js` wraps it in a hook — `const { rsvped, attending } = useRsvpStatus();` — mirroring
`useCustomization.js`'s relationship to `customizationStore.js`. Every component listed above uses
this hook rather than calling `hasRsvped()`/`isAttending()` directly, so a submission anywhere
updates lock state everywhere immediately, in the same tab.

## `RsvpPage.jsx`
The `'rsvp'` route. Not gated — always reachable.
- **Prefill via query string**: `?name=...&email=...&phone=...` are read once at first mount
  (`prefillFromQuery()`) and seed the draft — a couple can send each guest a personalized link that
  arrives partly filled in. Only applies when there's no existing saved response; a returning guest
  (or one who already submitted) sees their stored answer instead, never the query string
  overwriting it.
- **Idempotent on reload**: if `getRsvpResponse()` already has a value at mount, the page renders
  straight into its own confirmation view instead of a blank form — refreshing the RSVP page after
  submitting doesn't lose that state. A "Change my RSVP" button re-enters edit mode, pre-filled from
  the stored response.
- **Big-choice buttons, not a `<select>`**: attending yes/no is two `.choice-btn`s
  ("🎉 Joyfully accepts" / "💔 Regretfully declines"), toggled via plain component state — easier to
  tap accurately than a dropdown, and unambiguous at a glance (part of the "simple, big buttons/big
  font" usability pass this feature shipped alongside).
- **Guest-count stepper**: `.stepper` (−/+ buttons flanking the count, min 1), shown only when
  attending is `true` — irrelevant otherwise. `adjustGuests(delta)` clamps at 1.
- **Submit** (`💌 SEND WITH LOVE`, disabled until a name and an attending choice are both set) calls
  `saveRsvpResponse(draft)` and switches to the confirmation view, which shows a tailored heading
  (attending vs. not), and — only when attending — buttons into Songs/Food (each gated on
  `config.text.songsEnabled`/`foodEnabled`) plus an always-shown Registry button (attending isn't
  required for that one).

## `RegistryPage.jsx`
The `'registry'` route. Gated on `rsvped` (via `useRsvpStatus()`) — shows `<GateNotice reason="rsvp">`
until any RSVP is submitted. Once unlocked, it's just a landing page linking out to
`config.text.registryUrl` (via `linkUtils.js`'s `withProtocol()`, `target="_blank"`) — the actual
registry lives elsewhere (Zola, Amazon, a spreadsheet…); this page doesn't embed anything. Blank
`registryUrl` shows a "not set up yet" message rather than a dead link.

## `SongsPage.jsx` / `FoodPage.jsx`
The `'songs'`/`'food'` routes. Each is gated two ways, checked in order:
1. `config.text.songsEnabled`/`foodEnabled` — if the admin turned the feature off entirely, shows a
   plain "not collecting this" message, no gate/CTA (there's nothing to unlock).
2. Otherwise gated on `attending` (via `useRsvpStatus()`) — `<GateNotice reason="attending">` until
   the guest has confirmed they're coming.

Both store their own local state directly in `localStorage` (`weddinvaders:songs:v1` — an array of
`{ id, song, artist }`; `weddinvaders:food:v1` — a single free-text string), read once at mount and
written on every change. Same local-only caveat as `rsvpStore.js`: this is what the *guest's own
browser* remembers, not data the couple can see. `SongsPage` supports adding/removing requests
inline (each shown as a `.choice-btn` that removes itself on click); `FoodPage` is a single textarea
with an explicit Save button and a brief "saved" confirmation line.

## `GateNotice.jsx`
Shared "locked" view for `RegistryPage`/`SongsPage`/`FoodPage` — `reason="rsvp"` or
`reason="attending"` selects the explanation copy. Always includes a `💌 Go to RSVP` button
(`<a href="#/rsvp">`) — never a dead end.

## `PageHeader.jsx`
The shared chrome rendered once by `App.jsx` above whichever page is showing (every route except
`admin`) — see `architecture.md`'s "Home screen (InviteScreen) and the game page" for the full
banner/hamburger/About-modal description. Its hamburger's page list is built from `useRsvpStatus()`
the same way `InviteScreen`'s page-links row is, so the two never disagree, and both update
immediately on any RSVP change via the same reactive hook.

## Relationships / Cross-links
- `App.jsx` renders `PageHeader` once and all of `InviteScreen`/`RsvpPage`/`RegistryPage`/
  `SongsPage`/`FoodPage`/`Game` (always mounted, one visible via CSS) — see `architecture.md`.
- `InviteScreen.jsx` renders the same page-links row concept for the home page — see
  [`invite-screen.md`](invite-screen.md).
- `config.text.registryUrl`/`songsEnabled`/`foodEnabled` are edited in `AdminScreen.jsx`'s Pages
  section; `organizerName`/`organizerUrl` (the About modal's credit line) are in its own section —
  see `architecture.md`.
- Manual verification is covered by [`testing.md`](testing.md).
