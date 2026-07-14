import { useNotifications } from '../hooks/useNotifications';
import { isNotificationSupported } from '../domain/notifications';

export function NotificationBanner() {
  const { showBanner, enable, dismissBanner } = useNotifications();

  if (!showBanner || !isNotificationSupported()) return null;

  return (
    <div className="notif-banner">
      <div className="notif-banner-text">🔔 فعّل تذكيرات استحقاق الالتزامات لتصلك عند الاقتراب من الموعد</div>
      <button className="notif-banner-btn" onClick={enable}>تفعيل</button>
      <button className="notif-banner-dismiss" onClick={dismissBanner} title="إغلاق">✕</button>
    </div>
  );
}
