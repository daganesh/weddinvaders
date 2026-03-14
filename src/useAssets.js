import { useEffect, useRef, useState } from 'react';
import brideImgSrc  from './assets/bride-nobg.png';
import groomImgSrc  from './assets/groom-nobg.png';
import coupleImgSrc from './assets/couple-nobg.png';

/**
 * Preloads the three character PNGs.
 * Returns a ref whose `.current` always has the latest state:
 *   { bride, groom, couple, loaded }
 * Using a ref (not state) so the renderer can read it each frame
 * without triggering React re-renders.
 */
export function useAssets() {
  const assetsRef = useRef({ bride: null, groom: null, couple: null, loaded: false });
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    let done = 0;
    const onLoad = () => {
      done++;
      if (done === 3) {
        assetsRef.current.loaded = true;
        forceUpdate(n => n + 1);
      }
    };

    const bride  = new Image(); bride.onload  = onLoad; bride.src  = brideImgSrc;
    const groom  = new Image(); groom.onload  = onLoad; groom.src  = groomImgSrc;
    const couple = new Image(); couple.onload = onLoad; couple.src = coupleImgSrc;

    assetsRef.current.bride  = bride;
    assetsRef.current.groom  = groom;
    assetsRef.current.couple = couple;
  }, []);

  return assetsRef;
}
