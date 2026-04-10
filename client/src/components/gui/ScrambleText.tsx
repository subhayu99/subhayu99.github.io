import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** Delay in ms before starting the animation */
  delay?: number;
}

export default function ScrambleText({ text, className = '', delay = 0 }: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { margin: '-60px', once: true });

  return (
    <motion.span
      ref={ref}
      className={`inline-block ${className}`}
      initial={{ opacity: 0, filter: 'blur(6px)' }}
      animate={isInView ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(6px)' }}
      transition={{ duration: 0.8, delay: delay / 1000, ease: 'easeOut' }}
    >
      {text}
    </motion.span>
  );
}
