import type { Obligation } from './types';

export const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD من المكوّنات المحلية — لا تستخدم toISOString لأنها تحوّل لـ UTC وترجع التاريخ يوماً في المناطق شرق غرينتش */
export function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayStr(): string {
  return toLocalISODate(new Date());
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function fmtAmt(n: number | string): string {
  const num = Number(n);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt.getTime())) return '—';
  return `${dt.getDate().toLocaleString('en-US')} ${MONTHS_AR[dt.getMonth()]} ${dt.getFullYear().toLocaleString('en-US')}`;
}

/** يحسب أقصى يوم صالح ضمن شهر معيّن (لمعالجة 30/31/28/29) */
export function clampDay(year: number, month: number, day: number): number {
  const maxD = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(1, day || 1), maxD);
}

/** تاريخ الاستحقاق الفعلي لالتزام معيّن ضمن شهر/سنة معطاة — يُحسب ديناميكياً، غير مخزَّن */
export function dueDateForMonth(o: Obligation, year: number, month: number): Date {
  return new Date(year, month, clampDay(year, month, o.dueDay));
}

export function parseISODate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const dt = new Date(s + 'T00:00:00');
  return isNaN(dt.getTime()) ? null : dt;
}

export function parseArabicDMY(s: string | null | undefined): string | null {
  if (!s) return null;
  const parts = String(s).split('/').map((x) => x.trim());
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y || d > 31 || m > 12) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}
