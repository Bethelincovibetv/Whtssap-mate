import React, { useState, useEffect, useCallback } from 'react';
import { 
  Link2, 
  Send, 
  Eye, 
  Bot, 
  Terminal, 
  Rocket, 
  Sparkles, 
  RefreshCw 
} from 'lucide-react';
import { Header } from './components/Header';
import { ConnectTab } from './components/ConnectTab';
import { BroadcastTab } from './components/BroadcastTab';
import { VisibilityTab } from './components/VisibilityTab';
import { AiResponderTab } from './components/AiResponderTab';
import { LiveLogsTab } from './components/LiveLogsTab';
import { RenderDeployTab } from './components/RenderDeployTab';
import { EngineStatusResponse, ActivityLog } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'connect' | 'broadcast' | 'visibility' | 'ai' | 'logs' | 'deploy'>('connect');
  const [statusData, setStatusData] = useState<EngineStatusResponse | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data: EngineStatusResponse = await res.json();
        setStatusData(data);
      }
    } catch (e) {
      console.error('Error fetching engine status:', e);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        if (data.logs) setLogs(data.logs);
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    }
  }, []);

  // SSE Stream for Real-Time Event Logs and Status Updates
  useEffect(() => {
    fetchStatus();
    fetchLogs();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/logs/stream');
      
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'init') {
            setStatusData(prev => ({
              status: payload.status,
              phone: payload.phone,
              name: payload.name,
              hasQr: payload.hasQr,
              qr: payload.qr,
              autoReact: payload.config?.autoReact ?? true,
              autoView: payload.config?.autoView ?? true,
              aiResponder: payload.config?.aiResponder ?? true,
              reactionEmojis: payload.config?.reactionEmojis ?? ['🔥', '👏', '❤️'],
              systemPrompt: payload.config?.systemPrompt ?? '',
              viewDelaySeconds: payload.config?.viewDelaySeconds ?? 2,
              stats: payload.stats
            }));
            if (payload.logs) setLogs(payload.logs);
          } else if (payload.type === 'log') {
            setLogs(prev => [payload.log, ...prev.slice(0, 200)]);
            if (payload.stats) {
              setStatusData(prev => prev ? { ...prev, stats: payload.stats } : prev);
            }
          } else if (payload.type === 'state') {
            setStatusData(prev => ({
              status: payload.status,
              phone: payload.phone,
              name: payload.name,
              hasQr: payload.hasQr,
              qr: payload.qr,
              autoReact: payload.config?.autoReact ?? prev?.autoReact ?? true,
              autoView: payload.config?.autoView ?? prev?.autoView ?? true,
              aiResponder: payload.config?.aiResponder ?? prev?.aiResponder ?? true,
              reactionEmojis: payload.config?.reactionEmojis ?? prev?.reactionEmojis ?? ['🔥'],
              systemPrompt: payload.config?.systemPrompt ?? prev?.systemPrompt ?? '',
              viewDelaySeconds: payload.config?.viewDelaySeconds ?? prev?.viewDelaySeconds ?? 2,
              stats: payload.stats || prev?.stats
            }));
          }
        } catch (err) {
          console.error('Failed to parse SSE payload', err);
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch (e) {
      console.warn('SSE not supported or failed to connect, falling back to polling.');
    }

    const interval = setInterval(() => {
      fetchStatus();
    }, 4000);

    return () => {
      clearInterval(interval);
      eventSource?.close();
    };
  }, [fetchStatus, fetchLogs]);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to disconnect and reset your WhatsApp session credentials?')) return;
    setIsLoggingOut(true);
    try {
      await fetch('/api/logout', { method: 'POST' });
      await fetchStatus();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  interface NavItem {
    id: 'connect' | 'broadcast' | 'visibility' | 'ai' | 'logs' | 'deploy';
    label: string;
    icon: any;
    count?: number;
  }

  const navItems: NavItem[] = [
    { id: 'connect', label: 'Connect Account', icon: Link2 },
    { id: 'broadcast', label: 'Status Broadcast', icon: Send },
    { id: 'visibility', label: 'Auto-Visibility & Reacts', icon: Eye },
    { id: 'ai', label: 'AI Auto-Responder', icon: Bot },
    { id: 'logs', label: 'Live Logs', icon: Terminal, count: logs.length },
    { id: 'deploy', label: 'Render 1-Click Deploy', icon: Rocket },
  ];

  return (
    <div className="min-h-screen bg-[#0b141a] text-slate-100 flex flex-col font-sans antialiased">
      
      {/* Top Header */}
      <Header
        statusData={statusData}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-[#202c33] gap-1 overflow-x-auto pb-px mb-6 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-semibold rounded-t-xl transition-all border-b-2 shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-[#111b21]'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#111b21]/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab View Switcher */}
        <div>
          {activeTab === 'connect' && (
            <ConnectTab
              statusData={statusData}
              onRefresh={fetchStatus}
            />
          )}

          {activeTab === 'broadcast' && (
            <BroadcastTab
              statusData={statusData}
              onRefresh={fetchStatus}
            />
          )}

          {activeTab === 'visibility' && (
            <VisibilityTab
              statusData={statusData}
              onRefresh={fetchStatus}
            />
          )}

          {activeTab === 'ai' && (
            <AiResponderTab
              statusData={statusData}
              onRefresh={fetchStatus}
            />
          )}

          {activeTab === 'logs' && (
            <LiveLogsTab
              logs={logs}
              onClear={handleClearLogs}
              onRefresh={fetchLogs}
            />
          )}

          {activeTab === 'deploy' && (
            <RenderDeployTab />
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#202c33] bg-[#0b141a] py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <p>© 2026 WhatsApp Growth & Automation Engine • Production Ready for Render & AI Studio</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Baileys MultiAuth</span>
            <span>•</span>
            <span>Gemini 3.8 Flash</span>
            <span>•</span>
            <span>Port 3000 Ready</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
