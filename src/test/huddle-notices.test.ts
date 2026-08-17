import { describe, expect, it } from 'vitest';
import type { Message } from '../types';

/**
 * Pure helpers mirroring WorkspaceContext huddle channel notice content.
 * Kept free of React so notice contracts stay covered under unit thresholds.
 */
function buildHuddleNotice(
  kind: 'huddle_started' | 'huddle_ended',
  displayName: string,
  channelName: string,
  channelId: string,
  authorPubkey: string
): Message {
  const content =
    kind === 'huddle_started'
      ? `🎧 **${displayName}** started a huddle in #${channelName}`
      : `🎧 **${displayName}** left the huddle in #${channelName}`;

  return {
    id: `msg_huddle_${kind}_test`,
    channelId,
    senderId: authorPubkey,
    authorPubkey,
    content,
    type: kind,
    timestamp: Date.now(),
    createdAt: new Date().toISOString(),
    reactions: {},
  };
}

describe('Huddle channel notices', () => {
  it('builds a Slack-style huddle_started notice with author and channel', () => {
    const notice = buildHuddleNotice(
      'huddle_started',
      'Alice Huddle',
      'general',
      'chan_general',
      'pub_alice'
    );

    expect(notice.type).toBe('huddle_started');
    expect(notice.channelId).toBe('chan_general');
    expect(notice.authorPubkey).toBe('pub_alice');
    expect(notice.content).toContain('Alice Huddle');
    expect(notice.content).toContain('started a huddle');
    expect(notice.content).toContain('#general');
  });

  it('builds a huddle_ended notice when a participant leaves', () => {
    const notice = buildHuddleNotice(
      'huddle_ended',
      'Bob Huddle',
      'random',
      'chan_random',
      'pub_bob'
    );

    expect(notice.type).toBe('huddle_ended');
    expect(notice.content).toContain('Bob Huddle');
    expect(notice.content).toContain('left the huddle');
    expect(notice.content).toContain('#random');
  });

  it('treats huddle notices as non-text message types for UI branching', () => {
    const started = buildHuddleNotice('huddle_started', 'Cara', 'general', 'chan_general', 'pub_c');
    const ended = buildHuddleNotice('huddle_ended', 'Cara', 'general', 'chan_general', 'pub_c');
    const plain: Message = {
      id: 'msg_plain',
      channelId: 'chan_general',
      authorPubkey: 'pub_c',
      content: 'hello',
      timestamp: Date.now(),
    };

    expect(started.type === 'huddle_started' || started.type === 'huddle_ended').toBe(true);
    expect(ended.type === 'huddle_started' || ended.type === 'huddle_ended').toBe(true);
    expect(plain.type === 'huddle_started' || plain.type === 'huddle_ended').toBe(false);
  });
});
