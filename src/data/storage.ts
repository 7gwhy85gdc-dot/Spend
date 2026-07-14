import type { HistoryEntry, Obligation } from '../domain/types';

const KEY_OBL = 'obls_v1';
const KEY_HIST = 'hist_v1';
const KEY_SALARY = 'salary_v1';
const KEY_THEME = 'theme_v1';

/**
 * واجهة تخزين مجرَّدة — التطبيق يتحدث معها فقط، لا مع localStorage مباشرة.
 * هذا يسمح لاحقاً بإضافة تطبيق سحابي (مثلاً Supabase) دون تغيير أي مكوّن أو hook.
 */
export interface Store {
  getObligations(): Obligation[];
  saveObligations(data: Obligation[]): void;
  getHistory(): HistoryEntry[];
  saveHistory(data: HistoryEntry[]): void;
  getSalary(): number | null;
  saveSalary(value: number): void;
  clearSalary(): void;
  getRaw(key: string): string | null;
  setRaw(key: string, value: string): void;
  removeRaw(key: string): void;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const localStorageStore: Store = {
  getObligations() {
    return safeParse<Obligation[]>(localStorage.getItem(KEY_OBL), []);
  },
  saveObligations(data) {
    localStorage.setItem(KEY_OBL, JSON.stringify(data));
  },
  getHistory() {
    return safeParse<HistoryEntry[]>(localStorage.getItem(KEY_HIST), []);
  },
  saveHistory(data) {
    localStorage.setItem(KEY_HIST, JSON.stringify(data));
  },
  getSalary() {
    const s = localStorage.getItem(KEY_SALARY);
    return s ? Number(s) : null;
  },
  saveSalary(value) {
    localStorage.setItem(KEY_SALARY, String(value));
  },
  clearSalary() {
    localStorage.removeItem(KEY_SALARY);
  },
  getRaw(key) {
    return localStorage.getItem(key);
  },
  setRaw(key, value) {
    localStorage.setItem(key, value);
  },
  removeRaw(key) {
    localStorage.removeItem(key);
  },
};

export const STORAGE_KEYS = { KEY_OBL, KEY_HIST, KEY_SALARY, KEY_THEME };

/** المخزن الفعلي المستخدم في التطبيق حالياً — نقطة واحدة للاستبدال لاحقاً */
export const store: Store = localStorageStore;
