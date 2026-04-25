import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import ErrorBoundary from "./components/ErrorBoundary";
import { ViewModeProvider, useViewMode } from "./hooks/useViewMode";
import { useTabOutTitle } from "./hooks/useTabOutTitle";
import { runConsoleEasterEgg } from "./lib/consoleEasterEgg";
import { toggleFullscreen } from "./lib/fullscreen";
import * as audio from "./lib/audio";
import { applyColorTheme, getSavedTheme } from "./config";
import SplashPage from "./components/SplashPage";
import TerminalView from "./components/TerminalView";
import GUIPortfolio from "./components/gui/GUIPortfolio";

function ViewRouter() {
  const { viewMode } = useViewMode();

  return (
    <AnimatePresence mode="wait">
      {viewMode === "splash" && <SplashPage key="splash" />}
      {viewMode === "terminal" && <TerminalView key="terminal" />}
      {viewMode === "gui" && <GUIPortfolio key="gui" />}
    </AnimatePresence>
  );
}

function App() {
  // Restore the saved color theme on first paint, BEFORE any view
  // mounts. Previously this lived inside GUIPortfolio's mount effect,
  // so loading the page directly into the TUI (or refreshing while in
  // the TUI) skipped theme application — leaving CSS vars at the
  // matrix-green :root defaults even though localStorage said otherwise.
  // useState's lazy init runs synchronously before children render.
  const [_themeApplied] = useState(() => {
    if (typeof document === 'undefined') return false;
    applyColorTheme(getSavedTheme());
    return true;
  });

  // One-time console greeting — runs once on mount.
  useEffect(() => { runConsoleEasterEgg(); }, []);
  // Tab-out title swap — restores on return.
  useTabOutTitle();
  // Press F toggles fullscreen, M toggles audio mute. Also unlocks the
  // Web Audio context on the first keypress (browsers block audio until
  // they see a user gesture). Input-field guards so typing in forms doesn't hijack.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      audio.unlock();
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        audio.toggleMuted();
      }
    };
    // Also unlock audio on first pointer gesture anywhere.
    const onPointer = () => audio.unlock();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer, { once: false });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ViewModeProvider>
          <ViewRouter />
          <Toaster />
        </ViewModeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
