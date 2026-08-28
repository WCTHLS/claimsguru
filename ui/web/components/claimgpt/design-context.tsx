'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type DesignId = 'aurora' | 'clinical' | 'ledger';

export const DESIGNS: { id: DesignId; label: string; subtitle: string }[] = [
  { id: 'aurora', label: 'Design 1', subtitle: 'Aurora' },
  { id: 'clinical', label: 'Design 2', subtitle: 'Clinical' },
  { id: 'ledger', label: 'Design 3', subtitle: 'Ledger' },
];

interface DesignContextValue {
  design: DesignId;
  setDesign: (id: DesignId) => void;
}

const DesignContext = createContext<DesignContextValue | null>(null);

const STORAGE_KEY = 'claimgpt-design';

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [design, setDesignState] = useState<DesignId>('clinical');

  useEffect(() => {
    setDesignState('clinical');
  }, []);

  const setDesign = useCallback((id: DesignId) => {
    setDesignState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(() => ({ design, setDesign }), [design, setDesign]);

  return (
    <DesignContext.Provider value={value}>{children}</DesignContext.Provider>
  );
}

export function useDesign() {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error('useDesign must be used within DesignProvider');
  return ctx;
}
