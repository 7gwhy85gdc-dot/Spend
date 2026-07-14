import { useModal } from '../../context/modal-context';
import { useTheme } from '../../context/theme-context';
import { useToast } from '../../context/toast-context';
import { PRESET_THEMES } from '../../domain/theme-presets';

export function ThemeModal() {
  const { themeOpen, closeTheme } = useModal();
  const { selectedPreset, applyPreset, setSingleVar, resetTheme, getEditorValues } = useTheme();
  const { showToast } = useToast();

  const handlePreset = (i: number) => {
    applyPreset(i, PRESET_THEMES[i].vars);
    showToast('تم تطبيق الثيم ✓');
  };

  const handleColorChange = (key: string, value: string) => {
    setSingleVar(key, value);
  };

  const handleReset = () => {
    resetTheme();
    showToast('تم إعادة التعيين ✓');
  };

  const editorValues = getEditorValues();

  return (
    <div className={`overlay ${themeOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeTheme(); }}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">🎨 تخصيص الألوان</div>

        <div className="theme-section-title">🎨 ثيمات جاهزة</div>
        <div className="theme-grid">
          {PRESET_THEMES.map((t, i) => (
            <div key={t.name} className={`theme-swatch ${selectedPreset === i ? 'selected' : ''}`} onClick={() => handlePreset(i)}>
              <div className="theme-swatch-preview">
                {Object.values(t.vars).slice(0, 4).map((c, j) => <span key={j} style={{ background: c }} />)}
              </div>
              <div className="theme-swatch-name">{t.name}</div>
            </div>
          ))}
        </div>

        <div className="theme-section-title">✏️ تخصيص يدوي للألوان</div>
        <div className="color-editor">
          {editorValues.map((v) => (
            <div className="color-row" key={v.key}>
              <label>{v.label}</label>
              <input type="color" value={v.hex} onChange={(e) => handleColorChange(v.key, e.target.value)} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn-theme-reset" style={{ flex: 1 }} onClick={handleReset}>↺ إعادة تعيين</button>
          <button className="btn-modal-cancel" style={{ flex: 1, marginTop: 0 }} onClick={closeTheme}>✓ حفظ وإغلاق</button>
        </div>
      </div>
    </div>
  );
}
