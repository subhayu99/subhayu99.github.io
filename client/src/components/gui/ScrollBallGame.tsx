import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent, AnimatePresence } from 'framer-motion';

interface PathData {
  progress: number[];
  x: number[];
  y: number[];
}

// Fallback path used before DOM is measured
const FALLBACK_PATH: PathData = {
  progress: [0, 0.5, 1],
  x: [85, 50, 50],
  y: [5, 50, 95],
};

/**
 * Compute waypoints by querying real DOM positions.
 * The ball's X follows actual content gaps; Y maps linearly from scroll progress.
 */
function computePathFromDOM(): PathData | null {
  const vw = window.innerWidth;
  const docH = document.documentElement.scrollHeight;
  if (docH <= window.innerHeight) return null;

  const pts: { pageY: number; x: number }[] = [];

  function add(pageY: number, xPct: number) {
    pts.push({ pageY, x: Math.max(4, Math.min(96, xPct)) });
  }

  // --- Hero: start at top-right ---
  const hero = document.querySelector('section:first-of-type') as HTMLElement | null;
  if (hero) {
    add(hero.offsetTop + hero.offsetHeight * 0.15, 88);
    add(hero.offsetTop + hero.offsetHeight * 0.85, 82);
  }

  // --- About: right of the text block ---
  const about = document.getElementById('about');
  if (about) {
    const content = about.querySelector('.max-w-3xl') as HTMLElement | null;
    if (content) {
      const rect = content.getBoundingClientRect();
      const rightEdge = (rect.right / vw) * 100;
      const gap = Math.min(93, (rightEdge + 98) / 2);
      add(about.offsetTop + about.offsetHeight * 0.3, gap);
      add(about.offsetTop + about.offsetHeight * 0.7, gap - 6);
    }
  }

  // --- Skills: weave between tech category rows ---
  const skills = document.getElementById('skills');
  if (skills) {
    const categories = skills.querySelectorAll('.group');
    categories.forEach((cat, i) => {
      const rect = cat.getBoundingClientRect();
      const catPageY = rect.top + window.scrollY;
      if (i % 2 === 0) {
        // Right side of the pills
        const rightEdge = (rect.right / vw) * 100;
        add(catPageY + rect.height / 2, Math.min(93, rightEdge + 6));
      } else {
        // Left side
        const leftEdge = (rect.left / vw) * 100;
        add(catPageY + rect.height / 2, Math.max(6, leftEdge - 4));
      }
    });
  }

  // --- Experience: follow the timeline, swing right between cards ---
  const experience = document.getElementById('experience');
  if (experience) {
    const wrapper = experience.querySelector('.max-w-3xl') as HTMLElement | null;
    if (wrapper) {
      const cards = wrapper.children;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i] as HTMLElement;
        const rect = card.getBoundingClientRect();
        const cardPageY = rect.top + window.scrollY;
        // Near the timeline line (left edge of the card container)
        const timelineX = Math.max(5, (rect.left / vw) * 100 - 2);
        add(cardPageY + rect.height * 0.4, timelineX);

        // Between this card and the next: swing to right whitespace
        if (i < cards.length - 1) {
          const nextRect = (cards[i + 1] as HTMLElement).getBoundingClientRect();
          const gapPageY = (rect.bottom + nextRect.top) / 2 + window.scrollY;
          const contentRight = (rect.right / vw) * 100;
          add(gapPageY, Math.min(92, (contentRight + 96) / 2));
        }
      }
    }
  }

  // --- Work (professional projects): between grid columns ---
  const work = document.getElementById('work');
  if (work) {
    const grid = work.querySelector('[class*="grid-cols"]') as HTMLElement | null;
    if (grid) {
      const rect = grid.getBoundingClientRect();
      const gridPageY = rect.top + window.scrollY;
      const left = (rect.left / vw) * 100;
      const width = (rect.width / vw) * 100;
      // Weave between the 3 columns
      add(gridPageY + rect.height * 0.2, left + width * 0.34);
      add(gridPageY + rect.height * 0.5, left + width * 0.67);
      add(gridPageY + rect.height * 0.8, left + width * 0.34);
    }
  }

  // --- Projects (open source): sweep across the carousel ---
  const projects = document.getElementById('projects');
  if (projects) {
    add(projects.offsetTop + projects.offsetHeight * 0.3, 22);
    add(projects.offsetTop + projects.offsetHeight * 0.7, 78);
  }

  // --- Education: right of text block ---
  const education = document.getElementById('education');
  if (education) {
    const content = education.querySelector('.max-w-3xl') as HTMLElement | null;
    if (content) {
      const rightEdge = (content.getBoundingClientRect().right / vw) * 100;
      const gap = Math.min(93, (rightEdge + 98) / 2);
      add(education.offsetTop + education.offsetHeight * 0.4, gap);
    }
  }

  // --- Publication: left of text block ---
  const publication = document.getElementById('publication');
  if (publication) {
    const content = publication.querySelector('.max-w-3xl') as HTMLElement | null;
    if (content) {
      const leftEdge = (content.getBoundingClientRect().left / vw) * 100;
      add(publication.offsetTop + publication.offsetHeight * 0.5, Math.max(6, leftEdge - 4));
    }
  }

  // --- Contact: converge to center ---
  const contact = document.getElementById('contact');
  if (contact) {
    add(contact.offsetTop + contact.offsetHeight * 0.5, 50);
  }

  if (pts.length < 3) return null;

  // Sort by page position
  pts.sort((a, b) => a.pageY - b.pageY);

  // Convert pageY to scroll progress (0–1)
  const maxScroll = docH - window.innerHeight;
  const progress = pts.map(p => Math.max(0, Math.min(1, p.pageY / docH)));
  const x = pts.map(p => p.x);
  // Ball Y in viewport: linear from 5% to 95% based on progress
  const y = progress.map(p => 5 + p * 90);

  return { progress, x, y };
}

// --- Particles ---
interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
}
let nextId = 0;

function getPositionAt(path: PathData, progress: number) {
  const { progress: p, x, y } = path;
  let i = 0;
  while (i < p.length - 1 && p[i + 1] < progress) i++;
  if (i >= p.length - 1) return { x: x[x.length - 1], y: y[y.length - 1] };
  const t = (progress - p[i]) / (p[i + 1] - p[i]);
  return {
    x: x[i] + t * (x[i + 1] - x[i]),
    y: y[i] + t * (y[i + 1] - y[i]),
  };
}

export default function ScrollBallGame() {
  const { scrollYProgress } = useScroll();
  const [path, setPath] = useState<PathData>(FALLBACK_PATH);
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [passedCPs, setPassedCPs] = useState<Set<number>>(new Set());
  const [particles, setParticles] = useState<Particle[]>([]);
  const [score, setScore] = useState(0);
  const [pulse, setPulse] = useState(false);
  const pathRef = useRef(path);

  // Dynamically compute checkpoints: evenly spaced across the computed path
  const checkpoints = path.progress.length > 4
    ? [0.2, 0.4, 0.6, 0.8].map(frac => {
        const idx = Math.round(frac * (path.progress.length - 1));
        return path.progress[idx];
      })
    : [0.25, 0.5, 0.75];

  useEffect(() => { pathRef.current = path; }, [path]);

  // Compute path from DOM after mount
  useEffect(() => {
    const compute = () => {
      const dynamicPath = computePathFromDOM();
      if (dynamicPath && dynamicPath.progress.length >= 3) {
        setPath(dynamicPath);
        setPassedCPs(new Set());
        setScore(0);
      }
    };
    // Wait for content to render
    const t1 = setTimeout(compute, 600);
    const t2 = setTimeout(compute, 2000); // retry after data loads
    window.addEventListener('resize', compute);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', compute);
    };
  }, []);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Ball position from path
  const rawX = useTransform(scrollYProgress, path.progress, path.x);
  const rawY = useTransform(scrollYProgress, path.progress, path.y);

  // Spring physics
  const springX = useSpring(rawX, { stiffness: 50, damping: 14, mass: 0.6 });
  const springY = useSpring(rawY, { stiffness: 50, damping: 14, mass: 0.6 });

  // Trailing springs
  const trail1X = useSpring(rawX, { stiffness: 30, damping: 14, mass: 1.0 });
  const trail1Y = useSpring(rawY, { stiffness: 30, damping: 14, mass: 1.0 });
  const trail2X = useSpring(rawX, { stiffness: 18, damping: 14, mass: 1.4 });
  const trail2Y = useSpring(rawY, { stiffness: 18, damping: 14, mass: 1.4 });

  // CSS values
  const left = useTransform(springX, v => `${v}vw`);
  const top = useTransform(springY, v => `${v}vh`);
  const t1Left = useTransform(trail1X, v => `${v}vw`);
  const t1Top = useTransform(trail1Y, v => `${v}vh`);
  const t2Left = useTransform(trail2X, v => `${v}vw`);
  const t2Top = useTransform(trail2Y, v => `${v}vh`);

  // Particle burst
  const burst = useCallback((cx: number, cy: number) => {
    const newParticles: Particle[] = Array.from({ length: 10 }, (_, i) => ({
      id: ++nextId,
      x: cx,
      y: cy,
      angle: (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
      speed: 2 + Math.random() * 3,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setPulse(true);
    setTimeout(() => setPulse(false), 300);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.includes(p)));
    }, 800);
  }, []);

  // Watch scroll for visibility + checkpoints
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setVisible(v > 0.02 && v < 0.99);

    checkpoints.forEach(cp => {
      if (v >= cp - 0.008 && v <= cp + 0.015 && !passedCPs.has(cp)) {
        setPassedCPs(prev => new Set([...prev, cp]));
        setScore(s => s + 1);
        const pos = getPositionAt(pathRef.current, cp);
        burst(pos.x, pos.y);
      }
    });
  });

  if (isMobile) return null;

  return (
    <>
      {/* Trail dot 2 (farthest) */}
      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed z-[2] pointer-events-none"
            style={{ left: t2Left, top: t2Top }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-gui-accent/15 -translate-x-1/2 -translate-y-1/2" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trail dot 1 */}
      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed z-[2] pointer-events-none"
            style={{ left: t1Left, top: t1Top }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-2 h-2 rounded-full bg-gui-accent/25 -translate-x-1/2 -translate-y-1/2" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main ball */}
      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed z-[3] pointer-events-none"
            style={{ left, top }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            <motion.div
              className="rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{
                width: 14,
                height: 14,
                background: 'radial-gradient(circle, rgba(245,158,11,0.9) 0%, rgba(245,158,11,0.4) 60%, transparent 100%)',
                boxShadow: pulse
                  ? '0 0 30px rgba(245,158,11,0.6), 0 0 60px rgba(245,158,11,0.2)'
                  : '0 0 16px rgba(245,158,11,0.3), 0 0 4px rgba(245,158,11,0.5)',
              }}
              animate={{ scale: pulse ? [1, 1.8, 1] : [1, 1.1, 1] }}
              transition={{
                scale: { duration: pulse ? 0.3 : 2.5, repeat: pulse ? 0 : Infinity, ease: 'easeInOut' },
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score dots */}
      <AnimatePresence>
        {visible && score > 0 && (
          <motion.div
            className="fixed top-5 right-16 z-[6] pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-1.5">
              {checkpoints.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                    i < score ? 'bg-gui-accent' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="fixed rounded-full bg-gui-accent z-[6] pointer-events-none"
          style={{ width: 3, height: 3 }}
          initial={{ left: `${p.x}vw`, top: `${p.y}vh`, opacity: 1, scale: 1 }}
          animate={{
            left: `${p.x + Math.cos(p.angle) * p.speed}vw`,
            top: `${p.y + Math.sin(p.angle) * p.speed}vh`,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}
