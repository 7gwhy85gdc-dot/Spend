import type { HistoryEntry, Obligation, ObligationStatus } from './types';
import { getCurrentCycle, getObligationStatus, isScheduledForMonth } from './cycles';
import { monthKey } from './dates';

export function isPaidForMonth(o: Obligation, refDate: Date, history: HistoryEntry[] = []): boolean {
  const cycle = getCurrentCycle(o, history, refDate);
  if (cycle) return cycle.paid;
  return o.paymentLedgerVersion !== 1 && o.lastPaidMonth === monthKey(refDate);
}

export function isActiveForMonth(o: Obligation, refDate: Date): boolean {
  return isScheduledForMonth(o, monthKey(refDate));
}

export function getStatus(o: Obligation, refDate: Date, history: HistoryEntry[] = []): ObligationStatus {
  return getObligationStatus(o, history, refDate);
}

/** هل الالتزام مستحق قريباً (خلال N أيام) ولم يُدفع بعد — يُستخدم للتذكيرات */
export function isDueSoon(o: Obligation, refDate: Date, withinDays: number, history: HistoryEntry[] = []): boolean {
  const status = getStatus(o, refDate, history);
  if (status !== 'قادم') return false;
  const cycle = getCurrentCycle(o, history, refDate);
  if (!cycle) return false;
  const due = cycle.dueDate;
  const todayMid = new Date();
  todayMid.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - todayMid.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= withinDays;
}
