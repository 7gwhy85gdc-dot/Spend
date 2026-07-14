export type TabId = 'thismonth' | 'obligations' | 'history' | 'summary';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'thismonth', label: '📅 الشهر' },
  { id: 'obligations', label: '🗂️ الكل' },
  { id: 'history', label: '💰 المدفوعات' },
  { id: 'summary', label: '📊 الملخص' },
];

interface NavTabsProps {
  active: TabId;
  onChange(tab: TabId): void;
}

export function NavTabs({ active, onChange }: NavTabsProps) {
  return (
    <div className="nav-tabs">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`nav-tab ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
