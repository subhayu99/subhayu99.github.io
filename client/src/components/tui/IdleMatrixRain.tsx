import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface IdleMatrixRainProps {
  /** When true, the overlay is mounted and the rain animates. */
  active: boolean;
}

const GLYPHS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';
const HIDDEN_MESSAGES = [
  'there is no spoon',
  'wake up',
  'stay curious',
  'follow the white rabbit',
  'decode me',
];

/**
 * Matrix-style falling-glyph overlay scoped to the TUI output pane.
 * Mirrors the GUI's `MatrixRain.tsx` as a lighter-weight terminal
 * screensaver. Positioned absolutely over the terminal content,
 * pointer-events: none so it doesn't steal clicks.
 *
 * When `active` goes true the canvas starts an RAF loop; when it goes
 * false the loop cancels and the canvas clears. Respects
 * prefers-reduced-motion — reduced users see a brief fade rather
 * than a scrolling animation.
 */
export function IdleMatrixRain({ active }: IdleMatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match the canvas bitmap size to its CSS size (DPR aware).
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // Reduced-motion: paint a single quiet frame and bail.
    if (prefersReducedMotion) {
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, rect.width, rect.height);
      return () => window.removeEventListener('resize', resize);
    }

    const fontSize = 14;
    const rect = canvas.getBoundingClientRect();
    const columns = Math.floor(rect.width / fontSize);
    const drops: number[] = Array(columns).fill(0).map(() => Math.random() * -50);
    // Per-column optional decoded-word state.
    const words: Array<{ text: string; pos: number } | null> =
      Array(columns).fill(null);

    let raf = 0;
    const accentRgb = getComputedStyle(document.documentElement)
      .getPropertyValue('--glow-color-rgb')
      .trim() || '0, 255, 0';

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      // Trail fade.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.font = `${fontSize}px 'JetBrains Mono', 'Fira Code', monospace`;

      for (let i = 0; i < columns; i++) {
        // Occasionally begin a decoded word in this column.
        if (!words[i] && Math.random() < 0.001) {
          words[i] = {
            text: HIDDEN_MESSAGES[Math.floor(Math.random() * HIDDEN_MESSAGES.length)],
            pos: 0,
          };
        }

        let glyph: string;
        if (words[i]) {
          glyph = words[i]!.text[words[i]!.pos];
          words[i]!.pos++;
          if (words[i]!.pos >= words[i]!.text.length) words[i] = null;
          ctx.fillStyle = `rgb(${accentRgb})`;
        } else {
          glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          ctx.fillStyle = `rgba(${accentRgb}, 0.6)`;
        }

        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(glyph, x, y);

        if (y > rect.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      // Clear on unmount so the overlay disappears cleanly.
      const rect2 = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect2.width, rect2.height);
    };
  }, [active, prefersReducedMotion]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] opacity-70"
    />
  );
}
