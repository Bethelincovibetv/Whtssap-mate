import React from 'react';
import { 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Eye, 
  Sparkles, 
  Bot, 
  Send,
  Users
} from 'lucide-react';
import { EngineStatusResponse, EngineStats } from '../types';

interface HeaderProps {
  statusData: EngineStatusResponse | null;
  onLogout: () => void;
  isLoggingOut: boolean;
}

export const Header: React.FC<HeaderProps> = ({ statusData, onLogout, isLoggingOut }) => {
  const isConnected = statusData?.status === 'connected';
  const isConnecting = statusData?.status === 'connecting';
  const stats: EngineStats = statusData?.stats || {
    statusesViewed: 0,
    reactionsSent: 0,
    aiRepliesSent: 0,
    broadcastsSent: 0,
    campaignMessagesSent: 0,
    startedAt: new Date().toISOString()
  };

  return (
    <header className="border-b border-[#202c33] bg-[#111b21]/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#128C7E] via-[#075E54] to-[#25D366] flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-500/30">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.599 2.679-.702c.974.553 1.769.82 2.781.821 3.18 0 5.767-2.587 5.768-5.766.001-3.182-2.585-5.768-5.769-5.768zm3.364 8.163c-.144.405-.837.774-1.17.824-.312.045-.698.077-2.222-.556-1.95-.811-3.21-2.779-3.307-2.909-.096-.13-.787-1.047-.787-1.996 0-.949.498-1.416.675-1.611.178-.195.388-.244.518-.244.13 0 .26.001.373.006.12.006.28-.046.438.334.162.388.553 1.349.601 1.448.049.098.081.213.016.342-.065.13-.098.211-.195.324-.097.114-.205.254-.293.342-.098.098-.2.204-.086.399.114.195.506.835 1.086 1.352.748.666 1.378.873 1.573.971.195.097.308.081.422-.049.114-.13.487-.568.617-.763.13-.195.26-.162.438-.097.178.065 1.134.535 1.329.633.195.098.324.146.373.227.048.081.048.471-.096.876z"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.39A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2a8.17 8.17 0 01-4.322-1.229l-.31-.184-2.96.825.834-2.887-.202-.323A8.17 8.17 0 1112 20.2z"/>
              </svg>
            </div>
            {isConnected && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#111b21]"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                WhatsApp Automation & Growth Engine
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-semibold border border-emerald-500/30">
                100% Turnkey
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-Group Campaigns • Group Manager • Auto-Story Reactor • Gemini AI
            </p>
          </div>
        </div>

        {/* Live Metrics & Connection Status */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Quick Metrics Bar */}
          <div className="hidden xl:flex items-center gap-4 px-3 py-1.5 rounded-xl bg-[#0b141a]/90 border border-[#202c33] text-xs">
            <div className="flex items-center gap-1.5" title="Statuses Viewed">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-mono text-slate-300 font-semibold">{stats.statusesViewed}</span>
              <span className="text-slate-500 text-[10px]">views</span>
            </div>
            <div className="w-px h-3.5 bg-slate-800" />
            <div className="flex items-center gap-1.5" title="Reactions Sent">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono text-slate-300 font-semibold">{stats.reactionsSent}</span>
              <span className="text-slate-500 text-[10px]">reacts</span>
            </div>
            <div className="w-px h-3.5 bg-slate-800" />
            <div className="flex items-center gap-1.5" title="Group Messages Sent">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-slate-300 font-semibold">{stats.campaignMessagesSent}</span>
              <span className="text-slate-500 text-[10px]">groups</span>
            </div>
            <div className="w-px h-3.5 bg-slate-800" />
            <div className="flex items-center gap-1.5" title="AI Replies Sent">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-mono text-slate-300 font-semibold">{stats.aiRepliesSent}</span>
              <span className="text-slate-500 text-[10px]">AI</span>
            </div>
          </div>

          {/* Connection Pill */}
          {isConnected ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm shadow-emerald-950/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Connected</span>
              <span className="font-mono text-slate-300 bg-emerald-950/60 px-1.5 py-0.5 rounded text-[11px]">
                +{statusData?.phone || 'Active'}
              </span>
            </div>
          ) : isConnecting ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>Pairing Ready...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Disconnected</span>
            </div>
          )}

          {/* Disconnect Button */}
          {isConnected && (
            <button
              onClick={onLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b141a] hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-[#202c33] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              title="Disconnect WhatsApp Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isLoggingOut ? 'Disconnecting...' : 'Disconnect'}</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
