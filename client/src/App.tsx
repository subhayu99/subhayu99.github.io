import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import ErrorBoundary from "./components/ErrorBoundary";
import { ViewModeProvider, useViewMode } from "./hooks/useViewMode";
import { useTabOutTitle } from "./hooks/useTabOutTitle";
import { runConsoleEasterEgg } from "./lib/consoleEasterEgg";
import { toggleFullscreen } from "./lib/fullscreen";
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
  // One-time console greeting — runs once on mount.
  useEffect(() => { runConsoleEasterEgg(); }, []);
  // Tab-out title swap — restores on return.
  useTabOutTitle();
  // Press F anywhere to toggle fullscreen (hidden trigger; shown in HelpSheet).
  // Input-field guard so typing an F in forms doesn't hijack.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
