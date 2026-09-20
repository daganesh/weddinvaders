import { withProtocol } from './linkUtils';

// Shared pill-link row — used both by Game.jsx (the persistent footer shown
// once the invitation screen is dismissed) and InviteScreen.jsx (the
// invitation's own links row, which mixes admin free-form links with the two
// computed ones from eventLinks.js). `links` entries are already filtered to
// non-empty urls by the caller; rendering nothing here for an empty list
// keeps both call sites simple.
export function LinksRow({ links, className = 'title-links' }) {
  if (links.length === 0) return null;
  return (
    <div className={className}>
      {links.map(link => (
        <a
          key={link.id}
          className="title-link"
          href={withProtocol(link.url.trim())}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.label || 'Link'}
        </a>
      ))}
    </div>
  );
}
