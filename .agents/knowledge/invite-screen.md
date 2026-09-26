# Component: `InviteScreen` (`src/InviteScreen.jsx`)

## Location
`src/InviteScreen.jsx` — `export default function InviteScreen({ config })`. The `'home'` route's
content.

## Purpose
The home page (see `architecture.md`'s "Routing & pages" and "Home screen"): a plain DOM "digital
wedding card" that also **is** the RSVP page — the actual RSVP form (`RsvpPage.jsx`) is rendered
directly inside it, not linked to, so a guest can respond without an extra click-through. Below the
couple names/date/venue/invitation copy sits a two-column area: RSVP at ~66% width, a small game
preview (`GameTeaser.jsx`) at ~33%, then the external "Extra Links" row (Registry/Songs/Food
navigation lives in the RSVP confirmation view's buttons and the header hamburger instead — see
`extraLinks`/`<LinksRow>` below). Deliberately not canvas-drawn, same reasoning as
`.mode-select-overlay`/the old canvas
title notice: the couple names/date/venue/invitation copy are admin-customizable, variable-length
text that needs to wrap like normal HTML, and every link here needs to be a real anchor regardless.

## Construction
Rendered by `App.jsx`, always mounted alongside every other page, visible only on the `'home'` route
(which `getRoute()` also maps a bare `'rsvp'` hash onto — see `architecture.md`'s "Routing & pages"):
```jsx
<div style={{ display: route === 'home' ? undefined : 'none' }}>
  <InviteScreen config={activeConfig} />
</div>
```
`config` only — the active package's full config (read the same non-ref way other pages read it,
via `getActiveConfig()`, since this is display-only). Passed straight through to the `RsvpPage`/
`GameTeaser` it renders internally.

## Key Surface
| Element | Purpose |
|---|---|
| `.invite-header` | Couple names (`` `${names.bride} & ${names.groom}` `` — no separate "couple names" field; reuses the existing `text.names` fields also used for the in-game control legend), the formatted wedding date/time (`eventLinks.js`'s `formatEventDateTime(config.text.weddingDateTime)`, hidden if the stored value somehow fails to parse), and the venue address line (`config.text.venueAddress`, hidden entirely when blank — a couple may not want to disclose the venue yet). Capped at `max-width: 640px` and centered so it stays a readable line length even though `.invite-screen` itself grew wide enough for the two-column area below. |
| `.invite-body` | `config.text.invitation` (the existing freeform wedding-invite copy field) — skipped entirely when blank. Same `max-width: 640px` centering as the header. |
| `.home-columns` (`.home-main` / `.home-side`) | The two-column area: `<RsvpPage config={config} />` at `flex: 2` (~66%) in `.home-main`, `<GameTeaser config={config} />` at `flex: 1` (~33%) in `.home-side`. Stacks to a single column (RSVP first) under a 760px breakpoint — the stacked-column media query also sets `align-items: stretch` (overriding the row layout's `flex-start`, which exists only to top-align unequal-height columns) so `.home-main`/`.home-side` — and everything inside them relying on `width: 100%`, notably `GameTeaser.jsx`'s preview box — actually span the full column width on mobile instead of shrink-wrapping to their content's own intrinsic width. See `rsvp-pages.md`. |
| `extraLinks` array + `<LinksRow>` | The admin's free-form `config.links` (genuinely external extras — directions, wedding website, hotel block…) plus two **computed** entries appended after them: `📅 Add to Calendar` (always present — `weddingDateTime` is a required field, so there's always something to build from) and `📍 Venue Maps` (only when `venueAddress` is non-empty). Rendered through the shared `src/LinksRow.jsx` component — real external links, `target="_blank"`, run through `withProtocol()`. **No** in-app Registry/Songs/Food link row lives here any more — it used to (a `pageLinks`/`.title-links` block, plain hash-nav pills with the same `useRsvpStatus()`-driven 🔒 gating as below), but that duplicated navigation already available via the RSVP confirmation view's own buttons (`RsvpPage.jsx`, once RSVPed) and the header's hamburger menu (`PageHeader.jsx`, always available, same gating) — removed rather than kept as a third copy. |

## Computed links: `src/eventLinks.js`
Pure functions, no date/URL library — both links are plain string templates:
- `buildGoogleCalendarUrl({ title, weddingDateTime, venueAddress, details })` — a Google Calendar
  "add event" render URL (`calendar.google.com/calendar/render?action=TEMPLATE&...`). Assumes a
  fixed `EVENT_DURATION_HOURS = 4` (no separate end-time field is collected from the admin — kept
  deliberately simple, per the feature's scope). Formats the start/end as local wall-clock time
  (`YYYYMMDDTHHMMSS`, no timezone conversion) — correct for the common case of admin and guests
  sharing a timezone context for one physical event. Returns `null` on an unparseable
  `weddingDateTime` (a corrupt/pre-feature localStorage value), so the caller can omit the link
  entirely rather than build a broken one.
- `buildVenueMapUrl(venueAddress)` — a Google Maps search URL. Returns `null` for a blank/whitespace
  address, same reasoning.
- `formatEventDateTime(weddingDateTime)` — the header's display string (e.g. "Saturday, June 19,
  2027 at 4:00 PM"), via `Intl`-backed `toLocaleDateString`/`toLocaleTimeString`. Also returns
  `null` on an unparseable value.

## `text.weddingDateTime` / `text.venueAddress` (`customizationStore.js`)
Two new flat keys under `DEFAULT_CONFIG.text`, alongside `title`/`tagline`/`invitation` — no
`mergeContent()` changes needed, same as every other flat `text` key (the existing
`{ ...DEFAULT_CONFIG.text, ...partial?.text }` spread auto-handles a new key). `weddingDateTime` is
a `datetime-local` input value (`"YYYY-MM-DDTHH:mm"`) and is **required** — `AdminScreen.jsx` blocks
Save with a status message if it's empty, since the Calendar link has no sensible fallback without
a date. `venueAddress` is optional and defaults to `''`; both `DEFAULT_CONFIG` and
`EIGHTIES_CONFIG` ship the same placeholder date (`EIGHTIES_CONFIG` inherits it via its existing
`structuredClone(DEFAULT_CONFIG)` spread, no override needed) and an empty venue.

## Relationships / Cross-links
- Rendered by `App.jsx` — see `architecture.md`'s "Routing & pages".
- Reads config from `customizationStore.js` (`text.names`, `text.title`/`tagline`/`invitation`,
  `text.weddingDateTime`/`venueAddress`, `text.songsEnabled`/`foodEnabled`, `links`) — see
  `architecture.md`.
- Uses `eventLinks.js` (this file), the shared `LinksRow.jsx`/`linkUtils.js` (external links only —
  see `architecture.md`'s "Opening-page links"), and `useRsvpStatus.js` (in-app page-link lock
  state — see [`rsvp-pages.md`](rsvp-pages.md)).
- Renders `RsvpPage.jsx` and `GameTeaser.jsx` directly inside `.home-columns` — see
  [`rsvp-pages.md`](rsvp-pages.md) for both.
- The `weddingDateTime`/`venueAddress` fields are editable in `AdminScreen.jsx`'s Text section,
  right after Title/Tagline; `songsEnabled`/`foodEnabled` are in its Pages section.
