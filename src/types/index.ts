export interface ThemeDefinition {
  sidebarBg: string;
  sidebarText: string;
  activeItemBg: string;
  accentColor: string;
  sidebarHover?: string;
  railBg?: string;
  canvasBg?: string;
  canvasText?: string;
}

export interface UserPreferences {
  soundEnabled: boolean;
  desktopNotifications: 'all' | 'mentions_only' | 'none';
  dndUntil?: string | null; // ISO string for Do Not Disturb timer
  mutedChannelIds: string[];
  channelNotificationOverrides: Record<string, 'all' | 'mentions' | 'mute'>;
  themeName?: 'aubergine' | 'nocturne' | 'ocin' | 'banana' | 'forest' | 'monument' | 'custom';
  customTheme?: ThemeDefinition;
  displayDensity?: 'clean' | 'compact';
}

export interface UserStatus {
  state: 'active' | 'away' | 'offline';
  customText?: string;
  customEmoji?: string;
  customMessage?: string; // Legacy fallback
  expiresAt?: string; // ISO string for auto-expiry
}

export interface UserIdentity {
  pubkey: string;            // Hex/base64 public key identifier
  enc_pubkey?: string;       // Hex public key for ECDH encryption
  displayName: string;
  handle: string;
  email?: string;
  avatarUrl: string;         // Data URL or generated avatar
  status: string;            // Legacy text status
  statusEmoji?: string;
  statusDetails?: UserStatus;
  preferences?: UserPreferences;
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

export interface WorkspaceSettings {
  requireApprovalForInvites: boolean;
  defaultChannels: string[];
  allowGuestInvites?: boolean;
  theme?: ThemeDefinition;
}

export interface Workspace {
  id: string;                // e.g. "ws_general_..."
  name: string;
  slug?: string;
  iconUrl?: string;
  ownerId?: string;
  ownerPubkey: string;
  settings?: WorkspaceSettings;
  passphrase?: string;       // Optional workspace encryption key
  created: number;
  createdAt?: string;
  relays: string[];
  icon?: string;
}

export interface Channel {
  id: string;                // e.g. "chan_general", "chan_random"
  workspaceId?: string;
  name: string;              // e.g. "general"
  topic?: string;
  description?: string;
  isPrivate: boolean;
  isDirectMessage?: boolean;
  unreadCount?: number;
  mentionCount?: number;
  memberIds?: string[];
  members?: string[];        // Array of pubkeys for private/DM channels
  pinnedMessageIds?: string[];
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
  channelId?: string;
  recipientId?: string;      // For direct messages
  senderId?: string;         // Alias for authorPubkey
  authorPubkey: string;
  content: string;
  mentions?: string[];       // User pubkeys/IDs mentioned (e.g. ['u1', 'u2']) or special tokens ('@channel', '@here', '@everyone')
  timestamp: number;
  createdAt?: string;
  editedAt?: number | string;
  attachments?: Attachment[];
  signature?: string;
  replyCount?: number;
  threadReplyCount?: number;
  lastReplyTimestamp?: number;
  lastThreadReplyAt?: string;
  threadParentId?: string;   // Set if this is a reply in a thread
  reactions?: Record<string, string[]>; // emoji -> array of pubkeys
  pinned?: boolean;
  isPinned?: boolean;
}

export interface AppNotification {
  id: string;
  workspaceId: string;
  recipientId: string;
  actorId: string;           // User who triggered the notification
  type: 'mention' | 'thread_reply' | 'reaction' | 'join_request';
  channelId?: string;
  messageId?: string;
  contentSnippet?: string;
  isRead: boolean;
  createdAt: string;
}

export interface JoinRequest {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
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

export type RightPanelView =
  | 'none'
  | 'thread'
  | 'channel_details'
  | 'search'
  | 'user_profile'
  | 'pinned'
  | 'activity_feed'
  | 'workspace_settings'
  | 'pending_approvals';

export interface SearchResultItem {
  message: Message;
  channelName: string;
  authorName: string;
  authorAvatar: string;
  matchedSnippets: string[];
}
