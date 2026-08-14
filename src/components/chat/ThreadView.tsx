import { Hash, X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { MessageComposer } from './MessageComposer';
import { MessageItem } from './MessageItem';

export const ThreadView: React.FC = () => {
  const {
    activeThreadParent,
    threadReplies,
    closeThread,
    activeChannel,
  } = useWorkspace();

  const repliesBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    repliesBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadReplies.length]);

  if (!activeThreadParent) return null;

  return (
    <div
      id="thread-panel-container"
      className="h-full flex flex-col bg-white border-l border-[#E8E8E8]"
    >
      {/* Thread Header */}
      <div className="h-14 px-4 border-b border-[#E8E8E8] flex items-center justify-between flex-shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-[#1D1C1D] text-base">Thread</h3>
          <span className="text-xs text-gray-500 flex items-center gap-0.5">
            <Hash className="w-3.5 h-3.5" />
            {activeChannel?.name}
          </span>
        </div>
        <button
          id="close-thread-btn"
          type="button"
          onClick={closeThread}
          className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 cursor-pointer"
          title="Close thread (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Thread Content Stream */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {/* Parent Message in Focus */}
        <div className="pb-3 border-b border-[#E8E8E8]">
          <MessageItem
            message={activeThreadParent}
            showThreadButton={false}
          />
        </div>

        {/* Replies divider */}
        <div className="px-5 flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
            {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}
          </span>
          <div className="w-full border-t border-[#E8E8E8]" />
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
      <div className="border-t border-[#E8E8E8] bg-white flex-shrink-0">
        <MessageComposer
          threadParentId={activeThreadParent.id}
          placeholder="Reply in thread..."
        />
      </div>
    </div>
  );
};
