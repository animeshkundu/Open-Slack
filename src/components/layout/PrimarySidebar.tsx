import {
  Bookmark,
  ChevronDown,
  Hash,
  Lock,
  MessageSquare,
  Plus,
  Radio,
  Search,
  Settings,
  Sparkles,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface PrimarySidebarProps {
  onOpenCreateChannel: () => void;
  onOpenInvite: () => void;
  onOpenSettings: () => void;
  onOpenDirectMessage: () => void;
}

export const PrimarySidebar: React.FC<PrimarySidebarProps> = ({
  onOpenCreateChannel,
  onOpenInvite,
  onOpenSettings,
  onOpenDirectMessage,
}) => {
  const {
    activeWorkspace,
    channels,
    activeChannel,
    selectChannel,
    peerUsers,
    identity,
    setIsSearchOpen,
    simulatePeerMessage,
    openUserProfile,
    startOrJoinHuddle,
    huddleState,
  } = useWorkspace();

  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);

  const publicChannels = channels.filter((c) => !c.isDirectMessage);
  const directChannels = channels.filter((c) => c.isDirectMessage);

  return (
    <div
      id="primary-sidebar-container"
      className="w-[260px] h-full bg-[#3F0E40] text-[#9E9EA6] flex flex-col flex-shrink-0 select-none border-r border-[#522653] relative"
    >
      {/* Workspace Header Dropdown */}
      <div className="relative">
        <button
          id="workspace-header-menu-btn"
          type="button"
          onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
          className="w-full h-14 p-4 flex items-center justify-between border-b border-[#522653] text-white hover:bg-[#350d36] transition"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-black text-lg tracking-tight truncate">
              {activeWorkspace?.name || 'Quiet Workspace'}
            </span>
            <ChevronDown className="w-4 h-4 text-[#9E9EA6] flex-shrink-0" />
          </div>
        </button>

        {showWorkspaceMenu && (
          <div
            id="workspace-header-dropdown"
            className="absolute top-14 left-2 z-50 w-60 bg-white text-neutral-800 rounded-lg shadow-2xl border border-neutral-200 py-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-2 border-b border-neutral-100">
              <div className="font-bold text-xs text-neutral-900 truncate">
                {activeWorkspace?.name}
              </div>
              <div className="text-[10px] text-neutral-500 font-mono">
                ID: {activeWorkspace?.id.slice(0, 16)}...
              </div>
            </div>

            <button
              id="ws-menu-invite-btn"
              type="button"
              onClick={() => {
                setShowWorkspaceMenu(false);
                onOpenInvite();
              }}
              className="w-full px-3 py-2 hover:bg-neutral-100 text-xs font-semibold flex items-center gap-2 text-neutral-700"
            >
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>Invite teammates</span>
            </button>

            <button
              id="ws-menu-settings-btn"
              type="button"
              onClick={() => {
                setShowWorkspaceMenu(false);
                onOpenSettings();
              }}
              className="w-full px-3 py-2 hover:bg-neutral-100 text-xs font-semibold flex items-center gap-2 text-neutral-700"
            >
              <Settings className="w-4 h-4 text-neutral-500" />
              <span>Workspace preferences</span>
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Navigation Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-5 dark-scrollbar">
        {/* Quick Tools */}
        <div className="space-y-0.5">
          <button
            id="quick-search-trigger-btn"
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] text-[#9E9EA6] hover:bg-[#350d36] hover:text-white transition"
          >
            <Search className="w-3.5 h-3.5 opacity-70" />
            <span>Search workspace</span>
          </button>

          <button
            id="quick-threads-btn"
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] text-[#9E9EA6] hover:bg-[#350d36] hover:text-white transition"
          >
            <MessageSquare className="w-3.5 h-3.5 opacity-70" />
            <span>Threads</span>
          </button>
        </div>

        {/* CHANNELS SECTION */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between group">
            <button
              type="button"
              onClick={() => setChannelsCollapsed(!channelsCollapsed)}
              className="flex items-center gap-1.5 focus:outline-none"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform text-[#9E9EA6] ${
                  channelsCollapsed ? '-rotate-90' : ''
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                Channels
              </span>
            </button>
            <button
              id="add-channel-plus-btn"
              type="button"
              onClick={onOpenCreateChannel}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#350d36] rounded text-[#9E9EA6] hover:text-white transition-opacity"
              title="Add channel"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {!channelsCollapsed && (
            <div className="space-y-0.5">
              {publicChannels.map((channel) => {
                const isActive = channel.id === activeChannel?.id;
                return (
                  <button
                    key={channel.id}
                    id={`sidebar-channel-${channel.name}`}
                    type="button"
                    onClick={() => selectChannel(channel.id)}
                    className={`w-full flex items-center justify-between px-3 py-1 rounded-md text-[14px] transition ${
                      isActive
                        ? 'bg-[#1164A3] text-white font-medium shadow-xs'
                        : 'text-[#9E9EA6] hover:bg-[#350d36] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center truncate">
                      <span className="opacity-50 mr-2 text-[14px] font-mono">
                        {channel.isPrivate ? '🔒' : '#'}
                      </span>
                      <span className="truncate">{channel.name}</span>
                    </div>
                    {channel.unreadCount ? (
                      <span className="bg-[#E01E5A] text-white text-[10px] font-bold px-1.5 rounded-full">
                        {channel.unreadCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}

              <button
                id="add-channels-inline-btn"
                type="button"
                onClick={onOpenCreateChannel}
                className="w-full flex items-center gap-2 px-3 py-1 rounded-md text-[13px] text-[#9E9EA6]/70 hover:bg-[#350d36] hover:text-white transition"
              >
                <span className="opacity-50 text-base leading-none">+</span>
                <span>Add channels</span>
              </button>
            </div>
          )}
        </div>

        {/* DIRECT MESSAGES SECTION */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between group">
            <button
              type="button"
              onClick={() => setDmsCollapsed(!dmsCollapsed)}
              className="flex items-center gap-1.5 focus:outline-none"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform text-[#9E9EA6] ${
                  dmsCollapsed ? '-rotate-90' : ''
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                Direct Messages
              </span>
            </button>
            <button
              id="add-dm-plus-btn"
              type="button"
              onClick={onOpenDirectMessage}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#350d36] rounded text-[#9E9EA6] hover:text-white transition-opacity"
              title="New direct message"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {!dmsCollapsed && (
            <div className="space-y-0.5 text-sm">
              {/* Connected Teammates */}
              {Array.from(peerUsers.values()).map((user) => {
                const dmChannel = directChannels.find((c) =>
                  c.members?.includes(user.pubkey)
                );
                const isActive = dmChannel && dmChannel.id === activeChannel?.id;
                const isSelf = user.pubkey === identity?.pubkey;

                return (
                  <button
                    key={user.pubkey}
                    id={`sidebar-dm-user-${user.pubkey}`}
                    type="button"
                    onClick={() => {
                      if (dmChannel) selectChannel(dmChannel.id);
                      else onOpenDirectMessage();
                    }}
                    className={`w-full flex items-center px-3 py-1 rounded-md text-[14px] transition ${
                      isActive
                        ? 'bg-[#1164A3] text-white font-medium'
                        : 'text-[#9E9EA6] hover:bg-[#350d36] hover:text-white'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${
                        user.isOnline
                          ? 'bg-[#2BAC76]'
                          : 'border border-white/30 bg-transparent'
                      }`}
                    />
                    <span className="truncate">
                      {user.displayName} {isSelf && '(you)'}
                    </span>
                  </button>
                );
              })}

              <button
                id="add-teammates-dm-btn"
                type="button"
                onClick={onOpenInvite}
                className="w-full flex items-center gap-2 px-3 py-1 rounded-md text-[13px] text-[#9E9EA6]/70 hover:bg-[#350d36] hover:text-white transition"
              >
                <span className="opacity-50 text-base leading-none">+</span>
                <span>Invite teammates</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Simulation / Demo helper */}
        <div className="pt-2 px-1">
          <button
            id="simulate-peer-quick-btn"
            type="button"
            onClick={simulatePeerMessage}
            className="w-full py-1.5 px-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 border border-white/10"
            title="Simulate peer activity for demo/testing"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Peer Message</span>
          </button>
        </div>
      </div>

      {/* Slack Huddle Action Bar at Bottom */}
      <div className="p-3 bg-[#3F0E40] border-t border-[#522653]">
        <button
          id="sidebar-start-huddle-btn"
          type="button"
          onClick={() => {
            if (activeChannel) {
              startOrJoinHuddle(activeChannel.id);
            }
          }}
          className="w-full flex items-center space-x-2 bg-[#FFFFFF15] p-2 rounded-lg cursor-pointer hover:bg-[#FFFFFF20] transition text-left focus:outline-none"
        >
          <div className="w-6 h-6 bg-[#2BAC76] rounded flex items-center justify-center flex-shrink-0">
            <Radio className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-white text-xs font-bold block">
              {huddleState.isActive ? 'In Huddle' : 'Start Huddle'}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
