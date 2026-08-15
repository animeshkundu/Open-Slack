import {
  Bell,
  Check,
  ChevronLeft,
  Copy,
  Hash,
  Info,
  Lock,
  LogOut,
  MessageSquare,
  Phone,
  Pin,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ActivityFeedDrawer } from '../chat/ActivityFeedDrawer';
import { MessageItem } from '../chat/MessageItem';
import { ThreadView } from '../chat/ThreadView';

export const RightDrawer: React.FC = () => {
  const {
    rightPanel,
    setRightPanel,
    activeChannel,
    peerUsers,
    identity,
    leaveChannel,
    messages,
    inspectUser,
    openDirectMessage,
    startOrJoinHuddle,
    openUserProfile,
  } = useWorkspace();

  const [copiedKey, setCopiedKey] = useState(false);

  // Compute accurate members for the active channel (DM, Group DM, or Public)
  const channelMembers = useMemo(() => {
    if (!activeChannel) return [];
    if (activeChannel.members && activeChannel.members.length > 0) {
      return activeChannel.members.map((pubkey) => {
        const existing = peerUsers.get(pubkey);
        if (existing) return existing;
        if (pubkey === identity?.pubkey && identity) return identity;
        return {
          pubkey,
          displayName: pubkey === identity?.pubkey ? identity?.displayName || 'You' : `User (${pubkey.slice(0, 6)})`,
          handle: `@user_${pubkey.slice(0, 6)}`,
          avatarUrl: '',
          status: '',
          lastSeen: Date.now(),
          color: '#1164A3',
          isOnline: pubkey === identity?.pubkey,
        };
      });
    }
    return Array.from(peerUsers.values());
  }, [activeChannel, peerUsers, identity]);

  if (rightPanel === 'none') return null;

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1500);
  };

  const pinnedMessages = messages.filter((m) => m.pinned);
  const isDm = Boolean(activeChannel?.isDirectMessage);
  const isGroupDm = Boolean(isDm && (activeChannel?.members?.length || 0) > 2);
  const canLeave = Boolean(
    activeChannel &&
      (isDm || (activeChannel.isPrivate && activeChannel.id !== 'chan_general'))
  );

  return (
    <>
      {/* Backdrop for screens < xl (tablet, resized desktop) */}
      <div
        id="right-drawer-backdrop"
        onClick={() => setRightPanel('none')}
        className="fixed inset-0 bg-black/25 z-30 xl:hidden transition-opacity"
      />

      {/* Main Drawer Container */}
      <div
        id="right-drawer-panel"
        className="fixed md:absolute xl:relative right-0 top-0 bottom-0 z-40 xl:z-10 w-full sm:w-[420px] xl:w-96 border-l border-neutral-200 bg-white flex flex-col flex-shrink-0 shadow-2xl xl:shadow-none h-full overflow-hidden animate-in slide-in-from-right-2 duration-150"
      >
        {/* THREAD VIEW */}
        {rightPanel === 'thread' && <ThreadView />}

        {/* ACTIVITY FEED & MENTIONS VIEW */}
        {rightPanel === 'activity_feed' && (
          <ActivityFeedDrawer onClose={() => setRightPanel('none')} />
        )}

        {/* CHANNEL DETAILS & MEMBERS VIEW */}
        {rightPanel === 'channel_details' && (
          <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="h-14 px-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setRightPanel('none')}
                  className="p-1 hover:bg-neutral-200 rounded-md text-neutral-500 hover:text-neutral-900 cursor-pointer sm:hidden flex-shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-neutral-900 text-base truncate">
                  {isDm
                    ? isGroupDm
                      ? `Group Details (${channelMembers.length})`
                      : `About ${activeChannel?.name || 'conversation'}`
                    : `About #${activeChannel?.name || 'channel'}`}
                </h3>
              </div>
              <button
                id="close-channel-details-btn"
                type="button"
                onClick={() => setRightPanel('none')}
                className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900 cursor-pointer flex-shrink-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Topic & Description */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  {isDm ? 'Conversation Info' : 'Topic'}
                </div>
                <p className="text-xs text-neutral-800 leading-relaxed">
                  {activeChannel?.topic ||
                    (isDm
                      ? isGroupDm
                        ? `Group conversation with ${channelMembers.length} participants.`
                        : 'Direct message conversation.'
                      : 'No topic set for this channel.')}
                </p>
              </div>

              {/* Members Directory in this Conversation / Workspace */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center justify-between">
                  <span>Members ({channelMembers.length})</span>
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                </div>

                <div className="space-y-1">
                  {channelMembers.map((user) => {
                    const isSelf = user.pubkey === identity?.pubkey;
                    return (
                      <div
                        key={user.pubkey}
                        onClick={() => openUserProfile(user)}
                        className="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-lg cursor-pointer transition"
                      >
                        <div className="relative flex-shrink-0">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.displayName}
                              className="w-8 h-8 rounded-lg object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                              style={{ backgroundColor: user.color }}
                            >
                              {user.displayName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                              user.isOnline ? 'bg-emerald-500' : 'bg-neutral-300'
                            }`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-neutral-900 truncate flex items-center gap-1.5">
                            <span>{user.displayName}</span>
                            {isSelf && (
                              <span className="text-[10px] text-neutral-500 font-normal">
                                (you)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-500 truncate">
                            {user.handle} {user.status ? `• ${user.status}` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Channel Actions / Leave Button */}
              {canLeave && (
                <div className="pt-2 border-t border-neutral-200">
                  <button
                    id="leave-conversation-drawer-btn"
                    type="button"
                    onClick={() => {
                      if (activeChannel) {
                        leaveChannel(activeChannel.id);
                        setRightPanel('none');
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold border border-red-200 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>
                      {isDm
                        ? isGroupDm
                          ? 'Leave Group Chat'
                          : 'Close Direct Message'
                        : 'Leave Channel'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PINNED MESSAGES VIEW */}
        {rightPanel === 'pinned' && (
          <div className="h-full flex flex-col bg-white">
            <div className="h-14 px-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRightPanel('none')}
                  className="p-1 hover:bg-neutral-200 rounded-md text-neutral-500 hover:text-neutral-900 cursor-pointer sm:hidden"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <Pin className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-neutral-900 text-base">
                  Pinned Messages ({pinnedMessages.length})
                </h3>
              </div>
              <button
                id="close-pinned-btn"
                type="button"
                onClick={() => setRightPanel('none')}
                className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {pinnedMessages.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 text-xs">
                  No pinned messages in this channel yet. Hover over any message to pin it.
                </div>
              ) : (
                pinnedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden"
                  >
                    <MessageItem message={msg} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* USER PROFILE INSPECTOR VIEW */}
        {rightPanel === 'user_profile' && inspectUser && (
          <div className="h-full flex flex-col bg-white">
            <div className="h-14 px-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRightPanel('none')}
                  className="p-1 hover:bg-neutral-200 rounded-md text-neutral-500 hover:text-neutral-900 cursor-pointer sm:hidden"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-neutral-900 text-base">Profile</h3>
              </div>
              <button
                id="close-user-profile-btn"
                type="button"
                onClick={() => setRightPanel('none')}
                className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex flex-col items-center text-center">
                <img
                  src={inspectUser.avatarUrl}
                  alt={inspectUser.displayName}
                  className="w-20 h-20 rounded-2xl border-2 border-neutral-200 shadow-md mb-3 object-cover"
                  referrerPolicy="no-referrer"
                />
                <h4 className="text-base font-bold text-neutral-900">
                  {inspectUser.displayName}
                </h4>
                <span className="text-xs text-neutral-500 font-mono">{inspectUser.handle}</span>
                {inspectUser.status && (
                  <span className="mt-2 text-xs px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full">
                    {inspectUser.status}
                  </span>
                )}
              </div>

              {/* Quick Action buttons */}
              <div className="flex gap-2">
                <button
                  id="profile-dm-btn"
                  type="button"
                  onClick={() => {
                    openDirectMessage(inspectUser.pubkey);
                    setRightPanel('none');
                  }}
                  className="flex-1 py-2 bg-[#007a5a] hover:bg-[#148567] text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Direct Message</span>
                </button>

                {activeChannel && (
                  <button
                    id="profile-call-btn"
                    type="button"
                    onClick={() => startOrJoinHuddle(activeChannel.id)}
                    className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-lg transition flex items-center justify-center cursor-pointer"
                    title="Start call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Cryptographic Public Key Fingerprint */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-[#007a5a]" />
                    Public Key Fingerprint
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyKey(inspectUser.pubkey)}
                    className="text-xs text-[#1264A3] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono bg-white p-2.5 border border-neutral-200 rounded text-neutral-700 break-all">
                  {inspectUser.pubkey}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
