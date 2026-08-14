import confetti from 'canvas-confetti';
import {
  Check,
  Copy,
  Globe,
  Key,
  QrCode,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose }) => {
  const { activeWorkspace } = useWorkspace();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!isOpen || !activeWorkspace) return null;

  // Generate Invite URL payload with base64 data
  const payloadStr = btoa(JSON.stringify(activeWorkspace));
  const inviteUrl = `${window.location.origin}${window.location.pathname}#invite=${payloadStr}`;
  const jsonConfig = JSON.stringify(activeWorkspace, null, 2);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonConfig);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div
      id="invite-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="invite-modal-card"
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900">
                Invite teammates to {activeWorkspace.name}
              </h3>
              <p className="text-xs text-neutral-500">
                Direct P2P invitation • No central server required
              </p>
            </div>
          </div>
          <button
            id="close-invite-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Direct 1-Click Link */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
              Shareable Workspace Invite Link
            </label>
            <div className="flex items-center gap-2">
              <input
                id="invite-link-copy-input"
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono text-neutral-700 select-all outline-none"
              />
              <button
                id="copy-invite-link-btn"
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2 bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs flex-shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1.5">
              Anyone with this link will automatically connect to your Nostr room and sync the Yjs CRDT document.
            </p>
          </div>

          {/* Workspace Cryptographic Specs */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-600" /> Workspace Passphrase:
              </span>
              <span className="font-mono font-bold text-neutral-900">
                {activeWorkspace.passphrase || 'Open-Access'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" /> Active Nostr Relays:
              </span>
              <span className="font-semibold text-neutral-800">
                {activeWorkspace.relays.length} Public Relays
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Security Layer:
              </span>
              <span className="font-semibold text-emerald-700">
                ECDSA P-256 + ECDH / AES-GCM
              </span>
            </div>
          </div>

          {/* Raw JSON Payload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Raw Workspace JSON
              </label>
              <button
                type="button"
                onClick={handleCopyJson}
                className="text-xs text-[#1264A3] hover:underline font-semibold flex items-center gap-1"
              >
                {copiedJson ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <pre className="p-3 bg-neutral-900 text-neutral-200 rounded-lg text-[11px] font-mono overflow-x-auto max-h-28">
              {jsonConfig}
            </pre>
          </div>
        </div>

        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex justify-end">
          <button
            id="close-invite-modal-bottom-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
