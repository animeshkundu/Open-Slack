import {
  Bell,
  ChevronLeft,
  Hash,
  Headphones,
  Info,
  Lock,
  Menu,
  Pin,
  Search,
  Star,
  UserPlus,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface MainHeaderProps {
  onOpenInvite: () => void;
}

export const MainHeader: React.FC<MainHeaderProps> = ({ onOpenInvite }) => {
  const {
    activeChannel,
    activeWorkspace,
    setIsSearchOpen,
    rightPanel,
    setRightPanel,
    huddleState,
    startOrJoinHuddle,
    peerUsers,
    notifications,
    setMobileView,
  } = useWorkspace();

  const [isStarred, setIsStarred] = useState(false);

  const isInActiveHuddle =
    huddleState.isActive && huddleState.channelId === activeChannel?.id;

  const huddleParticipantsCount = huddleState.isActive
    ? huddleState.participants.size
    : 0;

  const unreadNotifs = notifications.filter((n) => !n.isRead).length;

  const togglePanel = (panel: 'channel_details' | 'pinned' | 'activity_feed') => {
    if (rightPanel === panel) {
      setRightPanel('none');
    } else {
      setRightPanel(panel);
    }
  };

  return (
    <div
      id="main-channel-header"
      className="h-14 border-b border-neutral-200 bg-white flex items-center justify-between px-3 sm:px-4 flex-shrink-0 z-10 select-none"
    >
      {/* Left Channel Details & Mobile Back Button */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile Back / Menu button */}
        <button
          id="mobile-back-to-sidebar-btn"
          type="button"
          onClick={() => setMobileView('sidebar')}
          className="md:hidden p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-600 focus:outline-none"
          title="Back to channels"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center space-x-1.5 min-w-0">
            <span className="text-neutral-500 font-bold text-base sm:text-lg">
              {activeChannel?.isPrivate ? (
                <Lock className="w-4 h-4 text-neutral-600" />
              ) : activeChannel?.isDirectMessage ? (
                <Users className="w-4 h-4 text-neutral-600" />
              ) : (
                <Hash className="w-4 h-4 text-neutral-600" />
              )}
            </span>
            <span className="font-black text-sm sm:text-base text-neutral-900 truncate">
              {activeChannel?.name || 'general'}
            </span>
            <button
              id="star-channel-btn"
              type="button"
              onClick={() => setIsStarred(!isStarred)}
              className={`p-1 hover:bg-neutral-100 rounded transition ${
                isStarred ? 'text-amber-500' : 'text-neutral-300 hover:text-neutral-600'
              }`}
              title={isStarred ? 'Unstar channel' : 'Star channel'}
            >
              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="text-[11px] text-neutral-500 truncate hidden sm:flex items-center space-x-1.5">
            <span>{peerUsers.size} {peerUsers.size === 1 ? 'member' : 'members'}</span>
            <span>•</span>
            <span className="truncate">
              {activeChannel?.topic || 'Decentralized P2P Workspace'}
            </span>
          </div>
        </div>
      </div>

      {/* Center Search Bar Trigger */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4 hidden lg:block">
        <button
          id="header-search-bar-trigger"
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg text-xs text-neutral-500 transition group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600" />
            <span>Search {activeWorkspace?.name || 'workspace'}</span>
          </div>
          <kbd className="text-[10px] font-mono bg-white border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Action Icons & Huddle Button */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Activity & Mentions trigger button */}
        <button
          id="header-activity-btn"
          type="button"
          onClick={() => togglePanel('activity_feed')}
          className={`relative p-2 rounded-lg transition cursor-pointer ${
            rightPanel === 'activity_feed'
              ? 'bg-neutral-100 text-neutral-900'
              : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
          }`}
          title="Activity & Mentions feed"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifs > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
          )}
        </button>

        {/* Huddle Button */}
        {activeChannel && (
          <button
            id="channel-huddle-btn"
            type="button"
            onClick={() => startOrJoinHuddle(activeChannel.id)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              isInActiveHuddle
                ? 'bg-[#007a5a] text-white hover:bg-[#148567]'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200'
            }`}
            title="Start or join WebRTC P2P Huddle"
          >
            <Headphones className="w-3.5 h-3.5 text-[#007a5a]" />
            <span className="hidden sm:inline">Huddle</span>
            {huddleParticipantsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#007a5a] text-white text-[10px]">
                {huddleParticipantsCount}
              </span>
            )}
          </button>
        )}

        {/* Member Avatars Stack */}
        <button
          id="channel-members-stack-btn"
          type="button"
          onClick={() => togglePanel('channel_details')}
          className="hidden sm:flex -space-x-1 items-center hover:opacity-80 transition cursor-pointer"
          title="View channel members"
        >
          {Array.from(peerUsers.values())
            .slice(0, 2)
            .map((u) => (
              <div
                key={u.pubkey}
                className="w-6 h-6 rounded-full border-2 border-white overflow-hidden"
              >
                {u.avatarUrl ? (
                  <img
                    src={u.avatarUrl}
                    alt={u.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-[9px] text-white font-bold"
                    style={{ backgroundColor: u.color }}
                  >
                    {u.displayName[0]}
                  </div>
                )}
              </div>
            ))}
          {peerUsers.size > 2 && (
            <div className="w-6 h-6 rounded-full bg-neutral-300 border-2 border-white flex items-center justify-center text-[9px] font-bold text-neutral-700">
              +{peerUsers.size - 2}
            </div>
          )}
        </button>

        {/* Pinned Messages Button */}
        <button
          id="channel-pinned-btn"
          type="button"
          onClick={() => togglePanel('pinned')}
          className={`h-8 w-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
            rightPanel === 'pinned'
              ? 'bg-neutral-100 text-neutral-900'
              : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
          }`}
          title="Pinned messages"
        >
          <Pin className="w-4 h-4" />
        </button>

        {/* Details Drawer Toggle */}
        <button
          id="channel-details-btn"
          type="button"
          onClick={() => togglePanel('channel_details')}
          className={`h-8 w-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
            rightPanel === 'channel_details'
              ? 'bg-neutral-100 text-neutral-900'
              : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
          }`}
          title="Channel details"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
