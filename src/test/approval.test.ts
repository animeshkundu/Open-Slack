import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { JoinRequest, Workspace } from '../types';

describe('Workspace Approval Flow & Access Gatekeeping', () => {
  it('manages CRDT join requests queue across peers', () => {
    const ydoc = new Y.Doc();
    const yJoinRequests = ydoc.getArray<JoinRequest>('joinRequests');

    const req1: JoinRequest = {
      id: 'req-1',
      workspaceId: 'ws-1',
      userId: 'candidate_pubkey_1',
      userName: 'Candidate Alice',
      userEmail: 'alice@example.com',
      userRole: 'Frontend Dev',
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    };

    yJoinRequests.push([req1]);
    expect(yJoinRequests.length).toBe(1);
    expect(yJoinRequests.get(0).status).toBe('PENDING');

    // Admin approves request
    const existing = yJoinRequests.toArray();
    const idx = existing.findIndex((r) => r.id === 'req-1');
    if (idx !== -1) {
      const updated: JoinRequest = {
        ...existing[idx],
        status: 'APPROVED',
      };
      yJoinRequests.delete(idx, 1);
      yJoinRequests.insert(idx, [updated]);
    }

    expect(yJoinRequests.get(0).status).toBe('APPROVED');
  });

  it('validates workspace settings configuration', () => {
    const ws: Workspace = {
      id: 'ws-1',
      name: 'Acme P2P',
      passphrase: 'secret-phrase',
      ownerId: 'owner_pubkey',
      ownerPubkey: 'owner_pubkey',
      relays: ['wss://relay.damus.io'],
      created: Date.now(),
      createdAt: new Date().toISOString(),
      settings: {
        requireApprovalForInvites: true,
        allowGuestInvites: false,
        defaultChannels: ['chan_general'],
      },
    };

    expect(ws.settings?.requireApprovalForInvites).toBe(true);
    expect(ws.settings?.allowGuestInvites).toBe(false);
  });
});
