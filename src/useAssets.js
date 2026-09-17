import { useEffect, useRef, useState } from 'react';
import brideImgSrc  from './assets/bride-nobg.png';
import groomImgSrc  from './assets/groom-nobg.png';
import coupleImgSrc from './assets/couple-nobg.png';
import { getActiveConfig } from './customizationStore';
import { WEDDING_ITEMS } from './constants';

/**
 * Preloads the three character images plus any per-item icon the active
 * package overrides (WEDDING_ITEMS ids in `images`).
 * Returns a ref whose `.current` always has the latest state:
 *   { bride, groom, couple, items: { [itemId]: Image }, loaded }
 * Using a ref (not state) so the renderer can read it each frame
 * without triggering React re-renders. An item with no override in the
 * active package's `images` is simply absent from `items` — renderer.js
 * falls back to that item's emoji, same as a null bride/groom/couple slot
 * falls back to the bundled portrait PNG.
 */
export function useAssets() {
  const assetsRef = useRef({ bride: null, groom: null, couple: null, items: {}, loaded: false });
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const { images } = getActiveConfig();

    const portraitSrc = {
      bride:  images.bride  || brideImgSrc,
      groom:  images.groom  || groomImgSrc,
      couple: images.couple || coupleImgSrc,
    };
    const itemSrc = {};
    for (const { id } of WEDDING_ITEMS) {
      if (images[id]) itemSrc[id] = images[id];
    }

    const total = Object.keys(portraitSrc).length + Object.keys(itemSrc).length;
    let done = 0;
    const onSettle = () => {
      done++;
      if (done === total) {
        assetsRef.current.loaded = true;
        forceUpdate(n => n + 1);
      }
    };

    for (const [role, src] of Object.entries(portraitSrc)) {
      const img = new Image();
      img.onload = onSettle;
      img.onerror = onSettle; // a bad upload shouldn't block loading forever
      img.src = src;
      assetsRef.current[role] = img;
    }

    const items = {};
    for (const [id, src] of Object.entries(itemSrc)) {
      const img = new Image();
      img.onload = onSettle;
      img.onerror = onSettle;
      img.src = src;
      items[id] = img;
    }
    assetsRef.current.items = items;
  }, []);

  return assetsRef;
}
