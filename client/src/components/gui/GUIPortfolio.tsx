import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { loadPortfolioData } from '../../lib/portfolioDataLoader';
import { loadPyPIStats, type PyPIStatsData } from '../../lib/pypiStats';
import { apiConfig } from '../../config';
import { guiTheme, accentHex, accentHoverHex, accentRgbCss } from '../../config/gui-theme.config';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import AboutSection from './AboutSection';
import ExperienceSection from './ExperienceSection';
import ProfessionalProjectsSection from './ProfessionalProjectsSection';
import ProjectsSection from './ProjectsSection';
import TechStackSection from './TechStackSection';
import EducationSection from './EducationSection';
import PublicationSection from './PublicationSection';
import ContactSection from './ContactSection';
import FloatingTerminalButton from './FloatingTerminalButton';
import ScrollBallGame from './ScrollBallGame';
import MouseSpotlight from './MouseSpotlight';
import WireframeGrid from './WireframeGrid';
import MatrixRain from './MatrixRain';
import CursorTrail from './CursorTrail';
import KonamiEasterEgg from './KonamiEasterEgg';
import SnakeGame from './SnakeGame';
import FilmGrain from './FilmGrain';

const SECTIONS = ['about', 'skills', 'experience', 'work', 'projects', 'education', 'publication', 'contact'];

export default function GUIPortfolio() {
  const [activeSection, setActiveSection] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply GUI theme CSS variables from config (single source of truth)
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--gui-bg', guiTheme.bg);
    root.setProperty('--gui-surface', guiTheme.surface);
    root.setProperty('--gui-border', guiTheme.border);
    root.setProperty('--gui-text', guiTheme.text);
    root.setProperty('--gui-text-muted', guiTheme.textMuted);
    root.setProperty('--gui-accent', accentHex);
    root.setProperty('--gui-accent-hover', accentHoverHex);
    root.setProperty('--gui-accent-rgb', accentRgbCss);
  }, []);

  const { data: portfolioData, isLoading, error } = useQuery({
    queryKey: ['portfolio-data'],
    queryFn: loadPortfolioData,
    retry: apiConfig.query.retryAttempts,
    staleTime: apiConfig.query.cacheTime,
  });

  const { data: pypiStats } = useQuery({
    queryKey: ['pypi-stats'],
    queryFn: loadPyPIStats,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Track active section via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { threshold: 0.3 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [portfolioData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gui-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !portfolioData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gui-text-muted font-mono text-sm">
        Failed to load portfolio data.
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-black text-gui-text font-sans"
    >
      <WireframeGrid />
      <MatrixRain />
      <MouseSpotlight />
      <CursorTrail />
      <FilmGrain />
      <KonamiEasterEgg />
      <SnakeGame />
      <Navbar activeSection={activeSection} data={portfolioData} />
      <HeroSection data={portfolioData} pypiStats={pypiStats ?? undefined} />
      <AboutSection data={portfolioData} />
      <TechStackSection data={portfolioData} />
      <ExperienceSection data={portfolioData} />
      <ProfessionalProjectsSection data={portfolioData} />
      <ProjectsSection data={portfolioData} pypiStats={pypiStats ?? undefined} />
      <EducationSection data={portfolioData} />
      <PublicationSection data={portfolioData} />
      <ContactSection data={portfolioData} />
      <ScrollBallGame />
      <FloatingTerminalButton />
    </motion.div>
  );
}
