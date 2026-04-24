import type { ReactNode } from 'react';
import { Block } from './Block';

interface SectionBoxProps {
  /** Legacy title. Uppercase strings like "ABOUT ME" are normalised
      to the GUI-matching `// about me` idiom automatically. Callers
      that already prefix with `// ` are passed through untouched. */
  title: string;
  /** Right-aligned control slot (typically a Collapse-All toggle).
      Renders in `Block`'s `controls` position, next to the title. */
  right?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
  /** Accepted for source compatibility but ignored — the new
      titled-border grammar always anchors the title to the top-left. */
  centerTitle?: boolean;
}

/**
 * @deprecated
 * Shim over {@link Block}. Every command used to build its chrome
 * with this primitive; the migration to `Block` is mechanical because
 * SectionBox now just re-renders as a Block with a normalised title.
 *
 * New code should import `Block` directly and pass a lowercase
 * `// command` title — the normalisation here is a one-way migration
 * helper, not something future components should rely on.
 */
export function SectionBox({
  title,
  right,
  children,
  bodyClassName,
  className,
  centerTitle: _centerTitle,
}: SectionBoxProps) {
  return (
    <Block
      title={normaliseLegacyTitle(title)}
      controls={right}
      bodyClassName={bodyClassName}
      className={className}
    >
      {children}
    </Block>
  );
}

/** Legacy "SECTION NAME" → "// section name". Preserves any title
 *  that already matches the GUI idiom. */
function normaliseLegacyTitle(raw: string): string {
  if (raw.startsWith('//')) return raw;
  const cleaned = raw.trim().toLowerCase();
  return `// ${cleaned}`;
}
