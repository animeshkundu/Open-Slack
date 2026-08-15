import { Hash, Lock, Users } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Message } from '../../types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const { activeChannel, peerUsers } = useWorkspace();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
                {activeChannel?.isDirectMessage
                  ? 'This is the start of your 1-on-1 direct message history with end-to-end encryption.'
                  : (
                    <>
                      This is the start of the{' '}
                      <span className="font-bold text-[#1164A3]">
                        #{activeChannel?.name || 'general'}
                      </span>{' '}
                      channel. This workspace is running purely serverless via P2P mesh networking.
                    </>
                  )}
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
