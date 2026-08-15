import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  buildDmTitle,
  createDmChannelId,
  findExistingDmChannel,
  normalizeMemberSet,
  sameMemberSet,
} from '../lib/channels';
import { Channel } from '../types';

describe('Direct Message & Group Chat Persistence', () => {
  const myPubkey = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
  const peer1Pubkey = 'b1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
  const peer2Pubkey = 'c1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
  const peer3Pubkey = 'd1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';

  const openDm = (
    yChannels: Y.Map<Channel>,
    channels: Channel[],
    peerPubkeys: string[]
  ): Channel => {
    const peers = normalizeMemberSet(peerPubkeys.filter((pk) => pk !== myPubkey));
    const existing = findExistingDmChannel(channels, myPubkey, peers);
    if (existing) {
      const restored: Channel = {
        ...existing,
        members: normalizeMemberSet([...(existing.members || []), myPubkey]),
      };
      yChannels.set(existing.id, restored);
      return restored;
    }

    const id = createDmChannelId();
    const dmChannel: Channel = {
      id,
      name: buildDmTitle(peers.map((pk) => `User ${pk.slice(0, 4)}`)),
      topic: 'Direct message',
      isPrivate: true,
      isDirectMessage: true,
      members: normalizeMemberSet([myPubkey, ...peers]),
      created: Date.now(),
      creatorPubkey: myPubkey,
    };
    yChannels.set(id, dmChannel);
    return dmChannel;
  };

  const snapshot = (yChannels: Y.Map<Channel>): Channel[] =>
    Array.from(yChannels.values());

  it('creates distinct, persistent channel IDs for different 1-on-1 and group DMs without overwriting', () => {
    const doc = new Y.Doc();
    const yChannels = doc.getMap<Channel>('channels');

    const dm1 = openDm(yChannels, snapshot(yChannels), [peer1Pubkey]);
    expect(yChannels.size).toBe(1);

    const dm2 = openDm(yChannels, snapshot(yChannels), [peer2Pubkey]);
    expect(yChannels.size).toBe(2);
    expect(dm1.id).not.toBe(dm2.id);

    const groupDm = openDm(yChannels, snapshot(yChannels), [peer1Pubkey, peer2Pubkey]);
    expect(yChannels.size).toBe(3);
    expect(groupDm.id).not.toBe(dm1.id);
    expect(groupDm.id).not.toBe(dm2.id);

    // All three remain addressable
    expect(yChannels.get(dm1.id)?.members).toEqual(
      normalizeMemberSet([myPubkey, peer1Pubkey])
    );
    expect(yChannels.get(dm2.id)?.members).toEqual(
      normalizeMemberSet([myPubkey, peer2Pubkey])
    );
    expect(yChannels.get(groupDm.id)?.members).toEqual(
      normalizeMemberSet([myPubkey, peer1Pubkey, peer2Pubkey])
    );
  });

  it('reopens the same conversation instead of replacing when peers match', () => {
    const doc = new Y.Doc();
    const yChannels = doc.getMap<Channel>('channels');

    const first = openDm(yChannels, snapshot(yChannels), [peer1Pubkey]);
    const second = openDm(yChannels, snapshot(yChannels), [peer1Pubkey]);

    expect(second.id).toBe(first.id);
    expect(yChannels.size).toBe(1);
  });

  it('does not clobber an existing group when leaving and recreating the original roster', () => {
    const doc = new Y.Doc();
    const yChannels = doc.getMap<Channel>('channels');

    const group = openDm(yChannels, snapshot(yChannels), [
      peer1Pubkey,
      peer2Pubkey,
      peer3Pubkey,
    ]);
    expect(yChannels.size).toBe(1);

    // Soft-leave: remove self only (mirrors leaveChannel DM path)
    const afterLeave: Channel = {
      ...group,
      members: (group.members || []).filter((m) => m !== myPubkey),
    };
    yChannels.set(group.id, afterLeave);
    expect(yChannels.get(group.id)?.members).not.toContain(myPubkey);

    // Remaining peers still have the original conversation
    expect(yChannels.size).toBe(1);

    // Starting the same group again restores membership on the SAME id
    const reopened = openDm(yChannels, snapshot(yChannels), [
      peer1Pubkey,
      peer2Pubkey,
      peer3Pubkey,
    ]);
    expect(reopened.id).toBe(group.id);
    expect(yChannels.size).toBe(1);
    expect(reopened.members).toEqual(
      normalizeMemberSet([myPubkey, peer1Pubkey, peer2Pubkey, peer3Pubkey])
    );

    // A different group is a new persistent channel
    const otherGroup = openDm(yChannels, snapshot(yChannels), [peer1Pubkey, peer2Pubkey]);
    expect(otherGroup.id).not.toBe(group.id);
    expect(yChannels.size).toBe(2);
    expect(yChannels.get(group.id)).toBeDefined();
    expect(yChannels.get(otherGroup.id)).toBeDefined();
  });

  it('uses opaque ids that do not encode member pubkeys', () => {
    const id = createDmChannelId();
    expect(id.startsWith('dm_')).toBe(true);
    expect(id.includes(peer1Pubkey)).toBe(false);
    expect(id.includes(myPubkey)).toBe(false);
    // Two ids should almost never collide
    expect(createDmChannelId()).not.toBe(createDmChannelId());
  });

  it('normalizes and compares member sets order-independently', () => {
    expect(normalizeMemberSet([peer2Pubkey, myPubkey, peer1Pubkey, myPubkey])).toEqual(
      normalizeMemberSet([myPubkey, peer1Pubkey, peer2Pubkey])
    );
    expect(
      sameMemberSet([peer1Pubkey, myPubkey], [myPubkey, peer1Pubkey])
    ).toBe(true);
    expect(sameMemberSet([peer1Pubkey], [peer2Pubkey])).toBe(false);
  });

  it('buildDmTitle formats 1:1, pair, and larger groups like Slack', () => {
    expect(buildDmTitle(['Ada'])).toBe('Ada');
    expect(buildDmTitle(['Ada', 'Ben'])).toBe('Ada, Ben');
    expect(buildDmTitle(['Ada', 'Ben', 'Cara', 'Dee'])).toBe('Ada, Ben +2');
  });
});
