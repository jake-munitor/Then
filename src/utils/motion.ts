import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Follows the system "Reduce Motion" setting. Every decorative animation in
 * the app (card flip, photo developing) checks this and falls back to an
 * instant or fade-only change.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => {
        // Only a real change sets state: the common answer is "off", which is
        // already the initial value.
        if (active && value) setReduced(true);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => setReduced(Boolean(value)));
    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  return reduced;
}
