import { useEffect, useRef, useCallback } from 'react';
import { useGameState } from './useGameState';
import { useAssets }    from './useAssets';
import { useCustomization } from './useCustomization';
import { getConfig }    from './customizationStore';
import { render }       from './renderer';
import { GAME_WIDTH, GAME_HEIGHT, CANVAS_WIDTH, AMMO_ORDER, AMMO_META } from './constants';
import './Game.css';

export default function Game() {
  const canvasRef = useRef(null);
  const assetsRef = useAssets();
  const configRef = useCustomization();
  const { getState, startLoop, stopLoop, setRenderCallback, handleAction } = useGameState();

  useEffect(() => {
    setRenderCallback((state) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      render(ctx, state, assetsRef.current, configRef.current);
    });
    startLoop();
    return () => stopLoop();
  }, [startLoop, stopLoop, setRenderCallback, assetsRef, configRef]);

  const handleCanvasClick = useCallback(() => {
    const { phase } = getState();
    if (phase === 'title')         handleAction({ type: 'START' });
    if (phase === 'meeting')       handleAction({ type: 'NEXT_LEVEL' });
    if (phase === 'levelComplete') handleAction({ type: 'NEXT_LEVEL' });
    if (phase === 'gameComplete')  handleAction({ type: 'RESTART' });
    if (phase === 'lost')          handleAction({ type: 'RESTART' });
  }, [getState, handleAction]);

  // ── mobile / on-screen controls ──────────────────────────────────────────
  const ammoKeys = AMMO_ORDER.map(id => ({ id, ...AMMO_META[id] }));

  // Read directly (not via configRef) since this is display-only and refs
  // shouldn't be accessed during render.
  const { brideColor, groomColor } = getConfig().colors;

  return (
    <div className="game-wrapper" style={{ '--wv-bride-color': brideColor, '--wv-groom-color': groomColor }}>
      <div className="game-container">
        <div className="game-toolbar">
          <button
            className="admin-btn"
            onClick={() => { window.location.hash = '#/admin'; }}
            title="Customize"
          >
            ⚙
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={GAME_HEIGHT}
          onClick={handleCanvasClick}
          className="game-canvas"
        />

        {/* On-screen buttons (visible on touch devices) */}
        <div className="mobile-controls">
          <div className="mobile-player bride-controls">
            <div className="ammo-buttons">
              {ammoKeys.map(a => (
                <button
                  key={a.id}
                  className="ammo-btn"
                  style={{ '--ammo-color': a.color }}
                  onClick={() => handleAction({ type: 'SELECT_AMMO', role: 'bride', ammoType: a.id })}
                  title={a.description}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <button
              className="shoot-btn bride-shoot"
              onPointerDown={() => handleAction({ type: 'SHOOT', role: 'bride' })}
            >
              👰 SHOOT
            </button>
          </div>

          <div className="mobile-player groom-controls">
            <div className="ammo-buttons">
              {ammoKeys.map(a => (
                <button
                  key={a.id}
                  className="ammo-btn"
                  style={{ '--ammo-color': a.color }}
                  onClick={() => handleAction({ type: 'SELECT_AMMO', role: 'groom', ammoType: a.id })}
                  title={a.description}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <button
              className="shoot-btn groom-shoot"
              onPointerDown={() => handleAction({ type: 'SHOOT', role: 'groom' })}
            >
              🤵 SHOOT
            </button>
          </div>
        </div>

        <div className="key-legend">
          <span>👰 Bride — A/D move · S ammo · W shoot</span>
          <span>🤵 Groom — ←/→ move · ↑/↓ ammo · Space shoot</span>
        </div>
      </div>
    </div>
  );
}
