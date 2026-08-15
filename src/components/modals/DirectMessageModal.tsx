import { Check, MessageSquare, Search, User, X } from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInvite?: () => void;
}

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  isOpen,
  onClose,
  onOpenInvite,
}) => {
  const { peerUsers, identity, openDirectMessage } = useWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  const [manualPubkey, setManualPubkey] = useState('');
  const [selectedPubkeys, setSelectedPubkeys] = useState<string[]>([]);

  if (!isOpen) return null;

  const usersList = Array.from(peerUsers.values()).filter(
    (u) => u.pubkey !== identity?.pubkey
  );

  const filteredUsers = usersList.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.handle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (pubkey: string) => {
    if (selectedPubkeys.includes(pubkey)) {
      setSelectedPubkeys(selectedPubkeys.filter((p) => p !== pubkey));
    } else {
      setSelectedPubkeys([...selectedPubkeys, pubkey]);
    }
  };

  const handleStartConversation = async () => {
    if (selectedPubkeys.length === 0) return;
    try {
      if (selectedPubkeys.length === 1) {
        await openDirectMessage(selectedPubkeys[0]);
      } else {
        await openDirectMessage(selectedPubkeys);
      }
      setSelectedPubkeys([]);
      onClose();
    } catch (err) {
      console.error('Failed to open DM:', err);
    }
  };

  const handleStartManualDM = async (pubkey: string) => {
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        id="dm-modal-card"
        className="w-full max-w-md max-h-[92dvh] sm:max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-neutral-200 overflow-y-auto flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto my-2 sm:hidden flex-shrink-0" />

        <div className="p-5 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-lg font-black text-neutral-900">Direct Messages</h3>
            <p className="text-xs text-neutral-500">Select one or multiple peers for a group DM</p>
          </div>
          <button
            id="close-dm-modal"
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected chips */}
        {selectedPubkeys.length > 0 && (
          <div className="px-4 py-2 bg-purple-50/60 border-b border-purple-100 flex flex-wrap items-center gap-1.5 flex-shrink-0">
            <span className="text-[11px] font-bold text-[#4A154B] mr-1">To:</span>
            {selectedPubkeys.map((pk) => {
              const u = peerUsers.get(pk);
              const label = u ? u.displayName : `${pk.slice(0, 8)}...`;
              return (
                <span
                  key={pk}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#4A154B] text-white rounded-md text-xs font-semibold"
                >
                  <span>{label}</span>
                  <button
                    type="button"
                    onClick={() => toggleUserSelection(pk)}
                    className="hover:text-red-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="p-4 border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100 rounded-lg">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              id="dm-search-input"
              type="text"
              placeholder="Search by name or handle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-neutral-900 outline-none flex-1"
              autoFocus
            />
          </div>
        </div>

        {/* Teammates list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[140px] max-h-64">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isSelected = selectedPubkeys.includes(user.pubkey);
              return (
                <button
                  key={user.pubkey}
                  id={`dm-user-${user.pubkey}`}
                  type="button"
                  onClick={() => toggleUserSelection(user.pubkey)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition text-left cursor-pointer ${
                    isSelected ? 'bg-purple-50 text-[#4A154B]' : 'hover:bg-neutral-100'
                  }`}
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

                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-[#4A154B] border-[#4A154B] text-white'
                        : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-6 px-4 space-y-3">
              <div className="text-xs text-neutral-500 leading-relaxed">
                No workspace members online yet. In Slack, DMs search people already in the
                workspace — invite teammates first, then start a conversation.
              </div>
              {onOpenInvite && (
                <button
                  id="dm-modal-invite-cta"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInvite();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#4A154B] hover:bg-[#611f69] text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  Invite people to workspace
                </button>
              )}
              <p className="text-[11px] text-neutral-400">
                Or paste a peer public key fingerprint below.
              </p>
            </div>
          )}
        </div>

        {/* Action Button for selected users */}
        {selectedPubkeys.length > 0 && (
          <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex justify-end">
            <button
              id="start-dm-btn"
              type="button"
              onClick={handleStartConversation}
              className="w-full py-2.5 bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>
                {selectedPubkeys.length > 1
                  ? `Start Group DM (${selectedPubkeys.length} people)`
                  : 'Start Direct Message'}
              </span>
            </button>
          </div>
        )}

        {/* Manual Public Key input */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex-shrink-0">
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
              onClick={() => handleStartManualDM(manualPubkey.trim())}
              className="px-3 py-1.5 bg-[#007a5a] text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              Start DM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
