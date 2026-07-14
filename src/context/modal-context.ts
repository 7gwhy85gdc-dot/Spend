import { createContext, useContext } from 'react';

export interface ModalContextValue {
  addEditOpen: boolean;
  editingId: number | null;
  payOpen: boolean;
  payingId: number | null;
  themeOpen: boolean;
  backupOpen: boolean;
  settingsOpen: boolean;
  openAdd(): void;
  openEdit(id: number): void;
  closeAddEdit(): void;
  openPay(id: number): void;
  closePay(): void;
  openTheme(): void;
  closeTheme(): void;
  openBackup(): void;
  closeBackup(): void;
  openSettings(): void;
  closeSettings(): void;
}

export const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}
