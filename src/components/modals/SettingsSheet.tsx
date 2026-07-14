import { useModal } from '../../context/modal-context';
import { useConfirm } from '../../context/confirm-context';
import { useToast } from '../../context/toast-context';
import { useData } from '../../context/data-context';
import { useTheme } from '../../context/theme-context';
import { store, STORAGE_KEYS } from '../../data/storage';

export function SettingsSheet() {
  const { settingsOpen, closeSettings, openTheme, openBackup } = useModal();
  const { showConfirm } = useConfirm();
  const { showToast } = useToast();
  const { reloadFromStorage } = useData();
  const { resetTheme } = useTheme();

  const goTo = (open: () => void) => {
    closeSettings();
    open();
  };

  const handleClearCache = () => {
    closeSettings();
    showConfirm(
      'سيتم مسح إعدادات الثيم والراتب المحفوظ فقط. التزاماتك وسجل مدفوعاتك بأمان ولن تُحذف. متابعة؟',
      () => {
        store.removeRaw(STORAGE_KEYS.KEY_THEME);
        store.clearSalary();
        resetTheme();
        reloadFromStorage();
        showToast('🧹 تم مسح الكاش — التزاماتك وسجلك بأمان');
      },
      { label: '🧹 مسح الكاش', bg: 'linear-gradient(135deg,#DD6B20,#B45309)', shadow: '0 2px 16px rgba(221,107,32,0.4)' }
    );
  };

  return (
    <div className={`overlay ${settingsOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeSettings(); }}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">⚙️ الإعدادات</div>

        <div className="settings-list">
          <button className="settings-row" onClick={() => goTo(openTheme)}>
            <span className="settings-row-icon">🎨</span>
            <span className="settings-row-text">
              <div className="settings-row-title">تخصيص الألوان</div>
              <div className="settings-row-sub">اختر ثيماً جاهزاً أو خصّص كل لون يدوياً</div>
            </span>
            <span className="settings-row-chevron">‹</span>
          </button>

          <button className="settings-row" onClick={() => goTo(openBackup)}>
            <span className="settings-row-icon">💾</span>
            <span className="settings-row-text">
              <div className="settings-row-title">النسخ الاحتياطي</div>
              <div className="settings-row-sub">تصدير أو استيراد بياناتك كملف JSON</div>
            </span>
            <span className="settings-row-chevron">‹</span>
          </button>

          <button className="settings-row danger" onClick={handleClearCache}>
            <span className="settings-row-icon">🧹</span>
            <span className="settings-row-text">
              <div className="settings-row-title">مسح الكاش</div>
              <div className="settings-row-sub">يمسح الثيم والراتب فقط — بياناتك بأمان</div>
            </span>
            <span className="settings-row-chevron">‹</span>
          </button>
        </div>

        <button className="btn-modal-cancel" onClick={closeSettings}>إغلاق</button>
      </div>
    </div>
  );
}
