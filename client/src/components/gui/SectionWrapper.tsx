import { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

type AnimationVariant = 'fade-up' | 'fade-left' | 'fade-right' | 'scale-up' | 'split-open' | 'blur-rise';

interface SectionWrapperProps {
  id: string;
  watermark?: string;
  children: React.ReactNode;
  className?: string;
  animation?: AnimationVariant;
}

const animationMap: Record<AnimationVariant, {
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
  transition: Record<string, unknown>;
}> = {
  'fade-up': {
    initial: { opacity: 0, y: 60, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
  },
  'fade-left': {
    initial: { opacity: 0, x: -80, filter: 'blur(3px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
  'fade-right': {
    initial: { opacity: 0, x: 80, filter: 'blur(3px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
  'scale-up': {
    initial: { opacity: 0, scale: 0.92, filter: 'blur(6px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
  'split-open': {
    initial: { opacity: 0, y: 40, scaleY: 0.85, filter: 'blur(2px)' },
    animate: { opacity: 1, y: 0, scaleY: 1, filter: 'blur(0px)' },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
  'blur-rise': {
    initial: { opacity: 0, y: 80, filter: 'blur(12px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.9, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export default function SectionWrapper({ id, watermark, children, className = '', animation = 'fade-up' }: SectionWrapperProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { margin: '-80px' });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const watermarkY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  const anim = animationMap[animation];

  return (
    <section
      ref={ref}
      id={id}
      className={`relative py-16 sm:py-20 px-6 sm:px-12 lg:px-20 overflow-hidden ${className}`}
    >
      {/* Watermark */}
      {watermark && (
        <motion.span
          style={{ y: watermarkY }}
          className="absolute top-8 left-6 font-display text-[120px] sm:text-[200px] lg:text-[280px] leading-none text-[rgba(var(--gui-accent-rgb),0.03)] pointer-events-none select-none whitespace-nowrap"
          aria-hidden
        >
          {watermark}
        </motion.span>
      )}

      {/* Content — scroll-triggered reveal */}
      <motion.div
        className="relative z-10"
        initial={anim.initial}
        animate={isInView ? anim.animate : anim.initial}
        transition={anim.transition}
      >
        {children}
      </motion.div>
    </section>
  );
}
