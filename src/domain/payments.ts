import type { HistoryEntry, Obligation, PaymentResult } from './types';
import { amountForMonth, getCycle, isMonthKey } from './cycles';
import { MONTHS_AR, toLocalISODate } from './dates';
import { fromMinorUnits, hasValidCurrencyPrecision, toMinorUnits } from './money';

interface AppliedPayment {
  entry: HistoryEntry;
  obligation: Obligation;
  result: PaymentResult;
}

interface AppliedLedgerPayment {
  obligations: Obligation[];
  history: HistoryEntry[];
  result: PaymentResult;
}

export function applyPayment(
  obligation: Obligation,
  history: HistoryEntry[],
  amount: number,
  method: string,
  paidAt: Date,
  targetMonth: string,
  entryId: number,
): AppliedPayment {
  if (!isMonthKey(targetMonth)) throw new PaymentValidationError('شهر الاستحقاق غير صالح');
  if (targetMonth > toLocalISODate(paidAt).slice(0, 7)) throw new PaymentValidationError('لا يمكن دفع دورة مستقبلية قبل حلول شهرها');
  if (!hasValidCurrencyPrecision(String(amount))) throw new PaymentValidationError('المبلغ يجب أن يكون بحد أقصى هللتين');
  if (!method.trim()) throw new PaymentValidationError('اختر طريقة الدفع');
  const cycle = getCycle(obligation, history, targetMonth, paidAt);
  if (!cycle) throw new PaymentValidationError('هذا الشهر ليس ضمن مدة الالتزام');
  if (cycle.paid) throw new PaymentValidationError('تم سداد هذا الاستحقاق بالكامل');
  const amountMinor = toMinorUnits(amount);
  const remainingMinor = toMinorUnits(cycle.remainingAmount);
  if (amountMinor <= 0) throw new PaymentValidationError('أدخل مبلغاً صحيحاً');
  if (amountMinor > remainingMinor) throw new PaymentValidationError('المبلغ أكبر من المتبقي على هذا الاستحقاق');

  const entry: HistoryEntry = {
    id: entryId,
    oblId: obligation.id,
    name: obligation.name,
    cat: obligation.cat,
    amount: fromMinorUnits(amountMinor),
    method,
    paidDate: toLocalISODate(paidAt),
    monthLabel: `${MONTHS_AR[paidAt.getMonth()]} ${paidAt.getFullYear().toLocaleString('en-US')}`,
    paymentMonth: targetMonth,
  };

  const paidTotalMinor = toMinorUnits(cycle.paidAmount) + amountMinor;
  const completed = paidTotalMinor >= toMinorUnits(amountForMonth(obligation, targetMonth));
  const updated: Obligation = {
    ...obligation,
    lastPaidMonth: completed ? targetMonth : obligation.lastPaidMonth,
    partialPaidAmount: 0,
    partialPaidMonth: null,
    paymentLedgerVersion: 1,
  };
  updated.finished = false;

  return {
    entry,
    obligation: updated,
    result: {
      completed,
      paidTotal: fromMinorUnits(paidTotalMinor),
      remaining: fromMinorUnits(Math.max(0, toMinorUnits(amountForMonth(obligation, targetMonth)) - paidTotalMinor)),
      targetMonth,
    },
  };
}

/**
 * ينفذ عملية الدفع على نسخة واحدة متسقة من الالتزامات والسجل.
 * وجود هذه الطبقة يمنع الواجهة من إغلاق نافذة الدفع بصمت إذا أصبح الالتزام
 * المحدد غير موجود، ويجعل مسار التخزين كاملاً قابلاً للاختبار كوحدة واحدة.
 */
export function applyPaymentToLedger(
  obligations: Obligation[],
  history: HistoryEntry[],
  obligationId: number,
  amount: number,
  method: string,
  paidAt: Date,
  targetMonth: string,
  entryId: number,
): AppliedLedgerPayment {
  const index = obligations.findIndex((obligation) => obligation.id === obligationId);
  if (index === -1) throw new PaymentValidationError('تعذر العثور على الالتزام المطلوب');

  const applied = applyPayment(
    obligations[index],
    history,
    amount,
    method,
    paidAt,
    targetMonth,
    entryId,
  );
  const nextObligations = [...obligations];
  nextObligations[index] = applied.obligation;
  return {
    obligations: nextObligations,
    history: [...history, applied.entry],
    result: applied.result,
  };
}

export class PaymentValidationError extends Error {}
