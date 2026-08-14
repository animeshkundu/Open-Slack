import {
  Bold,
  Code,
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
  Square,
  Strikethrough,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
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
    sendMessage,
    setTyping,
    uploadAttachment,
    typingUsers,
  } = useWorkspace();

  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  // Handle typing debounce
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Emit typing indicator
    setTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for multiline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    <div className="p-4 border-t border-[#E8E8E8] bg-white flex-shrink-0">
      {/* Typing indicator banner */}
      {typingUsers.length > 0 && (
        <div className="text-[12px] text-gray-500 mb-1.5 flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2BAC76] inline-block"></span>
          <span>
            {typingUsers.map((t) => t.user.displayName).join(', ')}{' '}
            {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      {/* Main Composer Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 rounded-xl flex flex-col bg-white overflow-hidden transition-all ${
          isDragging
            ? 'border-[#1164A3] ring-2 ring-blue-100 bg-blue-50/20'
            : 'border-[#E8E8E8] focus-within:border-gray-400'
        }`}
      >
        {/* Attachment chips preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-[#F8F8F8] border-b border-[#E8E8E8]">
            {attachments.map((att, idx) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-2.5 py-1 bg-white border border-[#E8E8E8] rounded-md text-xs shadow-2xs"
              >
                <Paperclip className="w-3 h-3 text-gray-400" />
                <span className="font-medium text-[#1D1C1D] truncate max-w-[150px]">
                  {att.fileName}
                </span>
                <span className="text-gray-400 text-[10px]">
                  {formatBytes(att.fileSize)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 cursor-pointer"
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
            className="w-full bg-transparent resize-none outline-none text-sm text-[#1D1C1D] placeholder:text-gray-400 max-h-48 min-h-[36px]"
          />
        </div>

        {/* Bottom Toolbar & Action Bar */}
        <div className="h-10 bg-[#F8F8F8] border-t border-[#E8E8E8] rounded-b-lg flex items-center justify-between px-2">
          {/* Formatting Controls */}
          <div className="flex items-center space-x-1 text-gray-500">
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
              className="p-1 hover:bg-gray-200 rounded text-gray-500 transition cursor-pointer"
              title="Attach files (or drag & drop)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <div className="h-4 w-[1px] bg-gray-300 mx-1" />

            <button
              id="format-bold-btn"
              type="button"
              onClick={() => wrapSelection('**', '**', 'bold text')}
              className="p-1 hover:bg-gray-200 rounded text-gray-600 font-bold text-xs"
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              id="format-italic-btn"
              type="button"
              onClick={() => wrapSelection('_', '_', 'italic text')}
              className="p-1 hover:bg-gray-200 rounded text-gray-600 italic text-xs"
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              id="format-strike-btn"
              type="button"
              onClick={() => wrapSelection('~', '~', 'strike text')}
              className="p-1 hover:bg-gray-200 rounded text-gray-600"
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              id="format-link-btn"
              type="button"
              onClick={() => wrapSelection('[', '](https://)', 'link title')}
              className="p-1 hover:bg-gray-200 rounded text-gray-600"
              title="Link"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
            <button
              id="format-code-btn"
              type="button"
              onClick={() => wrapSelection('`', '`', 'code')}
              className="p-1 hover:bg-gray-200 rounded text-gray-600"
              title="Inline code"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              id="format-list-btn"
              type="button"
              onClick={() => insertLinePrefix('- ')}
              className="p-1 hover:bg-gray-200 rounded text-gray-600"
              title="Bulleted list"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              id="format-quote-btn"
              type="button"
              onClick={() => insertLinePrefix('> ')}
              className="p-1 hover:bg-gray-200 rounded text-gray-600"
              title="Quote"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right send & voice actions */}
          <div className="flex items-center space-x-2">
            {/* Emoji popover */}
            <div className="relative">
              <button
                id="composer-emoji-btn"
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition cursor-pointer"
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
              className={`p-1 rounded transition cursor-pointer ${
                isRecording
                  ? 'bg-red-100 text-red-600'
                  : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'
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
              className={`p-1.5 rounded transition cursor-pointer flex items-center justify-center ${
                content.trim() || attachments.length > 0
                  ? 'bg-[#2BAC76] text-white hover:bg-[#249666]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
