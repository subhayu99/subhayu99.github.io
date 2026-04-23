import { useState, type ReactNode } from 'react';
import { SectionBox } from './SectionBox';

export interface CollapsibleItemData {
  id: string;
  header: ReactNode;
  content: ReactNode;
}

interface CollapsibleGroupProps {
  title: string;
  items: CollapsibleItemData[];
  /** Rendered above the collapsibles — useful for pinned summary content. */
  preamble?: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
}

export function CollapsibleGroup({
  title,
  items,
  preamble,
  footer,
  bodyClassName = 'p-3 space-y-2 text-xs sm:text-sm',
}: CollapsibleGroupProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const allOpen = items.length > 0 && items.every((it) => open[it.id]);

  const toggleAll = () => {
    if (allOpen) {
      setOpen({});
      return;
    }
    const next: Record<string, boolean> = {};
    items.forEach((it) => {
      next[it.id] = true;
    });
    setOpen(next);
  };

  return (
    <SectionBox
      title={title}
      right={
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs px-2 py-1 border border-terminal-green/50 rounded hover:bg-terminal-green/10 transition-colors text-terminal-yellow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-bright-green"
        >
          <span aria-hidden="true" className="mr-1">
            {allOpen ? '⌃' : '⌄'}
          </span>
          {allOpen ? 'Collapse All' : 'Expand All'}
        </button>
      }
      bodyClassName={bodyClassName}
    >
      {preamble}
      {items.map((it) => (
        <CollapsibleItem
          key={it.id}
          isOpen={!!open[it.id]}
          onToggle={() =>
            setOpen((prev) => ({ ...prev, [it.id]: !prev[it.id] }))
          }
          header={it.header}
        >
          {it.content}
        </CollapsibleItem>
      ))}
      {footer}
    </SectionBox>
  );
}

interface CollapsibleItemProps {
  header: ReactNode;
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

function CollapsibleItem({ header, children, isOpen, onToggle }: CollapsibleItemProps) {
  return (
    <div className="border border-terminal-green/20 rounded">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full cursor-pointer hover:bg-terminal-green/10 transition-colors p-3 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-bright-green rounded"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">{header}</div>
          <div
            aria-hidden="true"
            className={`text-terminal-bright-green ml-2 transition-transform duration-150 ${
              isOpen ? 'rotate-90' : ''
            }`}
          >
            ▶
          </div>
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-terminal-green/20 p-3 pt-2">{children}</div>
      )}
    </div>
  );
}
