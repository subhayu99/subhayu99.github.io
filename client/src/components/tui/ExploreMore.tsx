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
 * The "💡 EXPLORE MORE" footer block that lives at the bottom of most
 * command outputs. Each item is a bullet with an internal CmdLink and
 * a short description. Matches the visual conventions used site-wide.
 */
export function ExploreMore({ items }: ExploreMoreProps) {
  return (
    <div className="border-t border-terminal-green/30 pt-3">
      <div className="text-terminal-yellow font-bold mb-2">💡 EXPLORE MORE</div>
      <div className="space-y-1 ml-2 text-xs">
        {items.map((it) => (
          <div key={it.cmd}>
            <span className="text-white">• </span>
            Try <CmdLink cmd={it.cmd}>{it.label ?? it.cmd}</CmdLink>
            {it.suffix ? ' ' : ''}
            {it.suffix}
          </div>
        ))}
      </div>
    </div>
  );
}
