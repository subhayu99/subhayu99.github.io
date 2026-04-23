import type { ReactNode } from 'react';

interface SectionBoxProps {
  /** Uppercase section title rendered in the header bar. */
  title: string;
  /** Optional right-aligned slot — useful for a "Collapse All" button. */
  right?: ReactNode;
  /** Body content. */
  children: ReactNode;
  /** Override the default `space-y-3` padding rhythm if the body has its
      own internal layout (e.g., a collapsible list). */
  bodyClassName?: string;
  /** Extra classes on the outer shell — rarely needed. */
  className?: string;
  /** Centre the header text. A handful of commands (contact, help) use
      a centred title in the legacy HTML templates. */
  centerTitle?: boolean;
}

/**
 * The standard bordered box used by every command output. Header bar in
 * accent-bright-green, border/divider in accent at low opacity, inner
 * padding and vertical rhythm. Matches the visual language of the
 * existing HTML-string templates so JSX-migrated commands look identical.
 */
export function SectionBox({
  title,
  right,
  children,
  bodyClassName = 'p-3 space-y-3 sm:space-y-4 text-xs sm:text-sm',
  className = '',
  centerTitle = false,
}: SectionBoxProps) {
  const headerLayout = centerTitle
    ? 'flex items-center justify-center text-center'
    : 'flex items-center justify-between';
  return (
    <div
      className={`border border-terminal-green/50 rounded-sm mb-4 terminal-glow max-w-4xl ${className}`}
    >
      <div className={`border-b border-terminal-green/30 px-3 py-1 ${headerLayout}`}>
        <span className="text-terminal-bright-green text-sm font-bold">{title}</span>
        {!centerTitle && right}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
