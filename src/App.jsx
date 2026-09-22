import { useEffect, useState } from 'react';
import { getActiveConfig } from './customizationStore';
import Game from './Game';
import InviteScreen from './InviteScreen';
import RsvpPage from './RsvpPage';
import RegistryPage from './RegistryPage';
import SongsPage from './SongsPage';
import FoodPage from './FoodPage';
import PageHeader from './PageHeader';
import AdminScreen from './AdminScreen';
import './Game.css';

// 'home' is the invitation (InviteScreen) — everything else is a real page
// reached via a hash route. An unrecognized hash falls back to 'home' rather
// than a blank screen.
const ROUTES = new Set(['rsvp', 'registry', 'songs', 'food', 'game', 'admin']);

function getRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return ROUTES.has(raw) ? raw : 'home';
}

export default function App() {
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route === 'admin') {
    return <AdminScreen onExit={() => { window.location.hash = ''; }} />;
  }

  // Read directly (not via a ref) since this drives what every page below
  // renders (banner, gating flags, colors) — a plain render-time read, same
  // pattern Game.jsx and InviteScreen already used before this file existed.
  const activeConfig = getActiveConfig();
  const { brideColor, groomColor, accent } = activeConfig.colors;

  // Every page is always mounted — only one is shown at a time via CSS —
  // rather than the router unmounting whichever isn't current. This matters
  // most for Game: its running state lives in a hook local to that
  // component, so unmounting it on navigation would destroy an in-progress
  // run. The same treatment for the lighter pages is just a bonus (an
  // unsaved RSVP/song-request draft survives a detour to another page too).
  return (
    <div
      className="game-wrapper"
      style={{ '--wv-bride-color': brideColor, '--wv-groom-color': groomColor, '--wv-accent-color': accent }}
    >
      <div className={`game-container${route === 'game' ? ' is-playing' : ''}`}>
        <PageHeader config={activeConfig} />

        <div style={{ display: route === 'home' ? undefined : 'none' }}>
          <InviteScreen config={activeConfig} />
        </div>
        <div style={{ display: route === 'rsvp' ? undefined : 'none' }}>
          <RsvpPage config={activeConfig} />
        </div>
        <div style={{ display: route === 'registry' ? undefined : 'none' }}>
          <RegistryPage config={activeConfig} />
        </div>
        <div style={{ display: route === 'songs' ? undefined : 'none' }}>
          <SongsPage config={activeConfig} />
        </div>
        <div style={{ display: route === 'food' ? undefined : 'none' }}>
          <FoodPage config={activeConfig} />
        </div>
        <div style={{ display: route === 'game' ? undefined : 'none' }}>
          <Game active={route === 'game'} />
        </div>
      </div>
    </div>
  );
}
