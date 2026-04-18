/**
 * Console Easter Egg — runs once on app mount.
 *
 * Curious devs who open DevTools get:
 *   - A small ASCII signature
 *   - A time-aware greeting (morning / afternoon / night-owl / etc.)
 *   - An anniversary line on specific dates
 *   - A subtle nudge toward the hidden triggers
 *
 * Zero runtime cost: a handful of console.log calls at page load, then done.
 * Not cached in any problematic way — `new Date()` reads the user's clock live.
 */

const ASCII = String.raw`
   _____ _  __ ____
  / ____| |/ /| __ )
  \___ \| ' / |  _ \
  ____) | . \ | |_) |
 |_____/|_|\_\|____/
`;

const ANNIVERSARIES: Record<string, string> = {
  // MM-DD (month is 1-indexed here for readability)
  '12-14': "ps: today's my birthday 🎂",
  '1-3': 'ps: i got my first job on this day!',
};

function pickGreeting(hour: number): string {
  if (hour < 5)  return 'hello, night owl';
  if (hour < 12) return 'good morning, early bird';
  if (hour < 17) return 'good afternoon, stranger';
  if (hour < 21) return 'good evening, curious one';
  return 'hello, night owl';
}

export function runConsoleEasterEgg() {
  if (typeof console === 'undefined' || typeof window === 'undefined') return;

  const now = new Date();
  const greeting = pickGreeting(now.getHours());
  const anniversaryKey = `${now.getMonth() + 1}-${now.getDate()}`;
  const anniversary = ANNIVERSARIES[anniversaryKey];

  const ACCENT = 'color: #00ff00; font-family: monospace;';
  const BRIGHT = `${ACCENT} font-weight: bold; font-size: 13px;`;
  const MUTED  = 'color: #666; font-family: monospace; font-size: 11px;';
  const ART    = `${ACCENT} font-size: 11px; line-height: 1.1;`;

  console.log(`%c${ASCII}`, ART);
  console.log(`%c// ${greeting}.`, BRIGHT);
  if (anniversary) console.log(`%c// ${anniversary}`, BRIGHT);
  console.log('%c// five things hide on this page. start with "help".', MUTED);
  console.log('%c// or try: snake · reflex · racer · T · help', MUTED);
  console.log('%c// built by subhayu → https://github.com/subhayu99', MUTED);
}
