import { describe, expect, it } from 'vitest';
import { clampDay, dueDateForMonth, fmtDate, monthKey, toLocalISODate } from './dates';
import type { Obligation } from './types';

function makeObl(dueDay: number): Obligation {
  return {
    id: 1, name: 'test', cat: 'أخرى', amount: 100, dueDay,
    type: 'دائم', notes: '', lastPaidMonth: null, finished: false,
    createdAt: new Date().toISOString(),
  };
}

describe('clampDay', () => {
  it('keeps a valid day unchanged', () => {
    expect(clampDay(2026, 0, 15)).toBe(15); // يناير 2026
  });

  it('clamps day 31 down to 28 in February (non-leap year)', () => {
    expect(clampDay(2026, 1, 31)).toBe(28); // فبراير 2026 (غير كبيسة)
  });

  it('clamps day 31 down to 29 in February of a leap year', () => {
    expect(clampDay(2028, 1, 31)).toBe(29); // فبراير 2028 (كبيسة)
  });

  it('clamps day 31 down to 30 in April', () => {
    expect(clampDay(2026, 3, 31)).toBe(30);
  });

  it('treats day 0 or missing as day 1', () => {
    expect(clampDay(2026, 0, 0)).toBe(1);
    expect(clampDay(2026, 0, undefined as unknown as number)).toBe(1);
  });
});

describe('dueDateForMonth', () => {
  it('produces the clamped due date for the given month', () => {
    const o = makeObl(31);
    const due = dueDateForMonth(o, 2026, 1); // فبراير
    expect(due.getDate()).toBe(28);
    expect(due.getMonth()).toBe(1);
  });
});

describe('toLocalISODate', () => {
  it('uses local date components — never shifts a day across timezones like toISOString does', () => {
    // منتصف ليل 1 يوليو محلياً: toISOString كان يرجعها "30 يونيو" في التوقيتات شرق غرينتش
    const d = new Date(2026, 6, 1, 0, 0, 0);
    expect(toLocalISODate(d)).toBe('2026-07-01');
    expect(fmtDate(toLocalISODate(d))).toContain('يوليو');
  });

  it('round-trips the due date of an obligation on day 1', () => {
    const o = makeObl(1);
    const due = dueDateForMonth(o, 2026, 6);
    expect(toLocalISODate(due)).toBe('2026-07-01');
  });
});

describe('monthKey', () => {
  it('formats as YYYY-MM with zero-padded month', () => {
    expect(monthKey(new Date(2026, 0, 5))).toBe('2026-01');
    expect(monthKey(new Date(2026, 10, 5))).toBe('2026-11');
  });
});
