/**
 * GUI Theme Configuration
 *
 * Single source of truth for all GUI portfolio theme colors.
 * Change the accent color here and it propagates everywhere —
 * CSS variables, Tailwind utilities, inline styles, and SVG fills.
 *
 * The RGB tuple is the canonical form; hex and helpers are derived from it.
 */

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

// ── Derived helpers ──────────────────────────────────────────

const [r, g, b] = guiTheme.accentRgb;
const [rh, gh, bh] = guiTheme.accentHoverRgb;

/** Accent as hex string, e.g. "#f59e0b" */
export const accentHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

/** Accent-hover as hex string */
export const accentHoverHex = `#${rh.toString(16).padStart(2, '0')}${gh.toString(16).padStart(2, '0')}${bh.toString(16).padStart(2, '0')}`;

/** rgb() string for SVG attributes and CSS */
export const accentRgbStr = `rgb(${r}, ${g}, ${b})`;

/** rgba() with configurable opacity — use in inline styles */
export function accentRgba(opacity: number): string {
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Comma-separated RGB for CSS variable: "245, 158, 11" */
export const accentRgbCss = `${r}, ${g}, ${b}`;
