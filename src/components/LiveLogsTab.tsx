import React, { useState } from 'react';
import { 
  Terminal, 
  Trash2, 
  Download, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Eye, 
  Sparkles, 
  Bot,
  RefreshCw
} from 'lucide-react';
import { ActivityLog } from '../types';

interface LiveLogsTabProps {
  logs: ActivityLog[];
  onClear: () => void;
  onRefresh: () => void;
}

export const LiveLogsTab: React.FC<LiveLogsTabProps> = ({ logs, onClear, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === 'all' || log.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const exportLogs = () => {
    const text = logs
      .map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-engine-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogBadge = (type: ActivityLog['type']) => {
    switch (type) {
      case 'success':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SUCCESS</span>;
      case 'event':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">EVENT</span>;
      case 'warn':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">WARN</span>;
      case 'error':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">ERROR</span>;
      default:
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">INFO</span>;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Controls Bar */}
      <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#0b141a] p-1 rounded-xl border border-[#202c33]">
            {['all', 'event', 'success', 'warn', 'error'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all ${
                  filterType === t
                    ? 'bg-[#202c33] text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-emerald-400 border border-[#202c33] transition-all"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportLogs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-300 text-xs font-semibold border border-[#202c33] transition-all"
            title="Download log file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-all"
            title="Clear display logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="bg-[#0b141a] rounded-2xl border border-[#202c33] shadow-2xl p-5 font-mono text-xs overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#202c33] text-slate-500 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-semibold">Live Event Output Stream</span>
          </div>
          <span>Showing {filteredLogs.length} events</span>
        </div>

        <div className="h-[450px] overflow-y-auto space-y-2 pr-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-slate-600">
              No logs match the current search filter.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#111b21] transition-colors border border-transparent hover:border-[#202c33]"
              >
                <span className="text-slate-500 text-[10px] shrink-0 mt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <div className="shrink-0">{getLogBadge(log.type)}</div>
                <span className="text-slate-200 leading-relaxed break-all">
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
