import { useMemo, useState } from 'react';
import { useData } from '../../context/data-context';
import { useModal } from '../../context/modal-context';
import { useDeleteObligation } from '../../hooks/useDeleteObligation';
import { getStatus } from '../../domain/status';
import type { ObligationStatus } from '../../domain/types';
import { ObligationCard } from '../ObligationCard';

const FILTERS: Array<ObligationStatus | 'الكل'> = ['الكل', 'متأخر', 'قادم', 'مدفوع', 'منتهي'];
const ORDER: Record<string, number> = { 'متأخر': 0, 'قادم': 1, 'مدفوع': 2, 'منتهي': 3 };

export function ObligationsTab() {
  const { obligations, history } = useData();
  const { openPay, openEdit } = useModal();
  const handleDelete = useDeleteObligation();
  const [filter, setFilter] = useState<ObligationStatus | 'الكل'>('الكل');

  const today = useMemo(() => new Date(), []);

  const list = useMemo(() => {
    let items = obligations.map((o) => ({ o, status: getStatus(o, today, history) }));
    if (filter !== 'الكل') items = items.filter((x) => x.status === filter);
    items.sort((a, b) => {
      const od = (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9);
      if (od !== 0) return od;
      return (a.o.dueDay || 1) - (b.o.dueDay || 1);
    });
    return items;
  }, [obligations, history, filter, today]);

  return (
    <div>
      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-chip ${f === filter ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="section-header">
        <div className="section-title">كل الالتزامات المسجلة</div>
        <div className="section-count">{list.length.toLocaleString('en-US')} التزام</div>
      </div>

      <div className="obligations-list">
        {list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-title">لا توجد التزامات</div>
            <div className="empty-sub">اضغط + لإضافة التزام جديد</div>
          </div>
        ) : (
          list.map(({ o }) => (
            <ObligationCard key={o.id} obligation={o} history={history} refDate={today} onPay={openPay} onEdit={openEdit} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
}
