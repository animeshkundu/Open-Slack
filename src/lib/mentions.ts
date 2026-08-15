import { Message, UserIdentity } from '../types';

export interface MentionSuggestion {
  id: string;
  type: 'user' | 'special';
  name: string;
  handle: string;
  description?: string;
  avatarUrl?: string;
  color?: string;
}

export const SPECIAL_MENTIONS: MentionSuggestion[] = [
  {
    id: '@channel',
    type: 'special',
    name: 'channel',
    handle: '@channel',
    description: 'Notify everyone in this channel',
  },
  {
    id: '@here',
    type: 'special',
    name: 'here',
    handle: '@here',
    description: 'Notify active members in this channel',
  },
  {
    id: '@everyone',
    type: 'special',
    name: 'everyone',
    handle: '@everyone',
    description: 'Notify everyone in the workspace',
  },
];

/**
 * Extracts mentioned user pubkeys and special tokens from message text.
 */
export function extractMentions(
  content: string,
  userList: UserIdentity[]
): string[] {
  const mentions = new Set<string>();
  if (!content) return [];

  // Check special mentions
  if (/@channel\b/i.test(content)) mentions.add('@channel');
  if (/@here\b/i.test(content)) mentions.add('@here');
  if (/@everyone\b/i.test(content)) mentions.add('@everyone');

  // Check user handles and names
  userList.forEach((user) => {
    const handleClean = user.handle.replace(/^@/, '').toLowerCase();
    const handleRegex = new RegExp(`@${handleClean}\\b`, 'i');
    const nameClean = user.displayName.toLowerCase().replace(/\s+/g, '_');
    const nameRegex = new RegExp(`@${nameClean}\\b`, 'i');

    if (handleRegex.test(content) || nameRegex.test(content)) {
      mentions.add(user.pubkey);
    }
  });

  return Array.from(mentions);
}

/**
 * Checks if a specific user is targeted by a message's mentions.
 */
export function isUserMentioned(
  message: Message,
  userPubkey: string,
  userHandle?: string
): boolean {
  if (!message || !userPubkey) return false;

  // Direct ID check in mentions list
  if (message.mentions) {
    if (
      message.mentions.includes(userPubkey) ||
      message.mentions.includes('@channel') ||
      message.mentions.includes('@here') ||
      message.mentions.includes('@everyone')
    ) {
      return true;
    }
  }

  // Text fallback check
  const text = message.content || '';
  if (/@channel\b|@here\b|@everyone\b/i.test(text)) return true;

  if (userHandle) {
    const handleClean = userHandle.replace(/^@/, '');
    const regex = new RegExp(`@${handleClean}\\b`, 'i');
    if (regex.test(text)) return true;
  }

  return false;
}

/**
 * Filters members for autocomplete suggestions based on query text after '@'
 */
export function getMentionSuggestions(
  query: string,
  users: UserIdentity[]
): MentionSuggestion[] {
  const cleanQuery = query.toLowerCase().replace(/^@/, '');

  const userSuggestions: MentionSuggestion[] = users.map((u) => ({
    id: u.pubkey,
    type: 'user' as const,
    name: u.displayName,
    handle: u.handle.startsWith('@') ? u.handle : `@${u.handle}`,
    avatarUrl: u.avatarUrl,
    color: u.color,
  }));

  const all = [...SPECIAL_MENTIONS, ...userSuggestions];

  if (!cleanQuery) return all.slice(0, 8);

  return all
    .filter(
      (item) =>
        item.name.toLowerCase().includes(cleanQuery) ||
        item.handle.toLowerCase().includes(cleanQuery) ||
        (item.description && item.description.toLowerCase().includes(cleanQuery))
    )
    .slice(0, 8);
}

/**
 * Generates a clean @firstname.lastname handle from a full name.
 * If collision occurs with existing members, automatically disambiguates by
 * truncating names or adding a clean suffix.
 */
export function generateHandleFromName(
  fullName: string,
  existingUsers: (UserIdentity | string)[] = []
): string {
  const trimmed = (fullName || '').trim().toLowerCase();
  if (!trimmed) return '@user';

  const parts = trimmed
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);

  if (parts.length === 0) return '@user';

  let baseHandle = '';
  if (parts.length === 1) {
    baseHandle = `@${parts[0]}`;
  } else {
    const first = parts[0];
    const last = parts[parts.length - 1];
    baseHandle = `@${first}.${last}`;
  }

  const existingHandles = new Set(
    existingUsers
      .map((u) => {
        const h = typeof u === 'string' ? u : u?.handle;
        return h ? h.toLowerCase().replace(/^@/, '') : '';
      })
      .filter(Boolean)
  );

  const cleanBase = baseHandle.replace(/^@/, '');
  if (!existingHandles.has(cleanBase)) {
    return baseHandle;
  }

  // Collision resolution strategy:
  if (parts.length >= 2) {
    // 1. Truncate first name to initial: e.g. @a.kundu
    const initialHandle = `${parts[0][0]}.${parts[parts.length - 1]}`;
    if (!existingHandles.has(initialHandle)) {
      return `@${initialHandle}`;
    }

    // 2. Truncate first 3 chars of first name: e.g. @ani.kundu
    if (parts[0].length > 3) {
      const shortFirstHandle = `${parts[0].slice(0, 3)}.${parts[parts.length - 1]}`;
      if (!existingHandles.has(shortFirstHandle)) {
        return `@${shortFirstHandle}`;
      }
    }

    // 3. Truncate last name: e.g. @animesh.k
    const shortLastHandle = `${parts[0]}.${parts[parts.length - 1][0]}`;
    if (!existingHandles.has(shortLastHandle)) {
      return `@${shortLastHandle}`;
    }
  }

  // 4. Numerical suffix
  let counter = 2;
  while (counter <= 99) {
    const candidate = `${cleanBase}${counter}`;
    if (!existingHandles.has(candidate)) {
      return `@${candidate}`;
    }
    counter++;
  }

  return `@${cleanBase}_${Math.random().toString(36).slice(2, 5)}`;
}
