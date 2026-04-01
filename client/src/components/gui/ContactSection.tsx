import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { PortfolioData } from '../../../../shared/schema';
import { getSocialNetworkUrl } from '../../config/social.config';
import SocialIcon from './SocialIcon';
import ScrambleText from './ScrambleText';

interface ContactSectionProps {
  data: PortfolioData;
}

export default function ContactSection({ data }: ContactSectionProps) {
  const cv = data.cv;
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { margin: '-40px' });

  const phone = cv.phone ? cv.phone.replace(/^tel:/, '') : null;

  return (
    <section
      ref={ref}
      id="contact"
      className="relative min-h-[70vh] flex flex-col items-center justify-center px-6 py-16"
    >
      <motion.h2
        className="font-display text-white text-6xl sm:text-8xl md:text-9xl text-center leading-none mb-6"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7 }}
      >
        <ScrambleText text="LET'S CONNECT" className="inline" />
      </motion.h2>

      {cv.location && (
        <motion.p
          className="text-gui-text-muted text-sm mb-4"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.2 }}
        >
          {cv.location}
        </motion.p>
      )}

      {cv.email && (
        <motion.a
          href={`mailto:${cv.email}`}
          className="text-gui-accent text-lg sm:text-2xl font-mono hover:underline underline-offset-4 mb-3"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.3 }}
        >
          {cv.email}
        </motion.a>
      )}

      <motion.div
        className="flex items-center gap-4 mb-8"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.4 }}
      >
        {phone && (
          <a href={`tel:${phone}`} className="text-gui-text-muted text-sm font-mono hover:text-gui-accent transition-colors">
            {phone}
          </a>
        )}
        {phone && cv.website && <span className="text-white/10">·</span>}
        {cv.website && (
          <a href={cv.website} target="_blank" rel="noopener noreferrer" className="text-gui-text-muted text-sm font-mono hover:text-gui-accent transition-colors">
            {cv.website.replace(/^https?:\/\//, '')}
          </a>
        )}
      </motion.div>

      {cv.social_networks && cv.social_networks.length > 0 && (
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ delay: 0.5 }}
        >
          {cv.social_networks.map((sn) => (
            <a
              key={sn.network}
              href={getSocialNetworkUrl(sn.network, sn.username)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center
                         text-gui-text-muted
                         hover:border-gui-accent hover:text-gui-accent transition-colors duration-200"
              aria-label={sn.network}
            >
              <SocialIcon network={sn.network} size={20} />
            </a>
          ))}
        </motion.div>
      )}

      <span className="secret-text block mt-6 font-mono">// hire me before someone else does ;)</span>

      <motion.p
        className="absolute bottom-6 text-zinc-700 text-xs font-mono"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.8 }}
      >
        Built with React + TypeScript
      </motion.p>
    </section>
  );
}
