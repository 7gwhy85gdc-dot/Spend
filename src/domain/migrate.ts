import { store } from '../data/storage';
import type { HistoryEntry, Obligation } from './types';
import { MONTHS_AR, monthKey, parseArabicDMY, todayStr } from './dates';
import { amountForMonth, getScheduleProgress, isMonthKey, paidMinorForMonth, shiftMonth } from './cycles';
import { fromMinorUnits, toMinorUnits } from './money';

const MIGRATION_FLAG = 'schema_v2_done';
const SEED_FLAG = 'initial_seed_v1_done';
const INITIAL_MONTHS_FLAG = 'initial_months_v1_done';
const PAYMENT_LEDGER_FLAG = 'payment_ledger_v1_done';

/**
 * يحوّل أي بيانات من نسخة الـ HTML القديمة (schema فيها status/dueDate مباشرة)
 * إلى البنية الحالية (dueDay + type + lastPaidMonth + finished) دون فقدان بيانات.
 * يعمل مرة واحدة فقط.
 */
export function migrateSchema(): void {
  if (store.getRaw(MIGRATION_FLAG)) return;
  const obls = store.getObligations();
  const today = new Date();
  const curKey = monthKey(today);

  const migrated = obls.map((o: any): Obligation => {
    if (o.lastPaidMonth !== undefined && o.finished !== undefined && o.status === undefined) {
      return o as Obligation;
    }
    const type = o.type || 'دائم';
    let remainingMonths: number | undefined;
    let endDate: string | null | undefined;
    let finished = false;
    let lastPaidMonth: string | null = null;

    if (type === 'مؤقت-أشهر') {
      remainingMonths = parseInt(o.rem);
      if (isNaN(remainingMonths)) remainingMonths = 0;
      if (remainingMonths <= 0) finished = true;
    } else if (type === 'مؤقت-تاريخ') {
      endDate = parseArabicDMY(o.rem) || (o.rem && String(o.rem).includes('-') ? o.rem : null);
      if (endDate && endDate < todayStr()) finished = true;
    }

    if (o.status === 'مدفوع' && !finished) {
      lastPaidMonth = curKey;
    }

    let dueDay = o.dueDay;
    if (!dueDay && o.dueDate) {
      const dd = new Date(o.dueDate + 'T00:00:00');
      if (!isNaN(dd.getTime())) dueDay = dd.getDate();
    }
    if (!dueDay) dueDay = 1;

    return {
      id: o.id,
      name: o.name,
      cat: o.cat || 'أخرى',
      amount: Number(o.amount) || 0,
      dueDay,
      type,
      remainingMonths,
      initialMonths: remainingMonths,
      endDate,
      notes: o.notes || '',
      lastPaidMonth,
      finished,
      createdAt: o.createdAt || new Date().toISOString(),
    };
  });

  store.saveObligations(migrated);
  store.setRaw(MIGRATION_FLAG, '1');
}

/** بيانات تجريبية عند أول استخدام فقط — لا تمسح بيانات حقيقية */
export function seedData(): void {
  if (store.getRaw(SEED_FLAG)) return;
  const existing = store.getObligations();
  if (existing.length > 0 || store.getRaw(MIGRATION_FLAG)) {
    store.setRaw(SEED_FLAG, '1');
    return;
  }
  const samples: Array<Pick<Obligation, 'name' | 'cat' | 'amount' | 'dueDay' | 'type' | 'notes'>> = [
    { name: 'إيجار السكن', cat: 'إيجار', amount: 2500, dueDay: 1, type: 'دائم', notes: '' },
    { name: 'فاتورة الكهرباء', cat: 'فواتير', amount: 380, dueDay: 5, type: 'دائم', notes: '' },
    { name: 'اشتراك الإنترنت', cat: 'اشتراكات', amount: 250, dueDay: 20, type: 'دائم', notes: 'stc' },
  ];
  const seeded: Obligation[] = samples.map((s, i) => ({
    id: Date.now() + i,
    ...s,
    remainingMonths: undefined,
    initialMonths: undefined,
    startMonth: monthKey(new Date()),
    endDate: undefined,
    lastPaidMonth: null,
    paymentLedgerVersion: 1,
    finished: false,
    createdAt: new Date().toISOString(),
  }));
  store.saveObligations(seeded);
  store.setRaw(SEED_FLAG, '1');
}

/** يضيف العدد الأصلي للالتزامات الشهرية القديمة حتى يصبح شريط التقدم ذا معنى من هذه النقطة فصاعداً. */
export function backfillInitialMonths(): void {
  if (store.getRaw(INITIAL_MONTHS_FLAG)) return;
  const obligations = store.getObligations();
  const history = store.getHistory();
  const next = obligations.map((o) => {
    if (o.type !== 'مؤقت-أشهر' || o.initialMonths !== undefined) return o;
    const paidMonths = new Set(
      history
        .filter((entry) => entry.oblId === o.id)
        .map((entry) => entry.paymentMonth ?? entry.paidDate.slice(0, 7))
        .filter((month) => /^\d{4}-\d{2}$/.test(month)),
    );
    return { ...o, initialMonths: Math.max(0, o.remainingMonths ?? 0) + paidMonths.size };
  });
  store.saveObligations(next);
  store.setRaw(INITIAL_MONTHS_FLAG, '1');
}

function migrationEntry(
  o: Obligation,
  amount: number,
  targetMonth: string,
  id: number,
): HistoryEntry {
  const targetRef = new Date(Number(targetMonth.slice(0, 4)), Number(targetMonth.slice(5, 7)) - 1, 1);
  return {
    id,
    oblId: o.id,
    name: o.name,
    cat: o.cat,
    amount,
    method: 'ترحيل من النسخة السابقة',
    paidDate: todayStr(),
    monthLabel: `${MONTHS_AR[targetRef.getMonth()]} ${targetRef.getFullYear().toLocaleString('en-US')}`,
    paymentMonth: targetMonth,
  };
}

/** يحوّل حالة الدفع الأحادية القديمة إلى سجل دفعات موزع على دورات شهرية دون فقدانها. */
export function upgradePaymentLedger(force = false): void {
  if (!force && store.getRaw(PAYMENT_LEDGER_FLAG)) return;
  const today = new Date();
  const currentMonth = monthKey(today);
  const originalHistory = store.getHistory();
  const history = [...originalHistory];
  let nextHistoryId = Math.max(Date.now(), ...history.map((entry) => Number(entry.id) + 1 || 0));

  const prepared = store.getObligations().map((o) => {
    const initial = Math.max(1, o.initialMonths ?? o.remainingMonths ?? 1);
    const completed = o.type === 'مؤقت-أشهر'
      ? Math.max(0, initial - Math.max(0, o.remainingMonths ?? initial))
      : 0;
    const knownMonths = history
      .filter((entry) => entry.oblId === o.id)
      .map((entry) => entry.paymentMonth ?? entry.paidDate.slice(0, 7))
      .filter(isMonthKey)
      .sort();
    const legacyMonths = [o.lastPaidMonth, o.partialPaidMonth].filter(isMonthKey);
    const earliestKnownMonth = [...knownMonths, ...legacyMonths].sort()[0];
    const inferredTemporaryStart = shiftMonth(currentMonth, -completed);
    const startMonth = isMonthKey(o.startMonth)
      ? o.startMonth
      : (o.type === 'مؤقت-أشهر'
        ? ([inferredTemporaryStart, earliestKnownMonth].filter(isMonthKey).sort()[0] ?? inferredTemporaryStart)
        : (earliestKnownMonth ?? currentMonth));
    const totalMonths = o.type === 'مؤقت-أشهر' ? Math.max(initial, o.totalMonths ?? 0) : undefined;
    const upgraded: Obligation = {
      ...o,
      startMonth,
      amountHistory: o.amountHistory?.length ? o.amountHistory : [{ fromMonth: startMonth, amount: o.amount }],
      dueDayHistory: o.dueDayHistory?.length ? o.dueDayHistory : [{ fromMonth: startMonth, dueDay: o.dueDay }],
      totalMonths,
      initialMonths: totalMonths ?? o.initialMonths,
      partialPaidAmount: 0,
      partialPaidMonth: null,
      paymentLedgerVersion: 1,
      finished: false,
    };

    const legacyTargets = new Set<string>();
    if (o.paymentLedgerVersion !== 1) {
      if (isMonthKey(o.partialPaidMonth) && toMinorUnits(o.partialPaidAmount ?? 0) > 0) legacyTargets.add(o.partialPaidMonth);
      if (isMonthKey(o.lastPaidMonth)) legacyTargets.add(o.lastPaidMonth);
    }
    legacyTargets.forEach((targetMonth) => {
      const existingMinor = paidMinorForMonth(history, o.id, targetMonth);
      const desiredMinor = o.lastPaidMonth === targetMonth
        ? toMinorUnits(amountForMonth(upgraded, targetMonth))
        : toMinorUnits(o.partialPaidAmount ?? 0);
      if (desiredMinor > existingMinor) {
        history.push(migrationEntry(o, fromMinorUnits(desiredMinor - existingMinor), targetMonth, nextHistoryId));
        nextHistoryId += 1;
      }
    });
    return upgraded;
  });

  const obligations = prepared.map((o) => {
    const progress = getScheduleProgress(o, history, today);
    return progress ? { ...o, remainingMonths: progress.remaining } : o;
  });
  store.saveHistory(history);
  store.saveObligations(obligations);
  store.setRaw(PAYMENT_LEDGER_FLAG, '1');
}
