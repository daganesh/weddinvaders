import { useState } from 'react';
import {
  DEFAULT_CONFIG,
  listPackages,
  getActivePackageId,
  getPackage,
  setActivePackage,
  createPackage,
  updatePackage,
  renamePackage,
  deletePackage,
} from './customizationStore';
import { fileToImageDataUrl } from './imageProcessing';
import { WEDDING_ITEMS } from './constants';
import brideImgSrc from './assets/bride-nobg.png';
import groomImgSrc from './assets/groom-nobg.png';
import coupleImgSrc from './assets/couple-nobg.png';
import bannerImgSrc from './assets/banner-default.svg';
import './AdminScreen.css';

const DEFAULT_IMG_SRC = { bride: brideImgSrc, groom: groomImgSrc, couple: coupleImgSrc, banner: bannerImgSrc };
const PORTRAIT_ROLES = [
  { role: 'bride', label: 'Bride' },
  { role: 'groom', label: 'Groom' },
  { role: 'couple', label: 'Couple (win screen)' },
];
// Every collectible item doubles as an `images` key, same as bride/groom/couple.
const ITEM_IMAGE_ROLES = WEDDING_ITEMS.map(w => ({ role: w.id, label: w.label, emoji: w.emoji }));

export default function AdminScreen({ onExit }) {
  const [packages, setPackages] = useState(() => listPackages());
  const [activeId, setActiveId] = useState(() => getActivePackageId());
  const [selectedId, setSelectedId] = useState(() => getActivePackageId());
  const [draft, setDraft] = useState(() => getPackage(getActivePackageId()));
  const [renameInput, setRenameInput] = useState(draft.name);
  const [status, setStatus] = useState('');

  const [showNewPackageModal, setShowNewPackageModal] = useState(false);
  const [newPackageName, setNewPackageName] = useState('');
  const [newPackageCopyFrom, setNewPackageCopyFrom] = useState(selectedId);
  const [modalError, setModalError] = useState('');

  // System packages (Default, 80s Arcade, …) are code-defined and read-only —
  // shipped on every deploy, never persisted, can't be edited/renamed/deleted.
  const isDefault = draft.isDefault;

  function flashStatus(message) {
    setStatus(message);
    setTimeout(() => setStatus(''), 2500);
  }

  function refreshPackages() {
    setPackages(listPackages());
    setActiveId(getActivePackageId());
  }

  function selectPackage(id) {
    setSelectedId(id);
    const pkg = getPackage(id);
    setDraft(pkg);
    setRenameInput(pkg.name);
  }

  function openNewPackageModal() {
    setNewPackageName('');
    setNewPackageCopyFrom(selectedId);
    setModalError('');
    setShowNewPackageModal(true);
  }

  function closeNewPackageModal() {
    setShowNewPackageModal(false);
    setModalError('');
  }

  function handleCreatePackage() {
    try {
      const pkg = createPackage(newPackageName, newPackageCopyFrom);
      setShowNewPackageModal(false);
      setModalError('');
      refreshPackages();
      selectPackage(pkg.id);
      flashStatus(`Created "${pkg.name}".`);
    } catch (err) {
      // Shown inside the modal, not the page's status bar — the modal
      // overlay sits above that bar and would hide it while open.
      setModalError(err.message);
    }
  }

  function handleRename() {
    try {
      const pkg = renamePackage(selectedId, renameInput);
      refreshPackages();
      setDraft(pkg);
      flashStatus('Renamed.');
    } catch (err) {
      flashStatus(err.message);
    }
  }

  function handleDelete() {
    if (!window.confirm(`Delete package "${draft.name}"? This cannot be undone.`)) return;
    deletePackage(selectedId);
    refreshPackages();
    selectPackage(getActivePackageId());
    flashStatus('Package deleted.');
  }

  function handleSetActive(id) {
    setActivePackage(id);
    refreshPackages();
    flashStatus('Set as active package.');
  }

  async function handleImageFile(role, file) {
    if (!file) return;
    try {
      // SVGs pass through as-is; other formats get re-encoded to PNG with
      // near-white background pixels faded to transparent.
      const dataUrl = await fileToImageDataUrl(file);
      setDraft(c => ({ ...c, images: { ...c.images, [role]: dataUrl } }));
    } catch {
      flashStatus(`Could not process that image for ${role}.`);
    }
  }

  function resetImage(role) {
    setDraft(c => ({ ...c, images: { ...c.images, [role]: null } }));
  }

  function setColor(key, value) {
    setDraft(c => ({ ...c, colors: { ...c.colors, [key]: value } }));
  }

  function setTextField(key, value) {
    setDraft(c => ({ ...c, text: { ...c.text, [key]: value } }));
  }

  function setNameField(role, value) {
    setDraft(c => ({ ...c, text: { ...c.text, names: { ...c.text.names, [role]: value } } }));
  }

  function setFamilyLabel(role, value) {
    setDraft(c => ({ ...c, text: { ...c.text, familyLabels: { ...c.text.familyLabels, [role]: value } } }));
  }

  function setLinkField(index, key, value) {
    setDraft(c => ({
      ...c,
      links: c.links.map((link, i) => (i === index ? { ...link, [key]: value } : link)),
    }));
  }

  function addLink() {
    setDraft(c => ({
      ...c,
      links: [...c.links, { id: `link_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, label: '', url: '' }],
    }));
  }

  function removeLink(index) {
    setDraft(c => ({ ...c, links: c.links.filter((_, i) => i !== index) }));
  }

  function setLevelField(index, key, value) {
    setDraft(c => {
      const levels = c.text.levels.map((lvl, i) => (i === index ? { ...lvl, [key]: value } : lvl));
      return { ...c, text: { ...c.text, levels } };
    });
  }

  function handleResetDraftToDefault() {
    setDraft(c => ({ ...c, ...structuredClone(DEFAULT_CONFIG) }));
  }

  function handleSave() {
    if (!draft.text.weddingDateTime) {
      flashStatus('Wedding date & time is required before saving.');
      return;
    }
    updatePackage(selectedId, draft);
    onExit();
  }

  return (
    <div className="admin-screen">
      <h1>Wedding Customization</h1>

      <section className="admin-package-bar">
        <div className="admin-section-header">
          <h2>Packages</h2>
          <button className="admin-icon-btn" title="New package" onClick={openNewPackageModal}>+</button>
        </div>
        <div className="admin-package-list">
          {packages.map(pkg => (
            <button
              key={pkg.id}
              className={`admin-package-chip${pkg.id === selectedId ? ' is-selected' : ''}`}
              onClick={() => selectPackage(pkg.id)}
            >
              {pkg.name}
              {pkg.isDefault && <span className="admin-system-tag">system</span>}
              {pkg.id === activeId && <span className="admin-active-dot" title="Active package" />}
            </button>
          ))}
        </div>
      </section>

      {showNewPackageModal && (
        <div className="admin-modal-overlay" onClick={closeNewPackageModal}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>New package</h3>
            <label className="admin-text-row">
              Name
              <input
                value={newPackageName}
                onChange={e => setNewPackageName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreatePackage(); }}
                autoFocus
              />
            </label>
            <label className="admin-text-row">
              Copy from
              <select value={newPackageCopyFrom} onChange={e => setNewPackageCopyFrom(e.target.value)}>
                {packages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                ))}
              </select>
            </label>
            {modalError && <p className="admin-modal-error">{modalError}</p>}
            <div className="admin-modal-actions">
              <button onClick={closeNewPackageModal}>Cancel</button>
              <button className="admin-save" onClick={handleCreatePackage}>Create</button>
            </div>
          </div>
        </div>
      )}

      <section className="admin-package-detail">
        <div className="admin-package-name-row">
          {isDefault ? (
            <h2 className="admin-package-title">{draft.name}</h2>
          ) : (
            <>
              <input value={renameInput} onChange={e => setRenameInput(e.target.value)} />
              <button
                className="admin-icon-btn"
                title="Rename package"
                onClick={handleRename}
                disabled={!renameInput.trim() || renameInput.trim() === draft.name}
              >
                ✏️
              </button>
              <button className="admin-icon-btn admin-icon-btn-danger" title="Delete package" onClick={handleDelete}>
                🗑️
              </button>
            </>
          )}
          {selectedId === activeId ? (
            <span className="admin-active-badge"><span className="admin-active-dot" /> active</span>
          ) : (
            <button onClick={() => handleSetActive(selectedId)}>Set as active package</button>
          )}
        </div>
        {isDefault && (
          <p className="admin-hint">
            "{draft.name}" is a system package and is read-only. Use the + button above to create a
            new package from these values.
          </p>
        )}
      </section>

      <fieldset disabled={isDefault} className="admin-fieldset">
        <section>
          <h2>Portraits</h2>
          {PORTRAIT_ROLES.map(({ role, label }) => (
            <div className="admin-image-row" key={role}>
              <img src={draft.images[role] || DEFAULT_IMG_SRC[role]} alt={label} width={80} height={80} />
              <div className="admin-image-controls">
                <span>{label}</span>
                <input type="file" accept="image/*,.svg" onChange={e => handleImageFile(role, e.target.files[0])} />
                <button onClick={() => resetImage(role)}>Reset to default</button>
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2>Header Banner</h2>
          <p className="admin-hint">
            Shown above the game as a page header, on every screen.
          </p>
          <div className="admin-image-row">
            <img
              className="admin-banner-preview"
              src={draft.images.banner || DEFAULT_IMG_SRC.banner}
              alt="Header banner"
            />
            <div className="admin-image-controls">
              <span>Banner</span>
              <input type="file" accept="image/*,.svg" onChange={e => handleImageFile('banner', e.target.files[0])} />
              <button onClick={() => resetImage('banner')}>Reset to default</button>
            </div>
          </div>
        </section>

        <section>
          <h2>Pages</h2>
          <p className="admin-hint">
            RSVP, Gift Registry, Song Requests, and Food Requests are built-in pages, not links —
            see below and each page's own settings.
          </p>
          <label className="admin-text-row">
            Gift registry URL
            <input
              value={draft.text.registryUrl}
              onChange={e => setTextField('registryUrl', e.target.value)}
              placeholder="https://…"
            />
          </label>
          <p className="admin-hint">
            The Registry page just links out to this — Zola, Amazon, a spreadsheet, anything with
            a URL. Left blank, guests see a "not set up yet" message. Unlocks once a guest submits
            any RSVP (even "not attending" — they may still want to send a gift).
          </p>
          <label className="admin-checkbox-row">
            <input
              type="checkbox"
              checked={draft.text.songsEnabled}
              onChange={e => setTextField('songsEnabled', e.target.checked)}
            />
            Collect song requests
          </label>
          <label className="admin-checkbox-row">
            <input
              type="checkbox"
              checked={draft.text.foodEnabled}
              onChange={e => setTextField('foodEnabled', e.target.checked)}
            />
            Collect food requests / allergies
          </label>
          <p className="admin-hint">
            Both unlock only for guests who confirmed they're attending. Turning either off hides
            it everywhere instead of leaving an empty page reachable.
          </p>
        </section>

        <section>
          <h2>Extra Links</h2>
          <p className="admin-hint">
            Anything else with a URL that doesn't have its own page yet — directions, wedding
            website, hotel block, dress code… Shown on the opening screen, hidden individually
            while their URL is blank.
          </p>
          {draft.links.map((link, i) => (
            <div className="admin-link-row" key={link.id}>
              <input
                className="admin-link-label"
                value={link.label}
                onChange={e => setLinkField(i, 'label', e.target.value)}
                placeholder="Label (e.g. RSVP)"
              />
              <input
                className="admin-link-url"
                value={link.url}
                onChange={e => setLinkField(i, 'url', e.target.value)}
                placeholder="https://…"
              />
              <button
                className="admin-icon-btn admin-icon-btn-danger"
                title="Remove link"
                onClick={() => removeLink(i)}
              >
                🗑️
              </button>
            </div>
          ))}
          <button onClick={addLink}>+ Add link</button>
        </section>

        <section>
          <h2>Item Icons</h2>
          <p className="admin-hint">
            Upload a PNG or SVG per item. Left blank, an item falls back to its emoji.
          </p>
          {ITEM_IMAGE_ROLES.map(({ role, label, emoji }) => (
            <div className="admin-image-row" key={role}>
              {draft.images[role] ? (
                <img src={draft.images[role]} alt={label} width={56} height={56} />
              ) : (
                <div className="admin-image-emoji-fallback" aria-label={`${label} (emoji fallback)`}>{emoji}</div>
              )}
              <div className="admin-image-controls">
                <span>{label}</span>
                <input type="file" accept="image/*,.svg" onChange={e => handleImageFile(role, e.target.files[0])} />
                <button onClick={() => resetImage(role)}>Reset to emoji</button>
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2>Colors</h2>
          {Object.entries(draft.colors).map(([key, value]) => (
            <label key={key} className="admin-color-row">
              <span>{key}</span>
              <input type="color" value={value} onChange={e => setColor(key, e.target.value)} />
            </label>
          ))}
        </section>

        <section>
          <h2>Text</h2>
          <label className="admin-text-row">
            Bride name
            <input value={draft.text.names.bride} onChange={e => setNameField('bride', e.target.value)} />
          </label>
          <label className="admin-text-row">
            Groom name
            <input value={draft.text.names.groom} onChange={e => setNameField('groom', e.target.value)} />
          </label>
          <label className="admin-text-row">
            Title
            <input value={draft.text.title} onChange={e => setTextField('title', e.target.value)} />
          </label>
          <label className="admin-text-row">
            Tagline
            <input value={draft.text.tagline} onChange={e => setTextField('tagline', e.target.value)} />
          </label>
          <label className="admin-text-row">
            Wedding date &amp; time *
            <input
              type="datetime-local"
              value={draft.text.weddingDateTime}
              onChange={e => setTextField('weddingDateTime', e.target.value)}
              required
            />
          </label>
          <label className="admin-text-row">
            Venue address (optional)
            <input
              value={draft.text.venueAddress}
              onChange={e => setTextField('venueAddress', e.target.value)}
              placeholder="Leave blank if the venue isn't set/disclosed yet"
            />
          </label>
          <p className="admin-hint">
            The date/time and address drive the invitation screen's header and its "Add to
            Calendar" / "Venue Maps" links — no separate fields for those.
          </p>
          <label className="admin-text-row admin-text-row-wide">
            Invitation text
            <textarea
              rows={3}
              value={draft.text.invitation}
              onChange={e => setTextField('invitation', e.target.value)}
              placeholder="You're invited to celebrate the wedding of..."
            />
          </label>
          <label className="admin-text-row">
            Win message
            <input value={draft.text.winMessage} onChange={e => setTextField('winMessage', e.target.value)} />
          </label>
          <label className="admin-text-row">
            Lose message
            <input value={draft.text.loseMessage} onChange={e => setTextField('loseMessage', e.target.value)} />
          </label>
          <label className="admin-text-row">
            "Her Family" label
            <input value={draft.text.familyLabels.bride} onChange={e => setFamilyLabel('bride', e.target.value)} />
          </label>
          <label className="admin-text-row">
            "His Family" label
            <input value={draft.text.familyLabels.groom} onChange={e => setFamilyLabel('groom', e.target.value)} />
          </label>

          <h3>Levels</h3>
          {draft.text.levels.map((lvl, i) => (
            <div key={i} className="admin-level-row">
              <span className="admin-level-index">Level {i + 1}</span>
              <input
                value={lvl.name}
                onChange={e => setLevelField(i, 'name', e.target.value)}
                placeholder="Name"
              />
              <input
                value={lvl.subtitle}
                onChange={e => setLevelField(i, 'subtitle', e.target.value)}
                placeholder="Subtitle"
              />
            </div>
          ))}
        </section>

        <section>
          <h2>About / Organizer Credit</h2>
          <p className="admin-hint">
            Shown in the game's "About" menu — a PR opportunity for the wedding-arranging company
            or venue running this game, not the couple. Leave both blank to hide it entirely.
          </p>
          <label className="admin-text-row">
            Organizer name
            <input
              value={draft.text.organizerName}
              onChange={e => setTextField('organizerName', e.target.value)}
              placeholder="e.g. Sunset Events Co."
            />
          </label>
          <label className="admin-text-row">
            Organizer link (optional)
            <input
              value={draft.text.organizerUrl}
              onChange={e => setTextField('organizerUrl', e.target.value)}
              placeholder="https://…"
            />
          </label>
        </section>
      </fieldset>

      <div className="admin-actions">
        {!isDefault && (
          <>
            <button className="admin-save" onClick={handleSave}>Save</button>
            <button onClick={handleResetDraftToDefault}>Reset fields to default values</button>
          </>
        )}
        <button onClick={onExit}>Back to game</button>
        {status && <span className="admin-status">{status}</span>}
      </div>
    </div>
  );
}
