import {
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  Download,
  Hash,
  Headphones,
  Info,
  Lock,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Pin,
  Search,
  Share2,
  Star,
  UserPlus,
  Users,
  Video,
  VideoOff,
  WifiOff,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { usePWAInstall } from '../../lib/usePWAInstall';

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
    leaveHuddle,
    toggleHuddleMute,
    toggleHuddleVideo,
    toggleHuddleScreenShare,
    peerUsers,
    notifications,
    setMobileView,
  } = useWorkspace();

  const { isInstallable, installApp, isOffline } = usePWAInstall();
  const [isStarred, setIsStarred] = useState(false);
  const [showHuddleMenu, setShowHuddleMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const huddleMenuRef = useRef<HTMLDivElement | null>(null);

  const isInActiveHuddle =
    huddleState.isActive && huddleState.channelId === activeChannel?.id;

  const huddleParticipantsCount = huddleState.isActive
    ? huddleState.participants.size
    : 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (huddleMenuRef.current && !huddleMenuRef.current.contains(e.target as Node)) {
        setShowHuddleMenu(false);
      }
    };
    if (showHuddleMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHuddleMenu]);

  const handleStartScreenShare = async () => {
    setShowHuddleMenu(false);
    if (!activeChannel) return;
    if (!huddleState.isActive) {
      await startOrJoinHuddle(activeChannel.id);
    }
    await toggleHuddleScreenShare();
  };

  const handleCopyHuddleLink = () => {
    if (!activeWorkspace || !activeChannel) return;
    const payloadStr = btoa(JSON.stringify(activeWorkspace));
    const huddleUrl = `${window.location.origin}${window.location.pathname}#invite=${payloadStr}&huddle=${encodeURIComponent(activeChannel.name)}`;
    navigator.clipboard.writeText(huddleUrl);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setShowHuddleMenu(false);
    }, 1500);
  };

  const unreadNotifs = notifications.filter((n) => !n.isRead).length;

  const togglePanel = (panel: 'channel_details' | 'pinned' | 'activity_feed') => {
    if (rightPanel === panel) {
      setRightPanel('none');
    } else {
      setRightPanel(panel);
    }
  };

  return (
    <div className="flex flex-col flex-shrink-0 z-10 select-none">
      {/* Offline Alert Banner */}
      {isOffline && (
        <div
          id="offline-mesh-banner"
          className="bg-amber-600 text-white text-[11px] font-bold px-3 py-1 flex items-center justify-center gap-1.5 shadow-xs"
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are offline. Messages will sync over P2P mesh when reconnected.</span>
        </div>
      )}

      {/* Main Header Row */}
      <div
        id="main-channel-header"
        className="h-14 border-b border-neutral-200 bg-white flex items-center justify-between px-3 sm:px-4 gap-2"
      >
        {/* Left Channel Details & Mobile Back Button */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile Back / Menu button */}
          <button
            id="mobile-back-to-sidebar-btn"
            type="button"
            onClick={() => setMobileView('sidebar')}
            className="md:hidden p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-600 focus:outline-none cursor-pointer"
            title="Back to channels"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-1.5 min-w-0">
              <span className="text-neutral-500 font-bold text-base sm:text-lg flex-shrink-0">
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
                className={`p-1 hover:bg-neutral-100 rounded transition cursor-pointer flex-shrink-0 ${
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
        <div className="flex-1 max-w-sm sm:max-w-md mx-auto hidden md:block">
          <button
            id="header-search-bar-trigger"
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-neutral-100/70 hover:bg-neutral-200/60 border border-neutral-200/80 rounded-lg text-xs text-neutral-500 transition group cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 flex-shrink-0" />
              <span className="truncate">Search {activeWorkspace?.name || 'workspace'}</span>
            </div>
            <kbd className="text-[10px] font-mono bg-white border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-400 flex-shrink-0 ml-2 shadow-2xs">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Action Icons & Huddle Pill */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0">
          {/* Mobile Search Button (< md) */}
          <button
            id="mobile-header-search-btn"
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition cursor-pointer"
            title="Search workspace"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* PWA Install Button (if available) */}
          {isInstallable && (
            <button
              id="header-pwa-install-btn"
              type="button"
              onClick={installApp}
              className="px-2.5 py-1 bg-[#4A154B] hover:bg-[#611f69] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Install Desktop/Mobile Open-Slack App"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Install</span>
            </button>
          )}

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

          {/* Canonical Slack-Style Huddle Button Pill with Dropdown */}
          {activeChannel && (
            <div ref={huddleMenuRef} className="relative">
              <div
                className={`inline-flex items-center rounded-lg border transition shadow-2xs overflow-hidden ${
                  isInActiveHuddle
                    ? 'bg-[#007a5a] text-white border-[#007a5a]'
                    : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200'
                }`}
              >
                {/* Main Huddle Toggle Button */}
                <button
                  id="channel-huddle-btn"
                  type="button"
                  onClick={() => startOrJoinHuddle(activeChannel.id)}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    isInActiveHuddle
                      ? 'hover:bg-[#148567]'
                      : 'hover:text-neutral-900'
                  }`}
                  title={isInActiveHuddle ? 'Huddle active in this channel' : 'Start or join audio huddle'}
                >
                  <Headphones className={`w-3.5 h-3.5 ${isInActiveHuddle ? 'text-white animate-pulse' : 'text-[#007a5a]'}`} />
                  <span>{isInActiveHuddle ? 'In Huddle' : 'Huddle'}</span>
                  {huddleParticipantsCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isInActiveHuddle ? 'bg-white/25 text-white' : 'bg-[#007a5a] text-white'
                      }`}
                    >
                      {huddleParticipantsCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Chevron Trigger */}
                <button
                  id="channel-huddle-dropdown-trigger"
                  type="button"
                  onClick={() => setShowHuddleMenu(!showHuddleMenu)}
                  className={`px-1.5 py-1.5 border-l transition cursor-pointer ${
                    isInActiveHuddle
                      ? 'border-white/20 hover:bg-[#148567] text-white'
                      : 'border-neutral-200 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800'
                  }`}
                  title="Huddle options"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Polished Slack-Style Huddle Context Menu */}
              {showHuddleMenu && (
                <div
                  id="huddle-dropdown-menu"
                  className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-neutral-200 py-1.5 z-50 text-xs font-medium text-neutral-800 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-3.5 py-2 border-b border-neutral-100 bg-neutral-50/70">
                    <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-[#007a5a]" />
                      <span>#{activeChannel.name} Huddle</span>
                    </div>
                    <div className="text-[10.5px] text-neutral-500">
                      {isInActiveHuddle
                        ? `${huddleParticipantsCount} connected peer${huddleParticipantsCount === 1 ? '' : 's'}`
                        : 'WebRTC encrypted audio/video'}
                    </div>
                  </div>

                  {!isInActiveHuddle ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowHuddleMenu(false);
                          startOrJoinHuddle(activeChannel.id);
                        }}
                        className="w-full px-3.5 py-2 hover:bg-neutral-100 flex items-center gap-2.5 text-neutral-800 cursor-pointer"
                      >
                        <Headphones className="w-4 h-4 text-[#007a5a]" />
                        <span>Start Audio Huddle</span>
                      </button>

                      <button
                        id="huddle-menu-screenshare-btn"
                        type="button"
                        onClick={handleStartScreenShare}
                        className="w-full px-3.5 py-2 hover:bg-neutral-100 flex items-center gap-2.5 text-neutral-800 cursor-pointer"
                      >
                        <Monitor className="w-4 h-4 text-emerald-600" />
                        <span>Start with Screen Share</span>
                      </button>

                      <div className="border-t border-neutral-100 my-1" />

                      <button
                        type="button"
                        onClick={handleCopyHuddleLink}
                        className="w-full px-3.5 py-2 hover:bg-neutral-100 flex items-center justify-between text-neutral-700 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Share2 className="w-4 h-4 text-blue-600" />
                          <span>Copy Huddle Link</span>
                        </div>
                        {copiedLink && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowHuddleMenu(false);
                          onOpenInvite();
                        }}
                        className="w-full px-3.5 py-2 hover:bg-neutral-100 flex items-center gap-2.5 text-neutral-700 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4 text-purple-600" />
                        <span>Invite Teammates...</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowHuddleMenu(false);
                          toggleHuddleScreenShare();
                        }}
                        className="w-full px-3.5 py-2 hover:bg-neutral-100 flex items-center gap-2.5 text-neutral-800 cursor-pointer"
                      >
                        <Monitor className="w-4 h-4 text-emerald-600" />
                        <span>{huddleState.isScreenSharing ? 'Stop Screen Sharing' : 'Share Your Screen'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowHuddleMenu(false);
                          toggleHuddleMute();
                        }}
                        className="w-full px-3.5 py-2 hover:bg-neutral-100 flex items-center gap-2.5 text-neutral-800 cursor-pointer"
                      >
                        {huddleState.isMuted ? (
                          <>
                            <MicOff className="w-4 h-4 text-red-500" />
                            <span>Unmute Microphone</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 text-emerald-600" />
                            <span>Mute Microphone</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowHuddleMenu(false);
                          toggleHuddleVideo();
                        }}
                        className="w-full px-3.5 py-2 hover:bg-neutral-100 flex items-center gap-2.5 text-neutral-800 cursor-pointer"
                      >
                        {huddleState.isVideoOn ? (
                          <>
                            <VideoOff className="w-4 h-4 text-red-500" />
                            <span>Turn Off Camera</span>
                          </>
                        ) : (
                          <>
                            <Video className="w-4 h-4 text-neutral-600" />
                            <span>Turn On Camera</span>
                          </>
                        )}
                      </button>

                      <div className="border-t border-neutral-100 my-1" />

                      <button
                        type="button"
                        onClick={handleCopyHuddleLink}
                        className="w-full px-3.5 py-2 hover:bg-neutral-100 flex items-center justify-between text-neutral-700 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Share2 className="w-4 h-4 text-blue-600" />
                          <span>Copy Huddle Link</span>
                        </div>
                        {copiedLink && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowHuddleMenu(false);
                          onOpenInvite();
                        }}
                        className="w-full px-3.5 py-2 hover:bg-neutral-100 flex items-center gap-2.5 text-neutral-700 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4 text-purple-600" />
                        <span>Invite Teammates...</span>
                      </button>

                      <div className="border-t border-neutral-100 my-1" />

                      <button
                        type="button"
                        onClick={() => {
                          setShowHuddleMenu(false);
                          leaveHuddle();
                        }}
                        className="w-full px-3.5 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2.5 font-bold cursor-pointer"
                      >
                        <PhoneOff className="w-4 h-4" />
                        <span>Leave Huddle</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Member Avatars Stack */}
          <button
            id="channel-members-stack-btn"
            type="button"
            onClick={() => togglePanel('channel_details')}
            className="hidden sm:flex -space-x-1 items-center hover:opacity-80 transition cursor-pointer px-1 py-1"
            title="View channel members"
          >
            {Array.from(peerUsers.values())
              .slice(0, 2)
              .map((u) => (
                <div
                  key={u.pubkey}
                  className="w-6 h-6 rounded-full border-2 border-white overflow-hidden shadow-2xs"
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
              <div className="w-6 h-6 rounded-full bg-neutral-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-neutral-700 shadow-2xs">
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
    </div>
  );
};

