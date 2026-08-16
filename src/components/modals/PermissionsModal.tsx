import { Bell, Camera, Check, Mic, Monitor, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { requestNotificationPermission } from '../../lib/notifications';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PermissionItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'idle' | 'requesting' | 'granted' | 'denied';
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({ isOpen, onClose }) => {
  const { updatePreferences, triggerToast } = useWorkspace();
  const [permissions, setPermissions] = useState<PermissionItem[]>([
    {
      id: 'camera',
      name: 'Camera',
      description: 'Used for video huddles and profile photos.',
      icon: <Camera className="w-5 h-5" />,
      status: 'idle',
    },
    {
      id: 'microphone',
      name: 'Microphone',
      description: 'Used for voice huddles and audio messages.',
      icon: <Mic className="w-5 h-5" />,
      status: 'idle',
    },
    {
      id: 'desktop_sharing',
      name: 'Desktop Sharing',
      description: 'Allows you to share your screen with teammates.',
      icon: <Monitor className="w-5 h-5" />,
      status: 'idle',
    },
    {
      id: 'notifications',
      name: 'Notifications',
      description: 'Desktop alerts for mentions, messages, and calls.',
      icon: <Bell className="w-5 h-5" />,
      status: 'idle',
    },
  ]);

  // Check initial statuses if possible
  useEffect(() => {
    if (isOpen) {
      const checkInitialStatus = async () => {
        if (!navigator.permissions) return;
        
        try {
          const cam = await navigator.permissions.query({ name: 'camera' as any }).catch(() => null);
          const mic = await navigator.permissions.query({ name: 'microphone' as any }).catch(() => null);
          const notif = await navigator.permissions.query({ name: 'notifications' as any }).catch(() => null);

          setPermissions(prev => prev.map(p => {
            if (p.id === 'camera' && cam?.state === 'granted') return { ...p, status: 'granted' };
            if (p.id === 'microphone' && mic?.state === 'granted') return { ...p, status: 'granted' };
            if (p.id === 'notifications' && (notif?.state === 'granted' || Notification.permission === 'granted')) return { ...p, status: 'granted' };
            return p;
          }));
        } catch (err) {
          console.warn('Permission query error:', err);
        }
      };
      checkInitialStatus();
    }
  }, [isOpen]);

  const handleRequest = async (id: string) => {
    setPermissions(prev => prev.map(p => p.id === id ? { ...p, status: 'requesting' } : p));
    
    let granted = false;
    try {
      if (id === 'camera' || id === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: id === 'camera',
          audio: id === 'microphone'
        });
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
      console.warn(`Permission ${id} denied:`, err);
    }

    setPermissions(prev => prev.map(p => p.id === id ? { ...p, status: granted ? 'granted' : 'denied' } : p));
  };

  const handleFinish = () => {
    updatePreferences({ permissionsRequested: true });
    onClose();
    triggerToast({
      authorName: 'System',
      channelName: 'Permissions',
      content: 'Preferences saved. You can always update these in your browser settings.',
      type: 'system',
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="permissions-modal-overlay"
        className="fixed inset-0 z-[100] bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          id="permissions-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-br from-[#4A154B] to-[#611f69] text-white text-center relative">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <h2 className="text-xl font-black">App Permissions</h2>
            <p className="text-purple-100 text-xs mt-1.5 max-w-[280px] mx-auto leading-relaxed">
              Open-Slack requires access to the following to enable the full peer-to-peer experience.
            </p>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List of Permissions */}
          <div className="p-4 space-y-2.5 bg-neutral-50/50">
            {permissions.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3.5 p-3.5 bg-white rounded-xl border border-neutral-200 shadow-sm"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                  p.status === 'granted' 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-500'
                }`}>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-neutral-900">{p.name}</div>
                  <div className="text-[11px] text-neutral-500 truncate">{p.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRequest(p.id)}
                  disabled={p.status === 'granted' || p.status === 'requesting'}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition ${
                    p.status === 'granted'
                      ? 'bg-emerald-100 text-emerald-700'
                      : p.status === 'requesting'
                      ? 'bg-neutral-100 text-neutral-400'
                      : 'bg-neutral-900 text-white hover:bg-black cursor-pointer'
                  }`}
                >
                  {p.status === 'granted' ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3" /> Granted
                    </span>
                  ) : p.status === 'requesting' ? (
                    'Waiting...'
                  ) : (
                    'Allow'
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Footer Action */}
          <div className="p-6 border-t border-neutral-100 bg-white">
            <button
              id="permissions-finish-btn"
              type="button"
              onClick={handleFinish}
              className="w-full py-3.5 bg-[#4A154B] hover:bg-[#611f69] text-white rounded-xl text-sm font-bold transition shadow-sm cursor-pointer"
            >
              Done & Continue
            </button>
            <p className="text-[10px] text-neutral-400 text-center mt-3">
              You can change these later in your browser or OS settings.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
