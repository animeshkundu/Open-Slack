import { Key, Link, Plus, X } from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Workspace } from '../../types';

interface JoinWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinWorkspaceModal: React.FC<JoinWorkspaceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createWorkspace, joinWorkspace } = useWorkspace();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createWorkspace(name, passphrase || undefined);
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
      let wsData: Workspace;
      if (input.includes('#invite=')) {
        const payloadStr = decodeURIComponent(input.split('#invite=')[1]);
        wsData = JSON.parse(atob(payloadStr));
      } else if (input.startsWith('{')) {
        wsData = JSON.parse(input);
      } else {
        throw new Error('Invalid invite link or JSON config');
      }

      if (!wsData.id || !wsData.name) {
        throw new Error('Malformed workspace payload');
      }

      joinWorkspace(wsData);
      setInviteInput('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not parse workspace invite link');
    }
  };

  return (
    <div
      id="join-workspace-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="join-workspace-modal-card"
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('create');
                setError('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mode === 'create'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Create Workspace
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('join');
                setError('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mode === 'join'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Join with Link
            </button>
          </div>

          <button
            id="close-join-ws-modal"
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 text-red-700 text-xs font-medium rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {mode === 'create' ? (
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Workspace Name
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
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <button
              id="submit-create-ws-btn"
              type="submit"
              disabled={!name.trim()}
              className="w-full py-2.5 bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              Create P2P Workspace
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Invite Link or Raw JSON Config
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
              className="w-full py-2.5 bg-[#1264A3] hover:bg-[#0b4c80] text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              Connect & Join Mesh
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
