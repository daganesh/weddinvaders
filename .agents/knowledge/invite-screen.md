# Component: `InviteScreen` (`src/InviteScreen.jsx`)

## Location
`src/InviteScreen.jsx` — `export default function InviteScreen({ config, onStartPlaying })`.
Small, purely presentational — no hooks, no local state.

## Purpose
Phase 1 of the app (see `architecture.md`'s "Invitation screen (Phase 1) vs. game view (Phase 2)"):
a plain DOM "digital wedding card," shown by default instead of the canvas. It carries everything a
guest needs before ever touching the game — who/when/where, the essential links, and a teaser for
the game — with a single CTA (`onStartPlaying`, wired to `Game.jsx`'s `handleStartPlaying`) into
Phase 2. Deliberately not canvas-drawn, same reasoning as `.mode-select-overlay`/the old
canvas title notice: the couple names/date/venue/invitation copy are admin-customizable,
variable-length text that needs to wrap like normal HTML, and every link here needs to be a real
anchor regardless.

## Construction
Rendered by `Game.jsx` when `showInvite` is true:
```jsx
<InviteScreen config={activeConfig} onStartPlaying={handleStartPlaying} />
```
Props only — `config` is the active package's full config (read the same non-ref way `Game.jsx`
reads it elsewhere, via `getActiveConfig()`, since this is display-only).

## Key Surface
| Element | Purpose |
|---|---|
| `.invite-header` | Couple names (`` `${names.bride} & ${names.groom}` `` — no separate "couple names" field; reuses the existing `text.names` fields also used for the in-game control legend), the formatted wedding date/time (`eventLinks.js`'s `formatEventDateTime(config.text.weddingDateTime)`, hidden if the stored value somehow fails to parse), and the venue address line (`config.text.venueAddress`, hidden entirely when blank — a couple may not want to disclose the venue yet). |
| `.invite-body` | `config.text.invitation` (the existing freeform wedding-invite copy field) — skipped entirely when blank. |
| `links` array + `<LinksRow>` | Combines the admin's free-form `config.links` (RSVP, Gift Registry, Song Requests, and anything else — filtered to non-empty `url`s) with two **computed** entries appended after them: `📅 Add to Calendar` (always present — `weddingDateTime` is a required field, so there's always something to build from) and `📍 Venue Maps` (only when `venueAddress` is non-empty). Appended after the free-form list rather than interleaved to a fixed position, since that list's order/labels are entirely admin-controlled and there's no reliable way to know which entry (if any) is "the RSVP one" to insert next to. Rendered through the shared `src/LinksRow.jsx` component (`Game.jsx` no longer has a links row of its own — that was removed in favor of this screen being the only place they show) — same pill styling (`.title-link`/`.title-links` in `Game.css`), no separate CSS. |
| `.invite-teaser` | The game callout/CTA block — reuses `config.text.title`/`config.text.tagline` (the same fields that used to render on the canvas title screen) rather than adding a separate "teaser copy" field, so an admin editing the existing Title/Tagline inputs in `AdminScreen.jsx` is already editing this. Contains the `▶ START PLAYING` button (`onStartPlaying`). |

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
- Rendered by `Game.jsx` — see [`game-jsx.md`](game-jsx.md).
- Reads config from `customizationStore.js` (`text.names`, `text.title`/`tagline`/`invitation`,
  `text.weddingDateTime`/`venueAddress`, `links`) — see `architecture.md`.
- Uses `eventLinks.js` (this file) and the shared `LinksRow.jsx`/`linkUtils.js` (also used by
  `Game.jsx`'s post-game links footer) — see `architecture.md`'s "Opening-page links".
- The two new `text` fields are editable in `AdminScreen.jsx`'s Text section, right after
  Title/Tagline.
