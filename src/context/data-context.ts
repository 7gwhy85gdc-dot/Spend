import { createContext, useContext } from 'react';
import type { HistoryEntry, Obligation, PaymentResult } from '../domain/types';

export type NewObligationInput = Omit<Obligation, 'id' | 'createdAt'>;

export interface DataContextValue {
  obligations: Obligation[];
  history: HistoryEntry[];
  salary: number | null;
  addObligation(input: NewObligationInput): number;
  updateObligation(id: number, input: NewObligationInput): void;
  deleteObligation(id: number): void;
  confirmPayment(id: number, amount: number, method: string, targetMonth: string): PaymentResult;
  deleteHistoryEntry(id: number): void;
  setSalary(value: number): void;
  clearSalary(): void;
  reloadFromStorage(): void;
}

export const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
