import { useState } from 'react';
import {
  DEFAULT_PACKAGE_ID,
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
import { fileToProcessedPngDataUrl } from './imageProcessing';
import brideImgSrc from './assets/bride-nobg.png';
import groomImgSrc from './assets/groom-nobg.png';
import coupleImgSrc from './assets/couple-nobg.png';
import './AdminScreen.css';

const DEFAULT_IMG_SRC = { bride: brideImgSrc, groom: groomImgSrc, couple: coupleImgSrc };
const IMAGE_ROLES = [
  { role: 'bride', label: 'Bride' },
  { role: 'groom', label: 'Groom' },
  { role: 'couple', label: 'Couple (win screen)' },
];

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

  const isDefault = selectedId === DEFAULT_PACKAGE_ID;

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
    setShowNewPackageModal(true);
  }

  function handleCreatePackage() {
    try {
      const pkg = createPackage(newPackageName, newPackageCopyFrom);
      setShowNewPackageModal(false);
      refreshPackages();
      selectPackage(pkg.id);
      flashStatus(`Created "${pkg.name}".`);
    } catch (err) {
      flashStatus(err.message);
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
      // Re-encodes as PNG and fades near-white background pixels to
      // transparent, so uploads don't need pre-editing.
      const dataUrl = await fileToProcessedPngDataUrl(file);
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
              {pkg.id === activeId && <span className="admin-active-dot" title="Active package" />}
            </button>
          ))}
        </div>
      </section>

      {showNewPackageModal && (
        <div className="admin-modal-overlay" onClick={() => setShowNewPackageModal(false)}>
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
            <div className="admin-modal-actions">
              <button onClick={() => setShowNewPackageModal(false)}>Cancel</button>
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
            The default package is read-only. Use the + button above to create a new package from these values.
          </p>
        )}
      </section>

      <fieldset disabled={isDefault} className="admin-fieldset">
        <section>
          <h2>Images</h2>
          {IMAGE_ROLES.map(({ role, label }) => (
            <div className="admin-image-row" key={role}>
              <img src={draft.images[role] || DEFAULT_IMG_SRC[role]} alt={label} width={80} height={80} />
              <div className="admin-image-controls">
                <span>{label}</span>
                <input type="file" accept="image/*" onChange={e => handleImageFile(role, e.target.files[0])} />
                <button onClick={() => resetImage(role)}>Reset to default</button>
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
