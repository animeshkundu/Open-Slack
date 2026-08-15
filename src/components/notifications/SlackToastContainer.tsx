import { AnimatePresence, motion } from 'motion/react';
import { AtSign, Hash, Lock, MessageSquare, Sparkles, User, Users, Volume2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ToastNotification } from '../../types';

interface SlackToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
  onToastClick: (toast: ToastNotification) => void;
}

export const SlackToastContainer: React.FC<SlackToastContainerProps> = ({
  toasts,
  onDismiss,
  onToastClick,
}) => {
  return (
    <div
      id="slack-toast-container"
      className="fixed z-50 pointer-events-none flex flex-col gap-2.5 
                 top-4 inset-x-3 sm:top-auto sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full"
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <SlackToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => onDismiss(toast.id)}
            onClick={() => onToastClick(toast)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface SlackToastItemProps {
  toast: ToastNotification;
  onDismiss: () => void;
  onClick: () => void;
}

const SlackToastItem: React.FC<SlackToastItemProps> = ({ toast, onDismiss, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [isHovered, onDismiss]);

  const getChannelIcon = () => {
    if (toast.isDirectMessage) {
      return <Users className="w-3 h-3 text-emerald-400" />;
    }
    if (toast.isPrivate) {
      return <Lock className="w-3 h-3 text-amber-400" />;
    }
    if (toast.type === 'huddle') {
      return <Volume2 className="w-3 h-3 text-emerald-400" />;
    }
    return <Hash className="w-3 h-3 text-neutral-400" />;
  };

  const getBadgeStyle = () => {
    if (toast.type === 'mention') {
      return 'bg-[#E01E5A]/20 text-[#FF7096] border-[#E01E5A]/40';
    }
    if (toast.type === 'thread_reply') {
      return 'bg-blue-900/30 text-blue-300 border-blue-700/40';
    }
    if (toast.type === 'huddle') {
      return 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40';
    }
    return 'bg-neutral-800/80 text-neutral-300 border-neutral-700/50';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id={`toast-item-${toast.id}`}
      className="pointer-events-auto bg-[#1A1D21] text-white border border-neutral-700/80 rounded-xl shadow-2xl 
                 p-3 sm:p-3.5 flex flex-col gap-2 cursor-pointer transition hover:border-neutral-500 hover:bg-[#222529] select-none"
      onClick={onClick}
    >
      {/* Top Header: Channel / Context Badge & Dismiss */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${getBadgeStyle()}`}
          >
            {getChannelIcon()}
            <span className="truncate max-w-[140px]">{toast.channelName || 'Notification'}</span>
          </span>

          {toast.type === 'mention' && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#E01E5A] bg-[#E01E5A]/15 px-1 py-0.2 rounded">
              <AtSign className="w-2.5 h-2.5" /> mention
            </span>
          )}

          {toast.type === 'thread_reply' && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-sky-400 bg-sky-950/40 px-1 py-0.2 rounded">
              <MessageSquare className="w-2.5 h-2.5" /> thread
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-neutral-400 font-mono">Just now</span>
          <button
            type="button"
            id={`dismiss-toast-${toast.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body: Avatar + Author + Message snippet */}
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="relative flex-shrink-0">
          {toast.authorAvatar ? (
            <img
              src={toast.authorAvatar}
              alt={toast.authorName}
              className="w-8 h-8 rounded-lg object-cover bg-neutral-800 border border-neutral-700"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white">
              {toast.authorName.slice(0, 2).toUpperCase() || 'U'}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white truncate leading-tight">
            {toast.authorName}
          </div>
          <p className="text-[12px] text-neutral-300 line-clamp-2 leading-relaxed mt-0.5 break-words">
            {toast.content}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
