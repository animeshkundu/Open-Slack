import React, { useState } from 'react';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Frequent',
    emojis: ['👍', '❤️', '🔥', '🎉', '🚀', '👀', '🙌', '💯', '😂', '👏', '✅', '✨'],
  },
  {
    name: 'Expressions',
    emojis: ['😀', '😍', '🤔', '😎', '🥳', '🤩', '🤯', '😭', '😇', '🫡', '💡', '⚡'],
  },
  {
    name: 'Gestures',
    emojis: ['👋', '🤝', '✌️', '💪', '🙏', '🤙', '👆', '👇', '🎯', '🏆', '💎', '⭐'],
  },
  {
    name: 'Dev & P2P',
    emojis: ['💻', '🔒', '🛡️', '📡', '🌐', '⚡', '☕', '🍕', '📦', '🔑', '🛠️', '⚙️'],
  },
];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({ onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmojis = searchTerm.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    : null;

  return (
    <div
      id="reaction-picker-popover"
      className="absolute bottom-full mb-2 right-0 z-50 w-72 bg-white rounded-lg shadow-2xl border border-neutral-200 p-3 text-neutral-800 animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
        <input
          type="text"
          placeholder="Search emojis..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs px-2.5 py-1.5 bg-neutral-100 rounded border border-transparent focus:border-blue-500 focus:bg-white outline-none"
          autoFocus
        />
      </div>

      <div className="max-h-52 overflow-y-auto pr-1 space-y-3">
        {filteredEmojis ? (
          <div>
            <div className="text-[11px] font-semibold text-neutral-500 mb-1">Results</div>
            <div className="grid grid-cols-6 gap-1">
              {filteredEmojis.map((emoji, idx) => (
                <button
                  key={idx}
                  id={`emoji-btn-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelect(emoji);
                    onClose();
                  }}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-neutral-100 rounded transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          EMOJI_CATEGORIES.map((category) => (
            <div key={category.name}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                {category.name}
              </div>
              <div className="grid grid-cols-6 gap-1">
                {category.emojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    id={`cat-emoji-btn-${category.name}-${idx}`}
                    type="button"
                    onClick={() => {
                      onSelect(emoji);
                      onClose();
                    }}
                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-neutral-100 rounded transition-transform hover:scale-125 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
