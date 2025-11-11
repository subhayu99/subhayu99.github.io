# Troubleshooting Guide

Common issues and solutions for your terminal portfolio.

## 🚫 Deployment Issues

### GitHub Actions workflow fails

**Problem:** The deployment workflow shows a red X in the Actions tab.

**Solutions:**
1. Click on the failed workflow to see detailed logs
2. Look for the step that failed (marked with a red X)
3. Common causes:
   - Invalid YAML syntax in `resume.yaml`
   - Missing required fields in resume
   - npm dependency conflicts

**Fix:**
```bash
# Validate YAML locally
python -c "import yaml; yaml.safe_load(open('resume.yaml'))"

# Or use the validate-resume workflow
# Push changes to any branch, workflow will check automatically
```

### GitHub Pages not enabled

**Problem:** Deployment succeeds but site isn't accessible.

**Solution:**
1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions** (not "Deploy from a branch")
3. Wait 2-5 minutes for DNS propagation

### 404 on deployed site

**Problem:** Homepage works but other routes show 404.

**Solutions:**
1. Check your base path configuration:
   - For `username.github.io`: Use `/` (default)
   - For `username.github.io/repo`: Set `VITE_BASE_PATH=/repo/`
2. Clear browser cache
3. Try incognito/private mode

## 📄 Resume Generation Issues

### RenderCV fails to generate PDF

**Problem:** Workflow fails at "Generate Resume PDF and JSON" step.

**Common causes:**
- Invalid YAML syntax
- Missing required fields
- Unsupported LaTeX commands

**Fix:**
1. Validate your resume at [app.rendercv.com](https://app.rendercv.com)
2. Check the workflow logs for specific error messages
3. Ensure all required fields are present:
   ```yaml
   cv:
     name: Your Name
     label: Your Title
     location: City, Country
     email: your@email.com
     # ... etc
   ```

### Resume shows example data

**Problem:** Deployed site shows "Jane Developer" instead of your data.

**Solution:**
1. Ensure `resume.yaml` is in the root of your repository
2. Filename must be exactly `resume.yaml` (not Resume.yaml or resume.yml)
3. Check the workflow logs to confirm it's being processed

## 🎨 Styling and Display Issues

### Theme not applying

**Problem:** Terminal appears with wrong colors or default theme.

**Solutions:**
1. Check browser localStorage (may have old theme saved)
2. Try clearing site data in browser settings
3. Use `theme reset` command in terminal
4. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### ASCII art name not showing

**Problem:** `neofetch` or banner shows default text.

**Solutions:**
1. Create `client/public/data/styled_name.txt` with your ASCII art
2. Or copy from example:
   ```bash
   cp client/public/data/styled_name.txt.example client/public/data/styled_name.txt
   ```
3. Generate ASCII art at: [patorjk.com/software/taag](https://patorjk.com/software/taag/)

### Mobile view broken

**Problem:** Site doesn't work well on mobile.

**Solutions:**
1. The template is responsive by default
2. Clear mobile browser cache
3. Check if custom CSS is interfering
4. Try different mobile browsers

## 🔧 Build Issues

### npm install fails

**Problem:** Can't install dependencies locally.

**Solutions:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Or use exact versions
npm ci
```

### Build fails locally but works on GitHub

**Problem:** `npm run build` fails on your machine.

**Common causes:**
- Node version mismatch (workflow uses Node 18)
- Missing environment variables
- OS-specific path issues

**Fix:**
```bash
# Check Node version
node --version  # Should be 18.x or higher

# Update Node using nvm
nvm install 18
nvm use 18

# Try build again
npm run build
```

## 🔐 Authentication Issues

### Can't push to repository

**Problem:** Git push fails with authentication error.

**Solutions:**
1. Use personal access token instead of password
2. Generate token at: [github.com/settings/tokens](https://github.com/settings/tokens)
3. Required scopes: `repo`, `workflow`
4. Use token as password when prompted

### Actions can't access repository

**Problem:** Workflow can't read files or push changes.

**Solution:**
1. Check repository permissions in **Settings** → **Actions** → **General**
2. Ensure "Read and write permissions" is selected
3. Re-run the workflow

## 📱 PWA (Progressive Web App) Issues

### Install prompt not showing

**Problem:** Can't install site as app.

**Solutions:**
1. PWA requires HTTPS (GitHub Pages provides this)
2. Clear browser cache
3. Check manifest.json is accessible: `https://yourusername.github.io/manifest.json`
4. Try different browser (Chrome, Edge work best)

### App icon not showing

**Problem:** Installed app shows default icon.

**Solutions:**
1. Ensure icons exist in `client/public/icons/`
2. Check manifest.json has correct icon paths
3. Uninstall and reinstall the app

## 🐛 JavaScript Errors

### Console shows errors

**Problem:** Browser console shows JavaScript errors.

**Common errors:**

**"Cannot read property of undefined"**
- Usually means resume data isn't loaded
- Check `client/public/data/resume.json` exists
- Verify resume generation completed successfully

**"Module not found"**
- Build issue, try: `npm run build` again
- Clear dist folder: `rm -rf dist`

**"Network error"**
- Check if GitHub Pages is accessible
- Verify all assets are deployed
- Check browser network tab for 404s

## 🔍 Content Issues

### Skills/Projects not showing

**Problem:** Some resume sections are empty.

**Solutions:**
1. Check your `resume.yaml` has those sections populated
2. Verify section names match RenderCV format:
   ```yaml
   cv:
     sections:
       - Professional Experience:
         - company: ...
       - Projects:
         - name: ...
   ```
3. Check `show_on_resume` flag isn't set to false

### Links not working

**Problem:** Email/social links don't work.

**Solutions:**
1. Ensure URLs have proper protocol: `https://` or `mailto:`
2. Check `social_networks` section in resume.yaml
3. Verify links in `client/public/data/resume.json`

## 💾 Data Update Issues

### Changes not reflecting on site

**Problem:** Updated resume.yaml but site shows old data.

**Solutions:**
1. Check GitHub Actions completed successfully
2. Wait for deployment (2-5 minutes)
3. Hard refresh browser: Ctrl+Shift+R
4. Clear browser cache
5. Check CDN cache (GitHub Pages may cache for a few minutes)

### Resume PDF out of date

**Problem:** PDF download shows old resume.

**Solution:**
1. Workflow regenerates PDF on every deployment
2. Force refresh: Clear browser cache
3. Check `client/public/resume.pdf` timestamp in repo
4. Verify workflow "Generate Resume" step succeeded

## 🆘 Still Having Issues?

If none of these solutions work:

1. **Check workflow logs**: Go to Actions tab, click on failed workflow, read logs
2. **Search existing issues**: [GitHub Issues](https://github.com/subhayu99/subhayu99.github.io/issues)
3. **Open a new issue**: Include:
   - Error message (full text)
   - Workflow logs (if applicable)
   - Steps to reproduce
   - Browser and OS version
4. **Ask the community**: GitHub Discussions

---

**Most issues can be solved by:**
- ✅ Validating YAML syntax
- ✅ Clearing browser cache
- ✅ Checking workflow logs
- ✅ Using correct file names and locations

Good luck! 🍀
