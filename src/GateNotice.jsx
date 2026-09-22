// Shown in place of a page's real content while it's locked — reused by
// RegistryPage (needs any RSVP), SongsPage/FoodPage (needs a confirmed
// "attending" RSVP). Always explains why and links to the RSVP page, rather
// than just hiding the page's content with no way forward.
export default function GateNotice({ reason }) {
  const needsAttending = reason === 'attending';
  return (
    <div className="page-card locked-notice">
      <span className="locked-notice-icon">🔒</span>
      <h1 className="page-title">Not yet!</h1>
      <p className="page-lead">
        {needsAttending
          ? "This is just for guests who've confirmed they're coming — RSVP and let us know you'll be there to unlock it."
          : 'Please RSVP first so we know who to unlock this for.'}
      </p>
      <a className="big-btn" href="#/rsvp">💌 Go to RSVP</a>
    </div>
  );
}
