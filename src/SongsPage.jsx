import { useState } from 'react';
import { useRsvpStatus } from './useRsvpStatus';
import GateNotice from './GateNotice';
import './PagesShared.css';

const SONGS_KEY = 'weddinvaders:songs:v1';

function loadRequests() {
  try {
    const raw = localStorage.getItem(SONGS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRequests(list) {
  try { localStorage.setItem(SONGS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

// Local-only, same as rsvpStore.js — requests are remembered on the guest's
// own device so they can see/remove what they've added, not collected
// anywhere the couple can see yet.
export default function SongsPage({ config }) {
  const [requests, setRequests] = useState(loadRequests);
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const { attending } = useRsvpStatus();

  if (!config.text.songsEnabled) {
    return (
      <div className="page-card">
        <h1 className="page-title">🎵 Song Requests</h1>
        <p className="page-lead">This wedding isn't taking song requests.</p>
      </div>
    );
  }
  if (!attending) return <GateNotice reason="attending" />;

  function addRequest() {
    if (!song.trim()) return;
    const next = [...requests, { id: Date.now().toString(36), song: song.trim(), artist: artist.trim() }];
    setRequests(next);
    saveRequests(next);
    setSong('');
    setArtist('');
  }

  function removeRequest(id) {
    const next = requests.filter(r => r.id !== id);
    setRequests(next);
    saveRequests(next);
  }

  return (
    <div className="page-card">
      <h1 className="page-title">🎵 Song Requests</h1>
      <p className="page-lead">What should we play to get you on the dance floor?</p>

      <label className="field-label">
        Song title
        <input type="text" value={song} onChange={e => setSong(e.target.value)} placeholder="Song title" />
      </label>
      <label className="field-label">
        Artist (optional)
        <input type="text" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist" />
      </label>
      <button className="big-btn" onClick={addRequest} disabled={!song.trim()}>+ Add Request</button>

      {requests.length > 0 && (
        <div className="field-label">
          Your requests
          <div className="choice-row">
            {requests.map(r => (
              <button key={r.id} className="choice-btn" onClick={() => removeRequest(r.id)} title="Tap to remove">
                {r.song}{r.artist ? ` — ${r.artist}` : ''} ✕
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
