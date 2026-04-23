import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { loadPortfolioData } from '../lib/portfolioDataLoader';
import { loadPyPIStats } from '../lib/pypiStats';
import { useViewMode } from '../hooks/useViewMode';
import { apiConfig } from '../config';
import { enterFullscreen } from '../lib/fullscreen';

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
const SCRAMBLE_DURATION = 1500;
const SCRAMBLE_INTERVAL = 40;

function useTextScramble(text: string, delay = 300) {
  const [display, setDisplay] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) return;

    const chars = text.split('');
    const resolved = new Array(chars.length).fill(false);
    let frame = 0;
    const totalFrames = Math.ceil(SCRAMBLE_DURATION / SCRAMBLE_INTERVAL);

    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        const revealIndex = Math.floor(progress * chars.length);
        for (let i = 0; i <= revealIndex; i++) {
          resolved[i] = true;
        }

        const result = chars.map((char, i) => {
          if (char === ' ') return ' ';
          if (resolved[i]) return char;
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }).join('');

        setDisplay(result);

        if (frame >= totalFrames) {
          clearInterval(interval);
          setDisplay(text);
          setDone(true);
        }
      }, SCRAMBLE_INTERVAL);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, delay]);

  return { display, done };
}

function deriveTagline(
  data: ReturnType<typeof useQuery<Awaited<ReturnType<typeof loadPortfolioData>>>>['data'],
  totalDownloads?: number,
): string {
  if (!data) return '';

  const cv = data.cv;
  const experience = cv.sections.experience;

  let years = 0;
  if (experience?.length) {
    const earliest = experience.reduce((min, exp) => {
      const year = parseInt(exp.start_date);
      return year < min ? year : min;
    }, new Date().getFullYear());
    years = new Date().getFullYear() - earliest;
  }

  // Use real API stats if available, fall back to text parsing
  let downloads = '';
  if (totalDownloads && totalDownloads > 0) {
    downloads = totalDownloads >= 1000 ? `${Math.round(totalDownloads / 1000)}K+` : `${totalDownloads}+`;
  } else {
    const introText = (cv.sections.intro ?? []).join(' ');
    const grandMatch = introText.match(/(\d{1,3}),?(\d{3})\+?\s*(PyPI\s*)?[Dd]ownloads/i);
    if (grandMatch) {
      const num = parseInt(grandMatch[1] + (grandMatch[2] || ''));
      downloads = num >= 1000 ? `${Math.round(num / 1000)}K+` : `${num}+`;
    }
    if (!downloads) {
      const allHighlights = cv.sections.personal_projects?.flatMap(p => p.highlights) ?? [];
      for (const h of allHighlights) {
        const match = h.match(/(\d+[kK]\+?)\s*(PyPI\s*)?downloads/i);
        if (match) {
          downloads = match[1];
          break;
        }
      }
    }
  }

  const parts: string[] = [];
  if (experience?.[0]?.position) parts.push(experience[0].position);
  if (years > 0) parts.push(`${years} Years`);
  if (downloads) parts.push(`${downloads} PyPI Downloads`);

  return parts.join(' | ');
}

export default function SplashPage() {
  const { switchTo } = useViewMode();
  const [selected, setSelected] = useState<'terminal' | 'gui' | null>(null);
  const [hovered, setHovered] = useState<'terminal' | 'gui' | null>(null);

  const { data: portfolioData } = useQuery({
    queryKey: ['portfolio-data'],
    queryFn: loadPortfolioData,
    retry: apiConfig.query.retryAttempts,
    staleTime: apiConfig.query.cacheTime,
  });

  const { data: pypiStats } = useQuery({
    queryKey: ['pypi-stats'],
    queryFn: loadPyPIStats,
    staleTime: 30 * 60 * 1000,
  });

  const name = portfolioData?.cv.name?.toUpperCase() ?? '';
  const totalDownloads = pypiStats?.total_downloads;
  const tagline = useMemo(() => deriveTagline(portfolioData, totalDownloads), [portfolioData, totalDownloads]);
  const { display: scrambledName, done: nameReady } = useTextScramble(name, 200);
  const { display: scrambledTagline } = useTextScramble(nameReady ? tagline : '', 0);

  const handleSelect = useCallback((mode: 'terminal' | 'gui') => {
    setSelected(mode);
    // The click is a valid user gesture — request fullscreen synchronously
    // before the view transition kicks in. Silently no-ops if the browser
    // denies (e.g. iframe, unsupported).
    enterFullscreen();
    setTimeout(() => switchTo(mode), 400);
  }, [switchTo]);

  // Auto-advance to GUI after a short idle. If the visitor doesn't touch
  // the page for a few seconds, take them to the polished view instead
  // of leaving them staring at the splash. Timer resets on any
  // interaction; never shown as a visible countdown.
  useEffect(() => {
    if (selected || !nameReady) return;

    const IDLE_MS = 6000;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => handleSelect('gui'), IDLE_MS);
    };
    schedule();

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'wheel',
      'scroll',
    ];
    events.forEach((e) => window.addEventListener(e, schedule, { passive: true }));

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, schedule));
    };
  }, [selected, nameReady, handleSelect]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-black flex flex-col items-center justify-center font-sans select-none overflow-hidden"
      style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg%3E")',
      }}
    >
      {/* Background preview on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: hovered ? 0.07 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {hovered === 'terminal' && (
          <div className="w-full h-full flex items-center justify-center">
            <pre className="text-green-500 font-mono text-[10px] leading-tight opacity-60 whitespace-pre">
{`┌──────────────────────────────────────┐
│  visitor@portfolio:~$ help           │
│                                      │
│  about     - About me                │
│  skills    - Technical skills         │
│  work      - Work experience          │
│  projects  - Open source projects     │
│  education - Education                │
│  contact   - Get in touch             │
│                                      │
│  visitor@portfolio:~$ _              │
└──────────────────────────────────────┘`}
            </pre>
          </div>
        )}
        {hovered === 'gui' && (
          <div className="w-full h-full flex items-center justify-center gap-6 px-20">
            <div className="flex-1 max-w-xs space-y-3">
              <div className="h-4 w-3/4 rounded bg-gui-accent/40" />
              <div className="h-2 w-full rounded bg-white/20" />
              <div className="h-2 w-5/6 rounded bg-white/20" />
              <div className="h-2 w-2/3 rounded bg-white/20" />
            </div>
            <div className="flex gap-3">
              <div className="w-28 h-36 rounded border border-white/10 bg-white/5 p-3 space-y-2">
                <div className="h-2 w-full rounded bg-gui-accent/30" />
                <div className="h-1.5 w-3/4 rounded bg-white/10" />
                <div className="h-1.5 w-full rounded bg-white/10" />
              </div>
              <div className="w-28 h-36 rounded border border-white/10 bg-white/5 p-3 space-y-2">
                <div className="h-2 w-full rounded bg-gui-accent/30" />
                <div className="h-1.5 w-3/4 rounded bg-white/10" />
                <div className="h-1.5 w-full rounded bg-white/10" />
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Name */}
      <motion.h1
        className="font-display text-white text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tight text-center leading-none mb-6"
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        {scrambledName || '\u00A0'}
      </motion.h1>

      {/* Tagline — ABOVE the prompt */}
      <motion.p
        className="text-zinc-500 text-xs sm:text-sm tracking-widest uppercase text-center mb-5 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: nameReady ? 1 : 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {scrambledTagline || '\u00A0'}
      </motion.p>

      {/* Choose your interface prompt */}
      <motion.p
        className="font-mono text-green-500 text-sm sm:text-base mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: nameReady ? 1 : 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <span className="text-green-600">$</span> Choose your interface...
        <span className="inline-block w-2 h-4 bg-green-500 ml-1 animate-pulse" />
      </motion.p>

      {/* Toggle — TUI and GUI, equal size */}
      <motion.div
        className="flex items-center rounded-full border border-zinc-800 overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: nameReady ? 1 : 0, scale: nameReady ? 1 : 0.9 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <button
          onClick={() => handleSelect('terminal')}
          onMouseEnter={() => setHovered('terminal')}
          onMouseLeave={() => setHovered(null)}
          className={`px-8 sm:px-10 py-3 text-sm sm:text-base font-mono tracking-wider transition-all duration-300 ${
            selected === 'terminal'
              ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]'
              : 'text-zinc-400 hover:text-green-400 hover:bg-zinc-900'
          }`}
        >
          TUI
        </button>
        <div className="w-px h-8 bg-zinc-800" />
        <button
          onClick={() => handleSelect('gui')}
          onMouseEnter={() => setHovered('gui')}
          onMouseLeave={() => setHovered(null)}
          className={`px-8 sm:px-10 py-3 text-sm sm:text-base font-mono tracking-wider transition-all duration-300 ${
            selected === 'gui'
              ? 'bg-gui-accent text-black shadow-[0_0_20px_rgba(var(--gui-accent-rgb),0.4)]'
              : 'text-zinc-400 hover:text-gui-accent hover:bg-zinc-900'
          }`}
        >
          GUI
        </button>
      </motion.div>

      {/* Version */}
      <motion.span
        className="fixed bottom-4 right-4 text-zinc-700 text-xs font-mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        v2.0.0
      </motion.span>
    </motion.div>
  );
}
