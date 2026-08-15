import {
  Check,
  Clock,
  Shield,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface PendingApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PendingApprovalsModal: React.FC<PendingApprovalsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeWorkspace,
    joinRequests,
    approveJoinRequest,
    rejectJoinRequest,
  } = useWorkspace();

  if (!isOpen || !activeWorkspace) return null;

  const pendingRequests = joinRequests.filter((r) => r.status === 'PENDING');
  const pastRequests = joinRequests.filter((r) => r.status !== 'PENDING');

  return (
    <div
      id="pending-approvals-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="pending-approvals-modal-card"
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1264A3] flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-900">Member Join Approvals</h3>
              <p className="text-xs text-neutral-500">
                {pendingRequests.length} pending request{pendingRequests.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button
            id="close-pending-approvals-modal"
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Pending Section */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review ({pendingRequests.length})
            </div>

            {pendingRequests.length === 0 ? (
              <div className="p-6 bg-neutral-50 rounded-xl border border-neutral-200 text-center text-xs text-neutral-500">
                No pending join requests at this time.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-neutral-900 truncate">
                          {req.userName}
                        </span>
                        {req.userRole && (
                          <span className="px-1.5 py-0.5 bg-neutral-200 text-neutral-700 rounded text-[10px] font-semibold">
                            {req.userRole}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate font-mono">
                        {req.userEmail}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        Requested {new Date(req.createdAt).toLocaleDateString()} at{' '}
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        id={`reject-join-req-${req.id}`}
                        type="button"
                        onClick={() => rejectJoinRequest(req.id)}
                        className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-neutral-200 hover:border-red-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <UserX className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        id={`approve-join-req-${req.id}`}
                        type="button"
                        onClick={() => approveJoinRequest(req.id)}
                        className="px-3 py-1.5 bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Previous History Section */}
          {pastRequests.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Resolution History
              </div>
              <div className="space-y-1.5">
                {pastRequests.map((req) => (
                  <div
                    key={req.id}
                    className="px-3.5 py-2 bg-neutral-50/50 rounded-lg border border-neutral-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-800">{req.userName}</span>
                      <span className="text-neutral-400 font-mono text-[11px]">({req.userEmail})</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
