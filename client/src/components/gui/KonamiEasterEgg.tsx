import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrambleText from './ScrambleText';
import ParticleSandbox from './ParticleSandbox';

interface KonamiEasterEggProps {
  active: boolean;
  onClose: () => void;
}

export default function KonamiEasterEgg({ active, onClose }: KonamiEasterEggProps) {
  const [shatter, setShatter] = useState(false);
  const [gravityOn, setGravityOn] = useState(false);
  const [explodeTrigger, setExplodeTrigger] = useState(0);

  const close = useCallback(() => {
    setShatter(false);
    setGravityOn(false);
    onClose();
  }, [onClose]);

  // Global ESC key listener
  useEffect(() => {
    if (!active) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, close]);

  const triggerShatter = useCallback(() => {
    setShatter(true);
    setTimeout(() => close(), 1200);
  }, [close]);

  const handleExplode = useCallback(() => {
    setExplodeTrigger((n) => n + 1);
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
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
              className="relative z-10 w-full max-w-2xl mx-4 flex flex-col items-center"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {/* ACCESS GRANTED header */}
              <div className="text-center mb-4">
                <h2 className="font-display text-green-400 text-4xl sm:text-6xl tracking-wider mb-2">
                  <ScrambleText text="ACCESS GRANTED" />
                </h2>
                <div className="h-px bg-green-500/40 mx-auto w-3/4" />
              </div>

              {/* Particle sandbox */}
              <motion.div
                className="relative w-full border border-green-500/30 bg-black overflow-hidden"
                style={{ height: 'min(50vh, 400px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <ParticleSandbox gravityOn={gravityOn} explodeTrigger={explodeTrigger} />
                <p className="absolute bottom-2 left-0 right-0 text-center text-green-500/30 text-xs font-mono pointer-events-none select-none">
                  TAP TO ATTRACT · RELEASE TO REPULSE
                </p>
              </motion.div>

              {/* Controls */}
              <motion.div
                className="flex flex-wrap justify-center gap-3 mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <button
                  onClick={() => setGravityOn((g) => !g)}
                  className={`px-4 py-2 border font-mono text-xs transition-all duration-200 ${
                    gravityOn
                      ? 'border-green-500/60 text-green-400 bg-green-500/10'
                      : 'border-white/20 text-zinc-400 hover:border-green-500/40 hover:text-green-400'
                  }`}
                >
                  {gravityOn ? '▼ GRAVITY ON' : '○ GRAVITY OFF'}
                </button>
                <button
                  onClick={handleExplode}
                  className="px-4 py-2 border border-green-500/40 text-green-400 font-mono text-xs
                             hover:bg-green-500/10 transition-all duration-200"
                >
                  ✦ EXPLODE
                </button>
                <button
                  onClick={triggerShatter}
                  className="px-4 py-2 border-2 border-red-500/60 text-red-400 font-mono text-xs
                             hover:bg-red-500/20 hover:border-red-400 transition-all duration-200
                             animate-pulse"
                >
                  ⚠ SELF-DESTRUCT
                </button>
                <button
                  onClick={close}
                  className="px-4 py-2 border border-white/20 text-zinc-400 font-mono text-xs
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
