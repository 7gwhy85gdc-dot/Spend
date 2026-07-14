import { useToast } from '../context/toast-context';

export function Toast() {
  const { toast } = useToast();
  return (
    <div className={`toast ${toast.err ? 'error' : ''} ${toast.show ? 'show' : ''}`}>
      {toast.msg}
    </div>
  );
}
