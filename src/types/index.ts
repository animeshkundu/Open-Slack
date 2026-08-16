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

export interface DeviceSubIdentity {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'browser';
  pubkey: string;
  linkedAt: number;
  lastActive: number;
}

export interface UserIdentity {
  pubkey: string;            // Hex/base64 public key identifier
  masterPubkey?: string;     // Primary account master key if device is linked
  deviceId?: string;         // Device sub-identity identifier
  deviceName?: string;       // Human-readable device label
  enc_pubkey?: string;       // Hex public key for ECDH encryption
  displayName: string;
  handle: string;
  hasCustomName?: boolean;   // True once the user has explicitly entered their name
  email?: string;
  avatarUrl: string;         // Data URL or generated avatar
  status: string;            // Legacy text status
  statusEmoji?: string;
  statusDetails?: UserStatus;
  preferences?: UserPreferences;
  lastSeen: number;          // Unix timestamp ms
  color: string;             // Distinct user color for badges/avatars
  isOnline?: boolean;
  linkedDevices?: DeviceSubIdentity[];
}

export interface DeviceSyncPayload {
  version: number;
  masterPubkey: string;
  deviceId: string;
  deviceName: string;
  identity: UserIdentity;
  keys: StoredPrivateKeyPair;
  workspace?: Workspace;
  workspaces?: Workspace[];
  timestamp: number;
}

export interface CallOfferPayload {
  callId: string;
  channelId: string;
  channelName: string;
  callerPubkey: string;
  callerName: string;
  targetPubkey?: string;
  timestamp: number;
}

export interface CallResolvedPayload {
  callId: string;
  channelId: string;
  answeredByDeviceId: string;
  answeredDeviceName: string;
  status: 'ANSWERED_ELSEWHERE' | 'COMPLETED' | 'DECLINED';
  timestamp: number;
}

export interface CallTransferPayload {
  callId: string;
  channelId: string;
  fromDeviceId: string;
  toDeviceId: string;
  timestamp: number;
}

export interface ActiveCallState {
  isRinging: boolean;
  incomingCall: CallOfferPayload | null;
  answeredElsewhere: boolean;
  answeredDeviceName?: string;
  activeCallId?: string;
  channelId?: string;
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
  color?: string;            // Custom brand/accent color for workspace
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
  actorName?: string;        // Persisted author name when notification occurred
  actorAvatar?: string;      // Persisted author avatar URL when notification occurred
  type: 'mention' | 'thread_reply' | 'reaction' | 'join_request';
  channelId?: string;
  messageId?: string;
  contentSnippet?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ToastNotification {
  id: string;
  title?: string;
  authorName: string;
  authorAvatar?: string;
  authorPubkey?: string;
  channelId?: string;
  channelName?: string;
  isPrivate?: boolean;
  isDirectMessage?: boolean;
  messageId?: string;
  threadParentId?: string;
  content: string;
  type: 'message' | 'mention' | 'thread_reply' | 'reaction' | 'huddle' | 'system';
  createdAt: number;
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
