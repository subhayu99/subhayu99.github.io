/**
 * Format a positive integer compactly for inline use in prose.
 *
 * Rules (per docs/superpowers/specs/2026-04-27-inline-pypi-stats-design.md):
 *   < 1000:     "123"        (no suffix)
 *   1000-9999:  "5.7k"       (one decimal, rounded)
 *   10000+:     "43k"        (no decimal, rounded to nearest 1000)
 *
 * Trailing "+" is the caller's responsibility — the formatter never adds it.
 *
 * @param {number} n - non-negative integer
 * @returns {string}
 */
export function formatCompact(n) {
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`formatCompact: expected non-negative finite number, got ${n}`);
  }
  if (n < 1000) return String(Math.round(n));
  if (n < 10_000) return `${(Math.round(n / 100) / 10).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}
