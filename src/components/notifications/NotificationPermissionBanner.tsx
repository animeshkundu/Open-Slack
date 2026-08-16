import { AnimatePresence, motion } from 'motion/react';
import { Bell, Check, Sparkles, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  getNotificationPermissionStatus,
  isNotificationSupported,
  requestNotificationPermission,
  showBrowserNotification,
} from '../../lib/notifications';

export const NotificationPermissionBanner: React.FC = () => {
  const { preferences, updatePreferences, triggerToast } = useWorkspace();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isNotificationSupported()) {
      setPermission(getNotificationPermissionStatus());
    }
  }, []);

  // Do not display if unsupported, already granted/denied, or user dismissed
  if (
    !isNotificationSupported() ||
    permission !== 'default' ||
    preferences.notificationBannerDismissed ||
    isDismissed
  ) {
    return null;
  }

  const handleEnable = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      updatePreferences({ desktopNotifications: 'all', notificationBannerDismissed: true });
      showBrowserNotification('🔔 Open-Slack Notifications Enabled', {
        body: 'You will now receive desktop alerts for messages, mentions, and huddles.',
        tag: 'notification-welcome',
      });
      triggerToast({
        authorName: 'Slack Notifications',
        channelName: 'System',
        content: 'Desktop and push notifications successfully enabled!',
        type: 'system',
      });
    } else {
      updatePreferences({ notificationBannerDismissed: true });
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    updatePreferences({ notificationBannerDismissed: true });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        id="notification-permission-banner"
        className="bg-gradient-to-r from-blue-900/90 to-indigo-950/95 text-white border-b border-blue-700/50 
                   px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 z-30 shadow-md"
        role="region"
        aria-label="Notification Permission Banner"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 text-blue-300">
            <Bell className="w-3.5 h-3.5 animate-bounce" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-blue-100">Enable Desktop & Activity Notifications: </span>
            <span className="text-blue-200">
              Get notified immediately on incoming messages, @mentions, reactions, and huddles.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
          <button
            type="button"
            id="dismiss-notification-banner-btn"
            onClick={handleDismiss}
            className="px-2.5 py-1 text-[11px] font-medium text-blue-200 hover:text-white hover:bg-blue-800/40 rounded transition cursor-pointer"
          >
            Not now
          </button>
          <button
            type="button"
            id="enable-notifications-banner-btn"
            onClick={handleEnable}
            className="px-3 py-1 bg-[#007A5A] hover:bg-[#148567] text-white font-bold rounded-md text-xs transition flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Check className="w-3 h-3" />
            <span>Enable Notifications</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-blue-300 hover:text-white p-1 rounded hover:bg-blue-800/30 transition cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
