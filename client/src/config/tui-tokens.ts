/**
 * TUI Design Tokens
 *
 * Single source of truth for TUI colors, spacing, and effects. All
 * colors are CSS variable names — `applyColorTheme()` rewrites them
 * live on theme change so the TUI and GUI stay hue-synced without a
 * reload.
 *
 * Design stance:
 *   - One accent (plus its dim/bright/faint derivatives) — matches
 *     the GUI's mono-accent discipline.
 *   - Error is hardcoded red across themes; errors must always pop.
 *   - Sharp corners (radius: 0) — matches the GUI's brutalist shape
 *     language. No `rounded-lg` except in very specific affordances.
 */

/** CSS variables written by `applyColorTheme()`. Read with `var(...)`. */
export const tuiVars = {
  accent: '--terminal-green',
  accentBright: '--terminal-bright-green',
  accentDim: '--tui-accent-dim',
  accentRgb: '--glow-color-rgb',
  muted: '--tui-muted',
  error: '--tui-error',
  warn: '--tui-warn',
} as const;

/** Semantic color tokens — pass these into `style={{ color: ... }}`. */
export const tuiColor = {
  accent: `var(${tuiVars.accent})`,
  accentBright: `var(${tuiVars.accentBright})`,
  accentDim: `var(${tuiVars.accentDim})`,
  accentFaint: `rgba(var(${tuiVars.accentRgb}), 0.3)`,
  accentWash: `rgba(var(${tuiVars.accentRgb}), 0.05)`,
  muted: `var(${tuiVars.muted})`,
  error: `var(${tuiVars.error})`,
  warn: `var(${tuiVars.warn})`,
  text: '#ffffff',
  textDim: 'rgba(255, 255, 255, 0.7)',
  bg: 'var(--terminal-black)',
} as const;

/** Vertical rhythm. Use as Tailwind utility classes. */
export const tuiRhythm = {
  tight: 'space-y-1',
  base: 'space-y-3',
  loose: 'space-y-5',
} as const;

/** Typography scale. Chrome uses a fixed smaller size; body uses the
 *  base/sm responsive pair so lines wrap the same way on mobile. */
export const tuiText = {
  body: 'text-sm sm:text-base',
  label: 'text-xs sm:text-sm',
  chrome: 'text-xs',
} as const;

/** Chrome primitives — widths and shadows used by `Block`. */
export const tuiChrome = {
  rail: '2px',
  borderColor: `rgba(var(${tuiVars.accentRgb}), 0.3)`,
  glow: `0 0 12px rgba(var(${tuiVars.accentRgb}), 0.15)`,
  radius: '0',
} as const;

/** Tailwind class map — usable as bg / text / border utilities. */
export const tuiClass = {
  text: {
    accent: 'text-terminal-green',
    accentBright: 'text-terminal-bright-green',
    accentDim: 'text-tui-accent-dim',
    muted: 'text-tui-muted',
    error: 'text-tui-error',
    warn: 'text-tui-warn',
  },
  bg: {
    accent: 'bg-terminal-green',
    accentWash: 'bg-terminal-green/5',
    accentFaint: 'bg-terminal-green/10',
    bg: 'bg-terminal-black',
  },
  border: {
    accent: 'border-terminal-green',
    accentFaint: 'border-terminal-green/30',
    accentDim: 'border-tui-accent-dim/50',
    error: 'border-tui-error/50',
  },
} as const;
