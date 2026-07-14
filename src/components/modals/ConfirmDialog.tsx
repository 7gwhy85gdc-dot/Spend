import { useConfirm } from '../../context/confirm-context';

export function ConfirmDialog() {
  const { state, handleYes, handleNo } = useConfirm();
  return (
    <div className={`overlay ${state.open ? 'open' : ''}`}>
      <div className="modal" style={{ maxHeight: 'auto' }}>
        <div className="modal-handle" />
        <div className="modal-title" style={{ fontSize: 15 }}>{state.msg}</div>
        <button
          className="btn-modal-confirm"
          style={{ background: state.bg, boxShadow: state.shadow }}
          onClick={handleYes}
        >
          {state.label}
        </button>
        <button className="btn-modal-cancel" onClick={handleNo}>إلغاء</button>
      </div>
    </div>
  );
}
