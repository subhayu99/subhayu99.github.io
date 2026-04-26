import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync, existsSync, writeFileSync } from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { themes } from "./client/src/lib/themes";
import {
  loadTemplateConfig,
  renderSignatureComment,
} from "./scripts/utils/load-template-config.js";

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

const templateSignaturePlugin = (): Plugin => {
  return {
    name: 'template-signature',
    transformIndexHtml(html) {
      const config = loadTemplateConfig();
      if (!config.tracking.signature) return html;
      const comment = renderSignatureComment(config);
      return html.replace('<!DOCTYPE html>', `<!DOCTYPE html>\n${comment}`);
    },
  };
};

const buildVersionPlugin = (): Plugin => {
  return {
    name: 'build-version',
    writeBundle() {
      const version = {
        version: Date.now().toString(36),
        buildTime: new Date().toISOString(),
      };
      const outDir = path.resolve(import.meta.dirname, 'dist/public');
      writeFileSync(
        path.resolve(outDir, 'build-version.json'),
        JSON.stringify(version)
      );
      // Also write to client/public so dev server serves it
      writeFileSync(
        path.resolve(import.meta.dirname, 'client/public/build-version.json'),
        JSON.stringify(version)
      );
    },
  };
};

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themeInjectorPlugin(),
    siteMetadataPlugin(),
    templateSignaturePlugin(),
    buildVersionPlugin(),
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
    // Code splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],
          // React Query
          'react-query': ['@tanstack/react-query'],
          // UI components - group Radix components together
          'ui-components': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-toast',
            '@radix-ui/react-slot',
          ],
          // Utilities
          'utils': ['date-fns', 'dompurify'],
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
