import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastState } from './toast-context';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ msg: '', err: false, show: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, err = false) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg, err, show: true });
    timerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
    </ToastContext.Provider>
  );
}
