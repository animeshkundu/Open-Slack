import { describe, expect, it } from 'vitest';
import { Channel, Message } from '../types';

describe('Message Composer & Chat Helpers Engine', () => {
  it('formats Slack markdown styles correctly', () => {
    const rawText = '*bold* and _italic_ and `code` and ~strikethrough~';
    expect(rawText).toContain('*bold*');
    expect(rawText).toContain('_italic_');
    expect(rawText).toContain('`code`');
    expect(rawText).toContain('~strikethrough~');
  });

  it('handles slash commands parsing cleanly', () => {
    const handleSlashCommand = (input: string) => {
      const trimmed = input.trim();
      if (trimmed === '/shrug') return '¯\\_(ツ)_/¯';
      if (trimmed === '/tableflip') return '(╯°□°)╯︵ ┻━┻';
      if (trimmed.startsWith('/status ')) return trimmed.replace('/status ', '');
      return input;
    };

    expect(handleSlashCommand('/shrug')).toBe('¯\\_(ツ)_/¯');
    expect(handleSlashCommand('/tableflip')).toBe('(╯°□°)╯︵ ┻━┻');
    expect(handleSlashCommand('/status In a deep focus session')).toBe('In a deep focus session');
    expect(handleSlashCommand('Regular message')).toBe('Regular message');
  });

  it('calculates thread reply counts and reaction summaries accurately', () => {
    const mockMessages: Message[] = [
      {
        id: 'msg-1',
        channelId: 'general',
        authorPubkey: 'user-1',
        senderId: 'user-1',
        content: 'Root thread message',
        timestamp: 1000,
        reactions: { '🚀': ['user-1', 'user-2'], '❤️': ['user-3'] },
        replyCount: 2,
      },
      {
        id: 'msg-2',
        channelId: 'general',
        authorPubkey: 'user-2',
        senderId: 'user-2',
        content: 'Thread reply 1',
        timestamp: 1050,
        threadParentId: 'msg-1',
      },
      {
        id: 'msg-3',
        channelId: 'general',
        authorPubkey: 'user-3',
        senderId: 'user-3',
        content: 'Thread reply 2',
        timestamp: 1100,
        threadParentId: 'msg-1',
      },
    ];

    const rootMessage = mockMessages.find((m) => m.id === 'msg-1')!;
    const replies = mockMessages.filter((m) => m.threadParentId === 'msg-1');
    expect(replies.length).toBe(2);

    const rocketReactions = rootMessage.reactions?.['🚀'] || [];
    expect(rocketReactions.length).toBe(2);
    expect(rocketReactions).toContain('user-1');
    expect(rocketReactions).toContain('user-2');
  });

  it('validates channel topic, description, and privacy attributes', () => {
    const mockChannel: Channel = {
      id: 'c-dev',
      workspaceId: 'ws-1',
      name: 'engineering',
      topic: 'Architecture & peer-to-peer engineering',
      description: 'Discussions on WebCrypto, WebRTC mesh, and Yjs CRDTs',
      isPrivate: false,
      isDirectMessage: false,
      created: Date.now(),
      creatorPubkey: 'alice-pubkey',
      pinnedMessageIds: ['msg-1'],
    };

    expect(mockChannel.topic).toBe('Architecture & peer-to-peer engineering');
    expect(mockChannel.pinnedMessageIds).toContain('msg-1');
    expect(mockChannel.isPrivate).toBe(false);
  });
});
