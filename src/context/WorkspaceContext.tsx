import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import {
  generateWorkspacePassphrase,
  getOrCreateIdentity,
  saveIdentity,
  sha256,
  signMessage,
} from '../lib/crypto';
import { FileTransferProgress } from '../lib/fileTransfer';
import { DEFAULT_RELAYS, p2pNetwork } from '../lib/p2p';
import { playSound } from '../lib/sound';
import {
  autoPruneStorageIfExceeded,
  getStorageQuotaEstimate,
  requestStoragePersistence,
  StorageQuotaInfo,
  storeLocalFile,
} from '../lib/storage';
import {
  Attachment,
  Channel,
  HuddleParticipant,
  HuddleState,
  Message,
  RightPanelView,
  StoredPrivateKeyPair,
  UserIdentity,
  Workspace,
} from '../types';

interface WorkspaceContextValue {
  // Identity
  identity: UserIdentity | null;
  keys: StoredPrivateKeyPair | null;
  updateProfile: (updates: Partial<UserIdentity>) => void;

  // Workspaces
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  createWorkspace: (name: string, passphrase?: string) => Promise<Workspace>;
  joinWorkspace: (workspace: Workspace) => void;
  switchWorkspace: (workspaceId: string) => void;
  leaveWorkspace: (workspaceId: string) => void;

  // Channels
  channels: Channel[];
  activeChannel: Channel | null;
  selectChannel: (channelId: string) => void;
  createChannel: (name: string, topic?: string, isPrivate?: boolean) => Promise<Channel>;
  openDirectMessage: (peerPubkey: string) => Promise<Channel>;

  // Messages & Reactions
  messages: Message[];
  activeThreadParent: Message | null;
  threadReplies: Message[];
  sendMessage: (content: string, attachments?: Attachment[], threadParentId?: string) => Promise<Message>;
  toggleReaction: (messageId: string, emoji: string) => void;
  togglePinMessage: (messageId: string) => void;
  deleteMessage: (messageId: string) => void;

  // Typing & Presence
  typingUsers: { channelId: string; pubkey: string; user: UserIdentity }[];
  setTyping: (isTyping: boolean) => void;
  peerUsers: Map<string, UserIdentity>;
  connectedPeerCount: number;
  relayStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

  // Right Drawer & Panels
  rightPanel: RightPanelView;
  setRightPanel: (panel: RightPanelView) => void;
  openThread: (message: Message) => void;
  closeThread: () => void;
  inspectUser: UserIdentity | null;
  openUserProfile: (user: UserIdentity) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  // Huddles (Voice / Video Calls)
  huddleState: HuddleState;
  startOrJoinHuddle: (channelId: string) => Promise<void>;
  leaveHuddle: () => void;
  toggleHuddleMute: () => void;
  toggleHuddleVideo: () => void;
  toggleHuddleScreenShare: () => void;
  mediaPermissionError: string | null;
  clearMediaPermissionError: () => void;

  // File Upload & Chunking Helper
  uploadAttachment: (file: File) => Promise<Attachment>;
  fileTransferProgress: FileTransferProgress | null;
  storageQuota: StorageQuotaInfo | null;

  // Simulation / Peer testing helper
  simulatePeerMessage: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const DEFAULT_CHANNELS: Omit<Channel, 'creatorPubkey' | 'created'>[] = [
  {
    id: 'chan_general',
    name: 'general',
    topic: 'Company-wide announcements, team updates, and work matters',
    description: 'This is the one channel that will always include everyone.',
    isPrivate: false,
  },
  {
    id: 'chan_random',
    name: 'random',
    topic: 'Non-work banter, coffee breaks, memes, and watercooler chats',
    description: 'A place for fun and relaxation!',
    isPrivate: false,
  },
  {
    id: 'chan_p2p_development',
    name: 'p2p-engineering',
    topic: 'WebRTC mesh optimization, Yjs CRDT anti-entropy sync, Nostr signaling',
    description: 'Engineering discussion for decentralized P2P systems',
    isPrivate: false,
  },
];

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [keys, setKeys] = useState<StoredPrivateKeyPair | null>(null);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');

  // Yjs CRDT Document & Persistence
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<IndexeddbPersistence | null>(null);

  // Reactive workspace items
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('chan_general');
  const [rawMessages, setRawMessages] = useState<Message[]>([]);
  const [rawReactions, setRawReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [peerUsers, setPeerUsers] = useState<Map<string, UserIdentity>>(new Map());

  // Right Panel & Sub-views
  const [rightPanel, setRightPanel] = useState<RightPanelView>('none');
  const [activeThreadParentId, setActiveThreadParentId] = useState<string | null>(null);
  const [inspectUser, setInspectUser] = useState<UserIdentity | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Typing state
  const [typingMap, setTypingMap] = useState<Map<string, { channelId: string; pubkey: string; timeout: number }>>(
    new Map()
  );

  // Network stats & Connection indicators
  const [connectedPeerCount, setConnectedPeerCount] = useState(0);
  const [relayStatus, setRelayStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connected');

  // File Transfer Progress & Quota
  const [fileTransferProgress, setFileTransferProgress] = useState<FileTransferProgress | null>(null);
  const [storageQuota, setStorageQuota] = useState<StorageQuotaInfo | null>(null);

  // Media Permissions Error Banner
  const [mediaPermissionError, setMediaPermissionError] = useState<string | null>(null);
  const clearMediaPermissionError = () => setMediaPermissionError(null);

  // Huddle / Call State
  const [huddleState, setHuddleState] = useState<HuddleState>({
    channelId: null,
    channelName: null,
    isActive: false,
    isMuted: false,
    isVideoOn: false,
    isScreenSharing: false,
    participants: new Map(),
  });
  const localMediaStreamRef = useRef<MediaStream | null>(null);

  // 1. Initialize User Identity & Persistence on Mount
  useEffect(() => {
    requestStoragePersistence();
    getStorageQuotaEstimate().then(setStorageQuota);
    autoPruneStorageIfExceeded(90);

    getOrCreateIdentity().then(({ identity: initIdentity, keys: initKeys }) => {
      setIdentity(initIdentity);
      setKeys(initKeys);

      // Check URL for invite link hash (#invite=...)
      handleInviteLinkFromUrl(initIdentity);
    });
  }, []);

  // Handle invite links in hash (e.g. #invite=...)
  const handleInviteLinkFromUrl = (user: UserIdentity) => {
    try {
      const hash = window.location.hash;
      if (hash.startsWith('#invite=')) {
        const payloadStr = decodeURIComponent(hash.replace('#invite=', ''));
        const inviteData = JSON.parse(atob(payloadStr)) as Workspace;
        if (inviteData.id && inviteData.name) {
          saveAndJoinWorkspace(inviteData, user);
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      }
    } catch (e) {
      console.warn('Invalid invite payload:', e);
    }

    // Default workspace initialization if no invite
    const storedWorkspaces = localStorage.getItem('quietslack_workspaces');
    if (storedWorkspaces) {
      try {
        const parsed = JSON.parse(storedWorkspaces) as Workspace[];
        if (parsed.length > 0) {
          setWorkspaces(parsed);
          const lastActive = localStorage.getItem('quietslack_active_ws') || parsed[0].id;
          setActiveWorkspaceId(lastActive);
          return;
        }
      } catch {}
    }

    // Create initial default workspace
    const defaultWs: Workspace = {
      id: 'ws_decentralized_hq',
      name: 'Decentralized HQ',
      passphrase: generateWorkspacePassphrase(),
      created: Date.now(),
      ownerPubkey: user.pubkey,
      relays: DEFAULT_RELAYS,
    };
    saveAndJoinWorkspace(defaultWs, user);
  };

  const saveAndJoinWorkspace = (ws: Workspace, user: UserIdentity) => {
    setWorkspaces((prev) => {
      const exists = prev.some((w) => w.id === ws.id);
      const next = exists ? prev.map((w) => (w.id === ws.id ? ws : w)) : [...prev, ws];
      localStorage.setItem('quietslack_workspaces', JSON.stringify(next));
      return next;
    });
    setActiveWorkspaceId(ws.id);
    localStorage.setItem('quietslack_active_ws', ws.id);
  };

  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;
  }, [workspaces, activeWorkspaceId]);

  // 2. Initialize Y.Doc & IndexedDB persistence when Active Workspace changes
  useEffect(() => {
    if (!activeWorkspace || !identity) return;

    if (providerRef.current) {
      providerRef.current.destroy();
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
    }
    p2pNetwork.leaveWorkspace();

    const docName = `quietslack_doc_${activeWorkspace.id}`;
    const doc = new Y.Doc();
    ydocRef.current = doc;

    const persistence = new IndexeddbPersistence(docName, doc);
    providerRef.current = persistence;

    const yChannels = doc.getMap<Channel>('channels');
    const yMessages = doc.getArray<Message>('messages');
    const yReactions = doc.getMap<Record<string, string[]>>('reactions');
    const yUsers = doc.getMap<UserIdentity>('users');

    const updateStateFromYDoc = () => {
      // Channels
      const channelList: Channel[] = Array.from(yChannels.values());
      setChannels(channelList);

      // Messages
      const msgList = yMessages.toArray();
      setRawMessages([...msgList]);

      // Reactions
      const reactRecord: Record<string, Record<string, string[]>> = {};
      yReactions.forEach((val, key) => {
        reactRecord[key] = val;
      });
      setRawReactions(reactRecord);

      // Users
      const userMap = new Map<string, UserIdentity>();
      yUsers.forEach((u, k) => {
        userMap.set(k, u);
      });
      if (identity) {
        userMap.set(identity.pubkey, identity);
      }
      setPeerUsers(userMap);
    };

    persistence.on('synced', () => {
      console.log(`[Storage] Yjs doc synced for workspace: ${activeWorkspace.name}`);

      // Seed default channels if empty
      if (yChannels.size === 0) {
        doc.transact(() => {
          DEFAULT_CHANNELS.forEach((ch) => {
            yChannels.set(ch.id, {
              ...ch,
              creatorPubkey: identity.pubkey,
              created: Date.now(),
            });
          });

          // Welcome message
          yMessages.push([
            {
              id: 'msg_welcome_seed',
              channelId: 'chan_general',
              authorPubkey: identity.pubkey,
              content: `👋 **Welcome to QuietSlack**!\n\nThis workspace is **100% serverless, private, and peer-to-peer**.\n- 🔒 State is persisted locally via **IndexedDB** & synchronized with **Yjs CRDTs**.\n- 🌐 Peer discovery is performed over public **Nostr signaling relays** with WebRTC data channels.\n- 🎙️ Launch an instant **Audio/Video Huddle** anytime via the call button in the header!\n- 🔗 Invite teammates by clicking **Invite Teammates** in the sidebar.`,
              timestamp: Date.now(),
              reactions: { '🎉': [identity.pubkey], '🚀': [identity.pubkey] },
            },
          ]);
        });
      }

      // Add self to directory
      doc.transact(() => {
        yUsers.set(identity.pubkey, identity);
      });

      updateStateFromYDoc();
    });

    // Observer on YDoc mutations
    const observer = (_event: any, transaction: any) => {
      updateStateFromYDoc();
      if (transaction?.origin === 'p2p_network') {
        playSound.received();
      }
    };

    yChannels.observe(observer);
    yMessages.observe(observer);
    yReactions.observe(observer);
    yUsers.observe(observer);

    // 3. Connect to P2P Network
    p2pNetwork.joinWorkspace(
      activeWorkspace.id,
      doc,
      identity,
      activeWorkspace.relays,
      {
        onPeerJoin: (_peerId) => {
          setConnectedPeerCount(p2pNetwork.connectedPeers.size);
        },
        onPeerLeave: (peerId) => {
          setConnectedPeerCount(p2pNetwork.connectedPeers.size);
          setHuddleState((prev) => {
            const nextMap = new Map(prev.participants);
            nextMap.delete(peerId);
            return { ...prev, participants: nextMap };
          });
        },
        onPresenceUpdate: (peerId, remoteUser) => {
          setPeerUsers((prev) => {
            const next = new Map(prev);
            next.set(remoteUser.pubkey, { ...remoteUser, isOnline: true });
            return next;
          });
          doc.transact(() => {
            yUsers.set(remoteUser.pubkey, remoteUser);
          });
        },
        onTypingUpdate: (channelId, userPubkey, isTyping) => {
          setTypingMap((prev) => {
            const next = new Map(prev);
            const key = `${channelId}_${userPubkey}`;
            if (isTyping) {
              const timeout = window.setTimeout(() => {
                setTypingMap((t) => {
                  const updated = new Map(t);
                  updated.delete(key);
                  return updated;
                });
              }, 3500);
              next.set(key, { channelId, pubkey: userPubkey, timeout });
            } else {
              const current = next.get(key);
              if (current) clearTimeout(current.timeout);
              next.delete(key);
            }
            return next;
          });
        },
        onPeerStream: (stream, peerId) => {
          setHuddleState((prev) => {
            const nextMap = new Map(prev.participants);
            const existing = nextMap.get(peerId);
            if (existing) {
              nextMap.set(peerId, { ...existing, stream, isVideoOn: stream.getVideoTracks().length > 0 });
            } else {
              const user = peerUsers.get(peerId);
              nextMap.set(peerId, {
                pubkey: peerId,
                displayName: user?.displayName || `Peer (${peerId.slice(0, 5)})`,
                avatarUrl: user?.avatarUrl || '',
                isMuted: false,
                isVideoOn: stream.getVideoTracks().length > 0,
                isScreenSharing: false,
                stream,
              });
            }
            return { ...prev, participants: nextMap };
          });
        },
        onFileProgress: (progress) => {
          setFileTransferProgress(progress);
          if (progress.percentage >= 100) {
            setTimeout(() => setFileTransferProgress(null), 2500);
          }
        },
        onConnectionStatusChange: (status) => {
          setRelayStatus(status);
        },
      }
    );

    return () => {
      yChannels.unobserve(observer);
      yMessages.unobserve(observer);
      yReactions.unobserve(observer);
      yUsers.unobserve(observer);
      p2pNetwork.leaveWorkspace();
      persistence.destroy();
      doc.destroy();
    };
  }, [activeWorkspace?.id, identity?.pubkey]);

  // Compute active channel
  const activeChannel = useMemo(() => {
    return channels.find((c) => c.id === activeChannelId) || channels[0] || null;
  }, [channels, activeChannelId]);

  // Merge messages with reactions and thread reply counts
  const messages = useMemo(() => {
    const threadCounts = new Map<string, { count: number; lastTime: number }>();
    rawMessages.forEach((m) => {
      if (m.threadParentId) {
        const existing = threadCounts.get(m.threadParentId) || { count: 0, lastTime: 0 };
        threadCounts.set(m.threadParentId, {
          count: existing.count + 1,
          lastTime: Math.max(existing.lastTime, m.timestamp),
        });
      }
    });

    return rawMessages
      .filter((m) => !m.threadParentId && m.channelId === activeChannelId)
      .map((m) => {
        const threadInfo = threadCounts.get(m.id);
        return {
          ...m,
          replyCount: threadInfo ? threadInfo.count : 0,
          lastReplyTimestamp: threadInfo ? threadInfo.lastTime : undefined,
          reactions: rawReactions[m.id] || m.reactions || {},
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [rawMessages, rawReactions, activeChannelId]);

  // Active Thread Parent message
  const activeThreadParent = useMemo(() => {
    if (!activeThreadParentId) return null;
    const parent = rawMessages.find((m) => m.id === activeThreadParentId);
    if (!parent) return null;
    return {
      ...parent,
      reactions: rawReactions[parent.id] || parent.reactions || {},
    };
  }, [rawMessages, rawReactions, activeThreadParentId]);

  // Thread replies
  const threadReplies = useMemo(() => {
    if (!activeThreadParentId) return [];
    return rawMessages
      .filter((m) => m.threadParentId === activeThreadParentId)
      .map((m) => ({
        ...m,
        reactions: rawReactions[m.id] || m.reactions || {},
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [rawMessages, rawReactions, activeThreadParentId]);

  // Typing users array
  const typingUsers = useMemo(() => {
    const list: { channelId: string; pubkey: string; user: UserIdentity }[] = [];
    typingMap.forEach(({ channelId, pubkey }) => {
      if (channelId === activeChannelId && pubkey !== identity?.pubkey) {
        const u = peerUsers.get(pubkey) || {
          pubkey,
          displayName: 'Teammate',
          handle: '@user',
          avatarUrl: '',
          status: '',
          lastSeen: Date.now(),
          color: '#1164A3',
        };
        list.push({ channelId, pubkey, user: u });
      }
    });
    return list;
  }, [typingMap, activeChannelId, identity?.pubkey, peerUsers]);

  // Profile Updater
  const updateProfile = (updates: Partial<UserIdentity>) => {
    if (!identity) return;
    const updated = { ...identity, ...updates };
    setIdentity(updated);
    saveIdentity(updated);
    p2pNetwork.updateLocalIdentity(updated);

    if (ydocRef.current) {
      const yUsers = ydocRef.current.getMap<UserIdentity>('users');
      ydocRef.current.transact(() => {
        yUsers.set(updated.pubkey, updated);
      });
    }
  };

  // Workspace Actions
  const createWorkspace = async (name: string, passphrase?: string): Promise<Workspace> => {
    if (!identity) throw new Error('Identity not ready');
    const wsPass = passphrase || generateWorkspacePassphrase();
    const id = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newWs: Workspace = {
      id,
      name,
      passphrase: wsPass,
      created: Date.now(),
      ownerPubkey: identity.pubkey,
      relays: DEFAULT_RELAYS,
    };

    saveAndJoinWorkspace(newWs, identity);
    return newWs;
  };

  const joinWorkspace = (ws: Workspace) => {
    if (!identity) return;
    saveAndJoinWorkspace(ws, identity);
  };

  const switchWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    localStorage.setItem('quietslack_active_ws', workspaceId);
  };

  const leaveWorkspace = (workspaceId: string) => {
    setWorkspaces((prev) => {
      const filtered = prev.filter((w) => w.id !== workspaceId);
      localStorage.setItem('quietslack_workspaces', JSON.stringify(filtered));
      if (activeWorkspaceId === workspaceId && filtered.length > 0) {
        setActiveWorkspaceId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Channel Actions
  const createChannel = async (name: string, topic?: string, isPrivate = false): Promise<Channel> => {
    if (!identity || !ydocRef.current) throw new Error('Not ready');
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/^-+|-+$/g, '');
    const id = `chan_${Date.now()}_${cleanName}`;
    const newChan: Channel = {
      id,
      name: cleanName,
      topic: topic || '',
      isPrivate,
      created: Date.now(),
      creatorPubkey: identity.pubkey,
    };

    const yChannels = ydocRef.current.getMap<Channel>('channels');
    ydocRef.current.transact(() => {
      yChannels.set(id, newChan);
    });

    setActiveChannelId(id);
    return newChan;
  };

  const openDirectMessage = async (peerPubkey: string): Promise<Channel> => {
    if (!identity || !ydocRef.current) throw new Error('Not ready');
    const existing = channels.find(
      (c) => c.isDirectMessage && c.members?.includes(peerPubkey) && c.members?.includes(identity.pubkey)
    );
    if (existing) {
      setActiveChannelId(existing.id);
      return existing;
    }

    const peer = peerUsers.get(peerPubkey);
    const id = `dm_${[identity.pubkey, peerPubkey].sort().join('_').slice(0, 24)}`;
    const newDm: Channel = {
      id,
      name: peer?.displayName || `DM with ${peerPubkey.slice(0, 6)}`,
      topic: `Direct Message with ${peer?.displayName || peerPubkey.slice(0, 6)}`,
      isPrivate: true,
      isDirectMessage: true,
      members: [identity.pubkey, peerPubkey],
      created: Date.now(),
      creatorPubkey: identity.pubkey,
    };

    const yChannels = ydocRef.current.getMap<Channel>('channels');
    ydocRef.current.transact(() => {
      yChannels.set(id, newDm);
    });

    setActiveChannelId(id);
    return newDm;
  };

  const selectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    if (rightPanel === 'thread') {
      setRightPanel('none');
    }
  };

  // Send Message
  const sendMessage = async (
    content: string,
    attachments?: Attachment[],
    threadParentId?: string
  ): Promise<Message> => {
    if (!identity || !ydocRef.current || !keys) throw new Error('Not ready');
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const targetChannel = threadParentId
      ? rawMessages.find((m) => m.id === threadParentId)?.channelId || activeChannelId
      : activeChannelId;

    // Cryptographic signature
    const signaturePayload = `${msgId}:${targetChannel}:${identity.pubkey}:${content}:${Date.now()}`;
    const signature = await signMessage(signaturePayload, keys.signPrivateKey);

    const message: Message = {
      id: msgId,
      channelId: targetChannel,
      authorPubkey: identity.pubkey,
      content,
      timestamp: Date.now(),
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      signature,
      threadParentId,
      reactions: {},
    };

    const yMessages = ydocRef.current.getArray<Message>('messages');
    ydocRef.current.transact(() => {
      yMessages.push([message]);
    });

    playSound.sent();
    p2pNetwork.broadcastTyping(targetChannel, false);

    return message;
  };

  // Toggle Emoji Reaction
  const toggleReaction = (messageId: string, emoji: string) => {
    if (!identity || !ydocRef.current) return;
    const yReactions = ydocRef.current.getMap<Record<string, string[]>>('reactions');
    const currentMsgReactions = yReactions.get(messageId) || {};
    const pubkeys = currentMsgReactions[emoji] || [];

    let updatedPubkeys: string[];
    if (pubkeys.includes(identity.pubkey)) {
      updatedPubkeys = pubkeys.filter((p) => p !== identity.pubkey);
    } else {
      updatedPubkeys = [...pubkeys, identity.pubkey];
    }

    const nextRecord = { ...currentMsgReactions };
    if (updatedPubkeys.length > 0) {
      nextRecord[emoji] = updatedPubkeys;
    } else {
      delete nextRecord[emoji];
    }

    ydocRef.current.transact(() => {
      yReactions.set(messageId, nextRecord);
    });

    playSound.pop();
  };

  // Toggle Pin
  const togglePinMessage = (messageId: string) => {
    if (!ydocRef.current) return;
    const yMessages = ydocRef.current.getArray<Message>('messages');
    const msgs = yMessages.toArray();
    const idx = msgs.findIndex((m) => m.id === messageId);
    if (idx !== -1) {
      const updated = { ...msgs[idx], pinned: !msgs[idx].pinned };
      ydocRef.current.transact(() => {
        yMessages.delete(idx, 1);
        yMessages.insert(idx, [updated]);
      });
    }
  };

  // Delete message
  const deleteMessage = (messageId: string) => {
    if (!ydocRef.current) return;
    const yMessages = ydocRef.current.getArray<Message>('messages');
    const msgs = yMessages.toArray();
    const idx = msgs.findIndex((m) => m.id === messageId);
    if (idx !== -1) {
      ydocRef.current.transact(() => {
        yMessages.delete(idx, 1);
      });
    }
  };

  // Typing emitter
  const setTyping = (isTyping: boolean) => {
    if (!activeChannel) return;
    p2pNetwork.broadcastTyping(activeChannel.id, isTyping);
  };

  // Right Drawer Navigation
  const openThread = (message: Message) => {
    setActiveThreadParentId(message.id);
    setRightPanel('thread');
  };

  const closeThread = () => {
    setActiveThreadParentId(null);
    setRightPanel('none');
  };

  const openUserProfile = (user: UserIdentity) => {
    setInspectUser(user);
    setRightPanel('user_profile');
  };

  // Huddles (Voice / Video)
  const startOrJoinHuddle = async (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    setMediaPermissionError(null);

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Media devices not supported in this environment');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localMediaStreamRef.current = stream;
      p2pNetwork.addMediaStream(stream);

      const participants = new Map<string, HuddleParticipant>();
      if (identity) {
        participants.set(identity.pubkey, {
          pubkey: identity.pubkey,
          displayName: identity.displayName,
          avatarUrl: identity.avatarUrl,
          isMuted: false,
          isVideoOn: false,
          isScreenSharing: false,
          stream,
        });
      }

      setHuddleState({
        channelId,
        channelName: channel?.name || 'general',
        isActive: true,
        isMuted: false,
        isVideoOn: false,
        isScreenSharing: false,
        participants,
      });

      playSound.huddleJoin();
    } catch (err: any) {
      console.warn('Microphone permission not available, starting voice-ready interface:', err);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      if (isDenied) {
        setMediaPermissionError('Microphone permission was denied. You joined the Huddle in listen-only mode.');
      }

      const participants = new Map<string, HuddleParticipant>();
      if (identity) {
        participants.set(identity.pubkey, {
          pubkey: identity.pubkey,
          displayName: identity.displayName,
          avatarUrl: identity.avatarUrl,
          isMuted: true,
          isVideoOn: false,
          isScreenSharing: false,
        });
      }
      setHuddleState({
        channelId,
        channelName: channel?.name || 'general',
        isActive: true,
        isMuted: true,
        isVideoOn: false,
        isScreenSharing: false,
        participants,
      });
      playSound.huddleJoin();
    }
  };

  const leaveHuddle = () => {
    if (localMediaStreamRef.current) {
      localMediaStreamRef.current.getTracks().forEach((t) => t.stop());
      localMediaStreamRef.current = null;
    }
    p2pNetwork.removeMediaStream();
    setHuddleState({
      channelId: null,
      channelName: null,
      isActive: false,
      isMuted: false,
      isVideoOn: false,
      isScreenSharing: false,
      participants: new Map(),
    });
    playSound.huddleLeave();
  };

  const toggleHuddleMute = () => {
    if (localMediaStreamRef.current) {
      const audioTracks = localMediaStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = !t.enabled));
      setHuddleState((prev) => ({
        ...prev,
        isMuted: !prev.isMuted,
      }));
    } else {
      setHuddleState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
    }
  };

  const toggleHuddleVideo = async () => {
    setMediaPermissionError(null);
    if (!huddleState.isVideoOn) {
      try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera not supported');
        }
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        if (localMediaStreamRef.current && videoTrack) {
          localMediaStreamRef.current.addTrack(videoTrack);
        }
        setHuddleState((prev) => ({ ...prev, isVideoOn: true }));
      } catch (err: any) {
        console.warn('Camera error:', err);
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setMediaPermissionError('Camera permission was denied.');
        }
      }
    } else {
      if (localMediaStreamRef.current) {
        localMediaStreamRef.current.getVideoTracks().forEach((t) => {
          t.stop();
          localMediaStreamRef.current?.removeTrack(t);
        });
      }
      setHuddleState((prev) => ({ ...prev, isVideoOn: false }));
    }
  };

  const toggleHuddleScreenShare = async () => {
    setMediaPermissionError(null);
    if (!huddleState.isScreenSharing) {
      try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('Screen sharing not supported');
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrack.onended = () => {
          setHuddleState((prev) => ({ ...prev, isScreenSharing: false }));
        };
        if (localMediaStreamRef.current) {
          localMediaStreamRef.current.addTrack(screenTrack);
        }
        setHuddleState((prev) => ({ ...prev, isScreenSharing: true }));
      } catch (err: any) {
        console.warn('Screen share cancelled or failed:', err);
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setMediaPermissionError('Screen share permission was denied or cancelled.');
        }
      }
    } else {
      setHuddleState((prev) => ({ ...prev, isScreenSharing: false }));
    }
  };

  // Upload file helper: store in local IndexedDB and broadcast chunked stream
  const uploadAttachment = async (file: File): Promise<Attachment> => {
    const attachment = await storeLocalFile(file);
    // Transmit over P2P network with 16KB chunking
    p2pNetwork.broadcastFile(file, (progress) => {
      setFileTransferProgress(progress);
      if (progress.percentage >= 100) {
        setTimeout(() => setFileTransferProgress(null), 2500);
      }
    }).catch((err) => {
      console.warn('[Storage] Background chunk broadcast note:', err);
    });

    getStorageQuotaEstimate().then(setStorageQuota);
    return attachment;
  };

  // Simulation Helper for testing multi-peer interactions in single browser / demo
  const simulatePeerMessage = async () => {
    if (!ydocRef.current || !activeChannel) return;
    const dummyNames = [
      { name: 'Elena Rostova', handle: '@elena.r', color: '#2BAC76', avatar: 'ER' },
      { name: 'Marcus Sterling', handle: '@marcus.s', color: '#E01E5A', avatar: 'MS' },
      { name: 'Priya Sharma', handle: '@priya.code', color: '#ECB22E', avatar: 'PS' },
    ];
    const dummy = dummyNames[Math.floor(Math.random() * dummyNames.length)];
    const dummyPubkey = (await sha256(dummy.name)).slice(0, 24);

    const dummyUser: UserIdentity = {
      pubkey: dummyPubkey,
      displayName: dummy.name,
      handle: dummy.handle,
      avatarUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="${dummy.color}"/><text x="50" y="58" font-family="sans-serif" font-size="36" font-weight="bold" fill="%23fff" text-anchor="middle" dominant-baseline="middle">${dummy.avatar}</text></svg>`,
      status: 'Working on P2P protocols ⚡',
      lastSeen: Date.now(),
      color: dummy.color,
      isOnline: true,
    };

    const dummyTexts = [
      `Hey everyone! Testing the **Yjs CRDT** real-time sync in #${activeChannel.name}. It works flawlessly! 🚀`,
      `Did anyone check the WebRTC ICE candidates? The mesh connectivity is super responsive.`,
      `Awesome! End-to-end encryption with zero servers feels so liberating 🛡️`,
      `Here is a quick code snippet:\n\`\`\`ts\nconst p2p = new P2PNetwork();\nawait p2p.joinWorkspace("qs-alpha");\n\`\`\``,
    ];
    const dummyText = dummyTexts[Math.floor(Math.random() * dummyTexts.length)];

    const yUsers = ydocRef.current.getMap<UserIdentity>('users');
    const yMessages = ydocRef.current.getArray<Message>('messages');

    ydocRef.current.transact(() => {
      yUsers.set(dummyPubkey, dummyUser);
      yMessages.push([
        {
          id: `msg_sim_${Date.now()}`,
          channelId: activeChannel.id,
          authorPubkey: dummyPubkey,
          content: dummyText,
          timestamp: Date.now(),
          reactions: { '👍': [dummyPubkey] },
        },
      ]);
    });

    playSound.received();
  };

  const value: WorkspaceContextValue = {
    identity,
    keys,
    updateProfile,
    workspaces,
    activeWorkspace,
    createWorkspace,
    joinWorkspace,
    switchWorkspace,
    leaveWorkspace,
    channels,
    activeChannel,
    selectChannel,
    createChannel,
    openDirectMessage,
    messages,
    activeThreadParent,
    threadReplies,
    sendMessage,
    toggleReaction,
    togglePinMessage,
    deleteMessage,
    typingUsers,
    setTyping,
    peerUsers,
    connectedPeerCount,
    relayStatus,
    rightPanel,
    setRightPanel,
    openThread,
    closeThread,
    inspectUser,
    openUserProfile,
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
    huddleState,
    startOrJoinHuddle,
    leaveHuddle,
    toggleHuddleMute,
    toggleHuddleVideo,
    toggleHuddleScreenShare,
    mediaPermissionError,
    clearMediaPermissionError,
    uploadAttachment,
    fileTransferProgress,
    storageQuota,
    simulatePeerMessage,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
