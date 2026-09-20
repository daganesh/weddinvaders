// Pure helpers for the two "computed" invitation-screen links — Add to
// Calendar and Venue Maps — derived from the admin's wedding date/time and
// (optional) venue address rather than typed in directly like the free-form
// `links` array. No date/URL libraries needed: a Google Calendar "add event"
// link and an .ics-free Maps search link are both just string templates.

// No end time is collected from the admin (just one date/time field, kept
// deliberately simple) — every generated calendar event is assumed to run
// this long.
const EVENT_DURATION_HOURS = 4;

function pad(n) {
  return String(n).padStart(2, '0');
}

// Formats a Date as Google Calendar's YYYYMMDDTHHMMSS "dates" param, using
// the browser's local wall-clock time (no timezone conversion) — simplest
// option, and correct for the common case of admin and guests sharing a
// timezone context for a single physical event.
function toCalendarStamp(date) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

// weddingDateTime is a `datetime-local` input value ("YYYY-MM-DDTHH:mm"),
// always present (required field) — but guarded anyway since a corrupt/
// pre-feature localStorage value could still hand this an invalid string.
export function buildGoogleCalendarUrl({ title, weddingDateTime, venueAddress, details }) {
  const start = new Date(weddingDateTime);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + EVENT_DURATION_HOURS * 60 * 60 * 1000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toCalendarStamp(start)}/${toCalendarStamp(end)}`,
    details: details || '',
  });
  if (venueAddress?.trim()) params.set('location', venueAddress.trim());
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// null while the venue is undisclosed — callers hide the "Venue Maps" link
// entirely in that case, rather than showing a broken/empty-query link.
export function buildVenueMapUrl(venueAddress) {
  const trimmed = venueAddress?.trim();
  if (!trimmed) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}

// Display formatting for the invitation header — e.g. "Saturday, June 19,
// 2027 at 4:00 PM". Returns null for the same corrupt-data case as above so
// callers can hide the date line instead of showing "Invalid Date".
export function formatEventDateTime(weddingDateTime) {
  const date = new Date(weddingDateTime);
  if (Number.isNaN(date.getTime())) return null;
  const datePart = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timePart = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} at ${timePart}`;
}
