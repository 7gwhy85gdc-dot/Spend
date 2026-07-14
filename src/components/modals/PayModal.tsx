import { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../../context/data-context';
import { useModal } from '../../context/modal-context';
import { useToast } from '../../context/toast-context';
import { fmtAmt, fmtDate, todayStr, toLocalISODate } from '../../domain/dates';
import { getOutstandingCycles } from '../../domain/cycles';
import { hasValidCurrencyPrecision, toMinorUnits } from '../../domain/money';
import { PaymentValidationError } from '../../domain/payments';

const METHODS = ['SADAD', 'تحويل بنكي', 'بطاقة ائتمان', 'نقداً', 'STC Pay', 'أخرى'];

export function PayModal() {
  const { payOpen, payingId, closePay } = useModal();
  const { obligations, history, confirmPayment } = useData();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('SADAD');
  const [selectedMonth, setSelectedMonth] = useState('');
  const submittingRef = useRef(false);

  const o = payingId != null ? obligations.find((x) => x.id === payingId) : undefined;
  const currentDay = todayStr();
  const today = useMemo(() => new Date(`${currentDay}T00:00:00`), [currentDay]);
  const targets = useMemo(() => o ? getOutstandingCycles(o, history, today) : [], [o, history, today]);
  const selectedCycle = targets.find((cycle) => cycle.month === selectedMonth) ?? targets[0];

  useEffect(() => {
    if (payOpen && o && targets[0]) {
      submittingRef.current = false;
      setSelectedMonth(targets[0].month);
      setAmount(String(targets[0].remainingAmount));
      setMethod('SADAD');
    }
  }, [payOpen, o, targets]);

  const handleTargetChange = (targetMonth: string) => {
    const cycle = targets.find((item) => item.month === targetMonth);
    setSelectedMonth(targetMonth);
    if (cycle) setAmount(String(cycle.remainingAmount));
  };

  const handleConfirm = () => {
    if (!o || !selectedCycle || submittingRef.current) return;
    const amt = parseFloat(amount);
    if (!hasValidCurrencyPrecision(amount)) { showToast('أدخل مبلغاً صحيحاً بحد أقصى هللتين', true); return; }
    if (toMinorUnits(amt) > toMinorUnits(selectedCycle.remainingAmount)) {
      showToast('المبلغ أكبر من المتبقي على الاستحقاق', true);
      return;
    }
    submittingRef.current = true;
    try {
      const result = confirmPayment(o.id, amt, method, selectedCycle.month);
      closePay();
      showToast(result.completed
        ? `✅ اكتمل سداد ${o.name} لدورة ${result.targetMonth}`
        : `تم تسجيل الدفعة — المتبقي ${fmtAmt(result.remaining)} ر.س`);
    } catch (error) {
      submittingRef.current = false;
      showToast(error instanceof PaymentValidationError ? error.message : 'تعذر تسجيل الدفعة', true);
    }
  };

  return (
    <div className={`overlay ${payOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closePay(); }}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">✅ تسجيل الدفع</div>

        <div className="pay-info">
          <div className="pay-info-name">{o?.name}</div>
          <div className="pay-info-date">
            {o && selectedCycle ? `الاستحقاق: ${fmtDate(toLocalISODate(selectedCycle.dueDate))} · ${fmtAmt(o.amount)} ر.س` : ''}
          </div>
          {selectedCycle?.paidAmount ? (
            <div className="pay-info-date">مدفوع جزئياً: {fmtAmt(selectedCycle.paidAmount)} ر.س · المتبقي: {fmtAmt(selectedCycle.remainingAmount)} ر.س</div>
          ) : null}
          {targets.length > 1 && (
            <div className="pay-info-date">لديك {targets.length.toLocaleString('en-US')} دورات غير مكتملة</div>
          )}
        </div>

        {targets.length > 1 && (
          <div className="form-group">
            <label className="form-label">دورة الاستحقاق</label>
            <select className="form-control" value={selectedCycle?.month ?? ''} onChange={(e) => handleTargetChange(e.target.value)}>
              {targets.map((cycle) => (
                <option key={cycle.month} value={cycle.month}>
                  {cycle.month} — متبقي {fmtAmt(cycle.remainingAmount)} ر.س
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">المبلغ المدفوع (ر.س)</label>
          <input className="form-control" type="number" min={0.01} step={0.01} max={selectedCycle?.remainingAmount}
            inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">طريقة الدفع</label>
          <select className="form-control" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>

        <button
          className="btn-modal-confirm"
          style={{ background: 'linear-gradient(135deg,#0D9E5C,#059669)', boxShadow: '0 2px 16px rgba(13,158,92,0.4)' }}
          onClick={handleConfirm}
        >
          ✅ سجّل الدفعة
        </button>
        <button className="btn-modal-cancel" onClick={closePay}>إلغاء</button>
      </div>
    </div>
  );
}
