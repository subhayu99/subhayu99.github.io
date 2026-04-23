import type { ReactNode } from 'react';

type LabelCols = 2 | 3 | 4;

const LABEL_CLASS: Record<LabelCols, string> = {
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
};
const VALUE_CLASS: Record<LabelCols, string> = {
  2: 'col-span-10',
  3: 'col-span-9',
  4: 'col-span-8',
};

interface LabeledRowProps {
  label: string;
  /** Value node. If both `value` and `children` are passed, `children`
      wins — lets callers use JSX-nested markup naturally. */
  value?: ReactNode;
  children?: ReactNode;
  /** Column span for the label. Default 3 (about/contact).
      Publications uses 2 because labels are longer (Authors/Journal). */
  labelCols?: LabelCols;
  /** Tighter gap for dense meta-lists (e.g. publications). */
  dense?: boolean;
  /** Softer value text — used when the value is supplementary metadata. */
  muted?: boolean;
}

/**
 * Grid-12 row with a tinted label column and a tinted value column.
 * Used by commands that render a flat key/value table: contact, about's
 * QUICK LINKS, publications.
 */
export function LabeledRow({
  label,
  value,
  children,
  labelCols = 3,
  dense = false,
  muted = false,
}: LabeledRowProps) {
  return (
    <div className={`grid grid-cols-12 ${dense ? 'gap-1' : 'gap-4'}`}>
      <div className={`${LABEL_CLASS[labelCols]} bg-terminal-green/10`}>
        <span className="text-terminal-yellow font-semibold">{label}</span>
      </div>
      <div className={`${VALUE_CLASS[labelCols]} bg-terminal-green/5`}>
        <span className={muted ? 'text-white opacity-80' : 'text-white'}>
          {children ?? value}
        </span>
      </div>
    </div>
  );
}

interface CompactRowProps {
  label: string;
  value?: ReactNode;
  /** Tailwind width class for the label column. Default `w-24`. */
  labelWidth?: string;
}

/**
 * Flex row with a fixed-width label and inline value — used by commands
 * that show a small cluster of labeled fields above a body (welcome's
 * Quick Overview, whoami). Matches the denser look of an ls -l header
 * rather than a formal table.
 */
export function CompactRow({
  label,
  value,
  labelWidth = 'w-24',
}: CompactRowProps) {
  return (
    <div className="flex">
      <span className={`text-terminal-yellow font-bold ${labelWidth}`}>{label}</span>
      {typeof value === 'string' ? <span className="text-white">{value}</span> : value}
    </div>
  );
}
