import {
  AtSign,
  Bold,
  Check,
  Code,
  Copy,
  FileCode,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Mic,
  Paperclip,
  Quote,
  Send,
  Smile,
  Sparkles,
  Square,
  Strikethrough,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getMentionSuggestions, MentionSuggestion } from '../../lib/mentions';
import { formatBytes } from '../../lib/storage';
import { Attachment } from '../../types';
import { ReactionPicker } from './ReactionPicker';

interface MessageComposerProps {
  channelId?: string;
  threadParentId?: string;
  placeholder?: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  channelId,
  threadParentId,
  placeholder,
}) => {
  const {
    activeChannel,
    activeWorkspace,
    messages,
    sendMessage,
    toggleReaction,
    setTyping,
    uploadAttachment,
    typingUsers,
    peerUsers,
    identity,
  } = useWorkspace();

  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Mention Autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(0);
  const [mentionCursorPos, setMentionCursorPos] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);

  // Audio recording note state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<number | null>(null);

  const targetPlaceholder =
    placeholder ||
    (threadParentId
      ? 'Reply in thread...'
      : activeChannel
      ? `Message #${activeChannel.name}`
      : 'Type a message...');

  // Auto-focus composer input on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  // Compute mention suggestions when mentionQuery changes
  useEffect(() => {
    if (mentionQuery !== null) {
      const users = Array.from(peerUsers.values());
      if (identity && !users.some((u) => u.pubkey === identity.pubkey)) {
        users.push(identity);
      }
      const list = getMentionSuggestions(mentionQuery, users);
      setSuggestions(list);
      setMentionIndex(0);
    } else {
      setSuggestions([]);
    }
  }, [mentionQuery, peerUsers, identity]);

  // Check cursor position for @mention token
  const checkMentionTrigger = (text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx !== -1) {
      const charBeforeAt = lastAtIdx > 0 ? textBeforeCursor[lastAtIdx - 1] : ' ';
      // Check if preceded by whitespace or beginning of text
      if (/\s/.test(charBeforeAt) || lastAtIdx === 0) {
        const query = textBeforeCursor.slice(lastAtIdx + 1);
        if (!/\s/.test(query)) {
          setMentionQuery(query);
          setMentionCursorPos(lastAtIdx);
          return;
        }
      }
    }
    setMentionQuery(null);
  };

  // Handle typing debounce & mention detection
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const pos = e.target.selectionStart;
    setContent(text);
    checkMentionTrigger(text, pos);

    // Emit typing indicator
    setTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  const handleSelectMention = (item: MentionSuggestion) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = mentionCursorPos;
    const endPos = textarea.selectionStart;

    const insertToken = item.type === 'special' ? `${item.handle} ` : `${item.handle} `;
    const newContent = content.slice(0, startPos) + insertToken + content.slice(endPos);

    setContent(newContent);
    setMentionQuery(null);

    setTimeout(() => {
      textarea.focus();
      const newPos = startPos + insertToken.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for multiline, Arrows for mention autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(suggestions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) return;

    const currentAttachments = [...attachments];
    const textToSend = trimmed;

    // Reset local composer instantly
    setContent('');
    setAttachments([]);
    setTyping(false);
    setMentionQuery(null);

    try {
      await sendMessage(textToSend, currentAttachments, threadParentId);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Formatting insert helpers
  const wrapSelection = (prefix: string, suffix = prefix, placeholder = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || placeholder;

    const newContent =
      content.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      content.substring(end);

    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 10);
  };

  const insertLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const newContent =
      content.substring(0, start) +
      `\n${prefix}` +
      content.substring(start);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
    }, 10);
  };

  // File Upload Handlers
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map((f) => uploadAttachment(f));
      const uploaded = await Promise.all(uploadPromises);
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error('Attachment upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Audio Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        const att = await uploadAttachment(audioFile);
        setAttachments((prev) => [...prev, att]);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.warn('Cannot record audio:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  return (
    <div className="p-3 sm:p-4 border-t border-neutral-200 bg-white flex-shrink-0 relative">
      {/* Typing indicator banner */}
      {typingUsers.length > 0 && (
        <div className="text-[11px] text-neutral-500 mb-1.5 flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-[#007a5a] inline-block"></span>
          <span>
            {typingUsers.map((t) => t.user.displayName).join(', ')}{' '}
            {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      {/* Mention Suggestions Dropdown Popover */}
      {mentionQuery !== null && suggestions.length > 0 && (
        <div
          id="mention-autocomplete-menu"
          className="absolute bottom-full left-2 right-2 sm:left-4 sm:right-auto mb-2 w-auto sm:w-72 max-w-72 bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden z-40 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="p-2 border-b border-neutral-100 bg-neutral-50/80 flex items-center justify-between text-[11px] font-bold text-neutral-600">
            <span className="flex items-center gap-1">
              <AtSign className="w-3 h-3 text-[#1264A3]" /> Mentions
            </span>
            <span className="text-[10px] text-neutral-400">↑↓ to navigate, ↵ to select</span>
          </div>
          <div className="p-1 space-y-0.5">
            {suggestions.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectMention(item)}
                onMouseEnter={() => setMentionIndex(idx)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition ${
                  idx === mentionIndex ? 'bg-[#1264A3] text-white' : 'hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                {item.type === 'special' ? (
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                      idx === mentionIndex ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                  </div>
                ) : item.avatarUrl ? (
                  <img
                    src={item.avatarUrl}
                    alt={item.name}
                    className="w-6 h-6 rounded-md object-cover border border-neutral-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                      idx === mentionIndex ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {item.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold truncate">{item.name}</span>
                    <span
                      className={`text-[10px] font-mono ${
                        idx === mentionIndex ? 'text-white/80' : 'text-neutral-500'
                      }`}
                    >
                      {item.handle}
                    </span>
                  </div>
                  {item.description && (
                    <div
                      className={`text-[10px] truncate ${
                        idx === mentionIndex ? 'text-white/70' : 'text-neutral-400'
                      }`}
                    >
                      {item.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 1-Click Quick Action Chips Bar (when channel messages <= 3) */}
      {messages.length <= 3 && !threadParentId && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-neutral-500 mr-0.5 hidden sm:inline">Quick actions:</span>
          <button
            type="button"
            id="composer-chip-say-hello"
            onClick={async () => {
              try {
                const msg = await sendMessage('Say hello to the team!', [], threadParentId);
                if (msg && msg.id) {
                  setTimeout(() => toggleReaction(msg.id, '🎉'), 100);
                }
              } catch (e) {
                console.error(e);
              }
            }}
            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-[#4A154B] border border-purple-200 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Say hello to team</span>
          </button>

          <button
            type="button"
            id="composer-chip-testing"
            onClick={async () => {
              try {
                const msg = await sendMessage('Testing Open-Slack!', [], threadParentId);
                if (msg && msg.id) {
                  setTimeout(() => toggleReaction(msg.id, '🎉'), 100);
                }
              } catch (e) {
                console.error(e);
              }
            }}
            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#007a5a] border border-emerald-200 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Testing Open-Slack</span>
          </button>

          <button
            type="button"
            id="composer-chip-invite"
            onClick={() => {
              const inviteLink = activeWorkspace
                ? `${window.location.origin}${window.location.pathname}#invite=${btoa(JSON.stringify(activeWorkspace))}`
                : window.location.href;
              navigator.clipboard.writeText(inviteLink);
              setCopiedInvite(true);
              setTimeout(() => setCopiedInvite(false), 2000);
            }}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#1164A3] border border-blue-200 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
          >
            {copiedInvite ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Link Copied!
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Copy className="w-3.5 h-3.5 text-blue-600" /> Copy Invite Link
              </span>
            )}
          </button>
        </div>
      )}

      {/* Main Composer Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border rounded-xl flex flex-col bg-white overflow-hidden transition-all ${
          isDragging
            ? 'border-[#1264A3] ring-2 ring-blue-100 bg-blue-50/20'
            : 'border-neutral-300 focus-within:border-neutral-500 focus-within:shadow-xs'
        }`}
      >
        {/* Attachment chips preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-neutral-50 border-b border-neutral-200">
            {attachments.map((att, idx) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-2.5 py-1 bg-white border border-neutral-200 rounded-md text-xs shadow-2xs"
              >
                <Paperclip className="w-3 h-3 text-neutral-400" />
                <span className="font-medium text-neutral-900 truncate max-w-[150px]">
                  {att.fileName}
                </span>
                <span className="text-neutral-400 text-[10px]">
                  {formatBytes(att.fileSize)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="p-0.5 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Recording Banner */}
        {isRecording && (
          <div className="flex items-center justify-between px-3 py-2 bg-red-50 text-red-700 text-xs font-medium border-b border-red-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
              <span>Recording Voice Note ({recordingSeconds}s)...</span>
            </div>
            <button
              id="stop-recording-btn"
              type="button"
              onClick={stopRecording}
              className="px-2.5 py-1 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition flex items-center gap-1 cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" /> Stop & Attach
            </button>
          </div>
        )}

        {/* Text Input Area */}
        <div className="p-3">
          <textarea
            ref={textareaRef}
            id="message-composer-textarea"
            rows={1}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={targetPlaceholder}
            className="w-full bg-transparent resize-none outline-none text-sm text-neutral-900 placeholder:text-neutral-400 max-h-48 min-h-[36px]"
          />
        </div>

        {/* Bottom Toolbar & Action Bar */}
        <div className="min-h-10 bg-neutral-50/90 border-t border-neutral-200 flex flex-wrap items-center justify-between px-2 py-1 gap-1">
          {/* Formatting Controls */}
          <div className="flex items-center flex-wrap gap-0.5 text-neutral-600">
            {/* File upload hidden input & trigger */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
            <button
              id="composer-attach-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-600 transition cursor-pointer"
              title="Attach files (or drag & drop)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              id="composer-mention-btn"
              type="button"
              onClick={() => {
                const textarea = textareaRef.current;
                if (!textarea) return;
                const pos = textarea.selectionStart;
                const newText = content.slice(0, pos) + '@' + content.slice(pos);
                setContent(newText);
                setTimeout(() => {
                  textarea.focus();
                  textarea.setSelectionRange(pos + 1, pos + 1);
                  checkMentionTrigger(newText, pos + 1);
                }, 10);
              }}
              className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-600 text-xs font-bold"
              title="Mention someone (@)"
            >
              <AtSign className="w-4 h-4 text-[#1264A3]" />
            </button>

            <div className="h-4 w-[1px] bg-neutral-300 mx-1 hidden sm:block" />

            <button
              id="format-bold-btn"
              type="button"
              onClick={() => wrapSelection('**', '**', 'bold text')}
              className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-600 font-bold text-xs"
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              id="format-italic-btn"
              type="button"
              onClick={() => wrapSelection('_', '_', 'italic text')}
              className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-600 italic text-xs"
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              id="format-strike-btn"
              type="button"
              onClick={() => wrapSelection('~', '~', 'strike text')}
              className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-600 hidden sm:inline-flex"
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              id="format-link-btn"
              type="button"
              onClick={() => wrapSelection('[', '](https://)', 'link title')}
              className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-600 hidden sm:inline-flex"
              title="Link"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
            <button
              id="format-code-btn"
              type="button"
              onClick={() => wrapSelection('`', '`', 'code')}
              className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-600"
              title="Inline code"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              id="format-codeblock-btn"
              type="button"
              onClick={() => wrapSelection('```ts\n', '\n```', '// your code')}
              className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-600 hidden sm:inline-flex"
              title="Code Block"
            >
              <FileCode className="w-3.5 h-3.5" />
            </button>
            <button
              id="format-list-btn"
              type="button"
              onClick={() => insertLinePrefix('- ')}
              className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-600 hidden sm:inline-flex"
              title="Bulleted list"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              id="format-quote-btn"
              type="button"
              onClick={() => insertLinePrefix('> ')}
              className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-600 hidden sm:inline-flex"
              title="Quote"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right send & voice actions */}
          <div className="flex items-center space-x-1 sm:space-x-2 ml-auto">
            {/* Emoji popover */}
            <div className="relative">
              <button
                id="composer-emoji-btn"
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-600 hover:text-neutral-900 transition cursor-pointer"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              {showEmojiPicker && (
                <ReactionPicker
                  onSelect={(emoji) => {
                    setContent((prev) => prev + emoji);
                    textareaRef.current?.focus();
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>

            {/* Voice Note Button */}
            <button
              id="composer-mic-btn"
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isRecording
                  ? 'bg-red-100 text-red-600'
                  : 'hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900'
              }`}
              title={isRecording ? 'Stop recording' : 'Record voice note'}
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Send Button */}
            <button
              id="composer-send-btn"
              type="button"
              onClick={handleSend}
              disabled={!content.trim() && attachments.length === 0}
              className={`p-2 rounded-lg transition cursor-pointer flex items-center justify-center ${
                content.trim() || attachments.length > 0
                  ? 'bg-[#007a5a] text-white hover:bg-[#148567] shadow-xs'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
              title="Send message (Enter)"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
