import { useEffect, useState } from 'react';
import { useData, type NewObligationInput } from '../../context/data-context';
import { useModal } from '../../context/modal-context';
import { useToast } from '../../context/toast-context';
import { clampDay, monthKey, parseISODate } from '../../domain/dates';
import { isPaidForMonth } from '../../domain/status';
import type { Obligation, ObligationType } from '../../domain/types';
import { hasValidCurrencyPrecision, toMinorUnits } from '../../domain/money';
import { dueDayForMonth, getCyclesThrough, isMonthKey, isScheduledForMonth, monthDate, monthsBetween, paidMinorForMonth } from '../../domain/cycles';

const CATEGORIES = ['إيجار', 'فواتير', 'أقساط', 'تأمين', 'اشتراكات', 'مصاريف ثابتة', 'أخرى'];
const TYPES: ObligationType[] = ['دائم', 'مؤقت-أشهر', 'مؤقت-تاريخ'];

const EMPTY_FORM = {
  name: '', cat: 'إيجار', amount: '', day: '', type: 'دائم' as ObligationType,
  remMonths: '', remDate: '', notes: '', paid: false,
};

export function AddEditModal() {
  const { addEditOpen, editingId, closeAddEdit } = useModal();
  const { obligations, history, addObligation, updateObligation, confirmPayment } = useData();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!addEditOpen) return;
    if (editingId != null) {
      const o = obligations.find((x) => x.id === editingId);
      if (o) {
        setForm({
          name: o.name, cat: o.cat, amount: String(o.amount), day: String(o.dueDay || ''),
          type: o.type, remMonths: o.totalMonths != null ? String(o.totalMonths) : String(o.initialMonths ?? o.remainingMonths ?? ''),
          remDate: o.endDate || '', notes: o.notes || '',
          paid: isPaidForMonth(o, new Date(), history),
        });
      }
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [addEditOpen, editingId, obligations, history]);

  const handleSave = () => {
    const name = form.name.trim();
    const amount = parseFloat(form.amount);
    if (!name) { setError('أدخل اسم الالتزام'); showToast('أدخل اسم الالتزام', true); return; }
    if (!hasValidCurrencyPrecision(form.amount)) { setError('أدخل مبلغاً صحيحاً بحد أقصى هللتين'); showToast('أدخل مبلغاً صحيحاً بحد أقصى هللتين', true); return; }

    const day = Math.min(31, Math.max(1, parseInt(form.day) || 1));
    const today = new Date();
    const existing = editingId != null ? obligations.find((o) => o.id === editingId) : undefined;
    const existingHistory = existing ? history.filter((entry) => entry.oblId === existing.id) : [];
    if (existing && existing.type !== form.type) {
      setError('لا يمكن تغيير نوع الالتزام بعد إنشائه؛ أنشئ التزاماً جديداً بدلًا منه');
      showToast('لا يمكن تغيير نوع الالتزام بعد إنشائه', true);
      return;
    }
    if (existing) {
      const currentPaidMinor = paidMinorForMonth(history, existing.id, monthKey(today));
      if (toMinorUnits(amount) < currentPaidMinor) {
        setError('المبلغ الجديد أقل من المدفوع في دورة الشهر الحالي');
        showToast('المبلغ الجديد أقل من المدفوع في دورة الشهر الحالي', true);
        return;
      }
    }
    const startMonth = existing && existing.type === form.type
      ? (existing.startMonth ?? monthKey(today))
      : monthKey(today);

    let remainingMonths: number | undefined;
    let initialMonths: number | undefined;
    let endDate: string | null | undefined;
    let totalMonths: number | undefined;

    if (form.type === 'مؤقت-أشهر') {
      totalMonths = parseInt(form.remMonths);
      if (isNaN(totalMonths) || totalMonths <= 0 || totalMonths > 600) {
        setError('أدخل عدداً بين 1 و600 قسط');
        showToast('أدخل عدداً بين 1 و600 قسط', true);
        return;
      }
      remainingMonths = totalMonths;
      initialMonths = totalMonths;
      const lastPaidOffset = existing
        ? history
          .filter((entry) => entry.oblId === existing.id)
          .map((entry) => entry.paymentMonth ?? entry.paidDate.slice(0, 7))
          .filter(isMonthKey)
          .reduce((max, paidMonth) => Math.max(max, monthsBetween(startMonth, paidMonth)), -1)
        : -1;
      if (totalMonths <= lastPaidOffset) {
        setError('لا يمكن تقليل العدد بحيث يلغي دورة لها دفعات مسجلة');
        showToast('لا يمكن تقليل العدد بحيث يلغي دورة لها دفعات مسجلة', true);
        return;
      }
    } else if (form.type === 'مؤقت-تاريخ') {
      endDate = form.remDate || null;
      if (!endDate) {
        setError('اختر تاريخ انتهاء الالتزام');
        showToast('اختر تاريخ انتهاء الالتزام', true);
        return;
      }
      const end = parseISODate(endDate);
      const startRef = monthDate(startMonth);
      const firstDueDay = existing && startMonth !== monthKey(today) ? dueDayForMonth(existing, startMonth) : day;
      const firstDue = new Date(startRef.getFullYear(), startRef.getMonth(), clampDay(startRef.getFullYear(), startRef.getMonth(), firstDueDay));
      if (!end || end < firstDue) {
        setError('تاريخ الانتهاء يجب أن يشمل استحقاقاً واحداً على الأقل');
        showToast('تاريخ الانتهاء يجب أن يشمل استحقاقاً واحداً على الأقل', true);
        return;
      }
    }

    const currentMonth = monthKey(today);
    const amountHistory = [
      ...(existing?.amountHistory ?? (existing ? [{ fromMonth: startMonth, amount: existing.amount }] : []))
        .filter((version) => version.fromMonth !== currentMonth),
      { fromMonth: currentMonth, amount },
    ].sort((a, b) => a.fromMonth.localeCompare(b.fromMonth));
    const dueDayHistory = [
      ...(existing?.dueDayHistory ?? (existing ? [{ fromMonth: startMonth, dueDay: existing.dueDay }] : []))
        .filter((version) => version.fromMonth !== currentMonth),
      { fromMonth: currentMonth, dueDay: day },
    ].sort((a, b) => a.fromMonth.localeCompare(b.fromMonth));

    const input: NewObligationInput = {
      name, cat: form.cat, amount, amountHistory, dueDay: day, dueDayHistory, type: form.type,
      startMonth, totalMonths, remainingMonths, initialMonths, endDate, notes: form.notes.trim(),
      lastPaidMonth: existing?.lastPaidMonth ?? null,
      partialPaidAmount: 0,
      partialPaidMonth: null,
      paymentLedgerVersion: 1,
      finished: false,
    };
    const candidate: Obligation = existing
      ? { ...existing, ...input }
      : { ...input, id: 0, createdAt: new Date().toISOString() };
    const excludedPaidCycle = existingHistory
      .map((entry) => entry.paymentMonth ?? entry.paidDate.slice(0, 7))
      .filter(isMonthKey)
      .find((paidMonth) => !isScheduledForMonth(candidate, paidMonth));
    if (excludedPaidCycle) {
      setError(`التعديل يلغي دورة ${excludedPaidCycle} ولها دفعات مسجلة`);
      showToast(`التعديل يلغي دورة ${excludedPaidCycle} ولها دفعات مسجلة`, true);
      return;
    }
    if (existing) {
      const removedCycle = getCyclesThrough(existing, history, today)
        .find((cycle) => !isScheduledForMonth(candidate, cycle.month));
      if (removedCycle) {
        setError(`التعديل يلغي دورة مستحقة ${removedCycle.month}`);
        showToast(`لا يمكن إلغاء دورة مستحقة ${removedCycle.month}`, true);
        return;
      }
    }

    if (editingId != null) {
      updateObligation(editingId, input);
      showToast('تم التعديل ✓');
    } else {
      const id = addObligation(input);
      if (form.paid) confirmPayment(id, amount, 'مدفوع قبل التسجيل', monthKey(today));
      showToast('تمت الإضافة ✓');
    }
    closeAddEdit();
  };

  return (
    <div className={`overlay ${addEditOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeAddEdit(); }}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">{editingId != null ? 'تعديل الالتزام' : 'إضافة التزام جديد'}</div>

        <div className="form-group">
          <label className="form-label">اسم الالتزام *</label>
          <input className="form-control" placeholder="مثل: إيجار السكن" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">الفئة</label>
            <select className="form-control" value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">المبلغ (ر.س) *</label>
            <input className="form-control" type="number" min={0.01} step={0.01} placeholder="0.00" inputMode="decimal"
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">يوم الاستحقاق من الشهر</label>
            <input className="form-control" type="number" min={1} max={31} placeholder="مثال: 15" inputMode="numeric"
              value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">النوع</label>
            <select className="form-control" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ObligationType })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          {form.type === 'مؤقت-أشهر' && (
            <div className="form-group">
              <label className="form-label">إجمالي عدد الأقساط الشهرية</label>
              <input className="form-control" type="number" min={1} max={600} inputMode="numeric" placeholder="مثال: 6"
                value={form.remMonths} onChange={(e) => setForm({ ...form, remMonths: e.target.value })} />
            </div>
          )}
          {form.type === 'مؤقت-تاريخ' && (
            <div className="form-group">
              <label className="form-label">تاريخ الانتهاء</label>
              <input className="form-control" type="date" value={form.remDate}
                onChange={(e) => setForm({ ...form, remDate: e.target.value })} />
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">ملاحظات</label>
          <input className="form-control" placeholder="اختياري" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        {editingId == null && (
          <div className="checkbox-row">
            <input type="checkbox" id="f_paid" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} />
            <label htmlFor="f_paid">تم دفع استحقاق الشهر الحالي بالفعل</label>
          </div>
        )}
        {error && <div className="form-error">{error}</div>}

        <button className="btn-modal-confirm" onClick={handleSave}>💾 حفظ</button>
        <button className="btn-modal-cancel" onClick={closeAddEdit}>إلغاء</button>
      </div>
    </div>
  );
}
