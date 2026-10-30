'use client';

import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Camera, AlertCircle, RefreshCw } from 'lucide-react';

export default function CameraScanner({ onScan, isPaused }) {
  const [hasPermission, setHasPermission] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full aspect-square max-w-[340px] mx-auto rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-neutral-400">
          <Camera className="w-8 h-8 animate-pulse text-emerald-500" />
          <span className="text-xs">Initializing camera...</span>
        </div>
      </div>
    );
  }

  const handleScan = (detectedCodes) => {
    if (isPaused) return;

    let scannedText = '';
    if (Array.isArray(detectedCodes) && detectedCodes.length > 0) {
      scannedText = detectedCodes[0].rawValue || '';
    } else if (typeof detectedCodes === 'string') {
      scannedText = detectedCodes;
    } else if (detectedCodes?.rawValue) {
      scannedText = detectedCodes.rawValue;
    }

    if (scannedText && scannedText.trim()) {
      onScan(scannedText.trim());
    }
  };

  const handleError = (error) => {
    console.warn('QR Scanner notice/error:', error);
    const msg = error?.message || String(error || '');
    if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
      setHasPermission(false);
      setErrorMessage('Camera access denied. Please allow camera permissions in browser settings.');
    }
  };

  if (!hasPermission) {
    return (
      <div className="w-full aspect-square max-w-[340px] mx-auto rounded-3xl bg-neutral-900/90 border border-rose-500/30 p-6 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-sm font-bold text-white mb-1">Camera Permission Blocked</h3>
        <p className="text-xs text-neutral-400 mb-4">{errorMessage}</p>
        <button
          onClick={() => {
            setHasPermission(true);
            setErrorMessage(null);
          }}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Access
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[340px] mx-auto aspect-square rounded-3xl overflow-hidden bg-black border-2 border-neutral-800 shadow-2xl">
      {/* React QR Scanner */}
      <div className="w-full h-full">
        <Scanner
          onScan={handleScan}
          onError={handleError}
          paused={isPaused}
          scanDelay={1500}
          allowMultiple={false}
          constraints={{
            facingMode: 'environment',
          }}
          styles={{
            container: { width: '100%', height: '100%' },
            video: { objectFit: 'cover' },
          }}
          components={{
            audio: false,
            finder: false, // We supply our own high-tech custom viewfinder overlay
          }}
        />
      </div>

      {/* Futuristic Viewfinder Frame Overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
        <div className="relative w-full h-full border border-white/20 rounded-2xl flex items-center justify-center">
          {/* Top-left corner */}
          <div className="absolute -top-[2px] -left-[2px] w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
          {/* Top-right corner */}
          <div className="absolute -top-[2px] -right-[2px] w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
          {/* Bottom-left corner */}
          <div className="absolute -bottom-[2px] -left-[2px] w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
          {/* Bottom-right corner */}
          <div className="absolute -bottom-[2px] -right-[2px] w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

          {/* Animated laser line */}
          {!isPaused && (
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scan-laser absolute top-2" />
          )}

          {isPaused && (
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[11px] font-semibold text-neutral-300">
              Processing...
            </div>
          )}
        </div>
      </div>

      {/* Bottom hint label */}
      <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
        <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-300/80 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-md">
          Align QR inside frame
        </span>
      </div>
    </div>
  );
}

