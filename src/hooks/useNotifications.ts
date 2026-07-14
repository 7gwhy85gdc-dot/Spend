import { useCallback, useEffect, useState } from 'react';
import { useData } from '../context/data-context';
import { useToast } from '../context/toast-context';
import { checkAndNotify, getPermission, requestNotificationPermission } from '../domain/notifications';

const DISMISS_KEY = 'notif_banner_dismissed_v1';

export function useNotifications() {
  const { obligations, history } = useData();
  const { showToast } = useToast();
  const [permission, setPermission] = useState(getPermission());
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  useEffect(() => {
    if (permission === 'granted') {
      checkAndNotify(obligations, history);
    }
  }, [permission, obligations, history]);

  const enable = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      checkAndNotify(obligations, history, true);
      showToast('🔔 تم تفعيل التذكيرات');
    } else if (result === 'denied') {
      showToast('تم رفض إذن الإشعارات من المتصفح', true);
    }
  }, [obligations, history, showToast]);

  const dismissBanner = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  const showBanner = permission === 'default' && !dismissed;

  return { permission, showBanner, enable, dismissBanner };
}
