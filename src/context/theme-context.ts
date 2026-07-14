import { createContext, useContext } from 'react';
import type { ThemeVars } from '../domain/types';

export interface ThemeContextValue {
  selectedPreset: number;
  applyVars(vars: ThemeVars): void;
  applyPreset(index: number, vars: ThemeVars): void;
  setSingleVar(cssVar: string, value: string): void;
  resetTheme(): void;
  getEditorValues(): Array<{ key: string; label: string; hex: string }>;
  reapplyFromStorage(): void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
