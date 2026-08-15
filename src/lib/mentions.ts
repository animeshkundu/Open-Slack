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
