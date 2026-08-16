import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getNotificationPermissionStatus,
  isDNDActive,
  isNotificationSupported,
  requestNotificationPermission,
  shouldNotify,
  showBrowserNotification,
} from '../lib/notifications';
import { Message, UserPreferences } from '../types';

describe('Notifications & DND Logic', () => {
  const basePrefs: UserPreferences = {
    soundEnabled: true,
    desktopNotifications: 'all',
    dndUntil: null,
    mutedChannelIds: [],
    channelNotificationOverrides: {},
  };

  const sampleMessage: Message = {
    id: 'm1',
    channelId: 'chan-1',
    authorPubkey: 'other_user',
    content: 'Regular update',
    timestamp: Date.now(),
  };

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'Notification');
  });

  it('determines DND active status correctly', () => {
    expect(isDNDActive(basePrefs)).toBe(false);

    const activeDndPrefs: UserPreferences = {
      ...basePrefs,
      dndUntil: new Date(Date.now() + 60000).toISOString(),
    };
    expect(isDNDActive(activeDndPrefs)).toBe(true);

    const expiredDndPrefs: UserPreferences = {
      ...basePrefs,
      dndUntil: new Date(Date.now() - 1000).toISOString(),
    };
    expect(isDNDActive(expiredDndPrefs)).toBe(false);
  });

  it('filters notifications when DND is active', () => {
    const activeDndPrefs: UserPreferences = {
      ...basePrefs,
      dndUntil: new Date(Date.now() + 3600000).toISOString(),
    };

    const decision = shouldNotify(sampleMessage, 'my_pubkey', '@me', activeDndPrefs);
    expect(decision).toBe(false);
  });

  it('respects desktop notification preference "mentions_only"', () => {
    const mentionsOnlyPrefs: UserPreferences = {
      ...basePrefs,
      desktopNotifications: 'mentions_only',
    };

    // Message without mention
    const regularDecision = shouldNotify(sampleMessage, 'my_pubkey', '@me', mentionsOnlyPrefs);
    expect(regularDecision).toBe(false);

    // Message with mention
    const mentionedMsg: Message = {
      ...sampleMessage,
      content: 'Hey @me check this out',
      mentions: ['my_pubkey'],
    };
    const mentionDecision = shouldNotify(mentionedMsg, 'my_pubkey', '@me', mentionsOnlyPrefs);
    expect(mentionDecision).toBe(true);
  });

  it('respects channel-specific notification overrides', () => {
    const overridePrefs: UserPreferences = {
      ...basePrefs,
      channelNotificationOverrides: {
        'chan-1': 'mute',
      },
    };

    const decision = shouldNotify(sampleMessage, 'my_pubkey', '@me', overridePrefs);
    expect(decision).toBe(false);
  });

  it('creates a browser notification and focuses the app on click', () => {
    const close = vi.fn();
    const notification = { onclick: null as (() => void) | null, close };
    const NotificationMock = vi.fn(function NotificationConstructor() {
      return notification;
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: Object.assign(NotificationMock, { permission: 'granted' }),
    });
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => undefined);
    const onClick = vi.fn();

    const result = showBrowserNotification('New message', {
      body: 'Hello',
      tag: 'message-1',
      onClick,
    });

    expect(result).toBe(notification);
    expect(NotificationMock).toHaveBeenCalledWith('New message', {
      body: 'Hello',
      icon: '/favicon.ico',
      tag: 'message-1',
    });
    notification.onclick?.();
    expect(focus).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it('does not construct notifications without granted permission', () => {
    const NotificationMock = vi.fn();
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: Object.assign(NotificationMock, { permission: 'default' }),
    });

    expect(showBrowserNotification('Blocked')).toBeNull();
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it('requests notification permission when the API is available', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: Object.assign(vi.fn(), { permission: 'default', requestPermission }),
    });

    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(requestPermission).toHaveBeenCalledOnce();
  });

  it('handles notification API failures safely', async () => {
    class ThrowingNotification {
      static permission = 'granted';
      static requestPermission = vi.fn().mockRejectedValue(new Error('denied'));

      constructor() {
        throw new Error('unsupported');
      }
    }

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: ThrowingNotification,
    });

    await expect(requestNotificationPermission()).resolves.toBe('denied');
    expect(showBrowserNotification('Broken')).toBeNull();
  });

  it('checks notification support and returns permission status', () => {
    Reflect.deleteProperty(window, 'Notification');
    expect(isNotificationSupported()).toBe(false);
    expect(getNotificationPermissionStatus()).toBe('denied');

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: Object.assign(vi.fn(), { permission: 'granted' }),
    });

    expect(isNotificationSupported()).toBe(true);
    expect(getNotificationPermissionStatus()).toBe('granted');
  });
});
