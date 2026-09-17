import { useRef } from 'react';
import { getActiveConfig } from './customizationStore';

// Ref-based (not state) so the 60fps renderer can read it each frame without
// triggering React re-renders. Navigating to/from the admin screen unmounts
// <Game/>, so returning here re-reads localStorage (and whichever package is
// active) fresh.
export function useCustomization() {
  const configRef = useRef(getActiveConfig());
  return configRef;
}
