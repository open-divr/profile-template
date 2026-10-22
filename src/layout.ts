import { useSyncExternalStore } from 'react';
import { errorFields, log } from './log';

/** From this width the page has two columns. */
const WIDE = '(min-width: 64rem)';

let query: MediaQueryList | null | undefined;

function wideQuery(): MediaQueryList | null {
  if (query === undefined) {
    try {
      query = window.matchMedia(WIDE);
    } catch (err) {
      log('warn', 'profile.layout', 'media query unavailable', { ...errorFields(err), recovery: 'single-column layout' });
      query = null;
    }
  }
  return query;
}

function subscribe(onChange: () => void): () => void {
  const q = wideQuery();
  q?.addEventListener('change', onChange);
  return () => q?.removeEventListener('change', onChange);
}

/**
 * Whether the two-column layout applies. The columns hold different boxes in a different order than the single
 * column does, so the arrangement is chosen here rather than by CSS alone: reading and focus order then always
 * match what is on screen.
 */
export function useWideLayout(): boolean {
  return useSyncExternalStore(subscribe, () => wideQuery()?.matches ?? false);
}
