import { describe, expect, it } from 'vitest';
import { isDNDActive, shouldNotify } from '../lib/notifications';
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
});
