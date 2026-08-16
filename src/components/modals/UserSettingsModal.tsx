import {
  Activity,
  Battery,
  BatteryCharging,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Download,
  FileArchive,
  HardDrive,
  Lock,
  Network,
  Palette,
  Play,
  QrCode,
  Radio,
  RefreshCw,
  Save,
  Shield,
  Smartphone,
  Smile,
  Sparkles,
  Trash2,
  Upload,
  User,
  Volume2,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import QRCode from 'qrcode';
import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { batteryManager, BatteryState } from '../../lib/battery';
import { generateAvatarSvg } from '../../lib/crypto';
import { generateHandleFromName } from '../../lib/mentions';
import { encodeDeviceSyncPayload, getOrCreateDeviceId } from '../../lib/multiDevice';
import {
  getNotificationPermissionStatus,
  isDNDActive,
  requestNotificationPermission,
  showBrowserNotification,
} from '../../lib/notifications';
import {
  ALL_RECOMMENDED_RELAYS,
  DEFAULT_RELAYS,
  DEFAULT_TORRENT_TRACKERS,
  pingRelay,
} from '../../lib/p2p';
import {
  computeExpiryIso,
  EXPIRY_OPTIONS,
  isStatusExpired,
  STATUS_PRESETS,
} from '../../lib/status';
import {
  clearAllStoredFiles,
  compressBuffer,
  formatBytes,
  getStorageQuotaEstimate,
  StorageQuotaInfo,
} from '../../lib/storage';
import { PRESET_THEMES, ThemeName } from '../../lib/theme';
import { usePWAInstall } from '../../lib/usePWAInstall';
import { ThemeDefinition } from '../../types';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'profile' | 'themes' | 'notifications' | 'app' | 'linked_devices' | 'privacy' | 'crypto' | 'network' | 'storage';

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    identity,
    keys,
    activeWorkspace,
    workspaces,
    preferences,
    updateProfile,
    updatePreferences,
    setDND,
    connectedPeerCount,
    relayStatus,
    triggerToast,
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // PWA & Battery State
  const {
    isInstallable,
    isInstalled,
    installApp,
    checkForUpdate,
    isCheckingUpdate,
    updateAvailable,
    swVersion,
  } = usePWAInstall();
  const [batteryState, setBatteryState] = useState<BatteryState>(batteryManager.getState());
  const [updateStatusMessage, setUpdateStatusMessage] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [isInstallingPwa, setIsInstallingPwa] = useState(false);

  useEffect(() => {
    const unsub = batteryManager.subscribe(setBatteryState);
    setNotifPermission(getNotificationPermissionStatus());
    return unsub;
  }, []);

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

  // Relay ping & latency test state
  const [relayPings, setRelayPings] = useState<Record<string, { latency: number; ok: boolean }>>({});
  const [isPingingRelays, setIsPingingRelays] = useState(false);

  // Storage & Compression state
  const [storageQuota, setStorageQuota] = useState<StorageQuotaInfo | null>(null);
  const [compressionBenchmark, setCompressionBenchmark] = useState<{ rawBytes: number; compressedBytes: number; savings: string } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [clearedStorageSuccess, setClearedStorageSuccess] = useState(false);

  // Device Sync & QR state
  const [deviceQrDataUrl, setDeviceQrDataUrl] = useState<string>('');
  const [deviceSyncUrl, setDeviceSyncUrl] = useState<string>('');
  const [deviceQrError, setDeviceQrError] = useState<string>('');

  useEffect(() => {
    if (activeTab === 'linked_devices') {
      try {
        setDeviceQrDataUrl('');
        setDeviceQrError('');
        const currentIdentity = identity || { pubkey: 'mock-pubkey', handle: '@user', displayName: 'User', avatarUrl: '' };
        const syncWorkspaces = workspaces.length > 0 ? workspaces : (activeWorkspace ? [activeWorkspace] : []);
        const payloadStr = encodeDeviceSyncPayload(currentIdentity as any, keys, syncWorkspaces);
        const fullUrl = `${window.location.origin}${window.location.pathname}#device-sync=${payloadStr}`;
        setDeviceSyncUrl(fullUrl);
        QRCode.toDataURL(fullUrl, {
          width: 220,
          margin: 1,
          errorCorrectionLevel: 'L',
          color: { dark: '#111827', light: '#FFFFFF' },
        })
          .then(setDeviceQrDataUrl)
          .catch((err) => {
            console.warn('QR render error:', err);
            setDeviceQrError('This pairing link is too large for a QR code. Use Copy Link below instead.');
          });
      } catch (err) {
        console.warn('Device payload build error:', err);
        setDeviceQrError('Could not create a pairing QR code. Use Copy Link below instead.');
      }
    }
  }, [activeTab, identity, keys, activeWorkspace, workspaces]);

  useEffect(() => {
    if (activeTab === 'storage') {
      getStorageQuotaEstimate().then(setStorageQuota);
    }
  }, [activeTab]);

  const handleRunCompressionBenchmark = async () => {
    setIsCompressing(true);
    try {
      const samplePayload = JSON.stringify({
        workspace: 'Open-Slack Engineering',
        channels: ['#general', '#dev', '#random', '#announcements'],
        messages: Array.from({ length: 200 }).map((_, i) => ({
          id: `msg_${Date.now()}_${i}`,
          author: 'Alex Rivera @alex.rivera',
          content: `Encrypted decentralized message thread #${i} with cryptographic sign verification, reactions, nested metadata, and local IndexedDB CRDT state`,
          timestamp: Date.now() - i * 60000,
          reactions: { '👍': 4, '🚀': 2, '❤️': 3 },
        })),
      });

      const rawUint8 = new TextEncoder().encode(samplePayload);
      const res = await compressBuffer(rawUint8);
      const savings = Math.round((1 - res.compressed.byteLength / rawUint8.byteLength) * 100);

      setCompressionBenchmark({
        rawBytes: rawUint8.byteLength,
        compressedBytes: res.compressed.byteLength,
        savings: `${savings}%`,
      });
    } catch (err) {
      console.warn('Compression benchmark error:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClearMediaStorage = async () => {
    const ok = await clearAllStoredFiles();
    if (ok) {
      setClearedStorageSuccess(true);
      getStorageQuotaEstimate().then(setStorageQuota);
      setTimeout(() => setClearedStorageSuccess(false), 2500);
    }
  };

  const handlePingAll = async () => {
    setIsPingingRelays(true);
    const allEndpoints = [...DEFAULT_RELAYS, ...DEFAULT_TORRENT_TRACKERS];
    const results: Record<string, { latency: number; ok: boolean }> = {};
    
    await Promise.all(
      allEndpoints.map(async (url) => {
        const res = await pingRelay(url, 2500);
        results[url] = { latency: res.latency, ok: res.ok };
      })
    );
    
    setRelayPings(results);
    setIsPingingRelays(false);
  };

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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        id="user-settings-modal-card"
        className="w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-neutral-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto my-2 sm:hidden flex-shrink-0" />

        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/60 flex-shrink-0">
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
          <div className="w-full sm:w-52 flex sm:block gap-1.5 overflow-x-auto no-scrollbar bg-neutral-50/80 border-b sm:border-b-0 sm:border-r border-neutral-200 p-2 sm:p-3 flex-shrink-0">
            <button
              id="tab-profile-btn"
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-auto sm:w-full flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-neutral-900 text-white shadow-xs'
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
                  ? 'bg-neutral-900 text-white shadow-xs'
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
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications & DND</span>
            </button>

            <button
              id="tab-app-btn"
              type="button"
              onClick={() => setActiveTab('app')}
              className={`w-auto sm:w-full flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'app'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>App & Battery (PWA)</span>
            </button>

            <button
              id="tab-linked-devices-btn"
              type="button"
              onClick={() => setActiveTab('linked_devices')}
              className={`w-auto sm:w-full flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'linked_devices'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Linked Devices</span>
            </button>

            <button
              id="tab-privacy-btn"
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`w-auto sm:w-full flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'privacy'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Privacy & Security</span>
            </button>

            <button
              id="tab-crypto-btn"
              type="button"
              onClick={() => setActiveTab('crypto')}
              className={`w-auto sm:w-full flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'crypto'
                  ? 'bg-neutral-900 text-white shadow-xs'
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
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span>Nostr & Trackers</span>
            </button>

            <button
              id="tab-storage-btn"
              type="button"
              onClick={() => setActiveTab('storage')}
              className={`w-auto sm:w-full flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'storage'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Storage & Diagnostics</span>
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
                    onChange={(e) => {
                      const newName = e.target.value;
                      setDisplayName(newName);
                    }}
                    required
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {/* Handle with Auto-format */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Handle / Username
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateHandleFromName(displayName);
                        setHandle(generated);
                      }}
                      className="text-[11px] font-semibold text-[#1264A3] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Auto @first.last
                    </button>
                  </div>
                  <input
                    id="settings-handle"
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white font-mono"
                  />
                  <p className="text-[10.5px] text-neutral-500 mt-1">
                    Canonical format: <code className="text-neutral-700 bg-neutral-100 px-1 py-0.5 rounded">@firstname.lastname</code> (auto-truncates on collisions).
                  </p>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* 4. APP & BATTERY (PWA) TAB */}
            {activeTab === 'app' && (
              <div className="space-y-6">
                {/* PWA Installation Card */}
                <div className="p-4.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A154B] to-[#611f69] border border-purple-500/30 flex items-center justify-center flex-shrink-0 shadow-xs">
                        <span className="font-extrabold text-[#ECB22E] text-lg font-sans">#</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                          <span>Progressive Web App (PWA)</span>
                          {isInstalled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Standalone App Installed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              Web Browser Mode
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                          Install Open-Slack as a desktop or mobile application for instant launch, offline encrypted caching, native notifications, and automatic background updates.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    {isInstalled ? (
                      <div className="text-xs text-neutral-700 bg-white px-3.5 py-2 rounded-xl border border-neutral-200 font-medium flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Running in standalone native window.</span>
                      </div>
                    ) : (
                      <button
                        id="install-pwa-settings-btn"
                        type="button"
                        onClick={async () => {
                          setIsInstallingPwa(true);
                          const success = await installApp();
                          setIsInstallingPwa(false);
                          if (success) {
                            triggerToast({
                              authorName: 'Open-Slack App',
                              content: 'Open-Slack installed successfully!',
                              type: 'system',
                            });
                          }
                        }}
                        className="px-4 py-2 bg-[#007a5a] hover:bg-[#148567] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Install Open-Slack App</span>
                      </button>
                    )}
                  </div>

                  {!isInstalled && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                      <span className="font-bold">iOS / Safari Users: </span>
                      Tap the <span className="font-semibold">Share</span> icon in Safari, then scroll down and tap <span className="font-semibold">"Add to Home Screen"</span>.
                    </div>
                  )}
                </div>

                {/* Auto-Updates & Service Worker Card */}
                <div className="p-4.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-neutral-900">Automatic Updates</h4>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-500">v{swVersion}</span>
                  </div>

                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Open-Slack uses a background Service Worker to automatically pull the latest decentralized client updates seamlessly.
                  </p>

                  <div className="pt-1 flex items-center gap-3">
                    <button
                      id="check-updates-btn"
                      type="button"
                      disabled={isCheckingUpdate}
                      onClick={async () => {
                        const res = await checkForUpdate();
                        setUpdateStatusMessage(res.message);
                      }}
                      className="px-3.5 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                      <span>{isCheckingUpdate ? 'Checking for updates...' : 'Check for Updates'}</span>
                    </button>

                    {updateStatusMessage && (
                      <span className="text-xs text-emerald-700 font-medium">
                        {updateStatusMessage}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Battery Life & Power Optimization */}
                <div className="p-4.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {batteryState.charging ? (
                        <BatteryCharging className="w-4.5 h-4.5 text-emerald-600" />
                      ) : (
                        <Battery className="w-4.5 h-4.5 text-[#1264A3]" />
                      )}
                      <h4 className="text-xs font-bold text-neutral-900">Mobile Battery Saver & P2P Efficiency</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-neutral-200 text-neutral-800 rounded-md">
                        {batteryState.charging ? '⚡ Charging' : `${Math.round(batteryState.level * 100)}% Battery`}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        batteryState.powerProfile === 'battery_saver'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : batteryState.powerProfile === 'background_throttled'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}>
                        {batteryState.powerProfile === 'battery_saver'
                          ? 'Power Saver Active'
                          : batteryState.powerProfile === 'background_throttled'
                          ? 'Background Throttled'
                          : 'High Performance'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Decentralized P2P WebRTC mesh and Nostr relays can consume mobile power if heartbeats are sent too aggressively. Open-Slack automatically throttles background heartbeats and anti-entropy vector exchanges when power is low or tabs are hidden, catching up immediately when the app returns to view.
                  </p>

                  {/* Power Profile Selector */}
                  <div className="space-y-2">
                    {[
                      {
                        id: 'auto',
                        label: 'Automatic (Recommended for Mobile & Desktop)',
                        desc: 'Dynamically scales presence (15s–30s) and sync (45s–90s) based on battery level (<25%) and page visibility. Instantly catches up upon wake.',
                      },
                      {
                        id: 'always',
                        label: 'Always On (Maximum Battery Life)',
                        desc: 'Reduces background mesh chatter to 30s presence and 90s anti-entropy sync for maximum battery savings.',
                      },
                      {
                        id: 'never',
                        label: 'Never (High Performance / Plugged In)',
                        desc: 'Maintains rapid 15s presence and 45s sync vectors at all times.',
                      },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                          (preferences.batterySaver || 'auto') === opt.id
                            ? 'bg-blue-50/60 border-blue-300'
                            : 'bg-white border-neutral-200 hover:bg-neutral-100/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="batterySaver"
                          value={opt.id}
                          checked={(preferences.batterySaver || 'auto') === opt.id}
                          onChange={() => {
                            updatePreferences({ batterySaver: opt.id as any });
                            batteryManager.setUserPreference(opt.id as any);
                          }}
                          className="mt-0.5 text-[#1264A3]"
                        />
                        <div>
                          <div className="text-xs font-bold text-neutral-900">{opt.label}</div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Browser & OS Notification Permission Status */}
                <div className="p-4.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-600" />
                      <h4 className="text-xs font-bold text-neutral-900">Desktop & Push Notifications</h4>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      notifPermission === 'granted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : notifPermission === 'denied'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      Permission: {notifPermission.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Receive OS desktop and mobile alert banners whenever teammates send messages, @mention you, react to your messages, or start voice huddles.
                  </p>

                  <div className="pt-1 flex items-center gap-2">
                    <button
                      id="test-notification-btn"
                      type="button"
                      onClick={async () => {
                        const perm = await requestNotificationPermission();
                        setNotifPermission(perm);
                        if (perm === 'granted') {
                          showBrowserNotification('🔔 Open-Slack Test Notification', {
                            body: 'Desktop and activity notifications are active and working!',
                            tag: 'test-notif',
                          });
                          triggerToast({
                            authorName: 'Slack Notifications',
                            content: 'Test notification dispatched successfully.',
                            type: 'system',
                          });
                        }
                      }}
                      className="px-3.5 py-1.5 bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>{notifPermission === 'granted' ? 'Send Test Notification' : 'Enable Notifications'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LINKED DEVICES TAB */}
            {activeTab === 'linked_devices' && (
              <div className="space-y-5">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 leading-relaxed font-medium">
                  <span className="font-bold">Sync Your Personal Devices:</span> Sync your account, history, and notifications to your personal phone or laptop. Do not share this QR code with coworkers.
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#1264A3]" /> Pair Mobile Phone or Secondary Laptop
                  </h4>
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6 p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                    <div className="flex-shrink-0">
                      {deviceQrDataUrl ? (
                        <img
                          id="linked-device-qr-img"
                          src={deviceQrDataUrl}
                          alt="Linked Device Pairing QR Code"
                          className="w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-lg border border-neutral-300 shadow-xs"
                        />
                      ) : (
                        <div
                          id="linked-device-qr-status"
                          className="w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44 flex items-center justify-center bg-white border border-neutral-200 rounded-lg text-xs text-neutral-400 text-center p-3"
                        >
                          {deviceQrError || 'Generating Pairing QR...'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2.5 text-xs w-full">
                      <div id="linked-device-instruction-header" className="font-bold text-neutral-900 text-sm md:text-xs">Scan QR Code or Copy Direct Link</div>
                      <p className="text-neutral-600 leading-relaxed">
                        Open Open-Slack on your phone or secondary browser and scan this QR code or open the link below to sync your profile, workspace keys, and chat history instantly.
                      </p>
                      <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex-1 min-w-0 relative">
                          <input
                            type="text"
                            readOnly
                            value={deviceSyncUrl}
                            id="linked-device-url-input"
                            className="w-full px-3 py-2 bg-white border border-neutral-300 rounded text-[10px] sm:text-[11px] font-mono select-all outline-none focus:border-[#1264A3] transition"
                          />
                        </div>
                        <button
                          type="button"
                          id="copy-linked-device-url-btn"
                          onClick={() => copyToClipboard(deviceSyncUrl, 'linked_device_url')}
                          className="px-3 py-2 bg-[#007a5a] text-white font-bold rounded text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#148567] transition shadow-xs sm:flex-shrink-0"
                        >
                          {copiedKey === 'linked_device_url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'linked_device_url' ? 'Copied' : 'Copy Link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    Active Registered Devices
                  </h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-white border border-neutral-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold flex-shrink-0">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-neutral-900 flex flex-wrap items-center gap-2">
                            <span className="truncate">{getOrCreateDeviceId().deviceName}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">This Device</span>
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono truncate">
                            ID: {getOrCreateDeviceId().deviceId}
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 sm:justify-end">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Active Now</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PRIVACY & SECURITY TAB */}
            {activeTab === 'privacy' && (
              <div className="space-y-5">
                <div id="privacy-statement-banner" className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 leading-relaxed font-medium space-y-2">
                  <div className="font-extrabold text-sm text-emerald-900 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Zero Central Storage Architecture
                  </div>
                  <p>
                    Communications are exchanged directly between active member devices and stored locally in your browser. There is no central server, cloud database, or third-party storage.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Workspace Access & Gatekeeping
                  </h4>
                  <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1 text-xs">
                    <div className="font-bold text-neutral-900">Private & Invitation-Only Workspaces</div>
                    <p className="text-neutral-600 leading-relaxed">
                      Workspaces are private and invitation-only. Every new member must be approved by an administrator before gaining access.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Channel & Direct Message Security Models
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5 text-xs">
                    <div className="p-3 bg-white border border-neutral-200 rounded-xl">
                      <div className="font-bold text-neutral-900">Public Channels</div>
                      <div className="text-neutral-600 mt-0.5">Public to workspace: Visible to all approved members of this workspace.</div>
                    </div>
                    <div className="p-3 bg-white border border-neutral-200 rounded-xl">
                      <div className="font-bold text-neutral-900">Private Channels</div>
                      <div className="text-neutral-600 mt-0.5">Private channel: Accessible strictly by invitation from existing channel members.</div>
                    </div>
                    <div className="p-3 bg-white border border-neutral-200 rounded-xl">
                      <div className="font-bold text-neutral-900">Direct Messages</div>
                      <div className="text-neutral-600 mt-0.5">Private conversation: Messages exist only on the devices of participants in this conversation.</div>
                    </div>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <div>
                    <div className="text-xs font-bold text-neutral-900">
                      Signaling Mesh Status
                    </div>
                    <div className="text-xs text-neutral-500">
                      {connectedPeerCount} active WebRTC peer(s) connected
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePingAll}
                      disabled={isPingingRelays}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-neutral-100 border border-neutral-300 rounded-md text-neutral-700 flex items-center gap-1 transition cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isPingingRelays ? 'animate-spin' : ''}`} />
                      <span>{isPingingRelays ? 'Pinging...' : 'Ping All'}</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>{relayStatus.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Nostr WebSocket Relays */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-[#1264A3]" />
                      <span>High-Availability Nostr Relays ({DEFAULT_RELAYS.length})</span>
                    </div>
                    <span className="text-[11px] text-neutral-500">NIP-01 Ephemeral Signaling</span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {DEFAULT_RELAYS.map((relay, idx) => {
                      const ping = relayPings[relay];
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-xs font-mono text-neutral-700"
                        >
                          <span className="truncate max-w-[240px] sm:max-w-[340px]">{relay}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {ping ? (
                              ping.ok ? (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  ping.latency < 100
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ping.latency < 300
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-neutral-200 text-neutral-700'
                                }`}>
                                  {ping.latency}ms
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                  Timeout
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BitTorrent / WebTorrent Trackers */}
                <div className="pt-2 border-t border-neutral-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WebTorrent Signaling Trackers ({DEFAULT_TORRENT_TRACKERS.length})</span>
                    </div>
                    <span className="text-[11px] text-neutral-500">BEP-03 / WebTorrent Mesh</span>
                  </div>
                  <div className="space-y-1.5">
                    {DEFAULT_TORRENT_TRACKERS.map((tracker, idx) => {
                      const ping = relayPings[tracker];
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-xs font-mono text-neutral-700"
                        >
                          <span className="truncate max-w-[240px] sm:max-w-[340px]">{tracker}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {ping ? (
                              ping.ok ? (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  ping.latency < 150
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {ping.latency}ms
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                                  Standby
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600">
                                Ready
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs text-blue-900 leading-relaxed">
                  <div className="font-bold flex items-center gap-1 mb-0.5">
                    <Shield className="w-3.5 h-3.5 text-blue-700" /> Multi-Protocol Redundancy
                  </div>
                  <div>
                    Open Slack simultaneously publishes ephemeral rendezvous SDP offers to both Nostr relay clusters and WebTorrent tracker swarms. Direct WebRTC data-channels are negotiated peer-to-peer without central server dependencies.
                  </div>
                </div>
              </div>
            )}

            {/* 6. STORAGE & LOCAL DATA TAB */}
            {activeTab === 'storage' && (
              <div className="space-y-4">
                {/* Storage Engine Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-blue-600" />
                      <span>IndexedDB + CRDT</span>
                    </div>
                    <div className="text-sm font-bold text-neutral-900">Active & Syncing</div>
                    <div className="text-[10.5px] text-neutral-500">100% Local-First Browser DB</div>
                  </div>

                  <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                      <span>OPFS Persistence</span>
                    </div>
                    <div className="text-sm font-bold text-emerald-700">
                      {storageQuota?.isOpfsSupported ? 'Supported & Ready' : 'IndexedDB Fallback'}
                    </div>
                    <div className="text-[10.5px] text-neutral-500">Origin Private File System</div>
                  </div>

                  <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FileArchive className="w-3.5 h-3.5 text-purple-600" />
                      <span>Gzip Compression</span>
                    </div>
                    <div className="text-sm font-bold text-purple-700">Stream Gzip Active</div>
                    <div className="text-[10.5px] text-neutral-500">Transparent on-disk gzip</div>
                  </div>
                </div>

                {/* Storage Usage Bar */}
                {storageQuota?.isQuotaAvailable && (
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-neutral-600" />
                        <span>Browser Storage Allocated</span>
                      </span>
                      <span className="font-mono text-neutral-700 font-bold">
                        {formatBytes(storageQuota.usage)} / {formatBytes(storageQuota.quota)} ({storageQuota.percentUsed}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#007a5a] h-full transition-all duration-300"
                        style={{ width: `${Math.max(2, storageQuota.percentUsed)}%` }}
                      />
                    </div>
                    <p className="text-[10.5px] text-neutral-500">
                      Browser-managed sandboxed storage. Large file attachments and messages are stored with automatic gzip stream compression.
                    </p>
                  </div>
                )}

                {/* Interactive Compression Benchmark Card */}
                <div className="p-4 bg-neutral-900 text-white rounded-xl border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                        <FileArchive className="w-4 h-4" />
                        <span>Storage Compression Engine</span>
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Test live gzip stream compression efficiency on encrypted message stores
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunCompressionBenchmark}
                      disabled={isCompressing}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Play className={`w-3 h-3 ${isCompressing ? 'animate-spin' : ''}`} />
                      <span>{isCompressing ? 'Testing...' : 'Run Compression Test'}</span>
                    </button>
                  </div>

                  {compressionBenchmark && (
                    <div className="p-3 bg-neutral-800/80 rounded-lg border border-neutral-700 space-y-1.5 text-xs font-mono animate-in fade-in">
                      <div className="flex justify-between text-neutral-300">
                        <span>Raw JSON Store Size:</span>
                        <span className="text-white font-bold">{formatBytes(compressionBenchmark.rawBytes)}</span>
                      </div>
                      <div className="flex justify-between text-neutral-300">
                        <span>Compressed Stream Size:</span>
                        <span className="text-emerald-400 font-bold">{formatBytes(compressionBenchmark.compressedBytes)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-neutral-700 text-emerald-300 font-bold">
                        <span>Space Saved on Disk:</span>
                        <span>{compressionBenchmark.savings} reduction</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Clear / Maintenance Row */}
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-neutral-900">Local Media Cache Cleanup</div>
                    <div className="text-[11px] text-neutral-500 leading-relaxed">
                      Clear cached media and attachment files while preserving channel text history
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearMediaStorage}
                    className="w-full sm:w-auto px-4 py-2 bg-neutral-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-neutral-300 text-neutral-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{clearedStorageSuccess ? 'Cache Cleared!' : 'Purge Media Cache'}</span>
                  </button>
                </div>

                {/* Local-First Guarantee Notice */}
                <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded-xl text-xs text-neutral-700 space-y-1">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-700" />
                    <span>Local-First Storage Guarantee</span>
                  </p>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">
                    Open Slack stores workspace messages, cryptographic signing keys, threads, and attachments directly inside your local browser storage using standard WebCrypto, IndexedDB, and OPFS. No data is ever sent to or logged on centralized servers.
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
