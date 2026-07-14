import { createContext, useContext } from 'react';

export interface ConfirmOptions {
  label?: string;
  bg?: string;
  shadow?: string;
}

export interface ConfirmState {
  open: boolean;
  msg: string;
  label: string;
  bg: string;
  shadow: string;
}

export interface ConfirmContextValue {
  state: ConfirmState;
  showConfirm(msg: string, onYes: () => void, opts?: ConfirmOptions): void;
  handleYes(): void;
  handleNo(): void;
}

export const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
