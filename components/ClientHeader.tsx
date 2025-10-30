'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import Header from './Header';

interface HeaderContextType {
  searchMode: 'analysis' | 'range';
  setSearchMode: (mode: 'analysis' | 'range') => void;
  openDealsDialog: () => void;
  registerDealsDialog: (fn: () => void) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function useHeader() {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error('useHeader must be used within HeaderProvider');
  }
  return context;
}

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [searchMode, setSearchMode] = useState<'analysis' | 'range'>('analysis');
  const dealsDialogOpenerRef = useRef<(() => void) | null>(null);

  const openDealsDialog = useCallback(() => {
    if (dealsDialogOpenerRef.current) {
      dealsDialogOpenerRef.current();
    }
  }, []);

  const registerDealsDialog = useCallback((fn: () => void) => {
    dealsDialogOpenerRef.current = fn;
  }, []);

  const contextValue = useMemo(
    () => ({ searchMode, setSearchMode, openDealsDialog, registerDealsDialog }),
    [searchMode, openDealsDialog, registerDealsDialog]
  );

  return (
    <HeaderContext.Provider value={contextValue}>
      <Header />
      {children}
    </HeaderContext.Provider>
  );
}
