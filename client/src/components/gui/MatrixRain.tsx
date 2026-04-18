import { useEffect, useRef } from 'react';
import { getAccentRgb } from '../../config/gui-theme.config';

const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const DIGITS = '0123456789';
const CHARS = (KATAKANA + DIGITS + '@#$%&').split('');
const IDLE_MS = 8000;
const WARN_MS = 7000; // 1s before idle — ball starts glowing
const FADE_IN_MS = 1000;
const FADE_OUT_MS = 500;
const COL_WIDTH = 22;

// Hidden messages that occasionally replace the random chars in a column,
// scrolling down like the rest of the rain. Readable top-to-bottom if you
// catch one. Kept short (≤ trail length of 18 chars). Mix of Matrix nods,
// self-aware jokes, and a quiet help nudge for curious lingerers.
const HIDDEN_MESSAGES = [
  'wake up',
  'hi curious',
  'hello world',
  'you saw this',
  'not random',
  'i was here',
  'follow me',
  'there is no spoon',
  'keep looking',
  'dont panic',
  'need help?',
  'wake up neo',
  'not a bug',
  'stay curious',
  'happy hunting',
  'keep watching',
  'decode me',
  'i see you',
  'nothing is random',
  'think harder',
  'youre close',
  'breathe deep',
  'ding ding',
  'have some coffee',
];
// Probability that a column starts a new message when it wraps around.
const MESSAGE_CHANCE = 0.035;
// Messages live 3-5 seconds then dissolve back into random chars.
// Keeps them fleeting — if you didn't catch it, you didn't catch it.
const MESSAGE_LIFE_MIN_MS = 3000;
const MESSAGE_LIFE_MAX_MS = 5000;

// Rare accent glyphs that occasionally flash in the rain. Single-frame
// substitutions make you doubt whether you saw them. Very low probability
// per char per frame keeps density around 1-2 sightings per minute of idle.
const RARE_GLYPHS = ['♥', '★', '✦', '☕', '☽', '☾', '♠', '♦', '⚡', '☄', '✧', '♪'];
const RARE_GLYPH_CHANCE = 0.0008;

function randomChar() {
  // Very rare single-frame glyph flash
  if (Math.random() < RARE_GLYPH_CHANCE) {
    return RARE_GLYPHS[Math.floor(Math.random() * RARE_GLYPHS.length)];
  }
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Use fewer columns on small screens for performance
    const isMobile = window.innerWidth < 768;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let colWidth = isMobile ? COL_WIDTH * 2 : COL_WIDTH;
    let columns: {
      y: number;
      speed: number;
      charTimer: number;
      charInterval: number;
      /** When non-null, this column renders the message chars instead of random. */
      message: string | null;
      /** Milliseconds remaining for the current message. When ≤ 0, message clears. */
      messageLife: number;
    }[] = [];
    let isIdle = false;
    let opacity = 0;
    let idleTimer: ReturnType<typeof setTimeout>;
    let rafId: number;
    let lastTime = 0;
    let mouseX = -1;
    let mouseY = -1;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const colWidth = isMobile ? COL_WIDTH * 2 : COL_WIDTH; // fewer columns on mobile
      const numCols = Math.ceil(w / colWidth);
      columns = Array.from({ length: numCols }, () => ({
        y: Math.random() * h,
        speed: 40 + Math.random() * 80,
        charTimer: 0,
        charInterval: 50 + Math.random() * 100,
        message: null,
        messageLife: 0,
      }));
    }

    let warnTimer: ReturnType<typeof setTimeout>;

    function resetIdle() {
      clearTimeout(idleTimer);
      clearTimeout(warnTimer);
      if (isIdle) {
        isIdle = false;
        // Restart RAF for fade-out animation
        if (!rafId) { lastTime = 0; rafId = requestAnimationFrame(draw); }
        window.dispatchEvent(new CustomEvent('matrix-rain', { detail: { phase: 'inactive' } }));
      }
      // Warning phase — ball starts glowing
      warnTimer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('matrix-rain', { detail: { phase: 'warning' } }));
      }, WARN_MS);
      // Active phase — ball explodes, rain starts
      idleTimer = setTimeout(() => {
        isIdle = true;
        // Restart RAF loop if it was stopped
        if (!rafId) { lastTime = 0; rafId = requestAnimationFrame(draw); }
        window.dispatchEvent(new CustomEvent('matrix-rain', { detail: { phase: 'active' } }));
      }, IDLE_MS);
    }

    function draw(now: number) {
      const dt = lastTime ? (now - lastTime) / 1000 : 0.016;
      lastTime = now;

      // Fade opacity
      if (isIdle && opacity < 1) {
        opacity = Math.min(1, opacity + dt / (FADE_IN_MS / 1000));
      } else if (!isIdle && opacity > 0) {
        opacity = Math.max(0, opacity - dt / (FADE_OUT_MS / 1000));
      }

      // Skip rendering and stop RAF loop when fully transparent
      if (opacity <= 0) {
        ctx!.clearRect(0, 0, w, h);
        lastTime = 0;
        rafId = 0;
        return;
      }

      rafId = requestAnimationFrame(draw);
      const [r, g, b] = getAccentRgb();
      ctx!.clearRect(0, 0, w, h);
      ctx!.font = `${COL_WIDTH - 4}px monospace`;
      ctx!.textAlign = 'center';

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        col.y += col.speed * dt;
        if (col.y > h + 40) {
          col.y = -20;
          // On wrap, maybe start a hidden message on this column. Lifetime is
          // 3-5s — if you didn't catch it, it dissolves back into random noise
          // mid-column. Staying short makes each sighting feel lucky.
          if (Math.random() < MESSAGE_CHANCE) {
            col.message = HIDDEN_MESSAGES[Math.floor(Math.random() * HIDDEN_MESSAGES.length)];
            col.messageLife = MESSAGE_LIFE_MIN_MS
              + Math.random() * (MESSAGE_LIFE_MAX_MS - MESSAGE_LIFE_MIN_MS);
          } else {
            col.message = null;
            col.messageLife = 0;
          }
        }

        // Countdown + auto-clear when the message's time runs out.
        if (col.message) {
          col.messageLife -= dt * 1000;
          if (col.messageLife <= 0) {
            col.message = null;
            col.messageLife = 0;
          }
        }

        col.charTimer += dt * 1000;

        const colX = i * colWidth + colWidth / 2;

        // Distance from mouse — dissolve effect
        let distFade = 1;
        if (!isIdle && mouseX >= 0) {
          const dx = colX - mouseX;
          const dy = col.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          distFade = Math.min(1, dist / 300);
        }

        // Draw a trail of characters above current position
        const trailLen = 18;
        for (let j = 0; j < trailLen; j++) {
          const charY = col.y - j * (COL_WIDTH - 2);
          if (charY < -20 || charY > h + 20) continue;

          const trailOpacity = (1 - j / trailLen) * 0.3 * opacity * distFade;
          if (trailOpacity < 0.002) continue;

          // Hidden-message columns render message chars top-to-bottom readable:
          // trail[0] is the bottom of the trail (last letter), trail[msgLen-1]
          // is the top (first letter). Positions beyond the message fall back
          // to random noise so the rain still looks random from afar.
          let ch: string;
          if (col.message && j < col.message.length) {
            ch = col.message[col.message.length - 1 - j];
          } else {
            ch = randomChar();
          }

          ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${trailOpacity})`;
          ctx!.fillText(ch, colX, charY);
        }

        if (col.charTimer > col.charInterval) {
          col.charTimer = 0;
        }
      }
    }

    resize();
    resetIdle();

    const onActivity = () => {
      resetIdle();
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('scroll', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(idleTimer);
      clearTimeout(warnTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden
    />
  );
}
