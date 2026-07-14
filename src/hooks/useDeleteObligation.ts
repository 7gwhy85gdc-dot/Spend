import { useData } from '../context/data-context';
import { useConfirm } from '../context/confirm-context';
import { useToast } from '../context/toast-context';

export function useDeleteObligation() {
  const { obligations, deleteObligation } = useData();
  const { showConfirm } = useConfirm();
  const { showToast } = useToast();

  return (id: number) => {
    const o = obligations.find((x) => x.id === id);
    if (!o) return;
    showConfirm(`حذف "${o.name}"؟`, () => {
      deleteObligation(id);
      showToast('تم الحذف');
    });
  };
}
