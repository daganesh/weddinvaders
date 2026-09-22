// An admin typing "example.com" instead of "https://example.com" is a common
// slip that would otherwise resolve as a broken relative link. Site-relative
// paths (anything an admin points within this site, e.g. "/some/path") are
// left untouched. Shared by InviteScreen.jsx's extra-links row (genuinely
// external admin links) — in-app page navigation uses plain `#/...` hash
// anchors directly, not this function (see rsvp-pages.md).
export function withProtocol(url) {
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return url;
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}
