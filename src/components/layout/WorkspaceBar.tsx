import { Plus, Settings, ShieldCheck, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface WorkspaceBarProps {
  onOpenAddWorkspace: () => void;
  onOpenSettings: () => void;
}

export const WorkspaceBar: React.FC<WorkspaceBarProps> = ({
  onOpenAddWorkspace,
  onOpenSettings,
}) => {
  const {
    workspaces,
    activeWorkspace,
    switchWorkspace,
    identity,
    connectedPeerCount,
    relayStatus,
  } = useWorkspace();

  return (
    <div
      id="workspace-rail-bar"
      className="w-[68px] h-full bg-[#19171D] flex flex-col items-center py-4 flex-shrink-0 select-none z-20 border-r border-white/10"
    >
      {/* Workspace Icons List */}
      <div className="flex-1 w-full flex flex-col items-center space-y-4 overflow-y-auto dark-scrollbar">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspace?.id;
          const initials = ws.name
            .split(/\s+/)
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'WS';

          return (
            <div key={ws.id} className="relative group flex items-center justify-center w-full">
              {/* Active Left Indicator Bar */}
              {isActive && (
                <span className="absolute left-0 w-1 h-7 bg-white rounded-r-full" />
              )}

              <button
                id={`ws-switch-btn-${ws.id}`}
                type="button"
                onClick={() => switchWorkspace(ws.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all relative ${
                  isActive
                    ? 'bg-[#3F0E40] text-white border-2 border-white/40 shadow-lg scale-105'
                    : 'bg-[#350d36] text-white/70 hover:bg-[#3F0E40] hover:text-white border border-white/10 hover:rounded-lg'
                }`}
                title={ws.name}
              >
                {initials}
              </button>

              {/* Hover Tooltip */}
              <div className="absolute left-16 px-2.5 py-1 bg-neutral-900 text-white text-xs font-semibold rounded-md shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                {ws.name}
              </div>
            </div>
          );
        })}

        {/* Add Workspace Button */}
        <button
          id="add-workspace-rail-btn"
          type="button"
          onClick={onOpenAddWorkspace}
          className="w-10 h-10 bg-[#FFFFFF10] rounded-xl flex items-center justify-center text-white/60 text-xl cursor-pointer hover:bg-white/20 hover:text-white transition"
          title="Create or Join another workspace"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="w-full flex flex-col items-center space-y-3 pt-3 border-t border-white/10">
        {/* Network Status Dot */}
        <div
          className="relative group flex items-center justify-center cursor-help"
          title={`P2P Mesh: ${relayStatus.toUpperCase()} (${connectedPeerCount} peers)`}
        >
          <div className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition">
            <ShieldCheck className="w-4 h-4 text-[#2BAC76]" />
          </div>
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#19171D] ${
              relayStatus === 'connected' ? 'bg-[#2BAC76]' : 'bg-amber-400'
            }`}
          />
        </div>

        {/* Settings button */}
        <button
          id="workspace-settings-btn"
          type="button"
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition"
          title="Preferences & Security Vault"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Profile Avatar with Online Dot */}
        {identity && (
          <div className="relative w-10 h-10 mt-1">
            <button
              id="workspace-user-profile-btn"
              type="button"
              onClick={onOpenSettings}
              className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center text-white text-xs overflow-hidden group focus:outline-none"
              title={`${identity.displayName} (${identity.handle})`}
            >
              {identity.avatarUrl ? (
                <img
                  src={identity.avatarUrl}
                  alt={identity.displayName}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs"
                >
                  {identity.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </button>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#2BAC76] border-2 border-[#19171D] rounded-full pointer-events-none" />
          </div>
        )}
      </div>
    </div>
  );
};
