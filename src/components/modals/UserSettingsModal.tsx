import {
  Bell,
  Check,
  Clock,
  Copy,
  Download,
  HardDrive,
  Palette,
  Radio,
  Save,
  Shield,
  Smile,
  Sparkles,
  Upload,
  User,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { generateAvatarSvg } from '../../lib/crypto';
import { isDNDActive, requestNotificationPermission } from '../../lib/notifications';
import { DEFAULT_RELAYS } from '../../lib/p2p';
import {
  computeExpiryIso,
  EXPIRY_OPTIONS,
  isStatusExpired,
  STATUS_PRESETS,
} from '../../lib/status';
import { PRESET_THEMES, ThemeName } from '../../lib/theme';
import { ThemeDefinition } from '../../types';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'profile' | 'themes' | 'notifications' | 'crypto' | 'network' | 'storage';

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    identity,
    keys,
    preferences,
    updateProfile,
    updatePreferences,
    setDND,
    connectedPeerCount,
    relayStatus,
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Profile form states
  const [displayName, setDisplayName] = useState(identity?.displayName || '');
  const [handle, setHandle] = useState(identity?.handle || '');
  const [presenceState, setPresenceState] = useState<'active' | 'away'>(
    identity?.statusDetails?.state === 'away' ? 'away' : 'active'
  );
  const [statusText, setStatusText] = useState(
    identity?.statusDetails?.customText || identity?.status || ''
  );
  const [statusEmoji, setStatusEmoji] = useState(
    identity?.statusDetails?.customEmoji || identity?.statusEmoji || '💬'
  );
  const [expiryMinutes, setExpiryMinutes] = useState<number | null>(null);
  const [customAvatarDataUrl, setCustomAvatarDataUrl] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(identity?.color || '#1264A3');

  // Custom Theme form states
  const [selectedThemeName, setSelectedThemeName] = useState<ThemeName>(
    preferences?.themeName || 'aubergine'
  );
  const [customTheme, setCustomTheme] = useState<ThemeDefinition>(
    preferences?.customTheme || {
      sidebarBg: '#3F0E40',
      sidebarText: '#BCABB6',
      activeItemBg: '#1164A3',
      accentColor: '#007A5A',
    }
  );

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen || !identity) return null;

  const dndActive = isDNDActive(preferences);

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomAvatarDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof STATUS_PRESETS[0]) => {
    setStatusEmoji(preset.emoji);
    setStatusText(preset.text);
    setExpiryMinutes(preset.defaultDurationMinutes ?? null);
  };

  const handleClearStatus = () => {
    setStatusEmoji('💬');
    setStatusText('');
    setExpiryMinutes(null);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const avatarUrl =
      customAvatarDataUrl || generateAvatarSvg(displayName, selectedColor);

    const expiresAt = statusText.trim() ? computeExpiryIso(expiryMinutes) : undefined;

    updateProfile({
      displayName,
      handle: cleanHandle,
      status: statusText,
      statusEmoji,
      color: selectedColor,
      avatarUrl,
      statusDetails: {
        state: presenceState,
        customText: statusText,
        customEmoji: statusEmoji,
        expiresAt,
      },
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSaveTheme = (themeName: ThemeName) => {
    setSelectedThemeName(themeName);
    updatePreferences({
      themeName,
      customTheme: themeName === 'custom' ? customTheme : undefined,
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const exportBackupJSON = () => {
    const backup = {
      identity,
      keys,
      exportedAt: new Date().toISOString(),
      app: 'Open-Slack',
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openslack_identity_backup_${identity.pubkey.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const colorPalette = [
    '#1264a3',
    '#007a5a',
    '#e01e5a',
    '#ecb22e',
    '#4a154b',
    '#2bac76',
    '#611f69',
    '#d63384',
  ];

  return (
    <div
      id="user-settings-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="user-settings-modal-card"
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/60">
          <h3 className="text-base font-black text-neutral-900">Preferences & Customization</h3>
          <button
            id="close-settings-modal"
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 flex-col sm:flex-row overflow-hidden">
          {/* Tabs Sidebar */}
          <div className="w-full sm:w-48 flex sm:block gap-1 overflow-x-auto bg-neutral-50/80 border-b sm:border-b-0 sm:border-r border-neutral-200 p-2 sm:p-3">
            <button
              id="tab-profile-btn"
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-auto sm:w-full flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile & Status</span>
            </button>

            <button
              id="tab-themes-btn"
              type="button"
              onClick={() => setActiveTab('themes')}
              className={`w-auto sm:w-full flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'themes'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Themes & UI</span>
            </button>

            <button
              id="tab-notifications-btn"
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`w-auto sm:w-full flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'notifications'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications & DND</span>
            </button>

            <button
              id="tab-crypto-btn"
              type="button"
              onClick={() => setActiveTab('crypto')}
              className={`w-auto sm:w-full flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'crypto'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Crypto Vault</span>
            </button>

            <button
              id="tab-network-btn"
              type="button"
              onClick={() => setActiveTab('network')}
              className={`w-auto sm:w-full flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'network'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Nostr Mesh</span>
            </button>

            <button
              id="tab-storage-btn"
              type="button"
              onClick={() => setActiveTab('storage')}
              className={`w-auto sm:w-full flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'storage'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Storage & Tests</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* 1. PROFILE TAB */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Avatar & Presence Row */}
                <div className="flex items-center gap-4 pb-4 border-b border-neutral-100">
                  <div className="relative">
                    <img
                      src={customAvatarDataUrl || identity.avatarUrl}
                      alt={displayName}
                      className="w-16 h-16 rounded-xl border border-neutral-200 object-cover shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                        presenceState === 'active'
                          ? 'bg-[#2BAC76]'
                          : 'bg-transparent border-neutral-400'
                      }`}
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-neutral-800">
                        Presence:
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setPresenceState(
                            presenceState === 'active' ? 'away' : 'active'
                          )
                        }
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          presenceState === 'active'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            presenceState === 'active'
                              ? 'bg-emerald-600'
                              : 'border border-neutral-500 bg-transparent'
                          }`}
                        />
                        <span>{presenceState === 'active' ? 'Active' : 'Set as Away'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md text-xs font-semibold flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>Upload photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileUpload}
                          className="sr-only"
                        />
                      </label>
                      {customAvatarDataUrl && (
                        <button
                          type="button"
                          onClick={() => setCustomAvatarDataUrl(null)}
                          className="text-[11px] text-red-600 hover:underline"
                        >
                          Revert to Initials
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Color Palette for Initials */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Avatar Theme Color
                  </label>
                  <div className="flex items-center gap-2">
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`w-6 h-6 rounded-full transition cursor-pointer flex items-center justify-center ${
                          selectedColor === color
                            ? 'ring-2 ring-neutral-900 ring-offset-1 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {selectedColor === color && (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Display Name
                  </label>
                  <input
                    id="settings-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {/* Handle */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Handle / Username
                  </label>
                  <input
                    id="settings-handle"
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {/* Custom Status with Presets and Auto-Expiry */}
                <div className="pt-2 border-t border-neutral-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Set a Status
                    </label>
                    {statusText && (
                      <button
                        type="button"
                        onClick={handleClearStatus}
                        className="text-[11px] text-neutral-500 hover:text-neutral-800 underline cursor-pointer"
                      >
                        Clear Status
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={3}
                      value={statusEmoji}
                      onChange={(e) => setStatusEmoji(e.target.value)}
                      className="w-10 px-1 py-2 text-center text-sm bg-neutral-50 border border-neutral-300 rounded-lg outline-none"
                    />
                    <input
                      id="settings-status"
                      type="text"
                      value={statusText}
                      onChange={(e) => setStatusText(e.target.value)}
                      placeholder="What's your status? (e.g. In a meeting, Vacationing)"
                      className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  {/* Status Presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {STATUS_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 rounded-md text-[11px] text-neutral-700 flex items-center gap-1 cursor-pointer transition"
                      >
                        <span>{preset.emoji}</span>
                        <span>{preset.text}</span>
                      </button>
                    ))}
                  </div>

                  {/* Auto-Clear Expiry Selector */}
                  <div className="flex items-center gap-2 pt-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-xs text-neutral-600">Clear after:</span>
                    <select
                      value={expiryMinutes ?? 'null'}
                      onChange={(e) =>
                        setExpiryMinutes(
                          e.target.value === 'null' ? null : Number(e.target.value)
                        )
                      }
                      className="px-2 py-1 bg-neutral-50 border border-neutral-300 rounded text-xs text-neutral-800 outline-none"
                    >
                      {EXPIRY_OPTIONS.map((opt) => (
                        <option
                          key={String(opt.minutes)}
                          value={opt.minutes === null ? 'null' : opt.minutes}
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between">
                  {savedSuccess && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Profile updated
                    </span>
                  )}
                  <button
                    id="save-profile-btn"
                    type="submit"
                    className="ml-auto px-4 py-2 bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* 2. THEMES & UI TAB */}
            {activeTab === 'themes' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    Pre-Configured Slack Themes
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.values(PRESET_THEMES).map((thm) => (
                      <button
                        key={thm.name}
                        type="button"
                        onClick={() => handleSaveTheme(thm.name)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          selectedThemeName === thm.name
                            ? 'ring-2 ring-[#4A154B] border-transparent shadow-xs'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-neutral-900">
                            {thm.label}
                          </span>
                          {selectedThemeName === thm.name && (
                            <Check className="w-4 h-4 text-[#4A154B]" />
                          )}
                        </div>
                        {/* Visual Palette Preview Bar */}
                        <div className="h-6 rounded-md overflow-hidden flex border border-neutral-200">
                          <div
                            className="w-1/4 h-full"
                            style={{ backgroundColor: thm.railBg }}
                          />
                          <div
                            className="w-1/2 h-full"
                            style={{ backgroundColor: thm.sidebarBg }}
                          />
                          <div
                            className="w-1/4 h-full"
                            style={{ backgroundColor: thm.activeItemBg }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Theme Generator */}
                <div className="pt-4 border-t border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" /> Custom Theme Generator
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleSaveTheme('custom')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                        selectedThemeName === 'custom'
                          ? 'bg-[#4A154B] text-white'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                      }`}
                    >
                      {selectedThemeName === 'custom' ? 'Active' : 'Apply Custom'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                        Sidebar Background
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customTheme.sidebarBg}
                          onChange={(e) => {
                            const updated = { ...customTheme, sidebarBg: e.target.value };
                            setCustomTheme(updated);
                            if (selectedThemeName === 'custom') {
                              updatePreferences({ customTheme: updated });
                            }
                          }}
                          className="w-8 h-8 rounded border border-neutral-300 cursor-pointer"
                        />
                        <span className="font-mono text-neutral-700">
                          {customTheme.sidebarBg}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                        Sidebar Text Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customTheme.sidebarText}
                          onChange={(e) => {
                            const updated = { ...customTheme, sidebarText: e.target.value };
                            setCustomTheme(updated);
                            if (selectedThemeName === 'custom') {
                              updatePreferences({ customTheme: updated });
                            }
                          }}
                          className="w-8 h-8 rounded border border-neutral-300 cursor-pointer"
                        />
                        <span className="font-mono text-neutral-700">
                          {customTheme.sidebarText}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                        Active Item Highlight
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customTheme.activeItemBg}
                          onChange={(e) => {
                            const updated = { ...customTheme, activeItemBg: e.target.value };
                            setCustomTheme(updated);
                            if (selectedThemeName === 'custom') {
                              updatePreferences({ customTheme: updated });
                            }
                          }}
                          className="w-8 h-8 rounded border border-neutral-300 cursor-pointer"
                        />
                        <span className="font-mono text-neutral-700">
                          {customTheme.activeItemBg}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                        Accent Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customTheme.accentColor}
                          onChange={(e) => {
                            const updated = { ...customTheme, accentColor: e.target.value };
                            setCustomTheme(updated);
                            if (selectedThemeName === 'custom') {
                              updatePreferences({ customTheme: updated });
                            }
                          }}
                          className="w-8 h-8 rounded border border-neutral-300 cursor-pointer"
                        />
                        <span className="font-mono text-neutral-700">
                          {customTheme.accentColor}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                {/* Do Not Disturb (DND) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" /> Do Not Disturb (DND)
                    </div>
                    {dndActive && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                        ACTIVE UNTIL{' '}
                        {new Date(preferences.dndUntil!).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-500">
                    Pause all sound effects and desktop notification banners.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setDND(30)}
                      className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition text-center cursor-pointer"
                    >
                      30 minutes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDND(60)}
                      className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition text-center cursor-pointer"
                    >
                      1 hour
                    </button>
                    <button
                      type="button"
                      onClick={() => setDND(120)}
                      className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition text-center cursor-pointer"
                    >
                      2 hours
                    </button>
                    <button
                      type="button"
                      onClick={() => setDND(null)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition text-center cursor-pointer ${
                        dndActive
                          ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
                          : 'bg-neutral-100 text-neutral-400'
                      }`}
                    >
                      {dndActive ? 'Turn Off DND' : 'Clear DND'}
                    </button>
                  </div>
                </div>

                {/* Sound & Audio Effects */}
                <div className="space-y-3 pt-3 border-t border-neutral-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-blue-600" /> Sound Effects
                  </div>

                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-neutral-900">
                        Enable synthesized audio cues
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        Plays Slack-like chimes on send, receive, reactions, and huddles.
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.soundEnabled}
                        onChange={(e) =>
                          updatePreferences({ soundEnabled: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#007a5a]"></div>
                    </label>
                  </div>
                </div>

                {/* Desktop Notifications Preference */}
                <div className="space-y-3 pt-3 border-t border-neutral-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-purple-600" /> Web Notifications
                  </div>

                  <div className="space-y-2">
                    {[
                      {
                        id: 'all',
                        label: 'All new messages',
                        desc: 'Notify on every message in your channels',
                      },
                      {
                        id: 'mentions_only',
                        label: 'Direct mentions and @mentions only',
                        desc: 'Only alert when you are explicitly tagged',
                      },
                      {
                        id: 'none',
                        label: 'Nothing',
                        desc: 'Never dispatch desktop banners',
                      },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        onClick={() => requestNotificationPermission()}
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                          preferences.desktopNotifications === opt.id
                            ? 'bg-blue-50/50 border-blue-300'
                            : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="desktopNotifications"
                          value={opt.id}
                          checked={preferences.desktopNotifications === opt.id}
                          onChange={() =>
                            updatePreferences({
                              desktopNotifications: opt.id as any,
                            })
                          }
                          className="mt-0.5 text-[#1264A3]"
                        />
                        <div>
                          <div className="text-xs font-bold text-neutral-900">
                            {opt.label}
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            {opt.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. CRYPTO TAB */}
            {activeTab === 'crypto' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-800">
                      ECDSA P-256 Public Key (Fingerprint)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(identity.pubkey, 'pubkey')}
                      className="text-xs text-[#1264A3] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'pubkey' ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedKey === 'pubkey' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono bg-white p-2 border border-neutral-200 rounded break-all text-neutral-700">
                    {identity.pubkey}
                  </pre>
                </div>

                <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-800">
                      ECDH Encryption Public Key
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(identity.enc_pubkey || '', 'enckey')
                      }
                      className="text-xs text-[#1264A3] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'enckey' ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedKey === 'enckey' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono bg-white p-2 border border-neutral-200 rounded break-all text-neutral-700">
                    {identity.enc_pubkey || 'N/A'}
                  </pre>
                </div>

                <div className="pt-2">
                  <button
                    id="export-key-backup-btn"
                    type="button"
                    onClick={exportBackupJSON}
                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Cryptographic Backup JSON</span>
                  </button>
                  <p className="text-[11px] text-neutral-500 text-center mt-1.5">
                    Never share your private key backup with untrusted parties.
                  </p>
                </div>
              </div>
            )}

            {/* 5. NETWORK TAB */}
            {activeTab === 'network' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <div>
                    <div className="text-xs font-bold text-neutral-900">
                      Signaling Mesh Status
                    </div>
                    <div className="text-xs text-neutral-500">
                      {connectedPeerCount} active WebRTC peer(s) connected
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>{relayStatus.toUpperCase()}</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    Active Nostr Relays
                  </div>
                  <div className="space-y-1.5">
                    {DEFAULT_RELAYS.map((relay, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-xs font-mono text-neutral-700"
                      >
                        <span>{relay}</span>
                        <span className="text-[10px] font-bold text-emerald-600">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6. STORAGE & LOCAL DATA TAB */}
            {activeTab === 'storage' && (
              <div className="space-y-4">
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700">
                      Storage Architecture:
                    </span>
                    <span className="font-mono font-bold text-neutral-900">
                      IndexedDB + Yjs CRDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700">
                      Offline Mode & Local Cache:
                    </span>
                    <span className="font-bold text-emerald-600">
                      100% Client-Side & Private
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700">
                      Zero Central Servers:
                    </span>
                    <span className="font-medium text-neutral-600">
                      Data resides strictly in your browser and connected peers
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-lg text-xs text-neutral-700 space-y-1">
                  <p className="font-bold text-amber-900">Local-First Storage Guarantee</p>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">
                    Open Slack stores all workspace messages, encrypted keys, threads, and attachments directly inside your browser storage using standard WebCrypto and IndexedDB. No messages are ever uploaded to cloud servers.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
