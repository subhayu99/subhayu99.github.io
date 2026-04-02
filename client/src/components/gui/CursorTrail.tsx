import { useEffect, useRef } from 'react';
import { guiTheme } from '../../config/gui-theme.config';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface PulseRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
}

const GRAVITY = 120;
const VELOCITY_THRESHOLD = 10;
const PARTICLE_LIFE = 0.6;
const MAX_PARTICLES = 80;

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let rafId: number;
    let lastTime = 0;
    let prevX = -1;
    let prevY = -1;
    const particles: Particle[] = [];
    const pulses: PulseRing[] = [];
    const [r, g, b] = guiTheme.accentRgb;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnParticle(x: number, y: number, vx: number, vy: number) {
      if (particles.length >= MAX_PARTICLES) return;
      // Perpendicular spread
      const angle = Math.atan2(vy, vx) + Math.PI / 2;
      const spread = (Math.random() - 0.5) * 3;
      particles.push({
        x,
        y,
        vx: vx * 0.2 + Math.cos(angle) * spread,
        vy: vy * 0.2 + Math.sin(angle) * spread,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        size: 1.5 + Math.random() * 2,
      });
    }

    function handleMove(e: MouseEvent) {
      if (prevX < 0) { prevX = e.clientX; prevY = e.clientY; return; }
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      const velocity = Math.sqrt(dx * dx + dy * dy);

      if (velocity > VELOCITY_THRESHOLD) {
        const count = Math.min(3, Math.floor(velocity / 8));
        for (let i = 0; i < count; i++) {
          spawnParticle(e.clientX, e.clientY, dx, dy);
        }
      }

      prevX = e.clientX;
      prevY = e.clientY;
    }

    function handleClick(e: MouseEvent) {
      pulses.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: 80,
        life: 0.5,
      });
    }

    function draw(now: number) {
      rafId = requestAnimationFrame(draw);
      const dt = lastTime ? (now - lastTime) / 1000 : 0.016;
      lastTime = now;

      ctx!.clearRect(0, 0, w, h);

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }

        p.vy += GRAVITY * dt;
        p.x += p.vx;
        p.y += p.vy * dt;

        const alpha = (p.life / p.maxLife) * 0.7;
        const glow = p.size * 2;

        // Glow
        const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx!.fillStyle = grad;
        ctx!.fillRect(p.x - glow, p.y - glow, glow * 2, glow * 2);

        // Core
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx!.fill();
      }

      // Update and draw pulse rings
      for (let i = pulses.length - 1; i >= 0; i--) {
        const ring = pulses[i];
        ring.life -= dt;
        if (ring.life <= 0) { pulses.splice(i, 1); continue; }

        const progress = 1 - ring.life / 0.5;
        ring.radius = ring.maxRadius * progress;
        const alpha = (1 - progress) * 0.4;

        ctx!.beginPath();
        ctx!.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx!.lineWidth = 1.5 * (1 - progress);
        ctx!.stroke();
      }
    }

    resize();
    rafId = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[2] pointer-events-none"
      aria-hidden
    />
  );
}
