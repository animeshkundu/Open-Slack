import { Bell, Camera, Mic, Monitor, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { requestNotificationPermission } from '../../lib/notifications';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({ isOpen, onClose }) => {
  const { preferences, updatePreferences, triggerToast } = useWorkspace();

  // Permission states for toggles
  const [permissionsState, setPermissionsState] = useState({
    camera: false,
    microphone: false,
    desktop_sharing: false,
    notifications: false,
  });

  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Sync state from browser API and preferences on mount / open
  useEffect(() => {
    if (isOpen) {
      const checkInitialStatus = async () => {
        const initialState = {
          camera: !!preferences.cameraAllowed,
          microphone: !!preferences.microphoneAllowed,
          desktop_sharing: !!preferences.screenShareAllowed,
          notifications: !!preferences.notificationsAllowed,
        };

        if (navigator.permissions) {
          try {
            const cam = await navigator.permissions.query({ name: 'camera' as any }).catch(() => null);
            const mic = await navigator.permissions.query({ name: 'microphone' as any }).catch(() => null);
            const notif = await navigator.permissions.query({ name: 'notifications' as any }).catch(() => null);

            if (cam) initialState.camera = cam.state === 'granted' || !!preferences.cameraAllowed;
            if (mic) initialState.microphone = mic.state === 'granted' || !!preferences.microphoneAllowed;
            if (notif) initialState.notifications = (notif.state === 'granted' || Notification.permission === 'granted') || !!preferences.notificationsAllowed;
          } catch (err) {
            console.warn('Permission query API error:', err);
          }
        }
        setPermissionsState(initialState);
      };
      
      checkInitialStatus();
    }
  }, [isOpen, preferences]);

  // Request browser permission
  const handleToggleChange = async (id: keyof typeof permissionsState) => {
    const isCurrentlyOn = permissionsState[id];

    if (isCurrentlyOn) {
      // Toggle off -> simply update state (user withdrawing consent in UI)
      setPermissionsState(prev => ({ ...prev, [id]: false }));
      return;
    }

    // Toggle on -> Trigger corresponding prompt
    setLoadingMap(prev => ({ ...prev, [id]: true }));
    let granted = false;

    try {
      if (id === 'camera') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        granted = true;
      } else if (id === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        granted = true;
      } else if (id === 'desktop_sharing') {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        granted = true;
      } else if (id === 'notifications') {
        const res = await requestNotificationPermission();
        granted = res === 'granted';
      }
    } catch (err) {
      console.warn(`Permission request for ${id} denied or cancelled:`, err);
      triggerToast({
        authorName: 'System',
        channelName: 'Permissions',
        content: `Permission for ${id.replace('_', ' ')} could not be enabled. Please check browser settings.`,
        type: 'system',
      });
    } finally {
      setLoadingMap(prev => ({ ...prev, [id]: false }));
    }

    setPermissionsState(prev => ({ ...prev, [id]: granted }));
  };

  const handleApply = () => {
    // Save selections globally across devices via preference synchronization
    updatePreferences({
      permissionsRequested: true,
      cameraAllowed: permissionsState.camera,
      microphoneAllowed: permissionsState.microphone,
      screenShareAllowed: permissionsState.desktop_sharing,
      notificationsAllowed: permissionsState.notifications,
    });

    onClose();

    triggerToast({
      authorName: 'System',
      channelName: 'Permissions',
      content: 'Access preferences applied and synced successfully!',
      type: 'system',
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="permissions-modal-overlay"
        className="fixed inset-0 z-[100] bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          id="permissions-modal-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 text-neutral-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">Access request</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subheading */}
          <p className="text-sm text-neutral-600 mb-6 font-medium leading-normal">
            The app requests access to the following permissions:
          </p>

          {/* List of Permissions */}
          <div className="space-y-3.5 mb-8">
            {/* Camera row */}
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-neutral-200">
              <span className="text-sm font-semibold text-neutral-800">Camera</span>
              <button
                type="button"
                onClick={() => handleToggleChange('camera')}
                disabled={loadingMap['camera']}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none flex items-center p-1 cursor-pointer ${
                  permissionsState.camera ? 'bg-neutral-900' : 'bg-neutral-200'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                    permissionsState.camera ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Microphone row */}
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-neutral-200">
              <span className="text-sm font-semibold text-neutral-800">Microphone</span>
              <button
                type="button"
                onClick={() => handleToggleChange('microphone')}
                disabled={loadingMap['microphone']}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none flex items-center p-1 cursor-pointer ${
                  permissionsState.microphone ? 'bg-neutral-900' : 'bg-neutral-200'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                    permissionsState.microphone ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Screensharing row */}
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-neutral-200">
              <span className="text-sm font-semibold text-neutral-800">Desktop Sharing</span>
              <button
                type="button"
                onClick={() => handleToggleChange('desktop_sharing')}
                disabled={loadingMap['desktop_sharing']}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none flex items-center p-1 cursor-pointer ${
                  permissionsState.desktop_sharing ? 'bg-neutral-900' : 'bg-neutral-200'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                    permissionsState.desktop_sharing ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Notifications row */}
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-neutral-200">
              <span className="text-sm font-semibold text-neutral-800">Notifications</span>
              <button
                type="button"
                onClick={() => handleToggleChange('notifications')}
                disabled={loadingMap['notifications']}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none flex items-center p-1 cursor-pointer ${
                  permissionsState.notifications ? 'bg-neutral-900' : 'bg-neutral-200'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                    permissionsState.notifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              id="permissions-apply-btn"
              type="button"
              onClick={handleApply}
              className="px-6 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 font-bold rounded-xl text-xs transition duration-150 ease-in-out shadow-xs text-neutral-800 cursor-pointer"
            >
              Apply
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
