# Advanced Customization Guide

This guide is for developers who want to customize the portfolio template beyond just updating the resume — terminal mode, GUI mode, splash page, and the build pipeline that emits both the PDF resume and the website JSON from `resume.yaml`.

## 🎯 Prerequisites

- Node.js 18+ and npm
- Git
- Basic knowledge of React, TypeScript, and YAML
- Text editor or IDE (VS Code recommended)

## 🚀 Development Setup

### 1. Clone and Install

```bash
# Clone your forked repository
git clone https://github.com/yourusername/yourusername.github.io.git
cd yourusername.github.io

# Install dependencies
npm install
```

### 2. Configure Template Files

```bash
# Copy example configuration files
cp template.config.yaml.example template.config.yaml
cp .env.example .env
cp client/public/manifest.json.example client/public/manifest.json

# Copy data files if you want to customize them
cp client/public/data/styled_name.txt.example client/public/data/styled_name.txt
cp client/public/data/neofetch.txt.example client/public/data/neofetch.txt
cp client/public/data/neofetch-small.txt.example client/public/data/neofetch-small.txt
```

### 3. Add Your Resume

Either:
- Create `resume.yaml` using [app.rendercv.com](https://app.rendercv.com)
- Or copy and modify one of the examples:
  ```bash
  cp resume.yaml.example resume.yaml
  # Or for specific personas:
  cp examples/resumes/designer.yaml resume.yaml
  cp examples/resumes/product-manager.yaml resume.yaml
  cp examples/resumes/student.yaml resume.yaml
  ```

### 4. Generate Resume Data

```bash
# Generate resume PDF, JSON, and other assets
npm run generate-resume

# For development (with different settings)
npm run generate-resume:dev

# For production
npm run generate-resume:prod
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` - the site will hot-reload as you make changes!

## 🎨 Customization Options

### Configuration Files Overview

| File | Purpose | Difficulty |
|------|---------|-----------|
| `resume.yaml` | Your resume data | Easy |
| `template.config.yaml` | Site-wide settings | Easy-Medium |
| `.env` | Environment variables | Easy |
| `resume.config.yaml` | Resume generation settings | Medium |
| `client/public/manifest.json` | PWA configuration | Easy |
| `client/src/config/*.ts` | UI text and settings | Medium |
| `client/src/lib/themes.ts` | Theme definitions | Medium-Hard |

### Site-Wide Configuration

Edit `template.config.yaml`:

```yaml
site:
  title: "My Custom Portfolio"
  author: "Your Name"
  baseUrl: "https://yourusername.github.io"

terminal:
  defaultTheme: "matrix"  # matrix, blue, purple, amber, red
  saveThemePreference: true

  features:
    commandHistory: true
    autoComplete: true
    typewriterEffect: true
    pwaInstall: true

pwa:
  enabled: true
  name: "Your Name - Portfolio"
  shortcuts:
    - name: "About Me"
      command: "about"
    - name: "My Projects"
      command: "projects"
```

### Environment Variables

Edit `.env` for local development:

```env
# Base path for routing (usually "/" for GitHub Pages)
VITE_BASE_PATH=/

# Your site URL
VITE_BASE_URL=https://yourusername.github.io

# Optional: Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional: GitHub token for live stats
VITE_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

**Note:** For production, set these in GitHub repository settings:
- **Settings** → **Secrets and variables** → **Actions** → **Variables**

### Resume Generation Config

Edit `resume.config.yaml` to customize how your resume is processed:

```yaml
# Input/Output Paths
paths:
  source: "resume.yaml"
  outputDir: "client/public/data"
  resumePdf: "client/public/resume.pdf"
  resumeMd: "client/public/resume.md"

# What to generate
build:
  generatePdf: true
  generateMarkdown: true
  generateJson: true
  verbose: true

# Field mappings - customize how resume fields appear in JSON
fields:
  projectSections:
    - "Professional Experience"
    - "Projects"
    - "Personal Projects"
  filterField: "show_on_resume"

# Transform resume text (e.g., bold text)
transforms:
  - pattern: '\*\*(.*?)\*\*'
    replacement: '<b>$1</b>'
```

## 🎨 Custom Fields & Dynamic Sections in Resume

### Overview

The template supports adding **any custom fields** AND **any custom sections** to your resume YAML. This feature provides maximum flexibility while maintaining compatibility with RenderCV.

**How it works:**

**Custom Fields:**
1. Custom fields are defined in your `resume.yaml` within existing sections
2. Zod schemas use `.passthrough()` to accept extra fields
3. Custom fields are preserved in `resume.json` (web interface)
4. Custom fields are auto-stripped when generating PDF (RenderCV compatibility)

**Dynamic Sections:**
1. Dynamic sections (like `certifications`, `awards`, etc.) can be added to your resume
2. Zod schema uses `.catchall()` to validate arbitrary section names
3. Dynamic sections automatically become terminal commands (e.g., `certifications`, `awards`)
4. Entry types are auto-detected for proper rendering
5. RenderCV compatibility maintained through entry type detection

### Adding Custom Fields

You can add custom fields to any section of your resume:

#### Social Networks

```yaml
social_networks:
  - network: "LinkedIn"
    username: "yourname"
    # ✨ Custom fields:
    profile_url: "https://linkedin.com/in/yourname"
    verified: true
    followers: 5000
    connection_count: 1200
```

#### Technologies

```yaml
technologies:
  - label: "Languages"
    details: "JavaScript, TypeScript, Python"
    # ✨ Custom fields:
    proficiency_level: "Expert"
    years_experience: 5
    certifications: ["AWS Certified", "Google Cloud Professional"]
    favorite: true
```

#### Experience

```yaml
experience:
  - company: "Tech Company"
    position: "Senior Engineer"
    start_date: "2021-06"
    # ✨ Custom fields:
    github_team: "tech-company/platform"
    tech_stack: ["React", "Node.js", "PostgreSQL", "AWS"]
    team_size: 8
    employment_type: "Full-time"
    manager: "Jane Doe"
    reports: 3
    budget_managed: "$2M"
    achievements_count: 15
```

#### Education

```yaml
education:
  - institution: "University of Technology"
    degree: "B.S. Computer Science"
    start_date: "2014"
    end_date: "2018"
    # ✨ Custom fields:
    gpa: 3.8
    max_gpa: 4.0
    honors: "Magna Cum Laude"
    thesis_title: "Machine Learning in Distributed Systems"
    advisor: "Dr. Smith"
    scholarships: ["Presidential Scholarship", "Dean's List"]
    clubs: ["ACM", "IEEE", "Robotics Club"]
```

#### Projects

```yaml
professional_projects:
  - name: "E-Commerce Platform"
    date: "2023-06"
    # ✨ Custom fields:
    github_repo: "https://github.com/company/ecommerce"
    live_url: "https://shop.example.com"
    tech_stack: ["React", "TypeScript", "Next.js", "Tailwind"]
    role: "Tech Lead"
    team_size: 6
    duration_months: 8
    impact_metrics:
      conversion_rate_increase: "25%"
      load_time_reduction: "50%"
      lighthouse_score: 95
```

### Implementation Details

**Schema Definition** (`shared/schema.ts`):

All schemas use `.passthrough()`:

```typescript
export const experienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  location: z.string().optional(),
  start_date: z.string(),
  end_date: z.string().optional(),
  highlights: z.array(z.string()).default([]),
}).passthrough(); // ← Allows any extra fields
```

**Build Pipeline** (`scripts/generate-resume.js`):

Custom fields are automatically handled:

```typescript
// For web interface: custom fields preserved in resume.json
const websiteData = fullData; // Includes all custom fields

// For PDF generation: custom fields stripped for RenderCV
const rendercvData = stripCustomFields(resumeData);
```

**RenderCV Compatibility**:

The `stripCustomFields()` function maintains a whitelist of RenderCV-supported fields:

```javascript
const RENDERCV_ALLOWED_FIELDS = {
  social_networks: ['network', 'username'],
  technologies: ['label', 'details'],
  experience: ['company', 'position', 'location', 'start_date', 'end_date', 'highlights'],
  // ... other sections
};
```

### Accessing Custom Fields in Code

If you want to display custom fields in terminal mode (GUI mode renders them automatically from the JSON):

**In `client/src/hooks/useTerminal.ts`:**

```typescript
const showExperience = useCallback(() => {
  const experiences = portfolioData.cv.sections?.experience || [];

  experiences.forEach((exp) => {
    addLine(`${exp.position} at ${exp.company}`, 'text-terminal-bright-green');

    // Access custom fields
    if (exp.tech_stack) {
      addLine(`  Tech Stack: ${exp.tech_stack.join(', ')}`, 'text-terminal-green');
    }

    if (exp.team_size) {
      addLine(`  Team Size: ${exp.team_size}`, 'text-terminal-green');
    }

    if (exp.github_team) {
      addLine(`  GitHub: ${exp.github_team}`, 'text-terminal-green');
    }
  });
}, [portfolioData, addLine]);
```

### TypeScript Support

Custom fields are type-safe thanks to `.passthrough()`. TypeScript will infer the base schema and allow additional properties:

```typescript
import type { Experience } from '@/shared/schema';

// Base fields are typed
const exp: Experience = {
  company: "Acme Corp",
  position: "Engineer",
  start_date: "2021-06",
};

// Custom fields also work
const expWithCustom = {
  ...exp,
  tech_stack: ["React", "Node.js"], // ✅ Works!
  team_size: 8,                     // ✅ Works!
};
```

### Best Practices

1. **Naming**: Use snake_case for consistency with existing fields
2. **Types**: Keep types simple (string, number, boolean, array)
3. **Optional**: Assume all custom fields are optional
4. **Documentation**: Comment your custom fields in `resume.yaml`
5. **Testing**: Test both web interface and PDF generation

### Example: Full Custom Resume

```yaml
cv:
  name: "Jane Developer"
  custom_title: "🚀 Full-Stack Wizard"  # ✨ Custom!

  social_networks:
    - network: "LinkedIn"
      username: "jane-developer"
      profile_url: "https://linkedin.com/in/jane-developer"  # ✨ Custom!
      verified: true  # ✨ Custom!
      premium: true  # ✨ Custom!

  sections:
    experience:
      - company: "Tech Startup"
        position: "Senior Engineer"
        start_date: "2021-06"
        tech_stack: ["React", "Node.js", "PostgreSQL"]  # ✨ Custom!
        github_team: "tech-startup/platform"  # ✨ Custom!
        team_culture_rating: 5  # ✨ Custom!
        remote_friendly: true  # ✨ Custom!
        highlights:
          - "Led microservices migration"
```

This custom data works seamlessly:
- ✅ Validates with Zod schema
- ✅ Appears in web interface (custom fields render automatically!)
- ✅ Auto-stripped for PDF generation
- ✅ No errors, no manual management

### Adding Dynamic Sections

Beyond custom fields, you can add completely new sections with any name you want! These sections automatically become terminal commands.

**Example: Certifications**

```yaml
certifications:
  - name: "AWS Certified Solutions Architect"
    date: "2024-03"
    highlights:
      - "Demonstrated expertise in cloud architecture"
    issuer: "Amazon Web Services"  # ✨ Custom field!
    certification_id: "AWS-123"  # ✨ Custom field!
```

Type `certifications` in the terminal → see your certifications displayed automatically!

**More Examples:**

```yaml
awards:
  - name: "Engineering Excellence Award"
    date: "2024-01"
    awarded_by: "Tech Corp"

languages:  # Simple text entries
  - "English (Native)"
  - "Spanish (Professional)"

volunteer_work:
  - name: "Code Mentor at Local Bootcamp"
    date: "2023-2024"
    highlights:
      - "Mentored 15+ junior developers"
```

**Supported entry types:**
- **NormalEntry** (name-based): certifications, awards, volunteer_work
- **ExperienceEntry** (company-based): internships, freelance
- **EducationEntry** (institution-based): training, bootcamps
- **OneLineEntry** (label-details): interests, skills
- **TextEntry** (strings): languages, hobbies

See `resume.yaml.example` and `FUTURE_ENHANCEMENTS.md` for complete documentation.

## 🎨 Creating Custom Themes

Themes are defined in `client/src/lib/themes.ts`.

### Add a New Theme

```typescript
export const themes: Record<string, Theme> = {
  // ... existing themes ...

  // Your custom theme
  cyberpunk: {
    name: 'Cyberpunk',
    background: '#0a0e27',
    text: '#00f0ff',
    primary: '#ff006e',
    secondary: '#8338ec',
    accent: '#ffbe0b',
    success: '#06ffa5',
    error: '#ff006e',
    warning: '#ffbe0b',
    border: '#ff006e',
  },
};
```

### Theme Properties

| Property | Description | Example |
|----------|-------------|---------|
| `name` | Display name | "Cyberpunk" |
| `background` | Terminal background | "#0a0e27" |
| `text` | Default text color | "#00f0ff" |
| `primary` | Main accent color | "#ff006e" |
| `secondary` | Secondary color | "#8338ec" |
| `accent` | Highlight color | "#ffbe0b" |
| `success` | Success messages | "#06ffa5" |
| `error` | Error messages | "#ff006e" |
| `warning` | Warning messages | "#ffbe0b" |
| `border` | UI borders | "#ff006e" |

After adding a theme, users can activate it with: `theme cyberpunk`

## 💻 Adding Custom Commands

Commands are handled in `client/src/hooks/useTerminal.ts`.

### Simple Command Example

```typescript
// 1. Create the command function
const showJoke = useCallback(() => {
  const jokes = [
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "Why did the developer go broke? Because he used up all his cache!",
  ];
  const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
  addLine(randomJoke, 'text-terminal-green');
}, [addLine]);

// 2. Add to the switch statement in executeCommand
case 'joke':
  showJoke();
  break;

// 3. Add to command lists
const commands = ['help', ..., 'joke'];

// 4. Add to dependency array
}, [..., showJoke]);
```

### Complex Command with Arguments

```typescript
const showQuote = useCallback((args: string[]) => {
  const category = args[0] || 'motivation';

  const quotes = {
    motivation: ["Believe in yourself!", "You got this!"],
    tech: ["Code is poetry.", "Keep learning!"],
  };

  if (!quotes[category]) {
    addLine(`Unknown category: ${category}`, 'text-terminal-red');
    addLine('Available: motivation, tech', 'text-terminal-yellow');
    return;
  }

  const randomQuote = quotes[category][Math.floor(Math.random() * quotes[category].length)];
  addLine(randomQuote, 'text-terminal-green');
}, [addLine]);

// Usage: quote tech
case 'quote':
  showQuote(args.slice(1));
  break;
```

### Add to Help Menu

Update the `showHelp` function in `useTerminal.ts`:

```typescript
<div class="grid grid-cols-12 gap-4">
  <div class="col-span-3 bg-terminal-green/10">
    <span class="text-terminal-yellow font-semibold">
      <a href="?cmd=joke" class="hover:text-terminal-bright-green hover:underline">joke</a>
    </span>
  </div>
  <div class="col-span-9 bg-terminal-green/5">
    <span class="text-white">Tell a random programming joke</span>
  </div>
</div>
```

## 🎭 Customizing UI Components

### Modify Terminal Prompt

Edit `client/src/config/terminal.config.ts`:

```typescript
export const terminalConfig = {
  prompt: {
    username: 'hacker',      // Change from 'guest'
    hostname: 'mainframe',   // Change from 'portfolio'
    directory: '~/secure',   // Change from '~'
    symbol: '#',             // Change from '$'
  },
  // ...
};
```

Result: `hacker@mainframe:~/secure#`

### Modify UI Text

Edit `client/src/config/ui.config.ts`:

```typescript
export const uiText = {
  welcome: {
    greeting: "Welcome to my digital workspace!",
    tagline: "Software Engineer | AI Specialist | Cloud Architect",
    // ...
  },

  messages: {
    error: {
      commandNotFound: "❌ Command '{cmd}' not found. Type 'help' for available commands.",
      // ...
    },
  },
};
```

## ✨ GUI Mode Customization

GUI mode (the editorial/scroll view) shares the same data and accent-color theming as terminal mode but has its own typography, animations, and section layouts. Most customization happens in code — there is no single config file that controls everything — but the entry points are documented here so you know where to look.

### Accent Color (shared with terminal)

The accent color is **single source of truth** for both modes. Themes are defined in `client/src/config/gui-theme.config.ts`:

```typescript
export const colorThemes: ColorTheme[] = [
  { key: 'matrix',  name: 'Matrix Green',     accentRgb: [0, 255, 0],     accentHoverRgb: [0, 200, 0] },
  { key: 'amber',   name: 'Vintage Amber',    accentRgb: [255, 120, 0],   accentHoverRgb: [210, 95, 0] },
  // ...add your own theme here
];
```

Calling `applyColorTheme(theme)` (already wired up via the `theme` terminal command) propagates the RGB tuple into all of these CSS variables in `client/src/index.css`:

```
--gui-accent          /* the bright accent (CTAs, headings, dots) */
--gui-accent-hover    /* slightly darker variant for hover states */
--gui-accent-rgb      /* "r, g, b" for use in rgba() */
--gui-accent-ch       /* HSL channel for terminal scanline glow */
```

Plus the terminal HSL variables (`--terminal-bright-green` etc.). To add a custom theme, append a new entry to `colorThemes` — that's it; no other code changes required.

### Splash Page

The splash page shows on first visit (per browser session) and lets the visitor pick TERMINAL or GUI. Behavior lives in `client/src/hooks/useViewMode.ts`:

- **Disable splash entirely / change default mode:** edit `getInitialViewMode()` to return `'gui'` or `'terminal'` instead of `'splash'`.
- **Auto-advance timing:** `client/src/components/SplashPage.tsx` defines `IDLE_MS` (default `6000`). After that many ms of inactivity, the splash auto-progresses to GUI.
- **Tagline:** auto-derived from your CV data via `deriveTagline()` in `SplashPage.tsx` (e.g. `"Data Engineer | 4 Years | 43k+ PyPI Downloads"`). Numbers come from PyPI stats + experience date math; no hardcoded text to edit.

URL hashes bypass the splash on direct load: linking someone to `https://your-site.github.io/#gui` mounts GUI mode immediately.

### Section Visibility

GUI sections **auto-hide when their data is empty** — no flag needed. Each section component returns `null` if its data array is missing or empty, e.g. in `client/src/components/gui/ExperienceSection.tsx`:

```typescript
if (!experience?.length) return null;
```

So if your `resume.yaml` has no `publications`, the GUI Publications section silently disappears. Note that **`show_on_resume: false`** only excludes an entry from the **PDF** — GUI mode still renders it.

### Animations

Framer Motion configs are hardcoded inline in components (no central config). The most useful single file is `client/src/components/gui/SectionWrapper.tsx`, which defines the six entrance variants used across all sections:

```typescript
'fade-up': {
  initial: { opacity: 0, y: 60, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
},
// also: 'fade-left', 'fade-right', 'scale-up', 'split-open', 'blur-rise'
```

To slow everything down, bump the `duration` values; to disable entrance animations entirely, pass `variant="none"` from the consuming sections.

### Hero Typography & Stats

The hero's massive name typography (`text-7xl` / `text-[12rem]` responsive) lives in `client/src/components/gui/HeroSection.tsx` — Tailwind utility classes, not configurable via YAML. The font stack itself is set in `client/src/index.css` via the `font-display` class.

Hero stat boxes (Years / Clients / Downloads / Packages) are derived automatically by `deriveStats()` in `HeroSection.tsx`. The function picks the top 4 stats by priority from your CV data (experience years, professional project count, PyPI downloads, etc.). To force a specific stat or hide one, edit the priority list directly in that function.

### Summary

| What you want to change | Where to edit |
|---|---|
| Add a custom accent color | `client/src/config/gui-theme.config.ts` |
| Default to GUI/terminal (skip splash) | `client/src/hooks/useViewMode.ts` |
| Splash auto-advance timing | `client/src/components/SplashPage.tsx` (`IDLE_MS`) |
| Animation timing/easing | `client/src/components/gui/SectionWrapper.tsx` |
| Hero stat selection | `client/src/components/gui/HeroSection.tsx` (`deriveStats`) |
| Hide a GUI-only section | Just remove the data from `resume.yaml` |

## 🌐 API Integrations

### GitHub Stats (Live Repo Data)

```typescript
// In a new command or component
const fetchGitHubStats = async () => {
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  const username = 'yourusername';

  const response = await fetch(`https://api.github.com/users/${username}`, {
    headers: token ? { Authorization: `token ${token}` } : {},
  });

  const data = await response.json();

  addLine(`📊 GitHub Stats:`, 'text-terminal-bright-green');
  addLine(`   Repos: ${data.public_repos}`, 'text-terminal-green');
  addLine(`   Followers: ${data.followers}`, 'text-terminal-green');
  addLine(`   Following: ${data.following}`, 'text-terminal-green');
};
```

### OpenAI Integration (Resume Analyzer)

```typescript
const analyzeResume = async () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    addLine('⚠️  OpenAI API key not configured', 'text-terminal-yellow');
    return;
  }

  addLine('🤖 Analyzing resume with AI...', 'text-terminal-green');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `Analyze this resume and provide 3 improvement suggestions: ${JSON.stringify(portfolioData)}`,
        },
      ],
    }),
  });

  const data = await response.json();
  addLine(data.choices[0].message.content, 'text-terminal-green');
};
```

## 📱 PWA Customization

### Update Manifest

Edit `client/public/manifest.json`:

```json
{
  "name": "Your Name - Developer Portfolio",
  "short_name": "Portfolio",
  "description": "Interactive portfolio showcasing my work",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#00ff00",
  "icons": [
    {
      "src": "/icons/android-icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "View Projects",
      "short_name": "Projects",
      "url": "/?cmd=projects",
      "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }]
    }
  ]
}
```

### Custom Icons

Replace icons in `client/public/icons/`:
- `android-icon-36x36.png`
- `android-icon-48x48.png`
- `android-icon-72x72.png`
- `android-icon-96x96.png`
- `android-icon-144x144.png`
- `android-icon-192x192.png`

## 🎨 Custom ASCII Art

### Styled Name Banner

Create `client/public/data/styled_name.txt`:

```
 __   __                 _   _
 \ \ / /__  _   _ _ __  | \ | | __ _ _ __ ___   ___
  \ V / _ \| | | | '__| |  \| |/ _` | '_ ` _ \ / _ \
   | | (_) | |_| | |    | |\  | (_| | | | | | |  __/
   |_|\___/ \__,_|_|    |_| \_|\__,_|_| |_| |_|\___|
```

Generate at [patorjk.com/software/taag](https://patorjk.com/software/taag/)

### Neofetch Banner

Create `client/public/data/neofetch.txt`:

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃      Welcome to MyOS v2.0.0           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  [💻 Frontend]  [⚙️  Backend]  [☁️  Cloud]
       ▲             ▲            ▲
       └─────────┐   │  ┌─────────┘
                 ▼   ▼  ▼
   [🎨 Design]◀──▶[🧠 AI]◀──▶[🔒 Security]

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃       BUILT WITH PASSION              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

 Your Name
 Portfolio: yoursite.com
 GitHub: @yourusername
```

## 🔌 Extending Functionality

### Add New Pages/Routes

The template is a single-page application. To add routing:

1. Install React Router:
   ```bash
   npm install react-router-dom
   ```

2. Wrap app in router (`client/src/main.tsx`):
   ```typescript
   import { BrowserRouter } from 'react-router-dom';

   ReactDOM.createRoot(document.getElementById('root')!).render(
     <React.StrictMode>
       <BrowserRouter basename={import.meta.env.BASE_URL}>
         <App />
       </BrowserRouter>
     </React.StrictMode>
   );
   ```

3. Create route components and use command navigation.

### Add Database (Backend)

For dynamic features like visitor counter or comments:

1. Use a serverless backend (Vercel, Netlify Functions, Cloudflare Workers)
2. Or integrate with Firebase, Supabase, or PlanetScale
3. Make API calls from your commands

Example with Firebase:
```bash
npm install firebase
```

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  // Your config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// In your command
const getVisitorCount = async () => {
  const snapshot = await getDocs(collection(db, 'visitors'));
  addLine(`Total visitors: ${snapshot.size}`, 'text-terminal-green');
};
```

## 🧪 Testing

### Run Type Check

```bash
npm run type-check
```

### Build Test

```bash
npm run build
npm run preview
```

Visit `http://localhost:4173` to test production build.

### Test Resume Generation

```bash
# Test with verbose output
npm run generate-resume:dev
```

Check generated files:
- `client/public/data/resume.json`
- `client/public/resume.pdf`
- `client/public/resume.md`

## 📦 Deployment

### GitHub Pages (Recommended)

Already configured! Just push to `main`:

```bash
git add .
git commit -m "Custom modifications"
git push origin main
```

GitHub Actions will automatically build and deploy.

### Custom Domain

1. Add `CNAME` file to `client/public/`:
   ```
   yourdomain.com
   ```

2. Configure DNS:
   - Add A records pointing to GitHub Pages IPs:
     - 185.199.108.153
     - 185.199.109.153
     - 185.199.110.153
     - 185.199.111.153
   - Or add CNAME record: `yourusername.github.io`

3. Enable HTTPS in repository settings

### Other Platforms

**Vercel:**
```bash
npm install -g vercel
vercel
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy
```

**Cloudflare Pages:**
- Connect GitHub repo in Cloudflare dashboard
- Build command: `npm run build`
- Publish directory: `dist/public`

## 🐛 Debugging

### Enable Verbose Logging

```typescript
// In client/src/hooks/useTerminal.ts
console.log('Command executed:', command);
console.log('Portfolio data:', portfolioData);
```

### Check Build Output

```bash
# Build with verbose logging
npm run build -- --debug

# Check output size
du -sh dist/public
```

### Inspect Generated Resume

```bash
# Pretty-print JSON
cat client/public/data/resume.json | jq '.'

# Check PDF was generated
ls -lh client/public/resume.pdf
```

## 🎯 Performance Optimization

### Code Splitting

Lazy load heavy components:

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./components/HeavyComponent'));

// In render:
<Suspense fallback={<div>Loading...</div>}>
  <HeavyComponent />
</Suspense>
```

### Optimize Images

```bash
# Install image optimizer
npm install -D vite-plugin-image-optimizer

# Add to vite.config.ts
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

plugins: [
  ViteImageOptimizer(),
]
```

## 📚 Further Reading

- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [RenderCV Documentation](https://docs.rendercv.com/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

---

**Questions?** Open an issue or discussion on GitHub!
