import { describe, expect, it } from 'vitest';
import { getCycle, getOutstandingCycles, getScheduleProgress, isScheduledForMonth } from './cycles';
import { getStatus } from './status';
import type { HistoryEntry, Obligation } from './types';

function obligation(overrides: Partial<Obligation> = {}): Obligation {
  return {
    id: 1, name: 'التزام', cat: 'أخرى', amount: 100, dueDay: 15,
    type: 'دائم', startMonth: '2026-06', notes: '', lastPaidMonth: null,
    paymentLedgerVersion: 1, finished: false, createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function payment(targetMonth: string, amount = 100): HistoryEntry {
  return {
    id: Number(targetMonth.replace('-', '')), oblId: 1, name: 'التزام', cat: 'أخرى', amount,
    method: 'SADAD', paidDate: '2026-07-14', monthLabel: targetMonth, paymentMonth: targetMonth,
  };
}

describe('monthly obligation cycles', () => {
  const july = new Date(2026, 6, 14);

  it('keeps an unpaid previous permanent cycle as arrears', () => {
    const cycles = getOutstandingCycles(obligation(), [], july);
    expect(cycles.map((cycle) => cycle.month)).toEqual(['2026-06', '2026-07']);
    expect(getStatus(obligation(), july, [])).toBe('متأخر');
  });

  it('returns a deleted payment to the cycle balance because history is authoritative', () => {
    const o = obligation({ startMonth: '2026-07' });
    const history = [payment('2026-07')];
    expect(getCycle(o, history, '2026-07', july)?.paid).toBe(true);
    expect(getCycle(o, [], '2026-07', july)).toMatchObject({ paid: false, remainingAmount: 100 });
  });

  it('uses a fixed calendar schedule for temporary-month obligations', () => {
    const o = obligation({ type: 'مؤقت-أشهر', startMonth: '2026-06', totalMonths: 2, initialMonths: 2 });
    expect(isScheduledForMonth(o, '2026-06')).toBe(true);
    expect(isScheduledForMonth(o, '2026-07')).toBe(true);
    expect(isScheduledForMonth(o, '2026-08')).toBe(false);
    expect(getOutstandingCycles(o, [], new Date(2026, 7, 1)).map((cycle) => cycle.month))
      .toEqual(['2026-06', '2026-07']);
  });

  it('treats the end date as inclusive for temporary-date schedules', () => {
    const o = obligation({ type: 'مؤقت-تاريخ', startMonth: '2026-06', endDate: '2026-07-15' });
    expect(isScheduledForMonth(o, '2026-07')).toBe(true);
    expect(isScheduledForMonth(o, '2026-08')).toBe(false);
  });

  it('keeps the final unpaid date-based cycle overdue after the schedule ends', () => {
    const o = obligation({ type: 'مؤقت-تاريخ', startMonth: '2026-07', endDate: '2026-07-20' });
    const august = new Date(2026, 7, 10);
    expect(getOutstandingCycles(o, [], august).map((cycle) => cycle.month)).toEqual(['2026-07']);
    expect(getStatus(o, august, [])).toBe('متأخر');
  });

  it('shows a paid final date-based cycle as paid before becoming ended next month', () => {
    const o = obligation({ type: 'مؤقت-تاريخ', startMonth: '2026-07', endDate: '2026-07-20' });
    const history = [payment('2026-07')];
    expect(getStatus(o, july, history)).toBe('مدفوع');
    expect(getStatus(o, new Date(2026, 7, 1), history)).toBe('منتهي');
  });

  it('derives installment progress from paid cycles, not elapsed time', () => {
    const o = obligation({ type: 'مؤقت-أشهر', totalMonths: 3, initialMonths: 3 });
    const progress = getScheduleProgress(o, [payment('2026-06')], july);
    expect(progress).toMatchObject({ total: 3, paid: 1, remaining: 2 });
    expect(progress?.percent).toBeCloseTo(100 / 3);
    expect(getCycle(o, [payment('2026-06')], '2026-07', july)?.paid).toBe(false);
  });

  it('applies amount and due-day edits only from their effective month', () => {
    const o = obligation({
      amount: 600,
      dueDay: 20,
      amountHistory: [
        { fromMonth: '2026-06', amount: 500 },
        { fromMonth: '2026-07', amount: 600 },
      ],
      dueDayHistory: [
        { fromMonth: '2026-06', dueDay: 5 },
        { fromMonth: '2026-07', dueDay: 20 },
      ],
    });
    const history = [payment('2026-06', 500)];
    expect(getCycle(o, history, '2026-06', july)).toMatchObject({ paid: true, scheduledAmount: 500 });
    expect(getCycle(o, history, '2026-06', july)?.dueDate.getDate()).toBe(5);
    expect(getCycle(o, history, '2026-07', july)).toMatchObject({ paid: false, scheduledAmount: 600 });
    expect(getCycle(o, history, '2026-07', july)?.dueDate.getDate()).toBe(20);
  });
});
