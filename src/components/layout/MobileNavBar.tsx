import {
  AtSign,
  Bell,
  Hash,
  Home,
  MessageSquare,
  Sparkles,
  User,
} from 'lucide-react';
import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface MobileNavBarProps {
  onOpenSettings?: () => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({ onOpenSettings }) => {
  const {
    mobileView,
    setMobileView,
    notifications,
    identity,
    openUserProfile,
    setRightPanel,
  } = useWorkspace();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <nav
      id="mobile-nav-bar"
      data-testid="mobile-nav-bar"
      className="md:hidden h-14 box-content pb-[env(safe-area-inset-bottom)] bg-white border-t border-neutral-200 flex items-center justify-around px-2 z-30 flex-shrink-0"
    >
      {/* Home (Sidebar / Channels) */}
      <button
        id="mobile-nav-home-btn"
        type="button"
        onClick={() => {
          setMobileView('sidebar');
          setRightPanel('none');
        }}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition cursor-pointer ${
          mobileView === 'sidebar'
            ? 'text-[#4A154B] font-bold'
            : 'text-neutral-500 hover:text-neutral-800'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Home</span>
      </button>

      {/* Chat / Channels */}
      <button
        id="mobile-nav-channels-btn"
        type="button"
        onClick={() => {
          setMobileView('chat');
          setRightPanel('none');
        }}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition cursor-pointer ${
          mobileView === 'chat'
            ? 'text-[#4A154B] font-bold'
            : 'text-neutral-500 hover:text-neutral-800'
        }`}
      >
        <Hash className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Channels</span>
      </button>

      {/* Direct Messages */}
      <button
        id="mobile-nav-dms-btn"
        type="button"
        onClick={() => {
          setMobileView('dms');
          setRightPanel('none');
        }}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition cursor-pointer ${
          mobileView === 'dms'
            ? 'text-[#4A154B] font-bold'
            : 'text-neutral-500 hover:text-neutral-800'
        }`}
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">DMs</span>
      </button>

      {/* Activity Feed & Mentions */}
      <button
        id="mobile-nav-activity-btn"
        type="button"
        onClick={() => {
          setMobileView('activity');
          setRightPanel('activity_feed');
        }}
        className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-lg transition cursor-pointer ${
          mobileView === 'activity'
            ? 'text-[#4A154B] font-bold'
            : 'text-neutral-500 hover:text-neutral-800'
        }`}
      >
        <Bell className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Activity</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-2 w-4 h-4 bg-[#EC6A5E] text-white rounded-full text-[9px] font-extrabold flex items-center justify-center shadow-2xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* You / Profile & Settings */}
      <button
        id="mobile-nav-you-btn"
        type="button"
        onClick={() => {
          setMobileView('you');
          if (onOpenSettings) {
            onOpenSettings();
          } else if (identity) {
            openUserProfile(identity);
          }
        }}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition cursor-pointer ${
          mobileView === 'you'
            ? 'text-[#4A154B] font-bold'
            : 'text-neutral-500 hover:text-neutral-800'
        }`}
      >
        <User className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">You</span>
      </button>
    </nav>
  );
};
