import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupValidationError, parseBackupFile, restoreBackup } from './backup';
import { store, STORAGE_KEYS } from '../data/storage';
import type { BackupPayload, Obligation } from './types';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

function obligation(overrides: Partial<Obligation> = {}): Obligation {
  return {
    id: 1, name: 'إيجار', cat: 'إيجار', amount: 2500, dueDay: 1,
    type: 'دائم', notes: '', lastPaidMonth: null, finished: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function payload(): BackupPayload {
  return {
    obligations: [obligation()], history: [], salary: null, theme: null,
    exportedAt: '2026-07-14T00:00:00.000Z', version: 1,
  };
}

describe('backup validation and restore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  it('accepts a complete valid backup', () => {
    expect(parseBackupFile(JSON.stringify(payload())).obligations).toHaveLength(1);
  });

  it('rejects malformed obligation fields instead of importing them', () => {
    const invalid = payload();
    invalid.obligations = [obligation({ dueDay: 40 })];
    expect(() => parseBackupFile(JSON.stringify(invalid))).toThrow(BackupValidationError);
    invalid.obligations = [obligation({ type: 'مؤقت-تاريخ', endDate: '2026-02-31' })];
    expect(() => parseBackupFile(JSON.stringify(invalid))).toThrow(BackupValidationError);
  });

  it('rejects malformed salary, theme, and unsupported versions', () => {
    expect(() => parseBackupFile(JSON.stringify({ ...payload(), salary: -1 }))).toThrow('بيانات الراتب');
    expect(() => parseBackupFile(JSON.stringify({ ...payload(), theme: ['red'] }))).toThrow('بيانات الثيم');
    expect(() => parseBackupFile(JSON.stringify({ ...payload(), version: 2 }))).toThrow('غير مدعوم');
  });

  it('clears old salary and theme when the imported backup contains null', () => {
    store.saveSalary(12000);
    store.setRaw(STORAGE_KEYS.KEY_THEME, JSON.stringify({ '--navy': '#000000' }));
    restoreBackup(payload());
    expect(store.getSalary()).toBeNull();
    expect(store.getRaw(STORAGE_KEYS.KEY_THEME)).toBeNull();
  });
});
