import { useRef } from 'react';
import { useModal } from '../../context/modal-context';
import { useData } from '../../context/data-context';
import { useTheme } from '../../context/theme-context';
import { useConfirm } from '../../context/confirm-context';
import { useToast } from '../../context/toast-context';
import { downloadBackup, parseBackupFile, restoreBackup, BackupValidationError } from '../../domain/backup';

export function BackupModal() {
  const { backupOpen, closeBackup } = useModal();
  const { reloadFromStorage } = useData();
  const { reapplyFromStorage } = useTheme();
  const { showConfirm } = useConfirm();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    downloadBackup();
    showToast('✅ تم تنزيل النسخة الاحتياطية');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = parseBackupFile(String(reader.result));
        showConfirm(
          `سيتم استبدال كل البيانات الحالية بـ ${payload.obligations.length.toLocaleString('en-US')} التزام و ${payload.history.length.toLocaleString('en-US')} دفعة من الملف. متابعة؟`,
          () => {
            restoreBackup(payload);
            reloadFromStorage();
            reapplyFromStorage();
            closeBackup();
            showToast('✅ تم استيراد النسخة الاحتياطية');
          },
          { label: '📥 استيراد واستبدال', bg: 'linear-gradient(135deg,#1A6FD4,#2E8AF0)', shadow: '0 2px 16px rgba(26,111,212,0.4)' }
        );
      } catch (err) {
        const msg = err instanceof BackupValidationError ? err.message : 'تعذّر قراءة الملف';
        showToast(msg, true);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`overlay ${backupOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeBackup(); }}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">💾 النسخ الاحتياطي</div>

        <div className="backup-actions">
          <div className="backup-card">
            <div className="backup-card-icon">📤</div>
            <div className="backup-card-title">تصدير نسخة احتياطية</div>
            <div className="backup-card-sub">ينزّل ملف JSON فيه كل التزاماتك وسجل مدفوعاتك وراتبك وثيمك</div>
            <button className="btn-modal-confirm" style={{ marginTop: 0 }} onClick={handleExport}>📤 تصدير الآن</button>
          </div>

          <div className="backup-card">
            <div className="backup-card-icon">📥</div>
            <div className="backup-card-title">استيراد نسخة احتياطية</div>
            <div className="backup-card-sub">يستبدل بياناتك الحالية بمحتوى ملف JSON — سيُطلب منك التأكيد أولاً</div>
            <button className="btn-modal-cancel" style={{ marginTop: 0 }} onClick={handleImportClick}>📥 اختر ملف واستورد</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="file-input-hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <button className="btn-modal-cancel" onClick={closeBackup}>إغلاق</button>
      </div>
    </div>
  );
}
