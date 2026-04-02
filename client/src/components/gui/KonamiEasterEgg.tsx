import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrambleText from './ScrambleText';

const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

const STATS = [
  { label: 'FRAMEWORK', value: 'React 18 + TypeScript' },
  { label: 'BUILD TOOL', value: 'Vite 5' },
  { label: 'ANIMATION', value: 'Framer Motion + Canvas' },
  { label: 'STYLING', value: 'Tailwind CSS' },
  { label: 'EASTER EGGS', value: '3 hidden' },
  { label: 'CLEARANCE', value: 'LEVEL 5 — TOP SECRET' },
];

export default function KonamiEasterEgg() {
  const [active, setActive] = useState(false);
  const [shatter, setShatter] = useState(false);
  const bufferRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't trigger if an input/textarea is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (active) return;

      bufferRef.current.push(e.key);
      if (bufferRef.current.length > KONAMI_SEQUENCE.length) {
        bufferRef.current.shift();
      }

      const match = KONAMI_SEQUENCE.every((k, i) => bufferRef.current[i] === k);
      if (match) {
        setActive(true);
        bufferRef.current = [];
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active]);

  // Auto-dismiss after 12s
  useEffect(() => {
    if (active && !shatter) {
      timerRef.current = setTimeout(() => close(), 12000);
      return () => clearTimeout(timerRef.current);
    }
  }, [active, shatter]);

  const close = useCallback(() => {
    setActive(false);
    setShatter(false);
  }, []);

  const triggerShatter = useCallback(() => {
    setShatter(true);
    setTimeout(() => close(), 1200);
  }, [close]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
        >
          {/* CRT Scan Lines Background */}
          <div
            className="absolute inset-0 bg-black/95"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px)',
            }}
          />

          {/* Green flash on entry */}
          <motion.div
            className="absolute inset-0 bg-green-500"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />

          {/* Shatter effect */}
          {shatter && (
            <div className="absolute inset-0 z-50">
              {Array.from({ length: 12 }).map((_, i) => {
                const row = Math.floor(i / 4);
                const col = i % 4;
                const angle = (Math.random() - 0.5) * 30;
                const tx = (col - 1.5) * 200 + (Math.random() - 0.5) * 100;
                const ty = (row - 1) * 200 + (Math.random() - 0.5) * 100;
                return (
                  <motion.div
                    key={i}
                    className="absolute bg-black border border-green-500/20"
                    style={{
                      left: `${col * 25}%`,
                      top: `${row * 33.33}%`,
                      width: '25%',
                      height: '33.33%',
                    }}
                    initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
                    animate={{
                      opacity: 0,
                      x: tx,
                      y: ty,
                      rotate: angle,
                      scale: 0.5,
                    }}
                    transition={{ duration: 1, ease: 'easeIn' }}
                  />
                );
              })}
            </div>
          )}

          {/* Content */}
          {!shatter && (
            <motion.div
              className="relative z-10 max-w-lg w-full mx-6"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {/* ACCESS GRANTED header */}
              <div className="text-center mb-8">
                <h2 className="font-display text-green-400 text-5xl sm:text-6xl tracking-wider mb-2">
                  <ScrambleText text="ACCESS GRANTED" />
                </h2>
                <div className="h-px bg-green-500/40 mx-auto w-3/4" />
              </div>

              {/* Security badge */}
              <motion.div
                className="border border-green-500/30 bg-green-500/5 p-6 mb-6 font-mono text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400 text-xs tracking-widest">CLASSIFIED — PORTFOLIO INTERNALS</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {STATS.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      className="flex justify-between items-center border-b border-white/5 pb-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + i * 0.1 }}
                    >
                      <span className="text-zinc-500 text-xs">{stat.label}</span>
                      <span className="text-green-400">{stat.value}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Self-destruct button */}
              <motion.div
                className="flex justify-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
              >
                <button
                  onClick={triggerShatter}
                  className="px-6 py-3 border-2 border-red-500/60 text-red-400 font-mono text-sm
                             hover:bg-red-500/20 hover:border-red-400 transition-all duration-200
                             animate-pulse"
                >
                  ⚠ SELF-DESTRUCT
                </button>
                <button
                  onClick={close}
                  className="px-6 py-3 border border-white/20 text-zinc-400 font-mono text-sm
                             hover:border-green-500/40 hover:text-green-400 transition-all duration-200"
                >
                  DISMISS [ESC]
                </button>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
