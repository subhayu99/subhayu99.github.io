import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { createElement } from 'react';
import { storage, storageConfig } from '../config';

export type ViewMode = 'splash' | 'terminal' | 'gui';

interface ViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  switchTo: (mode: 'terminal' | 'gui') => void;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

function hashToMode(hash: string): ViewMode | null {
  const clean = hash.replace('#', '').toLowerCase();
  if (clean === 'terminal') return 'terminal';
  if (clean === 'gui') return 'gui';
  return null;
}

function modeToHash(mode: ViewMode): string {
  if (mode === 'terminal') return '#terminal';
  if (mode === 'gui') return '#gui';
  return '';
}

function getInitialViewMode(): ViewMode {
  // URL hash takes priority
  const fromHash = hashToMode(window.location.hash);
  if (fromHash) return fromHash;

  // Then localStorage
  const stored = storage.get(storageConfig.keys.viewMode);
  if (stored === 'terminal' || stored === 'gui') {
    return stored;
  }
  return 'splash';
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>(getInitialViewMode);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    // Never persist "splash" - only persist terminal/gui
    if (mode !== 'splash') {
      storage.set(storageConfig.keys.viewMode, mode);
    }
    // Update URL hash without triggering scroll
    const newHash = modeToHash(mode);
    if (newHash) {
      window.history.replaceState(null, '', newHash);
    } else {
      // Splash — remove hash
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const switchTo = useCallback((mode: 'terminal' | 'gui') => {
    setViewMode(mode);
  }, [setViewMode]);

  // Listen for browser back/forward or manual hash changes
  useEffect(() => {
    const onHashChange = () => {
      const mode = hashToMode(window.location.hash);
      if (mode && mode !== viewMode) {
        setViewModeState(mode);
        storage.set(storageConfig.keys.viewMode, mode);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [viewMode]);

  // Set initial hash if arriving with a stored preference (no hash in URL)
  useEffect(() => {
    if (!window.location.hash && viewMode !== 'splash') {
      window.history.replaceState(null, '', modeToHash(viewMode));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createElement(
    ViewModeContext.Provider,
    { value: { viewMode, setViewMode, switchTo } },
    children
  );
}

export function useViewMode(): ViewModeContextValue {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
