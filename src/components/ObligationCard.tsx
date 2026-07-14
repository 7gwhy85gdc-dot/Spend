import type { HistoryEntry, Obligation } from '../domain/types';
import { fmtAmt, fmtDate, monthKey, toLocalISODate } from '../domain/dates';
import { getStatus } from '../domain/status';
import { getCurrentCycle, getCycle, getOutstandingCycles, getScheduleProgress, shiftMonth, type ObligationCycle } from '../domain/cycles';

interface ObligationCardProps {
  obligation: Obligation;
  history: HistoryEntry[];
  refDate: Date;
  onPay(id: number): void;
  onEdit(id: number): void;
  onDelete(id: number): void;
}

const STATUS_CLASS: Record<string, string> = { 'مدفوع': 'paid', 'متأخر': 'late', 'قادم': 'future', 'منتهي': 'done' };
const BADGE_CLASS: Record<string, string> = { 'مدفوع': 'badge-paid', 'متأخر': 'badge-late', 'قادم': 'badge-future', 'منتهي': 'badge-cat' };

export function ObligationCard({ obligation: o, history, refDate, onPay, onEdit, onDelete }: ObligationCardProps) {
  const status = getStatus(o, refDate, history);
  const statusCls = STATUS_CLASS[status] || 'future';
  const badgeCls = BADGE_CLASS[status] || 'badge-future';
  const outstanding = getOutstandingCycles(o, history, refDate);
  const canPay = outstanding.length > 0;

  const oldestOutstanding = outstanding[0];
  const nextCycle: ObligationCycle | null = !oldestOutstanding && status === 'مدفوع'
    ? getCycle(o, history, shiftMonth(monthKey(refDate), 1), refDate)
    : null;
  const shownCycle = oldestOutstanding ?? getCurrentCycle(o, history, refDate) ?? nextCycle;
  const dueLabel = oldestOutstanding
    ? `${oldestOutstanding.overdue ? 'متأخر: ' : ''}${fmtDate(toLocalISODate(oldestOutstanding.dueDate))}`
    : nextCycle
      ? `القادم: ${fmtDate(toLocalISODate(nextCycle.dueDate))}`
      : shownCycle ? fmtDate(toLocalISODate(shownCycle.dueDate)) : '—';
  const outstandingTotal = outstanding.reduce((sum, cycle) => sum + cycle.remainingAmount, 0);
  const progress = getScheduleProgress(o, history, refDate);

  return (
    <div className={`ob-card status-${statusCls}`}>
      <div className="ob-main">
        <div className="ob-info">
          <div className="ob-name">{o.name}</div>
          <div className="ob-meta">
            <span className="badge badge-cat">{o.cat || 'أخرى'}</span>
            <span className={`badge ${badgeCls}`}>{status}</span>
            {o.type !== 'دائم' && status !== 'منتهي' && (
              <span className="rem-badge">
                {o.type === 'مؤقت-أشهر' ? `${(progress?.remaining ?? 0).toLocaleString('en-US')} قسط` : 'مؤقت'}
              </span>
            )}
            {o.notes && <span className="badge badge-cat">{o.notes}</span>}
          </div>
        </div>
        <div className="ob-right">
          <div className="ob-amount">{fmtAmt(outstandingTotal || o.amount)}<span className="cur"> ر.س</span></div>
          {outstandingTotal > 0 && outstandingTotal !== o.amount && <div className="ob-due">إجمالي المتبقي</div>}
          <div className="ob-due">{dueLabel}</div>
        </div>
      </div>

      {o.type === 'مؤقت-أشهر' && progress && status !== 'منتهي' && (
        <div className="temp-progress">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text2)', marginBottom: 4, direction: 'rtl' }}>
            <span>متبقي: {progress.remaining.toLocaleString('en-US')} قسط</span>
            <span>تم {progress.paid.toLocaleString('en-US')} من {progress.total.toLocaleString('en-US')}</span>
          </div>
          <div className="temp-track">
            <div className="temp-fill" style={{ width: `${progress.percent}%`, background: 'var(--orange)' }} />
          </div>
        </div>
      )}
      {o.type === 'مؤقت-تاريخ' && o.endDate && status !== 'منتهي' && (
        <div style={{ padding: '0 14px 8px', fontSize: 11, color: 'var(--text2)' }}>ينتهي: {fmtDate(o.endDate)}</div>
      )}
      {oldestOutstanding && oldestOutstanding.paidAmount > 0 && (
        <div style={{ padding: '0 14px 8px', fontSize: 11, color: 'var(--orange)' }}>
          مدفوع جزئياً لدورة {oldestOutstanding.month}: {fmtAmt(oldestOutstanding.paidAmount)} ر.س
        </div>
      )}

      <div className="ob-footer">
        {canPay ? (
          <button className="btn-ob btn-pay" onClick={() => onPay(o.id)}>✅ سجّل الدفع</button>
        ) : (
          <button className="btn-ob btn-pay" style={{ background: 'var(--gray2)', color: 'var(--text2)' }} disabled>{status}</button>
        )}
        <button className="btn-ob btn-edit" onClick={() => onEdit(o.id)} title="تعديل">✏️</button>
        <button className="btn-ob btn-del" onClick={() => onDelete(o.id)} title="حذف">🗑</button>
      </div>
    </div>
  );
}
