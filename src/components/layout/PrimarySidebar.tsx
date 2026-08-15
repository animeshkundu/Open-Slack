import {
  Bell,
  ChevronDown,
  Globe,
  Plus,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface PrimarySidebarProps {
  onOpenCreateChannel: () => void;
  onOpenInvite: () => void;
  onOpenSettings: () => void;
  onOpenDirectMessage: () => void;
  onOpenPendingApprovals: () => void;
  onOpenWorkspaceSettings: () => void;
}

export const PrimarySidebar: React.FC<PrimarySidebarProps> = ({
  onOpenCreateChannel,
  onOpenInvite,
  onOpenSettings,
  onOpenDirectMessage,
  onOpenPendingApprovals,
  onOpenWorkspaceSettings,
}) => {
  const {
    activeWorkspace,
    channels,
    activeChannel,
    selectChannel,
    peerUsers,
    identity,
    setIsSearchOpen,
    startOrJoinHuddle,
    huddleState,
    joinRequests,
    setRightPanel,
    setShowLandingPage,
    setMobileView,
  } = useWorkspace();

  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);

  const publicChannels = channels.filter((c) => !c.isDirectMessage);
  const directChannels = channels.filter((c) => c.isDirectMessage);

  const pendingApprovalsCount = joinRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <div
      id="primary-sidebar-container"
      className="w-[260px] h-full flex flex-col flex-shrink-0 select-none border-r border-white/10 relative transition-colors"
      style={{
        backgroundColor: 'var(--theme-sidebar-bg, #3F0E40)',
        color: 'var(--theme-sidebar-text, #BCABB6)',
      }}
    >
      {/* Workspace Header Dropdown */}
      <div className="relative">
        <button
          id="workspace-header-menu-btn"
          type="button"
          onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
          className="w-full h-14 p-4 flex items-center justify-between border-b border-black/20 text-white hover:bg-black/15 transition cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-black text-base tracking-tight truncate text-white">
              {activeWorkspace?.name || 'Open Workspace'}
            </span>
            <ChevronDown className="w-4 h-4 opacity-75 flex-shrink-0" />
          </div>
        </button>

        {showWorkspaceMenu && (
          <div
            id="workspace-header-dropdown"
            className="absolute top-14 left-2 z-50 w-64 bg-white text-neutral-800 rounded-xl shadow-2xl border border-neutral-200 py-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3.5 py-2.5 border-b border-neutral-100 bg-neutral-50/70">
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
              className="w-full px-3.5 py-2 hover:bg-neutral-100 text-xs font-semibold flex items-center gap-2.5 text-neutral-700 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>Invite teammates</span>
            </button>

            <button
              id="ws-menu-pending-approvals-btn"
              type="button"
              onClick={() => {
                setShowWorkspaceMenu(false);
                onOpenPendingApprovals();
              }}
              className="w-full px-3.5 py-2 hover:bg-neutral-100 text-xs font-semibold flex items-center justify-between text-neutral-700 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Pending Approvals</span>
              </div>
              {pendingApprovalsCount > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>

            <button
              id="ws-menu-ws-settings-btn"
              type="button"
              onClick={() => {
                setShowWorkspaceMenu(false);
                onOpenWorkspaceSettings();
              }}
              className="w-full px-3.5 py-2 hover:bg-neutral-100 text-xs font-semibold flex items-center gap-2.5 text-neutral-700 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-neutral-500" />
              <span>Workspace Administration</span>
            </button>

            <div className="border-t border-neutral-100 my-1" />

            <button
              id="ws-menu-landing-page-btn"
              type="button"
              onClick={() => {
                setShowWorkspaceMenu(false);
                setShowLandingPage(true);
              }}
              className="w-full px-3.5 py-2 hover:bg-neutral-100 text-xs font-semibold flex items-center gap-2.5 text-neutral-700 cursor-pointer"
            >
              <Globe className="w-4 h-4 text-purple-600" />
              <span>Landing Page & Docs</span>
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Navigation Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4 dark-scrollbar">
        {/* Pending Approvals alert pill if any */}
        {pendingApprovalsCount > 0 && (
          <button
            id="sidebar-pending-approvals-alert"
            type="button"
            onClick={onOpenPendingApprovals}
            className="w-full px-3 py-2 bg-amber-500/20 border border-amber-400/40 rounded-lg text-xs font-bold text-amber-200 flex items-center justify-between hover:bg-amber-500/30 transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>{pendingApprovalsCount} Pending Approval{pendingApprovalsCount === 1 ? '' : 's'}</span>
            </span>
            <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[10px]">
              Review
            </span>
          </button>
        )}

        {/* Quick Tools */}
        <div className="space-y-0.5">
          <button
            id="quick-search-trigger-btn"
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs hover:bg-black/15 hover:text-white transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 opacity-70" />
            <span>Search workspace</span>
          </button>

          <button
            id="quick-activity-btn"
            type="button"
            onClick={() => setRightPanel('activity_feed')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs hover:bg-black/15 hover:text-white transition cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 opacity-70" />
            <span>Activity & Mentions</span>
          </button>
        </div>

        {/* CHANNELS SECTION */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between group">
            <button
              type="button"
              onClick={() => setChannelsCollapsed(!channelsCollapsed)}
              className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${
                  channelsCollapsed ? '-rotate-90' : ''
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-widest opacity-70">
                Channels
              </span>
            </button>
            <button
              id="add-channel-plus-btn"
              type="button"
              onClick={onOpenCreateChannel}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-black/20 rounded hover:text-white transition cursor-pointer"
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
                    onClick={() => {
                      selectChannel(channel.id);
                      setMobileView('chat');
                    }}
                    style={
                      isActive
                        ? {
                            backgroundColor: 'var(--theme-active-item-bg, #1164A3)',
                            color: 'var(--theme-sidebar-text-active, #FFFFFF)',
                          }
                        : undefined
                    }
                    className={`w-full flex items-center justify-between px-3 py-1 rounded-md text-xs sm:text-[13px] transition cursor-pointer ${
                      isActive
                        ? 'font-semibold shadow-xs'
                        : 'hover:bg-black/15 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center truncate">
                      <span className="opacity-60 mr-2 text-[13px] font-mono">
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
                className="w-full flex items-center gap-2 px-3 py-1 rounded-md text-xs opacity-80 hover:bg-black/15 hover:text-white transition cursor-pointer"
              >
                <span className="opacity-60 text-base leading-none">+</span>
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
              className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${
                  dmsCollapsed ? '-rotate-90' : ''
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-widest opacity-70">
                Direct Messages
              </span>
            </button>
            <button
              id="add-dm-plus-btn"
              type="button"
              onClick={onOpenDirectMessage}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-black/20 rounded hover:text-white transition cursor-pointer"
              title="New direct message"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {!dmsCollapsed && (
            <div className="space-y-0.5 text-xs">
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
                      if (dmChannel) {
                        selectChannel(dmChannel.id);
                        setMobileView('chat');
                      } else {
                        onOpenDirectMessage();
                      }
                    }}
                    style={
                      isActive
                        ? {
                            backgroundColor: 'var(--theme-active-item-bg, #1164A3)',
                            color: 'var(--theme-sidebar-text-active, #FFFFFF)',
                          }
                        : undefined
                    }
                    className={`w-full flex items-center px-3 py-1 rounded-md text-xs sm:text-[13px] transition cursor-pointer ${
                      isActive
                        ? 'font-semibold shadow-xs'
                        : 'hover:bg-black/15 hover:text-white'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full mr-2.5 flex-shrink-0 ${
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
                className="w-full flex items-center gap-2 px-3 py-1 rounded-md text-xs opacity-80 hover:bg-black/15 hover:text-white transition cursor-pointer"
              >
                <span className="opacity-60 text-base leading-none">+</span>
                <span>Invite teammates</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Slack Huddle Action Bar at Bottom */}
      <div className="p-3 border-t border-black/20">
        <button
          id="sidebar-start-huddle-btn"
          type="button"
          onClick={() => {
            if (activeChannel) {
              startOrJoinHuddle(activeChannel.id);
            }
          }}
          className="w-full flex items-center space-x-2 bg-white/10 p-2 rounded-lg cursor-pointer hover:bg-white/20 transition text-left focus:outline-none"
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
