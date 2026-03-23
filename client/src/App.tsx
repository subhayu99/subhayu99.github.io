import { QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import ErrorBoundary from "./components/ErrorBoundary";
import { ViewModeProvider, useViewMode } from "./hooks/useViewMode";
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
