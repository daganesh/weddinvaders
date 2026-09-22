// Local-only RSVP store — the guest's own browser remembers their response
// and uses it to unlock the Registry/Songs/Food pages for them. There is no
// backend yet (see customizationStore.js's admin config, same constraint):
// this does NOT send the response anywhere the couple can see it. It's a
// working gate/UX demo, not a guest-list tool — a real backend or a
// third-party form service is a separate, later decision.
const RSVP_KEY = 'weddinvaders:rsvp:v1';

function readRaw() {
  try {
    const raw = localStorage.getItem(RSVP_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// Every page that shows a lock state (PageHeader's hamburger, InviteScreen's
// page-links row, RegistryPage/SongsPage/FoodPage's own gate) reads this
// store directly during render — fine when a page-level render is triggered
// by navigation, but a sibling like PageHeader has no reason to re-render
// just because RsvpPage's own local state changed after a submit. This tiny
// pub-sub (paired with useRsvpStatus.js) is what makes lock icons update
// immediately, in the same tab, without needing a navigation to refresh them.
const listeners = new Set();
function notify() {
  listeners.forEach(fn => fn());
}
export function subscribeRsvp(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getRsvpResponse() {
  return readRaw();
}

export function hasRsvped() {
  return readRaw() !== null;
}

// Registry unlocks on any RSVP (even "not attending" — a declining guest may
// still want to send a gift); Songs/Food need a confirmed "attending" one.
export function isAttending() {
  return readRaw()?.attending === true;
}

export function saveRsvpResponse({ name, email, phone, guests, attending, message }) {
  const response = {
    name: (name ?? '').trim(),
    email: (email ?? '').trim(),
    phone: (phone ?? '').trim(),
    guests: Math.max(1, Number(guests) || 1),
    attending: attending === true,
    message: (message ?? '').trim(),
    submittedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(RSVP_KEY, JSON.stringify(response));
  } catch {
    // Best-effort — a full quota just means the gate won't persist across
    // reloads; the page's own in-memory confirmation view still works.
  }
  notify();
  return response;
}

export function clearRsvpResponse() {
  try { localStorage.removeItem(RSVP_KEY); } catch { /* ignore */ }
  notify();
}
