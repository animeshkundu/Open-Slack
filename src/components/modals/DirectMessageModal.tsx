import { Check, MessageSquare, Search, User, X } from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { peerUsers, identity, openDirectMessage } = useWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  const [manualPubkey, setManualPubkey] = useState('');

  if (!isOpen) return null;

  const usersList = Array.from(peerUsers.values()).filter(
    (u) => u.pubkey !== identity?.pubkey
  );

  const filteredUsers = usersList.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.handle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartDM = async (pubkey: string) => {
    try {
      await openDirectMessage(pubkey);
      onClose();
    } catch (err) {
      console.error('Failed to open DM:', err);
    }
  };

  return (
    <div
      id="dm-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="dm-modal-card"
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-lg font-black text-neutral-900">Direct Messages</h3>
          <button
            id="close-dm-modal"
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-neutral-100">
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100 rounded-lg">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              id="dm-search-input"
              type="text"
              placeholder="Find or start a conversation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-neutral-900 outline-none flex-1"
              autoFocus
            />
          </div>
        </div>

        {/* Teammates list */}
        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <button
                key={user.pubkey}
                id={`dm-user-${user.pubkey}`}
                type="button"
                onClick={() => handleStartDM(user.pubkey)}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-neutral-100 rounded-lg transition text-left"
              >
                <div className="relative">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="w-9 h-9 rounded-md object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-white text-xs"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.displayName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      user.isOnline ? 'bg-emerald-500' : 'bg-neutral-300'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-neutral-900 truncate">
                    {user.displayName}
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate">
                    {user.handle} {user.status ? `• ${user.status}` : ''}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-neutral-400">
              No discovered teammates yet. Invite peers or enter a public key below.
            </div>
          )}
        </div>

        {/* Manual Public Key input */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100">
          <label className="block text-[11px] font-bold text-neutral-600 mb-1">
            Or message by peer public key fingerprint:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste 32-character hex public key..."
              value={manualPubkey}
              onChange={(e) => setManualPubkey(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-mono outline-none"
            />
            <button
              type="button"
              disabled={!manualPubkey.trim()}
              onClick={() => handleStartDM(manualPubkey.trim())}
              className="px-3 py-1.5 bg-[#007a5a] text-white rounded-lg text-xs font-bold disabled:opacity-50"
            >
              Start DM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
