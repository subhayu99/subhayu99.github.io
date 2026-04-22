import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccentRgb } from '../../config/gui-theme.config';

// ── Lattice ──────────────────────────────────────────────────────
const WARP_RADIUS = 150;
const WARP_STRENGTH = 25;

// ── Planet drop (desktop-only physics toy on top of the lattice) ──
const MIN_HOLD_MS = 80;        // shorter holds are just clicks, ignored
const MAX_HOLD_MS = 1800;      // clamp charge duration
const MIN_MASS = 1;
const MAX_MASS = 20;           // wider mass range so heavies clearly dominate lighter ones
const MAX_MERGED_MASS = 500;   // black holes may grow further
const MAX_PLANETS = 40;        // cap to keep O(N²) physics + warp cheap
const G = 22000;               // gravitational constant — tuned for visible orbits
const CURSOR_MASS = 5;         // cursor acts as a medium gravity well
const SOFT = 50;               // softening length — prevents r=0 singularity
const DAMPING = 0.9993;        // near-lossless so orbits persist
const MAX_SPEED = 380;         // px/s
const RESTITUTION = 0.72;      // wall-bounce energy retained
const MAX_WARP_DISPLACEMENT = 160;
const VEL_WINDOW_MS = 120;     // flick velocity sample window
const AUTO_ORBIT_FRAC = 0.85;  // tangential kick as fraction of circular v
const FLICK_BLEND_MIN = 60;    // below this px/s, ignore flick and use auto-orbit
const RIPPLE_MS = 700;         // merge-flash lifetime

// ── Black hole ───────────────────────────────────────────────
const BH_THRESHOLD = 55;       // mass at which a body becomes a black hole
function isBH(mass: number): boolean { return mass >= BH_THRESHOLD; }
function eventHorizonR(mass: number): number {
  // Scales with sqrt(M-threshold) so growth slows visually at huge masses.
  return 9 + Math.sqrt(Math.max(0, mass - BH_THRESHOLD + 8)) * 2.6;
}

interface Planet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
}

export default function WireframeGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [planetCount, setPlanetCount] = useState(0);
  const [bhMode, setBhMode] = useState(false);
  const [bhPos, setBhPos] = useState<{ x: number; y: number } | null>(null);
  const clearPlanetsRef = useRef<(() => void) | null>(null);
  const bhModeRef = useRef(false);
  bhModeRef.current = bhMode;

  // Drive the engulf animation + block site-wide gestures from the document root.
  useEffect(() => {
    const body = document.body;
    if (bhMode && bhPos) {
      body.style.setProperty('--bh-x', `${bhPos.x}px`);
      body.style.setProperty('--bh-y', `${bhPos.y}px`);
      body.setAttribute('data-bh-active', 'true');

      // Per-element spaghettification: every visible leaf element computes its
      // own radial trajectory toward the singularity — stretch into a streak
      // aligned with its angle to the BH, translate there, fade out.
      const engulfable = document.querySelector<HTMLElement>('[data-engulfable]');
      const items: HTMLElement[] = [];
      if (engulfable) {
        engulfable
          .querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, p, img, svg, a, button, [data-stat-card], li, pre, code')
          .forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) items.push(el);
          });
      }

      const maxDist = Math.hypot(window.innerWidth, window.innerHeight);
      const running: Animation[] = [];
      // Spinning black hole drags matter in along a spiral rather than a
      // straight line. Total rotation during fall ~1.1 revolutions — strong
      // enough to read as a spiral without spinning so fast it looks silly.
      const TOTAL_SPIRAL_RAD = Math.PI * 2.2;

      items.forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dxBH = bhPos.x - cx;
        const dyBH = bhPos.y - cy;
        const r0 = Math.hypot(dxBH, dyBH);
        if (r0 < 0.5) return; // element already at the singularity
        const alpha0 = Math.atan2(-dyBH, -dxBH); // angle from BH to element
        const normDist = Math.min(1, r0 / maxDist);
        const delay = normDist * 260;
        const dur = 1300 + normDist * 700;

        // Position on the inspiral at normalised progress t ∈ [0, 1]:
        //   α(t) = α₀ + spiral · t   (rotates as it falls)
        //   r(t) = r₀ · (1 - t)       (closes to zero at the singularity)
        // Element rotation (rot) aligns its local X axis with the current
        // radial direction (element → BH) so the scaleX stretch reads as
        // spaghettification along the pull direction.
        const sample = (t: number) => {
          const alpha = alpha0 + TOTAL_SPIRAL_RAD * t;
          const rad = r0 * (1 - t);
          const px = bhPos.x + rad * Math.cos(alpha);
          const py = bhPos.y + rad * Math.sin(alpha);
          const rot = ((alpha + Math.PI) * 180) / Math.PI;
          return { tx: px - cx, ty: py - cy, rot };
        };

        const k1 = sample(0.22);
        const k2 = sample(0.5);
        const k3 = sample(0.78);
        const k4 = sample(1);

        el.style.willChange = 'transform, opacity, filter';
        el.style.transformOrigin = 'center';
        el.dataset.engulfItem = 'true';

        const anim = el.animate(
          [
            {
              transform: 'none',
              opacity: 1,
              filter: 'none',
            },
            {
              transform: `translate(${k1.tx}px, ${k1.ty}px) rotate(${k1.rot}deg) scaleX(1.9) scaleY(0.3)`,
              opacity: 0.92,
              filter: 'blur(1px) contrast(1.08)',
              offset: 0.22,
            },
            {
              transform: `translate(${k2.tx}px, ${k2.ty}px) rotate(${k2.rot}deg) scaleX(2.6) scaleY(0.14)`,
              opacity: 0.7,
              filter: 'blur(2.5px)',
              offset: 0.5,
            },
            {
              transform: `translate(${k3.tx}px, ${k3.ty}px) rotate(${k3.rot}deg) scaleX(1.3) scaleY(0.05)`,
              opacity: 0.3,
              filter: 'blur(5px)',
              offset: 0.78,
            },
            {
              transform: `translate(${k4.tx}px, ${k4.ty}px) rotate(${k4.rot}deg) scale(0)`,
              opacity: 0,
              filter: 'blur(10px)',
            },
          ],
          {
            duration: dur,
            delay,
            fill: 'forwards',
            easing: 'cubic-bezier(0.55, 0, 0.9, 0.15)',
          },
        );
        running.push(anim);
      });

      return () => {
        body.removeAttribute('data-bh-active');
        body.style.removeProperty('--bh-x');
        body.style.removeProperty('--bh-y');
        // Curtain fades out over ~700ms; cancelling animations and resetting
        // inline styles now means the restored page is already settled when
        // the curtain reveals it.
        running.forEach((a) => a.cancel());
        items.forEach((el) => {
          el.style.transform = '';
          el.style.opacity = '';
          el.style.filter = '';
          el.style.transformOrigin = '';
          el.style.willChange = '';
          delete el.dataset.engulfItem;
        });
      };
    }
  }, [bhMode, bhPos]);

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
    let lastFrameTime = performance.now();
    const planets: Planet[] = [];
    let charge: { startedAt: number; x: number; y: number } | null = null;
    const velSamples: Array<{ t: number; x: number; y: number }> = [];
    const ripples: Array<{ x: number; y: number; bornAt: number; maxR: number }> = [];

    clearPlanetsRef.current = () => {
      planets.length = 0;
      ripples.length = 0;
      setPlanetCount(0);
      needsRedraw = true;
    };

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const p of planets) {
        const r = 4 + Math.sqrt(p.mass) * 4;
        if (p.x < r) p.x = r; else if (p.x > w - r) p.x = w - r;
        if (p.y < r) p.y = r; else if (p.y > h - r) p.y = h - r;
      }
      needsRedraw = true;
    }

    // Precomputed per-frame so warpPoint can skip arithmetic for every grid sample
    const planetWarp: Array<{ x: number; y: number; r: number; r2: number; s: number }> = [];
    const WARP_RADIUS_SQ = WARP_RADIUS * WARP_RADIUS;
    function rebuildPlanetWarp() {
      planetWarp.length = 0;
      for (let i = 0; i < planets.length; i++) {
        const p = planets[i];
        let r: number;
        let s: number;
        if (isBH(p.mass)) {
          // Black hole warp reaches far but falls off naturally with distance.
          r = 200 + (p.mass - BH_THRESHOLD) * 7;
          s = 48 + (p.mass - BH_THRESHOLD) * 0.55;
        } else {
          r = 100 + p.mass * 26;
          s = 22 + p.mass * 4.5;
        }
        planetWarp.push({ x: p.x, y: p.y, r, r2: r * r, s });
      }
    }

    function warpPoint(x: number, y: number): [number, number] {
      let dx = 0;
      let dy = 0;

      const cdx = x - mouseX;
      const cdy = y - mouseY;
      const cd2 = cdx * cdx + cdy * cdy;
      if (cd2 < WARP_RADIUS_SQ && cd2 > 1) {
        const cdist = Math.sqrt(cd2);
        const f = (1 - cdist / WARP_RADIUS) * WARP_STRENGTH;
        dx += (cdx / cdist) * f;
        dy += (cdy / cdist) * f;
      }

      for (let i = 0; i < planetWarp.length; i++) {
        const pw = planetWarp[i];
        const pdx = x - pw.x;
        const pdy = y - pw.y;
        const pd2 = pdx * pdx + pdy * pdy;
        if (pd2 > pw.r2 || pd2 < 1) continue;
        const pdist = Math.sqrt(pd2);
        const f = (1 - pdist / pw.r) * pw.s;
        dx += (pdx / pdist) * f;
        dy += (pdy / pdist) * f;
      }

      const total2 = dx * dx + dy * dy;
      const maxSq = MAX_WARP_DISPLACEMENT * MAX_WARP_DISPLACEMENT;
      if (total2 > maxSq) {
        const total = Math.sqrt(total2);
        dx = (dx / total) * MAX_WARP_DISPLACEMENT;
        dy = (dy / total) * MAX_WARP_DISPLACEMENT;
      }
      return [x + dx, y + dy];
    }

    function mergeRadius(mass: number): number {
      // Black holes have a generous capture radius (Schwarzschild-ish).
      // Normal bodies only merge on actual core contact — so smalls
      // orbit around heavies many times instead of snap-merging at range.
      if (isBH(mass)) return eventHorizonR(mass) * 1.6;
      return 1.8 + Math.sqrt(mass) * 0.7;
    }

    function resolveCollisions() {
      if (planets.length < 2) return false;
      const removed = new Set<number>();
      let changed = false;
      let bhJustFormed = false;
      for (let i = 0; i < planets.length; i++) {
        if (removed.has(i)) continue;
        for (let j = i + 1; j < planets.length; j++) {
          if (removed.has(j)) continue;
          const p = planets[i];
          const q = planets[j];
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const d2 = dx * dx + dy * dy;
          const touch = mergeRadius(p.mass) + mergeRadius(q.mass);
          if (d2 > touch * touch) continue;

          const total = p.mass + q.mass;
          const newMass = Math.min(total, MAX_MERGED_MASS);
          const wasBH = isBH(p.mass) || isBH(q.mass);
          // Conserve linear momentum (inelastic collision)
          p.vx = (p.mass * p.vx + q.mass * q.vx) / total;
          p.vy = (p.mass * p.vy + q.mass * q.vy) / total;
          p.x = (p.mass * p.x + q.mass * q.x) / total;
          p.y = (p.mass * p.y + q.mass * q.y) / total;
          p.mass = newMass;
          removed.add(j);
          if (isBH(newMass) && !wasBH) bhJustFormed = true;
          ripples.push({
            x: p.x,
            y: p.y,
            bornAt: performance.now(),
            maxR: 30 + Math.sqrt(q.mass) * 14,
          });
          changed = true;
        }
      }
      if (!changed) return false;
      const kept: Planet[] = [];
      for (let i = 0; i < planets.length; i++) {
        if (!removed.has(i)) kept.push(planets[i]);
      }
      planets.length = 0;
      for (const p of kept) planets.push(p);
      setPlanetCount(planets.length);
      if (bhJustFormed && !bhModeRef.current) {
        const bh = planets.find((pl) => isBH(pl.mass));
        if (bh) setBhPos({ x: bh.x, y: bh.y });
        setBhMode(true);
      }
      return true;
    }

    function stepPhysics(dt: number) {
      for (let i = 0; i < planets.length; i++) {
        const p = planets[i];
        let ax = 0;
        let ay = 0;

        const cdx = mouseX - p.x;
        const cdy = mouseY - p.y;
        const cr2 = cdx * cdx + cdy * cdy + SOFT * SOFT;
        const cr = Math.sqrt(cr2);
        const cf = (G * CURSOR_MASS) / cr2;
        ax += (cf * cdx) / cr;
        ay += (cf * cdy) / cr;

        for (let j = 0; j < planets.length; j++) {
          if (i === j) continue;
          const q = planets[j];
          const qdx = q.x - p.x;
          const qdy = q.y - p.y;
          const qr2 = qdx * qdx + qdy * qdy + SOFT * SOFT;
          const qr = Math.sqrt(qr2);
          const qf = (G * q.mass) / qr2;
          ax += (qf * qdx) / qr;
          ay += (qf * qdy) / qr;
        }

        p.vx = (p.vx + ax * dt) * DAMPING;
        p.vy = (p.vy + ay * dt) * DAMPING;

        const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (sp > MAX_SPEED) {
          p.vx = (p.vx / sp) * MAX_SPEED;
          p.vy = (p.vy / sp) * MAX_SPEED;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const radius = 4 + Math.sqrt(p.mass) * 4;
        if (p.x < radius) { p.x = radius; p.vx = -p.vx * RESTITUTION; }
        else if (p.x > w - radius) { p.x = w - radius; p.vx = -p.vx * RESTITUTION; }
        if (p.y < radius) { p.y = radius; p.vy = -p.vy * RESTITUTION; }
        else if (p.y > h - radius) { p.y = h - radius; p.vy = -p.vy * RESTITUTION; }
      }
    }

    function drawBlackHole(p: Planet, r: number, g: number, b: number) {
      const eh = eventHorizonR(p.mass);
      // Pulsing accretion for a subtle "alive" feel
      const pulse = 0.55 + Math.sin(performance.now() / 520) * 0.12;

      // Outer lensing glow — falls off well beyond the EH
      const outer = ctx!.createRadialGradient(p.x, p.y, eh, p.x, p.y, eh * 5.5);
      outer.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.42 * pulse})`);
      outer.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, ${0.18 * pulse})`);
      outer.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx!.fillStyle = outer;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, eh * 5.5, 0, Math.PI * 2);
      ctx!.fill();

      // Accretion disk hotspot right outside the event horizon
      const inner = ctx!.createRadialGradient(p.x, p.y, eh * 0.95, p.x, p.y, eh * 1.9);
      inner.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.9 * pulse})`);
      inner.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${0.45 * pulse})`);
      inner.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx!.fillStyle = inner;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, eh * 1.9, 0, Math.PI * 2);
      ctx!.fill();

      // Event horizon — pure black disc (swallows accretion glow underneath)
      ctx!.fillStyle = '#000';
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, eh, 0, Math.PI * 2);
      ctx!.fill();

      // Crisp EH edge — the "photon ring"
      ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.95)`;
      ctx!.lineWidth = 1.1;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, eh, 0, Math.PI * 2);
      ctx!.stroke();
    }

    function drawPlanets(r: number, g: number, b: number) {
      if (planets.length === 0) return;
      for (const p of planets) {
        if (isBH(p.mass)) {
          drawBlackHole(p, r, g, b);
          continue;
        }
        const m = Math.sqrt(p.mass);
        const halo = 11 + m * 7;
        const core = 1.2 + m * 1.0;

        const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, halo);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.22)`);
        grad.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.08)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, halo, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, core, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function drawRipples(r: number, g: number, b: number) {
      if (ripples.length === 0) return;
      const now = performance.now();
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        const age = now - rp.bornAt;
        if (age >= RIPPLE_MS) {
          ripples.splice(i, 1);
          continue;
        }
        const t = age / RIPPLE_MS;
        const eased = 1 - Math.pow(1 - t, 2);
        const radius = rp.maxR * eased;
        const alpha = (1 - t) * 0.55;
        ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(rp.x, rp.y, radius, 0, Math.PI * 2);
        ctx!.stroke();
      }
    }

    function drawChargeIndicator(r: number, g: number, b: number) {
      if (!charge) return;
      const held = performance.now() - charge.startedAt;
      const t = Math.min(1, Math.max(0, (held - MIN_HOLD_MS) / (MAX_HOLD_MS - MIN_HOLD_MS)));
      const radius = 5 + t * 28;

      ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.35 + 0.35 * t})`;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.arc(charge.x, charge.y, radius, 0, Math.PI * 2);
      ctx!.stroke();

      ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
      ctx!.beginPath();
      ctx!.arc(charge.x, charge.y, 1.2, 0, Math.PI * 2);
      ctx!.fill();
    }

    function draw() {
      rafId = requestAnimationFrame(draw);
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      const alive = planets.length > 0 || !!charge || ripples.length > 0;
      if (!needsRedraw && !alive) return;
      needsRedraw = false;

      if (planets.length > 0) {
        stepPhysics(dt);
        resolveCollisions();
      }
      rebuildPlanetWarp();

      const [r, g, b] = getAccentRgb();
      ctx!.clearRect(0, 0, w, h);

      const vanishX = w / 2;
      const vanishY = h * 0.3 - (scrollY % h) * 0.08;
      const horizonY = vanishY;
      // BH mode is framed against a full-black curtain, so the lattice can
      // afford to read more clearly without fighting any UI behind it.
      const baseOpacity = bhModeRef.current ? 0.075 : 0.018;

      const numHorizontal = 30;
      for (let i = 0; i <= numHorizontal; i++) {
        const t = i / numHorizontal;
        const perspT = t * t;
        const y = horizonY + perspT * (h - horizonY + 200);

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

      const numVertical = 24;
      for (let i = 0; i <= numVertical; i++) {
        const t = (i / numVertical - 0.5) * 2;
        const bottomX = vanishX + t * w * 0.8;
        const topX = vanishX + t * w * 0.05;

        const opacity = baseOpacity * (1 - Math.abs(t) * 0.3);
        if (opacity < 0.002) continue;

        ctx!.beginPath();
        const segments = 30;
        for (let s = 0; s <= segments; s++) {
          const st = s / segments;
          const x = topX + (bottomX - topX) * st * st;
          const y = horizonY + st * st * (h - horizonY + 200);
          const [wx, wy] = warpPoint(x, y);
          if (s === 0) ctx!.moveTo(wx, wy);
          else ctx!.lineTo(wx, wy);
        }
        ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx!.lineWidth = 0.5;
        ctx!.stroke();
      }

      drawPlanets(r, g, b);
      drawRipples(r, g, b);
      drawChargeIndicator(r, g, b);
    }

    function isInteractiveTarget(t: EventTarget | null): boolean {
      // In black-hole mode the entire viewport is a playground.
      if (bhModeRef.current) return false;
      if (!(t instanceof Element)) return false;
      return !!t.closest('a, button, input, textarea, select, [role="button"], [contenteditable], [data-stat-card]');
    }

    function recordVel(t: number, x: number, y: number) {
      velSamples.push({ t, x, y });
      while (velSamples.length > 0 && t - velSamples[0].t > VEL_WINDOW_MS) velSamples.shift();
    }

    function getFlickVel(): { vx: number; vy: number } {
      if (velSamples.length < 2) return { vx: 0, vy: 0 };
      const a = velSamples[0];
      const b = velSamples[velSamples.length - 1];
      const dt = (b.t - a.t) / 1000;
      if (dt < 0.01) return { vx: 0, vy: 0 };
      return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt };
    }

    function computeDropVelocity(x: number, y: number): { vx: number; vy: number } {
      // Pick the dominant attractor (most acceleration contribution at the drop point)
      // and apply a tangential kick for circular-ish orbit.
      let bestAttr = { x: mouseX, y: mouseY, mass: CURSOR_MASS, a: 0 };
      const evalAttractor = (ax: number, ay: number, am: number) => {
        const dx = ax - x;
        const dy = ay - y;
        const r2 = dx * dx + dy * dy + SOFT * SOFT;
        const a = (G * am) / r2;
        if (a > bestAttr.a) bestAttr = { x: ax, y: ay, mass: am, a };
      };
      evalAttractor(mouseX, mouseY, CURSOR_MASS);
      for (const p of planets) evalAttractor(p.x, p.y, p.mass);

      const dx = x - bestAttr.x;
      const dy = y - bestAttr.y;
      const len = Math.hypot(dx, dy);
      const flick = getFlickVel();
      const flickMag = Math.hypot(flick.vx, flick.vy);

      // Dropped nearly on top of an existing body.
      // If the cursor is moving fast (a deliberate throw), respect the flick.
      // Otherwise drop at rest so the user can cleanly stack/merge.
      if (len < mergeRadius(bestAttr.mass) * 3.5) {
        if (flickMag > FLICK_BLEND_MIN) {
          return { vx: flick.vx * 0.9, vy: flick.vy * 0.9 };
        }
        return { vx: 0, vy: 0 };
      }
      const invLen = 1 / len;
      // Perpendicular (CCW) unit vector
      const tx = -dy * invLen;
      const ty = dx * invLen;
      const rEff = Math.sqrt(len * len + SOFT * SOFT);
      const vCircular = Math.sqrt((G * bestAttr.mass) / rEff);
      let vx = tx * vCircular * AUTO_ORBIT_FRAC;
      let vy = ty * vCircular * AUTO_ORBIT_FRAC;

      // Mouse flick dominates if user actively threw the planet
      if (flickMag > FLICK_BLEND_MIN) {
        const blend = Math.min(1, (flickMag - FLICK_BLEND_MIN) / 240);
        vx = vx * (1 - blend) + flick.vx * 0.9 * blend;
        vy = vy * (1 - blend) + flick.vy * 0.9 * blend;
      }
      return { vx, vy };
    }

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      recordVel(performance.now(), mouseX, mouseY);
      if (charge) {
        charge.x = mouseX;
        charge.y = mouseY;
      }
      needsRedraw = true;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (isInteractiveTarget(e.target)) return;
      if (planets.length >= MAX_PLANETS) return;
      charge = { startedAt: performance.now(), x: e.clientX, y: e.clientY };
      velSamples.length = 0;
      recordVel(performance.now(), e.clientX, e.clientY);
      needsRedraw = true;
    };

    const onMouseUp = () => {
      if (!charge) return;
      const held = performance.now() - charge.startedAt;
      if (held >= MIN_HOLD_MS && planets.length < MAX_PLANETS) {
        const clamped = Math.min(MAX_HOLD_MS, held);
        const norm = (clamped - MIN_HOLD_MS) / (MAX_HOLD_MS - MIN_HOLD_MS);
        const mass = MIN_MASS + (MAX_MASS - MIN_MASS) * norm;
        const { vx, vy } = computeDropVelocity(charge.x, charge.y);
        planets.push({ x: charge.x, y: charge.y, vx, vy, mass });
        setPlanetCount(planets.length);
      }
      charge = null;
      needsRedraw = true;
    };

    const onDocMouseLeave = () => {
      charge = null;
      needsRedraw = true;
    };

    const onScroll = () => {
      scrollY = window.scrollY;
      needsRedraw = true;
    };

    resize();
    rafId = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onDocMouseLeave);
    window.addEventListener('scroll', onScroll, { passive: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && bhModeRef.current) {
        planets.length = 0;
        ripples.length = 0;
        charge = null;
        setPlanetCount(0);
        setBhMode(false);
        setBhPos(null);
        needsRedraw = true;
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onDocMouseLeave);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll);
      clearPlanetsRef.current = null;
    };
  }, []);

  const handleClear = useCallback(() => {
    clearPlanetsRef.current?.();
  }, []);

  return (
    <>
      {/* Opaque curtain that hides page content while a black hole holds the stage.
          When active it captures pointer events so clicks and triple-taps on the
          hidden content can't select text or trigger buttons beneath.
          On enter: easing stays near-transparent early so the per-element
          spaghettification is visible against the content, then rapidly opaques. */}
      <div
        className="fixed inset-0 bg-black transition-opacity"
        style={{
          zIndex: 55,
          opacity: bhMode ? 1 : 0,
          transitionDuration: bhMode ? '1500ms' : '700ms',
          transitionTimingFunction: bhMode
            ? 'cubic-bezier(0.9, 0, 0.9, 0.25)'
            : 'ease-out',
          pointerEvents: bhMode ? 'auto' : 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        aria-hidden
      />
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: bhMode ? 56 : 0 }}
        aria-hidden
      />
      {bhMode && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.25em]
                     text-gui-accent/60 uppercase pointer-events-none select-none"
          style={{ zIndex: 57 }}
        >
          press esc to return
        </div>
      )}
      {planetCount > 0 && !bhMode && (
        <button
          onClick={handleClear}
          className="fixed bottom-6 left-6 z-[5] px-3 py-1.5 font-mono text-xs
                     border border-[rgba(var(--gui-accent-rgb),0.4)] text-gui-accent
                     bg-black/60 backdrop-blur-sm
                     hover:bg-[rgba(var(--gui-accent-rgb),0.1)]
                     hover:border-[rgba(var(--gui-accent-rgb),0.7)]
                     transition-colors"
          aria-label={`Clear ${planetCount} dropped planets`}
        >
          × clear planets ({planetCount})
        </button>
      )}
    </>
  );
}
