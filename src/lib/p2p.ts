import { joinRoom, Room } from 'trystero/nostr';
import * as Y from 'yjs';
import { Attachment, HuddleParticipant, UserIdentity } from '../types';
import {
  FileChunkData,
  FileChunkHeader,
  fileChunkManager,
  FileTransferProgress,
} from './fileTransfer';

export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.mom',
  'wss://relay.nostr.band',
];

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export interface P2PEvents {
  onPeerJoin?: (peerId: string) => void;
  onPeerLeave?: (peerId: string) => void;
  onPresenceUpdate?: (peerId: string, user: UserIdentity) => void;
  onTypingUpdate?: (channelId: string, userPubkey: string, isTyping: boolean) => void;
  onHuddleStateUpdate?: (channelId: string, participants: HuddleParticipant[]) => void;
  onPeerStream?: (stream: MediaStream, peerId: string) => void;
  onFileReceived?: (attachment: Attachment, senderPeerId: string) => void;
  onFileProgress?: (progress: FileTransferProgress) => void;
  onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;
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
  private sendFileHeader: ((header: FileChunkHeader, options?: { target?: string }) => Promise<void>) | null = null;
  private sendFileChunk: ((chunk: FileChunkData, options?: { target?: string }) => Promise<void>) | null = null;

  private activeStream: MediaStream | null = null;
  private presenceInterval: number | null = null;
  private antiEntropyInterval: number | null = null;
  private reconnectTimeout: number | null = null;

  public connectedPeers: Set<string> = new Set();
  public relayStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' = 'connecting';
  private currentWorkspaceId: string | null = null;
  private currentRelays: string[] = DEFAULT_RELAYS;

  constructor() {
    this.initTabLeaderElection();
  }

  /**
   * Cross-tab leader election using Web Locks & BroadcastChannel
   */
  private initTabLeaderElection() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.tabBroadcastChannel = new BroadcastChannel('openslack_tab_bus');
        this.tabBroadcastChannel.onmessage = (event) => {
          const { type, data } = event.data || {};
          if (type === 'YJS_UPDATE' && this.ydoc && data) {
            const update = new Uint8Array(data);
            Y.applyUpdate(this.ydoc, update, 'tab_bus');
          } else if (type === 'PRESENCE_SYNC' && this.events.onPresenceUpdate) {
            this.events.onPresenceUpdate(data.peerId, data.user);
          } else if (type === 'TYPING_SYNC' && this.events.onTypingUpdate) {
            this.events.onTypingUpdate(data.channelId, data.pubkey, data.isTyping);
          } else if (type === 'FILE_SYNC' && this.events.onFileReceived) {
            this.events.onFileReceived(data.attachment, data.senderPeerId);
          }
        };
      }

      if (typeof navigator !== 'undefined' && navigator.locks) {
        navigator.locks.request('openslack_master_lock', async () => {
          this.isMasterTab = true;
          console.log('[P2P] Elected as Master Tab');
          return new Promise<void>(() => {});
        }).catch((e) => {
          console.warn('[P2P] Web lock election note:', e);
          this.isMasterTab = true;
        });
      } else {
        this.isMasterTab = true;
      }
    } catch (e) {
      console.warn('[P2P] Tab election fallback:', e);
      this.isMasterTab = true;
    }
  }

  public getIsMasterTab(): boolean {
    return this.isMasterTab;
  }

  /**
   * Connect to workspace Nostr Room with STUN/TURN fallback
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
    this.currentWorkspaceId = workspaceId;
    this.currentRelays = relays.length > 0 ? relays : DEFAULT_RELAYS;

    const roomId = `os_${workspaceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)}`;

    try {
      this.setStatus('connecting');

      this.room = joinRoom(
        {
          appId: 'openslack-p2p-v1',
          relayConfig: {
            urls: this.currentRelays,
          },
          rtcConfig: {
            iceServers: DEFAULT_ICE_SERVERS,
          },
        },
        roomId
      );

      this.setStatus('connected');
      console.log(`[P2P] Joined room ${roomId} with ${this.currentRelays.length} Nostr relays`);

      // 1. Setup Trystero Actions
      const vectorAction = this.room.makeAction<Uint8Array>('sync_vec');
      const deltaAction = this.room.makeAction<Uint8Array>('sync_delta');
      const presAction = this.room.makeAction<any>('pres');
      const typeAction = this.room.makeAction<any>('type');
      const fileHeaderAction = this.room.makeAction<any>('file_hdr');
      const fileChunkAction = this.room.makeAction<any>('file_chk');

      this.sendSyncVector = (data, opts) => vectorAction.send(data, opts);
      this.sendDeltaUpdate = (data, opts) => deltaAction.send(data, opts);
      this.sendPresence = (data, opts) => presAction.send(data, opts);
      this.sendTyping = (data, opts) => typeAction.send(data, opts);
      this.sendFileHeader = (hdr, opts) => fileHeaderAction.send(hdr, opts);
      this.sendFileChunk = (chk, opts) => fileChunkAction.send(chk, opts);

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

      // 6. Binary Chunked File Transfer Receivers
      fileHeaderAction.onMessage = (header) => {
        fileChunkManager.handleChunkHeader(header);
      };

      fileChunkAction.onMessage = async (chunk, ctx) => {
        const assembledAttachment = await fileChunkManager.handleChunkData(chunk, (progress) => {
          this.events.onFileProgress?.(progress);
        });

        if (assembledAttachment) {
          this.events.onFileReceived?.(assembledAttachment, ctx.peerId);
          this.tabBroadcastChannel?.postMessage({
            type: 'FILE_SYNC',
            data: { attachment: assembledAttachment, senderPeerId: ctx.peerId },
          });
        }
      };

      // 7. Peer Lifecycle Callbacks
      this.room.onPeerJoin = (peerId: string) => {
        console.log(`[P2P] Peer joined: ${peerId}`);
        this.connectedPeers.add(peerId);
        this.events.onPeerJoin?.(peerId);

        // Send local state vector to the new peer for anti-entropy sync
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
          try {
            this.room.addStream(this.activeStream, { target: peerId });
          } catch (e) {
            console.warn('[P2P] Error adding stream to new peer:', e);
          }
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

      // 9. Start periodic Heartbeat & Anti-Entropy
      this.startPresenceHeartbeat();
      this.startAntiEntropySync();

      // 10. Hook Y.Doc updates to broadcast deltas over P2P & Tab bus
      this.ydoc.on('update', this.handleYDocUpdate);
    } catch (err) {
      console.warn('[P2P] Error joining Nostr room, operating in tab/local mode with retry:', err);
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private setStatus(status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') {
    this.relayStatus = status;
    this.events.onConnectionStatusChange?.(status);
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = window.setTimeout(() => {
      if (this.currentWorkspaceId && this.ydoc && this.localIdentity && this.relayStatus !== 'connected') {
        console.log('[P2P] Attempting reconnection...');
        this.setStatus('reconnecting');
        this.joinWorkspace(
          this.currentWorkspaceId,
          this.ydoc,
          this.localIdentity,
          this.currentRelays,
          this.events
        );
      }
    }, 10000);
  }

  private handleYDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin !== 'p2p_network' && this.sendDeltaUpdate) {
      this.sendDeltaUpdate(update);
    }
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

  /**
   * Broadcast a file using 16 KB binary chunking with backpressure
   */
  public async broadcastFile(
    file: File | { name: string; type: string; size: number; buffer: ArrayBuffer },
    onProgress?: (progress: FileTransferProgress) => void
  ): Promise<Attachment> {
    return fileChunkManager.sendFileWithBackpressure(
      file,
      async (payload) => {
        if (payload.type === 'CHUNK_HEADER' && this.sendFileHeader) {
          await this.sendFileHeader(payload);
        } else if (payload.type === 'CHUNK_DATA' && this.sendFileChunk) {
          await this.sendFileChunk(payload);
        }
      },
      onProgress
    );
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
   * Anti-entropy periodic sync: exchange state vectors to reconcile missing updates
   */
  private startAntiEntropySync() {
    if (this.antiEntropyInterval) {
      clearInterval(this.antiEntropyInterval);
    }
    this.antiEntropyInterval = window.setInterval(() => {
      if (this.ydoc && this.sendSyncVector && this.connectedPeers.size > 0) {
        const localVector = Y.encodeStateVector(this.ydoc);
        this.sendSyncVector(localVector);
      }
    }, 45000);
  }

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
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
    if (this.antiEntropyInterval) {
      clearInterval(this.antiEntropyInterval);
      this.antiEntropyInterval = null;
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

export const p2pNetwork = new P2PNetworkManager();
