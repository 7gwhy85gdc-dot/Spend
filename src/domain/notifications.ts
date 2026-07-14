import type { HistoryEntry, Obligation } from './types';
import { getStatus, isDueSoon } from './status';
import { todayStr } from './dates';

const LAST_CHECK_KEY = 'notif_last_check_v1';
const DUE_SOON_DAYS = 3;

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  return Notification.requestPermission();
}

function todayKey(): string {
  return todayStr();
}

/** يفحص الالتزامات المتأخرة/القريبة ويرسل إشعاراً موجزاً — مرة واحدة كل يوم كحد أقصى */
export function checkAndNotify(obligations: Obligation[], history: HistoryEntry[], force = false): void {
  if (getPermission() !== 'granted') return;
  if (!force && localStorage.getItem(LAST_CHECK_KEY) === todayKey()) return;

  const today = new Date();
  const overdue = obligations.filter((o) => getStatus(o, today, history) === 'متأخر');
  const dueSoon = obligations.filter((o) => isDueSoon(o, today, DUE_SOON_DAYS, history));

  if (overdue.length === 0 && dueSoon.length === 0) {
    localStorage.setItem(LAST_CHECK_KEY, todayKey());
    return;
  }

  let title = 'حاسبة الالتزامات';
  let body = '';
  if (overdue.length > 0) {
    body = `لديك ${overdue.length.toLocaleString('en-US')} التزام متأخر عن السداد`;
    if (dueSoon.length > 0) body += ` و ${dueSoon.length.toLocaleString('en-US')} مستحق قريباً`;
  } else {
    body = `لديك ${dueSoon.length.toLocaleString('en-US')} التزام مستحق خلال ${DUE_SOON_DAYS} أيام`;
  }

  try {
    new Notification(title, { body, icon: '/icon-192.png', tag: 'obligations-reminder' });
  } catch {
    /* بعض المتصفحات تمنع Notification المباشر خارج service worker — نتجاهل بصمت */
  }

  localStorage.setItem(LAST_CHECK_KEY, todayKey());
}
