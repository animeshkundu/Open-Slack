import {
  Bell,
  BellOff,
  Check,
  Clock,
  Copy,
  Database,
  Download,
  HardDrive,
  Key,
  Radio,
  RefreshCw,
  Save,
  Server,
  Shield,
  Upload,
  User,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { generateAvatarSvg } from '../../lib/crypto';
import { isDNDActive, requestNotificationPermission } from '../../lib/notifications';
import { DEFAULT_RELAYS } from '../../lib/p2p';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'profile' | 'notifications' | 'crypto' | 'network' | 'storage';

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
    activeWorkspace,
    channels,
    simulatePeerMessage,
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Form states
  const [displayName, setDisplayName] = useState(identity?.displayName || '');
  const [handle, setHandle] = useState(identity?.handle || '');
  const [status, setStatus] = useState(identity?.status || '');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen || !identity) return null;

  const dndActive = isDNDActive(preferences);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const newAvatar = generateAvatarSvg(displayName, identity.color);
    updateProfile({
      displayName,
      handle: cleanHandle,
      status,
      avatarUrl: newAvatar,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
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

  return (
    <div
      id="user-settings-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="user-settings-modal-card"
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/60">
          <h3 className="text-base font-black text-neutral-900">Preferences & Settings</h3>
          <button
            id="close-settings-modal"
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Tabs Sidebar */}
          <div className="w-48 bg-neutral-50/80 border-r border-neutral-200 p-3 space-y-1">
            <button
              id="tab-profile-btn"
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left ${
                activeTab === 'profile'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile & Status</span>
            </button>

            <button
              id="tab-notifications-btn"
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left ${
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
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left ${
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
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left ${
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
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition text-left ${
                activeTab === 'storage'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Local Storage</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-neutral-100">
                  <img
                    src={identity.avatarUrl}
                    alt={identity.displayName}
                    className="w-16 h-16 rounded-xl border border-neutral-200 shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="font-bold text-sm text-neutral-900">
                      {identity.displayName}
                    </div>
                    <div className="text-xs text-neutral-500 font-mono">
                      Fingerprint: {identity.pubkey.slice(0, 16)}...
                    </div>
                  </div>
                </div>

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

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    What's your status?
                  </label>
                  <input
                    id="settings-status"
                    type="text"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    placeholder="e.g. In a meeting 📅, Working from home 🏡"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
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
                    className="ml-auto px-4 py-2 bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* NOTIFICATIONS TAB */}
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
                        ACTIVE UNTIL {new Date(preferences.dndUntil!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                      className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition text-center"
                    >
                      30 minutes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDND(60)}
                      className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition text-center"
                    >
                      1 hour
                    </button>
                    <button
                      type="button"
                      onClick={() => setDND(120)}
                      className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition text-center"
                    >
                      2 hours
                    </button>
                    <button
                      type="button"
                      onClick={() => setDND(null)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition text-center ${
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
                        onChange={(e) => updatePreferences({ soundEnabled: e.target.checked })}
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
                      { id: 'all', label: 'All new messages', desc: 'Notify on every message in your channels' },
                      { id: 'mentions_only', label: 'Direct mentions and @mentions only', desc: 'Only alert when you are explicitly tagged' },
                      { id: 'none', label: 'Nothing', desc: 'Never dispatch desktop banners' },
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
                          onChange={() => updatePreferences({ desktopNotifications: opt.id as any })}
                          className="mt-0.5 text-[#1264A3]"
                        />
                        <div>
                          <div className="text-xs font-bold text-neutral-900">{opt.label}</div>
                          <div className="text-[11px] text-neutral-500">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CRYPTO TAB */}
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
                      className="text-xs text-[#1264A3] hover:underline font-semibold flex items-center gap-1"
                    >
                      {copiedKey === 'pubkey' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
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
                      onClick={() => copyToClipboard(identity.enc_pubkey || '', 'enckey')}
                      className="text-xs text-[#1264A3] hover:underline font-semibold flex items-center gap-1"
                    >
                      {copiedKey === 'enckey' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
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
                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
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

            {/* NETWORK TAB */}
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

            {/* STORAGE TAB */}
            {activeTab === 'storage' && (
              <div className="space-y-4">
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700">
                      Storage Engine:
                    </span>
                    <span className="font-mono font-bold text-neutral-900">
                      IndexedDB + Yjs CRDT + OPFS
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700">
                      Offline Mode:
                    </span>
                    <span className="font-bold text-emerald-600">
                      100% Fully Capable
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="simulate-peer-action-btn"
                    type="button"
                    onClick={() => {
                      simulatePeerMessage();
                      onClose();
                    }}
                    className="w-full py-2.5 bg-[#1264A3] hover:bg-[#0b4c80] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Simulate Incoming Peer Message (P2P Test)</span>
                  </button>
                  <p className="text-[11px] text-neutral-500 text-center mt-1.5">
                    Spawns a mock peer CRDT transaction to test notifications and state merge.
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
