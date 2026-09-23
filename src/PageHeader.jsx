import { useState } from 'react';
import { useRsvpStatus } from './useRsvpStatus';
import { withProtocol } from './linkUtils';
import defaultBannerSrc from './assets/banner-default.svg';
import './Game.css';

// Shared chrome for every page (Home/RSVP/Registry/Songs/Food/Game) — sticky
// banner + hamburger nav, reused so it isn't duplicated per page. Admin is
// the one screen that doesn't get this (it has its own full-screen layout).
export default function PageHeader({ config }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const bannerSrc = config.images.banner || defaultBannerSrc;
  const organizerName = config.text.organizerName.trim();
  const organizerUrl = config.text.organizerUrl.trim();

  const { rsvped, attending } = useRsvpStatus();

  // "locked" is a hint, not a block — clicking through still works, landing
  // on that page's own GateNotice, which explains why and links to RSVP.
  // Visible-but-blocked, per the requirement, rather than hidden entirely.
  // Home and RSVP are a single entry — the home page embeds the RSVP form
  // directly (see InviteScreen.jsx) rather than linking out to it.
  const navItems = [
    { id: 'home', href: '#/', label: '💌 Invitation & RSVP', locked: false },
    { id: 'registry', href: '#/registry', label: '🎁 Registry', locked: !rsvped },
    ...(config.text.songsEnabled ? [{ id: 'songs', href: '#/songs', label: '🎵 Songs', locked: !attending }] : []),
    ...(config.text.foodEnabled ? [{ id: 'food', href: '#/food', label: '🍽️ Food', locked: !attending }] : []),
    { id: 'game', href: '#/game', label: '🎮 Game', locked: false },
  ];

  return (
    <div className="game-header-bar">
      <a className="banner-link" href="#/" title="Home">
        <img className="game-banner" src={bannerSrc} alt="Wedding banner" />
      </a>

      <div className="game-menu-anchor">
        <button className="hamburger-btn" onClick={() => setMenuOpen(o => !o)} title="Menu">
          ☰
        </button>
        {menuOpen && (
          <>
            <div className="game-menu-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="game-menu-dropdown">
              {navItems.map(item => (
                <a
                  key={item.id}
                  href={item.href}
                  className={item.locked ? 'is-locked' : ''}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}{item.locked ? ' 🔒' : ''}
                </a>
              ))}
              <button onClick={() => { setMenuOpen(false); window.location.hash = '#/admin'; }}>
                ⚙ Admin
              </button>
              <button onClick={() => { setMenuOpen(false); setShowAbout(true); }}>
                ℹ️ About
              </button>
            </div>
          </>
        )}
      </div>

      {showAbout && (
        <div className="about-modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="about-modal" onClick={e => e.stopPropagation()}>
            <h3>About This Game</h3>
            <p>Made with 🎮 Weddin&apos;Vaders.</p>
            {(organizerName || organizerUrl) && (
              <p>
                Planned by{' '}
                {organizerUrl ? (
                  <a
                    className="about-organizer-link"
                    href={withProtocol(organizerUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {organizerName || organizerUrl}
                  </a>
                ) : (
                  <strong>{organizerName}</strong>
                )}
              </p>
            )}
            <button className="about-close" onClick={() => setShowAbout(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
