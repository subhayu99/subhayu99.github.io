# Contributing to Terminal Portfolio Template

Thank you for considering contributing to this project! We welcome contributions from everyone, whether you're fixing a bug, adding a feature, or improving documentation.

## 🌟 How Can I Contribute?

### Reporting Bugs

If you find a bug, please [open an issue](https://github.com/subhayu99/subhayu99.github.io/issues/new/choose) with:

- A clear title and description
- Steps to reproduce the bug
- Expected vs actual behavior
- Screenshots (if applicable)
- Your environment (browser, OS, Node version)
- Relevant logs or error messages

### Suggesting Features

Have an idea for a new feature? [Open a feature request](https://github.com/subhayu99/subhayu99.github.io/issues/new/choose) with:

- A clear description of the feature
- Why it would be useful
- How it aligns with the template's goals (ease of use, zero-code deployment)
- Examples or mockups (if applicable)

### Improving Documentation

Documentation improvements are always welcome! This includes:

- Fixing typos or unclear explanations
- Adding examples or tutorials
- Translating documentation (future)
- Creating video guides or screenshots

### Contributing Code

Ready to write code? Great! Here's how to get started.

## 🚀 Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- Python 3.11+ (for resume generation with RenderCV)
- A code editor (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/subhayu99.github.io.git
   cd subhayu99.github.io
   ```

3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/subhayu99/subhayu99.github.io.git
   ```

### Install Dependencies

```bash
# Install npm dependencies
npm install

# Install RenderCV (for resume generation)
pip install "rendercv[full]"
```

### Set Up Development Environment

```bash
# Copy example files
cp resume.yaml.example resume.yaml
cp .env.example .env
cp template.config.yaml.example template.config.yaml
cp client/public/manifest.json.example client/public/manifest.json

# Generate resume data
npm run generate-resume

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see your changes live!

## 📝 Making Changes

### Creating a Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
# or for bug fixes
git checkout -b fix/bug-description
```

### Coding Guidelines

#### TypeScript/React

- Use TypeScript for type safety
- Follow existing code style (check `.editorconfig`)
- Use functional components and hooks
- Keep components small and focused
- Add comments for complex logic

#### Naming Conventions

- Files: `kebab-case.tsx` or `camelCase.ts`
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

#### CSS/Tailwind

- Use Tailwind utility classes when possible
- Follow existing theme color variables
- Ensure responsive design (mobile-first)
- Test on multiple screen sizes

### Testing Your Changes

```bash
# TypeScript type check
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview

# Test resume generation
npm run generate-resume
```

### Committing Changes

Write clear, descriptive commit messages:

```bash
# Good commit messages
git commit -m "feat: add dark mode toggle to settings"
git commit -m "fix: resolve mobile menu not closing on click"
git commit -m "docs: update ADVANCED.md with theme customization"
git commit -m "refactor: extract command logic into separate hooks"

# Follow conventional commits format
# feat: A new feature
# fix: A bug fix
# docs: Documentation changes
# style: Code style changes (formatting, etc)
# refactor: Code refactoring
# test: Adding or updating tests
# chore: Maintenance tasks
```

## 🔄 Submitting a Pull Request

### Before Submitting

- [ ] Code compiles without errors (`npm run build`)
- [ ] Types are correct (`npm run type-check`)
- [ ] No console errors in browser
- [ ] Tested on Chrome, Firefox, and Safari (if possible)
- [ ] Tested responsive design (mobile, tablet, desktop)
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventions

### Creating the PR

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Go to the [original repository](https://github.com/subhayu99/subhayu99.github.io)
3. Click "New Pull Request"
4. Select your fork and branch
5. Fill in the PR template with:
   - Description of changes
   - Related issues (if any)
   - Screenshots/videos (for UI changes)
   - Testing steps

### PR Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged!

## 🎯 Areas We Need Help

Looking for ideas? Here are some areas where we'd love contributions:

### High Priority

- [ ] Additional theme presets (Dracula, Nord, Solarized)
- [ ] Internationalization (i18n) support
- [ ] Accessibility improvements (WCAG compliance)
- [ ] Performance optimizations
- [ ] Mobile experience enhancements

### WOW Features (Phase 3)

- [ ] Network graph visualization of skills/technologies
- [ ] Interactive career timeline animation
- [ ] Terminal games (snake, etc.)
- [ ] Matrix rain effect background
- [ ] Tech stack comparison tool
- [ ] Interactive storytelling mode

### Documentation

- [ ] Video tutorials
- [ ] More example resumes (different industries)
- [ ] Troubleshooting guides
- [ ] Translation to other languages

### Testing

- [ ] Unit tests for components
- [ ] Integration tests for commands
- [ ] E2E tests with Playwright
- [ ] CI/CD improvements

## 📖 Project Structure

Understanding the codebase:

```
subhayu99.github.io/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom hooks (terminal logic)
│   │   ├── lib/              # Utilities (themes, helpers)
│   │   ├── config/           # Configuration files
│   │   └── App.tsx           # Main app component
│   └── public/
│       ├── data/             # Generated resume data
│       └── icons/            # PWA icons
├── scripts/                  # Build and generation scripts
│   └── generate-resume.js    # Resume generation logic
├── docs/                     # Documentation
├── examples/                 # Example resume files
├── .github/                  # GitHub Actions workflows
└── resume.config.yaml        # Resume generation config
```

### Key Files

- `client/src/hooks/useTerminal.ts` - Terminal command logic
- `client/src/lib/themes.ts` - Theme definitions
- `client/src/config/*.ts` - UI text and configuration
- `scripts/generate-resume.js` - Resume processing
- `.github/workflows/deploy.yaml` - Deployment workflow

## 🤝 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive experience for everyone. We do not tolerate harassment of participants in any form.

### Our Standards

**Positive behavior includes:**
- Being respectful and empathetic
- Accepting constructive criticism
- Focusing on what's best for the community
- Showing kindness to others

**Unacceptable behavior includes:**
- Harassment, discrimination, or offensive comments
- Personal or political attacks
- Publishing others' private information
- Any conduct inappropriate in a professional setting

### Enforcement

Instances of abusive behavior may be reported to the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

## 💬 Questions?

- Check the [README](./README.md)
- Read the [documentation](./docs/)
- Browse [existing issues](https://github.com/subhayu99/subhayu99.github.io/issues)
- Start a [discussion](https://github.com/subhayu99/subhayu99.github.io/discussions)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing!** Every contribution, no matter how small, helps make this project better for everyone. 🙌
