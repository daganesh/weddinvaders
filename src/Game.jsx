import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameState } from './useGameState';
import { useAssets }    from './useAssets';
import { useCustomization } from './useCustomization';
import { getActiveConfig } from './customizationStore';
import { render }       from './renderer';
import { GAME_WIDTH, GAME_HEIGHT, CANVAS_WIDTH, AMMO_ORDER, AMMO_META } from './constants';
import { LinksRow } from './LinksRow';
import InviteScreen from './InviteScreen';
import defaultBannerSrc from './assets/banner-default.svg';
import './Game.css';

const END_OF_LEVEL_PHASES = new Set(['meeting', 'levelComplete', 'gameComplete', 'lost']);

export default function Game() {
  const canvasRef = useRef(null);
  const assetsRef = useAssets();
  const configRef = useCustomization();

  // Phase 1 (InviteScreen, the default view) vs. Phase 2 (this canvas game).
  // The canvas isn't mounted at all while this is true, so it can't receive
  // touch input while browsing the invitation card — no extra guard needed.
  const [showInvite, setShowInvite] = useState(true);

  const { getState, startLoop, stopLoop, setRenderCallback, handleAction } = useGameState(!showInvite);

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
  }, [setRenderCallback, assetsRef, configRef]);

  // Starts/stops the 60fps loop with the invite/game toggle, rather than
  // running it unconditionally from mount — this is also what makes "Back to
  // Invite" a real pause: a mid-run phase like 'playing'/'meeting' ticks its
  // timers every frame, so stopping the loop freezes the run in place until
  // the player returns and it resumes exactly where it left off (see
  // useGameState.js's `active` gate for the equivalent on keyboard input).
  useEffect(() => {
    if (showInvite) return;
    startLoop();
    return () => stopLoop();
  }, [showInvite, startLoop, stopLoop]);

  // The old canvas-drawn title notice is gone (its content now lives in
  // InviteScreen, shown first) — "Start Playing" skips straight to
  // mode-select. Guarded so returning from a later phase (Back to Invite,
  // then Start Playing again) doesn't reset an in-progress run: START only
  // makes sense the very first time, while phase is still its initial value.
  const handleStartPlaying = useCallback(() => {
    if (getState().phase === 'title') handleAction({ type: 'START' });
    setShowInvite(false);
  }, [getState, handleAction]);

  const handleBackToInvite = useCallback(() => setShowInvite(true), []);

  const handleCanvasClick = useCallback(() => {
    const { phase, mode, soloRole } = getState();
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
  const { brideColor, groomColor, accent } = activeConfig.colors;
  const { bride: brideName, groom: groomName } = activeConfig.text.names;
  const bannerSrc = activeConfig.images.banner || defaultBannerSrc;
  // Hidden individually while their URL is blank, so an admin can pre-seed
  // the well-known RSVP/registry/songs slots without showing dead links.
  const visibleLinks = activeConfig.links.filter(l => l.url.trim());

  // No more 'title' phase to exclude here — InviteScreen is the pre-game
  // screen now, and by the time the canvas ever renders, phase is already
  // past it (see handleStartPlaying above).
  const showControls = uiPhase !== 'modeSelect';

  return (
    <div
      className="game-wrapper"
      style={{ '--wv-bride-color': brideColor, '--wv-groom-color': groomColor, '--wv-accent-color': accent }}
    >
      <div className={`game-container${showInvite ? '' : ' is-playing'}`}>
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

        {showInvite ? (
          <InviteScreen config={activeConfig} onStartPlaying={handleStartPlaying} />
        ) : (
          <>
            {/* Outside .canvas-wrapper on purpose — a fixed nav control needs
                to stay reachable/clickable without any risk of the canvas's
                own click/touch handling swallowing the tap. */}
            <div className="game-nav-bar">
              <button className="back-to-invite-btn" onClick={handleBackToInvite}>
                ⬅ Back to Invite &amp; Details
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

            {/* Every level boundary — a level win, a full-game win, or a loss
                — nudges back to the invite/RSVP, since winning the whole game
                takes several level clears and most runs will end here rather
                than at gameComplete. Below the canvas, not overlaid on it, so
                it never competes with the canvas's own click-to-continue. */}
            {END_OF_LEVEL_PHASES.has(uiPhase) && (
              <div className="end-of-level-banner">
                <button className="back-to-invite-btn" onClick={handleBackToInvite}>
                  💌 Back to Invite &amp; RSVP
                </button>
              </div>
            )}

            {/* Opening-page links stay reachable once the invite screen is
                dismissed. */}
            {showControls && <LinksRow links={visibleLinks} />}

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
          </>
        )}
      </div>
    </div>
  );
}
