import {
  AtSign,
  Bell,
  Check,
  CheckCheck,
  Hash,
  MessageSquare,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface ActivityFeedDrawerProps {
  onClose: () => void;
  /** `page` = mobile bottom-tab surface (keep nav, hide drawer chrome) */
  variant?: 'drawer' | 'page';
}

export const ActivityFeedDrawer: React.FC<ActivityFeedDrawerProps> = ({
  onClose,
  variant = 'drawer',
}) => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    selectChannel,
    peerUsers,
    channels,
    setRightPanel,
    setMobileView,
  } = useWorkspace();

  const isPage = variant === 'page';

  const handleNotificationClick = (notif: (typeof notifications)[0]) => {
    markNotificationAsRead(notif.id);
    if (notif.channelId) {
      selectChannel(notif.channelId);
    }
    setRightPanel('none');
    setMobileView('chat');
  };

  return (
    <div
      id={isPage ? 'mobile-activity-feed-drawer' : 'activity-feed-drawer'}
      data-testid={isPage ? 'mobile-activity-feed-drawer' : 'activity-feed-drawer'}
      data-variant={variant}
      className="h-full min-h-0 flex flex-col bg-white"
    >
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-neutral-900">
              {isPage ? 'Activity' : 'Activity & Mentions'}
            </h3>
            <p className="text-[11px] text-neutral-500">
              {notifications.length} notification{notifications.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {notifications.length > 0 && (
            <>
              <button
                id="mark-all-read-btn"
                type="button"
                onClick={markAllNotificationsAsRead}
                title="Mark all as read"
                className="p-1.5 hover:bg-neutral-200 text-neutral-600 rounded-lg transition"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                id="clear-all-notifs-btn"
                type="button"
                onClick={clearNotifications}
                title="Clear all"
                className="p-1.5 hover:bg-neutral-200 text-neutral-600 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {!isPage && (
            <button
              id="close-activity-drawer-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
        {notifications.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-neutral-700">All caught up!</div>
            <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
              When teammates mention you with @handle, reply to your threads, or react to your messages, they'll appear here.
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const actor = peerUsers.get(notif.actorId);
            const displayName = actor?.displayName || notif.actorName || 'Teammate';
            const avatarUrl = actor?.avatarUrl || notif.actorAvatar;
            const channel = channels.find((c) => c.id === notif.channelId);

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 hover:bg-neutral-50 cursor-pointer transition flex items-start gap-3 ${
                  !notif.isRead ? 'bg-amber-50/40' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-8 h-8 rounded-lg border border-neutral-200 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-700">
                      {displayName.slice(0, 2).toUpperCase() || '??'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] shadow-xs">
                    {notif.type === 'mention' ? <AtSign className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-neutral-900 truncate">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-700 font-medium line-clamp-2 mt-0.5">
                    {notif.contentSnippet || 'Mentioned you in a message'}
                  </p>

                  <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500 font-mono">
                    {channel && (
                      <span className="flex items-center gap-0.5 text-neutral-600 font-sans font-semibold">
                        <Hash className="w-3 h-3" /> {channel.name}
                      </span>
                    )}
                    {!notif.isRead && (
                      <span className="inline-block px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-bold">
                        NEW
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
