import { AnimatePresence, motion } from 'motion/react';
import { Download, Sparkles, X } from 'lucide-react';
import React from 'react';
import { usePWAInstall } from '../../lib/usePWAInstall';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isDismissed, installApp, dismissPrompt } = usePWAInstall();

  // Do not show if already installed or user dismissed it
  if (!isInstallable || isInstalled || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        id="pwa-install-popup"
        className="fixed z-40 bottom-16 sm:bottom-6 left-3 sm:left-6 right-3 sm:right-auto sm:max-w-sm 
                   bg-[#1E1F23] text-white border border-neutral-700/90 rounded-2xl shadow-2xl p-4 
                   backdrop-blur-md select-none"
        role="dialog"
        aria-label="Install App Prompt"
      >
        <div className="flex items-start justify-between gap-3">
          {/* App Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A154B] to-[#611f69] border border-purple-500/30 flex items-center justify-center flex-shrink-0 shadow-xs">
            <span className="font-extrabold text-[#ECB22E] text-lg font-sans">#</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-white leading-tight">Install Open-Slack</h4>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#007A5A]/20 text-[#2BAC76] border border-[#007A5A]/40">
                <Sparkles className="w-2.5 h-2.5" /> App
              </span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed mt-1">
              Install as a native app for faster startup, offline access, and automatic background updates.
            </p>
          </div>

          {/* Close button */}
          <button
            type="button"
            id="dismiss-pwa-popup-btn"
            onClick={dismissPrompt}
            className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-800 transition cursor-pointer flex-shrink-0"
            title="Dismiss prompt"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Actions Row */}
        <div className="mt-3.5 flex items-center gap-2 justify-end">
          <button
            type="button"
            id="pwa-not-now-btn"
            onClick={dismissPrompt}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            Not now
          </button>
          <button
            type="button"
            id="pwa-install-action-btn"
            onClick={() => installApp()}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#007A5A] hover:bg-[#148567] text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
