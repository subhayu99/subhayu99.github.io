/**
 * GUI Theme Configuration
 *
 * Single source of truth for all GUI portfolio theme colors.
 * Change the accent color here and it propagates everywhere —
 * CSS variables, Tailwind utilities, inline styles, and SVG fills.
 *
 * The RGB tuple is the canonical form; hex and helpers are derived from it.
 */

export interface ColorTheme {
  key: string;
  name: string;
  accentRgb: readonly [number, number, number];
  accentHoverRgb: readonly [number, number, number];
}

export const colorThemes: ColorTheme[] = [
  { key: 'matrix',  name: 'Matrix Green',   accentRgb: [0, 255, 0],     accentHoverRgb: [0, 200, 0] },
  { key: 'blue',    name: 'Cyberpunk Blue',  accentRgb: [0, 191, 255],   accentHoverRgb: [0, 150, 200] },
  { key: 'purple',  name: 'Hacker Purple',   accentRgb: [147, 112, 219], accentHoverRgb: [120, 90, 180] },
  { key: 'amber',   name: 'Vintage Amber',   accentRgb: [255, 165, 0],   accentHoverRgb: [200, 130, 0] },
  { key: 'red',     name: 'Red Alert',       accentRgb: [255, 0, 0],     accentHoverRgb: [200, 0, 0] },
];

/** Apply a color theme to the document by setting all CSS variables */
export function applyColorTheme(theme: ColorTheme) {
  const [r, g, b] = theme.accentRgb;
  const [rh, gh, bh] = theme.accentHoverRgb;
  const root = document.documentElement.style;

  const hex = (n: number) => n.toString(16).padStart(2, '0');

  // GUI accent variables
  root.setProperty('--gui-accent', `#${hex(r)}${hex(g)}${hex(b)}`);
  root.setProperty('--gui-accent-hover', `#${hex(rh)}${hex(gh)}${hex(bh)}`);
  root.setProperty('--gui-accent-rgb', `${r}, ${g}, ${b}`);

  // Terminal / glow variables
  root.setProperty('--glow-color-rgb', `${r}, ${g}, ${b}`);

  localStorage.setItem('gui-color-theme', theme.key);
}

/** Get the saved theme or default to matrix green */
export function getSavedTheme(): ColorTheme {
  const saved = localStorage.getItem('gui-color-theme');
  return colorThemes.find(t => t.key === saved) || colorThemes[0];
}

/** Cycle to the next theme and apply it, returns the new theme */
export function cycleTheme(): ColorTheme {
  const current = getSavedTheme();
  const idx = colorThemes.findIndex(t => t.key === current.key);
  const next = colorThemes[(idx + 1) % colorThemes.length];
  applyColorTheme(next);
  return next;
}

export const guiTheme = {
  /** Core accent color as [R, G, B] — everything else derives from this */
  accentRgb: [0, 255, 0] as const,

  /** Darker accent for hover states as [R, G, B] */
  accentHoverRgb: [0, 200, 0] as const,

  /** Background and surface */
  bg: '#000000',
  surface: '#0a0a0a',

  /** Border */
  border: 'rgba(255, 255, 255, 0.08)',

  /** Text */
  text: '#e4e4e7',
  textMuted: '#a1a1aa',
} as const;

// ── Derived helpers (static defaults for initial load) ───────

const [r, g, b] = guiTheme.accentRgb;
const [rh, gh, bh] = guiTheme.accentHoverRgb;

export const accentHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
export const accentHoverHex = `#${rh.toString(16).padStart(2, '0')}${gh.toString(16).padStart(2, '0')}${bh.toString(16).padStart(2, '0')}`;
export const accentRgbCss = `${r}, ${g}, ${b}`;

// ── Live helpers (read current theme from CSS variables) ─────

/** Read current accent RGB from the live CSS variable */
export function getAccentRgb(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--gui-accent-rgb').trim();
  if (raw) {
    const parts = raw.split(',').map(s => parseInt(s.trim(), 10));
    if (parts.length === 3 && parts.every(n => !isNaN(n))) return parts as unknown as [number, number, number];
  }
  return [r, g, b]; // fallback to default
}

/** Live rgb() string — reads current theme */
export function accentRgbStr(): string {
  const [cr, cg, cb] = getAccentRgb();
  return `rgb(${cr}, ${cg}, ${cb})`;
}

/** Live rgba() with opacity — reads current theme */
export function accentRgba(opacity: number): string {
  const [cr, cg, cb] = getAccentRgb();
  return `rgba(${cr}, ${cg}, ${cb}, ${opacity})`;
}
