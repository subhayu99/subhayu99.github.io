import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface StatCardProps {
  value: number;
  suffix?: string;
  label: string;
  index: number;
}

export default function StatCard({ value, suffix = '', label, index }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-40px' });
  const hasAnimated = useRef(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 1500;
    const steps = 40;
    const stepTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));
      if (step >= steps) clearInterval(timer);
    }, stepTime);

    return () => {
      clearInterval(timer);
      // Always land on the final value if animation was started
      setCount(value);
    };
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      className="border border-white/5 p-5 sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div className="font-display text-4xl sm:text-5xl text-white leading-none">
        {count >= 1000 ? `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}K` : count}{suffix}
      </div>
      <div className="text-gui-text-muted text-xs uppercase tracking-widest mt-2">
        {label}
      </div>
    </motion.div>
  );
}
