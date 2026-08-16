import { Message, UserPreferences } from '../types';
import { isUserMentioned } from './mentions';

/**
 * Checks if Do Not Disturb (DND) is active based on user preferences.
 */
export function isDNDActive(preferences?: UserPreferences): boolean {
  if (!preferences?.dndUntil) return false;
  try {
    const dndTime = new Date(preferences.dndUntil).getTime();
    return !isNaN(dndTime) && dndTime > Date.now();
  } catch {
    return false;
  }
}

/**
 * Request OS/Browser Web Notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * Checks current notification permission without triggering prompt
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Checks if browser supports Web Notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Evaluates whether a notification should trigger for the given user.
 */
export function shouldNotify(
  message: Message,
  recipientPubkey: string,
  recipientHandle?: string,
  preferences?: UserPreferences
): boolean {
  if (message.authorPubkey === recipientPubkey) return false;
  if (isDNDActive(preferences)) return false;

  const channelId = message.channelId;
  const isMuted = preferences?.mutedChannelIds?.includes(channelId);
  if (isMuted) return false;

  const override = preferences?.channelNotificationOverrides?.[channelId];
  if (override === 'mute') return false;

  const desktopPref = override || preferences?.desktopNotifications || 'all';

  if (desktopPref === 'none') return false;

  const mentioned = isUserMentioned(message, recipientPubkey, recipientHandle);

  if (desktopPref === 'mentions' || desktopPref === 'mentions_only') {
    return mentioned;
  }

  // 'all' setting -> notify on all messages in channel or DM
  return true;
}

/**
 * Dispatches a native browser notification if allowed and supported
 */
export function showBrowserNotification(
  title: string,
  options: {
    body?: string;
    icon?: string;
    tag?: string;
    onClick?: () => void;
  } = {}
): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notif = new Notification(title, {
      body: options.body || '',
      icon: options.icon || '/favicon.ico',
      tag: options.tag || 'openslack_notification',
    });

    if (options.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick?.();
        notif.close();
      };
    }

    return notif;
  } catch (err) {
    console.warn('Native notification failed:', err);
    return null;
  }
}
