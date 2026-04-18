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
    desktop: 'press T, or T1–T5',
    mobile: 'shake the device (3 quick shakes)',
  },
  {
    label: 'Snake',
    desktop: 'type "snake"',
    mobile: 'flip device (face-down → face-up)',
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
            className="max-w-xl w-full border border-[rgba(var(--gui-accent-rgb),0.35)] bg-black p-6 sm:p-8 font-mono text-gui-text"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-[11px] tracking-[0.28em] uppercase text-gui-accent">
                Hidden Triggers
              </h2>
              <button
                onClick={onClose}
                className="text-[10px] tracking-[0.22em] uppercase text-zinc-500 hover:text-gui-accent transition-colors"
                aria-label="Close help"
              >
                ✕ ESC
              </button>
            </div>

            <div className="text-[11px] tracking-[0.1em] text-zinc-500 leading-relaxed mb-6">
              Four hidden features are scattered across this portfolio.
              Here's how to wake them up.
            </div>

            <div className="space-y-5">
              {TRIGGERS.map((t, i) => (
                <div key={t.label} className="grid grid-cols-[28px_1fr] gap-3">
                  <div className="text-[10px] tracking-[0.22em] uppercase text-zinc-600 pt-[3px]">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <div className="text-[13px] tracking-[0.12em] uppercase text-white mb-1.5">
                      {t.label}
                    </div>
                    <div className="text-[10px] tracking-[0.18em] uppercase text-zinc-400 leading-relaxed">
                      <span className="text-gui-accent">desktop</span> &nbsp;·&nbsp; {t.desktop}
                    </div>
                    <div className="text-[10px] tracking-[0.18em] uppercase text-zinc-400 leading-relaxed">
                      <span className="text-gui-accent">mobile</span> &nbsp; ·&nbsp; {t.mobile}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 text-[9px] tracking-[0.22em] uppercase text-zinc-600 text-center">
              type "help" or tap the clues block to reopen this
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
