import { Hash, Lock, X } from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createChannel } = useWorkspace();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createChannel(name, topic, isPrivate);
      setName('');
      setTopic('');
      setIsPrivate(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="create-channel-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        id="create-channel-modal-card"
        className="w-full max-w-lg max-h-[92dvh] sm:max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-neutral-200 overflow-y-auto flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto my-2 sm:hidden flex-shrink-0" />

        <div className="p-6 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-xl font-black text-neutral-900 tracking-tight">
            Create a channel
          </h3>
          <button
            id="close-create-channel-modal"
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-neutral-400">
                {isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
              </span>
              <input
                id="channel-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. plan-launch"
                required
                className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-neutral-900 outline-none focus:border-blue-500 focus:bg-white transition"
                autoFocus
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Channels are where your team communicates across decentralized topics.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
              Topic (optional)
            </label>
            <input
              id="channel-topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What is this channel about?"
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-neutral-900 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Private Channel Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-lg border border-neutral-200">
            <div>
              <div className="font-semibold text-sm text-neutral-900">Make private</div>
              <div className="text-xs text-neutral-500">
                When a channel is private, it can only be viewed or joined by invite.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="channel-private-toggle"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007a5a]"></div>
            </label>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
            <button
              id="cancel-create-channel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-create-channel-btn"
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-5 py-2 text-sm font-bold bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
