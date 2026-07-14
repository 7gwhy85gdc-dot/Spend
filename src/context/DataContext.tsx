import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { store } from '../data/storage';
import { backfillInitialMonths, migrateSchema, seedData, upgradePaymentLedger } from '../domain/migrate';
import type { HistoryEntry, Obligation } from '../domain/types';
import { applyPaymentToLedger } from '../domain/payments';
import { DataContext, type DataContextValue, type NewObligationInput } from './data-context';

seedData();
migrateSchema();
backfillInitialMonths();
upgradePaymentLedger();

function nextId(items: Array<{ id: number }>): number {
  const maxExisting = items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  return Math.max(Date.now(), maxExisting + 1);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [obligations, setObligations] = useState<Obligation[]>(() => store.getObligations());
  const [history, setHistory] = useState<HistoryEntry[]>(() => store.getHistory());
  const [salary, setSalaryState] = useState<number | null>(() => store.getSalary());

  const persistObligations = useCallback((next: Obligation[]) => {
    store.saveObligations(next);
    setObligations(next);
  }, []);
  const persistHistory = useCallback((next: HistoryEntry[]) => {
    store.saveHistory(next);
    setHistory(next);
  }, []);

  const addObligation = useCallback((input: NewObligationInput) => {
    const current = store.getObligations();
    const obj: Obligation = { ...input, id: nextId(current), createdAt: new Date().toISOString() };
    persistObligations([...current, obj]);
    return obj.id;
  }, [persistObligations]);

  const updateObligation = useCallback((id: number, input: NewObligationInput) => {
    const current = store.getObligations();
    const idx = current.findIndex((x) => x.id === id);
    if (idx === -1) return;
    const next = [...current];
    next[idx] = { ...next[idx], ...input };
    persistObligations(next);
  }, [persistObligations]);

  const deleteObligation = useCallback((id: number) => {
    persistObligations(store.getObligations().filter((x) => x.id !== id));
  }, [persistObligations]);

  const confirmPayment = useCallback((id: number, amount: number, method: string, targetMonth: string) => {
    const current = store.getObligations();
    const today = new Date();
    const currentHistory = store.getHistory();
    const applied = applyPaymentToLedger(
      current,
      currentHistory,
      id,
      amount,
      method,
      today,
      targetMonth,
      nextId(currentHistory),
    );
    persistHistory(applied.history);
    persistObligations(applied.obligations);
    return applied.result;
  }, [persistObligations, persistHistory]);

  const deleteHistoryEntry = useCallback((id: number) => {
    persistHistory(store.getHistory().filter((x) => x.id !== id));
  }, [persistHistory]);

  const setSalary = useCallback((value: number) => {
    store.saveSalary(value);
    setSalaryState(value);
  }, []);

  const clearSalary = useCallback(() => {
    store.clearSalary();
    setSalaryState(null);
  }, []);

  const reloadFromStorage = useCallback(() => {
    setObligations(store.getObligations());
    setHistory(store.getHistory());
    setSalaryState(store.getSalary());
  }, []);

  const value = useMemo<DataContextValue>(() => ({
    obligations, history, salary,
    addObligation, updateObligation, deleteObligation,
    confirmPayment, deleteHistoryEntry, setSalary, clearSalary, reloadFromStorage,
  }), [obligations, history, salary, addObligation, updateObligation, deleteObligation, confirmPayment, deleteHistoryEntry, setSalary, clearSalary, reloadFromStorage]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
