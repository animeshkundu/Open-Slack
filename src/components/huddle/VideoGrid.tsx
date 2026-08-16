import {
  Mic,
  MicOff,
  Monitor,
  User,
  Video,
  VideoOff,
} from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { HuddleParticipant } from '../../types';

interface VideoTileProps {
  participant: HuddleParticipant;
  isLocal?: boolean;
}

const VideoTile: React.FC<VideoTileProps> = ({ participant, isLocal }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [participant.stream, participant.isVideoOn, participant.isScreenSharing]);

  useEffect(() => {
    if (audioRef.current && participant.stream && !isLocal) {
      audioRef.current.srcObject = participant.stream;
      audioRef.current.play().catch(() => {});
    }
  }, [participant.stream, isLocal]);

  return (
    <div className="relative bg-neutral-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-neutral-800 shadow-md group">
      {/* Hidden audio element ensures remote audio always plays even when video is off */}
      {!isLocal && participant.stream && (
        <audio ref={audioRef} autoPlay playsInline muted={false} className="hidden" />
      )}

      {participant.stream && (participant.isVideoOn || participant.isScreenSharing) ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          {participant.avatarUrl ? (
            <img
              src={participant.avatarUrl}
              alt={participant.displayName}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-neutral-700"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
              {participant.displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-semibold text-neutral-300">
            {participant.displayName} {isLocal && '(You)'}
          </span>
        </div>
      )}

      {/* Overlay Status Badge */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        <div className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[11px] font-medium text-white flex items-center gap-1.5 truncate max-w-[140px]">
          <span>{participant.displayName}</span>
          {isLocal && <span className="text-neutral-400">(You)</span>}
        </div>

        <div className="flex items-center gap-1">
          {participant.isMuted ? (
            <div className="p-1 rounded bg-red-500/80 text-white">
              <MicOff className="w-3 h-3" />
            </div>
          ) : (
            <div className="p-1 rounded bg-green-500/80 text-white">
              <Mic className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const VideoGrid: React.FC<{ participants: HuddleParticipant[]; localPubkey?: string }> = ({
  participants,
  localPubkey,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
      {participants.map((p) => (
        <VideoTile
          key={p.pubkey}
          participant={p}
          isLocal={p.pubkey === localPubkey}
        />
      ))}
    </div>
  );
};
