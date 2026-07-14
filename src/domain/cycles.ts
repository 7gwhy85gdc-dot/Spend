import type { HistoryEntry, Obligation, ObligationStatus } from './types';
import { dueDateForMonth, monthKey, parseISODate } from './dates';
import { fromMinorUnits, toMinorUnits } from './money';

export interface ObligationCycle {
  month: string;
  dueDate: Date;
  scheduledAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paid: boolean;
  overdue: boolean;
}

function monthIndex(key: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return 0;
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

export function isMonthKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

export function monthDate(key: string): Date {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function shiftMonth(key: string, delta: number): string {
  const date = monthDate(key);
  date.setMonth(date.getMonth() + delta);
  return monthKey(date);
}

export function monthsBetween(from: string, to: string): number {
  return monthIndex(to) - monthIndex(from);
}

export function obligationStartMonth(o: Obligation): string {
  if (isMonthKey(o.startMonth)) return o.startMonth;
  const created = new Date(o.createdAt);
  return Number.isNaN(created.getTime()) ? monthKey(new Date()) : monthKey(created);
}

export function totalScheduledMonths(o: Obligation): number {
  return Math.min(600, Math.max(1, o.totalMonths ?? o.initialMonths ?? o.remainingMonths ?? 1));
}

export function amountForMonth(o: Obligation, targetMonth: string): number {
  const versions = (o.amountHistory ?? [])
    .filter((version) => isMonthKey(version.fromMonth) && monthsBetween(version.fromMonth, targetMonth) >= 0)
    .sort((a, b) => a.fromMonth.localeCompare(b.fromMonth));
  return versions.at(-1)?.amount ?? o.amount;
}

export function dueDayForMonth(o: Obligation, targetMonth: string): number {
  const versions = (o.dueDayHistory ?? [])
    .filter((version) => isMonthKey(version.fromMonth) && monthsBetween(version.fromMonth, targetMonth) >= 0)
    .sort((a, b) => a.fromMonth.localeCompare(b.fromMonth));
  return versions.at(-1)?.dueDay ?? o.dueDay;
}

export function isScheduledForMonth(o: Obligation, targetMonth: string): boolean {
  if (!isMonthKey(targetMonth)) return false;
  const start = obligationStartMonth(o);
  const offset = monthsBetween(start, targetMonth);
  if (offset < 0) return false;
  if (o.type === 'دائم') return true;
  if (o.type === 'مؤقت-أشهر') return offset < totalScheduledMonths(o);
  if (!o.endDate) return false;
  const end = parseISODate(o.endDate);
  if (!end) return false;
  const ref = monthDate(targetMonth);
  return dueDateForMonth({ ...o, dueDay: dueDayForMonth(o, targetMonth) }, ref.getFullYear(), ref.getMonth()) <= end;
}

function entryMonth(entry: HistoryEntry): string | null {
  if (isMonthKey(entry.paymentMonth)) return entry.paymentMonth;
  const fallback = entry.paidDate.slice(0, 7);
  return isMonthKey(fallback) ? fallback : null;
}

export function paidMinorForMonth(history: HistoryEntry[], obligationId: number, targetMonth: string): number {
  return history.reduce((sum, entry) => {
    if (entry.oblId !== obligationId || entryMonth(entry) !== targetMonth) return sum;
    return sum + Math.max(0, toMinorUnits(entry.amount));
  }, 0);
}

function legacyPaidMinor(o: Obligation, targetMonth: string): number {
  if (o.paymentLedgerVersion === 1) return 0;
  if (o.lastPaidMonth === targetMonth) return toMinorUnits(o.amount);
  if (o.partialPaidMonth === targetMonth) return Math.max(0, toMinorUnits(o.partialPaidAmount ?? 0));
  return 0;
}

export function getCycle(o: Obligation, history: HistoryEntry[], targetMonth: string, today = new Date()): ObligationCycle | null {
  if (!isScheduledForMonth(o, targetMonth)) return null;
  const ref = monthDate(targetMonth);
  const dueDate = dueDateForMonth({ ...o, dueDay: dueDayForMonth(o, targetMonth) }, ref.getFullYear(), ref.getMonth());
  const scheduledAmount = amountForMonth(o, targetMonth);
  const scheduledMinor = toMinorUnits(scheduledAmount);
  const paidMinor = Math.max(paidMinorForMonth(history, o.id, targetMonth), legacyPaidMinor(o, targetMonth));
  const remainingMinor = Math.max(0, scheduledMinor - paidMinor);
  const todayMid = new Date(today);
  todayMid.setHours(0, 0, 0, 0);
  return {
    month: targetMonth,
    dueDate,
    scheduledAmount: fromMinorUnits(scheduledMinor),
    paidAmount: fromMinorUnits(Math.min(scheduledMinor, paidMinor)),
    remainingAmount: fromMinorUnits(remainingMinor),
    paid: remainingMinor === 0,
    overdue: remainingMinor > 0 && dueDate < todayMid,
  };
}

export function getCyclesThrough(o: Obligation, history: HistoryEntry[], throughDate: Date): ObligationCycle[] {
  const start = obligationStartMonth(o);
  const through = monthKey(throughDate);
  const totalCount = Math.max(0, monthsBetween(start, through) + 1);
  const firstOffset = Math.max(0, totalCount - 600);
  const cycles: ObligationCycle[] = [];
  for (let index = firstOffset; index < totalCount; index += 1) {
    const cycle = getCycle(o, history, shiftMonth(start, index), throughDate);
    if (cycle) cycles.push(cycle);
  }
  return cycles;
}

export function getOutstandingCycles(o: Obligation, history: HistoryEntry[], throughDate: Date): ObligationCycle[] {
  return getCyclesThrough(o, history, throughDate).filter((cycle) => cycle.remainingAmount > 0);
}

export function getCurrentCycle(o: Obligation, history: HistoryEntry[], refDate: Date): ObligationCycle | null {
  return getCycle(o, history, monthKey(refDate), refDate);
}

export function isScheduleEnded(o: Obligation, refDate: Date): boolean {
  if (o.type === 'دائم') return false;
  return !isScheduledForMonth(o, monthKey(refDate))
    && monthsBetween(obligationStartMonth(o), monthKey(refDate)) >= 0;
}

export function getObligationStatus(o: Obligation, history: HistoryEntry[], refDate: Date): ObligationStatus {
  const outstanding = getOutstandingCycles(o, history, refDate);
  if (outstanding.some((cycle) => cycle.overdue)) return 'متأخر';
  const current = getCurrentCycle(o, history, refDate);
  if (current?.paid) return 'مدفوع';
  if (current) return current.overdue ? 'متأخر' : 'قادم';
  if (outstanding.length > 0) return 'متأخر';
  return isScheduleEnded(o, refDate) ? 'منتهي' : 'قادم';
}

export function getScheduleProgress(o: Obligation, history: HistoryEntry[], refDate: Date) {
  if (o.type !== 'مؤقت-أشهر') return null;
  const total = totalScheduledMonths(o);
  let paid = 0;
  for (let index = 0; index < total; index += 1) {
    const cycle = getCycle(o, history, shiftMonth(obligationStartMonth(o), index), refDate);
    if (cycle?.paid) paid += 1;
  }
  return { total, paid, remaining: total - paid, percent: total > 0 ? (paid / total) * 100 : 0 };
}
