# Deployment Guide

This guide explains how your terminal portfolio is automatically deployed to GitHub Pages.

## 🌟 Easy Mode (Zero-Code Deployment)

If you're using the template with just a `resume.yaml` file, here's what happens automatically:

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. That's it! GitHub Pages is now enabled

### 2. Upload Your Resume

1. Create your resume at [app.rendercv.com](https://app.rendercv.com)
2. Download the YAML file
3. Upload it to your repository as `resume.yaml`

### 3. Automatic Deployment

When you commit `resume.yaml` to the `main` branch, GitHub Actions will automatically:

1. ✅ Validate your YAML file
2. 🐍 Install Python and RenderCV
3. 📄 Generate your resume PDF, Markdown, and JSON
4. 🔧 Setup any missing template files (uses examples as defaults)
5. 📦 Install npm dependencies
6. 🏗️  Build your portfolio website
7. 🚀 Deploy to GitHub Pages

**Your site will be live at:** `https://yourusername.github.io`

### 4. Making Updates

To update your portfolio:

1. Edit `resume.yaml` (using RenderCV web app or text editor)
2. Commit and push to `main` branch
3. Wait 2-5 minutes for automatic rebuild
4. Your changes are live!

## 🔧 Advanced Mode

For developers who want more control:

### Custom Base Path

If deploying to `username.github.io/repo-name`:

1. Go to **Settings** → **Secrets and variables** → **Actions** → **Variables**
2. Add a new variable:
   - Name: `VITE_BASE_PATH`
   - Value: `/repo-name/`

### Environment Variables

You can set these in **Settings** → **Secrets and variables** → **Actions**:

**Variables** (public, used at build time):
- `VITE_BASE_PATH` - Base path for GitHub Pages (e.g., `/repo-name/`)
- `VITE_SITE_TITLE` - Custom site title
- `VITE_SITE_AUTHOR` - Your name

**Secrets** (private, never exposed):
- `VITE_GA_MEASUREMENT_ID` - Google Analytics ID
- `VITE_GITHUB_TOKEN` - GitHub personal access token (for stats features)

### Custom Configuration Files

If you want to customize beyond resume.yaml, create these files in your repo:

- `template.config.yaml` - Site-wide settings (theme, commands, PWA)
- `.env` - Environment variables (for local development)
- `client/public/manifest.json` - PWA manifest
- `client/public/data/styled_name.txt` - Custom ASCII art name
- `client/public/data/neofetch.txt` - Custom neofetch output

The workflow will automatically use these instead of the `.example` files.

## 📊 Monitoring Deployments

### Check Deployment Status

1. Go to **Actions** tab in your repository
2. Click on the latest workflow run
3. See detailed logs for each step

### Common Issues

**Deployment failed?**
- Check the Actions logs for error messages
- Validate your `resume.yaml` syntax
- Ensure GitHub Pages is enabled in Settings

**Site not updating?**
- Clear your browser cache
- Wait a few minutes (CDN propagation can take time)
- Check if the workflow completed successfully

**404 errors on sub-pages?**
- Make sure `VITE_BASE_PATH` is set correctly
- For `username.github.io`, use `/`
- For `username.github.io/repo`, use `/repo/`

## 🔄 Workflow Files

The deployment is controlled by these workflow files:

### `.github/workflows/deploy.yaml`
Main deployment workflow that builds and deploys your site.

**Triggers:**
- Push to `main` branch
- Pull requests to `main`
- Manual trigger (workflow_dispatch)

**Steps:**
1. Checkout code
2. Setup Node.js and Python
3. Install dependencies (RenderCV, npm packages)
4. Copy template files if missing
5. Generate resume PDF/JSON
6. Build website
7. Deploy to GitHub Pages

### `.github/workflows/validate-resume.yaml`
Validation workflow that checks your resume.yaml.

**Triggers:**
- Changes to `resume.yaml`
- Changes to `resume.config.yaml`
- Manual trigger

**Steps:**
1. Validate YAML syntax
2. Test resume generation
3. Show resume statistics

## 💡 Tips

1. **Test locally first**: Run `npm run generate-resume` locally before pushing
2. **Use validation workflow**: The validate workflow runs on PRs, catching errors early
3. **Monitor Actions**: Check the Actions tab to see deployment progress
4. **Custom domain**: You can add a custom domain in Settings → Pages → Custom domain
5. **HTTPS**: GitHub Pages automatically provides HTTPS for your site

## 🆘 Getting Help

If you encounter issues:

1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Review the Actions logs in your repository (Settings → Actions)
3. Open an issue on the [template repository](https://github.com/subhayu99/subhayu99.github.io/issues)

---

**Happy deploying!** 🚀
