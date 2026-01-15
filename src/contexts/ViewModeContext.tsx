import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export type ViewMode = 'auto' | 'desktop' | 'mobile';

interface ViewModeContextType {
  mode: ViewMode;
  isMobile: boolean;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('viewMode') as ViewMode) || 'auto';
    }
    return 'auto';
  });

  const isMobileDevice = useIsMobile();

  // Modo efetivo: considera preferência do usuário
  const isMobile = mode === 'auto' ? isMobileDevice : mode === 'mobile';

  const setViewMode = (newMode: ViewMode) => {
    setMode(newMode);
    localStorage.setItem('viewMode', newMode);
  };

  useEffect(() => {
    const stored = localStorage.getItem('viewMode') as ViewMode;
    if (stored && ['auto', 'desktop', 'mobile'].includes(stored)) {
      setMode(stored);
    }
  }, []);

  return (
    <ViewModeContext.Provider value={{ mode, isMobile, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
