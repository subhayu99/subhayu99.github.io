/**
 * Subtle animated film grain overlay using an SVG noise filter.
 * Pure CSS animation — no JavaScript, no canvas.
 */
export default function FilmGrain() {
  return (
    <div className="film-grain" aria-hidden>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="grain-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-filter)" opacity="1" />
      </svg>
    </div>
  );
}
