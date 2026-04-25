/**
 * Platform detection — used by the TUI to swap keyboard chip labels
 * (⌃ / ⌥ on Mac vs Ctrl / Alt elsewhere) and to gate behaviors that
 * don't make sense on touch devices (modifier-key shortcuts).
 *
 * Computed once at module load. Pure read-only constants.
 */

function detectMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Modern API (Chromium-based); fall back to legacy navigator.platform
  // which is still the most reliable cross-browser signal as of writing.
  // navigator.userAgentData is not yet in lib.dom.d.ts in our version.
  const uad = (navigator as unknown as { userAgentData?: { platform?: string } })
    .userAgentData;
  if (uad?.platform) return /mac/i.test(uad.platform);
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
}

function detectTouch(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(pointer: coarse)').matches) return true;
  return 'ontouchstart' in window;
}

export const isMacPlatform = detectMac();
export const isTouchDevice = detectTouch();
/** Mac with a real keyboard — show the ⌃/⌥ symbols. */
export const isMacDesktop = isMacPlatform && !isTouchDevice;

/** Render-ready labels for modifier keys, swapping per platform. */
export const ctrlKey = isMacDesktop ? '⌃' : 'Ctrl ';
export const altKey = isMacDesktop ? '⌥' : 'Alt ';
