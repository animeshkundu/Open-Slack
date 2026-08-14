import { joinRoom, Room } from 'trystero/nostr';
import * as Y from 'yjs';
import { HuddleParticipant, UserIdentity } from '../types';

export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.mom',
];

export interface P2PEvents {
  onPeerJoin?: (peerId: string) => void;
  onPeerLeave?: (peerId: string) => void;
  onPresenceUpdate?: (peerId: string, user: UserIdentity) => void;
  onTypingUpdate?: (channelId: string, userPubkey: string, isTyping: boolean) => void;
  onHuddleStateUpdate?: (channelId: string, participants: HuddleParticipant[]) => void;
  onPeerStream?: (stream: MediaStream, peerId: string) => void;
}

export class P2PNetworkManager {
  private room: Room | null = null;
  private ydoc: Y.Doc | null = null;
  private localIdentity: UserIdentity | null = null;
  private isMasterTab = false;
  private tabBroadcastChannel: BroadcastChannel | null = null;
  private events: P2PEvents = {};

  // Trystero action senders
  private sendSyncVector: ((data: Uint8Array, options?: { target?: string }) => Promise<void>) | null = null;
  private sendDeltaUpdate: ((data: Uint8Array, options?: { target?: string }) => Promise<void>) | null = null;
  private sendPresence: ((user: any, options?: { target?: string }) => Promise<void>) | null = null;
  private sendTyping: ((payload: any, options?: { target?: string }) => Promise<void>) | null = null;
  private sendHuddleSignal: ((payload: any, options?: { target?: string }) => Promise<void>) | null = null;

  private activeStream: MediaStream | null = null;
  private presenceInterval: number | null = null;
  public connectedPeers: Set<string> = new Set();
  public relayStatus: 'connecting' | 'connected' | 'disconnected' = 'connecting';

  constructor() {
    this.initTabLeaderElection();
  }

  /**
   * Cross-tab leader election using Web Locks & BroadcastChannel
   */
  private initTabLeaderElection() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.tabBroadcastChannel = new BroadcastChannel('quietslack_tab_bus');
        this.tabBroadcastChannel.onmessage = (event) => {
          const { type, data } = event.data || {};
          if (type === 'YJS_UPDATE' && this.ydoc && data) {
            const update = new Uint8Array(data);
            Y.applyUpdate(this.ydoc, update, 'tab_bus');
          } else if (type === 'PRESENCE_SYNC' && this.events.onPresenceUpdate) {
            this.events.onPresenceUpdate(data.peerId, data.user);
          } else if (type === 'TYPING_SYNC' && this.events.onTypingUpdate) {
            this.events.onTypingUpdate(data.channelId, data.pubkey, data.isTyping);
          }
        };
      }

      if (typeof navigator !== 'undefined' && navigator.locks) {
        navigator.locks.request('quietslack_master_lock', async () => {
          this.isMasterTab = true;
          console.log('[P2P] Elected as Master Tab');
          return new Promise<void>(() => {});
        }).catch((e) => {
          console.warn('[P2P] Web lock election note:', e);
        });
      } else {
        this.isMasterTab = true;
      }
    } catch (e) {
      console.warn('[P2P] Tab election fallback:', e);
      this.isMasterTab = true;
    }
  }

  /**
   * Connect to workspace Nostr Room
   */
  public joinWorkspace(
    workspaceId: string,
    ydoc: Y.Doc,
    identity: UserIdentity,
    relays: string[] = DEFAULT_RELAYS,
    events: P2PEvents = {}
  ) {
    this.leaveWorkspace();
    this.ydoc = ydoc;
    this.localIdentity = identity;
    this.events = events;

    const roomId = `qs_${workspaceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)}`;

    try {
      const activeRelays = relays.length > 0 ? relays : DEFAULT_RELAYS;
      this.room = joinRoom(
        {
          appId: 'quietslack-p2p-v1',
          relayConfig: {
            urls: activeRelays,
          },
        },
        roomId
      );

      this.relayStatus = 'connected';
      console.log(`[P2P] Joined room ${roomId} via Nostr relays:`, activeRelays);

      // 1. Setup Trystero Actions using makeAction objects
      const vectorAction = this.room.makeAction<Uint8Array>('sync_vec');
      const deltaAction = this.room.makeAction<Uint8Array>('sync_delta');
      const presAction = this.room.makeAction<any>('pres');
      const typeAction = this.room.makeAction<any>('type');
      const huddleAction = this.room.makeAction<any>('huddle');

      this.sendSyncVector = (data, opts) => vectorAction.send(data, opts);
      this.sendDeltaUpdate = (data, opts) => deltaAction.send(data, opts);
      this.sendPresence = (data, opts) => presAction.send(data, opts);
      this.sendTyping = (data, opts) => typeAction.send(data, opts);
      this.sendHuddleSignal = (data, opts) => huddleAction.send(data, opts);

      // 2. State Vector Sync (Anti-Entropy)
      vectorAction.onMessage = (remoteVector, ctx) => {
        if (!this.ydoc) return;
        const missingDelta = Y.encodeStateAsUpdate(this.ydoc, new Uint8Array(remoteVector));
        if (missingDelta.length > 0 && this.sendDeltaUpdate) {
          this.sendDeltaUpdate(missingDelta, { target: ctx.peerId });
        }
      };

      // 3. Apply remote delta updates
      deltaAction.onMessage = (deltaUpdate) => {
        if (!this.ydoc) return;
        Y.applyUpdate(this.ydoc, new Uint8Array(deltaUpdate), 'p2p_network');
      };

      // 4. Presence
      presAction.onMessage = (user, ctx) => {
        this.events.onPresenceUpdate?.(ctx.peerId, user as UserIdentity);
        this.tabBroadcastChannel?.postMessage({
          type: 'PRESENCE_SYNC',
          data: { peerId: ctx.peerId, user },
        });
      };

      // 5. Typing
      typeAction.onMessage = (payload) => {
        this.events.onTypingUpdate?.(payload.channelId, payload.pubkey, payload.isTyping);
        this.tabBroadcastChannel?.postMessage({
          type: 'TYPING_SYNC',
          data: payload,
        });
      };

      // 6. Huddle Signaling
      huddleAction.onMessage = (_payload) => {};

      // 7. Peer Lifecycle Callbacks
      this.room.onPeerJoin = (peerId: string) => {
        console.log(`[P2P] Peer joined: ${peerId}`);
        this.connectedPeers.add(peerId);
        this.events.onPeerJoin?.(peerId);

        // Send local state vector to the new peer
        if (this.ydoc && this.sendSyncVector) {
          const localVector = Y.encodeStateVector(this.ydoc);
          this.sendSyncVector(localVector, { target: peerId });
        }

        // Send our presence immediately
        if (this.localIdentity && this.sendPresence) {
          this.sendPresence(this.localIdentity, { target: peerId });
        }

        // If local huddle stream is active, attach stream
        if (this.activeStream && this.room) {
          this.room.addStream(this.activeStream, { target: peerId });
        }
      };

      this.room.onPeerLeave = (peerId: string) => {
        console.log(`[P2P] Peer left: ${peerId}`);
        this.connectedPeers.delete(peerId);
        this.events.onPeerLeave?.(peerId);
      };

      // 8. Stream Handling for Huddles
      this.room.onPeerStream = (stream: MediaStream, peerId: string) => {
        console.log(`[P2P] Received media stream from peer: ${peerId}`);
        this.events.onPeerStream?.(stream, peerId);
      };

      // 9. Start regular Presence Heartbeat
      this.startPresenceHeartbeat();

      // 10. Hook Y.Doc updates to broadcast deltas over P2P & Tab bus
      this.ydoc.on('update', this.handleYDocUpdate);
    } catch (err) {
      console.warn('[P2P] Error joining Nostr room, running in resilient offline/tab mesh:', err);
      this.relayStatus = 'disconnected';
    }
  }

  private handleYDocUpdate = (update: Uint8Array, origin: unknown) => {
    // Prevent echo loops from updates originating from p2p_network
    if (origin !== 'p2p_network' && this.sendDeltaUpdate) {
      this.sendDeltaUpdate(update);
    }
    // Also broadcast to local tabs
    if (origin !== 'tab_bus' && this.tabBroadcastChannel) {
      this.tabBroadcastChannel.postMessage({
        type: 'YJS_UPDATE',
        data: Array.from(update),
      });
    }
  };

  public broadcastTyping(channelId: string, isTyping: boolean) {
    if (!this.localIdentity) return;
    const payload = {
      channelId,
      pubkey: this.localIdentity.pubkey,
      isTyping,
    };
    this.sendTyping?.(payload);
    this.tabBroadcastChannel?.postMessage({
      type: 'TYPING_SYNC',
      data: payload,
    });
  }

  public updateLocalIdentity(identity: UserIdentity) {
    this.localIdentity = identity;
    if (this.sendPresence) {
      this.sendPresence(identity);
    }
  }

  private startPresenceHeartbeat() {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }
    this.presenceInterval = window.setInterval(() => {
      if (this.localIdentity && this.sendPresence) {
        this.sendPresence({
          ...this.localIdentity,
          lastSeen: Date.now(),
          isOnline: true,
        });
      }
    }, 15000);
  }

  /**
   * Huddle Media Stream controls
   */
  public addMediaStream(stream: MediaStream) {
    this.activeStream = stream;
    if (this.room) {
      try {
        this.room.addStream(stream);
      } catch (err) {
        console.warn('[P2P] Error adding stream to room:', err);
      }
    }
  }

  public removeMediaStream() {
    if (this.activeStream && this.room) {
      try {
        this.room.removeStream(this.activeStream);
      } catch (err) {
        console.warn('[P2P] Error removing stream:', err);
      }
    }
    this.activeStream = null;
  }

  public leaveWorkspace() {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
    if (this.ydoc) {
      this.ydoc.off('update', this.handleYDocUpdate);
    }
    if (this.room) {
      try {
        this.room.leave();
      } catch {}
      this.room = null;
    }
    this.connectedPeers.clear();
    this.relayStatus = 'disconnected';
  }
}

// Global Singleton Instance
export const p2pNetwork = new P2PNetworkManager();
