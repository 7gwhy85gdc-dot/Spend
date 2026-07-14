import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { store, STORAGE_KEYS } from '../data/storage';
import type { ThemeVars } from '../domain/types';
import { EDITABLE_VARS, rgbToHex } from '../domain/theme-presets';
import { ThemeContext } from './theme-context';

function readVar(cssVar: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
}

function persistTheme() {
  const saved: ThemeVars = {};
  EDITABLE_VARS.forEach((v) => { saved[v.key] = readVar(v.key); });
  store.setRaw(STORAGE_KEYS.KEY_THEME, JSON.stringify(saved));
}

function applyVarsToRoot(vars: ThemeVars) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => {
    root.style.setProperty(k, v);
    if (k === '--navy') root.style.setProperty('--gray', v);
  });
}

function clearVarsFromRoot() {
  const root = document.documentElement;
  EDITABLE_VARS.forEach((v) => root.style.removeProperty(v.key));
  root.style.removeProperty('--gray');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [selectedPreset, setSelectedPreset] = useState(-1);

  const reapplyFromStorage = useCallback(() => {
    const raw = store.getRaw(STORAGE_KEYS.KEY_THEME);
    if (!raw) {
      clearVarsFromRoot();
      setSelectedPreset(-1);
      return;
    }
    try {
      applyVarsToRoot(JSON.parse(raw));
      setSelectedPreset(-1);
    } catch {
      /* ignore corrupted theme */
    }
  }, []);

  useEffect(() => {
    reapplyFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyVars = useCallback((vars: ThemeVars) => {
    applyVarsToRoot(vars);
    persistTheme();
    setSelectedPreset(-1);
  }, []);

  const applyPreset = useCallback((index: number, vars: ThemeVars) => {
    applyVarsToRoot(vars);
    persistTheme();
    setSelectedPreset(index);
  }, []);

  const setSingleVar = useCallback((cssVar: string, value: string) => {
    document.documentElement.style.setProperty(cssVar, value);
    if (cssVar === '--navy') document.documentElement.style.setProperty('--gray', value);
    persistTheme();
    setSelectedPreset(-1);
  }, []);

  const resetTheme = useCallback(() => {
    store.removeRaw(STORAGE_KEYS.KEY_THEME);
    clearVarsFromRoot();
    setSelectedPreset(-1);
  }, []);

  const getEditorValues = useCallback(() => {
    return EDITABLE_VARS.map((v) => ({ key: v.key, label: v.label, hex: rgbToHex(readVar(v.key)) }));
  }, []);

  return (
    <ThemeContext.Provider value={{ selectedPreset, applyVars, applyPreset, setSingleVar, resetTheme, getEditorValues, reapplyFromStorage }}>
      {children}
    </ThemeContext.Provider>
  );
}
