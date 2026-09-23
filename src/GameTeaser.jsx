import brideImgSrc from './assets/bride-nobg.png';
import groomImgSrc from './assets/groom-nobg.png';
import './GameTeaser.css';

// The home page's 33%-width side column (see InviteScreen.jsx) — a small
// preview of the game plus a way into it that's available whether or not
// the guest has RSVPed. No real gameplay footage/GIF is bundled; this is a
// lightweight CSS animation built from the same bride/groom portraits the
// game itself uses (respecting a custom package's images, same fallback
// pattern as useAssets.js), so it costs nothing to preload and needs no
// extra asset.
export default function GameTeaser({ config }) {
  const brideImg = config.images.bride || brideImgSrc;
  const groomImg = config.images.groom || groomImgSrc;

  return (
    <div className="game-teaser">
      <div className="game-teaser-stage" aria-hidden="true">
        <img className="game-teaser-sprite game-teaser-bride" src={brideImg} alt="" />
        <span className="game-teaser-item">💍</span>
        <img className="game-teaser-sprite game-teaser-groom" src={groomImg} alt="" />
      </div>
      <p className="game-teaser-title">🎮 {config.text.title}</p>
      <p className="game-teaser-tagline">{config.text.tagline}</p>
      <a className="game-teaser-cta" href="#/game">▶ START GAME</a>
    </div>
  );
}
