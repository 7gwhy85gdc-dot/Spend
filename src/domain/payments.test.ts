import { describe, expect, it } from 'vitest';
import { applyPayment, applyPaymentToLedger, PaymentValidationError } from './payments';
import { getCycle, getOutstandingCycles } from './cycles';
import { getStatus } from './status';
import type { HistoryEntry, Obligation } from './types';

function makeObligation(overrides: Partial<Obligation> = {}): Obligation {
  return {
    id: 10, name: 'قسط', cat: 'أقساط', amount: 500, dueDay: 15,
    type: 'دائم', startMonth: '2026-07', notes: '', lastPaidMonth: null,
    paymentLedgerVersion: 1, finished: false, createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 1, oblId: 10, name: 'قسط', cat: 'أقساط', amount: 100,
    method: 'SADAD', paidDate: '2026-07-14', monthLabel: 'يوليو 2026', paymentMonth: '2026-07',
    ...overrides,
  };
}

describe('payment allocation', () => {
  const july = new Date(2026, 6, 14);

  it('records a partial payment without marking the cycle paid', () => {
    const applied = applyPayment(makeObligation(), [], 200, 'نقداً', july, '2026-07', 99);
    const history = [applied.entry!];
    expect(applied.result).toEqual({ completed: false, paidTotal: 200, remaining: 300, targetMonth: '2026-07' });
    expect(getCycle(applied.obligation, history, '2026-07', july)?.paid).toBe(false);
  });

  it('completes a cycle from cumulative payments using integer halalas', () => {
    const first = entry({ amount: 0.1 });
    const applied = applyPayment(makeObligation({ amount: 0.8 }), [first], 0.7, 'SADAD', july, '2026-07', 100);
    expect(applied.result.completed).toBe(true);
    expect(applied.result.remaining).toBe(0);
  });

  it('rejects overpayment and duplicate payment', () => {
    expect(() => applyPayment(makeObligation(), [], 501, 'SADAD', july, '2026-07', 100))
      .toThrow(PaymentValidationError);
    expect(() => applyPayment(makeObligation(), [entry({ amount: 500 })], 1, 'SADAD', july, '2026-07', 101))
      .toThrow('تم سداد');
  });

  it('rejects future prepayment, empty method, and sub-halalah precision', () => {
    const obligation = makeObligation({ startMonth: '2026-07' });
    expect(() => applyPayment(obligation, [], 500, 'SADAD', july, '2026-08', 104)).toThrow('مستقبلية');
    expect(() => applyPayment(obligation, [], 500, '', july, '2026-07', 105)).toThrow('طريقة الدفع');
    expect(() => applyPayment(obligation, [], 10.999, 'SADAD', july, '2026-07', 106)).toThrow('هللتين');
  });

  it('allocates a late payment to its original month, not the payment date month', () => {
    const obligation = makeObligation({ startMonth: '2026-06' });
    const applied = applyPayment(obligation, [], 500, 'SADAD', july, '2026-06', 102);
    expect(applied.entry?.paidDate).toBe('2026-07-14');
    expect(applied.entry?.paymentMonth).toBe('2026-06');
    const history = [applied.entry!];
    expect(getCycle(obligation, history, '2026-06', july)?.paid).toBe(true);
    expect(getCycle(obligation, history, '2026-07', july)?.paid).toBe(false);
  });

  it('keeps partial balances for separate months independently', () => {
    const obligation = makeObligation({ startMonth: '2026-06' });
    const history = [
      entry({ id: 1, amount: 200, paymentMonth: '2026-06', paidDate: '2026-06-20' }),
      entry({ id: 2, amount: 100, paymentMonth: '2026-07' }),
    ];
    expect(getCycle(obligation, history, '2026-06', july)?.remainingAmount).toBe(300);
    expect(getCycle(obligation, history, '2026-07', july)?.remainingAmount).toBe(400);
    expect(getOutstandingCycles(obligation, history, july)).toHaveLength(2);
  });

  it('keeps the final temporary installment visible as paid in its month', () => {
    const obligation = makeObligation({
      type: 'مؤقت-أشهر', startMonth: '2026-07', totalMonths: 1,
      initialMonths: 1, remainingMonths: 1,
    });
    const applied = applyPayment(obligation, [], 500, 'SADAD', july, '2026-07', 103);
    const history = [applied.entry!];
    expect(getStatus(applied.obligation, july, history)).toBe('مدفوع');
    expect(getStatus(applied.obligation, new Date(2026, 7, 1), history)).toBe('منتهي');
  });

  it('updates the obligation and history together through the ledger transaction', () => {
    const obligation = makeObligation();
    const applied = applyPaymentToLedger([obligation], [], obligation.id, 200, 'SADAD', july, '2026-07', 107);
    expect(applied.history).toHaveLength(1);
    expect(applied.history[0].amount).toBe(200);
    expect(getCycle(applied.obligations[0], applied.history, '2026-07', july)?.remainingAmount).toBe(300);
  });

  it('fails loudly when the selected obligation disappeared before saving', () => {
    expect(() => applyPaymentToLedger([], [], 404, 100, 'SADAD', july, '2026-07', 108))
      .toThrow('تعذر العثور على الالتزام');
  });
});
