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
  /** Override the default 100% / 50% HSL derivation — used for
      low-chroma palettes (purple, glacier) that would otherwise wash
      out or look cartoonish in the terminal. */
  terminalSat?: number;
  terminalLight?: number;
}

export const colorThemes: ColorTheme[] = [
  { key: 'matrix',  name: 'Matrix Green',     accentRgb: [0, 255, 0],     accentHoverRgb: [0, 200, 0] },
  { key: 'blue',    name: 'Cyberpunk Blue',   accentRgb: [0, 191, 255],   accentHoverRgb: [0, 150, 200] },
  { key: 'cyan',    name: 'Phosphor Cyan',    accentRgb: [0, 255, 255],   accentHoverRgb: [0, 200, 200] },
  { key: 'purple',  name: 'Hacker Purple',    accentRgb: [147, 112, 219], accentHoverRgb: [120, 90, 180], terminalSat: 60, terminalLight: 65 },
  { key: 'pink',    name: 'Synthwave Pink',   accentRgb: [255, 20, 147],  accentHoverRgb: [210, 20, 130] },
  { key: 'amber',   name: 'Vintage Amber',    accentRgb: [255, 120, 0],   accentHoverRgb: [210, 95, 0] },
  { key: 'yellow',  name: 'Commodore Yellow', accentRgb: [255, 221, 0],   accentHoverRgb: [210, 180, 0] },
  { key: 'red',     name: 'Red Alert',        accentRgb: [255, 0, 0],     accentHoverRgb: [200, 0, 0] },
  { key: 'glacier', name: 'Glacier',          accentRgb: [220, 235, 250], accentHoverRgb: [170, 190, 210], terminalSat: 25, terminalLight: 85 },
];

/** HSL string for a given hue at full saturation (terminal vars need HSL) */
function hsl(hue: number, sat: number, light: number) {
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

/** Approximate hue from RGB */
function rgbToHue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return Math.round(h);
}

/** Apply a color theme to both GUI and terminal by setting all CSS variables */
export function applyColorTheme(theme: ColorTheme) {
  const [r, g, b] = theme.accentRgb;
  const [rh, gh, bh] = theme.accentHoverRgb;
  const root = document.documentElement.style;

  // Update cached RGB so canvas components pick it up instantly
  _cachedRgb = [r, g, b];
  const hex = (n: number) => n.toString(16).padStart(2, '0');

  // GUI accent variables
  root.setProperty('--gui-accent', `#${hex(r)}${hex(g)}${hex(b)}`);
  root.setProperty('--gui-accent-hover', `#${hex(rh)}${hex(gh)}${hex(bh)}`);
  root.setProperty('--gui-accent-rgb', `${r}, ${g}, ${b}`);
  root.setProperty('--gui-accent-ch', `${r} ${g} ${b}`);

  // Terminal variables — derive HSL from the RGB accent
  const hue = rgbToHue(r, g, b);
  const sat = theme.terminalSat ?? 100;
  const light = theme.terminalLight ?? 50;
  root.setProperty('--terminal-green', hsl(hue, sat, light));
  root.setProperty('--terminal-bright-green', hsl(hue, sat, light + 10));
  root.setProperty('--border', hsl(hue, sat, 20));
  root.setProperty('--ring', hsl(hue, sat, light));
  root.setProperty('--foreground', hsl(hue, sat, light));
  root.setProperty('--primary', hsl(hue, sat, light));
  root.setProperty('--accent', hsl(hue, sat, 20));
  root.setProperty('--input', hsl(hue, sat, 20));
  root.setProperty('--glow-color-rgb', `${r}, ${g}, ${b}`);

  // TUI semantic tokens — theme-following. Before this, `--terminal-yellow`
  // and the scanline tint were hardcoded and ignored every theme, so a
  // Glacier user saw lemon labels. Now labels derive from the accent hue
  // at a darker lightness, giving mono-accent discipline across themes.
  // Errors stay hardcoded red — they must pop regardless of theme.
  //
  // accent-dim must remain readable on a black background. dim at L=30
  // worked for matrix/yellow/red (warm hues stay readable when dark)
  // but landed too muddy for cooler hues (blue/cyan/glacier — dark
  // teal on black is hard to scan). Bump to L=42 for a consistent
  // mid-tone that reads across all hues.
  const dimSat = Math.max(50, sat - 10);
  const dimLight = Math.max(38, light - 10);
  root.setProperty('--tui-accent-dim', hsl(hue, dimSat, dimLight));
  // Muted uses a very low saturation cap (max 12%) so warm hues
  // (amber/yellow) don't land in olive-tan territory and read as
  // "greenish" on a dark background. Low-chroma gray with a whisper
  // of the accent hue reads as neutral warm/cool gray across themes.
  root.setProperty('--tui-muted', hsl(hue, Math.min(12, sat / 6), 60));
  root.setProperty('--tui-error', 'hsl(0, 100%, 60%)');
  root.setProperty('--tui-warn', 'hsl(45, 100%, 55%)');

  // Sync both localStorage keys so terminal and GUI stay in sync
  localStorage.setItem('gui-color-theme', theme.key);
  localStorage.setItem('terminal-theme', theme.key);
}

/** Get the saved theme or default to matrix green (checks both keys) */
export function getSavedTheme(): ColorTheme {
  const saved = localStorage.getItem('gui-color-theme') || localStorage.getItem('terminal-theme');
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

// ── Live helpers (cached — updated on theme change) ─────

/** Cached accent RGB — avoids getComputedStyle() on every frame */
let _cachedRgb: [number, number, number] = [r, g, b];

/** Read cached accent RGB (updated automatically when theme changes) */
export function getAccentRgb(): [number, number, number] {
  return _cachedRgb;
}

/** rgba() with opacity — uses cached RGB */
export function accentRgbStr(): string {
  const [cr, cg, cb] = _cachedRgb;
  return `rgb(${cr}, ${cg}, ${cb})`;
}

/** rgba() with configurable opacity — uses cached RGB */
export function accentRgba(opacity: number): string {
  const [cr, cg, cb] = _cachedRgb;
  return `rgba(${cr}, ${cg}, ${cb}, ${opacity})`;
}
