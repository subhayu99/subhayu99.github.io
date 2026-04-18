import { useEffect } from 'react';

/**
 * When the user switches away from this tab, the document title flips to a
 * playful "come back" message. Switching back restores the original title.
 *
 * Cost: a single visibilitychange listener. No re-renders, no polling.
 */
const TAB_OUT_TITLES = [
  '← come back, curious one',
  "hey, where'd you go?",
  "i'm still here...",
  "don't leave yet :(",
  'the matrix misses you',
  'still rendering without you',
];

export function useTabOutTitle() {
  useEffect(() => {
    const originalTitle = document.title;

    const onVisChange = () => {
      if (document.hidden) {
        const msg = TAB_OUT_TITLES[Math.floor(Math.random() * TAB_OUT_TITLES.length)];
        document.title = msg;
      } else {
        document.title = originalTitle;
      }
    };

    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      document.title = originalTitle;
    };
  }, []);
}
