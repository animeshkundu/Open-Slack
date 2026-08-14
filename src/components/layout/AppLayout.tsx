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
  const { messages, setIsSearchOpen } = useWorkspace();

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
