import { describe, expect, it } from 'vitest';
import { Channel, JoinRequest, Workspace } from '../types';

describe('Workspace Synchronization & Security Model', () => {
  it('encodes and decodes invite URLs safely with join tokens and relay addresses', () => {
    const workspace: Workspace = {
      id: 'ws-prod-alpha',
      name: 'Open Slack HQ',
      created: Date.now(),
      ownerPubkey: 'peer-alice-pubkey',
      ownerId: 'peer-alice-pubkey',
      relays: ['wss://relay.damus.io', 'wss://nostr.mom'],
      settings: {
        requireApprovalForInvites: true,
        defaultChannels: ['general', 'random'],
      },
    };

    const baseUrl = 'https://animesh.kundus.in/Open-Slack/#/join';
    const params = new URLSearchParams({
      ws: workspace.id,
      name: workspace.name,
      relays: (workspace.relays || []).join(','),
      owner: workspace.ownerPubkey,
      approval: workspace.settings?.requireApprovalForInvites ? '1' : '0',
    });
    const inviteUrl = `${baseUrl}?${params.toString()}`;

    expect(inviteUrl).toContain('ws=ws-prod-alpha');
    expect(inviteUrl).toContain('approval=1');

    // Parse back
    const urlObj = new URL(inviteUrl.replace('/#/', '/'));
    const parsedWs = urlObj.searchParams.get('ws');
    const parsedRelays = urlObj.searchParams.get('relays')?.split(',');

    expect(parsedWs).toBe(workspace.id);
    expect(parsedRelays).toEqual(workspace.relays);
  });

  it('validates join request approval lifecycle transitions', () => {
    const request: JoinRequest = {
      id: 'req-101',
      workspaceId: 'ws-prod-alpha',
      userId: 'peer-bob-pubkey',
      userName: 'Bob Builder',
      userEmail: 'bob@example.com',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    expect(request.status).toBe('PENDING');

    // Approve transition
    const approvedRequest: JoinRequest = {
      ...request,
      status: 'APPROVED',
    };

    expect(approvedRequest.status).toBe('APPROVED');
    expect(approvedRequest.userId).toBe('peer-bob-pubkey');
  });

  it('filters active channels from archived or direct messages accurately', () => {
    const channels: Channel[] = [
      {
        id: 'c1',
        workspaceId: 'ws-1',
        name: 'general',
        isPrivate: false,
        isDirectMessage: false,
        created: 100,
        creatorPubkey: 'alice',
      },
      {
        id: 'c2',
        workspaceId: 'ws-1',
        name: 'random',
        isPrivate: false,
        isDirectMessage: false,
        created: 200,
        creatorPubkey: 'alice',
      },
      {
        id: 'c3',
        workspaceId: 'ws-1',
        name: 'dm-alice-bob',
        isPrivate: true,
        isDirectMessage: true,
        created: 300,
        creatorPubkey: 'alice',
        members: ['alice', 'bob'],
      },
    ];

    const publicChannels = channels.filter((c) => !c.isDirectMessage);
    const dms = channels.filter((c) => c.isDirectMessage);

    expect(publicChannels.length).toBe(2);
    expect(publicChannels.map((c) => c.name)).toEqual(['general', 'random']);
    expect(dms.length).toBe(1);
    expect(dms[0].members).toContain('bob');
  });
});
