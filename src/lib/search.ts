import { Channel, Message, SearchResultItem, UserIdentity } from '../types';

export interface ParsedSearchQuery {
  rawText: string;
  keywords: string[];
  fromUser?: string;
  inChannel?: string;
  hasFile?: boolean;
  hasMention?: boolean;
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const tokens = query.trim().split(/\s+/);
  const keywords: string[] = [];
  let fromUser: string | undefined;
  let inChannel: string | undefined;
  let hasFile: boolean | undefined;
  let hasMention: boolean | undefined;

  for (const token of tokens) {
    if (token.toLowerCase().startsWith('from:')) {
      fromUser = token.substring(5).replace(/^@/, '').toLowerCase();
    } else if (token.toLowerCase().startsWith('in:')) {
      inChannel = token.substring(3).replace(/^#/, '').toLowerCase();
    } else if (token.toLowerCase() === 'has:file' || token.toLowerCase() === 'has:image') {
      hasFile = true;
    } else if (token.toLowerCase() === 'has:mention' || token.toLowerCase() === 'is:mention') {
      hasMention = true;
    } else if (token.length > 0) {
      keywords.push(token.toLowerCase());
    }
  }

  return {
    rawText: query,
    keywords,
    fromUser,
    inChannel,
    hasFile,
    hasMention,
  };
}

export function searchWorkspaceMessages(
  messages: Message[],
  channels: Map<string, Channel>,
  users: Map<string, UserIdentity>,
  query: string
): SearchResultItem[] {
  if (!query.trim()) return [];

  const parsed = parseSearchQuery(query);
  const results: SearchResultItem[] = [];

  for (const msg of messages) {
    const channel = channels.get(msg.channelId);
    const author = users.get(msg.authorPubkey);
    const channelName = channel ? channel.name : 'unknown';
    const authorName = author ? author.displayName : 'Unknown Member';
    const authorHandle = author ? author.handle.replace(/^@/, '') : '';

    // Filter: in:#channel
    if (parsed.inChannel && !channelName.toLowerCase().includes(parsed.inChannel)) {
      continue;
    }

    // Filter: from:@user
    if (
      parsed.fromUser &&
      !authorName.toLowerCase().includes(parsed.fromUser) &&
      !authorHandle.toLowerCase().includes(parsed.fromUser)
    ) {
      continue;
    }

    // Filter: has:file
    if (parsed.hasFile && (!msg.attachments || msg.attachments.length === 0)) {
      continue;
    }

    // Filter: has:mention
    if (parsed.hasMention && (!msg.mentions || msg.mentions.length === 0) && !/@\w+/.test(msg.content || '')) {
      continue;
    }

    // Keyword match in content or attachments
    const contentLower = (msg.content || '').toLowerCase();
    const attachmentNames = (msg.attachments || []).map((a) => a.fileName.toLowerCase()).join(' ');
    const searchableText = `${contentLower} ${attachmentNames}`;

    let matchesAllKeywords = true;
    const snippets: string[] = [];

    for (const kw of parsed.keywords) {
      if (!searchableText.includes(kw)) {
        matchesAllKeywords = false;
        break;
      }
    }

    if (parsed.keywords.length === 0 || matchesAllKeywords) {
      // Extract matched snippet around keywords
      if (parsed.keywords.length > 0) {
        for (const kw of parsed.keywords) {
          const idx = contentLower.indexOf(kw);
          if (idx !== -1) {
            const start = Math.max(0, idx - 40);
            const end = Math.min(msg.content.length, idx + kw.length + 40);
            snippets.push((start > 0 ? '...' : '') + msg.content.substring(start, end) + (end < msg.content.length ? '...' : ''));
          }
        }
      } else {
        snippets.push(msg.content.substring(0, 100));
      }

      results.push({
        message: msg,
        channelName,
        authorName,
        authorAvatar: author?.avatarUrl || '',
        matchedSnippets: snippets.length > 0 ? snippets : [msg.content.substring(0, 100)],
      });
    }
  }

  // Sort newest first
  return results.sort((a, b) => b.message.timestamp - a.message.timestamp);
}
