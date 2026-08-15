import { ArrowLeft, Hash, MessageSquare, X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { MessageItem } from './MessageItem';
import { MessageComposer } from './MessageComposer';

export const ThreadView: React.FC = () => {
  const {
    activeThreadParent,
    threadReplies,
    closeThread,
    openThread,
    activeChannel,
    messages,
    setRightPanel,
    channels,
  } = useWorkspace();

  const repliesBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    repliesBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadReplies.length]);

  // If no specific message thread is selected, show the "All Threads" overview
  if (!activeThreadParent) {
    // Find all messages that have replies or are thread starters
    const threadsInWorkspace = messages.filter((m) => (m.replyCount && m.replyCount > 0) && !m.threadParentId);

    return (
      <div
        id="all-threads-overview-panel"
        className="h-full flex flex-col bg-white"
      >
        {/* Header */}
        <div className="h-14 px-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-neutral-900 text-base">Threads</h3>
          </div>
          <button
            id="close-all-threads-btn"
            type="button"
            onClick={() => setRightPanel('none')}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-900 cursor-pointer"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thread List or Empty State */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {threadsInWorkspace.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-neutral-900 text-sm">
                No active threads yet
              </h4>
              <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
                When you reply to a message, the conversation thread will be tracked here so you can stay in sync easily.
              </p>
              <button
                type="button"
                onClick={() => setRightPanel('none')}
                className="mt-2 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Back to #{activeChannel?.name || 'channel'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Active Discussions ({threadsInWorkspace.length})
              </div>
              {threadsInWorkspace.map((msg) => {
                const chan = channels.find((c) => c.id === msg.channelId);
                return (
                  <div
                    key={msg.id}
                    onClick={() => openThread(msg)}
                    className="p-3 bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200 rounded-xl cursor-pointer transition space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span className="font-medium flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {chan?.name || 'channel'}
                      </span>
                      <span className="font-bold text-blue-600 group-hover:underline">
                        {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-800 font-medium line-clamp-2">
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Specific Thread View
  return (
    <div
      id="thread-panel-container"
      className="h-full flex flex-col bg-white"
    >
      {/* Thread Header */}
      <div className="h-14 px-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={closeThread}
            className="p-1 hover:bg-neutral-100 rounded-md text-neutral-500 hover:text-neutral-900 cursor-pointer sm:hidden"
            title="Back to threads"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="font-bold text-neutral-900 text-base">Thread</h3>
          <span className="text-xs text-neutral-500 flex items-center gap-0.5">
            <Hash className="w-3.5 h-3.5" />
            {activeChannel?.name}
          </span>
        </div>
        <button
          id="close-thread-btn"
          type="button"
          onClick={closeThread}
          className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-900 cursor-pointer"
          title="Close thread"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Thread Content Stream */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {/* Parent Message in Focus */}
        <div className="pb-3 border-b border-neutral-100">
          <MessageItem
            message={activeThreadParent}
            showThreadButton={false}
          />
        </div>

        {/* Replies divider */}
        <div className="px-5 flex items-center gap-3">
          <span className="text-xs font-bold text-neutral-500 whitespace-nowrap">
            {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}
          </span>
          <div className="w-full border-t border-neutral-200" />
        </div>

        {/* Replies List */}
        <div className="space-y-1">
          {threadReplies.map((reply) => (
            <MessageItem
              key={reply.id}
              message={reply}
              showThreadButton={false}
            />
          ))}
        </div>

        <div ref={repliesBottomRef} />
      </div>

      {/* Thread Composer */}
      <div className="border-t border-neutral-200 bg-white flex-shrink-0">
        <MessageComposer
          threadParentId={activeThreadParent.id}
          placeholder="Reply in thread..."
        />
      </div>
    </div>
  );
};
