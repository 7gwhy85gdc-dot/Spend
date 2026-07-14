import { useEffect, useState } from 'react';
import { MONTHS_AR } from '../domain/dates';
import { useToast } from '../context/toast-context';

interface HeaderProps {
  onAdd(): void;
  onRefresh(): void;
}

function formatHeaderDate(): string {
  const d = new Date();
  return `${d.getDate().toLocaleString('en-US')} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear().toLocaleString('en-US')}`;
}

export function Header({ onAdd, onRefresh }: HeaderProps) {
  const { showToast } = useToast();
  const [dateStr, setDateStr] = useState(formatHeaderDate);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setDateStr(formatHeaderDate()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = () => {
    setSpinning(false);
    requestAnimationFrame(() => setSpinning(true));
    onRefresh();
    setDateStr(formatHeaderDate());
    showToast('تم تحديث البيانات ✓');
  };

  return (
    <header className="app-header">
      <div className="header-top">
        <div>
          <div className="app-title">💼 حاسبة <span>الالتزامات</span></div>
          <div className="header-date">{dateStr}</div>
        </div>
        <button
          className={`icon-btn ghost ${spinning ? 'spinning' : ''}`}
          onClick={handleRefresh}
          title="تحديث"
          onAnimationEnd={() => setSpinning(false)}
        >
          🔄
        </button>
        <button className="icon-btn primary" onClick={onAdd}>+</button>
      </div>
    </header>
  );
}
