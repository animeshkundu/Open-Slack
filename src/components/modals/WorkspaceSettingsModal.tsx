import {
  Check,
  Globe,
  Key,
  Lock,
  Save,
  Settings,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { activeWorkspace, updateWorkspaceSettings, identity } = useWorkspace();

  const [requireApproval, setRequireApproval] = useState(
    activeWorkspace?.settings?.requireApprovalForInvites || false
  );
  const [allowGuestInvites, setAllowGuestInvites] = useState(
    activeWorkspace?.settings?.allowGuestInvites ?? true
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen || !activeWorkspace) return null;

  const isOwner = identity?.pubkey === (activeWorkspace.ownerId || activeWorkspace.ownerPubkey);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkspaceSettings({
      requireApprovalForInvites: requireApproval,
      allowGuestInvites,
      defaultChannels: activeWorkspace.settings?.defaultChannels || ['chan_general', 'chan_random'],
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      id="workspace-settings-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        id="workspace-settings-modal-card"
        className="w-full max-w-lg max-h-[92dvh] sm:max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-neutral-200 overflow-y-auto flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto my-2 sm:hidden flex-shrink-0" />

        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-900">Workspace Settings</h3>
              <p className="text-xs text-neutral-500">{activeWorkspace.name}</p>
            </div>
          </div>
          <button
            id="close-ws-settings-modal"
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Access Control Firewall Section */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Access Control & Approval Flow
            </div>

            {/* Toggle: Require Admin Approval */}
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#1264A3]" />
                  <span>Require Admin Approval for Invites</span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  When enabled, invite links place prospective members in a pending queue until an administrator approves their access request.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
                <input
                  id="toggle-require-approval-input"
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#007a5a]"></div>
              </label>
            </div>

            {/* Toggle: Allow Member Guest Invites */}
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Allow Members to Share Invites</span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Permit standard workspace members to generate invite links.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
                <input
                  id="toggle-allow-guests-input"
                  type="checkbox"
                  checked={allowGuestInvites}
                  onChange={(e) => setAllowGuestInvites(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#007a5a]"></div>
              </label>
            </div>
          </div>

          {/* Workspace Cryptographic Info */}
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Workspace Owner ID:</span>
              <span className="font-mono font-bold text-neutral-800">
                {(activeWorkspace.ownerId || activeWorkspace.ownerPubkey).slice(0, 16)}...
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Signaling Mesh:</span>
              <span className="font-semibold text-emerald-600">
                {activeWorkspace.relays.length} Public Nostr Relays
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Settings updated
              </span>
            )}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                id="save-ws-settings-btn"
                type="submit"
                className="px-4 py-2 bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" /> Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
