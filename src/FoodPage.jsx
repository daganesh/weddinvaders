import { useState } from 'react';
import { useRsvpStatus } from './useRsvpStatus';
import GateNotice from './GateNotice';
import './PagesShared.css';

const FOOD_KEY = 'weddinvaders:food:v1';

function loadNotes() {
  try { return localStorage.getItem(FOOD_KEY) ?? ''; } catch { return ''; }
}

// Local-only, same as rsvpStore.js/SongsPage.jsx — remembered on the guest's
// own device, not collected anywhere the couple can see yet.
export default function FoodPage({ config }) {
  const [notes, setNotes] = useState(loadNotes);
  const [saved, setSaved] = useState(false);
  const { attending } = useRsvpStatus();

  if (!config.text.foodEnabled) {
    return (
      <div className="page-card">
        <h1 className="page-title">🍽️ Food Requests</h1>
        <p className="page-lead">This wedding isn't collecting food requests.</p>
      </div>
    );
  }
  if (!attending) return <GateNotice reason="attending" />;

  function handleSave() {
    try { localStorage.setItem(FOOD_KEY, notes); } catch { /* ignore */ }
    setSaved(true);
  }

  return (
    <div className="page-card">
      <h1 className="page-title">🍽️ Food Requests</h1>
      <p className="page-lead">Any allergies or dietary needs we should know about?</p>

      <label className="field-label">
        Allergies / dietary restrictions
        <textarea
          value={notes}
          onChange={e => { setNotes(e.target.value); setSaved(false); }}
          placeholder="e.g. vegetarian, nut allergy, gluten-free..."
        />
      </label>

      <button className="big-btn" onClick={handleSave}>Save</button>
      {saved && <p className="page-lead">Got it, thank you! 💛</p>}
    </div>
  );
}
