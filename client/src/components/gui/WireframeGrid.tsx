import { useEffect, useRef } from 'react';
import { guiTheme } from '../../config/gui-theme.config';

const GRID_SPACING = 60;
const WARP_RADIUS = 150;
const WARP_STRENGTH = 25;

export default function WireframeGrid() {
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
    let mouseX = -1000;
    let mouseY = -1000;
    let scrollY = 0;
    let needsRedraw = true;

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
      needsRedraw = true;
    }

    function warpPoint(x: number, y: number): [number, number] {
      const dx = x - mouseX;
      const dy = y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > WARP_RADIUS || dist < 1) return [x, y];

      const force = (1 - dist / WARP_RADIUS) * WARP_STRENGTH;
      const nx = dx / dist;
      const ny = dy / dist;
      return [x + nx * force, y + ny * force];
    }

    function draw() {
      rafId = requestAnimationFrame(draw);
      if (!needsRedraw) return;
      needsRedraw = false;

      ctx!.clearRect(0, 0, w, h);

      // Perspective parameters
      const vanishX = w / 2;
      const vanishY = h * 0.3 - (scrollY % h) * 0.08;
      const horizonY = vanishY;

      const baseOpacity = 0.018;

      // Draw horizontal lines (receding into distance)
      const numHorizontal = 30;
      for (let i = 0; i <= numHorizontal; i++) {
        const t = i / numHorizontal;
        // Exponential spacing for perspective
        const perspT = t * t;
        const y = horizonY + perspT * (h - horizonY + 200);

        // Line fades near horizon
        const fade = Math.min(1, t * 3);
        const opacity = baseOpacity * fade;
        if (opacity < 0.002) continue;

        ctx!.beginPath();
        const segments = 40;
        for (let s = 0; s <= segments; s++) {
          const sx = (s / segments) * w;
          const [wx, wy] = warpPoint(sx, y);
          if (s === 0) ctx!.moveTo(wx, wy);
          else ctx!.lineTo(wx, wy);
        }
        ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx!.lineWidth = 0.5;
        ctx!.stroke();
      }

      // Draw vertical lines (converging to vanishing point)
      const numVertical = 24;
      for (let i = 0; i <= numVertical; i++) {
        const t = (i / numVertical - 0.5) * 2; // -1 to 1
        const bottomX = vanishX + t * w * 0.8;
        const topX = vanishX + t * w * 0.05; // Converge toward vanish point

        const opacity = baseOpacity * (1 - Math.abs(t) * 0.3);
        if (opacity < 0.002) continue;

        ctx!.beginPath();
        const segments = 30;
        for (let s = 0; s <= segments; s++) {
          const st = s / segments;
          const x = topX + (bottomX - topX) * st * st; // Perspective curve
          const y = horizonY + st * st * (h - horizonY + 200);
          const [wx, wy] = warpPoint(x, y);
          if (s === 0) ctx!.moveTo(wx, wy);
          else ctx!.lineTo(wx, wy);
        }
        ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx!.lineWidth = 0.5;
        ctx!.stroke();
      }
    }

    resize();
    rafId = requestAnimationFrame(draw);

    const onMouse = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; needsRedraw = true; };
    const onScroll = () => { scrollY = window.scrollY; needsRedraw = true; };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('scroll', onScroll);
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
