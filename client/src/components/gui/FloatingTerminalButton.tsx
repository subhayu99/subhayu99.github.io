import { motion } from 'framer-motion';
import { useViewMode } from '../../hooks/useViewMode';

export default function FloatingTerminalButton() {
  const { switchTo } = useViewMode();

  return (
    <motion.button
      onClick={() => switchTo('terminal')}
      className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-lg bg-zinc-900/90 border border-white/10
                 flex items-center justify-center text-gui-accent font-mono text-sm font-bold
                 hover:border-gui-accent hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]
                 transition-all duration-300 backdrop-blur-sm"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title="Switch to Terminal view"
      animate={{
        boxShadow: [
          '0 0 0px rgba(245,158,11,0)',
          '0 0 12px rgba(245,158,11,0.3)',
          '0 0 0px rgba(245,158,11,0)',
        ],
      }}
      transition={{
        boxShadow: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      {'>_'}
    </motion.button>
  );
}
