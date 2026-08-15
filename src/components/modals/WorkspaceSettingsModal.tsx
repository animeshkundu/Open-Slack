import {
  AlertTriangle,
  Check,
  Globe,
  Key,
  Lock,
  LogOut,
  Palette,
  Save,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

const WORKSPACE_COLORS = [
  { label: 'Aubergine', value: '#4A154B' },
  { label: 'Emerald', value: '#007A5A' },
  { label: 'Royal Blue', value: '#1264A3' },
  { label: 'Slack Red', value: '#E01E5A' },
  { label: 'Golden Amber', value: '#ECB22E' },
  { label: 'Deep Violet', value: '#611F69' },
  { label: 'Ocean Teal', value: '#0B8296' },
  { label: 'Charcoal Dark', value: '#1D1C1D' },
];

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { activeWorkspace, updateWorkspaceSettings, leaveWorkspace, identity } = useWorkspace();

  const [workspaceName, setWorkspaceName] = useState(activeWorkspace?.name || '');
  const [selectedColor, setSelectedColor] = useState(activeWorkspace?.color || '#4A154B');
  const [requireApproval, setRequireApproval] = useState(
    activeWorkspace?.settings?.requireApprovalForInvites || false
  );
  const [allowGuestInvites, setAllowGuestInvites] = useState(
    activeWorkspace?.settings?.allowGuestInvites ?? true
  );
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);
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
    // Update local workspace properties (name & color)
    if (activeWorkspace) {
      activeWorkspace.name = workspaceName.trim() || activeWorkspace.name;
      activeWorkspace.color = selectedColor;
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  const handleLeave = () => {
    leaveWorkspace(activeWorkspace.id);
    onClose();
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
            <div
              style={{ backgroundColor: selectedColor }}
              className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold shadow-xs transition-colors"
            >
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
          {/* General & Appearance */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-purple-600" /> Branding & Workspace Color
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Workspace Name
                </label>
                <input
                  id="ws-name-input"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. Acme Engineering"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Workspace Accent Color
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {WORKSPACE_COLORS.map((col) => {
                    const isSelected = selectedColor === col.value;
                    return (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setSelectedColor(col.value)}
                        style={{ backgroundColor: col.value }}
                        title={col.label}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110 shadow-sm'
                            : 'opacity-80 hover:opacity-100 hover:scale-105'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

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

          {/* Danger Zone: Leave Workspace */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Danger Zone
            </div>

            <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-rose-900">Leave this Workspace</div>
                <p className="text-[11px] text-rose-600 leading-relaxed">
                  Remove this workspace from your workspace switcher. You can rejoin anytime via an invite link.
                </p>
              </div>

              {!isConfirmingLeave ? (
                <button
                  id="leave-workspace-btn"
                  type="button"
                  onClick={() => setIsConfirmingLeave(true)}
                  className="px-3 py-1.5 bg-white border border-rose-300 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 flex-shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" /> Leave
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingLeave(false)}
                    className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-leave-workspace-btn"
                    type="button"
                    onClick={handleLeave}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
                  >
                    Yes, Leave
                  </button>
                </div>
              )}
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
