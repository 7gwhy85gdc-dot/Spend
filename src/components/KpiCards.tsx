import { useMemo } from 'react';
import { useData } from '../context/data-context';
import { fmtAmt, monthKey } from '../domain/dates';
import { getStatus, isActiveForMonth, isPaidForMonth } from '../domain/status';
import { getCurrentCycle, getCycle, getOutstandingCycles } from '../domain/cycles';

export function KpiCards() {
  const { obligations, history } = useData();

  const kpis = useMemo(() => {
    const today = new Date();
    const activeThisMonth = obligations.filter((o) => isActiveForMonth(o, today));
    const total = activeThisMonth.reduce((sum, o) => sum + (getCurrentCycle(o, history, today)?.scheduledAmount ?? 0), 0);
    const paidList = activeThisMonth.filter((o) => isPaidForMonth(o, today, history));
    const paid = paidList.reduce((sum, o) => sum + (getCurrentCycle(o, history, today)?.paidAmount ?? 0), 0);
    const lateCycles = obligations.flatMap((o) => getOutstandingCycles(o, history, today).filter((cycle) => cycle.overdue));
    const late = lateCycles.reduce((sum, cycle) => sum + cycle.remainingAmount, 0);
    const lateCount = obligations.filter((o) => getStatus(o, today, history) === 'متأخر').length;

    const nextRef = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const activeNext = obligations.filter((o) => isActiveForMonth(o, nextRef));
    const nextTot = activeNext.reduce((sum, o) => sum + (getCycle(o, history, monthKey(nextRef), nextRef)?.scheduledAmount ?? 0), 0);

    return [
      { label: '📊 الشهر الحالي', amount: total, cls: 'total', sub: `${activeThisMonth.length.toLocaleString('en-US')} التزام` },
      { label: '✅ مدفوع', amount: paid, cls: 'paid', sub: `${paidList.length.toLocaleString('en-US')} بند` },
      { label: '🔴 متأخر', amount: late, cls: 'late', sub: `${lateCount.toLocaleString('en-US')} التزام` },
      { label: '📅 الشهر القادم', amount: nextTot, cls: 'next', sub: `${activeNext.length.toLocaleString('en-US')} التزام` },
    ];
  }, [obligations, history]);

  return (
    <div className="kpi-grid">
      {kpis.map((k, i) => (
        <div className={`kpi-card ${k.cls}`} key={k.cls} style={{ animationDelay: `${i * 40}ms` }}>
          <div className="kpi-label">{k.label}</div>
          <div className="kpi-amount"><span className="currency">ر.س</span>{fmtAmt(k.amount)}</div>
          <div className="kpi-sub">{k.sub}</div>
        </div>
      ))}
    </div>
  );
}
