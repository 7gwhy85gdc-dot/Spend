import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ConfirmContext, type ConfirmOptions, type ConfirmState } from './confirm-context';

const DEFAULT_STATE: ConfirmState = {
  open: false, msg: '', label: '🗑 حذف',
  bg: 'linear-gradient(135deg,#E53E3E,#C53030)',
  shadow: '0 2px 16px rgba(229,62,62,0.4)',
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>(DEFAULT_STATE);
  const onYesRef = useRef<() => void>(() => {});

  const showConfirm = useCallback((msg: string, onYes: () => void, opts: ConfirmOptions = {}) => {
    onYesRef.current = onYes;
    setState({
      open: true, msg,
      label: opts.label || DEFAULT_STATE.label,
      bg: opts.bg || DEFAULT_STATE.bg,
      shadow: opts.shadow || DEFAULT_STATE.shadow,
    });
  }, []);

  const handleYes = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    onYesRef.current();
  }, []);

  const handleNo = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  return (
    <ConfirmContext.Provider value={{ state, showConfirm, handleYes, handleNo }}>
      {children}
    </ConfirmContext.Provider>
  );
}
