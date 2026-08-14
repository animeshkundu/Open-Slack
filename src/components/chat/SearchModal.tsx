import {
  FileText,
  Filter,
  Hash,
  MessageSquare,
  Search,
  User,
  X,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { searchWorkspaceMessages } from '../../lib/search';

export const SearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    messages,
    channels,
    peerUsers,
    selectChannel,
    openThread,
  } = useWorkspace();

  const channelMap = useMemo(() => {
    const map = new Map();
    channels.forEach((c) => map.set(c.id, c));
    return map;
  }, [channels]);

  // Execute search
  const results = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchWorkspaceMessages(messages, channelMap, peerUsers, searchQuery);
  }, [messages, channelMap, peerUsers, searchQuery]);

  if (!isSearchOpen) return null;

  const handleSelectResult = (channelId: string, messageId: string, threadParentId?: string) => {
    selectChannel(channelId);
    if (threadParentId) {
      const parent = messages.find((m) => m.id === threadParentId);
      if (parent) openThread(parent);
    }
    setIsSearchOpen(false);
  };

  const addFilterToQuery = (filterStr: string) => {
    setSearchQuery(`${searchQuery.trim()} ${filterStr} `);
  };

  return (
    <div
      id="search-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 px-4"
      onClick={() => setIsSearchOpen(false)}
    >
      <div
        id="search-modal-card"
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="p-4 border-b border-neutral-200 flex items-center gap-3 bg-neutral-50/50">
          <Search className="w-5 h-5 text-neutral-400 flex-shrink-0" />
          <input
            id="search-modal-input"
            type="text"
            placeholder="Search messages, files, or filters (e.g. from:@alex in:#general)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-400"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Filter suggestions */}
        <div className="px-4 py-2 bg-neutral-50/70 border-b border-neutral-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-neutral-500 flex items-center gap-1 font-medium">
            <Filter className="w-3 h-3" /> Filters:
          </span>
          <button
            type="button"
            onClick={() => addFilterToQuery('has:file')}
            className="px-2 py-0.5 rounded-full bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 font-medium"
          >
            has:file
          </button>
          {channels.slice(0, 3).map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => addFilterToQuery(`in:#${ch.name}`)}
              className="px-2 py-0.5 rounded-full bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 flex items-center gap-1"
            >
              <Hash className="w-3 h-3 text-neutral-400" />
              <span>{ch.name}</span>
            </button>
          ))}
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {searchQuery.trim() === '' ? (
            <div className="text-center py-12 text-neutral-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Type any keyword or filter to search local CRDT state</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p className="text-sm font-medium">No matches found for "{searchQuery}"</p>
              <p className="text-xs text-neutral-400 mt-1">
                Try searching for partial words or removing specific filters
              </p>
            </div>
          ) : (
            results.map((res) => (
              <div
                key={res.message.id}
                id={`search-result-${res.message.id}`}
                onClick={() =>
                  handleSelectResult(
                    res.message.channelId,
                    res.message.id,
                    res.message.threadParentId
                  )
                }
                className="p-3 bg-white border border-neutral-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-lg cursor-pointer transition shadow-2xs group"
              >
                <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 flex items-center gap-1">
                      <Hash className="w-3 h-3 text-neutral-400" />
                      {res.channelName}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-neutral-700">
                      {res.authorName}
                    </span>
                  </div>
                  <span>{new Date(res.message.timestamp).toLocaleDateString()}</span>
                </div>

                <p className="text-sm text-neutral-800 line-clamp-2">
                  {res.matchedSnippets[0] || res.message.content}
                </p>

                {res.message.attachments && res.message.attachments.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>{res.message.attachments.length} attachment(s)</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
