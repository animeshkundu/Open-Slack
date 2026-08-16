import {
  ChevronDown,
  ChevronUp,
  Headphones,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  PhoneOff,
  Radio,
  Share2,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';
import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { VideoGrid } from './VideoGrid';

interface HuddleOverlayProps {
  onOpenInvite?: () => void;
}

export const HuddleOverlay: React.FC<HuddleOverlayProps> = ({ onOpenInvite }) => {
  const {
    huddleState,
    leaveHuddle,
    toggleHuddleMute,
    toggleHuddleVideo,
    toggleHuddleScreenShare,
    identity,
    activeWorkspace,
  } = useWorkspace();

  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedHuddleLink, setCopiedHuddleLink] = useState(false);

  if (!huddleState.isActive) return null;

  const participantsList = Array.from(huddleState.participants.values());

  const handleShareHuddle = () => {
    if (onOpenInvite) {
      onOpenInvite();
      return;
    }
    if (activeWorkspace) {
      const payloadStr = btoa(unescape(encodeURIComponent(JSON.stringify(activeWorkspace))));
      const huddleUrl = `${window.location.origin}${window.location.pathname}#invite=${payloadStr}&huddle=${encodeURIComponent(huddleState.channelName || '')}`;
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        navigator.share({
          title: `Join Huddle in #${huddleState.channelName}`,
          text: `Join our live audio/video huddle in #${huddleState.channelName} on ${activeWorkspace.name}:`,
          url: huddleUrl,
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(huddleUrl);
        setCopiedHuddleLink(true);
        setTimeout(() => setCopiedHuddleLink(false), 2000);
      }
    }
  };

  return (
    <>
      {/* Full Modal View when Expanded */}
      {isExpanded && (
        <div
          id="huddle-expanded-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
        >
          <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-ping" />
                <div>
                  <h3 className="font-bold text-base">
                    Huddle in #{huddleState.channelName}
                  </h3>
                  <span className="text-xs text-neutral-400">
                    {participantsList.length} participant{participantsList.length > 1 ? 's' : ''} • Decentralized WebRTC Mesh
                  </span>
                </div>
              </div>
              <button
                id="minimize-huddle-btn"
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white"
                title="Minimize huddle"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>

            {/* Video Streams Container */}
            <div className="flex-1 overflow-y-auto min-h-[300px] bg-black/40">
              <VideoGrid
                participants={participantsList}
                localPubkey={identity?.pubkey}
              />
            </div>

            {/* Bottom Controls */}
            <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-center gap-4">
              <button
                id="huddle-mute-btn-exp"
                type="button"
                onClick={toggleHuddleMute}
                className={`p-3.5 rounded-full font-semibold transition flex items-center gap-2 ${
                  huddleState.isMuted
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                    : 'bg-neutral-800 text-white hover:bg-neutral-700'
                }`}
                title={huddleState.isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {huddleState.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                id="huddle-video-btn-exp"
                type="button"
                onClick={toggleHuddleVideo}
                className={`p-3.5 rounded-full font-semibold transition ${
                  huddleState.isVideoOn
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-neutral-800 text-white hover:bg-neutral-700'
                }`}
                title={huddleState.isVideoOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {huddleState.isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                id="huddle-screen-btn-exp"
                type="button"
                onClick={toggleHuddleScreenShare}
                className={`p-3.5 rounded-full font-semibold transition ${
                  huddleState.isScreenSharing
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-neutral-800 text-white hover:bg-neutral-700'
                }`}
                title={huddleState.isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
              >
                <Monitor className="w-5 h-5" />
              </button>

              <button
                id="huddle-share-btn-exp"
                type="button"
                onClick={handleShareHuddle}
                className="p-3.5 rounded-full font-semibold bg-neutral-800 text-white hover:bg-neutral-700 transition"
                title="Invite teammates to Huddle (Link / QR / Social)"
              >
                <Share2 className="w-5 h-5 text-emerald-400" />
              </button>

              <button
                id="huddle-leave-btn-exp"
                type="button"
                onClick={leaveHuddle}
                className="px-5 py-3 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition flex items-center gap-2"
                title="Leave huddle"
              >
                <PhoneOff className="w-5 h-5" />
                <span>Leave</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Docked / Floating Pill at Bottom Left (Slack Authentic Design) */}
      {!isExpanded && (
        <div
          id="huddle-floating-dock"
          className="fixed bottom-20 sm:bottom-4 left-3 right-3 sm:right-auto sm:left-72 z-40 bg-neutral-900 text-white border border-neutral-800 rounded-xl shadow-2xl p-2 sm:p-2.5 flex items-center justify-between sm:justify-start gap-2 sm:gap-3 animate-in slide-in-from-bottom-4 duration-150"
        >
          <div className="flex items-center gap-2 pl-1 sm:pl-2 min-w-0">
            <div className="relative flex-shrink-0">
              <Headphones className="w-5 h-5 text-green-400" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 animate-ping" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate max-w-[100px] sm:max-w-[130px]">
                #{huddleState.channelName}
              </span>
              <span className="text-[10px] text-neutral-400">
                {participantsList.length} in huddle
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-neutral-700 flex-shrink-0" />

          {/* Quick Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              id="huddle-mute-btn"
              type="button"
              onClick={toggleHuddleMute}
              className={`p-2 rounded-lg transition ${
                huddleState.isMuted
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'hover:bg-neutral-800 text-neutral-200'
              }`}
              title={huddleState.isMuted ? 'Unmute' : 'Mute'}
            >
              {huddleState.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              id="huddle-video-btn"
              type="button"
              onClick={toggleHuddleVideo}
              className={`p-2 rounded-lg transition ${
                huddleState.isVideoOn
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-neutral-800 text-neutral-200'
              }`}
              title={huddleState.isVideoOn ? 'Camera off' : 'Camera on'}
            >
              {huddleState.isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>

            <button
              id="huddle-share-btn-dock"
              type="button"
              onClick={handleShareHuddle}
              className="p-2 hover:bg-neutral-800 rounded-lg text-emerald-400"
              title="Share / Invite to Huddle"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              id="huddle-expand-btn"
              type="button"
              onClick={() => setIsExpanded(true)}
              className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-300"
              title="Expand huddle video view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              id="huddle-leave-btn"
              type="button"
              onClick={leaveHuddle}
              className="p-2 hover:bg-red-600 rounded-lg bg-red-600/80 text-white ml-1 transition"
              title="Leave huddle"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
