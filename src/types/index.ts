export interface UserIdentity {
  pubkey: string;            // Hex/base64 public key identifier
  enc_pubkey?: string;       // Hex public key for ECDH encryption
  displayName: string;
  handle: string;
  avatarUrl: string;         // Data URL or generated avatar
  status: string;
  statusEmoji?: string;
  lastSeen: number;          // Unix timestamp ms
  color: string;             // Distinct user color for badges/avatars
  isOnline?: boolean;
}

export interface StoredPrivateKeyPair {
  signPublicKey: string;
  signPrivateKey: string; // JWK or base64
  encPublicKey: string;
  encPrivateKey: string;  // JWK or base64
}

export interface Workspace {
  id: string;                // e.g. "ws_general_..."
  name: string;
  passphrase?: string;       // Optional workspace encryption key
  created: number;
  ownerPubkey: string;
  relays: string[];
  icon?: string;
}

export interface Channel {
  id: string;                // e.g. "chan_general", "chan_random"
  name: string;              // e.g. "general"
  topic?: string;
  description?: string;
  isPrivate: boolean;
  isDirectMessage?: boolean;
  unreadCount?: number;
  members?: string[];        // Array of pubkeys for private/DM channels
  created: number;
  creatorPubkey: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl?: string;          // Inlined or local blob url
  sha256: string;
  opfsPath?: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorPubkey: string;
  content: string;
  timestamp: number;
  editedAt?: number;
  attachments?: Attachment[];
  signature?: string;
  replyCount?: number;
  lastReplyTimestamp?: number;
  threadParentId?: string;   // Set if this is a reply in a thread
  reactions?: Record<string, string[]>; // emoji -> array of pubkeys
  pinned?: boolean;
}

export interface HuddleParticipant {
  pubkey: string;
  displayName: string;
  avatarUrl: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isSpeaking?: boolean;
  stream?: MediaStream;
}

export interface HuddleState {
  channelId: string | null;
  channelName: string | null;
  isActive: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  participants: Map<string, HuddleParticipant>;
}

export type RightPanelView = 'none' | 'thread' | 'channel_details' | 'search' | 'user_profile' | 'pinned';

export interface SearchResultItem {
  message: Message;
  channelName: string;
  authorName: string;
  authorAvatar: string;
  matchedSnippets: string[];
}
