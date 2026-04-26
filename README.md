# 🖥️ Portfolio Template

> Create your own interactive portfolio in minutes — terminal mode + editorial GUI mode, one `resume.yaml`, deployed to GitHub Pages with zero code.

**Live Demo:** [subhayu99.github.io](https://subhayu99.github.io)

[![Stars](https://img.shields.io/github/stars/subhayu99/subhayu99.github.io?style=flat-square&logo=github&color=2ea043)](https://github.com/subhayu99/subhayu99.github.io/stargazers)
[![Forks](https://img.shields.io/github/forks/subhayu99/subhayu99.github.io?style=flat-square&logo=github&color=2ea043)](https://github.com/subhayu99/subhayu99.github.io/network/members)
[![Deployed forks](https://img.shields.io/endpoint?url=https://subhayu.in/data/template-stats-badge.json&style=flat-square)](https://subhayu.in/?cmd=showcase)
[![Last commit](https://img.shields.io/github/last-commit/subhayu99/subhayu99.github.io/main?style=flat-square&color=2ea043)](https://github.com/subhayu99/subhayu99.github.io/commits/main)
[![License](https://img.shields.io/github/license/subhayu99/subhayu99.github.io?style=flat-square&color=2ea043)](./LICENSE)

![Portfolio Template Screencast](client/public/screenshots/short-demo.gif)

---

## 🌿 Note: Two-Branch Setup

This repository uses a **dual-branch strategy**:

- **`main` branch** (you are here) → Clean template with .example files only
- **`personal` branch** → Maintainer's actual portfolio (deployed to subhayu99.github.io)

**For template users:** You're in the right place! Fork this repo and GitHub will copy `main` only (the "Copy the `main` branch only" checkbox in the fork dialog is on by default), so you skip all the maintainer's personal data.

**For maintainers:** See [MAINTAINER_GUIDE.md](./MAINTAINER_GUIDE.md) for how to work with both branches.

---

## ✨ Features

- 🎨 **Beautiful Terminal UI** - Retro-style terminal interface with multiple themes
- 📱 **Fully Responsive** - Works perfectly on desktop, tablet, and mobile
- 🚀 **Zero-Code Setup** - Use visual resume builder, no programming needed
- 🤖 **AI Resume Converter** - Convert existing resumes to YAML with AI (built-in!)
- ⚡ **Lightning Fast** - Built with React and Vite for optimal performance
- 📄 **Auto-Generated PDF** - Your resume automatically converts to downloadable PDF
- 🎭 **Multiple Themes** - Matrix, Blue, Purple, Amber, Red, and more
- 🔍 **Smart Search** - Search across all your content instantly
- 📊 **Interactive Commands** - Explore your portfolio through terminal commands
- 💾 **PWA Support** - Installable as a progressive web app with offline capabilities
- 🔒 **Secure** - Built-in XSS protection and Content Security Policy
- ♿ **Accessible** - ARIA labels and keyboard navigation support
- 🔄 **Auto-Deploy** - Push changes to GitHub, site updates automatically
- 🎨 **Custom Fields Support** - Add any custom fields to personalize your resume beyond the standard schema
- 📂 **Dynamic Sections** - Create custom sections (certifications, awards, etc.) that become terminal commands automatically

## 🌟 Easy Mode - Get Started in 10 Minutes

Perfect for non-technical users! No installation of npm, Python, or any tools required.

### Step 1: Create Your Resume

Visit **[app.rendercv.com](https://app.rendercv.com)** and create your resume using the visual builder:

1. Fill in your information (name, email, experience, education, etc.)
2. Add your skills, projects, and achievements
3. Customize sections to match your background
4. Download the YAML file when done

**Time:** ~5 minutes

#### 💡 Pro Tip: Use AI to Convert Your Existing Resume (Even Faster!)

Already have a resume? Skip the manual entry and let AI do the work!

**🤖 Method 1: Built-in AI Resume Converter (Recommended)**

After deploying your portfolio (Steps 2-4), you can use the built-in converter:

1. Visit your live portfolio at `https://yourusername.github.io`
2. Type `replicate` in the terminal
3. Click **"Get AI Conversion Prompt"** button
4. Copy the comprehensive prompt to your clipboard
5. Paste it into ChatGPT, Claude, or Gemini along with your resume
6. Get perfectly formatted `resume.yaml` output
7. Upload it to your repository to update your portfolio

**Time:** ~2 minutes | **Benefit:** Always uses the latest schema format!

**📝 Method 2: Manual AI Conversion (Before Deployment)**

If you want to prepare your resume before deploying:

1. Open [`resume.yaml.example`](./resume.yaml.example) in the template repository
2. Copy its contents
3. Use this prompt with ChatGPT, Claude, or Gemini:
   ```
   I have my resume below. Please convert it to this YAML format:
   [Paste resume.yaml.example contents]

   Here's my resume:
   [Paste your resume text, PDF content, or LinkedIn profile]

   Please maintain all my information but structure it exactly like the example.
   ```
4. Copy the AI-generated YAML and save it as `resume.yaml`

**Why this works:** AI excels at reformatting structured data. You get perfect YAML syntax without learning the format!

### Step 2: Fork This Repo

1. Click the **"Fork"** button at the top of this page (or visit
   [`github.com/subhayu99/subhayu99.github.io/fork`](https://github.com/subhayu99/subhayu99.github.io/fork))
2. **Rename it** to `yourusername.github.io` in the "Repository name" field
   - Replace `yourusername` with your actual GitHub handle — GitHub checks
     availability inline
   - This naming is what makes GitHub Pages serve your site at the root URL
3. Leave **"Copy the `main` branch only"** checked (it's the default) — this
   skips the maintainer's `personal` branch
4. Click **"Create fork"**

**Time:** ~1 minute

> **Why fork instead of "Use this template"?** Forks have an `upstream` remote
> linked back to this repo for free, so you can pull future engine
> improvements with `git fetch upstream main && git merge upstream/main` —
> see [`docs/UPGRADING.md`](./docs/UPGRADING.md). They also count toward
> public adoption stats (run `showcase` on the demo site to see).

### Step 3: Enable GitHub Actions & Pages

**Important:** Do this BEFORE uploading your resume to avoid workflow errors!

1. Go to **Settings** → **Pages** (in left sidebar)
2. Under **"Source"**, select **"GitHub Actions"**
3. Go to **Settings** → **Actions** → **General**
4. Under **"Actions permissions"**, ensure actions are enabled

**Time:** ~1 minute

### Step 4: Upload Your Resume

1. In your new repository, click **"Add file"** → **"Upload files"**
2. Drag and drop your `resume.yaml` file from Step 1
3. Commit the file (click "Commit changes")
4. The deployment will start automatically! Wait 2-5 minutes

**Time:** ~3 minutes (mostly waiting for deployment)

### 🎉 Done!

Your portfolio is now live at: `https://yourusername.github.io`

## 📝 Updating Your Portfolio

To update your information:

1. **Option A:** Edit on GitHub
   - Go to your repository
   - Click on `resume.yaml`
   - Click the pencil icon to edit
   - Make changes and commit

2. **Option B:** Use RenderCV again
   - Update your resume at [app.rendercv.com](https://app.rendercv.com)
   - Download new YAML file
   - Upload to replace old `resume.yaml`

Your site will automatically rebuild and update within 2-5 minutes!

## 🔄 Pulling Engine Updates

Because you forked (not used "Use this template"), your repo has an
`upstream` remote pointing back at the template — pulling future engine
improvements is one command:

```bash
git fetch upstream main
git merge upstream/main
git push origin main
```

Your `resume.yaml`, `manifest.json`, and other personal files stay
untouched. For the auto-PR workflow, conflict recovery, and orphan
migration (people who used the old "Use this template" button), see
[`docs/UPGRADING.md`](./docs/UPGRADING.md).

## 🎨 Customization (Optional)

### Change Theme

Visit your portfolio and use these commands in the terminal:

```bash
theme matrix    # Green Matrix-style (default)
theme blue      # Blue terminal
theme purple    # Purple hacker theme
theme amber     # Vintage amber monitor
theme red       # Red alert theme
```

The theme is saved in your browser, so it persists across visits!

### Custom ASCII Art Name

Create a custom ASCII art version of your name:

1. Go to [patorjk.com/software/taag](https://patorjk.com/software/taag/)
2. Type your name and choose a font
3. Copy the ASCII art
4. Create `client/public/data/styled_name.txt` in your repo
5. Paste the ASCII art and commit

### Custom Profile Banner

Customize the `neofetch` output (the welcome banner):

1. Create `client/public/data/neofetch.txt` in your repo
2. Add your custom ASCII art and info
3. See `client/public/data/neofetch.txt.example` for inspiration

### Progressive Web App Settings

Customize the PWA (installable app) settings:

1. Copy `client/public/manifest.json.example` to `client/public/manifest.json`

2. Edit the file:

   ```json
   {
     "name": "Your Name - Terminal Portfolio",
     "short_name": "Your Portfolio",
     "description": "Your description here"
   }
   ```

3. Commit the changes

### Custom Fields & Dynamic Sections Support

Want to add extra information beyond the standard resume fields? You can add **any custom fields** AND **any custom sections** you want!

**Examples of custom fields you can add:**

```yaml
social_networks:
  - network: "LinkedIn"
    username: "yourname"
    profile_url: "https://linkedin.com/in/yourname"  # ✨ Custom field!
    verified: true  # ✨ Custom field!

technologies:
  - label: "Languages"
    details: "JavaScript, TypeScript, Python"
    proficiency_level: "Expert"  # ✨ Custom field!
    years_experience: 5  # ✨ Custom field!

experience:
  - company: "Tech Company"
    position: "Senior Engineer"
    github_team: "tech-company/platform"  # ✨ Custom field!
    tech_stack: ["React", "Node.js", "AWS"]  # ✨ Custom field!
    team_size: 8  # ✨ Custom field!

education:
  - institution: "University"
    degree: "B.S. Computer Science"
    gpa: 3.8  # ✨ Custom field!
    honors: "Magna Cum Laude"  # ✨ Custom field!

projects:
  - name: "Cool Project"
    date: "2024"
    github_repo: "https://github.com/you/project"  # ✨ Custom field!
    live_url: "https://project.com"  # ✨ Custom field!
    tech_stack: ["React", "TypeScript"]  # ✨ Custom field!

# 🆕 Dynamic Sections! Add ANY section you need:
certifications:
  - name: "AWS Certified Solutions Architect"
    date: "2024-03"
    highlights:
      - "Demonstrated expertise in designing distributed systems"
    issuer: "Amazon Web Services"  # ✨ Custom field!
    certification_id: "AWS-PSA-12345"  # ✨ Custom field!

awards:
  - name: "Engineering Excellence Award"
    date: "2024-01"
    highlights:
      - "Recognized for outstanding technical contribution"
    awarded_by: "Tech Corp"  # ✨ Custom field!

# Simple text entries also work!
languages:
  - "English (Native)"
  - "Spanish (Professional)"
```

**How it works:**

- ✅ **Custom Fields:** Add any extra fields to standard sections - they appear in your portfolio automatically
- ✅ **Dynamic Sections:** Create new sections (like certifications, awards, languages) - they become terminal commands!
- ✅ **Web Interface:** Custom fields and sections are fully accessible in your terminal portfolio
- ✅ **PDF Generation:** Custom fields are automatically stripped for RenderCV compatibility
- ✅ **Zero Errors:** No manual management needed - it just works!
- ✅ **Fully Backward Compatible:** All existing resumes continue to work

**Examples of dynamic sections you can add:**
- `certifications` - Professional certifications
- `awards` - Awards and recognitions
- `languages` - Language proficiencies
- `volunteer_work` - Volunteer experience
- `speaking` - Speaking engagements
- `courses` - Online courses or training
- Any section name you want!

**See [`resume.yaml.example`](./resume.yaml.example) for more examples and inspiration!**

## 🔧 Advanced Mode (For Developers)

Want full control? Clone the repository and customize everything!

### Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- npm or yarn
- Git

### Local Development

```bash
# Clone your repository
git clone https://github.com/yourusername/yourusername.github.io.git
cd yourusername.github.io

# Install dependencies
npm install

# Copy configuration files
cp template.config.yaml.example template.config.yaml
cp .env.example .env
cp client/public/manifest.json.example client/public/manifest.json

# Add your resume
# (Create resume.yaml using RenderCV or copy from examples/)

# Generate resume data
npm run generate-resume

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see your portfolio!

### Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

### Advanced Customization

See the [Advanced Guide](./docs/ADVANCED.md) for:
- Custom themes and colors
- Adding new terminal commands
- Modifying UI components
- API integrations
- Custom features

## 📚 Documentation

- **[Deployment Guide](./docs/DEPLOYMENT.md)** - How GitHub Actions deploys your site
- **[Advanced Guide](./docs/ADVANCED.md)** - Full customization options
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[RenderCV Docs](https://docs.rendercv.com/)** - Resume YAML format reference

## 🎯 Available Commands

Once your portfolio is live, try these commands in the terminal:

| Command | Description |
|---------|-------------|
| `help` | Show all available commands |
| `about` | Display introduction and quick links |
| `skills` | List technical skills and technologies |
| `experience` | Show work experience and roles |
| `education` | Display educational background |
| `projects` | Show professional projects |
| `personal` | Show personal projects |
| `publications` | Display publications (if available) |
| `timeline` | Show chronological timeline of all events |
| `contact` | Display contact information and social links |
| `resume` | Download resume PDF |
| `theme [name]` | Change terminal color theme |
| `replicate` | AI Resume Converter & portfolio setup guide |
| `neofetch` | Display system information |
| `search [query]` | Search across all portfolio content |
| `whoami` | Display your name and title |
| `ls` | List available commands (alias for help) |
| `pwd` | Print working directory |
| `cat [file]` | Display file contents |
| `clear` | Clear the terminal screen |

## 🏗️ Project Structure

```
subhayu99.github.io/
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks (terminal logic)
│   │   ├── lib/            # Utilities and themes
│   │   └── config/         # Configuration files
│   └── public/
│       ├── data/           # Generated resume data
│       └── icons/          # PWA icons
├── scripts/                     # Build scripts
│   ├── generate-resume.js       # Resume generation script
│   ├── generate-ai-prompt.js    # AI conversion prompt generator
│   └── build.js                 # Smart build script
├── docs/                   # Documentation
├── examples/               # Example resume files
├── .github/workflows/      # GitHub Actions workflows
├── resume.yaml            # Your resume (create this!)
└── resume.config.yaml     # Resume generation config
```

## 🤝 Contributing

Found a bug? Have a feature idea? Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](./LICENSE).

## 🙏 Acknowledgments

- Built with [React](https://react.dev/) and [Vite](https://vitejs.dev/)
- Resume generation powered by [RenderCV](https://rendercv.com/)
- Inspired by classic terminal interfaces and retro computing
- ASCII art from [patorjk.com](https://patorjk.com/software/taag/)

## ⭐ Show Your Support

If you found this template helpful, please consider:

- ⭐ Starring this repository
- 🐦 Sharing it on social media
- 🔗 Adding a link back to the template in your portfolio
- 💬 Spreading the word to friends and colleagues

## 📞 Support

Need help? Have questions?

- 📖 Check the [Documentation](./docs/)
- 🐛 Open an [Issue](https://github.com/subhayu99/subhayu99.github.io/issues)
- 💬 Start a [Discussion](https://github.com/subhayu99/subhayu99.github.io/discussions)
- 📧 Contact the maintainer

---

<div align="center">

**Made with ❤️ by developers, for developers**

[View Demo](https://subhayu99.github.io) · [Report Bug](https://github.com/subhayu99/subhayu99.github.io/issues) · [Request Feature](https://github.com/subhayu99/subhayu99.github.io/issues)

</div>
