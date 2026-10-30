'use client';

import { CheckCircle2, AlertCircle, XCircle, Clock, User, X } from 'lucide-react';
import { formatDateTime } from '@/lib/constants';

export default function ResultOverlay({ result, onClose, checkpointName }) {
  if (!result) return null;

  const { status, participant_id, scanned_at, scanned_by, message } = result;

  const isOk = status === 'ok';
  const isDuplicate = status === 'duplicate';
  const isInvalid = !isOk && !isDuplicate;

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-6 transition-all duration-200 animate-in fade-in zoom-in-95 cursor-pointer select-none ${
        isOk
          ? 'bg-emerald-600 text-white'
          : isDuplicate
          ? 'bg-rose-600 text-white'
          : 'bg-amber-600 text-white'
      }`}
    >
      {/* Top Bar with dismiss hint */}
      <div className="w-full flex items-center justify-between max-w-sm pt-2">
        <span className="text-xs uppercase tracking-wider font-semibold opacity-80 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-sm">
          {checkpointName || 'Check-in'}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 transition text-white/90"
          aria-label="Close overlay"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Status Block */}
      <div className="flex flex-col items-center justify-center text-center my-auto max-w-sm px-4">
        {isOk && (
          <>
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-5 ring-8 ring-white/10 animate-pulse">
              <CheckCircle2 className="w-16 h-16 text-white stroke-[2.5]" />
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-2">VALID</h2>
            <div className="mt-2 px-4 py-2 bg-black/20 rounded-xl backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-emerald-100 font-medium">Participant ID</p>
              <p className="text-2xl font-mono font-bold tracking-wider mt-0.5 break-all">
                {participant_id || '—'}
              </p>
            </div>
            <p className="mt-4 text-emerald-100 text-sm font-medium">
              Entry recorded successfully
            </p>
          </>
        )}

        {isDuplicate && (
          <>
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-5 ring-8 ring-white/10 animate-bounce">
              <AlertCircle className="w-16 h-16 text-white stroke-[2.5]" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2 uppercase">Already Scanned</h2>
            
            <div className="mt-2 w-full px-4 py-2 bg-black/20 rounded-xl backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-rose-100 font-medium">Participant ID</p>
              <p className="text-2xl font-mono font-bold tracking-wider mt-0.5 break-all">
                {participant_id || '—'}
              </p>
            </div>

            <div className="mt-4 w-full bg-black/25 rounded-xl p-3.5 text-left border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-rose-100 text-xs">
                <Clock className="w-4 h-4 shrink-0 text-white" />
                <span className="font-semibold text-white">First Scanned:</span>
                <span className="font-mono">{formatDateTime(scanned_at) || 'Earlier'}</span>
              </div>
              <div className="flex items-center gap-2 text-rose-100 text-xs">
                <User className="w-4 h-4 shrink-0 text-white" />
                <span className="font-semibold text-white">Scanned By:</span>
                <span className="font-medium underline decoration-white/40">{scanned_by || 'Unknown Admin'}</span>
              </div>
            </div>
          </>
        )}

        {isInvalid && (
          <>
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-5 ring-8 ring-white/10">
              <XCircle className="w-16 h-16 text-white stroke-[2.5]" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2 uppercase">Invalid QR</h2>
            <div className="mt-2 px-4 py-2 bg-black/20 rounded-xl backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-amber-100 font-medium">Content / ID</p>
              <p className="text-xl font-mono font-bold tracking-wider mt-0.5 break-all">
                {participant_id || message || 'Unrecognized code'}
              </p>
            </div>
            <p className="mt-4 text-amber-100 text-sm font-medium">
              Please check ticket or use manual entry below
            </p>
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="text-center pb-4 opacity-75 text-xs font-medium">
        Tap anywhere to scan next
      </div>
    </div>
  );
}

