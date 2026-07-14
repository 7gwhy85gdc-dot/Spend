import { store, STORAGE_KEYS } from '../data/storage';
import type { BackupPayload, HistoryEntry, Obligation, ObligationType, ThemeVars } from './types';
import { EDITABLE_VARS } from './theme-presets';
import { upgradePaymentLedger } from './migrate';
import { hasValidCurrencyPrecision } from './money';
import { isMonthKey } from './cycles';

export function buildBackup(): BackupPayload {
  const themeRaw = store.getRaw(STORAGE_KEYS.KEY_THEME);
  let theme: ThemeVars | null = null;
  if (themeRaw) {
    try { theme = JSON.parse(themeRaw); } catch { theme = null; }
  }
  return {
    obligations: store.getObligations(),
    history: store.getHistory(),
    salary: store.getSalary(),
    theme,
    exportedAt: new Date().toISOString(),
    version: 1,
  };
}

export function downloadBackup(): void {
  const payload = buildBackup();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = payload.exportedAt.split('T')[0];
  a.href = url;
  a.download = `التزاماتي-نسخة-احتياطية-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export class BackupValidationError extends Error {}

function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isObligationArray(v: unknown): v is Obligation[] {
  const types: ObligationType[] = ['دائم', 'مؤقت-أشهر', 'مؤقت-تاريخ'];
  return Array.isArray(v) && v.every((value) => {
    if (!value || typeof value !== 'object') return false;
    const o = value as Record<string, unknown>;
    if (!Number.isFinite(o.id) || typeof o.name !== 'string' || !o.name.trim()) return false;
    if (typeof o.cat !== 'string' || !Number.isFinite(o.amount) || !hasValidCurrencyPrecision(Number(o.amount))) return false;
    if (!Number.isInteger(o.dueDay) || Number(o.dueDay) < 1 || Number(o.dueDay) > 31) return false;
    if (!types.includes(o.type as ObligationType) || typeof o.notes !== 'string') return false;
    if (o.lastPaidMonth !== null && (typeof o.lastPaidMonth !== 'string' || !/^\d{4}-\d{2}$/.test(o.lastPaidMonth))) return false;
    if (o.partialPaidAmount !== undefined && (!Number.isFinite(o.partialPaidAmount) || Number(o.partialPaidAmount) < 0)) return false;
    if (o.partialPaidMonth !== undefined && o.partialPaidMonth !== null
      && (typeof o.partialPaidMonth !== 'string' || !/^\d{4}-\d{2}$/.test(o.partialPaidMonth))) return false;
    if (typeof o.finished !== 'boolean' || typeof o.createdAt !== 'string' || Number.isNaN(Date.parse(o.createdAt))) return false;
    if (o.remainingMonths !== undefined && (!Number.isInteger(o.remainingMonths) || Number(o.remainingMonths) < 0)) return false;
    if (o.initialMonths !== undefined && (!Number.isInteger(o.initialMonths) || Number(o.initialMonths) < 0)) return false;
    if (o.startMonth !== undefined && !isMonthKey(o.startMonth)) return false;
    if (o.totalMonths !== undefined && (!Number.isInteger(o.totalMonths) || Number(o.totalMonths) < 1 || Number(o.totalMonths) > 600)) return false;
    if (o.paymentLedgerVersion !== undefined && o.paymentLedgerVersion !== 1) return false;
    if (o.amountHistory !== undefined && (!Array.isArray(o.amountHistory) || !o.amountHistory.every((version) => {
      if (!version || typeof version !== 'object') return false;
      const item = version as Record<string, unknown>;
      return isMonthKey(item.fromMonth) && typeof item.amount === 'number' && hasValidCurrencyPrecision(item.amount);
    }))) return false;
    if (o.dueDayHistory !== undefined && (!Array.isArray(o.dueDayHistory) || !o.dueDayHistory.every((version) => {
      if (!version || typeof version !== 'object') return false;
      const item = version as Record<string, unknown>;
      return isMonthKey(item.fromMonth) && Number.isInteger(item.dueDay) && Number(item.dueDay) >= 1 && Number(item.dueDay) <= 31;
    }))) return false;
    if (o.endDate !== undefined && o.endDate !== null && !isValidISODate(o.endDate)) return false;
    if (o.type === 'مؤقت-أشهر' && !Number.isInteger(o.remainingMonths)) return false;
    if (o.type === 'مؤقت-تاريخ' && !isValidISODate(o.endDate)) return false;
    return true;
  });
}

function isHistoryArray(v: unknown): v is HistoryEntry[] {
  return Array.isArray(v) && v.every((value) => {
    if (!value || typeof value !== 'object') return false;
    const h = value as Record<string, unknown>;
    if (!Number.isFinite(h.id) || !Number.isFinite(h.oblId)) return false;
    if (typeof h.name !== 'string' || typeof h.cat !== 'string' || typeof h.method !== 'string') return false;
    if (!Number.isFinite(h.amount) || !hasValidCurrencyPrecision(Number(h.amount))) return false;
    if (!isValidISODate(h.paidDate)) return false;
    if (typeof h.monthLabel !== 'string') return false;
    return h.paymentMonth === undefined || isMonthKey(h.paymentMonth);
  });
}

function isThemeVars(v: unknown): v is ThemeVars {
  const allowedKeys = new Set(EDITABLE_VARS.map((item) => item.key));
  return !!v && typeof v === 'object' && !Array.isArray(v)
    && Object.entries(v).every(([key, value]) => allowedKeys.has(key)
      && typeof value === 'string'
      && /^#[\da-f]{6}$/i.test(value));
}

/** يتحقق من صحة بنية ملف النسخة الاحتياطية قبل استيراده */
export function parseBackupFile(raw: string): BackupPayload {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new BackupValidationError('الملف ليس بصيغة JSON صالحة');
  }
  if (!data || typeof data !== 'object') {
    throw new BackupValidationError('محتوى الملف غير صالح');
  }
  const d = data as Record<string, unknown>;
  if (!isObligationArray(d.obligations)) {
    throw new BackupValidationError('بيانات الالتزامات في الملف غير صالحة');
  }
  if (!isHistoryArray(d.history)) {
    throw new BackupValidationError('بيانات سجل المدفوعات في الملف غير صالحة');
  }
  if (d.salary !== null && d.salary !== undefined
    && (typeof d.salary !== 'number' || !Number.isFinite(d.salary) || d.salary < 0)) {
    throw new BackupValidationError('بيانات الراتب في الملف غير صالحة');
  }
  if (d.theme !== null && d.theme !== undefined && !isThemeVars(d.theme)) {
    throw new BackupValidationError('بيانات الثيم في الملف غير صالحة');
  }
  if (d.version !== undefined && d.version !== 1) {
    throw new BackupValidationError('إصدار النسخة الاحتياطية غير مدعوم');
  }
  return {
    obligations: d.obligations,
    history: d.history,
    salary: typeof d.salary === 'number' ? d.salary : null,
    theme: d.theme === null || d.theme === undefined ? null : d.theme,
    exportedAt: typeof d.exportedAt === 'string' ? d.exportedAt : new Date().toISOString(),
    version: 1,
  };
}

/** يستبدل كل البيانات الحالية ببيانات النسخة الاحتياطية المستوردة */
export function restoreBackup(payload: BackupPayload): void {
  store.saveObligations(payload.obligations);
  store.saveHistory(payload.history);
  upgradePaymentLedger(true);
  if (payload.salary !== null) {
    store.saveSalary(payload.salary);
  } else {
    store.clearSalary();
  }
  if (payload.theme) {
    store.setRaw(STORAGE_KEYS.KEY_THEME, JSON.stringify(payload.theme));
  } else {
    store.removeRaw(STORAGE_KEYS.KEY_THEME);
  }
}
