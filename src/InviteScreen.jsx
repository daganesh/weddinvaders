import { buildGoogleCalendarUrl, buildVenueMapUrl, formatEventDateTime } from './eventLinks';
import { LinksRow } from './LinksRow';
import { useRsvpStatus } from './useRsvpStatus';
import './InviteScreen.css';

// Phase 1 of the game (see architecture.md's "Invitation screen / game
// phases" split): a plain DOM "digital wedding card", shown by default
// instead of the canvas. It carries everything a guest needs before ever
// touching the game — who/when/where, the essential links, and a teaser for
// the game itself — with a single CTA into Phase 2 (Game.jsx's canvas view).
//
// Deliberately not canvas-drawn: the couple names/date/venue/invitation copy
// are all admin-customizable, variable-length text that needs to wrap like
// normal HTML, and every link here needs to be a real anchor regardless —
// same reasoning `.mode-select-overlay`/the old `.title-overlay` were DOM
// all along.
export default function InviteScreen({ config }) {
  const { bride: brideName, groom: groomName } = config.text.names;
  const coupleNames = `${brideName} & ${groomName}`;
  const venueAddress = config.text.venueAddress.trim();
  const formattedDate = formatEventDateTime(config.text.weddingDateTime);

  // The in-app pages (RsvpPage/RegistryPage/SongsPage/FoodPage) — plain hash
  // nav, not run through LinksRow/withProtocol (which is for *external*
  // admin links and would mangle a bare "#/rsvp" fragment by prepending
  // "https://"). "Visible but blocked": a locked page still links through,
  // landing on its own GateNotice rather than being hidden or disabled.
  const { rsvped, attending } = useRsvpStatus();
  const pageLinks = [
    { id: 'rsvp', href: '#/rsvp', label: '💌 RSVP', locked: false },
    { id: 'registry', href: '#/registry', label: '🎁 Gift Registry', locked: !rsvped },
    ...(config.text.songsEnabled ? [{ id: 'songs', href: '#/songs', label: '🎵 Song Requests', locked: !attending }] : []),
    ...(config.text.foodEnabled ? [{ id: 'food', href: '#/food', label: '🍽️ Food Requests', locked: !attending }] : []),
  ];

  // Admin free-form extras (directions, wedding website, hotel block…) plus
  // the two computed ones — Add to Calendar always (the date is a required
  // field, so this never has nothing to build from) and Venue Maps only
  // when a venue address is set.
  const freeformLinks = config.links.filter(l => l.url.trim());
  const calendarUrl = buildGoogleCalendarUrl({
    title: `${coupleNames}'s Wedding`,
    weddingDateTime: config.text.weddingDateTime,
    venueAddress,
    details: config.text.invitation,
  });
  const mapUrl = buildVenueMapUrl(venueAddress);
  const extraLinks = [
    ...freeformLinks,
    ...(calendarUrl ? [{ id: 'add-to-calendar', label: '📅 Add to Calendar', url: calendarUrl }] : []),
    ...(mapUrl ? [{ id: 'venue-maps', label: '📍 Venue Maps', url: mapUrl }] : []),
  ];

  return (
    <div className="invite-screen">
      <header className="invite-header">
        <h1 className="invite-couple-names">{coupleNames}</h1>
        {formattedDate && <p className="invite-date">{formattedDate}</p>}
        {venueAddress && <p className="invite-location">📍 {venueAddress}</p>}
      </header>

      {config.text.invitation.trim() && (
        <p className="invite-body">{config.text.invitation}</p>
      )}

      <div className="title-links">
        {pageLinks.map(link => (
          <a key={link.id} className={`title-link${link.locked ? ' is-locked' : ''}`} href={link.href}>
            {link.label}{link.locked ? ' 🔒' : ''}
          </a>
        ))}
      </div>

      <LinksRow links={extraLinks} />

      <div className="invite-teaser">
        <p className="invite-teaser-title">🎮 {config.text.title}</p>
        <p className="invite-teaser-tagline">{config.text.tagline}</p>
        <a className="invite-cta" href="#/game">▶ START PLAYING</a>
      </div>
    </div>
  );
}
