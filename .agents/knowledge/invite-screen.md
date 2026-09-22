# Component: `InviteScreen` (`src/InviteScreen.jsx`)

## Location
`src/InviteScreen.jsx` — `export default function InviteScreen({ config })`. The `'home'` route's
content.

## Purpose
The home page (see `architecture.md`'s "Routing & pages" and "Home screen"): a plain DOM "digital
wedding card." It carries everything a guest needs before ever touching the game — who/when/where,
navigation into the real RSVP/Registry/Songs/Food pages, and a teaser for the game itself with a
link into it. Deliberately not canvas-drawn, same reasoning as `.mode-select-overlay`/the old
canvas title notice: the couple names/date/venue/invitation copy are admin-customizable,
variable-length text that needs to wrap like normal HTML, and every link here needs to be a real
anchor regardless.

## Construction
Rendered by `App.jsx`, always mounted alongside every other page, visible only on the `'home'` route:
```jsx
<div style={{ display: route === 'home' ? undefined : 'none' }}>
  <InviteScreen config={activeConfig} />
</div>
```
`config` only — the active package's full config (read the same non-ref way other pages read it,
via `getActiveConfig()`, since this is display-only).

## Key Surface
| Element | Purpose |
|---|---|
| `.invite-header` | Couple names (`` `${names.bride} & ${names.groom}` `` — no separate "couple names" field; reuses the existing `text.names` fields also used for the in-game control legend), the formatted wedding date/time (`eventLinks.js`'s `formatEventDateTime(config.text.weddingDateTime)`, hidden if the stored value somehow fails to parse), and the venue address line (`config.text.venueAddress`, hidden entirely when blank — a couple may not want to disclose the venue yet). |
| `.invite-body` | `config.text.invitation` (the existing freeform wedding-invite copy field) — skipped entirely when blank. |
| `pageLinks` / `.title-links` (in-app nav) | Plain `<a href="#/rsvp">` etc. pills for RSVP, Registry, and (when enabled) Songs/Food — **not** run through `LinksRow`/`withProtocol`, which is for *external* links and would mangle a bare hash fragment into `https://#/rsvp`. `useRsvpStatus()` (see `rsvp-pages.md`) drives each entry's `locked` flag (`registry`: not `rsvped`; `songs`/`food`: not `attending`) — a locked entry gets `.is-locked` (dimmed) and a trailing 🔒, but still links through to that page's own `GateNotice` rather than being disabled. Reactive: submitting an RSVP elsewhere in the app updates these immediately, no navigation needed. |
| `extraLinks` array + `<LinksRow>` | The admin's free-form `config.links` (genuinely external extras — directions, wedding website, hotel block…) plus two **computed** entries appended after them: `📅 Add to Calendar` (always present — `weddingDateTime` is a required field, so there's always something to build from) and `📍 Venue Maps` (only when `venueAddress` is non-empty). Rendered through the shared `src/LinksRow.jsx` component — real external links, `target="_blank"`, run through `withProtocol()`. |
| `.invite-teaser` | The game callout/CTA block — reuses `config.text.title`/`config.text.tagline` (the same fields that used to render on the canvas title screen) rather than adding a separate "teaser copy" field, so an admin editing the existing Title/Tagline inputs in `AdminScreen.jsx` is already editing this. Contains a `▶ START PLAYING` link (`<a href="#/game">`, plain hash nav — no callback prop any more). |

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
- The `weddingDateTime`/`venueAddress` fields are editable in `AdminScreen.jsx`'s Text section,
  right after Title/Tagline; `songsEnabled`/`foodEnabled` are in its Pages section.
