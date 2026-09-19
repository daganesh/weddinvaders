import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameState } from './useGameState';
import { useAssets }    from './useAssets';
import { useCustomization } from './useCustomization';
import { getActiveConfig } from './customizationStore';
import { render }       from './renderer';
import { GAME_WIDTH, GAME_HEIGHT, CANVAS_WIDTH, AMMO_ORDER, AMMO_META } from './constants';
import defaultBannerSrc from './assets/banner-default.svg';
import './Game.css';

// An admin typing "example.com/rsvp" instead of "https://example.com/rsvp"
// is a common slip that would otherwise resolve as a broken relative link.
function withProtocol(url) {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

export default function Game() {
  const canvasRef = useRef(null);
  const assetsRef = useAssets();
  const configRef = useCustomization();
  const { getState, startLoop, stopLoop, setRenderCallback, handleAction } = useGameState();

  // Mirrors of ref-based game state, updated only when they actually change
  // (from the render callback) — game state stays ref-based for 60fps
  // perf, but which DOM controls to show needs to react to phase/mode.
  const [uiPhase, setUiPhase] = useState('title');
  const [uiMode, setUiMode] = useState('couple');
  const [uiSoloRole, setUiSoloRole] = useState(null);
  const prevPhaseRef = useRef('title');

  useEffect(() => {
    setRenderCallback((state) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      render(ctx, state, assetsRef.current, configRef.current);

      if (state.phase !== prevPhaseRef.current) {
        prevPhaseRef.current = state.phase;
        setUiPhase(state.phase);
        setUiMode(state.mode);
        setUiSoloRole(state.soloRole);
      }
    });
    startLoop();
    return () => stopLoop();
  }, [startLoop, stopLoop, setRenderCallback, assetsRef, configRef]);

  const handleCanvasClick = useCallback(() => {
    const { phase, mode, soloRole } = getState();
    if (phase === 'title')         { handleAction({ type: 'START' }); return; }
    if (phase === 'playing' && mode === 'solo') { handleAction({ type: 'SHOOT', role: soloRole }); return; }
    if (phase === 'meeting')       handleAction({ type: 'NEXT_LEVEL' });
    if (phase === 'levelComplete') handleAction({ type: 'NEXT_LEVEL' });
    if (phase === 'gameComplete')  handleAction({ type: 'RESTART' });
    if (phase === 'lost')          handleAction({ type: 'RESTART' });
  }, [getState, handleAction]);

  // ── solo mode: drag left/right on the canvas to move ──────────────────────
  // Tracks the finger continuously (not just start→end) and moves the player
  // by the same delta every touchmove, so the on-screen sprite tracks the
  // finger 1:1 instead of a fixed-speed nudge — a fast flick moves as far as
  // an equally fast drag. The raw screen-pixel delta is rescaled by the
  // canvas's CSS-to-internal-resolution ratio (it's displayed at `max-width:
  // 100%; height: auto`, so its rendered size can be smaller than
  // `CANVAS_WIDTH`) so "1:1" means 1:1 with what's on screen, not raw canvas
  // pixels. A tap (little/no travel) still falls through to the browser's
  // synthesized click, which handleCanvasClick treats as "shoot" — real drag
  // distance suppresses that synthetic click on its own, so tap-to-shoot and
  // drag-to-move don't fight over the same gesture.
  const touchLastXRef = useRef(null);
  const handleTouchStart = useCallback((e) => {
    touchLastXRef.current = e.touches[0]?.clientX ?? null;
  }, []);
  const handleTouchMove = useCallback((e) => {
    const lastX = touchLastXRef.current;
    const clientX = e.touches[0]?.clientX;
    if (lastX == null || clientX == null) return;
    touchLastXRef.current = clientX;

    const { phase, mode, soloRole } = getState();
    if (phase !== 'playing' || mode !== 'solo') return;

    const rect  = canvasRef.current?.getBoundingClientRect();
    const scale = rect?.width ? CANVAS_WIDTH / rect.width : 1;
    const deltaX = (clientX - lastX) * scale;
    if (deltaX !== 0) handleAction({ type: 'DRAG_MOVE', role: soloRole, deltaX });
  }, [getState, handleAction]);
  const handleTouchEnd = useCallback(() => {
    touchLastXRef.current = null;
  }, []);

  // ── mobile / on-screen controls ──────────────────────────────────────────
  const ammoKeys = AMMO_ORDER.map(id => ({ id, ...AMMO_META[id] }));

  // Read directly (not via configRef) since this is display-only and refs
  // shouldn't be accessed during render.
  const activeConfig = getActiveConfig();
  const { brideColor, groomColor } = activeConfig.colors;
  const { bride: brideName, groom: groomName } = activeConfig.text.names;
  const bannerSrc = activeConfig.images.banner || defaultBannerSrc;
  // Hidden individually while their URL is blank, so an admin can pre-seed
  // the well-known RSVP/registry/songs slots without showing dead links.
  const visibleLinks = activeConfig.links.filter(l => l.url.trim());

  const showControls = uiPhase !== 'title' && uiPhase !== 'modeSelect';

  return (
    <div className="game-wrapper" style={{ '--wv-bride-color': brideColor, '--wv-groom-color': groomColor }}>
      <div className="game-container">
        <img className="game-banner" src={bannerSrc} alt="Wedding banner" />

        <div className="game-toolbar">
          <button
            className="admin-btn"
            onClick={() => { window.location.hash = '#/admin'; }}
            title="Customize"
          >
            ⚙
          </button>
        </div>

        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={GAME_HEIGHT}
            onClick={handleCanvasClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="game-canvas"
          />

          {uiPhase === 'modeSelect' && (
            <div className="mode-select-overlay">
              <button onClick={() => handleAction({ type: 'CHOOSE_MODE', mode: 'couple' })}>
                👰🤵 Couple
              </button>
              <button onClick={() => handleAction({ type: 'CHOOSE_MODE', mode: 'solo', soloRole: 'bride' })}>
                👰 Solo as {brideName}
              </button>
              <button onClick={() => handleAction({ type: 'CHOOSE_MODE', mode: 'solo', soloRole: 'groom' })}>
                🤵 Solo as {groomName}
              </button>
            </div>
          )}
        </div>

        {uiPhase === 'title' && visibleLinks.length > 0 && (
          <div className="title-links">
            {visibleLinks.map(link => (
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
        )}

        {/* On-screen buttons (visible on touch devices) */}
        {showControls && uiMode === 'couple' && (
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
        )}

        {showControls && uiMode === 'solo' && (
          <div className="solo-controls">
            <span className="solo-controls-hint">Swipe canvas to move · Tap to shoot</span>
            <button
              className="ammo-switch-btn"
              onClick={() => handleAction({ type: 'CYCLE_AMMO', role: uiSoloRole, dir: 1 })}
            >
              🔄 Switch Ammo
            </button>
          </div>
        )}

        <div className="key-legend">
          {uiMode === 'couple' ? (
            <>
              <span>👰 {brideName} — A/D move · S ammo · W shoot</span>
              <span>🤵 {groomName} — ←/→ move · ↑/↓ ammo · Space shoot</span>
            </>
          ) : uiSoloRole === 'bride' ? (
            <span>👰 {brideName} — A/D move · S ammo · W shoot (or swipe/tap)</span>
          ) : (
            <span>🤵 {groomName} — ←/→ move · ↑/↓ ammo · Space shoot (or swipe/tap)</span>
          )}
        </div>
      </div>
    </div>
  );
}
