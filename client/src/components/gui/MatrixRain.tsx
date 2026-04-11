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

function randomChar() {
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
    let columns: { y: number; speed: number; charTimer: number; charInterval: number }[] = [];
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
        if (col.y > h + 40) col.y = -20;

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

          ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${trailOpacity})`;
          // Use a fixed character per position, change on timer
          const ch = col.charTimer > col.charInterval ? randomChar() : randomChar();
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
