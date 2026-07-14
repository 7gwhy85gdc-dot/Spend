import { useCallback, useState, type ReactNode } from 'react';
import { ModalContext } from './modal-context';

export function ModalProvider({ children }: { children: ReactNode }) {
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openAdd = useCallback(() => { setEditingId(null); setAddEditOpen(true); }, []);
  const openEdit = useCallback((id: number) => { setEditingId(id); setAddEditOpen(true); }, []);
  const closeAddEdit = useCallback(() => setAddEditOpen(false), []);
  const openPay = useCallback((id: number) => { setPayingId(id); setPayOpen(true); }, []);
  const closePay = useCallback(() => setPayOpen(false), []);
  const openTheme = useCallback(() => setThemeOpen(true), []);
  const closeTheme = useCallback(() => setThemeOpen(false), []);
  const openBackup = useCallback(() => setBackupOpen(true), []);
  const closeBackup = useCallback(() => setBackupOpen(false), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  return (
    <ModalContext.Provider value={{
      addEditOpen, editingId, payOpen, payingId, themeOpen, backupOpen, settingsOpen,
      openAdd, openEdit, closeAddEdit, openPay, closePay, openTheme, closeTheme, openBackup, closeBackup,
      openSettings, closeSettings,
    }}>
      {children}
    </ModalContext.Provider>
  );
}
