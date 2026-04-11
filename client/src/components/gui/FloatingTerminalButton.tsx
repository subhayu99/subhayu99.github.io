import { motion } from 'framer-motion';
import { useViewMode } from '../../hooks/useViewMode';
const ar = (o: number) => `rgba(var(--gui-accent-rgb), ${o})`;

const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function FloatingTerminalButton() {
  const { switchTo } = useViewMode();

  return (
    <motion.button
      onClick={() => switchTo('terminal')}
      className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-lg bg-zinc-900/90 border border-white/10
                 flex items-center justify-center text-gui-accent font-mono text-sm font-bold
                 hover:border-gui-accent hover:shadow-[0_0_15px_rgba(var(--gui-accent-rgb),0.3)]
                 transition-all duration-300 backdrop-blur-sm"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title="Switch to Terminal view"
      animate={prefersReduced ? undefined : {
        boxShadow: [
          `0 0 0px ${ar(0)}`,
          `0 0 12px ${ar(0.3)}`,
          `0 0 0px ${ar(0)}`,
        ],
      }}
      transition={prefersReduced ? undefined : {
        boxShadow: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      {'>_'}
    </motion.button>
  );
}
