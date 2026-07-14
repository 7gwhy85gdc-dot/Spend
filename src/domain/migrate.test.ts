import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backfillInitialMonths, seedData, upgradePaymentLedger } from './migrate';
import { store } from '../data/storage';
import type { Obligation } from './types';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

function temporary(): Obligation {
  return {
    id: 1, name: 'قسط', cat: 'أقساط', amount: 100, dueDay: 5,
    type: 'مؤقت-أشهر', remainingMonths: 4, notes: '', lastPaidMonth: null,
    finished: false, createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('initial data and progress migration', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  it('seeds only once and does not recreate samples after the user deletes everything', () => {
    seedData();
    expect(store.getObligations()).toHaveLength(3);
    store.saveObligations([]);
    seedData();
    expect(store.getObligations()).toEqual([]);
  });

  it('does not seed an already-migrated empty installation', () => {
    store.setRaw('schema_v2_done', '1');
    seedData();
    expect(store.getObligations()).toEqual([]);
  });

  it('backfills the original month count once for existing temporary obligations', () => {
    store.saveObligations([temporary()]);
    store.saveHistory([
      { id: 10, oblId: 1, name: 'قسط', cat: 'أقساط', amount: 100, method: 'SADAD', paidDate: '2026-05-01', monthLabel: 'مايو 2026' },
      { id: 11, oblId: 1, name: 'قسط', cat: 'أقساط', amount: 100, method: 'SADAD', paidDate: '2026-06-01', monthLabel: 'يونيو 2026' },
    ]);
    backfillInitialMonths();
    expect(store.getObligations()[0].initialMonths).toBe(6);
  });

  it('converts legacy paid and partial state into ledger entries', () => {
    store.saveObligations([
      { ...temporary(), lastPaidMonth: '2026-07', partialPaidAmount: 25, partialPaidMonth: '2026-06' },
    ]);
    upgradePaymentLedger(true);
    const upgraded = store.getObligations()[0];
    const history = store.getHistory();
    expect(upgraded.paymentLedgerVersion).toBe(1);
    expect(upgraded.startMonth).toBe('2026-06');
    expect(history.find((entry) => entry.paymentMonth === '2026-07')?.amount).toBe(100);
    expect(history.find((entry) => entry.paymentMonth === '2026-06')?.amount).toBe(25);
  });

  it('does not resurrect a deleted ledger payment from compatibility fields', () => {
    store.saveObligations([{
      ...temporary(),
      startMonth: '2026-07',
      totalMonths: 4,
      lastPaidMonth: '2026-07',
      paymentLedgerVersion: 1,
    }]);
    store.saveHistory([]);
    upgradePaymentLedger(true);
    expect(store.getHistory()).toEqual([]);
  });
});
