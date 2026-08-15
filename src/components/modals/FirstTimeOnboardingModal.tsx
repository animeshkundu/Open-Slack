import { ArrowRight, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { deriveUniqueHandle, generateAvatarSvg } from '../../lib/crypto';

const AVATAR_COLORS = [
  '#E01E5A', // Slack Red
  '#2BAC76', // Green
  '#1164A3', // Blue
  '#ECB22E', // Yellow
  '#4A154B', // Deep Aubergine
  '#007a5a', // Dark Green
  '#611f69', // Berry
  '#e8912d', // Orange
];

interface FirstTimeOnboardingModalProps {
  onComplete?: () => void;
}

export const FirstTimeOnboardingModal: React.FC<FirstTimeOnboardingModalProps> = ({ onComplete }) => {
  const { identity, updateProfile, activeWorkspace } = useWorkspace();
  const [fullName, setFullName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#4A154B');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-derive collision-free alias from full name and cryptographic public key
  const autoAlias = deriveUniqueHandle(fullName, identity?.pubkey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    if (!cleanName) {
      setError('Please enter your full name to continue.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const newAvatar = generateAvatarSvg(cleanName, selectedColor);
    
    // Save to identity & IndexedDB with hasCustomName: true
    updateProfile({
      displayName: cleanName,
      handle: autoAlias,
      color: selectedColor,
      avatarUrl: newAvatar,
      hasCustomName: true,
    });

    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div
      id="first-time-onboarding-overlay"
      className="fixed inset-0 z-[100] bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="first-time-onboarding-card"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#4A154B] to-[#611f69] p-6 text-white text-center relative">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Welcome to Open-Slack</h2>
          <p className="text-purple-100 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
            Set up your decentralized profile to join {activeWorkspace?.name || 'the peer-to-peer workspace'}.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Privacy & Mesh Note */}
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-700 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#4A154B] flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Local-First Persistence:</strong> Your name and cryptographic keys are stored durable inside your browser's IndexedDB. No central server stores your data.
            </div>
          </div>

          {/* Live Avatar Preview & Color Selection */}
          <div className="flex items-center gap-4 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-lg shadow-sm flex-shrink-0"
              style={{ backgroundColor: selectedColor }}
            >
              {fullName.trim().slice(0, 2).toUpperCase() || '??'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-neutral-700 mb-1.5">Choose Avatar Accent</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                      selectedColor === c ? 'ring-2 ring-neutral-900 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Full Name Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="first-time-name-input"
              data-testid="first-time-name-input"
              type="text"
              required
              placeholder="e.g. Animesh Kundu"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-neutral-900 outline-none focus:border-blue-500 focus:bg-white font-medium transition"
              autoFocus
            />
          </div>

          {/* Auto-Derived Handle / Alias (Non-editable by user to prevent collisions) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                Auto-Derived Alias (@handle)
              </label>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                <Lock className="w-2.5 h-2.5" /> Collision-Free
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                id="first-time-handle-display"
                data-testid="first-time-handle-display"
                type="text"
                readOnly
                disabled
                value={autoAlias}
                className="w-full px-3.5 py-2.5 bg-neutral-100 border border-neutral-200 rounded-lg text-sm text-neutral-600 font-mono font-bold select-all cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Your alias is automatically derived from your name to avoid handle collisions across all workspaces.
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              id="first-time-submit-btn"
              data-testid="first-time-submit-btn"
              type="submit"
              disabled={!fullName.trim() || isSubmitting}
              className="w-full py-3 bg-[#4A154B] hover:bg-[#611f69] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <span>Continue to Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
