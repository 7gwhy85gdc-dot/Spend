import { useMemo } from 'react';
import { useData } from '../../context/data-context';
import { useConfirm } from '../../context/confirm-context';
import { useToast } from '../../context/toast-context';
import { fmtAmt, fmtDate } from '../../domain/dates';

export function HistoryTab() {
  const { history, deleteHistoryEntry } = useData();
  const { showConfirm } = useConfirm();
  const { showToast } = useToast();

  const reversed = useMemo(() => history.slice().reverse(), [history]);

  const handleDelete = (id: number) => {
    const h = history.find((x) => x.id === id);
    if (!h) return;
    showConfirm(
      `حذف دفعة "${h.name}" (${fmtAmt(h.amount)} ر.س)؟ ستُعاد مباشرةً إلى رصيد دورة الاستحقاق المرتبطة بها.`,
      () => {
        deleteHistoryEntry(id);
        showToast('تم حذف الدفعة من السجل');
      }
    );
  };

  return (
    <div>
      <div className="section-header">
        <div className="section-title">سجل المدفوعات</div>
        <div className="section-count">{reversed.length.toLocaleString('en-US')} دفعة</div>
      </div>

      <div className="history-list">
        {reversed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <div className="empty-title">لا توجد مدفوعات مسجلة</div>
            <div className="empty-sub">سيظهر هنا سجل كل الدفعات</div>
          </div>
        ) : (
          reversed.map((h) => (
            <div className="hist-card" key={h.id}>
              <div className="hist-left">
                <div className="hist-name">{h.name}</div>
                <div className="hist-meta">{h.method} · دورة {h.paymentMonth ?? h.monthLabel}</div>
                <div className="hist-meta">{fmtDate(h.paidDate)}</div>
              </div>
              <div className="hist-right">
                <div className="hist-amount">{fmtAmt(h.amount)} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text2)' }}>ر.س</span></div>
                <div className="hist-method">{h.cat || ''}</div>
              </div>
              <button className="hist-del" onClick={() => handleDelete(h.id)} title="حذف الدفعة">🗑</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
