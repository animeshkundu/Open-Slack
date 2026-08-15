import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { Channel } from '../types';

describe('Direct Message & Group Chat Persistence', () => {
  it('creates distinct, persistent channel IDs for different 1-on-1 and group DMs without overwriting', () => {
    const doc = new Y.Doc();
    const yChannels = doc.getMap<Channel>('channels');

    const myPubkey = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    const peer1Pubkey = 'b1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    const peer2Pubkey = 'c1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

    // Helper matching openDirectMessage logic
    const createDm = (peerPubkeys: string[]) => {
      const allMembers = Array.from(new Set([myPubkey, ...peerPubkeys]));
      const id = `dm_${[...allMembers].sort().join('_')}`;
      const dmChannel: Channel = {
        id,
        name: peerPubkeys.join(', '),
        topic: 'Direct message',
        isPrivate: true,
        isDirectMessage: true,
        members: allMembers,
        created: Date.now(),
        creatorPubkey: myPubkey,
      };

      doc.transact(() => {
        yChannels.set(id, dmChannel);
      });
      return dmChannel;
    };

    // 1. Create DM with Peer 1
    const dm1 = createDm([peer1Pubkey]);
    expect(yChannels.size).toBe(1);
    expect(yChannels.get(dm1.id)).toBeDefined();

    // 2. Create DM with Peer 2
    const dm2 = createDm([peer2Pubkey]);
    expect(yChannels.size).toBe(2);
    expect(yChannels.get(dm2.id)).toBeDefined();
    expect(dm1.id).not.toBe(dm2.id);

    // 3. Create Group DM with Peer 1 and Peer 2
    const groupDm = createDm([peer1Pubkey, peer2Pubkey]);
    expect(yChannels.size).toBe(3);
    expect(yChannels.get(groupDm.id)).toBeDefined();
    expect(groupDm.id).not.toBe(dm1.id);
    expect(groupDm.id).not.toBe(dm2.id);

    // Verify all 3 channels remain intact and persisted
    const channels = Array.from(yChannels.values());
    expect(channels.length).toBe(3);
    expect(channels.map((c) => c.id)).toContain(dm1.id);
    expect(channels.map((c) => c.id)).toContain(dm2.id);
    expect(channels.map((c) => c.id)).toContain(groupDm.id);
  });
});
