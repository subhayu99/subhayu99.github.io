import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAccentRgb } from '../../config/gui-theme.config';

interface ReflexGameProps {
  active: boolean;
  onClose: () => void;
}

const LS_HI = 'reflex-high-score';
const LS_RT = 'reflex-best-rt';
const GRID = 4;
const ROUND_SECS = 30;

interface Node { x: number; y: number; r: number; hit: number; miss: number; ripple: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number }

export default function ReflexGame({ active, onClose }: ReflexGameProps) {
  const [started, setStarted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<'splash' | 'play' | 'end'>('splash');
  const frameRef = useRef(0);
  const rafRef = useRef(0);

  const hiScoreRef = useRef(+(localStorage.getItem(LS_HI) || '0'));
  const bestRTRef = useRef(+(localStorage.getItem(LS_RT) || '0'));

  // Game state refs
  const nodesRef = useRef<Node[]>([]);
  const activeNodeRef = useRef(-1);
  const activeStartRef = useRef(0);
  const timeoutRef = useRef(1500);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const roundStartRef = useRef(0);
  const totalRTRef = useRef(0);
  const hitsRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout>>();
  const idleIdxRef = useRef(0);
  const idleTimerRef = useRef(0);

  // Rain drops
  const rainRef = useRef<{ x: number; y: number; sp: number; chars: string[] }[]>([]);

  const close = useCallback(() => {
    setStarted(false);
    stateRef.current = 'splash';
    cancelAnimationFrame(rafRef.current);
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    onClose();
  }, [onClose]);

  const enterAndStart = useCallback(() => {
    setStarted(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutNodes();
      initRain();
    }

    function initRain() {
      rainRef.current = [];
      for (let i = 0; i < Math.floor(W / 14); i++) {
        rainRef.current.push({
          x: i * 14,
          y: Math.random() * H,
          sp: 1 + Math.random() * 2,
          chars: Array.from({ length: 8 }, () => String.fromCharCode(0x30A0 + Math.random() * 96)),
        });
      }
    }

    function layoutNodes() {
      const nodes: Node[] = [];
      const gs = Math.min(W * 0.8, H * 0.5);
      const cell = gs / GRID;
      const r = cell * 0.3;
      const ox = (W - gs) / 2 + cell / 2;
      const oy = H * 0.3 + cell / 2;
      for (let row = 0; row < GRID; row++)
        for (let col = 0; col < GRID; col++)
          nodes.push({ x: ox + col * cell, y: oy + row * cell, r, hit: 0, miss: 0, ripple: 0 });
      nodesRef.current = nodes;
    }

    function activate() {
      const nodes = nodesRef.current;
      let idx: number;
      do { idx = (Math.random() * nodes.length) | 0; } while (idx === activeNodeRef.current && nodes.length > 1);
      activeNodeRef.current = idx;
      activeStartRef.current = performance.now();
      nodes[idx].ripple = frameRef.current;
      timeoutRef.current = Math.max(500, 1500 - scoreRef.current * 25);
    }

    function initGame() {
      scoreRef.current = 0;
      streakRef.current = 0;
      bestStreakRef.current = 0;
      totalRTRef.current = 0;
      hitsRef.current = 0;
      particlesRef.current = [];
      activeNodeRef.current = -1;
      roundStartRef.current = performance.now();
      layoutNodes();
      stateRef.current = 'play';
      activate();
    }

    function burst(x: number, y: number) {
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI * 2 * i) / 16;
        const sp = 2 + Math.random() * 3;
        particlesRef.current.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 });
      }
    }

    function hitNode(idx: number) {
      const n = nodesRef.current[idx];
      const rt = performance.now() - activeStartRef.current;
      totalRTRef.current += rt;
      hitsRef.current++;
      scoreRef.current += 1 + streakRef.current;
      streakRef.current++;
      if (streakRef.current > bestStreakRef.current) bestStreakRef.current = streakRef.current;
      n.hit = frameRef.current;
      burst(n.x, n.y);
      activeNodeRef.current = -1;
      timeoutIdRef.current = setTimeout(activate, 200);
    }

    function missTimeout() {
      if (activeNodeRef.current < 0) return;
      nodesRef.current[activeNodeRef.current].miss = frameRef.current;
      streakRef.current = 0;
      activeNodeRef.current = -1;
      timeoutIdRef.current = setTimeout(activate, 300);
    }

    function handleTap(px: number, py: number) {
      if (stateRef.current !== 'play' || activeNodeRef.current < 0) return;
      const n = nodesRef.current[activeNodeRef.current];
      if (Math.hypot(px - n.x, py - n.y) < n.r * 1.5) hitNode(activeNodeRef.current);
    }

    const onClick = (e: MouseEvent) => {
      if (stateRef.current === 'splash') { initGame(); return; }
      if (stateRef.current === 'end') { initGame(); return; }
      handleTap(e.clientX, e.clientY);
    };
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      if (stateRef.current === 'splash') { initGame(); return; }
      if (stateRef.current === 'end') { initGame(); return; }
      handleTap(e.touches[0].clientX, e.touches[0].clientY);
    };

    canvas.addEventListener('mousedown', onClick);
    canvas.addEventListener('touchstart', onTouch, { passive: false });

    // --- Drawing ---
    function drawRain() {
      const [r, g, b] = getAccentRgb();
      ctx!.save();
      ctx!.font = '12px monospace';
      ctx!.fillStyle = `rgb(${r},${g},${b})`;
      ctx!.globalAlpha = 0.04;
      for (const d of rainRef.current) {
        for (let i = 0; i < d.chars.length; i++) ctx!.fillText(d.chars[i], d.x, d.y + i * 14);
        d.y += d.sp;
        if (d.y > H + 120) { d.y = -112; d.chars = d.chars.map(() => String.fromCharCode(0x30A0 + Math.random() * 96)); }
      }
      ctx!.restore();
    }

    function drawNode(n: Node, alpha: number) {
      const [r, g, b] = getAccentRgb();
      const accent = `rgb(${r},${g},${b})`;
      const f = frameRef.current;
      ctx!.save();
      ctx!.globalAlpha = alpha;
      ctx!.strokeStyle = accent;
      ctx!.lineWidth = 2;
      ctx!.globalAlpha = alpha * 0.1;
      ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx!.stroke();
      // hit flash
      if (n.hit && f - n.hit < 15) {
        const p = 1 - (f - n.hit) / 15;
        ctx!.globalAlpha = alpha * p * 0.5; ctx!.fillStyle = accent;
        ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r * (1 + p * 0.3), 0, Math.PI * 2); ctx!.fill();
      }
      // miss flash
      if (n.miss && f - n.miss < 20) {
        const p = 1 - (f - n.miss) / 20;
        ctx!.globalAlpha = alpha * p * 0.6; ctx!.fillStyle = '#ff4444';
        ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.restore();
    }

    function drawActive(n: Node) {
      const [r, g, b] = getAccentRgb();
      const accent = `rgb(${r},${g},${b})`;
      const f = frameRef.current;
      const elapsed = performance.now() - activeStartRef.current;
      const frac = elapsed / timeoutRef.current;
      ctx!.save();
      ctx!.shadowColor = accent; ctx!.shadowBlur = 20 + 8 * Math.sin(f * 0.15);
      ctx!.fillStyle = accent; ctx!.globalAlpha = 0.7 - frac * 0.3;
      ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx!.fill();
      // ripple
      const rAge = f - n.ripple;
      if (rAge < 30) {
        const rp = rAge / 30;
        ctx!.globalAlpha = 0.4 * (1 - rp); ctx!.strokeStyle = accent; ctx!.lineWidth = 2;
        ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r * (1 + rp * 0.8), 0, Math.PI * 2); ctx!.stroke();
      }
      // countdown ring
      ctx!.globalAlpha = 0.8; ctx!.strokeStyle = accent; ctx!.lineWidth = 3;
      ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - frac)); ctx!.stroke();
      ctx!.restore();
    }

    function drawParticles() {
      const [r, g, b] = getAccentRgb();
      const accent = `rgb(${r},${g},${b})`;
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.035;
        if (p.life <= 0) { ps.splice(i, 1); continue; }
        ctx!.save(); ctx!.globalAlpha = p.life; ctx!.fillStyle = accent;
        ctx!.shadowColor = accent; ctx!.shadowBlur = 4;
        ctx!.fillRect(p.x - 2, p.y - 2, 4, 4); ctx!.restore();
      }
    }

    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      frameRef.current++;
      const f = frameRef.current;
      const [r, g, b] = getAccentRgb();
      const accent = `rgb(${r},${g},${b})`;

      ctx!.clearRect(0, 0, W, H);
      drawRain();

      if (stateRef.current === 'splash') {
        idleTimerRef.current++;
        if (idleTimerRef.current % 30 === 0) idleIdxRef.current = (idleIdxRef.current + 1) % nodesRef.current.length;
        for (let i = 0; i < nodesRef.current.length; i++) {
          drawNode(nodesRef.current[i], 1);
          if (i === idleIdxRef.current) {
            ctx!.save();
            ctx!.globalAlpha = 0.25 + 0.15 * Math.sin(f * 0.1);
            ctx!.fillStyle = accent; ctx!.shadowColor = accent; ctx!.shadowBlur = 12;
            ctx!.beginPath(); ctx!.arc(nodesRef.current[i].x, nodesRef.current[i].y, nodesRef.current[i].r, 0, Math.PI * 2); ctx!.fill();
            ctx!.restore();
          }
        }
      } else if (stateRef.current === 'play') {
        const timeLeft = ROUND_SECS - (performance.now() - roundStartRef.current) / 1000;
        if (timeLeft <= 0) {
          stateRef.current = 'end';
          if (scoreRef.current > hiScoreRef.current) {
            hiScoreRef.current = scoreRef.current;
            localStorage.setItem(LS_HI, String(hiScoreRef.current));
          }
          const avg = hitsRef.current ? Math.round(totalRTRef.current / hitsRef.current) : 0;
          if (avg && (!bestRTRef.current || avg < bestRTRef.current)) {
            bestRTRef.current = avg;
            localStorage.setItem(LS_RT, String(bestRTRef.current));
          }
          activeNodeRef.current = -1;
        }
        // check timeout
        if (activeNodeRef.current >= 0 && performance.now() - activeStartRef.current > timeoutRef.current) missTimeout();

        for (let i = 0; i < nodesRef.current.length; i++) {
          drawNode(nodesRef.current[i], 1);
          if (i === activeNodeRef.current) drawActive(nodesRef.current[i]);
        }
        drawParticles();

        // HUD
        ctx!.save();
        ctx!.fillStyle = accent; ctx!.shadowColor = accent; ctx!.shadowBlur = 6; ctx!.textAlign = 'center';
        ctx!.font = 'bold 28px monospace'; ctx!.fillText(String(scoreRef.current), W / 2, 36);
        ctx!.shadowBlur = 0; ctx!.font = '13px monospace'; ctx!.globalAlpha = 0.7;
        ctx!.textAlign = 'left';
        ctx!.fillText(`STREAK ${streakRef.current}`, 16, 28);
        ctx!.fillText(`BEST ${bestStreakRef.current}`, 16, 46);
        ctx!.textAlign = 'right';
        ctx!.fillText(`${Math.max(0, timeLeft).toFixed(1)}s`, W - 16, 28);
        ctx!.restore();
      } else if (stateRef.current === 'end') {
        for (const n of nodesRef.current) drawNode(n, 0.3);
        drawParticles();
      }
    }

    resize();
    if (started) {
      stateRef.current = 'splash';
    }
    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', onClick);
      canvas.removeEventListener('touchstart', onTouch);
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [active, started]);

  // Keyboard: ESC to close, Enter/Space to start
  useEffect(() => {
    if (!active) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, close]);

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          ref={containerRef}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {!started ? (
            <div className="absolute inset-0 cursor-pointer" onClick={enterAndStart}>
              <motion.div
                className="relative z-10 flex flex-col items-center justify-center gap-6 select-none h-full"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="font-display text-gui-accent text-5xl sm:text-7xl tracking-wider">REFLEX</h2>
                {hiScoreRef.current > 0 && (
                  <p className="text-zinc-500 font-mono text-sm">
                    BEST: {hiScoreRef.current}{bestRTRef.current ? `  |  ${bestRTRef.current}ms` : ''}
                  </p>
                )}
                <motion.p
                  className="text-gui-accent/70 font-mono text-sm mt-4"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {isTouchDevice ? 'TAP ANYWHERE TO PLAY' : 'CLICK TO PLAY'}
                </motion.p>
                <p className="text-zinc-600 font-mono text-xs">
                  Tap the glowing nodes. 30 seconds. Go.
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); close(); }}
                  className="mt-4 px-4 py-2 border border-white/10 text-zinc-500 font-mono text-xs hover:text-zinc-300 transition-colors"
                >
                  BACK
                </button>
              </motion.div>
            </div>
          ) : (
            <>
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
              <button
                onClick={close}
                className="absolute top-3 right-4 text-zinc-500 hover:text-red-400 transition-colors font-mono text-xs z-10"
              >
                ✕
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
