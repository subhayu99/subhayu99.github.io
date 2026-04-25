import type { ReactNode } from 'react';
import { CmdLink } from './TuiLink';

export interface ExploreItem {
  cmd: string;
  label?: ReactNode;
  suffix?: ReactNode;
}

interface ExploreMoreProps {
  items: ExploreItem[];
}

/**
 * The "// explore more" footer block that lives at the bottom of most
 * command outputs. Each item is a bullet with an internal CmdLink and
 * a short description. Matches the GUI's `// comment` label idiom.
 */
export function ExploreMore({ items }: ExploreMoreProps) {
  return (
    <div className="border-t border-tui-accent-dim/30 pt-3">
      <div className="text-tui-accent-dim text-xs mb-2">// explore more</div>
      <div className="space-y-0.5 ml-1 text-xs">
        {items.map((it) => (
          <div key={it.cmd} className="text-white/80">
            <span className="text-tui-accent-dim">· </span>
            try <CmdLink cmd={it.cmd}>{it.label ?? it.cmd}</CmdLink>
            {it.suffix ? ' ' : ''}
            {it.suffix}
          </div>
        ))}
      </div>
    </div>
  );
}
