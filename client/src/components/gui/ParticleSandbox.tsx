import { useEffect, useRef, useCallback } from 'react';
import { guiTheme } from '../../config/gui-theme.config';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

interface ForceWell {
  x: number;
  y: number;
  strength: number; // positive = attract, negative = repel
  life: number;
}

const PARTICLE_COUNT = 180;
const DAMPING = 0.98;
const BOUNCE = 0.7;
const TRAIL_ALPHA = 0.08;
const FORCE_RADIUS = 200;

interface ParticleSandboxProps {
  gravityOn: boolean;
  explodeTrigger: number; // increment to trigger explosion
}

export default function ParticleSandbox({ gravityOn, explodeTrigger }: ParticleSandboxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const forcesRef = useRef<ForceWell[]>([]);
  const mouseRef = useRef<{ x: number; y: number; down: boolean }>({ x: -1, y: -1, down: false });
  const gravityRef = useRef(gravityOn);
  const rafRef = useRef<number>(0);

  gravityRef.current = gravityOn;

  const initParticles = useCallback((w: number, h: number) => {
    const cx = w / 2;
    const cy = h / 2;
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      particles.push({
        x: cx + (Math.random() - 0.5) * 20,
        y: cy + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 2.5,
      });
    }
    particlesRef.current = particles;
  }, []);

  // Re-explode when explodeTrigger changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    initParticles(w, h);
  }, [explodeTrigger, initParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = canvas.parentElement;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const w = () => canvas.width / dpr;
    const h = () => canvas.height / dpr;

    if (particlesRef.current.length === 0) {
      initParticles(w(), h());
    }

    const [r, g, b] = guiTheme.accentRgb;

    // Mouse/touch handlers
    const getPos = (e: MouseEvent | Touch): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMouseMove = (e: MouseEvent) => {
      const pos = getPos(e);
      mouseRef.current.x = pos.x;
      mouseRef.current.y = pos.y;
    };
    const onMouseDown = (e: MouseEvent) => {
      mouseRef.current.down = true;
      const pos = getPos(e);
      mouseRef.current.x = pos.x;
      mouseRef.current.y = pos.y;
    };
    const onMouseUp = () => {
      if (mouseRef.current.down) {
        // Shockwave on release
        forcesRef.current.push({
          x: mouseRef.current.x,
          y: mouseRef.current.y,
          strength: -15,
          life: 0.5,
        });
      }
      mouseRef.current.down = false;
    };
    const onMouseLeave = () => {
      mouseRef.current.x = -1;
      mouseRef.current.y = -1;
      mouseRef.current.down = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      const pos = getPos(t);
      mouseRef.current = { x: pos.x, y: pos.y, down: true };
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      const pos = getPos(t);
      mouseRef.current.x = pos.x;
      mouseRef.current.y = pos.y;
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (mouseRef.current.down) {
        forcesRef.current.push({
          x: mouseRef.current.x,
          y: mouseRef.current.y,
          strength: -15,
          life: 0.5,
        });
      }
      mouseRef.current.down = false;
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const cw = w();
      const ch = h();

      // Fade trail
      ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_ALPHA})`;
      ctx.fillRect(0, 0, cw, ch);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const forces = forcesRef.current;

      // Decay force wells
      for (let i = forces.length - 1; i >= 0; i--) {
        forces[i].life -= dt;
        if (forces[i].life <= 0) forces.splice(i, 1);
      }

      for (const p of particles) {
        // Gravity
        if (gravityRef.current) {
          p.vy += 200 * dt;
        }

        // Mouse attraction (when held down)
        if (mouse.down && mouse.x >= 0) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < FORCE_RADIUS && dist > 1) {
            const force = 8 * (1 - dist / FORCE_RADIUS);
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Force wells (shockwaves)
        for (const f of forces) {
          const dx = p.x - f.x;
          const dy = p.y - f.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < FORCE_RADIUS && dist > 1) {
            const power = f.strength * (1 - dist / FORCE_RADIUS) * (f.life * 2);
            p.vx += (dx / dist) * power;
            p.vy += (dy / dist) * power;
          }
        }

        // Integrate
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.vx *= DAMPING;
        p.vy *= DAMPING;

        // Bounce off walls
        if (p.x < 0) { p.x = 0; p.vx *= -BOUNCE; }
        if (p.x > cw) { p.x = cw; p.vx *= -BOUNCE; }
        if (p.y < 0) { p.y = 0; p.vy *= -BOUNCE; }
        if (p.y > ch) { p.y = ch; p.vy *= -BOUNCE; }

        // Draw particle
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const alpha = Math.min(0.3 + speed * 0.1, 1);
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
        ctx.shadowBlur = 4;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Draw force wells indicator
      for (const f of forces) {
        const alpha = f.life * 0.3;
        const radius = FORCE_RADIUS * (1 - f.life);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw attraction indicator when holding
      if (mouse.down && mouse.x >= 0) {
        const pulse = Math.sin(now / 200) * 0.1 + 0.2;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [initParticles]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
