import type { PortfolioData } from '../../../../shared/schema';
import SectionWrapper from './SectionWrapper';
import ExperienceCard from './ExperienceCard';
import ScrambleText from './ScrambleText';

interface ExperienceSectionProps {
  data: PortfolioData;
}

export default function ExperienceSection({ data }: ExperienceSectionProps) {
  const experience = data.cv.sections.experience;
  if (!experience?.length) return null;

  return (
    <SectionWrapper id="experience" watermark="EXPERIENCE" animation="fade-right">
      {/* Label */}
      <div className="flex items-center gap-4 mb-10">
        <ScrambleText text="// experience" className="text-gui-accent font-mono text-sm" />
        <div className="flex-1 h-px bg-gui-accent/30" />
      </div>

      <div className="max-w-3xl relative">
        {experience.map((exp, i) => (
          <ExperienceCard key={`${exp.company}-${exp.start_date}`} experience={exp} index={i} total={experience.length} />
        ))}
        <span className="secret-text block mt-6 font-mono">// name the one who races through life (5 keys).</span>
      </div>
    </SectionWrapper>
  );
}
