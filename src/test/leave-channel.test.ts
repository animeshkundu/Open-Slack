import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { Channel } from '../types';

describe('Channel & Conversation Leaving Logic', () => {
  it('leaves a private channel and falls back to default general channel', () => {
    const doc = new Y.Doc();
    const yChannels = doc.getMap<Channel>('channels');

    const generalChannel: Channel = {
      id: 'chan_general',
      name: 'general',
      topic: 'General discussion',
      isPrivate: false,
      workspaceId: 'ws-1',
      creatorPubkey: 'pubkey-owner',
      created: Date.now(),
    };

    const privateChannel: Channel = {
      id: 'chan_secret_ops',
      name: 'secret-ops',
      topic: 'Confidential project planning',
      isPrivate: true,
      workspaceId: 'ws-1',
      creatorPubkey: 'pubkey-user-1',
      created: Date.now(),
    };

    doc.transact(() => {
      yChannels.set(generalChannel.id, generalChannel);
      yChannels.set(privateChannel.id, privateChannel);
    });

    expect(yChannels.size).toBe(2);
    expect(yChannels.has('chan_secret_ops')).toBe(true);

    // Simulate leaving private channel
    let activeChannelId = 'chan_secret_ops';
    doc.transact(() => {
      yChannels.delete('chan_secret_ops');
    });

    if (activeChannelId === 'chan_secret_ops') {
      activeChannelId = 'chan_general';
    }

    expect(yChannels.size).toBe(1);
    expect(yChannels.has('chan_secret_ops')).toBe(false);
    expect(activeChannelId).toBe('chan_general');
  });

  it('leaves a group chat / direct message and resets active view', () => {
    const doc = new Y.Doc();
    const yChannels = doc.getMap<Channel>('channels');

    const groupChat: Channel = {
      id: 'dm_group_123',
      name: 'Elena Rostova, Marcus Sterling',
      topic: 'Direct message group',
      isPrivate: true,
      isDirectMessage: true,
      members: ['pubkey-1', 'pubkey-2', 'pubkey-3'],
      workspaceId: 'ws-1',
      creatorPubkey: 'pubkey-1',
      created: Date.now(),
    };

    doc.transact(() => {
      yChannels.set(groupChat.id, groupChat);
    });

    expect(yChannels.has('dm_group_123')).toBe(true);

    // Simulate leaving group chat
    doc.transact(() => {
      yChannels.delete('dm_group_123');
    });

    expect(yChannels.has('dm_group_123')).toBe(false);
  });

  it('persists remaining channels correctly after leaving', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const yChannels1 = doc1.getMap<Channel>('channels');
    const yChannels2 = doc2.getMap<Channel>('channels');

    const ch1: Channel = { id: 'chan_general', name: 'general', isPrivate: false, workspaceId: 'w', creatorPubkey: 'p', created: 1 };
    const ch2: Channel = { id: 'chan_random', name: 'random', isPrivate: false, workspaceId: 'w', creatorPubkey: 'p', created: 2 };
    const ch3: Channel = { id: 'chan_private', name: 'private-team', isPrivate: true, workspaceId: 'w', creatorPubkey: 'p', created: 3 };

    doc1.transact(() => {
      yChannels1.set(ch1.id, ch1);
      yChannels1.set(ch2.id, ch2);
      yChannels1.set(ch3.id, ch3);
    });

    // Sync doc1 -> doc2
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));
    expect(yChannels2.size).toBe(3);

    // User leaves ch3 in doc1
    doc1.transact(() => {
      yChannels1.delete(ch3.id);
    });

    // Sync deletion update doc1 -> doc2
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));
    expect(yChannels2.size).toBe(2);
    expect(yChannels2.has('chan_private')).toBe(false);
    expect(yChannels2.has('chan_general')).toBe(true);
  });
});
