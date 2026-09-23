import { buildGoogleCalendarUrl, buildVenueMapUrl, formatEventDateTime } from './eventLinks';
import { LinksRow } from './LinksRow';
import { useRsvpStatus } from './useRsvpStatus';
import RsvpPage from './RsvpPage';
import GameTeaser from './GameTeaser';
import './InviteScreen.css';

// The home page (see architecture.md's "Home screen" section): a plain DOM
// "digital wedding card" carrying who/when/where, plus — the actual point of
// the page — the RSVP form itself at 66% width, so a guest can respond
// without an extra click-through. A 33% side column previews the game (see
// GameTeaser.jsx) and offers a way in regardless of RSVP status. Registry/
// Songs/Food remain separate pages, reached via the nav links below and the
// header's hamburger, since they only make sense to visit after RSVPing.
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

  // The in-app pages RSVP still unlocks (RegistryPage/SongsPage/FoodPage) —
  // plain hash nav, not run through LinksRow/withProtocol (which is for
  // *external* admin links and would mangle a bare "#/registry" fragment by
  // prepending "https://"). "Visible but blocked": a locked page still links
  // through, landing on its own GateNotice rather than being hidden or
  // disabled. RSVP itself isn't listed here any more — it's the form right
  // below, not a link to somewhere else.
  const { rsvped, attending } = useRsvpStatus();
  const pageLinks = [
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

      <div className="home-columns">
        <div className="home-main">
          <RsvpPage config={config} />
        </div>
        <div className="home-side">
          <GameTeaser config={config} />
        </div>
      </div>

      {pageLinks.length > 0 && (
        <div className="title-links">
          {pageLinks.map(link => (
            <a key={link.id} className={`title-link${link.locked ? ' is-locked' : ''}`} href={link.href}>
              {link.label}{link.locked ? ' 🔒' : ''}
            </a>
          ))}
        </div>
      )}

      <LinksRow links={extraLinks} />
    </div>
  );
}
