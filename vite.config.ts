import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
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

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themeInjectorPlugin(),
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
