/**
 * Fullscreen helpers. The Fullscreen API requires a user gesture, so callers
 * must invoke these synchronously from a click / keypress handler. The
 * returned promise resolves/rejects based on the browser — we swallow
 * rejections silently (user denied, iframe restrictions, etc.).
 */

type FsDoc = Document & {
  webkitExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element | null;
};
type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

function fsElement(): Element | null {
  const d = document as FsDoc;
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

export function isFullscreen(): boolean {
  return !!fsElement();
}

export function enterFullscreen(): Promise<void> {
  const el = document.documentElement as FsElement;
  const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
  if (!req) return Promise.resolve();
  return req().catch(() => {});
}

export function exitFullscreen(): Promise<void> {
  const d = document as FsDoc;
  const exit = document.exitFullscreen?.bind(document) ?? d.webkitExitFullscreen?.bind(d);
  if (!exit) return Promise.resolve();
  return exit().catch(() => {});
}

export function toggleFullscreen(): Promise<void> {
  return isFullscreen() ? exitFullscreen() : enterFullscreen();
}
