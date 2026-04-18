import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewMode } from '../../hooks/useViewMode';
import type { PortfolioData } from '../../../../shared/schema';
import { getSocialNetworkUrl } from '../../config/social.config';
import SocialIcon from './SocialIcon';
import { toggleFullscreen } from '../../lib/fullscreen';

const NAV_SECTIONS = ['about', 'skills', 'experience', 'work', 'projects', 'education', 'publication', 'contact'];

const SOCIAL_CODES: Record<string, string> = {
  LinkedIn: 'IN',
  GitHub: 'GH',
  Twitter: 'TW',
  ORCID: 'OR',
  GitLab: 'GL',
  YouTube: 'YT',
  Medium: 'MD',
};

interface NavbarProps {
  activeSection?: string;
  data?: PortfolioData;
}

export default function Navbar({ activeSection, data }: NavbarProps) {
  const { switchTo } = useViewMode();
  const [visible, setVisible] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasLogo, setHasLogo] = useState(true);

  const cv = data?.cv;
  const monogram = cv?.name
    ? cv.name.split(' ').map(w => w[0]).join('.')
    : '';

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.6);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileOpen(false);
    // Delay scroll so the menu close animation settles first
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const navHeight = 56; // h-14 = 3.5rem = 56px
      const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    }, 350);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: -80 }}
          animate={{ y: 0 }}
          exit={{ y: -80 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b border-white/5 ${
            mobileOpen ? 'bg-black/30' : 'bg-black/80'
          } transition-colors duration-200`}
        >
          <div className="flex items-center justify-between px-6 sm:px-12 h-14">
            {/* Terminal toggle */}
            <button
              onClick={() => switchTo('terminal')}
              className="text-gui-accent font-mono text-sm font-bold hover:text-gui-accent-hover transition-colors"
              title="Switch to Terminal"
              aria-label="Switch to Terminal mode"
            >
              {'>_'}
            </button>

            {/* Center: monogram + dot indicators (desktop) */}
            <div className="hidden sm:flex items-center gap-4">
              {hasLogo ? (
                <img src="/logo.png" alt={monogram || 'Logo'} className="h-6 w-6 mr-4 object-contain" onError={() => setHasLogo(false)} />
              ) : monogram ? (
                <span className="text-white font-display text-lg tracking-wider mr-4">{monogram}</span>
              ) : null}
              {NAV_SECTIONS.map((section) => (
                <button
                  key={section}
                  onClick={() => scrollToSection(section)}
                  className="group relative flex flex-col items-center gap-1"
                  aria-label={`Navigate to ${section}`}
                >
                  <span className="absolute -bottom-5 text-[9px] font-mono uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-zinc-400 whitespace-nowrap">
                    {section}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      activeSection === section
                        ? 'bg-gui-accent scale-125'
                        : 'bg-zinc-600 group-hover:bg-zinc-400'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Mobile center logo/monogram */}
            {hasLogo ? (
              <img src="/logo.png" alt={monogram || 'Logo'} className="sm:hidden h-6 w-6 object-contain" onError={() => setHasLogo(false)} />
            ) : monogram ? (
              <span className="sm:hidden text-white font-display text-lg tracking-wider">{monogram}</span>
            ) : null}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="sm:hidden flex flex-col gap-1.5"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              <span className={`block w-5 h-0.5 bg-gui-accent transition-transform duration-200 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gui-accent transition-opacity duration-200 ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gui-accent transition-transform duration-200 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>

            {/* Right: social links (desktop) */}
            <div className="hidden sm:flex items-center gap-4 text-zinc-500">
              {cv?.social_networks?.map((sn) => (
                <a
                  key={sn.network}
                  href={getSocialNetworkUrl(sn.network, sn.username)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                  aria-label={sn.network}
                >
                  <SocialIcon network={sn.network} size={16} />
                </a>
              ))}
              {/* Fullscreen toggle — also triggerable via "F" key. */}
              <button
                type="button"
                onClick={() => toggleFullscreen()}
                className="hover:text-white transition-colors leading-none"
                aria-label="Toggle fullscreen"
                title="Toggle fullscreen (F)"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M4 9V4h5" />
                  <path d="M20 9V4h-5" />
                  <path d="M4 15v5h5" />
                  <path d="M20 15v5h-5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu — glass overlay */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="sm:hidden overflow-hidden border-t border-white/10"
              >
                <div className="px-6 py-4 flex flex-col gap-3">
                  {NAV_SECTIONS.map((section) => (
                    <button
                      key={section}
                      onClick={() => scrollToSection(section)}
                      className={`text-left uppercase tracking-widest text-sm ${
                        activeSection === section ? 'text-gui-accent' : 'text-gui-text-muted'
                      }`}
                    >
                      {section}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
