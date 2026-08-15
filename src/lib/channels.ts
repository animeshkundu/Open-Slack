import { Channel } from '../types';

/** Canonical sorted unique member list for DM comparisons. */
export function normalizeMemberSet(members: string[]): string[] {
  return Array.from(new Set(members.filter(Boolean))).sort();
}

/** True when two member arrays represent the same set of participants. */
export function sameMemberSet(a?: string[] | null, b?: string[] | null): boolean {
  if (!a || !b) return false;
  const left = normalizeMemberSet(a);
  const right = normalizeMemberSet(b);
  if (left.length !== right.length) return false;
  return left.every((member, index) => member === right[index]);
}

/**
 * Opaque DM / group-DM channel id.
 * Membership must never be encoded in the id — otherwise leave + recreate overwrites
 * an existing conversation in the shared Yjs map.
 */
export function createDmChannelId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `dm_${random}`;
}

/**
 * Find an existing 1:1 or group DM by the peer set (excluding optional self).
 * Matches even if the local user previously left/closed the conversation so
 * reopening restores the same history instead of creating a replacement channel.
 */
export function findExistingDmChannel(
  channels: Channel[],
  myPubkey: string,
  peerPubkeys: string[]
): Channel | undefined {
  const neededPeers = normalizeMemberSet(peerPubkeys.filter((pk) => pk && pk !== myPubkey));
  if (neededPeers.length === 0) return undefined;

  return channels.find((channel) => {
    if (!channel.isDirectMessage || !channel.members?.length) return false;
    const others = normalizeMemberSet(channel.members.filter((m) => m !== myPubkey));
    return sameMemberSet(others, neededPeers);
  });
}

/** Build a display title for a DM / group DM from peer display names. */
export function buildDmTitle(peerNames: string[]): string {
  if (peerNames.length === 0) return 'Direct Message';
  if (peerNames.length === 1) return peerNames[0];
  if (peerNames.length === 2) return peerNames.join(', ');
  return `${peerNames.slice(0, 2).join(', ')} +${peerNames.length - 2}`;
}
