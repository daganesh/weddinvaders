import { useState } from 'react';
import { getRsvpResponse, saveRsvpResponse } from './rsvpStore';
import { formatEventDateTime } from './eventLinks';
import './PagesShared.css';

// name/email/phone can be pre-filled via the link's query string
// (?name=...&email=...&phone=...) so a couple can send each guest a
// personalized link that shows up already filled in — a bit faster than
// typing it all from scratch. Only read once, at first mount: if the guest
// already has a saved response we show that instead (see RsvpPage below).
function prefillFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    name: params.get('name') ?? '',
    email: params.get('email') ?? '',
    phone: params.get('phone') ?? '',
  };
}

export default function RsvpPage({ config }) {
  const existing = getRsvpResponse();
  const [editing, setEditing] = useState(!existing);
  const [response, setResponse] = useState(existing);
  const [draft, setDraft] = useState(() => {
    if (existing) return existing;
    return { ...prefillFromQuery(), guests: 1, attending: null, message: '' };
  });

  const coupleNames = `${config.text.names.bride} & ${config.text.names.groom}`;
  const formattedDate = formatEventDateTime(config.text.weddingDateTime);

  function setField(key, value) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  function adjustGuests(delta) {
    setDraft(d => ({ ...d, guests: Math.max(1, (d.guests || 1) + delta) }));
  }

  const canSubmit = draft.name.trim().length > 0 && (draft.attending === true || draft.attending === false);

  function handleSubmit() {
    if (!canSubmit) return;
    const saved = saveRsvpResponse(draft);
    setResponse(saved);
    setEditing(false);
  }

  function handleEdit() {
    setDraft(response);
    setEditing(true);
  }

  if (!editing && response) {
    return (
      <div className="page-card">
        <h1 className="page-title">
          {response.attending ? `See you there, ${response.name}! 🎉` : `We'll miss you, ${response.name} 💔`}
        </h1>
        {response.attending && formattedDate && (
          <p className="page-lead">{coupleNames} — {formattedDate}</p>
        )}
        <p className="page-lead">Thanks for letting us know!</p>

        {response.attending && (
          <div className="choice-row">
            {config.text.songsEnabled && (
              <a className="big-btn" href="#/songs">🎵 Request Songs</a>
            )}
            {config.text.foodEnabled && (
              <a className="big-btn" href="#/food">🍽️ Food Requests</a>
            )}
          </div>
        )}
        <a className="big-btn" href="#/registry">🎁 Visit Our Registry</a>

        <button className="big-btn big-btn-secondary" onClick={handleEdit}>Change my RSVP</button>
      </div>
    );
  }

  return (
    <div className="page-card">
      <h1 className="page-title">RSVP</h1>
      <p className="page-lead">
        {coupleNames}{formattedDate ? ` — ${formattedDate}` : ''}
      </p>

      <label className="field-label">
        Your name
        <input
          type="text"
          value={draft.name}
          onChange={e => setField('name', e.target.value)}
          placeholder="Your name"
        />
      </label>

      <label className="field-label">
        Email (optional)
        <input
          type="email"
          value={draft.email}
          onChange={e => setField('email', e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <label className="field-label">
        Phone (optional)
        <input
          type="tel"
          value={draft.phone}
          onChange={e => setField('phone', e.target.value)}
          placeholder="Phone number"
        />
      </label>

      <div className="field-label">
        Will you be there?
        <div className="choice-row">
          <button
            className={`choice-btn${draft.attending === true ? ' is-selected' : ''}`}
            onClick={() => setField('attending', true)}
          >
            🎉 Joyfully accepts
          </button>
          <button
            className={`choice-btn${draft.attending === false ? ' is-selected' : ''}`}
            onClick={() => setField('attending', false)}
          >
            💔 Regretfully declines
          </button>
        </div>
      </div>

      {draft.attending === true && (
        <div className="field-label">
          Number of guests (including you)
          <div className="stepper">
            <button
              className="stepper-btn"
              onClick={() => adjustGuests(-1)}
              disabled={draft.guests <= 1}
              aria-label="Fewer guests"
            >
              −
            </button>
            <span className="stepper-value">{draft.guests}</span>
            <button className="stepper-btn" onClick={() => adjustGuests(1)} aria-label="More guests">
              +
            </button>
          </div>
        </div>
      )}

      <label className="field-label">
        Message (optional)
        <textarea
          value={draft.message}
          onChange={e => setField('message', e.target.value)}
          placeholder="Anything you'd like to add..."
        />
      </label>

      <button className="big-btn" onClick={handleSubmit} disabled={!canSubmit}>
        💌 SEND WITH LOVE
      </button>
    </div>
  );
}
