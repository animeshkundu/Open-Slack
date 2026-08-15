import { describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { P2PNetworkManager, pingRelay } from '../lib/p2p';
import { UserIdentity } from '../types';

describe('P2P Network & CRDT Synchronization', () => {
  const dummyIdentity: UserIdentity = {
    pubkey: 'pub_test_alpha',
    enc_pubkey: 'enc_test_alpha',
    displayName: 'Test User',
    handle: '@test',
    avatarUrl: '',
    status: 'Testing P2P',
    lastSeen: Date.now(),
    color: '#1164A3',
    isOnline: true,
  };

  it('initializes tab election and singleton correctly', () => {
    const manager = new P2PNetworkManager();
    expect(manager.getIsMasterTab()).toBe(true);
    expect(manager.relayStatus).toBe('connecting');
  });

  it('synchronizes Yjs CRDT documents using state vectors and deltas', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const arrA = docA.getArray<string>('messages');
    const arrB = docB.getArray<string>('messages');

    // Peer A inserts a message
    arrA.push(['Message from Peer A']);

    // Generate state vector from Peer B and compute missing delta on Peer A
    const vectorB = Y.encodeStateVector(docB);
    const missingDeltaForB = Y.encodeStateAsUpdate(docA, vectorB);

    // Apply missing delta to Peer B
    Y.applyUpdate(docB, missingDeltaForB);

    expect(arrB.toArray()).toEqual(['Message from Peer A']);

    // Peer B inserts a reply
    arrB.push(['Reply from Peer B']);

    // Sync back to Peer A
    const vectorA = Y.encodeStateVector(docA);
    const missingDeltaForA = Y.encodeStateAsUpdate(docB, vectorA);
    Y.applyUpdate(docA, missingDeltaForA);

    expect(arrA.toArray()).toEqual(['Message from Peer A', 'Reply from Peer B']);
  });

  it('handles media stream add and remove safely', () => {
    const manager = new P2PNetworkManager();
    const track = { kind: 'audio', stop: vi.fn() };
    const mockStream = {
      getTracks: () => [track],
    } as unknown as MediaStream;

    expect(() => manager.addMediaStream(mockStream)).not.toThrow();
    expect(() => manager.removeMediaStream()).not.toThrow();
  });

  it('handles broadcast message payload and file chunking trigger safely', async () => {
    const manager = new P2PNetworkManager();
    const doc = new Y.Doc();
    manager.joinWorkspace('ws-test-2', doc, dummyIdentity, ['wss://relay.damus.io']);

    const buffer = new Uint8Array(2000).buffer;
    const file = {
      name: 'notes.txt',
      type: 'text/plain',
      size: buffer.byteLength,
      arrayBuffer: async () => buffer,
    } as unknown as File;

    const attachment = await manager.broadcastFile(file);
    expect(attachment.fileName).toBe('notes.txt');

    manager.leaveWorkspace();
  });

  it('handles peer join, leave, presence and stream callbacks safely', () => {
    const manager = new P2PNetworkManager();
    const doc = new Y.Doc();

    const onJoin = vi.fn();
    const onLeave = vi.fn();
    const onPresence = vi.fn();

    manager.joinWorkspace('ws-test', doc, dummyIdentity, ['wss://relay.damus.io'], {
      onPeerJoin: onJoin,
      onPeerLeave: onLeave,
      onPresenceUpdate: onPresence,
    });

    manager.updateLocalIdentity({ ...dummyIdentity, status: 'Updated Status' });
    manager.broadcastTyping('chan_general', true);

    manager.leaveWorkspace();
    expect(manager.relayStatus).toBe('disconnected');
  });

  it('reports relay open, error, and timeout outcomes', async () => {
    class OpenSocket {
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      close = vi.fn();

      constructor() {
        queueMicrotask(() => this.onopen?.());
      }
    }

    vi.stubGlobal('WebSocket', OpenSocket);
    const openResult = await pingRelay('wss://open.test', 100);
    expect(openResult.ok).toBe(true);
    expect(openResult.url).toBe('wss://open.test');

    class ErrorSocket {
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      close = vi.fn();

      constructor() {
        queueMicrotask(() => this.onerror?.());
      }
    }

    vi.stubGlobal('WebSocket', ErrorSocket);
    const errorResult = await pingRelay('wss://error.test', 100);
    expect(errorResult.ok).toBe(false);

    class TimeoutSocket {
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      close = vi.fn();
    }

    vi.stubGlobal('WebSocket', TimeoutSocket);
    vi.useFakeTimers();
    const timeoutPromise = pingRelay('wss://timeout.test', 25);
    await vi.advanceTimersByTimeAsync(25);
    await expect(timeoutPromise).resolves.toMatchObject({
      url: 'wss://timeout.test',
      latency: 25,
      ok: false,
    });
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('broadcasts local Yjs updates to network and sibling tabs', () => {
    const manager = new P2PNetworkManager();
    const sendDeltaUpdate = vi.fn();
    const postMessage = vi.fn();
    (manager as any).sendDeltaUpdate = sendDeltaUpdate;
    (manager as any).tabBroadcastChannel = { postMessage };

    (manager as any).handleYDocUpdate(new Uint8Array([1, 2]), 'local');

    expect(sendDeltaUpdate).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledWith({
      type: 'YJS_UPDATE',
      data: [1, 2],
    });
  });
});
