import { useEffect, useState } from 'react';
import { hasRsvped, isAttending, subscribeRsvp } from './rsvpStore';

// Reactive wrapper around rsvpStore.js's plain functions, mirroring
// useCustomization.js's relationship to customizationStore.js. Without this,
// a component that reads hasRsvped()/isAttending() directly only sees a
// fresh value on its own next render (e.g. after navigating to it) — this
// re-renders it immediately when the RSVP changes anywhere in the app, so
// lock icons in the header/invite links update the moment a guest submits,
// not just after the next navigation.
export function useRsvpStatus() {
  const [status, setStatus] = useState(() => ({ rsvped: hasRsvped(), attending: isAttending() }));
  useEffect(() => subscribeRsvp(() => setStatus({ rsvped: hasRsvped(), attending: isAttending() })), []);
  return status;
}
