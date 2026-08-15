import { Check, Copy, Hash, Lock, Sparkles, Users } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { playSound } from '../../lib/sound';
import { getUrlParams } from '../../lib/url';
import { Message } from '../../types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const { activeChannel, activeWorkspace, sendMessage, toggleReaction } = useWorkspace();
  const [copiedInvite, setCopiedInvite] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToTargetRef = useRef<string | null>(null);

  const handleSendChip = async (text: string) => {
    playSound.sent();
    playSound.pop();
    try {
      const msg = await sendMessage(text, [], undefined);
      if (msg && msg.id) {
        setTimeout(() => {
          toggleReaction(msg.id, '🎉');
        }, 100);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyInviteLink = () => {
    playSound.pop();
    const inviteLink = activeWorkspace
      ? `${window.location.origin}${window.location.pathname}#invite=${btoa(JSON.stringify(activeWorkspace))}`
      : window.location.href;
    navigator.clipboard.writeText(inviteLink);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  // Auto scroll to target message from URL if present, otherwise bottom
  useEffect(() => {
    const { messageId } = getUrlParams();
    if (messageId && messageId !== hasScrolledToTargetRef.current) {
      const el = document.getElementById(`message-${messageId}`);
      if (el) {
        hasScrolledToTargetRef.current = messageId;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-[#1264A3]', 'bg-blue-50/70', 'transition-all', 'duration-500');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-[#1264A3]', 'bg-blue-50/70');
        }, 3000);
        return;
      }
    }

    if (!messageId) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, messages[messages.length - 1]?.id]);

  // Group messages by Date (e.g. "Today", "Yesterday", "August 14, 2026")
  const formatDateHeader = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const groupedMessages: { dateHeader: string; messages: Message[] }[] = [];
  let currentDate = '';
  let currentGroup: Message[] = [];

  messages.forEach((msg) => {
    const dHeader = formatDateHeader(msg.timestamp);
    if (dHeader !== currentDate) {
      if (currentGroup.length > 0) {
        groupedMessages.push({ dateHeader: currentDate, messages: currentGroup });
      }
      currentDate = dHeader;
      currentGroup = [msg];
    } else {
      currentGroup.push(msg);
    }
  });
  if (currentGroup.length > 0) {
    groupedMessages.push({ dateHeader: currentDate, messages: currentGroup });
  }

  return (
    <div
      ref={containerRef}
      id="message-stream-container"
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col justify-between"
    >
      <div className="pt-6 pb-2">
        {/* Channel Introduction Banner at top */}
        <div className="px-6 mb-6">
          <div className="flex items-center space-x-4 border-b border-[#E8E8E8] pb-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-lg">
              {activeChannel?.isPrivate ? (
                <Lock className="w-5 h-5" />
              ) : activeChannel?.isDirectMessage ? (
                <Users className="w-5 h-5" />
              ) : (
                '#'
              )}
            </div>
            <div className="flex-1">
              <div className="font-black text-2xl text-[#1D1C1D]">
                {activeChannel?.isDirectMessage
                  ? activeChannel.name
                  : `Welcome to #${activeChannel?.name || 'general'}!`}
              </div>
              <div className="text-gray-500 text-sm mt-0.5">
                {activeChannel?.isDirectMessage ? (
                  <span id="privacy-subtext-dm">Private conversation: Messages exist only on the devices of participants in this conversation.</span>
                ) : activeChannel?.isPrivate ? (
                  <span id="privacy-subtext-private">Private channel: Accessible strictly by invitation from existing channel members.</span>
                ) : (
                  <span id="privacy-subtext-public">Public to workspace: Visible to all approved members of this workspace.</span>
                )}
              </div>

              {/* 1-Click Interactive Quick-Action Chips */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="welcome-chip-say-hello"
                  onClick={() => handleSendChip('Say hello to the team!')}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#4A154B] border border-purple-200 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Say hello to team</span>
                </button>

                <button
                  type="button"
                  id="welcome-chip-testing"
                  onClick={() => handleSendChip('Testing out Open-Slack!')}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#007a5a] border border-emerald-200 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Testing Open-Slack</span>
                </button>

                <button
                  type="button"
                  id="welcome-chip-invite"
                  onClick={handleCopyInviteLink}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1164A3] border border-blue-200 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Invite Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Date Dividers & Message Items */}
        {groupedMessages.map((group) => (
          <div key={group.dateHeader} className="space-y-1">
            {/* Sticky Date Separator Pill */}
            <div className="sticky top-0 z-10 flex items-center justify-center py-2 px-6 bg-white/95 backdrop-blur-xs">
              <div className="flex-1 border-t border-neutral-200" />
              <span className="mx-3 text-[11px] font-bold text-neutral-600 px-3 py-1 bg-neutral-100/90 border border-neutral-200/80 rounded-full shadow-2xs">
                {group.dateHeader}
              </span>
              <div className="flex-1 border-t border-neutral-200" />
            </div>

            {/* Messages in this date block */}
            {group.messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
