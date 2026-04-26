import { memo } from 'react';
import { motion } from 'framer-motion';
import Terminal from './Terminal';
import { useViewMode } from '../hooks/useViewMode';

function TerminalView() {
  const { switchTo } = useViewMode();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full h-dvh overflow-hidden relative"
    >
      <Terminal onSwitchToGUI={() => switchTo('gui')} />

<<<<<<< HEAD
      {/* Floating GUI switch button — desktop only. On mobile the
          `gui` chip in the status bar already covers this, and the
          floating button overlaps the prompt + chip strip awkwardly. */}
      <motion.button
        onClick={() => switchTo('gui')}
        className="hidden sm:flex fixed bottom-5 right-5 z-50 w-10 h-10 rounded-lg bg-zinc-900/80 border border-zinc-700
                   items-center justify-center text-terminal-green/60 hover:text-terminal-green hover:border-terminal-green hover:bg-terminal-green/10
=======
      {/* Floating GUI switch button */}
      <motion.button
        onClick={() => switchTo('gui')}
        className="fixed bottom-5 right-5 z-50 w-10 h-10 rounded-lg bg-zinc-900/80 border border-zinc-700
                   flex items-center justify-center text-terminal-green/60 hover:text-terminal-green hover:border-terminal-green hover:bg-terminal-green/10
>>>>>>> origin/main
                   transition-colors duration-200 backdrop-blur-sm group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Switch to GUI view"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </motion.button>
    </motion.div>
  );
}

export default memo(TerminalView);
