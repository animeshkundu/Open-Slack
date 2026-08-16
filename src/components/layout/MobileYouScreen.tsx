import { Bell, Clock, Palette, Settings, User, X } from 'lucide-react';
import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface MobileYouScreenProps {
  onOpenSettings: () => void;
}

export const MobileYouScreen: React.FC<MobileYouScreenProps> = ({ onOpenSettings }) => {
  const { identity, preferences, setDND, updateProfile } = useWorkspace();

  if (!identity) return null;

  const isAway = identity.statusDetails?.state === 'away';

  return (
    <div className="flex-1 flex flex-col bg-neutral-50 overflow-y-auto pb-20">
      {/* Header Profile Section */}
      <div className="bg-white p-6 border-b border-neutral-200">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={identity.avatarUrl}
              alt={identity.displayName}
              className="w-16 h-16 rounded-xl border border-neutral-200 shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div
              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                isAway ? 'bg-neutral-300' : 'bg-emerald-500'
              }`}
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-neutral-900">{identity.displayName}</h2>
            <p className="text-sm text-neutral-500 font-mono">{identity.handle}</p>
          </div>
        </div>

        {/* Status Bar */}
        <button
          onClick={onOpenSettings}
          className="w-full mt-6 flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 text-sm hover:bg-neutral-100 transition cursor-pointer"
        >
          <span className="text-lg">{identity.statusEmoji || '💬'}</span>
          <span className="flex-1 text-left truncate">
            {identity.status || identity.statusDetails?.customText || "Update your status"}
          </span>
        </button>
      </div>

      {/* Menu Options */}
      <div className="mt-6 px-4 space-y-2">
        <button
          onClick={() => {
            updateProfile({
              statusDetails: {
                ...identity.statusDetails,
                state: isAway ? 'active' : 'away'
              }
            } as any);
          }}
          className="w-full flex items-center gap-4 p-4 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600">
            <User className="w-5 h-5" />
          </div>
          <span className="flex-1 text-left font-bold text-neutral-800">
            {isAway ? 'Set yourself as active' : 'Set yourself as away'}
          </span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-4 p-4 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-bold text-neutral-800">Pause Notifications</div>
            <div className="text-[11px] text-neutral-500">
              {preferences.dndUntil ? `Paused until ${new Date(preferences.dndUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not paused'}
            </div>
          </div>
        </button>
      </div>

      <div className="mt-6 px-4">
        <h3 className="px-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-2">
          Settings
        </h3>
        <div className="space-y-2">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-4 p-4 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Settings className="w-5 h-5" />
            </div>
            <span className="flex-1 text-left font-bold text-neutral-800">Preferences</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-4 p-4 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Palette className="w-5 h-5" />
            </div>
            <span className="flex-1 text-left font-bold text-neutral-800">Themes & Appearance</span>
          </button>
        </div>
      </div>
    </div>
  );
};
