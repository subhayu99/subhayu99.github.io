import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAccentRgb } from '../../config/gui-theme.config';
import * as audio from '../../lib/audio';

interface RacerGameProps {
  active: boolean;
  onClose: () => void;
}

const LS_KEY = 'racer-high-score';
const SENS_KEY = 'racer-sensitivity';

// 5-step sensitivity scale for L/R key steering. Affects input acceleration
// AND max lateral velocity — so higher sens means the ship reaches a steeper
// lean faster AND tops out at a wider lane-change range.
const SENS_MULTIPLIERS = [0.6, 0.8, 1.0, 1.3, 1.7];
const SENS_LABELS      = ['very slow', 'slow', 'normal', 'fast', 'very fast'];
const DEFAULT_SENS_LEVEL = 2;

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
  const [lives, setLives] = useState(3);
  /**
   * Index of the bar that was JUST lost. On transition from 3→2 lives this
   * becomes 2 (the bar that vanished); cleared after ~900ms. Renders the bar
   * with a bright flash + size pulse so the loss is visually obvious without
   * any on-road text to read. Works identically on desktop and mobile.
   */
  const [lostBarIndex, setLostBarIndex] = useState<number | null>(null);
  const lostBarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sensitivity — user-tunable multiplier for keyboard L/R steering response.
  // Stored per device. Kept out of gameRef so the React UI re-renders on change.
  const [sensLevel, setSensLevelState] = useState<number>(() => {
    const stored = localStorage.getItem(SENS_KEY);
    const n = stored == null ? DEFAULT_SENS_LEVEL : parseInt(stored, 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(4, n)) : DEFAULT_SENS_LEVEL;
  });
  // Ref mirror so the RAF loop reads the latest value without rebinding listeners.
  const sensRef = useRef(SENS_MULTIPLIERS[sensLevel]);
  useEffect(() => {
    sensRef.current = SENS_MULTIPLIERS[sensLevel];
    localStorage.setItem(SENS_KEY, String(sensLevel));
  }, [sensLevel]);

  // Cleanup the bar-flash timer on unmount so it doesn't fire after the game closes.
  useEffect(() => () => {
    if (lostBarTimerRef.current) clearTimeout(lostBarTimerRef.current);
  }, []);

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
      /** Seconds remaining on the brief hit-flash render (bright stroke + scale pulse). */
      hitT?: number;
    }>,
    /** Bright sparks radiating from the obstacle on collision. Live ~0.6s. */
    hitParticles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number }>,
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
    audio.stopEngine();
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

    // ---------- canvas swipe-anywhere steering ----------
    // Entire canvas is a steering surface: tap anywhere to set lane, drag to update.
    // Replaces the previous bottom-slider (which felt glitchy and restricted). The
    // finger's absolute X on screen maps to game.x on the road [0.14, 0.86].
    const applySteerFromScreenX = (clientX: number) => {
      const frac = Math.max(0, Math.min(1, clientX / window.innerWidth));
      g.x = 0.14 + frac * (0.86 - 0.14);
      g.vx = 0;
    };
    const onCanvasTouchStart = (e: TouchEvent) => {
      if (g.over) { restart(); return; }
      firstInput();
      g.steerActive = true;
      if (e.touches[0]) applySteerFromScreenX(e.touches[0].clientX);
    };
    const onCanvasTouchMove = (e: TouchEvent) => {
      if (!g.steerActive || g.over || !e.touches[0]) return;
      e.preventDefault();
      applySteerFromScreenX(e.touches[0].clientX);
    };
    const onCanvasTouchEnd = () => { g.steerActive = false; };
    canvas.addEventListener('touchstart', onCanvasTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
    canvas.addEventListener('touchend', onCanvasTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', onCanvasTouchEnd, { passive: true });

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
      canvas.removeEventListener('touchmove', onCanvasTouchMove);
      canvas.removeEventListener('touchend', onCanvasTouchEnd);
      canvas.removeEventListener('touchcancel', onCanvasTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // ============================================================================
  // Game logic (all defined inside the component so they share game state refs)
  // ============================================================================
  function firstInput() {
    const g = gameRef.current;
    const wasDemo = g.demo;
    if (g.demo) g.demo = false;
    if (!started) setStarted(true);
    // Transitioning from demo → live play: fire the "go" chime and start
    // the engine rumble. Engine pitch follows game.speed every frame.
    if (wasDemo) {
      audio.unlock();
      audio.playStart();
      audio.startEngine();
    }
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
    g.hitParticles.length = 0;
    g.falling = false;
    g.fallTime = 0;
    g.demo = keepDemo;
    g.running = true;
    g.flash = 0;
    g.lastBuildingDistance = 0;
    buildingsRef.current.initialized = false;
    setScore(0);
    // Sync HUD state immediately so there's no one-frame stale flash from the
    // life that was just lost when we died.
    setLives(3);
    setLostBarIndex(null);
    if (lostBarTimerRef.current) {
      clearTimeout(lostBarTimerRef.current);
      lostBarTimerRef.current = null;
    }
    setOverlayKind('start');
  }

  function restart() {
    resetGame(false);
    setStarted(true);
    setOverlayKind('start');
    // Engine was stopped on gameOver. Since restart is called from a user
    // gesture (R key / tap overlay), this is a valid point to resume audio
    // and re-spark the engine rumble + "go" chime.
    audio.unlock();
    audio.playStart();
    audio.startEngine();
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
      // Sensitivity scales both the input acceleration and the max vx clamp,
      // so higher sens = faster response AND wider lateral range at full input.
      const sens = sensRef.current;
      const accel = 4.5 * sens;
      const vxMax = 1.4 * sens;
      if (g.input.left) g.vx -= accel * dt;
      if (g.input.right) g.vx += accel * dt;
      if (!g.input.left && !g.input.right) g.vx *= Math.pow(0.0001, dt);
      g.vx = Math.max(-vxMax, Math.min(vxMax, g.vx));
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
          // Distinct plunging whoosh — fires INSTANTLY so the audio cue
          // matches the visual the moment the ship leaves the road.
          audio.playFallOff();
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
        // No playLifeLost() here — the playFallOff() at fall-start already
        // told the user "life lost". Playing another "uh-oh" on top of it
        // caused the lagging double-sound the user didn't want.
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
      // Decay the hit-flash so the bright stroke fades after ~0.4s.
      if (o.hitT && o.hitT > 0) o.hitT = Math.max(0, o.hitT - dt);
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
          o.hitT = 0.6; // longer, more visible flash on the obstacle
          // Sparks from the hit point so collision reads dramatic
          spawnHitSparks();
          audio.playCollision();
          if (!g.demo) {
            g.lives--;
            g.flash = 1;
            audio.playLifeLost();
            if (g.lives <= 0) gameOver();
          } else g.flash = 1;
        }
      } else if (o.z >= 1.05 && !o.passed) {
        o.passed = true;
        if (o.type === 'block') g.score += 5;
      }
    }
    g.obstacles = g.obstacles.filter(o => o.z < 1.25);

    // Update hit sparks — basic particle system with slight gravity.
    for (const p of g.hitParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 240 * dt; // gravity
      p.life -= dt;
    }
    g.hitParticles = g.hitParticles.filter(p => p.life > 0);
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
    // Ship tilt during demo. Instead of deriving vx from the raw position
    // delta (which was spiky — demo moves in bursts, so vx pegged ±1.4 one
    // frame and back to 0 the next), compute a smoothed "intent velocity"
    // from the direction toward the target and lerp toward it. Settles
    // cleanly, no jitter.
    const diff = target - g.x;
    const desiredVx = Math.max(-1.0, Math.min(1.0, diff * 4));
    g.vx += (desiredVx - g.vx) * Math.min(1, dt * 8);
    g.x += diff * Math.min(1, dt * 3);
  }

  /**
   * Spawn ~12 bright sparks from the player's screen position. Fly outward
   * with radial velocity + slight upward bias, fall under gravity, fade out.
   */
  function spawnHitSparks() {
    const g = gameRef.current;
    const { W, H } = g.dims;
    if (!W || !H) return;
    // Reuse player-screen-X math (same as the life-lost marker spawn).
    const bottomInset = W * 0.08;
    const vx = W / 2;
    const speedFracFOV = Math.max(0, Math.min(1, (g.speed - 1) / 1.6));
    const horizon = H * 0.16;
    const wob = Math.sin(g.t * 18) * 0.4 * (g.speed - 1);
    const horizonLift = Math.min(H * 0.07, 56) + speedFracFOV * 14;
    const vanishY = (horizon + wob) - horizonLift;
    const perspDenom = H - vanishY;
    const p1 = (H - vanishY) / perspDenom;
    const eL = vx + (bottomInset - vx) * p1;
    const eR = vx + ((W - bottomInset) - vx) * p1;
    const sx = eL + (eR - eL) * g.x;
    const sy = (isTouchLayout ? H - 170 : H - 100);
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 90 + Math.random() * 180;
      g.hitParticles.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60, // slight upward bias
        life: 0.55 + Math.random() * 0.25,
      });
    }
  }

  function gameOver() {
    const g = gameRef.current;
    g.over = true;
    audio.stopEngine();
    audio.playGameOver();
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

    // Hit sparks — bright quick flecks flying from the impact point.
    // White for visual impact, alpha fades with remaining life.
    if (g.hitParticles.length > 0) {
      for (const p of g.hitParticles) {
        const alpha = Math.max(0, Math.min(1, p.life / 0.6));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    }
  }

  function drawObstacle(
    ctx: CanvasRenderingContext2D,
    o: { type: string; rot: number; spin: number; flyPhase?: number; hitT?: number },
    cx: number, y: number, size: number, scale: number,
  ) {
    // Hit flash — right after collision, override strokes to bright white and
    // boost line weight so the obstacle visibly "reacts". Fades in 0.4s.
    const hitAmt = o.hitT ?? 0;
    const hitFlash = hitAmt > 0;
    const fg = hitFlash ? '#fff' : col('fg');
    const dim = hitFlash ? '#fff' : col('dim');
    const ghost = hitFlash ? col('fg') : col('ghost');
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
    // Engine pitch tracks current game speed so the rumble builds as you accelerate.
    if (!g.demo && !g.over) audio.setEnginePitch(g.speed);
    // HUD updates
    setScore(g.score);
    // Only set state when value actually changes — avoids pointless re-renders.
    if (g.lives !== lives) {
      if (g.lives < lives) {
        // A life just dropped — flash the bar that disappeared (index = new lives count).
        setLostBarIndex(g.lives);
        if (lostBarTimerRef.current) clearTimeout(lostBarTimerRef.current);
        lostBarTimerRef.current = setTimeout(() => setLostBarIndex(null), 900);
      } else if (g.lives > lives) {
        // Lives replenished (restart). Clear any pending flash.
        setLostBarIndex(null);
        if (lostBarTimerRef.current) clearTimeout(lostBarTimerRef.current);
      }
      setLives(g.lives);
    }
    setSpeedDisplay((g.distance / 1000).toFixed(2) + ' KM');
    const speedFrac = Math.min(1, Math.max(0, (g.speed - 0.7) / 1.6));
    const dotFreq = 2 + speedFrac * 9;
    const idx = Math.floor((g.t * dotFreq) % 7);
    setLitDot(idx);
    rafRef.current = requestAnimationFrame(tick);
  }

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
        {/* Lives — three bars. A separate flash overlay mounts/unmounts via
            AnimatePresence when a life is lost, so the flash always starts
            fresh and never clashes with the filled/empty state transition.
            Bars are bumped to 22×4px so the flash is clearly visible. */}
        <div className="fixed top-10 left-4 flex items-center gap-2 text-[10px] tracking-[0.28em] uppercase pointer-events-none z-10" style={{ color: col('dim') }}>
          <span>lives</span>
          {[0, 1, 2].map(i => {
            const filled = i < lives;
            return (
              <span
                key={i}
                className="relative inline-block"
                style={{ width: 22, height: 4 }}
              >
                {/* Base bar — always rendered, just filled vs empty state. */}
                <span
                  className="absolute inset-0 block transition-colors duration-200"
                  style={{
                    background: filled ? col('fg') : col('ghost'),
                    opacity: filled ? 1 : 0.4,
                    boxShadow: filled ? `0 0 4px rgba(${accentRgb()}, 0.5)` : 'none',
                  }}
                />
                {/* Flash overlay — appears ONLY for the bar that just got lost.
                    Mounts → plays once → unmounts cleanly. No initial-value
                    glitches, no keyframe quirks on first life loss. */}
                <AnimatePresence>
                  {lostBarIndex === i && (
                    <motion.span
                      key="flash"
                      className="absolute block pointer-events-none"
                      initial={{
                        opacity: 1,
                        scaleY: 3.5,
                        scaleX: 1.3,
                        backgroundColor: '#ffffff',
                      }}
                      animate={{
                        opacity: 0,
                        scaleY: 1,
                        scaleX: 1,
                        backgroundColor: `rgb(${accentRgb()})`,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        inset: 0,
                        transformOrigin: 'center',
                        boxShadow: `0 0 16px rgba(${accentRgb()}, 1), 0 0 28px rgba(255, 255, 255, 0.6)`,
                      }}
                    />
                  )}
                </AnimatePresence>
              </span>
            );
          })}
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
          className="fixed z-[70] text-[16px] leading-none hover:opacity-80 transition-opacity"
          style={{ color: col('dim'), bottom: 16, right: 16, padding: '6px 10px' }}
          aria-label="Close (ESC)"
          title="Close (ESC)"
        >
          ✕
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

            {/* Sensitivity slider — desktop only (touch uses swipe-anywhere). */}
            {!isTouchLayout && (
              <div className="mt-5 pointer-events-auto">
                <div className="text-[9px] tracking-[0.28em] uppercase mb-2" style={{ color: col('dim') }}>
                  L/R sensitivity
                </div>
                <div className="flex gap-3 justify-center">
                  {[0, 1, 2, 3, 4].map(i => {
                    const active = sensLevel === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSensLevelState(i)}
                        className="w-5 h-5 flex items-center justify-center hover:opacity-100 transition-opacity"
                        aria-label={`Sensitivity ${SENS_LABELS[i]}`}
                        title={SENS_LABELS[i]}
                      >
                        <span
                          className="rounded-full transition-all"
                          style={{
                            width: active ? 8 : 5,
                            height: active ? 8 : 5,
                            background: active ? col('fg') : col('ghost'),
                            boxShadow: active
                              ? `0 0 8px rgba(${accentRgb()}, 0.6)`
                              : 'none',
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="text-[8px] tracking-[0.22em] uppercase mt-2 opacity-70" style={{ color: col('dim') }}>
                  {SENS_LABELS[sensLevel]}
                </div>
              </div>
            )}
          </div>
        )}
        {overlayKind === 'over' && (
          <>
            <div
              className="fixed inset-0 z-20 bg-black/70 backdrop-blur-[6px]"
              onClick={() => { if (gameRef.current.over) restart(); }}
              onTouchStart={(e) => { if (gameRef.current.over) { e.preventDefault(); restart(); } }}
            />
            <div
              className="fixed inset-0 z-30 flex flex-col items-center justify-center text-center select-none px-5"
              onClick={() => { if (gameRef.current.over) restart(); }}
              onTouchStart={(e) => { if (gameRef.current.over) { e.preventDefault(); restart(); } }}
            >
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

        {/* Mobile hint — whole canvas is a steering surface now; slider removed. */}
        {isTouchLayout && started && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.28em] uppercase whitespace-nowrap pointer-events-none z-[55]"
            style={{ color: col('dim') }}
          >
            tap + drag anywhere to steer
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
