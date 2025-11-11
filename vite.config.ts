import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync, existsSync } from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { themes } from "./client/src/lib/themes";

const themeInjectorPlugin = (): Plugin => {
  return {
    name: 'theme-injector',
    transformIndexHtml(html) {
      return html.replace(
        '// __THEME_DATA__', // A placeholder we will add to index.html
        `const themes = ${JSON.stringify(themes)};`
      );
    },
  };
};

const siteMetadataPlugin = (): Plugin => {
  return {
    name: 'site-metadata-injector',
    transformIndexHtml(html) {
      let title = 'Terminal Portfolio';
      let description = 'Interactive terminal-style portfolio showcasing professional experience and projects';

      try {
        // Try to read from resume.json (generated from resume.yaml)
        const resumePath = path.resolve(import.meta.dirname, 'client/public/data/resume.json');

        if (existsSync(resumePath)) {
          const resumeData = JSON.parse(readFileSync(resumePath, 'utf-8'));

          if (resumeData?.cv?.name) {
            title = `${resumeData.cv.name} - Terminal Portfolio`;
          }

          if (resumeData?.cv?.sections?.intro && Array.isArray(resumeData.cv.sections.intro)) {
            // Use first intro paragraph or combine first few
            const introParts = resumeData.cv.sections.intro.slice(0, 2);
            description = introParts.join(' ').substring(0, 160); // Limit to 160 chars for SEO
          }
        }
      } catch (error) {
        console.warn('Could not read resume.json, using fallback values');
      }

      // Allow environment variables to override
      title = process.env.VITE_SITE_TITLE || title;
      description = process.env.VITE_SITE_DESCRIPTION || description;

      // Also use VITE_SITE_AUTHOR if provided (for backward compatibility)
      if (process.env.VITE_SITE_AUTHOR && !process.env.VITE_SITE_TITLE) {
        title = `${process.env.VITE_SITE_AUTHOR} - Terminal Portfolio`;
      }

      // Replace placeholders
      html = html.replace('__SITE_TITLE__', title);
      html = html.replace('__SITE_DESCRIPTION__', description);

      return html;
    },
  };
};

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themeInjectorPlugin(),
    siteMetadataPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  // Add base path for GitHub Pages
  // Reads from VITE_BASE_PATH env var, defaults to "/"
  // Examples: "/" for username.github.io, "/repo-name/" for username.github.io/repo-name
  base: process.env.VITE_BASE_PATH || "/",
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Ensure assets are properly referenced
    assetsDir: "assets",
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
