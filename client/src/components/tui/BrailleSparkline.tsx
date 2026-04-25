interface BrailleSparklineProps {
  /** Time-series data. Any numeric scale. Zero-length renders empty. */
  data: number[];
  /** Width in characters. Data is bucketed to fit. Default 24. */
  width?: number;
  /** Optional inline className for the glyph sequence. */
  className?: string;
  /** Optional label shown to the right of the sparkline, e.g. "1.2k". */
  trailing?: string;
}

/**
 * Block-character sparkline — `▁▂▃▄▅▆▇█` from Unicode Block Elements.
 * This is the btop / bpytop idiom: inline vertical bars that scan as
 * a mini chart without needing a canvas. One character per bucket,
 * so it composes naturally inside mono text.
 *
 * The name "Braille" is historical — we briefly considered the 2-
 * dimensional braille-dot encoding but block chars render more
 * legibly at terminal body font sizes.
 */

const BARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;

export function BrailleSparkline({
  data,
  width = 24,
  className = '',
  trailing,
}: BrailleSparklineProps) {
  if (data.length === 0) {
    return (
      <span className={`font-mono text-tui-muted ${className}`}>
        {' '.repeat(width)}
        {trailing && <span className="ml-2">{trailing}</span>}
      </span>
    );
  }

  const bucketed = bucket(data, width);
  const max = Math.max(...bucketed);
  const min = Math.min(...bucketed);
  const range = max - min || 1;

  const glyphs = bucketed
    .map((v) => {
      const norm = (v - min) / range;
      const idx = Math.min(BARS.length - 1, Math.floor(norm * BARS.length));
      return BARS[idx];
    })
    .join('');

  return (
    <span className={`inline-flex items-baseline gap-2 font-mono ${className}`}>
      <span className="text-terminal-bright-green tracking-tight leading-none">
        {glyphs}
      </span>
      {trailing && (
        <span className="text-tui-muted text-[10px] tabular-nums">{trailing}</span>
      )}
    </span>
  );
}

/** Bucket a potentially-long series into exactly `width` buckets by
 *  linear interpolation. Each bucket is the average of its range. */
function bucket(data: number[], width: number): number[] {
  if (data.length <= width) return data;
  const out = new Array(width).fill(0);
  const ratio = data.length / width;
  for (let i = 0; i < width; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += data[j];
      count++;
    }
    out[i] = count > 0 ? sum / count : data[start] ?? 0;
  }
  return out;
}

/** Format a number compactly: 1234 → "1.2k", 1_500_000 → "1.5m". */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
