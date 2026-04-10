import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ColorTheme } from '../../config/gui-theme.config';

interface Props {
  theme: ColorTheme | null;
  onClose: () => void;
}

export default function ThemeFlash({ theme, onClose }: Props) {
  useEffect(() => {
    if (!theme) return;
    const timer = setTimeout(onClose, 1400);
    return () => clearTimeout(timer);
  }, [theme, onClose]);

  const [r, g, b] = theme?.accentRgb ?? [0, 0, 0];

  return (
    <AnimatePresence>
      {theme && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Color flash */}
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          {/* Theme name */}
          <motion.p
            className="relative z-10 font-mono text-lg tracking-widest font-bold select-none"
            style={{ color: `rgb(${r}, ${g}, ${b})`, textShadow: `0 0 20px rgb(${r}, ${g}, ${b})` }}
            initial={{ opacity: 1, scale: 1.1 }}
            animate={{ opacity: 0, scale: 1, y: -10 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            {theme.name.toUpperCase()}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
