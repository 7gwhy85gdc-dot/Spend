import { useModal } from '../context/modal-context';

export function FloatButtons() {
  const { openSettings } = useModal();
  return (
    <button className="btn-float" onClick={openSettings} title="الإعدادات">⚙️</button>
  );
}
