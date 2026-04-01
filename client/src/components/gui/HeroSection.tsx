import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import type { PortfolioData } from '../../../../shared/schema';
import type { PyPIStatsData } from '../../lib/pypiStats';
import { useViewMode } from '../../hooks/useViewMode';
import { getSocialNetworkUrl } from '../../config/social.config';
import StatCard from './StatCard';
import SocialIcon from './SocialIcon';
import ScrambleText from './ScrambleText';

interface HeroSectionProps {
  data: PortfolioData;
  pypiStats?: PyPIStatsData;
}

function deriveStats(data: PortfolioData, pypiStats?: PyPIStatsData) {
  const cv = data.cv;
  const stats: { value: number; suffix: string; label: string }[] = [];

  // Years of experience
  if (cv.sections.experience?.length) {
    const earliest = cv.sections.experience.reduce((min, exp) => {
      const year = parseInt(exp.start_date);
      return year < min ? year : min;
    }, new Date().getFullYear());
    stats.push({ value: new Date().getFullYear() - earliest, suffix: '+', label: 'Years Experience' });
  }

  // Clients (professional projects count)
  const clientCount = cv.sections.professional_projects?.length ?? 0;
  if (clientCount > 0) {
    stats.push({ value: clientCount, suffix: '+', label: 'Clients Served' });
  }

  // PyPI Downloads — use real API stats if available, fall back to text parsing
  if (pypiStats && pypiStats.total_downloads > 0) {
    stats.push({ value: pypiStats.total_downloads, suffix: '+', label: 'PyPI Downloads' });
  } else {
    const introText = (cv.sections.intro ?? []).join(' ');
    const grandMatch = introText.match(/(\d{1,3}),?(\d{3})\+?\s*(PyPI\s*)?[Dd]ownloads/i)
      ?? introText.match(/(\d+)[,.]?(\d*)[kK]\+?\s*(PyPI\s*)?[Dd]ownloads/i);
    if (grandMatch) {
      let num: number;
      if (grandMatch[0].match(/[kK]/)) {
        num = parseInt(grandMatch[1]) * 1000 + (grandMatch[2] ? parseInt(grandMatch[2]) * 100 : 0);
      } else {
        num = parseInt(grandMatch[1] + (grandMatch[2] || ''));
      }
      stats.push({ value: num, suffix: '+', label: 'PyPI Downloads' });
    }
  }

  // Open source packages
  const packageCount = cv.sections.personal_projects?.length ?? 0;
  if (packageCount > 0) {
    stats.push({ value: packageCount, suffix: '', label: 'Open Source Packages' });
  }

  return stats.slice(0, 4);
}

export default function HeroSection({ data, pypiStats }: HeroSectionProps) {
  const { switchTo } = useViewMode();
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { margin: '-40px' });
  const cv = data.cv;

  const nameParts = cv.name.toUpperCase().split(' ');
  const firstName = nameParts[0];
  const restName = nameParts.slice(1).join(' ');

  // Parallax mouse tracking for hero name
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let rafId: number;
    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const cx = (e.clientX / window.innerWidth - 0.5) * 2;  // -1 to 1
        const cy = (e.clientY / window.innerHeight - 0.5) * 2;
        setMouse({ x: cx, y: cy });
      });
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('mousemove', handleMove); };
  }, []);

  const stats = deriveStats(data, pypiStats);

  const role = (cv.tagline ?? cv.sections.experience?.[0]?.position ?? '').toUpperCase();

  const socialNetworks = cv.social_networks ?? [];

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-20">
      {/* Top bar */}
      <div className="absolute top-6 left-6 sm:left-12 right-6 sm:right-12 flex items-center justify-between">
        <button
          onClick={() => switchTo('terminal')}
          className="text-gui-accent font-mono text-sm font-bold hover:text-gui-accent-hover transition-colors"
          title="Switch to Terminal"
        >
          {'>_'}
        </button>
        <div className="flex items-center gap-4 text-zinc-500">
          {socialNetworks.map((sn) => (
            <a
              key={sn.network}
              href={getSocialNetworkUrl(sn.network, sn.username)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label={sn.network}
            >
              <SocialIcon network={sn.network} size={18} />
            </a>
          ))}
        </div>
      </div>

      {/* Name */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <h1 className="font-display text-white leading-[0.85] tracking-tight">
          <span
            className="block text-7xl sm:text-8xl md:text-[10rem] lg:text-[12rem] transition-all duration-150 ease-out will-change-transform"
            style={{
              transform: `translate(${mouse.x * 12}px, ${mouse.y * 6}px)`,
              textShadow: `${mouse.x * -3}px ${mouse.y * -2}px 0 rgba(0,255,0,0.25), ${mouse.x * 3}px ${mouse.y * 2}px 0 rgba(0,100,255,0.12)`,
            }}
          >
            {firstName}
          </span>
          <span
            className="block text-5xl sm:text-6xl md:text-[7rem] lg:text-[8rem] sm:ml-[10%] md:ml-[15%] transition-all duration-300 ease-out will-change-transform"
            style={{
              transform: `translate(${mouse.x * -8}px, ${mouse.y * -4}px)`,
              textShadow: `${mouse.x * 2}px ${mouse.y * 1.5}px 0 rgba(0,255,0,0.2), ${mouse.x * -2}px ${mouse.y * -1.5}px 0 rgba(0,100,255,0.1)`,
            }}
          >
            {restName}
          </span>
        </h1>
      </motion.div>

      {/* Amber line */}
      <motion.div
        className="h-px bg-gui-accent mt-6 mb-4"
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        style={{ transformOrigin: 'left' }}
      />

      {/* Role */}
      <motion.p
        className="text-gui-text-muted text-xs sm:text-sm tracking-[0.3em] uppercase font-light mb-12 sm:mb-16"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.5 }}
      >
        <ScrambleText text={role} delay={500} />
      </motion.p>

      {/* Stats grid */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px max-w-4xl">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} value={stat.value} suffix={stat.suffix} label={stat.label} index={i} />
          ))}
        </div>
      )}

      {/* CTAs */}
      <motion.div
        className="flex flex-wrap gap-4 mt-12"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ delay: 0.7 }}
      >
        {cv.resume_url && (
          <a
            href={cv.resume_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-gui-accent text-black font-mono text-sm border border-gui-accent hover:bg-transparent hover:text-gui-accent transition-all duration-200"
          >
            Download Resume
          </a>
        )}
        {cv.email && (
          <a
            href={`mailto:${cv.email}`}
            className="px-6 py-3 border border-white/20 text-white font-mono text-sm hover:border-gui-accent hover:text-gui-accent hover:bg-gui-accent/5 transition-all duration-200"
          >
            Get In Touch
          </a>
        )}
      </motion.div>

      <span className="secret-text block mt-2 font-mono">// the cake is a lie. also try the konami code.</span>

      {/* Decorative vertical text */}
      <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 -rotate-90 origin-center">
        <span className="text-zinc-800 text-xs tracking-[0.5em] uppercase font-mono whitespace-nowrap">
          {cv.location ?? 'Portfolio'}
        </span>
      </div>
    </section>
  );
}
