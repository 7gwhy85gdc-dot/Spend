import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStatus, isActiveForMonth, isDueSoon, isPaidForMonth } from './status';
import type { Obligation } from './types';

function makeObl(overrides: Partial<Obligation> = {}): Obligation {
  return {
    id: 1, name: 'test', cat: 'أخرى', amount: 100, dueDay: 15,
    type: 'دائم', notes: '', lastPaidMonth: null, finished: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('status logic (system date fixed to 2026-07-14)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 14)); // 14 يوليو 2026
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks an obligation due earlier this month, unpaid, as متأخر', () => {
    const o = makeObl({ dueDay: 5 });
    expect(getStatus(o, new Date())).toBe('متأخر');
  });

  it('marks an obligation due later this month as قادم', () => {
    const o = makeObl({ dueDay: 25 });
    expect(getStatus(o, new Date())).toBe('قادم');
  });

  it('marks an obligation paid for the current month as مدفوع', () => {
    const o = makeObl({ dueDay: 5, lastPaidMonth: '2026-07' });
    expect(getStatus(o, new Date())).toBe('مدفوع');
    expect(isPaidForMonth(o, new Date())).toBe(true);
  });

  it('marks a temporary obligation ended only after its schedule is complete with no arrears', () => {
    const o = makeObl({
      type: 'مؤقت-أشهر', startMonth: '2026-06', totalMonths: 1,
      initialMonths: 1, paymentLedgerVersion: 1,
    });
    const history = [{
      id: 1, oblId: 1, name: 'test', cat: 'أخرى', amount: 100,
      method: 'SADAD', paidDate: '2026-06-15', monthLabel: 'يونيو 2026', paymentMonth: '2026-06',
    }];
    expect(getStatus(o, new Date(), history)).toBe('منتهي');
  });

  it('treats مؤقت-تاريخ obligations past their end date as inactive/منتهي', () => {
    const o = makeObl({ type: 'مؤقت-تاريخ', endDate: '2026-06-01', dueDay: 10 });
    expect(isActiveForMonth(o, new Date())).toBe(false);
    expect(getStatus(o, new Date())).toBe('منتهي');
  });

  it('treats مؤقت-تاريخ obligations before their end date as active', () => {
    const o = makeObl({ type: 'مؤقت-تاريخ', endDate: '2026-12-01', dueDay: 25 });
    expect(isActiveForMonth(o, new Date())).toBe(true);
    expect(getStatus(o, new Date())).toBe('قادم');
  });

  it('isDueSoon flags unpaid items due within the window but not overdue ones', () => {
    const soon = makeObl({ dueDay: 16 }); // بعد يومين
    const far = makeObl({ dueDay: 30 });
    const overdue = makeObl({ dueDay: 5 });
    expect(isDueSoon(soon, new Date(), 3)).toBe(true);
    expect(isDueSoon(far, new Date(), 3)).toBe(false);
    expect(isDueSoon(overdue, new Date(), 3)).toBe(false);
  });
});
