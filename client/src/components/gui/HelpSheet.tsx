import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpSheetProps {
  active: boolean;
  onClose: () => void;
}

interface TriggerRow {
  label: string;
  desktop: string;
  mobile: string;
}

const TRIGGERS: TriggerRow[] = [
  {
    label: 'Color Theme',
    desktop: 'press T',
    mobile: 'shake the device (3 quick shakes)',
  },
  {
    label: 'Snake',
    desktop: 'type "snake"',
    mobile: 'long-press "PyPI Downloads" (2s) — python 🐍',
  },
  {
    label: 'Reflex',
    desktop: 'type "reflex"',
    mobile: 'triple-tap the hero name',
  },
  {
    label: 'Infinity Racer',
    desktop: 'type "racer"',
    mobile: 'long-press "Years Experience" (2s)',
  },
  {
    label: 'Fullscreen',
    desktop: 'press F, or tap ⛶ in the navbar',
    mobile: 'tap ⛶ in the navbar',
  },
  {
    label: 'Mute Audio',
    desktop: 'press M, or tap the 🔊 icon in the navbar',
    mobile: 'tap the 🔊 icon in the navbar',
  },
  {
    label: 'Drop a Planet',
    desktop: 'click-and-hold empty space, release to drop — flick to throw',
    mobile: 'press-and-hold empty space (≈¼ sec), release to drop',
  },
  {
    label: 'Summon a Black Hole',
    desktop: 'stack 3 heavies on the same spot — mass ≥ 55 collapses it',
    mobile: 'stack 3 heavies on the same spot — tap the pill to return',
  },
];

/**
 * HelpSheet — full cheat-sheet overlay for all hidden triggers.
 * Shown when the user types "help" or taps the SOS hint on mobile.
 * ESC or tap outside to close.
 */
export default function HelpSheet({ active, onClose }: HelpSheetProps) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onClose]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{
            background: 'rgba(0,0,0,0.82)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-xl w-full max-h-[88vh] overflow-y-auto border border-[rgba(var(--gui-accent-rgb),0.35)] bg-black p-4 sm:p-7 font-mono text-gui-text"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between mb-3 sm:mb-5">
              <h2 className="text-[11px] tracking-[0.28em] uppercase text-gui-accent">
                Hidden Triggers
              </h2>
              <button
                onClick={onClose}
                className="text-[14px] leading-none text-zinc-500 hover:text-gui-accent transition-colors"
                aria-label="Close help"
                title="Close (ESC)"
              >
                ✕
              </button>
            </div>

            <div className="text-[10px] sm:text-[11px] tracking-[0.1em] text-zinc-500 leading-relaxed mb-4 sm:mb-5">
              A few hidden things live on this page. Here's how to wake them.
            </div>

            <div className="space-y-3 sm:space-y-4">
              {TRIGGERS.map((t, i) => (
                <div key={t.label} className="grid grid-cols-[22px_1fr] gap-2 sm:gap-3">
                  <div className="text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-zinc-600 pt-[3px]">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <div className="text-[11px] sm:text-[13px] tracking-[0.12em] uppercase text-white mb-1">
                      {t.label}
                    </div>
                    <div className="text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-zinc-400 leading-relaxed">
                      <span className="text-gui-accent">desktop</span> &nbsp;·&nbsp; {t.desktop}
                    </div>
                    <div className="text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-zinc-400 leading-relaxed">
                      <span className="text-gui-accent">mobile</span> &nbsp; ·&nbsp; {t.mobile}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-white/5 text-[9px] tracking-[0.2em] uppercase text-zinc-600 text-center leading-[1.7]">
              deep-link: <span className="text-zinc-400">#snake · #racer · #reflex · #help</span> at url end
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
