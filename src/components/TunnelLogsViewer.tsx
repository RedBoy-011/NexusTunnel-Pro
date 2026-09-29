import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Activity,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Cpu,
  AlertTriangle,
  RotateCcw,
  Shield,
  Layers,
  CheckCircle2,
  Zap,
  Info
} from 'lucide-react';
import { LogEntry, LogLevel, LogBufferStats } from '../types.js';

interface TunnelLogsViewerProps {
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const TunnelLogsViewer: React.FC<TunnelLogsViewerProps> = ({ onNotify }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogBufferStats | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [isTriggeringDrop, setIsTriggeringDrop] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedLevel !== 'ALL') params.append('level', selectedLevel);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      params.append('limit', '150');

      const [resLogs, resStats] = await Promise.all([
        fetch(`/api/tunnel/logs?${params.toString()}`),
        fetch('/api/tunnel/logs/stats'),
      ]);

      if (resLogs.ok) setLogs(await resLogs.json());
      if (resStats.ok) setStats(await resStats.json());
    } catch {
      // offline
    }
  };

  useEffect(() => {
    fetchLogs();
    if (!isAutoRefresh) return;
    const interval = setInterval(fetchLogs, 2500);
    return () => clearInterval(interval);
  }, [selectedLevel, searchTerm, isAutoRefresh]);

  const handleClearLogs = async () => {
    if (!confirm('آیا از پاک‌سازی بافر لاگ‌های جاری در حافظه سرور اطمینان دارید؟')) return;
    try {
      const res = await fetch('/api/tunnel/logs', { method: 'DELETE' });
      if (res.ok) {
        onNotify('بافر حافظه لاگ‌ها بازنشانی شد.', 'info');
        await fetchLogs();
      }
    } catch {
      onNotify('خطا در پاک‌سازی لاگ‌ها', 'error');
    }
  };

  const handleSimulateDrop = async () => {
    setIsTriggeringDrop(true);
    onNotify('شبیه‌سازی قطعی نشست تونل ارسال شد؛ نگهبان در حال بازسازی خودکار است...', 'info');
    try {
      await fetch('/api/tunnel/trigger-drop', { method: 'POST' });
      await fetchLogs();
    } finally {
      setTimeout(() => setIsTriggeringDrop(false), 2000);
    }
  };

  const handleDownloadLogs = () => {
    window.open('/api/tunnel/logs/download', '_blank');
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'ERROR':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'RESTART':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'WATCHDOG':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'AUTH':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'WARN':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'INFO':
      default:
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span>مانیتورینگ و لاگ‌های زنده تونل (Tunnel Realtime Logs)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            ثبت تمامی رویدادها، تغییرات آی‌پی، وضعیت سوکت و ری‌استارت خودکار توسط نگهبان با مدیریت محدود در حافظه موقت (Circular Ring-Buffer).
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Simulate Drop Button */}
          <button
            onClick={handleSimulateDrop}
            disabled={isTriggeringDrop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all active:scale-95"
            title="آزمایش عملکرد نگهبان در شناسایی قطعی و ری‌استارت خودکار"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isTriggeringDrop ? 'animate-spin' : ''}`} />
            <span>تست قطعی و ری‌استارت خودکار</span>
          </button>

          {/* Download Logs */}
          <button
            onClick={handleDownloadLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>دانلود لاگ</span>
          </button>

          {/* Clear Logs */}
          <button
            onClick={handleClearLogs}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
            title="پاک‌سازی بافر لاگ"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Memory & Buffer Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>تعداد سطرهای ثبت‌شده:</span>
            <Layers className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-sm font-bold text-white font-mono">
            {stats ? `${stats.totalEntries} / ${stats.maxCapacity}` : '--'}{' '}
            <span className="text-[10px] font-sans text-slate-500">اسلات</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>مصرف حافظه RAM بافر:</span>
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-cyan-300 font-mono">
            {stats ? `${stats.memoryUsageKb} KB` : '--'}{' '}
            <span className="text-[10px] font-sans text-emerald-400">(ایمن & سبک)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>چرخش خودکار (Purged FIFO):</span>
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-slate-200 font-mono">
            {stats ? `${stats.droppedEntries} سطر قدیمی` : '--'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>بروزرسانی زنده (Live Stream):</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">
              {isAutoRefresh ? 'فعال (۲.۵ ثانیه)' : 'متوقف'}
            </span>
            <button
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              {isAutoRefresh ? 'توقف' : 'فعال‌سازی'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        {/* Level Filters */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
          {['ALL', 'INFO', 'WATCHDOG', 'RESTART', 'WARN', 'ERROR', 'AUTH'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedLevel === lvl
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {lvl === 'ALL' ? 'همه' : lvl}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو در متن پیام یا تگ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Terminal Log Console */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span className="font-mono text-slate-300 mr-2">systemd.journal / reverse-tunnel.service</span>
          </div>
          <span className="font-mono">{logs.length} رویداد</span>
        </div>

        <div className="p-4 max-h-[420px] overflow-y-auto space-y-2 text-xs font-mono">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-sans">
              هیچ رویدادی مطابق با فیلترها در بافر یافت نشد.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-900/60 transition-colors border-b border-slate-900/80 last:border-0"
              >
                {/* Timestamp */}
                <span className="text-slate-500 text-[11px] shrink-0 font-sans dir-ltr">
                  [{log.timestamp}]
                </span>

                {/* Level Badge */}
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 border ${getLevelBadge(
                    log.level
                  )}`}
                >
                  {log.level}
                </span>

                {/* Tag */}
                <span className="text-slate-400 text-[11px] shrink-0 font-bold">
                  [{log.tag}]
                </span>

                {/* Message */}
                <span className="text-slate-200 text-xs font-sans leading-relaxed flex-1">
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
