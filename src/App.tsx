import { useEffect, useRef, useState } from 'react';
import { DataProvider } from './context/DataContext';
import { useData } from './context/data-context';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ModalProvider } from './context/ModalContext';
import { useModal } from './context/modal-context';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { SalaryBar } from './components/SalaryBar';
import { NavTabs, type TabId } from './components/NavTabs';
import { NotificationBanner } from './components/NotificationBanner';
import { ThisMonthTab } from './components/tabs/ThisMonthTab';
import { ObligationsTab } from './components/tabs/ObligationsTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { SummaryTab } from './components/tabs/SummaryTab';
import { AddEditModal } from './components/modals/AddEditModal';
import { PayModal } from './components/modals/PayModal';
import { ThemeModal } from './components/modals/ThemeModal';
import { BackupModal } from './components/modals/BackupModal';
import { SettingsSheet } from './components/modals/SettingsSheet';
import { ConfirmDialog } from './components/modals/ConfirmDialog';
import { FloatButtons } from './components/FloatButtons';
import { Toast } from './components/Toast';
import { todayStr } from './domain/dates';

function TabContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'thismonth': return <ThisMonthTab />;
    case 'obligations': return <ObligationsTab />;
    case 'history': return <HistoryTab />;
    case 'summary': return <SummaryTab />;
  }
}

function AppShell() {
  const [tab, setTab] = useState<TabId>('thismonth');
  const [refreshKey, setRefreshKey] = useState(0);
  const { openAdd } = useModal();
  const { reloadFromStorage } = useData();
  const dayRef = useRef(todayStr());

  useEffect(() => {
    const checkForNewDay = () => {
      const currentDay = todayStr();
      if (currentDay === dayRef.current) return;
      dayRef.current = currentDay;
      setRefreshKey((key) => key + 1);
    };
    const id = window.setInterval(checkForNewDay, 60_000);
    window.addEventListener('focus', checkForNewDay);
    document.addEventListener('visibilitychange', checkForNewDay);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', checkForNewDay);
      document.removeEventListener('visibilitychange', checkForNewDay);
    };
  }, []);

  const handleRefresh = () => {
    reloadFromStorage();
    dayRef.current = todayStr();
    setRefreshKey((key) => key + 1);
  };

  return (
    <>
      <div className="app-bg" />
      <Header onAdd={openAdd} onRefresh={handleRefresh} />
      <KpiCards key={`kpi-${refreshKey}`} />
      <NotificationBanner key={`notifications-${refreshKey}`} />
      <SalaryBar key={`salary-${refreshKey}`} />
      <NavTabs active={tab} onChange={setTab} />
      <TabContent key={`${tab}-${refreshKey}`} tab={tab} />

      <button className="fab" onClick={openAdd}>
        <span>+</span> إضافة التزام
      </button>
      <FloatButtons />

      <AddEditModal />
      <PayModal />
      <ThemeModal />
      <BackupModal />
      <SettingsSheet />
      <ConfirmDialog />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <DataProvider>
          <ThemeProvider>
            <ModalProvider>
              <AppShell />
            </ModalProvider>
          </ThemeProvider>
        </DataProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
