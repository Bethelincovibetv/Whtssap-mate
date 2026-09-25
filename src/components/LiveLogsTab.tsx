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
  RefreshCw,
  FileSpreadsheet,
  FileCode,
  Layers,
  Send,
  Users
} from 'lucide-react';
import { ActivityLog, EngineStats } from '../types';

interface LiveLogsTabProps {
  logs: ActivityLog[];
  stats?: EngineStats;
  onClear: () => void;
  onRefresh: () => void;
}

export const LiveLogsTab: React.FC<LiveLogsTabProps> = ({ logs, stats, onClear, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || log.type === filterType;
    const matchesCategory = filterCategory === 'all' || log.category === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const exportLogsAsText = () => {
    const text = logs
      .map(l => `[${l.timestamp}] [${(l.type || 'INFO').toUpperCase()}] ${l.message}`)
      .join('\n');
    downloadBlob(text, `whatsapp-engine-logs-${new Date().toISOString().slice(0, 10)}.txt`, 'text/plain');
  };

  const exportLogsAsCSV = () => {
    const headers = ['ID', 'Timestamp', 'Level', 'Category', 'Message'];
    const rows = logs.map(l => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.type || 'info'}"`,
      `"${l.category || 'system'}"`,
      `"${l.message.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, `whatsapp-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  };

  const exportLogsAsJSON = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    downloadBlob(jsonStr, `whatsapp-audit-logs-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  const downloadBlob = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
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
    <div className="space-y-6">
      
      {/* Live Analytics Dashboard Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400 font-medium">Stories Viewed</span>
              <Eye className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <p className="text-xl font-bold text-white">{stats.statusesViewed.toLocaleString()}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400 font-medium">Auto Reactions</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-xl font-bold text-amber-400">{stats.reactionsSent.toLocaleString()}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400 font-medium">Group Messages</span>
              <Users className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400">{stats.campaignMessagesSent.toLocaleString()}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400 font-medium">AI Inbound Replies</span>
              <Bot className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <p className="text-xl font-bold text-purple-400">{stats.aiRepliesSent.toLocaleString()}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400 font-medium">Story Broadcasts</span>
              <Send className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <p className="text-xl font-bold text-teal-400">{stats.broadcastsSent.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Controls & Search Bar */}
      <div className="p-4 md:p-5 rounded-2xl bg-[#111b21] border border-[#202c33] flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search live logs & events..."
              className="w-full bg-[#0b141a] border border-[#202c33] focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
            />
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1 bg-[#0b141a] p-1 rounded-xl border border-[#202c33]">
            {['all', 'event', 'success', 'warn', 'error'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition-all cursor-pointer ${
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

        {/* Action Buttons: Export CSV / JSON & Clear */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={exportLogsAsCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-300 hover:text-emerald-400 border border-[#202c33] text-xs font-semibold transition-all cursor-pointer"
            title="Export CSV audit file"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={exportLogsAsJSON}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-300 hover:text-blue-400 border border-[#202c33] text-xs font-semibold transition-all cursor-pointer"
            title="Export JSON audit file"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-[#0b141a] hover:bg-[#202c33] text-slate-400 hover:text-emerald-400 border border-[#202c33] transition-all cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClear}
            className="p-2 rounded-xl bg-[#0b141a] hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-[#202c33] transition-all cursor-pointer"
            title="Clear current log view"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Stream Console */}
      <div className="rounded-3xl bg-[#0b141a] border border-[#202c33] overflow-hidden shadow-2xl font-mono text-xs">
        
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-[#111b21] border-b border-[#202c33] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
            </div>
            <span className="text-slate-400 text-[11px] ml-2 font-mono">baileys.engine.events.log</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Live Stream Connected</span>
          </div>
        </div>

        {/* Log Entries View */}
        <div className="p-4 max-h-[500px] overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-600">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No activity logs recorded yet. Events will appear here in real-time.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2 rounded-xl hover:bg-[#111b21] transition-colors group"
              >
                <span className="text-[10px] text-slate-500 shrink-0 pt-0.5 select-none">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                
                <div className="shrink-0">
                  {getLogBadge(log.type)}
                </div>

                <div className="flex-1 text-slate-200 break-words leading-relaxed">
                  {log.message}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
};
