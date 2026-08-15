import { describe, expect, it } from 'vitest';
import {
  extractMentions,
  generateHandleFromName,
  getMentionSuggestions,
  isUserMentioned,
  SPECIAL_MENTIONS,
} from '../lib/mentions';
import { Message, UserIdentity } from '../types';

describe('Mentions Engine', () => {
  const mockUsers: UserIdentity[] = [
    {
      pubkey: 'pubkey_alice_123456789',
      displayName: 'Alice Architect',
      handle: '@alice',
      avatarUrl: '',
      color: '#1264a3',
      status: 'active',
      lastSeen: Date.now(),
    },
    {
      pubkey: 'pubkey_bob_987654321',
      displayName: 'Bob Builder',
      handle: '@bob',
      avatarUrl: '',
      color: '#2bac76',
      status: 'offline',
      lastSeen: Date.now(),
    },
  ];

  it('extracts special tokens and user handles from message content', () => {
    const text = 'Hey @channel, please check in with @alice and @bob regarding deployment! Also cc @here';
    const result = extractMentions(text, mockUsers);

    expect(result).toContain('@channel');
    expect(result).toContain('@here');
    expect(result).toContain('pubkey_alice_123456789');
    expect(result).toContain('pubkey_bob_987654321');
  });

  it('identifies if a user is mentioned via handle or special broadcast', () => {
    const msg1: Message = {
      id: 'msg-1',
      channelId: 'chan-1',
      authorPubkey: 'author_1',
      content: 'Hello @alice how are you?',
      timestamp: Date.now(),
      mentions: ['pubkey_alice_123456789'],
    };

    expect(isUserMentioned(msg1, 'pubkey_alice_123456789', '@alice')).toBe(true);
    expect(isUserMentioned(msg1, 'pubkey_bob_987654321', '@bob')).toBe(false);

    const msg2: Message = {
      id: 'msg-2',
      channelId: 'chan-1',
      authorPubkey: 'author_1',
      content: 'Attention @channel: server maintenance tonight',
      timestamp: Date.now(),
    };

    expect(isUserMentioned(msg2, 'pubkey_bob_987654321', '@bob')).toBe(true);
  });

  it('provides autocomplete suggestions matching query', () => {
    const suggestions = getMentionSuggestions('ali', mockUsers);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].name).toBe('Alice Architect');
    expect(suggestions[0].handle).toBe('@alice');

    const emptySuggestions = getMentionSuggestions('', mockUsers);
    expect(emptySuggestions.length).toBe(SPECIAL_MENTIONS.length + mockUsers.length);
  });

  it('generates clean handles and resolves collisions deterministically', () => {
    expect(generateHandleFromName('Alice')).toBe('@alice');
    expect(generateHandleFromName('Alice Smith')).toBe('@alice.smith');
    expect(generateHandleFromName('!!!')).toBe('@user');
    expect(generateHandleFromName('Alice Smith', ['@alice.smith'])).toBe('@a.smith');
    expect(
      generateHandleFromName('Alice Smith', ['@alice.smith', '@a.smith'])
    ).toBe('@ali.smith');
    expect(
      generateHandleFromName('Alice Smith', ['@alice.smith', '@a.smith', '@ali.smith'])
    ).toBe('@alice.s');
    expect(
      generateHandleFromName('Alice Smith', [
        '@alice.smith',
        '@a.smith',
        '@ali.smith',
        '@alice.s',
        '@alice.smith2',
      ])
    ).toBe('@alice.smith3');
  });
});
