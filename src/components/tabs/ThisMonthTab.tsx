import { useMemo } from 'react';
import { useData } from '../../context/data-context';
import { useModal } from '../../context/modal-context';
import { useDeleteObligation } from '../../hooks/useDeleteObligation';
import { getStatus, isActiveForMonth, isPaidForMonth } from '../../domain/status';
import { ObligationCard } from '../ObligationCard';
import { getOutstandingCycles } from '../../domain/cycles';

export function ThisMonthTab() {
  const { obligations, history } = useData();
  const { openPay, openEdit } = useModal();
  const handleDelete = useDeleteObligation();

  const today = useMemo(() => new Date(), []);

  const { unpaid, totalCount, paidCount, pct } = useMemo(() => {
    const active = obligations.filter((o) => isActiveForMonth(o, today));
    const unpaidList = obligations.filter((o) => getOutstandingCycles(o, history, today).length > 0);
    const paid = active.filter((o) => isPaidForMonth(o, today, history)).length;
    const total = active.length;
    const percent = total > 0 ? Math.round((paid / total) * 100) : 0;

    unpaidList.sort((a, b) => {
      const oa = getStatus(a, today, history) === 'متأخر' ? 0 : 1;
      const ob = getStatus(b, today, history) === 'متأخر' ? 0 : 1;
      if (oa !== ob) return oa - ob;
      const aDue = getOutstandingCycles(a, history, today)[0]?.dueDate.getTime() ?? 0;
      const bDue = getOutstandingCycles(b, history, today)[0]?.dueDate.getTime() ?? 0;
      return aDue - bDue;
    });

    return { unpaid: unpaidList, totalCount: total, paidCount: paid, pct: percent };
  }, [obligations, history, today]);

  return (
    <div>
      <div className="month-progress-card">
        <div className="month-progress-top">
          <span>{totalCount > 0 ? `${paidCount.toLocaleString('en-US')} من ${totalCount.toLocaleString('en-US')} مدفوع` : 'لا توجد التزامات مسجلة'}</span>
          <span>{pct.toLocaleString('en-US')}%</span>
        </div>
        <div className="month-progress-track"><div className="month-progress-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="section-header">
        <div className="section-title">المتبقي عليك هذا الشهر</div>
        <div className="section-count">{unpaid.length.toLocaleString('en-US')} متبقٍ</div>
      </div>

      <div className="obligations-list">
        {unpaid.length === 0 ? (
          totalCount === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-title">لا توجد التزامات مسجلة</div>
              <div className="empty-sub">اضغط + لإضافة أول التزام</div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🎉</div>
              <div className="empty-title">تم سداد كل التزامات هذا الشهر!</div>
              <div className="empty-sub">أحسنت، لا يوجد شيء متبقٍ عليك</div>
            </div>
          )
        ) : (
          unpaid.map((o) => (
            <ObligationCard key={o.id} obligation={o} history={history} refDate={today} onPay={openPay} onEdit={openEdit} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
}
