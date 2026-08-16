import {
  Clock,
  Key,
  Link,
  Plus,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { decodeDeviceSyncPayload } from '../../lib/multiDevice';
import { Workspace } from '../../types';

interface JoinWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinWorkspaceModal: React.FC<JoinWorkspaceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createWorkspace, joinWorkspace, submitJoinRequest, identity, updateProfile } = useWorkspace();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [error, setError] = useState('');

  // Identity confirmation fields
  const [joinerName, setJoinerName] = useState(identity?.displayName || '');
  const [joinerHandle, setJoinerHandle] = useState(identity?.handle || '');

  // Approval request form state if target workspace requires approval
  const [needsApproval, setNeedsApproval] = useState(false);
  const [pendingTargetWs, setPendingTargetWs] = useState<Workspace | null>(null);
  const [requestName, setRequestName] = useState(identity?.displayName || '');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestRole, setRequestRole] = useState('Engineer / Designer');
  const [submittedRequest, setSubmittedRequest] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (joinerName.trim()) {
        updateProfile({
          displayName: joinerName.trim(),
          handle: joinerHandle.startsWith('@') ? joinerHandle.trim() : `@${joinerHandle.trim()}`,
        });
      }
      await createWorkspace(name, passphrase || undefined, {
        requireApprovalForInvites: requireApproval,
        defaultChannels: ['chan_general', 'chan_random'],
        allowGuestInvites: true,
      });
      setName('');
      setPassphrase('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create workspace');
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const input = inviteInput.trim();
    try {
      if (joinerName.trim()) {
        updateProfile({
          displayName: joinerName.trim(),
          handle: joinerHandle.startsWith('@') ? joinerHandle.trim() : `@${joinerHandle.trim()}`,
        });
      }

      let wsData: Workspace;
      if (input.includes('#device-sync=')) {
        const payloadStr = decodeURIComponent(input.split('#device-sync=')[1].split('&')[0]);
        const parsed = decodeDeviceSyncPayload(payloadStr);
        if (parsed && parsed.workspaces && parsed.workspaces.length > 0) {
          wsData = parsed.workspaces[0] as Workspace;
        } else {
          throw new Error('Invalid device sync payload');
        }
      } else if (input.includes('#invite=') || input.includes('#/join/')) {
        const payloadStr = decodeURIComponent(input.split(/#invite=|#\/join\//)[1].split('&')[0]);
        wsData = JSON.parse(decodeURIComponent(escape(atob(payloadStr))));
      } else if (input.startsWith('{')) {
        wsData = JSON.parse(input);
      } else {
        throw new Error('Invalid invite link or JSON config');
      }

      if (!wsData.id || !wsData.name) {
        throw new Error('Malformed workspace payload');
      }

      // Check if target workspace requires admin approval
      if (wsData.settings?.requireApprovalForInvites) {
        setPendingTargetWs(wsData);
        setNeedsApproval(true);
        return;
      }

      joinWorkspace(wsData);
      setInviteInput('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not parse workspace invite link');
    }
  };

  const handleSubmitApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTargetWs) return;
    try {
      if (requestName.trim()) {
        updateProfile({ displayName: requestName.trim() });
      }
      joinWorkspace(pendingTargetWs);
      await submitJoinRequest(requestName, requestEmail, requestRole);
      setSubmittedRequest(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit approval request');
    }
  };

  return (
    <div
      id="join-workspace-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        id="join-workspace-modal-card"
        className="w-full max-w-md max-h-[92dvh] sm:max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-neutral-200 overflow-y-auto flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto my-2 sm:hidden flex-shrink-0" />

        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/60 flex-shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('create');
                setNeedsApproval(false);
                setError('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mode === 'create'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              Create Workspace
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('join');
                setNeedsApproval(false);
                setError('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mode === 'join'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              Join with Link
            </button>
          </div>

          <button
            id="close-join-ws-modal"
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 text-red-700 text-xs font-medium rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Approval Form state */}
        {needsApproval ? (
          submittedRequest ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="text-base font-bold text-neutral-900">Request Pending Approval</h4>
              <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
                Your join request has been dispatched directly to the administrators of{' '}
                <span className="font-semibold text-neutral-900">{pendingTargetWs?.name}</span>. Once approved, you will have full access.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitApproval} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Admin Approval Required</div>
                  <div>This workspace requires admin approval for new teammates. Please submit your details:</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="alex@company.com"
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Role / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Frontend Engineer, Product Designer"
                  value={requestRole}
                  onChange={(e) => setRequestRole(e.target.value)}
                  className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Submit Join Request
              </button>
            </form>
          )
        ) : mode === 'create' ? (
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Workspace Name <span className="text-red-500">*</span>
              </label>
              <input
                id="create-ws-name-input"
                type="text"
                placeholder="e.g. Acme Corp P2P"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Workspace Encryption Key (Optional)
              </label>
              <input
                id="create-ws-passphrase-input"
                type="text"
                placeholder="Leave blank for auto-generated 256-bit key"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white font-mono"
              />
            </div>

            {/* Approval toggle on creation */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs">
              <span className="text-neutral-700 font-semibold">
                Require Admin Approval for Invites:
              </span>
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="rounded text-[#007a5a] focus:ring-[#007a5a]"
              />
            </div>

            <button
              id="submit-create-ws-btn"
              type="submit"
              disabled={!name.trim()}
              className="w-full py-2.5 bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              Create P2P Workspace
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Invite Link or Raw JSON Config <span className="text-red-500">*</span>
              </label>
              <textarea
                id="join-ws-invite-input"
                rows={4}
                placeholder="Paste the #invite=... link or JSON configuration here"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                required
                className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono outline-none focus:border-blue-500 focus:bg-white resize-none"
                autoFocus
              />
            </div>

            <button
              id="submit-join-ws-btn"
              type="submit"
              disabled={!inviteInput.trim()}
              className="w-full py-2.5 bg-[#1264A3] hover:bg-[#0b4c80] text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              Connect & Join Mesh
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
