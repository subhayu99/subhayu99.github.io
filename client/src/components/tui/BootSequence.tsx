import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface BootSequenceProps {
  /** Called once all lines have finished revealing (or when the user
   *  skips via click / keypress). */
  onComplete: () => void;
  /** Short git sha or build id to show in the final line. Optional. */
  buildId?: string;
  /** Display theme name (lowercase). */
  themeName?: string;
}

/**
 * Old-school CRT boot messages. Three lines phosphor-flicker in over
 * ~800ms, then hand off to the welcome block. Any keypress or pointer
 * event skips to completion. Respects `prefers-reduced-motion`:
 * reduced users get the three lines rendered instantly, no flicker.
 */
export function BootSequence({
  onComplete,
  buildId = 'dev',
  themeName = 'matrix',
}: BootSequenceProps) {
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop() ?? 'utc';

  const lines = [
    'booting tui… ok',
    'loading portfolio data… ok',
    `mounted session ${buildId} · theme: ${themeName} · tz: ${tz.toLowerCase()}`,
  ];

  // Advance one line at a time on a fixed cadence.
  useEffect(() => {
    if (done) return;
    const delay = prefersReducedMotion ? 0 : 260;
    const t = setTimeout(() => {
      if (step < lines.length) {
        setStep((s) => s + 1);
      } else {
        // Short hold after the last line so users can read it.
        setDone(true);
        setTimeout(onComplete, prefersReducedMotion ? 0 : 300);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [step, done, prefersReducedMotion, lines.length, onComplete]);

  // Skip on any pointer / key event.
  useEffect(() => {
    const skip = () => {
      if (done) return;
      setDone(true);
      onComplete();
    };
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });
    return () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [done, onComplete]);

  return (
    <div className="font-mono text-sm sm:text-base text-terminal-green space-y-1 mb-4">
      {lines.slice(0, step).map((line, i) => (
        <motion.div
          key={i}
          initial={prefersReducedMotion ? false : { opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex items-baseline gap-2"
        >
          <span className="text-terminal-bright-green tabular-nums text-xs">
            [{(i + 1).toString().padStart(2, '0')}]
          </span>
          <span>{line}</span>
          {/* Inline check glyph for completed lines */}
          {i < step - 1 && (
            <span className="text-terminal-bright-green/50 text-[10px]">✓</span>
          )}
        </motion.div>
      ))}
      {!done && step < lines.length && (
        <div className="text-tui-muted text-xs italic">
          press any key to skip…
        </div>
      )}
    </div>
  );
}
