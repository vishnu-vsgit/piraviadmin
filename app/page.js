'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import CameraScanner from '@/components/CameraScanner';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEFAULT_CHECKPOINTS, getCheckpointName } from '@/lib/constants';
import { playFeedback } from '@/lib/sound';
import ResultOverlay from '@/components/ResultOverlay';
import { 
  User, 
  MapPin, 
  Keyboard, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Sparkles,
  Info
} from 'lucide-react';



export default function ScannerPage() {
  const [adminName, setAdminName] = useState('');
  const [checkpoints, setCheckpoints] = useState(DEFAULT_CHECKPOINTS);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState(1);
  const [manualId, setManualId] = useState('');
  const [activeOverlayResult, setActiveOverlayResult] = useState(null);
  const [isCooldown, setIsCooldown] = useState(false);
  const [checkpointCount, setCheckpointCount] = useState(0);
  const [nameErrorNotice, setNameErrorNotice] = useState(false);

  // Guard against duplicate reads during the 2-second cooldown window
  const cooldownTimerRef = useRef(null);
  const isProcessingRef = useRef(false);

  // 1. Load saved preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAdmin = localStorage.getItem('piravi_admin_name');
      if (savedAdmin) setAdminName(savedAdmin);

      const savedCheckpoint = localStorage.getItem('piravi_checkpoint_id');
      if (savedCheckpoint) {
        setSelectedCheckpointId(Number(savedCheckpoint));
      }
    }
  }, []);

  // 2. Fetch checkpoints from Supabase (with fallback to DEFAULT_CHECKPOINTS)
  useEffect(() => {
    async function fetchCheckpoints() {
      if (!isSupabaseConfigured) return;
      try {
        const { data, error } = await supabase
          .from('checkpoints')
          .select('id, name')
          .order('id', { ascending: true });

        if (!error && data && data.length > 0) {
          setCheckpoints(data);
        }
      } catch (err) {
        console.warn('Could not load checkpoints from DB, using fallback list:', err);
      }
    }

    fetchCheckpoints();
  }, []);

  // 3. Fetch current scan count for selected checkpoint
  const fetchCurrentCheckpointCount = useCallback(async (checkpointId) => {
    if (!isSupabaseConfigured) return;
    try {
      const { count, error } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true })
        .eq('checkpoint_id', Number(checkpointId));

      if (!error && typeof count === 'number') {
        setCheckpointCount(count);
      }
    } catch (err) {
      console.warn('Error fetching checkpoint count:', err);
    }
  }, []);

  useEffect(() => {
    fetchCurrentCheckpointCount(selectedCheckpointId);
  }, [selectedCheckpointId, fetchCurrentCheckpointCount]);

  // 4. Supabase Realtime subscription for live counts
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('realtime-scans-scanner')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scans' },
        (payload) => {
          if (payload?.new && Number(payload.new.checkpoint_id) === Number(selectedCheckpointId)) {
            setCheckpointCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCheckpointId]);

  // Handle Admin Name input change
  const handleAdminNameChange = (e) => {
    const val = e.target.value;
    setAdminName(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('piravi_admin_name', val);
    }
    if (val.trim()) {
      setNameErrorNotice(false);
    }
  };

  // Handle Checkpoint selector change
  const handleCheckpointChange = (e) => {
    const val = Number(e.target.value);
    setSelectedCheckpointId(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('piravi_checkpoint_id', String(val));
    }
  };

  // Core scan processing logic
  const processScan = async (rawCode) => {
    if (!rawCode || isProcessingRef.current || isCooldown) return;

    // Check if volunteer name is entered
    if (!adminName.trim()) {
      setNameErrorNotice(true);
      playFeedback('invalid');
      setActiveOverlayResult({
        status: 'invalid',
        message: 'Please enter your volunteer name before scanning.',
        participant_id: rawCode,
      });
      triggerCooldown(2500);
      return;
    }

    const cleanParticipantId = rawCode.trim().toLowerCase();

    // Start 2-second cooldown to prevent double reading
    isProcessingRef.current = true;
    setIsCooldown(true);

    try {
      // Execute the RPC record_scan
      const { data, error } = await supabase.rpc('record_scan', {
        p_participant: cleanParticipantId,
        p_checkpoint: Number(selectedCheckpointId),
        p_admin: adminName.trim(),
      });

      if (error) {
        console.error('RPC Error:', error);
        const resultObj = {
          status: 'invalid',
          participant_id: cleanParticipantId,
          message: error.message || 'Database RPC Error',
        };
        playFeedback('invalid');
        setActiveOverlayResult(resultObj);
      } else {
        // Handle RPC response JSON
        let resultObj = data;
        if (typeof data === 'string') {
          try {
            resultObj = JSON.parse(data);
          } catch (e) {
            resultObj = { status: 'ok', participant_id: cleanParticipantId };
          }
        }

        const scanStatus = resultObj?.status || 'invalid';
        playFeedback(scanStatus);
        setActiveOverlayResult({
          ...resultObj,
          participant_id: resultObj?.participant_id || cleanParticipantId,
        });
      }
    } catch (err) {
      console.error('Scan processing exception:', err);
      playFeedback('invalid');
      setActiveOverlayResult({
        status: 'invalid',
        participant_id: cleanParticipantId,
        message: 'Network or server error',
      });
    } finally {
      triggerCooldown(2000);
    }
  };

  const triggerCooldown = (durationMs = 2000) => {
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }

    cooldownTimerRef.current = setTimeout(() => {
      setActiveOverlayResult(null);
      isProcessingRef.current = false;
      setIsCooldown(false);
    }, durationMs);
  };

  const dismissOverlay = () => {
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }
    setActiveOverlayResult(null);
    isProcessingRef.current = false;
    setIsCooldown(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    const toScan = manualId.trim();
    setManualId('');
    processScan(toScan);
  };

  const currentCheckpointName = getCheckpointName(selectedCheckpointId, checkpoints);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-28 pt-2 px-4 flex flex-col items-center">
      <div className="w-full max-w-md space-y-4">

        {/* Warning if Supabase credentials are not configured */}
        {!isSupabaseConfigured && (
          <div className="bg-amber-950/60 border border-amber-600/40 rounded-2xl p-3 text-amber-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold">Supabase Keys Required</p>
              <p className="text-amber-300/80 mt-0.5">
                Set <code className="bg-black/40 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-black/40 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code className="bg-black/40 px-1 py-0.5 rounded">.env.local</code>.
              </p>
            </div>
          </div>
        )}

        {/* Volunteer Name Input Field */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3 shadow-lg">
          <label className="text-[11px] uppercase tracking-wider font-bold text-neutral-400 flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Your Name (Volunteer)
            </span>
            {adminName.trim() ? (
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Saved
              </span>
            ) : (
              <span className="text-[10px] text-rose-400 font-medium">Required for logs</span>
            )}
          </label>
          <input
            type="text"
            value={adminName}
            onChange={handleAdminNameChange}
            placeholder="e.g. Arun / Sneha"
            className={`w-full bg-neutral-950 border text-neutral-100 placeholder-neutral-600 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 transition ${
              nameErrorNotice
                ? 'border-rose-500 focus:ring-rose-500/30'
                : 'border-neutral-800 focus:border-emerald-500/50 focus:ring-emerald-500/20'
            }`}
          />
        </div>

        {/* Checkpoint Dropdown with Live Count */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] uppercase tracking-wider font-bold text-neutral-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Checkpoint
            </label>
            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800/80 px-2 py-0.5 rounded-full text-[11px] font-semibold text-emerald-400">
              <Users className="w-3 h-3" />
              <span>{checkpointCount} scanned</span>
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedCheckpointId}
              onChange={handleCheckpointChange}
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-3.5 py-3 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer"
            >
              {checkpoints.map((cp) => (
                <option key={cp.id} value={cp.id} className="bg-neutral-900 text-neutral-100 py-1">
                  {cp.id}. {cp.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-neutral-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Live Camera Scanner Box */}
        <div className="py-1">
          <CameraScanner
            onScan={processScan}
            isPaused={isCooldown || !!activeOverlayResult}
          />
        </div>

        {/* Manual ID Entry Fallback */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3 shadow-lg">
          <form onSubmit={handleManualSubmit}>
            <label className="text-[11px] uppercase tracking-wider font-bold text-neutral-400 flex items-center gap-1.5 mb-1.5">
              <Keyboard className="w-3.5 h-3.5 text-neutral-400" />
              Manual ID Fallback
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="e.g. vishnu8778"
                autoCapitalize="none"
                autoCorrect="off"
                className="flex-1 bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-600 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="submit"
                disabled={!manualId.trim() || isCooldown}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Verify</span>
              </button>
            </div>
          </form>
        </div>

        {/* Helpful Tips Card */}
        <div className="px-3 py-2 text-center text-[11px] text-neutral-400">
          Point camera at participant QR code or enter ID manually. Sound & vibration confirm scan.
        </div>

      </div>

      {/* Full-Screen Result Overlay (Valid / Duplicate / Invalid) */}
      <ResultOverlay
        result={activeOverlayResult}
        checkpointName={currentCheckpointName}
        onClose={dismissOverlay}
      />
    </div>
  );
}

