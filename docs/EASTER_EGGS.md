# Easter Eggs & Hidden Features

Map of every easter egg baked into the portfolio. Kept here so none of this
gets lost when context or memory fades.

Two categories:

- **Triggers** — user does something → something happens. Listed in the
  in-app HelpSheet (type `help` or flip phone on mobile).
- **Ambient** — things that just happen. Discovered by accident. Not listed
  in HelpSheet on purpose — the delight is in stumbling on them.

---

## Triggers

| # | Feature        | Desktop                         | Mobile                                 |
|---|----------------|---------------------------------|----------------------------------------|
| 1 | Color theme    | `T`, or `T1`–`T5`               | shake device (3 quick shakes)          |
| 2 | Snake          | type `snake`                    | long-press "PyPI Downloads" stat (2s) — Python 🐍 |
| 3 | Reflex         | type `reflex`                   | triple-tap the hero name               |
| 4 | Infinity Racer | type `racer`                    | long-press "Years Experience" stat (2s)|
| 5 | Help sheet     | type `help`                     | flip device (face-down → face-up)      |
| 6 | Fullscreen     | press `F`, or tap ⛶ in navbar   | tap ⛶ in navbar                         |
| 7 | Mute audio     | press `M`, or tap 🔊 in navbar   | tap 🔊 in navbar                         |

Also: **first splash-page click** → enters fullscreen (session-gated splash
means every new browser session triggers this again).

### URL hash deep-links (shareable)

Any visitor can jump straight into a game by appending a hash to the URL:

| Hash                           | What opens  |
|--------------------------------|-------------|
| `site.com/#snake`              | Snake       |
| `site.com/#racer`              | Infinity Racer |
| `site.com/#reflex`             | Reflex      |
| `site.com/#help`               | Help sheet  |
| `site.com/#gui` / `#terminal`  | View modes (existing) |

On arrival, splash is skipped, GUI mounts, and `GUIPortfolio` reads the
hash and fires the corresponding trigger. When the game closes, the hash
resets to `#gui` so a refresh doesn't re-open it.

**File:** `client/src/hooks/useViewMode.ts` (`GAME_HASHES` set in
`hashToMode`) + `client/src/components/gui/GUIPortfolio.tsx` (hash-watcher
effect + `clearGameHash` wrapper on reset callbacks).

**Core code:** `client/src/hooks/useGestureTrigger.ts` (keyword + accelerometer
triggers), `client/src/components/gui/StatCard.tsx` (long-press hook),
`client/src/components/gui/HelpSheet.tsx` (cheat sheet), `client/src/App.tsx`
(F-key + first-mount console welcome), `client/src/lib/fullscreen.ts`
(request/exit helpers), `client/src/components/SplashPage.tsx`
(splash-click fullscreen), `client/src/hooks/useViewMode.ts`
(sessionStorage-based view mode).

---

## Ambient easter eggs

### Scattered `secret-text` reveal-on-select clues

Hidden puzzle hints invisible until the reader selects text. One per section
for natural scatter — each clue points at one trigger.

| Section       | Clue                                                                          | Points to |
|---------------|-------------------------------------------------------------------------------|-----------|
| Hero          | `// the cake is a lie. a single T spills over the world.`                     | theme     |
| About         | `// you found a secret. spell what slithers (5 keys) and something hisses...` | snake     |
| Experience    | `// name the one who races through life (5 keys).`                            | racer     |
| Education     | `// still curious? the word IS the feeling — type it quick (6 keys).`         | reflex    |
| Publication   | `// stuck in the maze? "help" unlocks it.`                                    | help      |
| Contact       | `// i'm happy where i am — will update when i need a job!`                    | tone/confidence signal |

**CSS:** `.secret-text { color: transparent; }` + selection color override.
See `client/src/index.css` around the `Select-to-Reveal` comment.

### Matrix rain hidden messages

Occasional English phrases scroll down columns in the rain, readable
top-to-bottom. 3.5% chance per column wrap. **Life 3–5 seconds** — if you
didn't catch it, it dissolves back into random noise mid-column.

Pool (23+ and growing, see `HIDDEN_MESSAGES`): `wake up`, `hi curious`,
`hello world`, `you saw this`, `not random`, `i was here`, `follow me`,
`there is no spoon`, `keep looking`, `dont panic`, `need help?`,
`wake up neo`, `not a bug`, `stay curious`, `happy hunting`, `keep watching`,
`decode me`, `i see you`, `nothing is random`, `think harder`, `youre close`,
`breathe deep`, `ding ding`, `have some coffee`, …

**File:** `client/src/components/gui/MatrixRain.tsx`.

### Rare unicode glyphs in matrix rain

Occasionally a single glyph flashes for one frame in place of a random char
— catches the corner of your eye, makes you doubt you saw it.

Pool: `♥ ★ ✦ ☕ ☽ ☾ ♠ ♦ ⚡ ☄ ✧ ♪`.
Probability: **0.08% per char per frame** → ~1-2 sightings per minute of idle.

**File:** `client/src/components/gui/MatrixRain.tsx` (`RARE_GLYPHS`).

### Ball whispers before burst

The scroll-ball that follows your path through the page whispers a tiny word
~1s before it bursts (warning phase). **9px lowercase accent-70% opacity** —
small enough you have to notice on purpose.

Pool (~21 options): `hii`, `boo`, `wake up`, `peek!`, `shhh`, `poof`, `boom`,
`bye`, `uwu`, `hmm`, `pop`, `zap`, `puff`, `fizz`, `psst`, `yo`, `hi :)`,
`oops`, `ta-da`, `bam`, `whoosh`, …

**File:** `client/src/components/gui/ScrollBallGame.tsx` (`BURST_MSGS`).

### Tab-out title swap

When you switch tabs away, `document.title` flips to a playful "come back"
line. Restores on return.

Pool: `← come back, curious one`, `hey, where'd you go?`,
`i'm still here...`, `don't leave yet :(`, `the matrix misses you`,
`still rendering without you`.

**File:** `client/src/hooks/useTabOutTitle.ts`.

### Console welcome (DevTools only)

On page load, a themed ASCII signature prints to console plus:

- Time-aware greeting (`night owl` / `early bird` / `afternoon, stranger` / `evening, curious one`)
- Anniversary line on specific dates (see below)
- Subtle hints about all trigger keywords
- GitHub URL

**File:** `client/src/lib/consoleEasterEgg.ts`. Called once from `App.tsx`.

### Anniversary greetings

Date-gated lines appended to the console welcome on specific days:

- **Dec 14** → `ps: today's my birthday 🎂`
- **Jan 3** → `ps: i got my first job on this day!`

**File:** `client/src/lib/consoleEasterEgg.ts` (`ANNIVERSARIES` map).
To add: `'<month-1-indexed>-<day>': 'your message'`.

### Procedural audio (Racer only)

Web Audio API — fully procedural, zero asset files. Unlocks on first
user gesture (click / keypress). Preference stored in `localStorage`.

- **Start chime** — square sweep 320→820Hz when going demo→live
- **Engine rumble** — detuned sawtooths (128 + 131Hz) + octave square +
  bandpassed noise + 9Hz LFO cylinder-firing pulse. Pitch & LFO rate
  both track `game.speed` for real rev feel.
- **Collision crunch** — sub-bass thump + bandpass noise + metallic hit,
  3 layered oscillators.
- **Fall off road** — distinct Doppler wail 1100→90Hz + air-whoosh noise,
  fires instantly when ship crosses edge.
- **Life lost** — triangle descending "uh-oh", plays alongside collisions.
- **Game over** — three-note triangle cascade (C5 → G4 → C4) with
  octave-doubled body.

**File:** `client/src/lib/audio.ts`. Mute via **M** key or 🔊 in navbar.

### Other ambient effects (already present before this iteration)

- `CursorTrail.tsx` — amber dots trailing the cursor on desktop.
- `MouseSpotlight.tsx` — soft radial light following the cursor.
- `FilmGrain.tsx` — subtle grain texture overlay.
- `WireframeGrid.tsx` — faint grid background.
- `KonamiEasterEgg.tsx` — ↑↑↓↓←→←→BA theme flash.

---

## How to add a new trigger

1. Add keyword / gesture detection in `hooks/useGestureTrigger.ts` — mirror the
   existing `snakeActive` / `reflexActive` / `racerActive` patterns.
2. Create the game/overlay component under `components/gui/` (see
   `SnakeGame.tsx`, `ReflexGame.tsx`, `RacerGame.tsx` as templates).
3. Wire both into `GUIPortfolio.tsx`: destructure the new `active` + reset/
   trigger, render `<NewFeature active={...} onClose={...} />`.
4. Add a row to `HelpSheet.tsx`'s `TRIGGERS` array.
5. Optionally scatter a `secret-text` clue in a relevant section.

## How to add an ambient easter egg

1. Pick the right layer — passive ones live as effects in existing components
   (`MatrixRain`, `ScrollBallGame`) or as app-level hooks (`useTabOutTitle`).
2. Do **not** add it to HelpSheet — ambient eggs rely on stumbling-discovery.
3. Document it here so it doesn't vanish into the codebase.
