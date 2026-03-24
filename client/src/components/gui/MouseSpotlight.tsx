import { useEffect, useRef } from 'react';

/**
 * Subtle radial gradient that follows the cursor across the page.
 * Renders as a fixed overlay with pointer-events: none.
 */
export default function MouseSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId: number;
    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${e.clientX}px`);
        el.style.setProperty('--my', `${e.clientY}px`);
        el.style.opacity = '1';
      });
    };

    const handleLeave = () => {
      el.style.opacity = '0';
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    document.addEventListener('mouseleave', handleLeave);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[1] pointer-events-none opacity-0 transition-opacity duration-500"
      style={{
        background: 'radial-gradient(600px circle at var(--mx, -1000px) var(--my, -1000px), rgba(255,255,255,0.03), transparent 40%)',
      }}
    />
  );
}
