import { useState } from 'react';
import { getConfig, saveConfig, resetToDefaults } from './customizationStore';
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
  const [config, setConfig] = useState(() => getConfig());
  const [status, setStatus] = useState('');

  function flashStatus(message) {
    setStatus(message);
    setTimeout(() => setStatus(''), 2000);
  }

  async function handleImageFile(role, file) {
    if (!file) return;
    try {
      // Re-encodes as PNG and fades near-white background pixels to
      // transparent, so uploads don't need pre-editing.
      const dataUrl = await fileToProcessedPngDataUrl(file);
      setConfig(c => ({ ...c, images: { ...c.images, [role]: dataUrl } }));
    } catch {
      flashStatus(`Could not process that image for ${role}.`);
    }
  }

  function resetImage(role) {
    setConfig(c => ({ ...c, images: { ...c.images, [role]: null } }));
  }

  function setColor(key, value) {
    setConfig(c => ({ ...c, colors: { ...c.colors, [key]: value } }));
  }

  function setTextField(key, value) {
    setConfig(c => ({ ...c, text: { ...c.text, [key]: value } }));
  }

  function setFamilyLabel(role, value) {
    setConfig(c => ({ ...c, text: { ...c.text, familyLabels: { ...c.text.familyLabels, [role]: value } } }));
  }

  function setLevelField(index, key, value) {
    setConfig(c => {
      const levels = c.text.levels.map((lvl, i) => (i === index ? { ...lvl, [key]: value } : lvl));
      return { ...c, text: { ...c.text, levels } };
    });
  }

  function handleSave() {
    saveConfig(config);
    flashStatus('Saved!');
  }

  function handleResetAll() {
    const defaults = resetToDefaults();
    setConfig(defaults);
    flashStatus('Reset to defaults.');
  }

  return (
    <div className="admin-screen">
      <h1>Wedding Customization</h1>

      <section>
        <h2>Images</h2>
        {IMAGE_ROLES.map(({ role, label }) => (
          <div className="admin-image-row" key={role}>
            <img src={config.images[role] || DEFAULT_IMG_SRC[role]} alt={label} width={80} height={80} />
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
        {Object.entries(config.colors).map(([key, value]) => (
          <label key={key} className="admin-color-row">
            <span>{key}</span>
            <input type="color" value={value} onChange={e => setColor(key, e.target.value)} />
          </label>
        ))}
      </section>

      <section>
        <h2>Text</h2>
        <label className="admin-text-row">
          Title
          <input value={config.text.title} onChange={e => setTextField('title', e.target.value)} />
        </label>
        <label className="admin-text-row">
          Tagline
          <input value={config.text.tagline} onChange={e => setTextField('tagline', e.target.value)} />
        </label>
        <label className="admin-text-row">
          Win message
          <input value={config.text.winMessage} onChange={e => setTextField('winMessage', e.target.value)} />
        </label>
        <label className="admin-text-row">
          Lose message
          <input value={config.text.loseMessage} onChange={e => setTextField('loseMessage', e.target.value)} />
        </label>
        <label className="admin-text-row">
          "Her Family" label
          <input value={config.text.familyLabels.bride} onChange={e => setFamilyLabel('bride', e.target.value)} />
        </label>
        <label className="admin-text-row">
          "His Family" label
          <input value={config.text.familyLabels.groom} onChange={e => setFamilyLabel('groom', e.target.value)} />
        </label>

        <h3>Levels</h3>
        {config.text.levels.map((lvl, i) => (
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

      <div className="admin-actions">
        <button className="admin-save" onClick={handleSave}>Save</button>
        <button onClick={handleResetAll}>Reset all to defaults</button>
        <button onClick={onExit}>Back to game</button>
        {status && <span className="admin-status">{status}</span>}
      </div>
    </div>
  );
}
