import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { getAccentRgb } from '../../config/gui-theme.config';

interface IdleMatrixRainProps {
  /** When true, the overlay fades in and animates. When false, fades out. */
  active: boolean;
  /** Rainbow mode — each column gets its own hue distributed across
   *  the spectrum, animated with a slow drift. Off by default; flipped
   *  on by the `rainbow` command. */
  rainbow?: boolean;
}

const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const DIGITS = '0123456789';
const CHARS = (KATAKANA + DIGITS + '@#$%&').split('');
const FADE_IN_MS = 600;
const FADE_OUT_MS = 400;
const COL_WIDTH = 22;
const RARE_GLYPHS = ['♥', '★', '✦', '☕', '☽', '☾', '♠', '♦', '⚡', '☄', '✧', '♪'];
const RARE_GLYPH_CHANCE = 0.0008;

const HIDDEN_MESSAGES = [
  'wake up',
  'hi curious',
  'there is no spoon',
  'follow the rabbit',
  'stay curious',
  'decode me',
  'not random',
  'i see you',
  'have some coffee',
  'keep watching',
  'dont panic',
  'breathe deep',
];
// Per-frame chance, applied independently to each column. Tuned so a
// new message starts roughly every ~3-4 seconds across all columns
// (varies with column count) — frequent enough to feel alive, sparse
// enough that each message has visual breathing room.
const MESSAGE_CHANCE_PER_FRAME = 0.00007;
// Lifetime is BASE + chars * MS_PER_CHAR + random jitter so longer
// messages get more time to read. "wake up" (7) ≈ 3.4-4.9s,
// "have some coffee" (16) ≈ 6.3-7.8s, "follow the rabbit" (17) ≈ 6.6-8.1s.
const MESSAGE_BASE_MS = 1800;
const MESSAGE_MS_PER_CHAR = 280;
const MESSAGE_JITTER_MS = 1500;

function randomChar() {
  if (Math.random() < RARE_GLYPH_CHANCE) {
    return RARE_GLYPHS[Math.floor(Math.random() * RARE_GLYPHS.length)];
  }
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

/**
 * Matrix-style falling-glyph overlay for the TUI. Mirrors the GUI's
 * MatrixRain visual grammar — bright head + opacity-fading trail going
 * upward, with hidden messages and rare glyph flashes. Externally
 * controlled by `active`: true fades in, false fades out. Stays mounted
 * for the duration of the parent so fade-out animates cleanly.
 *
 * Positioned `fixed inset-0 z-30` so it overlays the entire viewport
 * regardless of scroll. Pointer-events: none so clicks fall through.
 */
export function IdleMatrixRain({ active, rainbow = false }: IdleMatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const rainbowRef = useRef(rainbow);
  rainbowRef.current = rainbow;
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;
    const colWidth = isMobile ? COL_WIDTH * 2 : COL_WIDTH;

    let w = 0;
    let h = 0;
    let columns: {
      y: number;
      speed: number;
      message: string | null;
      messageLife: number;
    }[] = [];
    let opacity = 0;
    let rafId = 0;
    let lastTime = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const numCols = Math.ceil(w / colWidth);
      // Preserve existing column state on resize so a running rain
      // doesn't reset every time the window changes size.
      const next = Array.from({ length: numCols }, (_, i) =>
        columns[i] ?? {
          y: Math.random() * h,
          speed: 40 + Math.random() * 80,
          message: null as string | null,
          messageLife: 0,
        },
      );
      columns = next;
    };

    resize();
    window.addEventListener('resize', resize);

    // Reduced-motion: paint a single dim frame and bail. No animation.
    if (prefersReducedMotion) {
      const [r, g, b] = getAccentRgb();
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.04)`;
      ctx.fillRect(0, 0, w, h);
      return () => {
        window.removeEventListener('resize', resize);
      };
    }

    const draw = (now: number) => {
      const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
      lastTime = now;

      const wantOn = activeRef.current;
      if (wantOn && opacity < 1) {
        opacity = Math.min(1, opacity + dt / (FADE_IN_MS / 1000));
      } else if (!wantOn && opacity > 0) {
        opacity = Math.max(0, opacity - dt / (FADE_OUT_MS / 1000));
      }

      // Stop the loop when fully transparent and not requested on. The
      // next prop change will restart it via the activate effect below.
      if (!wantOn && opacity <= 0) {
        ctx.clearRect(0, 0, w, h);
        lastTime = 0;
        rafId = 0;
        return;
      }

      const isRainbow = rainbowRef.current;
      // Theme-coloured baseline; ignored when rainbow mode is on.
      const [r, g, b] = isRainbow ? [0, 0, 0] : getAccentRgb();
      // Rainbow drift — slowly rotate the hue assignment so columns
      // breathe through the spectrum instead of being statically
      // assigned. ~0.02 hue/ms ≈ full cycle every ~18s.
      const hueOffset = isRainbow ? (now * 0.02) % 360 : 0;
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${colWidth - 4}px 'JetBrains Mono', 'Fira Code', monospace`;
      ctx.textAlign = 'center';

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        col.y += col.speed * dt;

        if (col.y > h + 40) {
          col.y = -20;
        }

        // Per-frame chance to start a hidden message in this column,
        // regardless of where its head currently is. Messages can pop
        // in mid-screen instead of only at the top on wrap. Lifetime
        // scales with length so the reader gets time to read.
        if (!col.message && Math.random() < MESSAGE_CHANCE_PER_FRAME) {
          const msg = HIDDEN_MESSAGES[Math.floor(Math.random() * HIDDEN_MESSAGES.length)];
          col.message = msg;
          col.messageLife =
            MESSAGE_BASE_MS + msg.length * MESSAGE_MS_PER_CHAR + Math.random() * MESSAGE_JITTER_MS;
        }

        if (col.message) {
          col.messageLife -= dt * 1000;
          if (col.messageLife <= 0) {
            col.message = null;
            col.messageLife = 0;
          }
        }

        const colX = i * colWidth + colWidth / 2;
        const trailLen = 18;
        // Per-column hue when rainbow is on — distributed evenly across
        // the spectrum so adjacent columns are visibly different. The
        // hueOffset above adds a slow drift on top of the per-column
        // assignment.
        const colHue = isRainbow
          ? (i * (360 / Math.max(columns.length, 1)) + hueOffset) % 360
          : 0;

        for (let j = 0; j < trailLen; j++) {
          const charY = col.y - j * (colWidth - 2);
          if (charY < -20 || charY > h + 20) continue;

          let ch: string;
          if (col.message && j < col.message.length) {
            ch = col.message[col.message.length - 1 - j];
          } else {
            ch = randomChar();
          }

          // Uniform fade — j=0 is the brightest point on the trail
          // ramp (≈ 0.5 × opacity) but no longer gets a special "head"
          // boost.
          const trailOpacity = (1 - j / trailLen) * 0.5 * opacity;
          if (trailOpacity < 0.002) continue;
          if (isRainbow) {
            // hsla — saturated and bright so glyphs pop on black.
            ctx.fillStyle = `hsla(${colHue}, 100%, 60%, ${trailOpacity})`;
          } else {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${trailOpacity})`;
          }
          ctx.fillText(ch, colX, charY);
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    if (active) {
      lastTime = 0;
      rafId = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, w, h);
    };
    // We only re-mount the loop when active flips. activeRef carries the
    // live value into the running RAF so we don't need to restart on
    // every change — but starting from "off" requires kicking the RAF.
  }, [active, prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30"
    />
  );
}
