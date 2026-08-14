import {
  Hash,
  Headphones,
  Info,
  Lock,
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
  } = useWorkspace();

  const [isStarred, setIsStarred] = useState(false);

  const isInActiveHuddle =
    huddleState.isActive && huddleState.channelId === activeChannel?.id;

  const huddleParticipantsCount = huddleState.isActive
    ? huddleState.participants.size
    : 0;

  const togglePanel = (panel: 'channel_details' | 'pinned') => {
    if (rightPanel === panel) {
      setRightPanel('none');
    } else {
      setRightPanel(panel);
    }
  };

  return (
    <div
      id="main-channel-header"
      className="h-14 border-b border-[#E8E8E8] bg-white flex items-center justify-between px-4 flex-shrink-0 z-10 select-none"
    >
      {/* Left Channel Details */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center space-x-1.5 min-w-0">
          <span className="text-gray-500 font-bold text-lg">
            {activeChannel?.isPrivate ? (
              <Lock className="w-4 h-4 text-gray-600" />
            ) : activeChannel?.isDirectMessage ? (
              <Users className="w-4 h-4 text-gray-600" />
            ) : (
              <Hash className="w-4 h-4 text-gray-600" />
            )}
          </span>
          <span className="font-black text-lg text-[#1D1C1D] truncate">
            {activeChannel?.name || 'general'}
          </span>
          <button
            id="star-channel-btn"
            type="button"
            onClick={() => setIsStarred(!isStarred)}
            className={`p-1 hover:bg-gray-100 rounded transition ${
              isStarred ? 'text-amber-500' : 'text-gray-300 hover:text-gray-600'
            }`}
            title={isStarred ? 'Unstar channel' : 'Star channel'}
          >
            <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="text-xs text-gray-500 truncate flex items-center space-x-1.5">
          <span>{peerUsers.size} {peerUsers.size === 1 ? 'member' : 'members'}</span>
          <span>•</span>
          <span className="truncate">
            {activeChannel?.topic || 'Decentralized P2P Workspace'}
          </span>
        </div>
      </div>

      {/* Center Search Bar Trigger */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <button
          id="header-search-bar-trigger"
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-[#F8F8F8] hover:bg-gray-100 border border-[#E8E8E8] rounded-lg text-xs text-gray-500 transition group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
            <span>Search {activeWorkspace?.name || 'workspace'}</span>
          </div>
          <kbd className="text-[10px] font-mono bg-white border border-[#E8E8E8] px-1.5 py-0.5 rounded text-gray-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Action Icons & Huddle Button */}
      <div className="flex items-center space-x-3">
        {/* Huddle Button */}
        {activeChannel && (
          <button
            id="channel-huddle-btn"
            type="button"
            onClick={() => startOrJoinHuddle(activeChannel.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              isInActiveHuddle
                ? 'bg-[#2BAC76] text-white hover:bg-[#249666]'
                : 'bg-[#F8F8F8] hover:bg-gray-100 text-neutral-800 border border-[#E8E8E8]'
            }`}
            title="Start or join WebRTC P2P Huddle"
          >
            <Headphones className="w-3.5 h-3.5 text-[#2BAC76]" />
            <span>Huddle</span>
            {huddleParticipantsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#2BAC76] text-white text-[10px]">
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
          className="flex -space-x-1 items-center hover:opacity-80 transition cursor-pointer"
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
            <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-[9px] font-bold text-gray-700">
              +{peerUsers.size - 2}
            </div>
          )}
        </button>

        {/* Pinned Messages Button */}
        <button
          id="channel-pinned-btn"
          type="button"
          onClick={() => togglePanel('pinned')}
          className={`h-8 w-8 rounded flex items-center justify-center transition cursor-pointer ${
            rightPanel === 'pinned'
              ? 'bg-gray-100 text-neutral-900'
              : 'hover:bg-gray-100 text-gray-500 hover:text-neutral-900'
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
          className={`h-8 w-8 rounded flex items-center justify-center transition cursor-pointer ${
            rightPanel === 'channel_details'
              ? 'bg-gray-100 text-neutral-900'
              : 'hover:bg-gray-100 text-gray-500 hover:text-neutral-900'
          }`}
          title="Channel details"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
