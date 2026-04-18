import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAccentRgb } from '../../config/gui-theme.config';

interface RacerGameProps {
  active: boolean;
  onClose: () => void;
}

const LS_KEY = 'racer-high-score';

/**
 * RacerGame — portfolio-native infinite-runner racer.
 *
 * Third-person chase cam with a 3D city skyline, atmospheric ground fog, and
 * road that flows through the horizon infinitely. Uses the current portfolio
 * accent theme for everything. Triggered by typing "racer" anywhere or by
 * long-pressing the Years Experience stat card (2s).
 *
 * Ported from the standalone Racer-polished.html — all game logic kept in
 * refs so React re-renders don't disturb the RAF loop.
 */
export default function RacerGame({ active, onClose }: RacerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const steerRef = useRef<HTMLDivElement>(null);
  const steerKnobRef = useRef<HTMLDivElement>(null);

  const [started, setStarted] = useState(false);
  const [overlayKind, setOverlayKind] = useState<'start' | 'over'>('start');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => {
    const stored = localStorage.getItem(LS_KEY);
    return stored ? parseInt(stored, 10) || 0 : 0;
  });
  const [speedDisplay, setSpeedDisplay] = useState('0.0 KM');
  const [litDot, setLitDot] = useState(0);
  const [isTouchLayout, setIsTouchLayout] = useState(false);

  // Game state lives in refs — RAF loop mutates directly without re-renders.
  const gameRef = useRef({
    running: false,
    over: false,
    demo: true,
    t: 0,
    last: 0,
    score: 0,
    speed: 0.7,
    targetSpeed: 0.7,
    distance: 0,
    lives: 3,
    x: 0.5,
    vx: 0,
    falling: false,
    fallTime: 0,
    fallVx: 0,
    fallVy: 0,
    fallY: 0,
    fallRot: 0,
    fallRotV: 0,
    flash: 0,
    obstacles: [] as Array<{
      x: number; z: number; type: string; rot: number; spin: number;
      bob?: number; flying?: boolean; flyPhase?: number; w: number;
      passed?: boolean;
    }>,
    nextSpawn: 0.8,
    trail: [] as Array<{ x: number; life: number }>,
    input: { left: false, right: false },
    dims: { W: 0, H: 0, DPR: 1 },
    lastBuildingDistance: 0,
    steerActive: false,
  });

  const buildingsRef = useRef({
    list: [] as Array<{ worldX: number; worldZ: number; w: number; h: number }>,
    initialized: false,
  });

  const rafRef = useRef(0);

  // ============================================================================
  // Entry / exit lifecycle
  // ============================================================================
  const close = useCallback(() => {
    const g = gameRef.current;
    if (g.score > parseInt(localStorage.getItem(LS_KEY) || '0', 10)) {
      localStorage.setItem(LS_KEY, String(g.score));
      setBest(g.score);
    }
    cancelAnimationFrame(rafRef.current);
    setStarted(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const g = gameRef.current;

    // ---------- canvas sizing ----------
    const resize = () => {
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.dims = { W, H, DPR };
    };
    resize();
    window.addEventListener('resize', resize);

    // ---------- touch layout detection ----------
    const refreshTouch = () => {
      const isTouch =
        'ontouchstart' in window ||
        (navigator.maxTouchPoints || 0) > 0 ||
        window.innerWidth < 900;
      setIsTouchLayout(isTouch);
    };
    refreshTouch();
    window.addEventListener('resize', refreshTouch);

    // ---------- ESC to close ----------
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      if (g.over) {
        if (e.key === 'r' || e.key === 'R' || e.key === 'Enter' || e.code === 'Space') { restart(); }
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { g.input.left = true; firstInput(); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { g.input.right = true; firstInput(); e.preventDefault(); }
      else if (e.key === 'r' || e.key === 'R') restart();
      else firstInput();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') g.input.left = false;
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') g.input.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ---------- canvas tap to dismiss demo / restart on game over ----------
    const onCanvasTouchStart = () => {
      if (g.over) { restart(); return; }
      firstInput();
    };
    canvas.addEventListener('touchstart', onCanvasTouchStart, { passive: true });

    // ---------- boot game loop ----------
    resetGame(true);
    g.last = performance.now();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', refreshTouch);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('touchstart', onCanvasTouchStart);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // ============================================================================
  // Game logic (all defined inside the component so they share game state refs)
  // ============================================================================
  function firstInput() {
    const g = gameRef.current;
    if (g.demo) g.demo = false;
    if (!started) setStarted(true);
  }

  function resetGame(keepDemo: boolean) {
    const g = gameRef.current;
    g.over = false;
    g.score = 0;
    g.distance = 0;
    g.lives = 3;
    g.speed = 0.7;
    g.targetSpeed = 0.7;
    g.x = 0.5;
    g.vx = 0;
    g.obstacles.length = 0;
    g.nextSpawn = 0.8;
    g.trail.length = 0;
    g.falling = false;
    g.fallTime = 0;
    g.demo = keepDemo;
    g.running = true;
    g.flash = 0;
    g.lastBuildingDistance = 0;
    buildingsRef.current.initialized = false;
    setScore(0);
    setOverlayKind('start');
  }

  function restart() {
    resetGame(false);
    setStarted(true);
    setOverlayKind('start');
  }

  function spawnObstacle() {
    const g = gameRef.current;
    const x = 0.08 + Math.random() * 0.84;
    const types = ['block', 'block', 'tri', 'hex', 'bar', 'bar', 'fly', 'fly'];
    const r = Math.random();
    const type = r < 0.1 ? 'gate' : types[Math.floor(Math.random() * types.length)];
    const flying = type === 'fly';
    g.obstacles.push({
      x, z: 0, type,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 2,
      bob: 4 + Math.random() * 8,
      flying,
      flyPhase: Math.random() * Math.PI * 2,
      w: 0.14 + Math.random() * 0.04,
    });
    if (Math.random() < 0.25 && type !== 'gate') {
      const gap = 0.35 + Math.random() * 0.2;
      let x2 = x + (Math.random() < 0.5 ? -gap : gap);
      if (x2 < 0.1 || x2 > 0.9) x2 = x + (x > 0.5 ? -gap : gap);
      x2 = Math.max(0.08, Math.min(0.92, x2));
      g.obstacles.push({
        x: x2, z: 0, type: 'block',
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 2,
        w: 0.13,
      });
    }
  }

  // ============================================================================
  // Buildings (3D city)
  // ============================================================================
  const BUILDING_FOCAL = 280;
  const BUILDING_CAM_Y = 1.2;
  const BUILDING_COUNT = 170;
  const BUILDING_NEAR_Z = 5;
  const BUILDING_FAR_Z = 320;
  const BUILDING_ROAD_CLEARANCE = 10;
  const BUILDING_SIDE_MAX = 165;

  function respawnBuilding(b: { worldX: number; worldZ: number; w: number; h: number }, anywhere: boolean) {
    const side = Math.random() < 0.5 ? -1 : 1;
    b.worldX = side * (BUILDING_ROAD_CLEARANCE + Math.random() * (BUILDING_SIDE_MAX - BUILDING_ROAD_CLEARANCE));
    b.worldZ = anywhere
      ? BUILDING_NEAR_Z + Math.random() * (BUILDING_FAR_Z - BUILDING_NEAR_Z)
      : BUILDING_FAR_Z - Math.random() * 12;
    b.w = 3 + Math.random() * 10;
    b.h = 3 + Math.pow(Math.random(), 1.6) * 14;
  }
  function initBuildings() {
    const bs = buildingsRef.current;
    bs.list.length = 0;
    for (let i = 0; i < BUILDING_COUNT; i++) {
      const b = { worldX: 0, worldZ: 0, w: 0, h: 0 };
      respawnBuilding(b, true);
      bs.list.push(b);
    }
    bs.initialized = true;
    gameRef.current.lastBuildingDistance = gameRef.current.distance;
  }
  function updateBuildings() {
    const g = gameRef.current;
    const bs = buildingsRef.current;
    if (!bs.initialized) initBuildings();
    const delta = Math.max(0, g.distance - g.lastBuildingDistance);
    const advance = delta * 0.06;
    for (const b of bs.list) {
      b.worldZ -= advance;
      if (b.worldZ < BUILDING_NEAR_Z) respawnBuilding(b, false);
    }
    g.lastBuildingDistance = g.distance;
  }

  // ============================================================================
  // Update
  // ============================================================================
  function update(dt: number) {
    const g = gameRef.current;
    if (!g.running || g.over) return;
    g.t += dt;
    const d = g.distance;
    let target: number;
    if (d < 1000) target = 0.7 + d * 0.0003;
    else if (d < 3500) target = 1.0 + (d - 1000) * 0.0002;
    else if (d < 7000) target = 1.5 + (d - 3500) * 0.00017;
    else target = Math.min(2.6, 2.1 + (d - 7000) * 0.0001);
    g.targetSpeed = target;
    g.speed += (g.targetSpeed - g.speed) * Math.min(1, dt * 1.2);

    if (!g.demo) {
      const accel = 4.5;
      if (g.input.left) g.vx -= accel * dt;
      if (g.input.right) g.vx += accel * dt;
      if (!g.input.left && !g.input.right) g.vx *= Math.pow(0.0001, dt);
      g.vx = Math.max(-1.4, Math.min(1.4, g.vx));
      if (!g.falling) {
        g.x += g.vx * dt * 0.35;
        if (g.x < 0.10 || g.x > 0.90) {
          g.falling = true;
          g.fallTime = 0;
          g.fallVy = 0;
          g.fallRot = 0;
          g.fallRotV = (Math.random() - 0.5) * 4;
          g.fallVx = g.vx * 0.6 + (g.x > 0.5 ? 0.8 : -0.8);
          g.flash = 1;
        }
      }
    }
    if (g.falling) {
      g.fallTime += dt;
      g.fallVy += dt * 2.2;
      g.fallY += g.fallVy * dt;
      g.fallVx *= Math.pow(0.5, dt);
      g.x += g.fallVx * dt;
      g.fallRot += g.fallRotV * dt;
      if (g.fallTime > 0.7) {
        g.falling = false;
        g.fallY = 0; g.fallVy = 0; g.fallVx = 0; g.fallRot = 0;
        g.x = 0.5; g.vx = 0;
        g.lives -= 1;
        g.flash = 1;
        if (g.lives <= 0) gameOver();
      }
    }

    const adv = dt * g.speed * 140;
    g.distance += adv;
    g.score = Math.floor(g.distance * 0.1);

    g.nextSpawn -= dt * g.speed * 1.35;
    if (g.nextSpawn <= 0) {
      spawnObstacle();
      g.nextSpawn = 0.55 + Math.random() * 0.5;
    }
    for (const o of g.obstacles) {
      const perspRate = 0.25 + o.z * o.z * 3.0;
      o.z += dt * g.speed * 0.55 * perspRate;
    }
    for (const o of g.obstacles) {
      if (o.passed) continue;
      if (o.z > 0.92 && o.z < 1.05) {
        let ox = o.x;
        if (o.type === 'fly') ox += Math.sin(g.t * 2 + (o.flyPhase || 0)) * 0.08;
        const dx = Math.abs(ox - g.x);
        const hitRange = 0.05;
        if (o.type === 'gate') { o.passed = true; g.score += 25; }
        else if (dx < hitRange) {
          o.passed = true;
          if (!g.demo) {
            g.lives--;
            g.flash = 1;
            if (g.lives <= 0) gameOver();
          } else g.flash = 1;
        }
      } else if (o.z >= 1.05 && !o.passed) {
        o.passed = true;
        if (o.type === 'block') g.score += 5;
      }
    }
    g.obstacles = g.obstacles.filter(o => o.z < 1.25);
    if (g.demo) { demoStep(dt); g.lives = 3; }
    updateBuildings();
    g.trail.push({ x: g.x, life: 1 });
    if (g.trail.length > 30) g.trail.shift();
    for (const p of g.trail) p.life -= dt * 1.8;
    g.trail = g.trail.filter(p => p.life > 0);
  }

  function demoStep(dt: number) {
    const g = gameRef.current;
    let threat: typeof g.obstacles[number] | null = null;
    let best = 99;
    for (const o of g.obstacles) {
      if (o.type === 'gate' || o.passed) continue;
      if (o.z > 0.35 && o.z < 0.95) {
        const dx = Math.abs(o.x - g.x);
        if (dx < 0.18 && o.z < best) { threat = o; best = o.z; }
      }
    }
    let target = g.x;
    if (threat) {
      const leftRoom = threat.x - 0;
      const rightRoom = 1 - threat.x;
      if (leftRoom > rightRoom) target = Math.max(0.08, threat.x - 0.22);
      else target = Math.min(0.92, threat.x + 0.22);
    } else target = 0.5;
    g.x += (target - g.x) * Math.min(1, dt * 3);
  }

  function gameOver() {
    const g = gameRef.current;
    g.over = true;
    if (g.score > parseInt(localStorage.getItem(LS_KEY) || '0', 10)) {
      localStorage.setItem(LS_KEY, String(g.score));
      setBest(g.score);
    }
    setScore(g.score);
    setOverlayKind('over');
  }

  // ============================================================================
  // Rendering — ported faithfully from Racer-polished.html
  // ============================================================================
  function accentRgb(): string {
    const [r, g, b] = getAccentRgb();
    return `${r}, ${g}, ${b}`;
  }
  function col(which: 'fg' | 'dim' | 'ghost'): string {
    const rgb = accentRgb();
    if (which === 'fg') return `rgb(${rgb})`;
    if (which === 'dim') return `rgba(${rgb}, 0.45)`;
    return `rgba(${rgb}, 0.18)`;
  }

  function draw() {
    const g = gameRef.current;
    const ctx = canvasRef.current!.getContext('2d', { alpha: false });
    if (!ctx) return;
    const { W, H } = g.dims;

    // Clear black
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Camera shake
    let sx = 0, sy = 0;
    if (g.flash > 0.1) {
      const amt = Math.max(0, g.flash) * 6;
      sx = (Math.random() - 0.5) * amt;
      sy = (Math.random() - 0.5) * amt;
    }
    const speedShakeBase = Math.max(0, (g.speed - 1) / 1.6);
    const speedShakeAmt = speedShakeBase * speedShakeBase * 0.8;
    sx += (Math.random() - 0.5) * speedShakeAmt;
    sy += (Math.random() - 0.5) * speedShakeAmt;
    ctx.save();
    ctx.translate(sx, sy);

    const horizon = H * 0.16;
    const wob = Math.sin(g.t * 18) * 0.4 * (g.speed - 1);
    const vx = W / 2;

    // Stars backdrop
    const t = g.t;
    ctx.fillStyle = col('ghost');
    for (let i = 0; i < 60; i++) {
      const seed = i * 53.3;
      const x = ((Math.sin(seed) * 0.5 + 0.5) * W + g.distance * 0.02 * 0.3) % W;
      const y = ((Math.cos(seed * 1.7) * 0.5 + 0.5) * (horizon + wob));
      const tw = (Math.sin(t * 2 + seed) + 1) / 2;
      ctx.globalAlpha = 0.3 + tw * 0.5;
      ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    }
    ctx.fillStyle = col('dim');
    for (let i = 0; i < 20; i++) {
      const seed = i * 89.1;
      const x = ((Math.sin(seed) * 0.5 + 0.5) * W + g.distance * 0.02 * 0.6) % W;
      const y = ((Math.cos(seed * 2.1) * 0.5 + 0.5) * (horizon + wob) * 0.9);
      ctx.globalAlpha = 0.6;
      ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
    }
    ctx.globalAlpha = 1;

    // Ground plane atmospheric gradient (green haze fading to black)
    const bottomInset = W * 0.08;
    const speedFracFOV = Math.max(0, Math.min(1, (g.speed - 1) / 1.6));
    const horizonLift = Math.min(H * 0.07, 56) + speedFracFOV * 14;
    const vanishY = (horizon + wob) - horizonLift;
    const p0 = ((horizon + wob) - vanishY) / (H - vanishY);
    const eL = vx + (bottomInset - vx) * p0;
    const eR = vx + ((W - bottomInset) - vx) * p0;
    const groundTop = horizon + wob;
    const [rr, gg, bb] = getAccentRgb();
    const rgbStr = `${rr}, ${gg}, ${bb}`;
    const grad = ctx.createLinearGradient(0, groundTop, 0, H);
    grad.addColorStop(0.0, `rgba(${rgbStr}, 0.22)`);
    grad.addColorStop(0.35, `rgba(${rgbStr}, 0.08)`);
    grad.addColorStop(0.75, `rgba(${rgbStr}, 0.015)`);
    grad.addColorStop(1.0, `rgba(${rgbStr}, 0)`);
    ctx.fillStyle = grad;
    // Left void
    ctx.beginPath();
    ctx.moveTo(0, groundTop); ctx.lineTo(eL, groundTop);
    ctx.lineTo(bottomInset, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    // Right void
    ctx.beginPath();
    ctx.moveTo(eR, groundTop); ctx.lineTo(W, groundTop);
    ctx.lineTo(W, H); ctx.lineTo(W - bottomInset, H); ctx.closePath(); ctx.fill();

    // 3D city buildings
    const bs = buildingsRef.current;
    if (!bs.initialized) initBuildings();
    bs.list.sort((a, b) => b.worldZ - a.worldZ);
    const tR = Math.floor(rr * 0.17), tG = Math.floor(gg * 0.17), tB = Math.floor(bb * 0.17);
    for (const b of bs.list) {
      const z = b.worldZ;
      if (z < BUILDING_NEAR_Z || z > BUILDING_FAR_Z + 20) continue;
      const s = BUILDING_FOCAL / z;
      const sxb = W / 2 + b.worldX * s;
      const screenW = b.w * s;
      if (screenW < 0.5) continue;
      if (sxb + screenW * 0.5 < -6 || sxb - screenW * 0.5 > W + 6) continue;
      const syBase = (horizon + wob) + BUILDING_CAM_Y * s;
      const syTop = syBase - b.h * s;
      if (syBase < (horizon + wob) - 2) continue;
      const bx = sxb - screenW / 2;
      const bh = syBase - syTop;
      const distFrac = z / BUILDING_FAR_Z;
      const solidness = Math.max(0.22, Math.min(0.96, 1 - Math.pow(distFrac, 0.7) * 0.78));
      ctx.fillStyle = `rgba(${tR}, ${tG}, ${tB}, ${solidness})`;
      ctx.fillRect(bx, syTop, screenW, bh);
      ctx.globalAlpha = solidness * 0.9;
      ctx.strokeStyle = col('dim');
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, syTop, screenW, bh);
    }
    ctx.globalAlpha = 1;

    // Road edges (with lifted vanishing point)
    const segments = 40;
    const fadeStartT = 0;
    const perspDenom = H - vanishY;
    const persp = (tt: number) => {
      const y = (horizon + wob) + (H - (horizon + wob)) * tt;
      return (y - vanishY) / perspDenom;
    };
    const edgeX = (tt: number) => {
      const p = persp(tt);
      return { L: vx + (bottomInset - vx) * p, R: vx + ((W - bottomInset) - vx) * p };
    };
    for (let i = 0; i < segments; i++) {
      const t0 = fadeStartT + (1 - fadeStartT) * (i / segments);
      const t1 = fadeStartT + (1 - fadeStartT) * ((i + 1) / segments);
      const p0 = persp(t0), p1 = persp(t1);
      const lx0 = vx + (bottomInset - vx) * p0;
      const lx1 = vx + (bottomInset - vx) * p1;
      const rx0 = vx + ((W - bottomInset) - vx) * p0;
      const rx1 = vx + ((W - bottomInset) - vx) * p1;
      const ly0 = (horizon + wob) + (H - (horizon + wob)) * t0;
      const ly1 = (horizon + wob) + (H - (horizon + wob)) * t1;
      const a = Math.min(1, (t0 - fadeStartT) / 0.06) * 0.9;
      ctx.globalAlpha = a;
      ctx.strokeStyle = col('fg');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(lx0, ly0); ctx.lineTo(lx1, ly1);
      ctx.moveTo(rx0, ly0); ctx.lineTo(rx1, ly1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Center dashed line
    ctx.strokeStyle = col('ghost');
    ctx.lineWidth = 1;
    const dashPhase = (g.distance * 0.004) % 1;
    const speedNorm = Math.min(1, (g.speed - 1) / 2.2);
    const dashSolid = 0.35 + speedNorm * 0.3;
    ctx.beginPath();
    let drawing = false;
    for (let tt = 0; tt <= 1; tt += 0.015) {
      const e = edgeX(tt);
      const x = (e.L + e.R) / 2;
      const y = (horizon + wob) + (H - (horizon + wob)) * tt;
      const d = ((tt + dashPhase) * 20) % 1;
      if (d < dashSolid) {
        if (!drawing) { ctx.moveTo(x, y); drawing = true; }
        else ctx.lineTo(x, y);
      } else drawing = false;
    }
    ctx.stroke();

    // Player trail
    if (g.trail.length > 1) {
      ctx.strokeStyle = col('ghost');
      ctx.lineWidth = 1;
      for (let i = 1; i < g.trail.length; i++) {
        const p = g.trail[i], pp = g.trail[i - 1];
        const y = H - 70 + (1 - p.life) * 30;
        const yy = H - 70 + (1 - pp.life) * 30;
        const e = edgeX(1);
        const x = e.L + (e.R - e.L) * p.x;
        const xx = e.L + (e.R - e.L) * pp.x;
        ctx.globalAlpha = p.life * 0.5;
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(x, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Obstacles
    for (const o of g.obstacles) {
      const tz = o.z;
      if (tz < 0.02) continue;
      const e = edgeX(tz);
      let ox = o.x;
      if (o.type === 'fly') ox += Math.sin(g.t * 2 + (o.flyPhase || 0)) * 0.08;
      const cx = e.L + (e.R - e.L) * ox;
      const y = (horizon + wob) + (H - (horizon + wob)) * tz;
      const scale = tz;
      const size = (40 * scale + 6) * (W / 900);
      if (o.type === 'gate') {
        ctx.strokeStyle = col('fg'); ctx.lineWidth = 1;
        const gateW = (e.R - e.L) * 0.98;
        ctx.strokeRect(e.L + 1, y - 2, gateW, 3);
      } else {
        drawObstacle(ctx, o, cx, y, size, scale);
      }
    }

    // Player ship
    const e1 = edgeX(1);
    const cx = e1.L + (e1.R - e1.L) * g.x;
    const carY = isTouchLayout ? H - 170 : H - 100;
    if (g.falling) {
      ctx.save();
      const fy = Math.min(600, g.fallY * 400);
      const fscale = Math.max(0.2, 1 - g.fallTime * 0.5);
      ctx.translate(cx, carY + fy);
      ctx.rotate(g.fallRot);
      ctx.scale(fscale, fscale);
      ctx.globalAlpha = Math.max(0, 1 - g.fallTime * 0.7);
      drawShip(ctx, 0, 0, g.vx);
      ctx.restore();
    } else {
      drawShip(ctx, cx, carY, g.vx);
    }

    ctx.restore();

    // Speed vignette overlay (outside shake transform)
    const vFrac = Math.max(0, Math.min(1, (g.speed - 1) / 1.6));
    if (vFrac > 0.02) {
      const inner = Math.min(W, H) * (0.52 - vFrac * 0.18);
      const outer = Math.max(W, H) * 0.75;
      const vg = ctx.createRadialGradient(W / 2, H * 0.55, inner, W / 2, H * 0.55, outer);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(0,0,0,${0.25 + vFrac * 0.55})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    // Impact vignette
    if (g.flash > 0.1) {
      ctx.strokeStyle = col('fg');
      ctx.globalAlpha = Math.min(1, g.flash) * 0.9;
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.globalAlpha = 1;
    }
  }

  function drawObstacle(
    ctx: CanvasRenderingContext2D,
    o: { type: string; rot: number; spin: number; flyPhase?: number },
    cx: number, y: number, size: number, scale: number,
  ) {
    const fg = col('fg');
    const dim = col('dim');
    const ghost = col('ghost');
    if (o.type === 'fly') {
      const hover = Math.sin(gameRef.current.t * 3 + (o.flyPhase || 0)) * 10 * scale;
      const s = Math.max(5, size * 0.55);
      const sb = s * 0.55;
      const off = 2 + scale * 3;
      ctx.save(); ctx.translate(cx, y - 30 * scale - 14 + hover);
      const danger = scale > 0.78;
      ctx.strokeStyle = fg;
      ctx.lineWidth = danger ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = danger ? fg : dim;
      ctx.beginPath();
      ctx.moveTo(0, -sb - off); ctx.lineTo(sb, -off); ctx.lineTo(0, sb - off); ctx.lineTo(-sb, -off); ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = danger ? dim : ghost;
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(0, -sb - off);
      ctx.moveTo(s, 0); ctx.lineTo(sb, -off);
      ctx.moveTo(0, s); ctx.lineTo(0, sb - off);
      ctx.moveTo(-s, 0); ctx.lineTo(-sb, -off);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const danger = scale > 0.78;
    const w = Math.max(8, size * 0.9);
    const h = Math.max(10, 24 * scale + 8);
    const farScale = 0.62;
    const offY = 4 + scale * 10;
    ctx.save(); ctx.translate(cx, y - h / 2);
    const nearPath = () => {
      ctx.beginPath();
      if (o.type === 'tri') {
        ctx.moveTo(0, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.closePath();
      } else if (o.type === 'hex') {
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2 + Math.PI / 6;
          const x = Math.cos(a) * w / 2, yy = Math.sin(a) * h / 2;
          if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.closePath();
      } else if (o.type === 'bar') {
        ctx.rect(-w / 2, -4, w, 8);
      } else {
        ctx.rect(-w / 2, -h / 2, w, h);
      }
    };
    ctx.save();
    ctx.translate(0, -offY);
    ctx.scale(farScale, farScale);
    ctx.strokeStyle = danger ? fg : dim;
    ctx.lineWidth = danger ? 1.3 : 1;
    nearPath(); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = danger ? dim : ghost;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const verts: Array<[number, number]> =
      o.type === 'tri' ? [[0, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
      : o.type === 'hex' ? (() => {
        const r: Array<[number, number]> = [];
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2 + Math.PI / 6;
          r.push([Math.cos(a) * w / 2, Math.sin(a) * h / 2]);
        }
        return r;
      })()
      : o.type === 'bar' ? [[-w / 2, -4], [w / 2, -4], [w / 2, 4], [-w / 2, 4]]
      : [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    for (const [vx2, vy2] of verts) {
      ctx.moveTo(vx2, vy2); ctx.lineTo(vx2 * farScale, vy2 * farScale - offY);
    }
    ctx.stroke();
    ctx.strokeStyle = fg;
    ctx.lineWidth = danger ? 1.6 : 1.2;
    nearPath(); ctx.stroke();
    ctx.strokeStyle = ghost;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2 + 2); ctx.lineTo(w / 2, h / 2 + 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawShip(ctx: CanvasRenderingContext2D, cx: number, cy: number, vxVal: number) {
    const g = gameRef.current;
    const fg = col('fg');
    const dim = col('dim');
    const W = g.dims.W;
    const K = Math.max(1, Math.min(2.2, W / 900));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(K, K);
    const tilt = Math.max(-0.35, Math.min(0.35, vxVal * 0.28));
    ctx.rotate(tilt);
    const w = 42, h = 38;
    ctx.strokeStyle = fg; ctx.lineWidth = 1.2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(0, h / 2 - 8); ctx.lineTo(-w / 2, h / 2); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = dim;
    ctx.beginPath(); ctx.moveTo(0, -h / 2 + 6); ctx.lineTo(0, h / 2 - 10); ctx.stroke();
    const flick = Math.sin(g.t * 60) > 0;
    ctx.fillStyle = flick ? fg : dim;
    ctx.fillRect(-8, h / 2 + 1, 4, 3);
    ctx.fillRect(4, h / 2 + 1, 4, 3);
    ctx.restore();
  }

  // ============================================================================
  // Tick
  // ============================================================================
  function tick(ts?: number) {
    const g = gameRef.current;
    const now = typeof ts === 'number' ? ts : performance.now();
    const dt = Math.min(0.05, (now - g.last) / 1000 || 0);
    g.last = now;
    if (g.flash > 0) g.flash -= dt * 2;
    update(dt);
    draw();
    // HUD updates
    setScore(g.score);
    setSpeedDisplay((g.distance / 1000).toFixed(2) + ' KM');
    const speedFrac = Math.min(1, Math.max(0, (g.speed - 0.7) / 1.6));
    const dotFreq = 2 + speedFrac * 9;
    const idx = Math.floor((g.t * dotFreq) % 7);
    setLitDot(idx);
    // sync steer knob
    if (isTouchLayout && steerKnobRef.current && !g.steerActive) {
      const frac = Math.max(0, Math.min(1, (g.x - 0.14) / (0.86 - 0.14)));
      steerKnobRef.current.style.left = (8 + frac * 84) + '%';
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  // ============================================================================
  // Steering slider handlers
  // ============================================================================
  function applySteerFromClientX(clientX: number) {
    const steer = steerRef.current;
    const knob = steerKnobRef.current;
    if (!steer || !knob) return;
    const rect = steer.getBoundingClientRect();
    const trackPxL = rect.left + rect.width * 0.08;
    const trackPxR = rect.left + rect.width * 0.92;
    const frac = Math.max(0, Math.min(1, (clientX - trackPxL) / (trackPxR - trackPxL)));
    const g = gameRef.current;
    g.x = 0.14 + frac * (0.86 - 0.14);
    g.vx = 0;
    knob.style.left = (8 + frac * 84) + '%';
    firstInput();
  }

  const onSteerTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    gameRef.current.steerActive = true;
    applySteerFromClientX(e.touches[0].clientX);
  };
  const onSteerTouchMove = (e: React.TouchEvent) => {
    if (!gameRef.current.steerActive) return;
    e.preventDefault();
    applySteerFromClientX(e.touches[0].clientX);
  };
  const onSteerTouchEnd = () => { gameRef.current.steerActive = false; };
  const onSteerMouseDown = (e: React.MouseEvent) => {
    gameRef.current.steerActive = true;
    applySteerFromClientX(e.clientX);
    const onMove = (me: MouseEvent) => applySteerFromClientX(me.clientX);
    const onUp = () => {
      gameRef.current.steerActive = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ============================================================================
  // Render
  // ============================================================================
  if (!active) return null;

  const fmt = (n: number) => String(Math.max(0, Math.floor(n))).padStart(4, '0');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[60] bg-black overflow-hidden"
        style={{ fontFamily: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace' }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* HUD — top-left score, top-right distance + pulse dots */}
        <div className="fixed top-3.5 left-4 text-[11px] tracking-[0.18em] uppercase pointer-events-none z-10" style={{ color: col('fg') }}>
          <span>RACER</span>
          <span className="ml-1" style={{ color: col('dim') }}> · SCORE</span> <span>{fmt(score)}</span>
          <span className="ml-2" style={{ color: col('dim') }}>BEST</span> <span>{best}</span>
        </div>
        <div className="fixed top-3.5 right-4 text-[11px] tracking-[0.18em] uppercase text-right pointer-events-none z-10" style={{ color: col('dim') }}>
          <div style={{ color: col('fg') }}>{speedDisplay}</div>
          <div className="flex gap-2 mt-2 justify-end">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <span
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: 4, height: 4,
                  background: i === litDot ? col('fg') : col('ghost'),
                  boxShadow: i === litDot ? `0 0 6px ${col('fg')}, 0 0 12px rgba(${accentRgb()}, 0.5)` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Close button top-right corner */}
        <button
          onClick={close}
          className="fixed top-3 right-4 z-[70] text-[11px] tracking-[0.2em] uppercase hover:opacity-80 transition-opacity"
          style={{ color: col('dim'), top: 36 }}
        >
          ✕ ESC
        </button>

        {/* Start/Game-over overlay */}
        {(overlayKind === 'start' && !started) && (
          <div className="fixed inset-0 z-20 flex flex-col items-center justify-center text-center pointer-events-none select-none px-5">
            <div className="text-[28px] tracking-[0.18em] uppercase mb-4" style={{ color: '#fff' }}>RACER</div>
            <div className="text-[12px] tracking-[0.28em] uppercase" style={{ color: col('fg') }}>
              {isTouchLayout ? 'Tap to start' : 'Press any key or swipe to start'}
              <span className="ml-1 animate-pulse">_</span>
            </div>
            <div className="text-[10px] tracking-[0.22em] uppercase mt-3" style={{ color: col('dim') }}>
              ← → · A D · Swipe · Dodge blocks · ESC to exit
            </div>
          </div>
        )}
        {overlayKind === 'over' && (
          <>
            <div className="fixed inset-0 z-20 bg-black/70 backdrop-blur-[6px]" />
            <div className="fixed inset-0 z-30 flex flex-col items-center justify-center text-center select-none px-5">
              <div className="text-[13px] tracking-[0.5em] uppercase mb-4" style={{ color: col('dim') }}>Game Over</div>
              <div
                className="leading-none font-medium"
                style={{
                  fontSize: 'clamp(80px, 18vw, 180px)',
                  color: col('fg'),
                  letterSpacing: '0.04em',
                  textShadow: `0 0 20px rgba(${accentRgb()}, 0.35), 0 0 40px rgba(${accentRgb()}, 0.15)`,
                }}
              >
                {score}
              </div>
              <div className="mt-4 whitespace-nowrap" style={{ fontSize: 'clamp(10px, 2.4vw, 13px)', letterSpacing: '0.22em', color: col('fg') }}>
                {(gameRef.current.distance / 1000).toFixed(2)} KM &nbsp;·&nbsp; {gameRef.current.speed.toFixed(2)}×
              </div>
              <div className="mt-3 whitespace-nowrap" style={{ fontSize: 'clamp(9px, 2.2vw, 11px)', letterSpacing: '0.22em', color: col('dim') }}>
                {isTouchLayout ? 'Tap to restart' : 'R · Enter · Space to restart'}
                <span className="ml-1 animate-pulse" style={{ color: col('fg') }}>_</span>
              </div>
            </div>
          </>
        )}

        {/* Mobile steering slider */}
        {isTouchLayout && (
          <div
            ref={steerRef}
            className="fixed bottom-[26px] left-0 right-0 h-14 z-[55]"
            style={{ touchAction: 'none', userSelect: 'none' }}
            onTouchStart={onSteerTouchStart}
            onTouchMove={onSteerTouchMove}
            onTouchEnd={onSteerTouchEnd}
            onTouchCancel={onSteerTouchEnd}
            onMouseDown={onSteerMouseDown}
          >
            <div
              className="absolute left-[8%] right-[8%] top-1/2 h-[2px] -translate-y-1/2"
              style={{ background: col('ghost') }}
            >
              <div
                className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-px h-[6px]"
                style={{ background: col('dim') }}
              />
            </div>
            <div
              ref={steerKnobRef}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-[54px] h-[26px] pointer-events-none"
              style={{
                left: '50%',
                border: `1px solid ${col('fg')}`,
                background: 'rgba(0,0,0,0.5)',
                boxShadow: `0 0 10px rgba(${accentRgb()}, 0.4)`,
                transition: 'left .08s linear',
              }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 text-[9px] tracking-[0.28em] uppercase whitespace-nowrap"
              style={{ bottom: -14, color: col('dim') }}
            >
              drag to steer
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
