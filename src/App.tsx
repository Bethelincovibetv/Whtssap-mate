import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTabId } from './components/Sidebar';
import { ConnectTab } from './components/ConnectTab';
import { ApiKeysTab } from './components/ApiKeysTab';
import { GroupManagerTab } from './components/GroupManagerTab';
import { CampaignTab } from './components/CampaignTab';
import { BroadcastTab } from './components/BroadcastTab';
import { VisibilityTab } from './components/VisibilityTab';
import { AiResponderTab } from './components/AiResponderTab';
import { LiveLogsTab } from './components/LiveLogsTab';
import { RenderDeployTab } from './components/RenderDeployTab';
import { PwaInstallModal } from './components/PwaInstallModal';
import { usePwaInstall } from './hooks/usePwaInstall';
import { EngineStatusResponse, ActivityLog } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('connect');
  const [statusData, setStatusData] = useState<EngineStatusResponse | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    isInstallable,
    isInstalled,
    showIOSModal,
    setShowIOSModal,
    triggerInstall
  } = usePwaInstall();

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

  // Periodic Keep-Alive Heartbeat to prevent server idling / WebSocket timeout
  useEffect(() => {
    const pingServer = async () => {
      try {
        await fetch('/api/ping');
      } catch (e) {}
    };

    const keepAliveTimer = setInterval(pingServer, 20000);
    return () => clearInterval(keepAliveTimer);
  }, []);

  // SSE Stream for Real-Time Event Logs and Status Updates
  useEffect(() => {
    fetchStatus();
    fetchLogs();

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    function connectSSE() {
      if (!isSubscribed) return;
      try {
        if (eventSource) {
          eventSource.close();
        }
        eventSource = new EventSource('/api/logs/stream');
        
        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'init') {
              setStatusData(prev => ({
                status: payload.status,
                phase: payload.phase,
                phone: payload.phone,
                name: payload.name,
                hasQr: payload.hasQr,
                qr: payload.qr,
                autoReact: payload.config?.autoReact ?? true,
                autoView: payload.config?.autoView ?? true,
                aiResponder: payload.config?.aiResponder ?? true,
                aiTriggerMode: payload.config?.aiTriggerMode ?? 'all',
                triggerKeywords: payload.config?.triggerKeywords ?? [],
                reactionEmojis: payload.config?.reactionEmojis ?? ['🔥', '👏', '❤️'],
                systemPrompt: payload.config?.systemPrompt ?? '',
                viewDelaySeconds: payload.config?.viewDelaySeconds ?? 2,
                typingDelaySeconds: payload.config?.typingDelaySeconds ?? 2,
                fallbackRules: payload.config?.fallbackRules ?? [],
                stats: payload.stats,
                campaign: payload.campaign
              }));
              if (payload.logs) setLogs(payload.logs);
            } else if (payload.type === 'log') {
              setLogs(prev => [payload.log, ...prev.slice(0, 250)]);
              if (payload.stats) {
                setStatusData(prev => prev ? { ...prev, stats: payload.stats, campaign: payload.campaign || prev.campaign } : prev);
              }
            } else if (payload.type === 'state') {
              setStatusData(prev => ({
                status: payload.status,
                phase: payload.phase,
                phone: payload.phone,
                name: payload.name,
                hasQr: payload.hasQr,
                qr: payload.qr,
                autoReact: payload.config?.autoReact ?? prev?.autoReact ?? true,
                autoView: payload.config?.autoView ?? prev?.autoView ?? true,
                aiResponder: payload.config?.aiResponder ?? prev?.aiResponder ?? true,
                aiTriggerMode: payload.config?.aiTriggerMode ?? prev?.aiTriggerMode ?? 'all',
                triggerKeywords: payload.config?.triggerKeywords ?? prev?.triggerKeywords ?? [],
                reactionEmojis: payload.config?.reactionEmojis ?? prev?.reactionEmojis ?? ['🔥'],
                systemPrompt: payload.config?.systemPrompt ?? prev?.systemPrompt ?? '',
                viewDelaySeconds: payload.config?.viewDelaySeconds ?? prev?.viewDelaySeconds ?? 2,
                typingDelaySeconds: payload.config?.typingDelaySeconds ?? prev?.typingDelaySeconds ?? 2,
                fallbackRules: payload.config?.fallbackRules ?? prev?.fallbackRules ?? [],
                stats: payload.stats || prev?.stats,
                campaign: payload.campaign || prev?.campaign
              }));
            }
          } catch (err) {
            console.error('Failed to parse SSE payload', err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (isSubscribed) {
            reconnectTimeout = setTimeout(connectSSE, 3000);
          }
        };
      } catch (e) {
        console.warn('SSE not supported or failed to connect, falling back to polling.');
      }
    }

    connectSSE();

    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
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

  return (
    <div className="min-h-screen bg-[#0b141a] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      
      {/* Mobile & Desktop Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        statusData={statusData}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        logsCount={logs.length}
        onInstallClick={triggerInstall}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
      />

      {/* Main App Layout Wrapper with Desktop Left Margin for Sidebar */}
      <div className="flex-1 flex flex-col lg:pl-72 xl:pl-80 transition-all duration-300">
        
        {/* Top App Bar Header */}
        <Header
          statusData={statusData}
          activeTab={activeTab}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onRefresh={fetchStatus}
          onInstallClick={triggerInstall}
          isInstallable={isInstallable}
          isInstalled={isInstalled}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
          {activeTab === 'connect' && (
            <ConnectTab
              statusData={statusData}
              onRefresh={fetchStatus}
            />
          )}

          {activeTab === 'api-keys' && (
            <ApiKeysTab
              statusData={statusData}
            />
          )}

          {activeTab === 'groups' && (
            <GroupManagerTab
              statusData={statusData}
              onRefresh={fetchStatus}
              onSelectForCampaign={() => setActiveTab('campaign')}
            />
          )}

          {activeTab === 'campaign' && (
            <CampaignTab
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
              stats={statusData?.stats}
              onClear={handleClearLogs}
              onRefresh={fetchLogs}
            />
          )}

          {activeTab === 'deploy' && (
            <RenderDeployTab />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#202c33] bg-[#0b141a] py-5 px-4 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© 2026 WhatsApp Growth & Automation Engine • PWA & REST API Ready</p>
            <div className="flex items-center gap-3 text-slate-400 text-[11px]">
              <span className="text-emerald-400">● 24/7 Keep-Alive</span>
              <span>•</span>
              <span>REST API v1</span>
              <span>•</span>
              <span>Baileys MultiAuth</span>
              <span>•</span>
              <span>Port 3000</span>
            </div>
          </div>
        </footer>

      </div>

      {/* iOS PWA Instructions Modal */}
      <PwaInstallModal
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
      />

    </div>
  );
}
