# 🖥️ Terminal Portfolio Template

> Create your own interactive terminal-style portfolio in minutes—no coding required!

**Live Demo:** [subhayu99.github.io](https://subhayu99.github.io)

![Terminal Portfolio Screenshot](https://via.placeholder.com/800x400/000000/00FF00?text=Terminal+Portfolio+Demo)

---

## 🌿 Note: Two-Branch Setup

This repository uses a **dual-branch strategy**:

- **`main` branch** (you are here) → Clean template with .example files only
- **`personal` branch** → Maintainer's actual portfolio (deployed to subhayu99.github.io)

**For template users:** You're in the right place! When you click "Use this template", you'll get this clean main branch.

**For maintainers:** See [MAINTAINER_GUIDE.md](./MAINTAINER_GUIDE.md) for how to work with both branches.

---

## ✨ Features

- 🎨 **Beautiful Terminal UI** - Retro-style terminal interface with multiple themes
- 📱 **Fully Responsive** - Works perfectly on desktop, tablet, and mobile
- 🚀 **Zero-Code Setup** - Use visual resume builder, no programming needed
- ⚡ **Lightning Fast** - Built with React and Vite for optimal performance
- 📄 **Auto-Generated PDF** - Your resume automatically converts to downloadable PDF
- 🎭 **Multiple Themes** - Matrix, Blue, Purple, Amber, Red, and more
- 🔍 **Smart Search** - Search across all your content instantly
- 📊 **Interactive Commands** - Explore your portfolio through terminal commands
- 💾 **PWA Support** - Installable as a progressive web app
- 🔄 **Auto-Deploy** - Push changes to GitHub, site updates automatically

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

Already have a resume? Skip the manual entry and let AI do the work:

1. **Get the example YAML** - Open [`resume.yaml.example`](./resume.yaml.example) in your repository (it's included in the template)
2. **Prepare your prompt** - Use this template with ChatGPT, Claude, or Gemini:
   ```
   I have my resume below. Please convert it to the RenderCV YAML format shown in this example:
   [Paste the contents of resume.yaml.example]

   Here's my resume:
   [Paste your resume text, PDF content, or LinkedIn profile]

   Please maintain all my information but structure it exactly like the example YAML.
   ```
3. **Copy & Save** - Copy the AI-generated YAML and save it as `resume.yaml`

**Time:** ~2 minutes (vs 5+ minutes manual entry!)

**Why this works:** AI excels at reformatting structured data. You get perfect YAML syntax without learning the format!

### Step 2: Create Your Portfolio Repository

1. Click the **"Use this template"** button at the top of this page
2. Name your repository: `yourusername.github.io`
   - Replace `yourusername` with your GitHub username
   - This naming is important for GitHub Pages!
3. Choose **Public** visibility
4. Click **"Create repository"**

**Time:** ~1 minute

### Step 3: Upload Your Resume

1. In your new repository, click **"Add file"** → **"Upload files"**
2. Drag and drop your `resume.yaml` file from Step 1
3. Commit the file (click "Commit changes")

**Time:** ~1 minute

### Step 4: Enable GitHub Pages

1. Go to **Settings** → **Pages** (in left sidebar)
2. Under **"Source"**, select **"GitHub Actions"**
3. Wait 2-5 minutes for the initial deployment

**Time:** ~3 minutes (mostly waiting)

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
| `contact` | Display contact information and social links |
| `resume` | Download resume PDF |
| `theme [name]` | Change terminal color theme |
| `replicate` | Learn how to create your own portfolio |
| `neofetch` | Display system information |
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
├── scripts/                # Build scripts
│   └── generate-resume.js  # Resume generation script
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
