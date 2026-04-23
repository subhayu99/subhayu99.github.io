interface UsageHintProps {
  /** Example usage line shown inside the hint, e.g. `theme [name]`. */
  usage: string;
}

/**
 * Small yellow usage hint rendered inside a section body when a
 * command is called without required args. Consistent across theme /
 * search / cat.
 */
export function UsageHint({ usage }: UsageHintProps) {
  return (
    <div className="border-t border-terminal-green/30 pt-2 mt-2 text-terminal-yellow">
      Usage: {usage}
    </div>
  );
}
