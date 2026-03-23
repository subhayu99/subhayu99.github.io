import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { PortfolioData } from '../../../../shared/schema';
import type { PyPIStatsData } from '../../lib/pypiStats';
import SectionWrapper from './SectionWrapper';
import ProjectCard from './ProjectCard';

interface ProjectsSectionProps {
  data: PortfolioData;
  pypiStats?: PyPIStatsData;
}

export default function ProjectsSection({ data, pypiStats }: ProjectsSectionProps) {
  const personal = data.cv.sections.personal_projects;
  if (!personal?.length) return null;

  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: '-40px' });

  return (
    <SectionWrapper id="projects" watermark="PROJECTS" animation="fade-left">
      {/* Label */}
      <div className="flex items-center gap-4 mb-10">
        <span className="text-gui-accent font-mono text-sm">// open source</span>
        <div className="flex-1 h-px bg-gui-accent/30" />
      </div>

      {/* Horizontal scroll carousel */}
      <div ref={containerRef} className="relative -mx-6 sm:-mx-12 lg:-mx-20">
        <motion.div
          className="flex gap-4 px-6 sm:px-12 lg:px-20 overflow-x-auto scrollbar-hide py-4"
          style={{ scrollSnapType: 'x mandatory' }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {personal.map((project, i) => (
            <div key={project.name} style={{ scrollSnapAlign: 'center' }}>
              <ProjectCard
                project={project}
                index={i}
                stats={project.pypi_package ? pypiStats?.packages[project.pypi_package] : undefined}
              />
            </div>
          ))}
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
