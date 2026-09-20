// An admin typing "example.com/rsvp" instead of "https://example.com/rsvp"
// is a common slip that would otherwise resolve as a broken relative link.
// Site-relative paths (the bundled example pages in public/examples/, which
// customizationStore.js's DEFAULT_LINKS builds from import.meta.env.BASE_URL,
// or anything else an admin points within this site) are left untouched.
// Shared by Game.jsx (the persistent post-game links footer) and
// InviteScreen.jsx (the invitation screen's links row).
export function withProtocol(url) {
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return url;
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}
