import { useMemo } from 'react';
import { useData } from '../../context/data-context';
import { fmtAmt } from '../../domain/dates';
import { getStatus, isActiveForMonth } from '../../domain/status';
import type { ObligationStatus } from '../../domain/types';
import { getCurrentCycle, getOutstandingCycles } from '../../domain/cycles';

const CATS = ['إيجار', 'فواتير', 'أقساط', 'تأمين', 'اشتراكات', 'مصاريف ثابتة', 'أخرى'];
const ICONS: Record<string, string> = { 'إيجار': '🏠', 'فواتير': '🔌', 'أقساط': '💳', 'تأمين': '🛡️', 'اشتراكات': '📱', 'مصاريف ثابتة': '📌', 'أخرى': '📦' };
const COLORS: Record<string, string> = { 'إيجار': '#1A6FD4', 'فواتير': '#7C3AED', 'أقساط': '#DD6B20', 'تأمين': '#0D9E5C', 'اشتراكات': '#DB2777', 'مصاريف ثابتة': '#0891B2', 'أخرى': '#6B7280' };
const STATUSES: Array<{ label: string; k: ObligationStatus; c: string }> = [
  { label: '✅ مدفوع', k: 'مدفوع', c: '#0D9E5C' },
  { label: '🔴 متأخر', k: 'متأخر', c: '#E53E3E' },
  { label: '📅 قادم', k: 'قادم', c: '#1A6FD4' },
];

export function SummaryTab() {
  const { obligations, history } = useData();

  const { active, total } = useMemo(() => {
    const today = new Date();
    const activeList = obligations.filter((o) => isActiveForMonth(o, today));
    return {
      active: activeList,
      total: activeList.reduce((sum, o) => sum + (getCurrentCycle(o, history, today)?.scheduledAmount ?? 0), 0),
    };
  }, [obligations, history]);

  const today = useMemo(() => new Date(), []);
  const statusMetrics = useMemo(() => {
    return STATUSES.map((status) => {
      const items = obligations.filter((o) => getStatus(o, today, history) === status.k);
      const amount = items.reduce((sum, o) => {
        if (status.k === 'متأخر') {
          return sum + getOutstandingCycles(o, history, today)
            .filter((cycle) => cycle.overdue)
            .reduce((cycleSum, cycle) => cycleSum + cycle.remainingAmount, 0);
        }
        const current = getCurrentCycle(o, history, today);
        return sum + (status.k === 'مدفوع' ? (current?.paidAmount ?? 0) : (current?.remainingAmount ?? 0));
      }, 0);
      return { ...status, count: items.length, amount };
    });
  }, [obligations, history, today]);
  const analysisTotal = statusMetrics.reduce((sum, metric) => sum + metric.amount, 0);

  return (
    <div>
      <div className="section-header">
        <div className="section-title">تحليل الشهر الحالي</div>
      </div>
      <div className="summary-grid">
        {statusMetrics.map((s) => {
          const pct = analysisTotal ? (s.amount / analysisTotal) * 100 : 0;
          return (
            <div className="sum-card" key={s.k}>
              <div className="sum-label">{s.label}</div>
              <div className="sum-value">{fmtAmt(s.amount)} <span style={{ fontSize: 11, color: 'var(--text2)' }}>ر.س</span></div>
              <div className="sum-note">{s.count.toLocaleString('en-US')} بند · {pct.toFixed(0)}%</div>
              <div className="sum-bar-wrap"><div className="sum-bar" style={{ width: `${pct}%`, background: s.c }} /></div>
            </div>
          );
        })}
        {CATS.map((cat) => {
          const arr = active.filter((o) => o.cat === cat);
          const amt = arr.reduce((sum, o) => sum + (getCurrentCycle(o, history, today)?.scheduledAmount ?? 0), 0);
          if (amt === 0) return null;
          const pct = total ? (amt / total) * 100 : 0;
          return (
            <div className="sum-card" key={cat}>
              <div className="sum-label">{ICONS[cat] || ''} {cat}</div>
              <div className="sum-value">{fmtAmt(amt)} <span style={{ fontSize: 11, color: 'var(--text2)' }}>ر.س</span></div>
              <div className="sum-note">{pct.toFixed(0)}% من الإجمالي</div>
              <div className="sum-bar-wrap"><div className="sum-bar" style={{ width: `${pct}%`, background: COLORS[cat] || '#6B7280' }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
