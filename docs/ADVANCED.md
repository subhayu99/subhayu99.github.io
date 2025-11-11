# Advanced Customization Guide

This guide is for developers who want to customize the terminal portfolio beyond just updating the resume.

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
  name: "Your Name - Terminal Portfolio"
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
  "description": "Interactive terminal portfolio showcasing my work",
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
