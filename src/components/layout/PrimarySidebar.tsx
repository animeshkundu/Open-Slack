import {
  AtSign,
  Bell,
  CheckCircle2,
  ChevronDown,
  Globe,
  Hash,
  Headphones,
  Lock,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
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
    workspaces,
    switchWorkspace,
    channels,
    activeChannel,
    selectChannel,
    leaveChannel,
    peerUsers,
    identity,
    setIsSearchOpen,
    huddleState,
    leaveHuddle,
    toggleHuddleMute,
    joinRequests,
    rightPanel,
    setRightPanel,
    notifications,
    setShowLandingPage,
    setMobileView,
    toggleSidebar,
  } = useWorkspace();

  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null);

  // Close workspace menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(e.target as Node)) {
        setShowWorkspaceMenu(false);
      }
    };
    if (showWorkspaceMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showWorkspaceMenu]);

  const publicChannels = channels.filter(
    (c) => !c.isDirectMessage && (!c.isPrivate || !c.members || !identity || c.members.includes(identity.pubkey))
  );
  const directChannels = channels.filter(
    (c) => c.isDirectMessage && (!c.members || !identity || c.members.includes(identity.pubkey))
  );

  const pendingApprovalsCount = joinRequests.filter((r) => r.status === 'PENDING').length;
  const unreadNotifs = notifications.filter((n) => !n.isRead).length;
  const huddleChannel = channels.find((c) => c.id === huddleState.channelId);

  return (
    <div
      id="primary-sidebar-container"
      className="w-full md:w-[260px] h-full flex flex-col flex-shrink-0 select-none border-r border-white/10 relative transition-colors"
      style={{
        backgroundColor: 'var(--theme-sidebar-bg, #3F0E40)',
        color: 'var(--theme-sidebar-text, #BCABB6)',
      }}
    >
      {/* Workspace Header Dropdown */}
      <div ref={workspaceMenuRef} className="relative border-b border-black/20 flex items-center justify-between">
        <button
          id="workspace-header-menu-btn"
          type="button"
          onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
          className="w-full h-14 p-4 flex items-center justify-between text-white hover:bg-black/15 transition cursor-pointer min-w-0"
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
            className="absolute top-14 left-2 z-50 w-72 bg-white text-neutral-800 rounded-xl shadow-2xl border border-neutral-200 py-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col"
          >
            {/* Desktop-Style Workspace List (Only visible on mobile in this menu) */}
            <div className="md:hidden px-3.5 py-2.5 border-b border-neutral-100">
              <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">
                Your Workspaces
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {workspaces.map((ws) => {
                  const isActive = ws.id === activeWorkspace?.id;
                  const initials = ws.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => {
                        switchWorkspace(ws.id);
                        setShowWorkspaceMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition text-left cursor-pointer ${
                        isActive ? 'bg-neutral-100 border border-neutral-200' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm"
                        style={{ backgroundColor: isActive ? '#4A154B' : '#611f69' }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs truncate ${isActive ? 'font-bold text-neutral-900' : 'text-neutral-600'}`}>
                          {ws.name}
                        </div>
                        {isActive && <div className="text-[9px] text-[#007A5A] font-bold">Active Now</div>}
                      </div>
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#007A5A]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="py-1">
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
                <span>Invite teammates to {activeWorkspace?.name}</span>
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
            </div>

            <div className="border-t border-neutral-100 my-1" />

            <div className="py-1">
              <button
                id="ws-menu-landing-page-btn"
                type="button"
                onClick={() => {
                  setShowWorkspaceMenu(false);
                  setShowLandingPage(true);
                }}
                className="w-full px-3.5 py-2 hover:bg-red-50 text-xs font-semibold flex items-center gap-2.5 text-red-600 hover:text-red-700 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out of Open-Slack</span>
              </button>
            </div>
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

        {/* Slack-Style Primary Navigation Items */}
        <div className="space-y-0.5 mb-3">
          <button
            id="quick-activity-btn"
            type="button"
            onClick={() => {
              // On phone, Activity is a bottom-tab surface - never cover MobileNavBar
              // with the full-viewport right drawer.
              const isPhone =
                typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
              if (isPhone) {
                setRightPanel('none');
                setMobileView('activity');
                return;
              }
              setRightPanel(rightPanel === 'activity_feed' ? 'none' : 'activity_feed');
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition cursor-pointer ${
              rightPanel === 'activity_feed'
                ? 'bg-black/30 text-white font-bold'
                : 'hover:bg-black/15 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AtSign className="w-3.5 h-3.5 opacity-85 text-amber-300" />
              <span>Activity & Mentions</span>
            </div>
            {unreadNotifs > 0 && (
              <span className="px-1.5 py-0.2 bg-[#E01E5A] text-white rounded-full text-[10px] font-bold shadow-xs">
                {unreadNotifs}
              </span>
            )}
          </button>

          <button
            id="quick-threads-btn"
            type="button"
            onClick={() => {
              const isPhone =
                typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
              if (isPhone) {
                setRightPanel('thread');
                setMobileView('thread');
                return;
              }
              setRightPanel(rightPanel === 'thread' ? 'none' : 'thread');
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition cursor-pointer ${
              rightPanel === 'thread'
                ? 'bg-black/30 text-white font-bold'
                : 'hover:bg-black/15 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-3.5 h-3.5 opacity-85 text-blue-300" />
              <span>Threads</span>
            </div>
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
                const isChannelInHuddle = huddleState.isActive && huddleState.channelId === channel.id;
                const canLeave = channel.id !== 'chan_general' && channel.isPrivate;

                return (
                  <div
                    key={channel.id}
                    className="relative group/chan flex items-center"
                  >
                    <button
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
                      <div className="flex items-center truncate pr-2">
                        <span className="opacity-60 mr-2 text-[13px] font-mono">
                          {channel.isPrivate ? '🔒' : '#'}
                        </span>
                        <span className="truncate">{channel.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isChannelInHuddle && (
                          <span className="w-2 h-2 rounded-full bg-[#2BAC76] animate-pulse" title="Active huddle in progress" />
                        )}
                        {channel.unreadCount ? (
                          <span className="bg-[#E01E5A] text-white text-[10px] font-bold px-1.5 rounded-full">
                            {channel.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </button>

                    {canLeave && (
                      <button
                        id={`leave-channel-btn-${channel.name}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          leaveChannel(channel.id);
                        }}
                        className="absolute right-2 opacity-0 group-hover/chan:opacity-100 p-0.5 hover:bg-black/30 rounded text-white/70 hover:text-white transition"
                        title="Leave private channel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
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

        {/* DIRECT MESSAGES & GROUP CHATS SECTION */}
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
              title="New direct message or group chat"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {!dmsCollapsed && (
            <div className="space-y-0.5 text-xs">
              {/* Render Existing DM Channels (1-on-1 and Group DMs) */}
              {directChannels.map((dmChan) => {
                const isActive = dmChan.id === activeChannel?.id;
                const membersCount = dmChan.members?.length || 0;
                const isGroupDm = membersCount > 2;

                return (
                  <div
                    key={dmChan.id}
                    className="relative group/dm flex items-center"
                  >
                    <button
                      id={`sidebar-dm-${dmChan.id}`}
                      type="button"
                      onClick={() => {
                        selectChannel(dmChan.id);
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
                      <div className="flex items-center truncate pr-4">
                        {isGroupDm ? (
                          <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center mr-2 flex-shrink-0">
                            <Users className="w-2.5 h-2.5 text-white" />
                          </div>
                        ) : (
                          <div className="w-2 h-2 rounded-full mr-2.5 flex-shrink-0 bg-[#2BAC76]" />
                        )}
                        <span className="truncate">{dmChan.name}</span>
                      </div>

                      {isGroupDm && (
                        <span className="text-[10px] opacity-60 font-mono font-bold mr-1">
                          {membersCount}
                        </span>
                      )}
                    </button>

                    <button
                      id={`leave-dm-btn-${dmChan.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        leaveChannel(dmChan.id);
                      }}
                      className="absolute right-2 opacity-0 group-hover/dm:opacity-100 p-0.5 hover:bg-black/30 rounded text-white/70 hover:text-white transition cursor-pointer"
                      title={isGroupDm ? 'Leave group conversation' : 'Close direct message'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {directChannels.length === 0 && (
                <div className="px-3 py-1 text-[11px] opacity-60 italic">
                  No active direct messages
                </div>
              )}

              <button
                id="add-dm-inline-btn"
                type="button"
                onClick={onOpenDirectMessage}
                className="w-full flex items-center gap-2 px-3 py-1 rounded-md text-xs opacity-80 hover:bg-black/15 hover:text-white transition cursor-pointer"
              >
                <span className="opacity-60 text-base leading-none">+</span>
                <span>Add direct message</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pinned Bottom Footer: Workspace Invite */}
      <div className="p-2 border-t border-white/10 mt-auto flex-shrink-0">
        <button
          id="sidebar-invite-teammates-btn"
          type="button"
          onClick={onOpenInvite}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold opacity-80 hover:opacity-100 hover:bg-black/15 hover:text-white transition cursor-pointer"
          title="Invite people to this workspace"
        >
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-4 h-4 opacity-75" />
            <span>Invite people</span>
          </div>
          {peerUsers.size === 0 && (
            <span className="relative flex h-2 w-2 mr-1" title="Waiting for teammates">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
          )}
        </button>
      </div>

      {/* Live Active Huddle Widget (Displayed ONLY when in an active call) */}
      {huddleState.isActive && (
        <div
          id="sidebar-active-huddle-bar"
          className="p-2.5 m-2 bg-[#2BAC76]/20 border border-[#2BAC76]/40 rounded-xl backdrop-blur-xs text-white animate-in slide-in-from-bottom-2 duration-150 shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full bg-[#2BAC76] flex items-center justify-center text-white flex-shrink-0 animate-pulse">
                <Headphones className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate text-white leading-tight">
                  #{huddleChannel?.name || 'huddle'}
                </div>
                <div className="text-[9.5px] text-emerald-200">
                  {huddleState.participants.size} in call
                </div>
              </div>
            </div>

            {/* Speaking audio wave indicator */}
            <div className="flex items-end gap-0.5 h-3 px-1">
              <span className="w-0.5 h-2 bg-[#2BAC76] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-0.5 h-3 bg-[#2BAC76] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-0.5 h-1.5 bg-[#2BAC76] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>

          {/* Quick controls */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
            <button
              id="sidebar-huddle-mute-toggle"
              type="button"
              onClick={toggleHuddleMute}
              className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                huddleState.isMuted
                  ? 'bg-red-500/30 text-red-200 border border-red-400/40 hover:bg-red-500/40'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              {huddleState.isMuted ? (
                <>
                  <MicOff className="w-3 h-3 text-red-300" />
                  <span>Unmute</span>
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3 text-emerald-300" />
                  <span>Mute</span>
                </>
              )}
            </button>

            <button
              id="sidebar-huddle-leave-btn"
              type="button"
              onClick={leaveHuddle}
              className="py-1 px-2.5 rounded-md bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
              title="Leave call"
            >
              <PhoneOff className="w-3 h-3" />
              <span>Leave</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

