'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEFAULT_CHECKPOINTS, getCheckpointName, formatDateTime, formatTime } from '@/lib/constants';
import { 
  BarChart3, 
  Search, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  User, 
  Layers, 
  Users, 
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  X
} from 'lucide-react';

export default function DashboardPage() {
  const [checkpoints, setCheckpoints] = useState(DEFAULT_CHECKPOINTS);
  const [checkpointCounts, setCheckpointCounts] = useState({});
  const [recentScans, setRecentScans] = useState([]);
  const [totalScansCount, setTotalScansCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Participant Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // 1. Fetch checkpoints list
  useEffect(() => {
    async function loadCheckpoints() {
      if (!isSupabaseConfigured) return;
      try {
        const { data, error } = await supabase
          .from('checkpoints')
          .select('id, name')
          .order('id', { ascending: true });
        if (!error && data && data.length > 0) {
          setCheckpoints(data);
        }
      } catch (e) {
        console.warn('Fallback to default checkpoints');
      }
    }
    loadCheckpoints();
  }, []);

  // 2. Fetch initial dashboard data (counts and recent 50 scans)
  const fetchDashboardData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch recent 50 scans
      const { data: scansData, error: scansError } = await supabase
        .from('scans')
        .select('id, participant_id, checkpoint_id, scanned_by, scanned_at')
        .order('scanned_at', { ascending: false })
        .limit(50);

      if (!scansError && scansData) {
        setRecentScans(scansData);
      }

      // Fetch per-checkpoint counts
      // We can fetch count grouped or fetch all checkpoint scan totals
      const { data: allScans, error: countError } = await supabase
        .from('scans')
        .select('checkpoint_id');

      if (!countError && allScans) {
        setTotalScansCount(allScans.length);
        const countsMap = {};
        allScans.forEach((row) => {
          const cid = Number(row.checkpoint_id);
          countsMap[cid] = (countsMap[cid] || 0) + 1;
        });
        setCheckpointCounts(countsMap);
      }
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // 3. Supabase Realtime subscription for live dashboard updates
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('realtime-dashboard-scans')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scans' },
        (payload) => {
          const newScan = payload.new;
          if (!newScan) return;

          const cpId = Number(newScan.checkpoint_id);

          // Update counts
          setCheckpointCounts((prev) => ({
            ...prev,
            [cpId]: (prev[cpId] || 0) + 1,
          }));
          setTotalScansCount((prev) => prev + 1);

          // Prepend to recent scans feed (keep top 50)
          setRecentScans((prev) => [newScan, ...prev.slice(0, 49)]);

          // If the currently searched participant matches, update search results
          setSearchResults((prev) => {
            if (!prev) return null;
            if (newScan.participant_id.toLowerCase() === prev.participantId.toLowerCase()) {
              return {
                ...prev,
                scans: [newScan, ...prev.scans],
              };
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 4. Participant Search handler
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('id, participant_id, checkpoint_id, scanned_by, scanned_at')
        .eq('participant_id', query)
        .order('scanned_at', { ascending: false });

      if (error) throw error;

      setSearchResults({
        participantId: query,
        scans: data || [],
      });
    } catch (err) {
      console.error('Participant search error:', err);
      setSearchResults({
        participantId: query,
        scans: [],
        error: 'Failed to search participant',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // 5. CSV Export handler
  const handleExportCSV = async () => {
    if (!isSupabaseConfigured) {
      alert('Supabase is not configured.');
      return;
    }

    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('id, participant_id, checkpoint_id, scanned_by, scanned_at')
        .order('scanned_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('No scan records found to export.');
        return;
      }

      // Build CSV string
      const headers = ['Scan ID', 'Participant ID', 'Checkpoint ID', 'Checkpoint Name', 'Scanned By', 'Scanned At (UTC)', 'Scanned At (Local)'];
      const rows = data.map((scan) => [
        scan.id,
        `"${scan.participant_id || ''}"`,
        scan.checkpoint_id,
        `"${getCheckpointName(scan.checkpoint_id, checkpoints)}"`,
        `"${(scan.scanned_by || '').replace(/"/g, '""')}"`,
        scan.scanned_at || '',
        `"${formatDateTime(scan.scanned_at)}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      link.setAttribute('href', url);
      link.setAttribute('download', `piravi_event_scans_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export CSV: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-28 pt-2 px-4 flex flex-col items-center">
      <div className="w-full max-w-md space-y-4">

        {/* Top Header & Actions */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Live Dashboard
            </h2>
            <p className="text-[11px] text-neutral-400">Real-time statistics & verification</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              title="Refresh Data"
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3.5 shadow-lg">
            <p className="text-[11px] uppercase tracking-wider font-bold text-neutral-400">Total Scans</p>
            <p className="text-3xl font-extrabold text-white mt-1 font-mono">
              {totalScansCount.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Live Synced
            </div>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3.5 shadow-lg">
            <p className="text-[11px] uppercase tracking-wider font-bold text-neutral-400">Checkpoints</p>
            <p className="text-3xl font-extrabold text-white mt-1 font-mono">
              {checkpoints.length}
            </p>
            <p className="text-[10px] text-neutral-400 mt-1">
              Active Gates
            </p>
          </div>
        </div>

        {/* Participant ID Search Section */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3.5 shadow-lg">
          <label className="text-[11px] uppercase tracking-wider font-bold text-neutral-400 flex items-center gap-1.5 mb-2">
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            Lookup Participant ID
          </label>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. vishnu8778"
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-600 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 pr-8"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim() || isSearching}
              className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 disabled:opacity-40 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition border border-neutral-700/60"
            >
              {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Search</span>
            </button>
          </form>

          {/* Search Results Display */}
          {searchResults && (
            <div className="mt-3 pt-3 border-t border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                  {searchResults.participantId}
                </span>
                <span className="text-[11px] text-neutral-400">
                  Scanned at {searchResults.scans.length} of {checkpoints.length} checkpoints
                </span>
              </div>

              {searchResults.scans.length === 0 ? (
                <div className="p-3 bg-neutral-950 rounded-xl text-center text-xs text-neutral-500">
                  No scan records found for this participant ID.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {searchResults.scans.map((scan) => (
                    <div
                      key={scan.id || `${scan.checkpoint_id}-${scan.scanned_at}`}
                      className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-white">
                            {getCheckpointName(scan.checkpoint_id, checkpoints)}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            By: {scan.scanned_by || 'Admin'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-[10px] font-mono text-neutral-400">
                        {formatDateTime(scan.scanned_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Per-Checkpoint Scan Counts */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3.5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider font-bold text-neutral-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Checkpoint Counts (Live)
            </h3>
            <span className="text-[10px] text-neutral-400">13 Total</span>
          </div>

          <div className="space-y-2">
            {checkpoints.map((cp) => {
              const count = checkpointCounts[Number(cp.id)] || 0;
              const maxCount = Math.max(...Object.values(checkpointCounts), 1);
              const percentage = totalScansCount > 0 ? Math.round((count / totalScansCount) * 100) : 0;

              return (
                <div
                  key={cp.id}
                  className="p-2.5 bg-neutral-950/70 border border-neutral-800/80 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-white truncate">
                        <span className="text-neutral-500 font-mono mr-1.5">{cp.id}.</span>
                        {cp.name}
                      </span>
                      <span className="font-mono font-bold text-emerald-400 shrink-0 ml-2">
                        {count.toLocaleString()}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-800/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(percentage, count > 0 ? 4 : 0))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Scans Feed (Last 50) */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3.5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider font-bold text-neutral-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Recent Scans Feed
            </h3>
            <span className="text-[10px] text-neutral-400">Last 50</span>
          </div>

          {recentScans.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-500">
              No scans recorded yet. Ready for check-ins!
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {recentScans.map((scan) => (
                <div
                  key={scan.id || `${scan.participant_id}-${scan.checkpoint_id}-${scan.scanned_at}`}
                  className="p-2.5 bg-neutral-950/90 border border-neutral-800 rounded-xl flex items-center justify-between gap-2 transition hover:border-neutral-700"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white truncate">
                        {scan.participant_id}
                      </span>
                      <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded shrink-0">
                        {getCheckpointName(scan.checkpoint_id, checkpoints)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-neutral-400 mt-0.5">
                      <User className="w-2.5 h-2.5" />
                      <span>{scan.scanned_by || 'Admin'}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-neutral-400 block">
                      {formatTime(scan.scanned_at)}
                    </span>
                    <span className="text-[9px] text-neutral-600 block">
                      {formatDateTime(scan.scanned_at).split(' ')[0]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

