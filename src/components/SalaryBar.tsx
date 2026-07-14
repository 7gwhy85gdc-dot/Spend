import { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../context/data-context';
import { isActiveForMonth } from '../domain/status';
import { getCurrentCycle } from '../domain/cycles';

export function SalaryBar() {
  const { obligations, history, salary, setSalary, clearSalary } = useData();
  const [draft, setDraft] = useState<string>(salary !== null ? String(salary) : '');
  const inputRef = useRef<HTMLInputElement>(null);

  // مزامنة الخانة عند تغيّر الراتب من خارجها (استيراد نسخة احتياطية، مسح الكاش)
  // دون مقاطعة المستخدم أثناء الكتابة
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setDraft(salary !== null ? String(salary) : '');
  }, [salary]);

  const total = useMemo(() => {
    const today = new Date();
    return obligations
      .filter((o) => isActiveForMonth(o, today))
      .reduce((sum, o) => sum + (getCurrentCycle(o, history, today)?.scheduledAmount ?? 0), 0);
  }, [obligations, history]);

  const salaryNum = parseFloat(draft) || 0;
  const remain = salaryNum - total;
  const pct = salaryNum > 0 ? Math.min(100, Math.max(0, (remain / salaryNum) * 100)) : 0;

  const handleInput = (v: string) => {
    setDraft(v);
    if (v.trim() === '') {
      clearSalary();
      return;
    }
    const num = parseFloat(v);
    if (!isNaN(num) && num >= 0) setSalary(num);
  };

  let remainCls = 'zero';
  let remainText = '—';
  let pctText = '';
  if (salaryNum > 0) {
    remainCls = remain > 0 ? 'positive' : remain < 0 ? 'negative' : 'zero';
    remainText = (remain >= 0 ? '+' : '') + remain.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' ر.س';
    pctText = `${pct.toFixed(0)}% متبقي من الراتب`;
  }

  return (
    <div className="salary-bar">
      <div className="salary-inner">
        <div className="salary-right">
          <div className="salary-remain-label">المتبقي بعد الالتزامات</div>
          <div className={`salary-remain-val ${remainCls}`}>{remainText}</div>
          <div className="salary-pct-label">{pctText}</div>
        </div>
        <div className="salary-left">
          <div className="salary-label">💰 الراتب الشهري</div>
          <div className="salary-input-wrap">
            <input
              ref={inputRef}
              className="salary-input"
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="أدخل راتبك"
              value={draft}
              onChange={(e) => handleInput(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="salary-progress-wrap">
        <div
          className="salary-progress-fill"
          style={{ width: `${pct}%`, background: salaryNum === 0 ? 'transparent' : (remain >= 0 ? 'var(--green)' : 'var(--red)') }}
        />
      </div>
    </div>
  );
}
