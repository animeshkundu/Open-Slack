import {
  Check,
  Copy,
  Download,
  FileText,
  MessageSquare,
  Pin,
  Smile,
  Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatBytes } from '../../lib/storage';
import { Message } from '../../types';
import { ReactionPicker } from './ReactionPicker';

interface MessageItemProps {
  message: Message;
  isCompact?: boolean;
  showThreadButton?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isCompact = false,
  showThreadButton = true,
}) => {
  const {
    identity,
    peerUsers,
    toggleReaction,
    togglePinMessage,
    deleteMessage,
    openThread,
    openUserProfile,
  } = useWorkspace();

  const [showPicker, setShowPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const author = peerUsers.get(message.authorPubkey) || {
    pubkey: message.authorPubkey,
    displayName: message.authorPubkey === identity?.pubkey ? identity.displayName : 'Teammate',
    handle: `@${message.authorPubkey.slice(0, 8)}`,
    avatarUrl: '',
    color: '#1264A3',
    status: '',
    lastSeen: message.timestamp,
  };

  const isAuthor = identity?.pubkey === message.authorPubkey;

  const timeString = new Date(message.timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  const fullDateString = new Date(message.timestamp).toLocaleString();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`group relative flex space-x-3 px-6 py-2 hover:bg-[#F8F8F8] transition-colors rounded-none ${
        message.pinned ? 'bg-amber-50/50 border-l-2 border-amber-400' : ''
      }`}
    >
      {/* Author Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        <button
          id={`avatar-btn-${message.id}`}
          type="button"
          onClick={() => openUserProfile(author)}
          className="focus:outline-none"
        >
          {author.avatarUrl ? (
            <img
              src={author.avatarUrl}
              alt={author.displayName}
              className="w-10 h-10 rounded-lg object-cover ring-1 ring-black/5 hover:opacity-90 transition"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: author.color || '#1164A3' }}
            >
              {author.displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </button>
      </div>

      {/* Message Content & Metadata */}
      <div className="flex-1 min-w-0">
        {/* Header line */}
        <div className="flex items-baseline space-x-2 mb-1">
          <button
            id={`author-name-btn-${message.id}`}
            type="button"
            onClick={() => openUserProfile(author)}
            className="font-black text-[15px] text-[#1D1C1D] hover:underline focus:outline-none cursor-pointer"
          >
            {author.displayName}
          </button>
          <span className="text-[11px] text-gray-400" title={fullDateString}>
            {timeString}
          </span>
          {message.pinned && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
              <Pin className="w-2.5 h-2.5" /> Pinned
            </span>
          )}
        </div>

        {/* Formatted Message Body */}
        <div className="text-[15px] text-[#1D1C1D] leading-relaxed break-words markdown-content">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="px-1.5 py-0.5 rounded bg-gray-100 font-mono text-[13px] text-[#E01E5A] border border-gray-200" {...props}>
                    {children}
                  </code>
                ) : (
                  <div className="my-2 p-3 bg-neutral-900 text-neutral-100 rounded-md font-mono text-[13px] overflow-x-auto border border-neutral-800">
                    <code {...props}>{children}</code>
                  </div>
                );
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-gray-300 pl-3 italic text-gray-600 my-1">
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => <ul className="list-disc pl-5 my-1 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 my-1 space-y-0.5">{children}</ol>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1164A3] hover:underline font-medium"
                >
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </Markdown>
        </div>

        {/* Attachments rendering */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((att) => {
              const isImg = att.mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.fileName);
              return (
                <div key={att.id} className="max-w-md">
                  {isImg && att.dataUrl ? (
                    <div className="relative group/img inline-block rounded-lg overflow-hidden border border-[#E8E8E8]">
                      <img
                        src={att.dataUrl}
                        alt={att.fileName}
                        onClick={() => setSelectedImage(att.dataUrl || null)}
                        className="max-h-72 w-auto object-cover rounded-lg cursor-zoom-in hover:brightness-95 transition"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
                        <span>{att.fileName}</span>
                        <span>{formatBytes(att.fileSize)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 p-3 bg-white border border-[#E8E8E8] rounded-lg flex items-center space-x-3 w-[320px] shadow-xs">
                      <div className="w-10 h-12 bg-red-50 rounded flex items-center justify-center border border-red-100 flex-shrink-0">
                        <span className="text-red-500 font-bold text-[10px] uppercase">
                          {att.fileName.split('.').pop()?.slice(0, 4) || 'FILE'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-[#1D1C1D] truncate">
                          {att.fileName}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          {formatBytes(att.fileSize)} • OPFS File Storage
                        </div>
                      </div>
                      {att.dataUrl && (
                        <a
                          href={att.dataUrl}
                          download={att.fileName}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Emoji Reactions Bar */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {Object.entries(message.reactions).map(([emoji, pubkeys]) => {
              if (!pubkeys || pubkeys.length === 0) return null;
              const hasReacted = identity && pubkeys.includes(identity.pubkey);
              return (
                <button
                  key={emoji}
                  id={`reaction-chip-${message.id}-${emoji}`}
                  type="button"
                  onClick={() => toggleReaction(message.id, emoji)}
                  className={`bg-gray-100 px-2 py-0.5 rounded-full text-xs flex items-center space-x-1 border cursor-pointer font-bold transition-all ${
                    hasReacted
                      ? 'bg-blue-50 border-blue-300 text-[#1164A3]'
                      : 'border-transparent text-gray-600 hover:border-blue-300'
                  }`}
                  title={`${pubkeys.length} reaction${pubkeys.length > 1 ? 's' : ''}`}
                >
                  <span>{emoji}</span>
                  <span className="text-gray-600">{pubkeys.length}</span>
                </button>
              );
            })}

            {/* Quick add reaction button */}
            <button
              id={`quick-react-btn-${message.id}`}
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 text-xs"
              title="Add reaction"
            >
              +
            </button>
          </div>
        )}

        {/* Thread replies button */}
        {showThreadButton && (message.replyCount || 0) > 0 && (
          <div className="mt-2">
            <button
              id={`thread-replies-btn-${message.id}`}
              type="button"
              onClick={() => openThread(message)}
              className="text-[#1164A3] text-sm font-bold flex items-center space-x-2 cursor-pointer hover:underline"
            >
              <div className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center">
                <MessageSquare className="w-2.5 h-2.5 text-[#1164A3]" />
              </div>
              <span>
                {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
              </span>
              {message.lastReplyTimestamp && (
                <span className="text-xs text-gray-400 font-normal">
                  Last reply {new Date(message.lastReplyTimestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Slack Quick Hover Action Bar */}
      <div className="absolute right-6 -top-3 hidden group-hover:flex items-center bg-white border border-[#E8E8E8] rounded-lg shadow-md py-0.5 px-1 z-10">
        <div className="relative">
          <button
            id={`hover-reaction-btn-${message.id}`}
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition"
            title="Add reaction"
          >
            <Smile className="w-4 h-4" />
          </button>
          {showPicker && (
            <ReactionPicker
              onSelect={(emoji) => toggleReaction(message.id, emoji)}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>

        {showThreadButton && (
          <button
            id={`hover-thread-btn-${message.id}`}
            type="button"
            onClick={() => openThread(message)}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition"
            title="Reply in thread"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}

        <button
          id={`hover-pin-btn-${message.id}`}
          type="button"
          onClick={() => togglePinMessage(message.id)}
          className={`p-1.5 hover:bg-gray-100 rounded transition ${
            message.pinned ? 'text-amber-600' : 'text-gray-600 hover:text-gray-900'
          }`}
          title={message.pinned ? 'Unpin from channel' : 'Pin to channel'}
        >
          <Pin className="w-4 h-4" />
        </button>

        <button
          id={`hover-copy-btn-${message.id}`}
          type="button"
          onClick={handleCopy}
          className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition"
          title="Copy message text"
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
        </button>

        {isAuthor && (
          <button
            id={`hover-delete-btn-${message.id}`}
            type="button"
            onClick={() => deleteMessage(message.id)}
            className="p-1.5 hover:bg-red-50 rounded text-gray-600 hover:text-red-600 transition"
            title="Delete message"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Lightbox image preview modal */}
      {selectedImage && (
        <div
          id="image-lightbox-modal"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-4xl max-h-[90vh] object-contain rounded-lg shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
};
