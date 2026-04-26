/**
 * Discoverable trigger for the ReplicateSheet — sits alongside the social
 * icons in both the Hero top-bar and the Navbar right cluster.
 *
 * Visual brief: dimmed by default (matches the social cluster's resting
 * state), hover lifts to the GUI accent colour rather than white. That
 * subtle differentiation marks it as an internal action vs the external
 * social profile links.
 *
 * Behaviour: the `href="#fork"` hash drives the existing GUIPortfolio
 * hashchange listener, which calls `triggerReplicate()` and opens the
 * overlay. No new state plumbing needed.
 */
interface ReplicateButtonProps {
  /** Pixel size for the SVG (matches the size prop of neighbouring SocialIcon). */
  size?: number;
}

export default function ReplicateButton({ size = 16 }: ReplicateButtonProps) {
  return (
    <a
      href="#fork"
      className="hover:text-gui-accent transition-colors leading-none"
      aria-label="Replicate this portfolio (fork)"
      title='Replicate · type "replicate" or "clone"'
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="6" r="3" />
        <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
        <path d="M12 12v3" />
      </svg>
    </a>
  );
}
