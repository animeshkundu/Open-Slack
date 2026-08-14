import { AlertCircle, ArrowUpCircle, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { MessageComposer } from '../chat/MessageComposer';
import { MessageList } from '../chat/MessageList';
import { SearchModal } from '../chat/SearchModal';
import { HuddleOverlay } from '../huddle/HuddleOverlay';
import { CreateChannelModal } from '../modals/CreateChannelModal';
import { DirectMessageModal } from '../modals/DirectMessageModal';
import { InviteModal } from '../modals/InviteModal';
import { JoinWorkspaceModal } from '../modals/JoinWorkspaceModal';
import { UserSettingsModal } from '../modals/UserSettingsModal';
import { MainHeader } from './MainHeader';
import { PrimarySidebar } from './PrimarySidebar';
import { RightDrawer } from './RightDrawer';
import { WorkspaceBar } from './WorkspaceBar';

export const AppLayout: React.FC = () => {
  const {
    messages,
    setIsSearchOpen,
    mediaPermissionError,
    clearMediaPermissionError,
    fileTransferProgress,
  } = useWorkspace();

  // Modals state
  const [isAddWorkspaceOpen, setIsAddWorkspaceOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDMOpen, setIsDMOpen] = useState(false);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen]);

  return (
    <div
      id="quietslack-root-shell"
      className="flex h-screen w-screen bg-[#1A1D21] overflow-hidden text-neutral-900 antialiased font-sans select-none"
    >
      {/* 1. Leftmost Rail: Workspace Icons */}
      <WorkspaceBar
        onOpenAddWorkspace={() => setIsAddWorkspaceOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. Secondary Sidebar: Channels & DMs */}
      <PrimarySidebar
        onOpenCreateChannel={() => setIsCreateChannelOpen(true)}
        onOpenInvite={() => setIsInviteOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDirectMessage={() => setIsDMOpen(true)}
      />

      {/* 3. Main Center Canvas: Header + Message Stream + Rich Composer */}
      <div
        id="main-chat-viewport"
        className="flex-1 flex flex-col min-w-0 bg-white h-full relative"
      >
        {/* Media Permission Error Banner */}
        {mediaPermissionError && (
          <div
            id="media-permission-alert"
            className="bg-amber-500 text-white px-4 py-2 text-xs flex items-center justify-between shadow-xs z-30 animate-in fade-in slide-in-from-top-1"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{mediaPermissionError}</span>
            </div>
            <button
              onClick={clearMediaPermissionError}
              className="p-1 hover:bg-amber-600 rounded transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 16KB Chunked File Transfer Progress Floating Bar */}
        {fileTransferProgress && (
          <div
            id="p2p-file-transfer-toast"
            className="absolute top-16 right-6 z-40 bg-[#19171D] text-white p-3 rounded-xl shadow-xl border border-neutral-700 w-72 transition"
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold flex items-center gap-1.5 truncate">
                <ArrowUpCircle className="w-3.5 h-3.5 text-[#2BAC76] animate-pulse" />
                {fileTransferProgress.fileName}
              </span>
              <span className="text-[11px] text-gray-400 font-mono">
                {fileTransferProgress.percentage}%
              </span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#2BAC76] h-full transition-all duration-150"
                style={{ width: `${fileTransferProgress.percentage}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-400 mt-1 text-right">
              P2P WebRTC 16KB chunking
            </div>
          </div>
        )}

        {/* Main Channel Header */}
        <MainHeader onOpenInvite={() => setIsInviteOpen(true)} />

        {/* Message Stream */}
        <MessageList messages={messages} />

        {/* Rich Message Composer */}
        <MessageComposer />
      </div>

      {/* 4. Collapsible Right Drawer: Thread sub-view / Profile / Channel Info */}
      <RightDrawer />

      {/* 5. Active Huddle Audio/Video Overlay */}
      <HuddleOverlay />

      {/* 6. Full-Text Search Modal */}
      <SearchModal />

      {/* 7. Dialog Modals */}
      <JoinWorkspaceModal
        isOpen={isAddWorkspaceOpen}
        onClose={() => setIsAddWorkspaceOpen(false)}
      />
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
      />
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />
      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <DirectMessageModal
        isOpen={isDMOpen}
        onClose={() => setIsDMOpen(false)}
      />
    </div>
  );
};
