import { describe, expect, it } from 'vitest';
import { parseSearchQuery, searchWorkspaceMessages } from '../lib/search';
import { Channel, Message, UserIdentity } from '../types';

describe('Search Module', () => {
  it('parses structured search query modifiers correctly', () => {
    const q1 = 'deploy WebRTC from:@alex in:#general has:file';
    const parsed1 = parseSearchQuery(q1);

    expect(parsed1.keywords).toEqual(['deploy', 'webrtc']);
    expect(parsed1.fromUser).toBe('alex');
    expect(parsed1.inChannel).toBe('general');
    expect(parsed1.hasFile).toBe(true);

    const q2 = 'in:engineering has:image bugfix';
    const parsed2 = parseSearchQuery(q2);
    expect(parsed2.keywords).toEqual(['bugfix']);
    expect(parsed2.inChannel).toBe('engineering');
    expect(parsed2.hasFile).toBe(true);
  });

  it('searches messages and filters by channel, user, and keyword', () => {
    const channels = new Map<string, Channel>([
      ['c1', { id: 'c1', name: 'general', topic: '', isPrivate: false, created: 0, creatorPubkey: 'u1' }],
      ['c2', { id: 'c2', name: 'random', topic: '', isPrivate: false, created: 0, creatorPubkey: 'u1' }],
    ]);

    const users = new Map<string, UserIdentity>([
      ['u1', { pubkey: 'u1', enc_pubkey: 'e1', displayName: 'Alice Chen', handle: '@alice', avatarUrl: '', status: '', lastSeen: 0, color: '#1164A3', isOnline: true }],
      ['u2', { pubkey: 'u2', enc_pubkey: 'e2', displayName: 'Bob Smith', handle: '@bob', avatarUrl: '', status: '', lastSeen: 0, color: '#2BAC76', isOnline: true }],
    ]);

    const messages: Message[] = [
      {
        id: 'm1',
        channelId: 'c1',
        authorPubkey: 'u1',
        content: 'We need to deploy the new P2P mesh cluster today',
        timestamp: 1000,
        reactions: {},
      },
      {
        id: 'm2',
        channelId: 'c1',
        authorPubkey: 'u2',
        content: 'Sounds good Alice, I will review the pull request',
        timestamp: 2000,
        reactions: {},
      },
      {
        id: 'm3',
        channelId: 'c2',
        authorPubkey: 'u1',
        content: 'Coffee break in 5 minutes with a file attachment',
        timestamp: 3000,
        reactions: {},
        attachments: [
          {
            id: 'a1',
            fileName: 'menu.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            dataUrl: 'data:pdf',
            sha256: 'hash',
          },
        ],
      },
    ];

    // Search by keyword
    const res1 = searchWorkspaceMessages(messages, channels, users, 'deploy mesh');
    expect(res1).toHaveLength(1);
    expect(res1[0].message.id).toBe('m1');
    expect(res1[0].channelName).toBe('general');
    expect(res1[0].authorName).toBe('Alice Chen');

    // Search by channel
    const res2 = searchWorkspaceMessages(messages, channels, users, 'in:random');
    expect(res2).toHaveLength(1);
    expect(res2[0].message.id).toBe('m3');

    // Search by user
    const res3 = searchWorkspaceMessages(messages, channels, users, 'from:@bob');
    expect(res3).toHaveLength(1);
    expect(res3[0].message.id).toBe('m2');

    // Search by has:file
    const res4 = searchWorkspaceMessages(messages, channels, users, 'has:file');
    expect(res4).toHaveLength(1);
    expect(res4[0].message.id).toBe('m3');

    // Search empty query
    const resEmpty = searchWorkspaceMessages(messages, channels, users, '');
    expect(resEmpty).toEqual([]);
  });
});
