import React, { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { Header } from './components/Header';
import { Sidebar, NavTabId } from './components/Sidebar';
import { LandingPage } from './components/LandingPage';
import { AdNetworkTab } from './components/AdNetworkTab';
import { ConnectTab } from './components/ConnectTab';
import { ApiKeysTab } from './components/ApiKeysTab';
import { GroupManagerTab } from './components/GroupManagerTab';
import { CampaignTab } from './components/CampaignTab';
import { BroadcastTab } from './components/BroadcastTab';
import { VisibilityTab } from './components/VisibilityTab';
import { LiveLogsTab } from './components/LiveLogsTab';
import { RenderDeployTab } from './components/RenderDeployTab';
import { PwaInstallModal } from './components/PwaInstallModal';
import { CreateAdvertModal } from './components/CreateAdvertModal';
import { AuthModal } from './components/AuthModal';
import { AuthGate } from './components/AuthGate';
import { AdminPortal } from './components/AdminPortal';
import { PublicPitchPage } from './components/PublicPitchPage';
import { usePwaInstall } from './hooks/usePwaInstall';
import { EngineStatusResponse, ActivityLog, AdvertCampaign } from './types';
import { auth, loginWithGoogle, logoutUser, testFirestoreConnection, isUserAdmin } from './lib/firebase';
import { Crown, ShieldAlert, Sparkles, Link2, Globe2, Rocket, Menu } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTabState] = useState<NavTabId>(() => {
    try {
      const saved = localStorage.getItem('wm_active_tab') as NavTabId;
      if (saved) return saved;
    } catch {}
    return 'landing';
  });

  const setActiveTab = (tab: NavTabId) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('wm_active_tab', tab);
    } catch {}
  };

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('wm_theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('wm_theme', nextTheme);
    } catch {}
  };

  // Synchronize document theme class
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.body.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.body.classList.remove('light');
    }
  }, [theme]);

  const [statusData, setStatusData] = useState<EngineStatusResponse | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionUser, setSessionUser] = useState<{ uid: string; email: string; displayName: string; photoURL?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('wm_session_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateAdvertModal, setShowCreateAdvertModal] = useState(false);
  const [networkStats, setNetworkStats] = useState<{
    totalPromoters: number;
    totalPooledGroups: number;
    totalAudienceReach: number;
    totalAdvertsPublished: number;
    activeLinesOnline?: number;
  }>({
    totalPromoters: 4,
    totalPooledGroups: 12,
    totalAudienceReach: 3200,
    totalAdvertsPublished: 18,
    activeLinesOnline: 2
  });
  const [campaignPreload, setCampaignPreload] = useState<{
    mode?: 'groups' | 'tagged_contacts';
    targetGroupJids?: string[];
    targetTags?: string[];
  } | null>(null);

  // Effective authenticated user (Firebase user or session user)
  const effectiveUser = currentUser || (sessionUser as unknown as User) || null;

  const [sponsorPromoterUid, setSponsorPromoterUid] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return params.get('promoter') || params.get('pitch') || params.get('sponsor');
      }
    } catch {}
    return null;
  });

  const {
    isInstallable,
    isInstalled,
    showIOSModal,
    setShowIOSModal,
    triggerInstall
  } = usePwaInstall();

  // Test Firestore Connection on Boot
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = () => {
    setShowAuthModal(true);
  };

  const handleSessionLogin = (profile: { uid: string; email: string; displayName: string; photoURL?: string }) => {
    setSessionUser(profile);
    try {
      localStorage.setItem('wm_session_user', JSON.stringify(profile));
    } catch {}
    // Sync with backend
    fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    }).catch(() => {});
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutUser();
      setSessionUser(null);
      localStorage.removeItem('wm_session_user');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  // Sync Firebase user with backend presence
  useEffect(() => {
    if (currentUser?.email) {
      fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || currentUser.email.split('@')[0],
          photoURL: currentUser.photoURL || ''
        })
      }).catch(() => {});
    }
  }, [currentUser]);

  const fetchStatus = useCallback(async () => {
    try {
      const q = effectiveUser?.email 
        ? `?userEmail=${encodeURIComponent(effectiveUser.email)}&uid=${encodeURIComponent(effectiveUser.uid || '')}&displayName=${encodeURIComponent(effectiveUser.displayName || '')}`
        : '';
      const res = await fetch(`/api/status${q}`);
      if (res.ok) {
        const data: EngineStatusResponse = await res.json();
        setStatusData(data);
      }
    } catch (e) {
      console.warn('Engine status poll note:', e);
    }
  }, [effectiveUser]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        if (data.logs) setLogs(data.logs);
      }
    } catch (e) {
      console.warn('Logs poll note:', e);
    }
  }, []);

  const fetchNetworkStats = useCallback(async () => {
    try {
      const res = await fetch('/api/network/stats');
      if (res.ok) {
        const data = await res.json();
        setNetworkStats(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNetworkStats();
    const interval = setInterval(fetchNetworkStats, 3500);
    return () => clearInterval(interval);
  }, [fetchNetworkStats]);

  // Mobile App Focus & Visibility Listener: When user minimizes the app to copy/paste code into WhatsApp,
  // returning to the browser instantly refreshes status without losing state!
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
        fetchLogs();
        fetchNetworkStats();
      }
    };
    const handleWindowFocus = () => {
      fetchStatus();
      fetchNetworkStats();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchStatus, fetchLogs, fetchNetworkStats]);

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
                pairingCode: payload.pairingCode || null,
                autoReact: payload.config?.autoReact ?? true,
                autoView: payload.config?.autoView ?? true,
                reactionEmojis: payload.config?.reactionEmojis ?? ['🔥', '👏', '❤️'],
                viewDelaySeconds: payload.config?.viewDelaySeconds ?? 2,
                stats: payload.stats,
                campaign: payload.campaign,
                activeAccountId: payload.activeAccountId,
                accounts: payload.accounts || prev?.accounts || []
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
                pairingCode: payload.pairingCode || null,
                autoReact: payload.config?.autoReact ?? prev?.autoReact ?? true,
                autoView: payload.config?.autoView ?? prev?.autoView ?? true,
                reactionEmojis: payload.config?.reactionEmojis ?? prev?.reactionEmojis ?? ['🔥'],
                viewDelaySeconds: payload.config?.viewDelaySeconds ?? prev?.viewDelaySeconds ?? 2,
                stats: payload.stats || prev?.stats,
                campaign: payload.campaign || prev?.campaign,
                activeAccountId: payload.activeAccountId || prev?.activeAccountId,
                accounts: payload.accounts || prev?.accounts || []
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

    // Gentle 15s fallback poll to sync counters if SSE connection drops
    const interval = setInterval(() => {
      fetchStatus();
    }, 15000);

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
      await fetch('/api/logout', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: statusData?.activeAccountId })
      });
      await fetchStatus();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSelectAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}/select`, { method: 'POST' });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (e) {
      console.error('Error selecting account:', e);
    }
  };

  const handleAddAccount = async (label: string) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label })
      });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (e) {
      console.error('Error adding account:', e);
    }
  };

  const handleDisconnectAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}/disconnect`, { method: 'POST' });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (e) {
      console.error('Error disconnecting account:', e);
    }
  };

  const handleRemoveAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (e) {
      console.error('Error removing account:', e);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  // If visitor arrives via a personal sponsor/pitch submission link
  if (sponsorPromoterUid) {
    return (
      <PublicPitchPage
        promoterUid={sponsorPromoterUid}
        onBackToApp={() => {
          try {
            window.history.replaceState({}, '', window.location.pathname);
          } catch {}
          setSponsorPromoterUid(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#0b141a] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      
      {/* Mobile & Desktop Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        statusData={statusData}
        currentUser={effectiveUser}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLogout={handleGoogleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        logsCount={logs.length}
        onInstallClick={triggerInstall}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        onSelectAccount={handleSelectAccount}
        onAddAccount={handleAddAccount}
        onDisconnectAccount={handleDisconnectAccount}
        onRemoveAccount={handleRemoveAccount}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main App Layout Wrapper with Desktop Left Margin for Sidebar */}
      <div className="flex-1 max-w-full min-w-0 overflow-x-hidden flex flex-col lg:pl-72 xl:pl-80 transition-all duration-300 pb-16 sm:pb-0">
        
        {/* Top App Bar Header */}
        <Header
          statusData={statusData}
          activeTab={activeTab}
          currentUser={effectiveUser}
          onGoogleLogin={handleGoogleLogin}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onRefresh={fetchStatus}
          onInstallClick={triggerInstall}
          isInstallable={isInstallable}
          isInstalled={isInstalled}
          onSelectAccount={handleSelectAccount}
          onAddAccount={handleAddAccount}
          onDisconnectAccount={handleDisconnectAccount}
          onRemoveAccount={handleRemoveAccount}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-6 lg:px-8 py-3.5 sm:py-5 min-w-0 overflow-x-hidden">
          {activeTab === 'landing' && (
            <LandingPage
              currentUser={effectiveUser}
              onLogin={handleGoogleLogin}
              networkStats={networkStats}
              onGetStarted={() => {
                if (!effectiveUser) {
                  handleGoogleLogin();
                } else {
                  setActiveTab('connect');
                }
              }}
              onCreateAdvert={() => {
                if (!effectiveUser) {
                  handleGoogleLogin();
                } else {
                  setShowCreateAdvertModal(true);
                }
              }}
            />
          )}

          {/* Authentication Gate: User cannot access internal engine tabs without signing in */}
          {!effectiveUser && activeTab !== 'landing' && activeTab !== 'deploy' && (
            <AuthGate
              onSignIn={handleGoogleLogin}
              targetFeature={
                activeTab === 'connect'
                  ? 'WhatsApp Account Connection'
                  : activeTab === 'campaign'
                  ? '24/7 Campaign & Auto-Poster Engine'
                  : activeTab === 'groups'
                  ? 'Group Manager & VCF Extractor'
                  : activeTab === 'broadcast'
                  ? 'Story Broadcast Engine'
                  : activeTab === 'visibility'
                  ? 'Story Viewer & Reacts Engine'
                  : activeTab === 'ad-network'
                  ? 'Community Ad Network Pool'
                  : 'Developer & Automation Features'
              }
            />
          )}

          {effectiveUser && activeTab === 'ad-network' && (
            <AdNetworkTab
              statusData={statusData}
              currentUser={effectiveUser}
              onRefresh={fetchStatus}
              onOpenConnect={() => setActiveTab('connect')}
              onOpenCampaign={(preload) => {
                if (preload) setCampaignPreload(preload);
                setActiveTab('campaign');
              }}
            />
          )}

          {effectiveUser && activeTab === 'connect' && (
            <ConnectTab
              statusData={statusData}
              onRefresh={fetchStatus}
              onSelectAccount={handleSelectAccount}
              onAddAccount={handleAddAccount}
              onDisconnectAccount={handleDisconnectAccount}
              onRemoveAccount={handleRemoveAccount}
            />
          )}

          {effectiveUser && activeTab === 'api-keys' && (
            <ApiKeysTab
              statusData={statusData}
            />
          )}

          {effectiveUser && activeTab === 'groups' && (
            <GroupManagerTab
              statusData={statusData}
              onRefresh={fetchStatus}
              onSelectForCampaign={(options) => {
                if (options) setCampaignPreload(options);
                setActiveTab('campaign');
              }}
            />
          )}

          {effectiveUser && activeTab === 'campaign' && (
            <CampaignTab
              statusData={statusData}
              onRefresh={fetchStatus}
              currentUser={effectiveUser}
              preloadOptions={campaignPreload}
            />
          )}

          {effectiveUser && activeTab === 'broadcast' && (
            <BroadcastTab
              statusData={statusData}
              onRefresh={fetchStatus}
            />
          )}

          {effectiveUser && activeTab === 'visibility' && (
            <VisibilityTab
              statusData={statusData}
              onRefresh={fetchStatus}
            />
          )}

          {effectiveUser && activeTab === 'logs' && (
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

          {effectiveUser && activeTab === 'admin' && (
            <AdminPortal
              currentUser={effectiveUser}
              statusData={statusData}
              onRefreshStatus={fetchStatus}
              onOpenRenderDeploy={() => setActiveTab('deploy')}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#202c33] bg-[#0b141a] py-5 px-4 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© 2026 WhatsApp Promoters & Ad Network • Automated Multi-Group Viral Engine</p>
            <div className="flex items-center gap-3 text-slate-400 text-[11px]">
              <span className="text-emerald-400 font-medium">● 24/7 Auto-Poster Active</span>
              <span>•</span>
              <span>Multi-Account Protected</span>
              <span>•</span>
              {isUserAdmin(effectiveUser) && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>Admin Portal</span>
                </button>
              )}
            </div>
          </div>
        </footer>

        {/* Mobile Premium Bottom Navigation Bar */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111b21]/95 backdrop-blur-lg border-t border-[#202c33] px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
          <button
            onClick={() => setActiveTab('landing')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer flex-1 ${
              activeTab === 'landing' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-none">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('connect')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer flex-1 relative ${
              activeTab === 'connect' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Link2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-none">Connect</span>
            {statusData?.status === 'connected' ? (
              <span className="absolute top-1 right-4 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#111b21]" />
            ) : statusData?.status === 'connecting' ? (
              <span className="absolute top-1 right-4 w-2 h-2 rounded-full bg-amber-400 animate-ping ring-2 ring-[#111b21]" />
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('ad-network')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer flex-1 ${
              activeTab === 'ad-network' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-none">Ad Pool</span>
          </button>

          <button
            onClick={() => setActiveTab('campaign')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer flex-1 ${
              activeTab === 'campaign' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Rocket className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-none">Campaign</span>
          </button>

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer flex-1 text-slate-400 hover:text-white"
          >
            <Menu className="w-5 h-5 mb-0.5 text-emerald-400" />
            <span className="text-[10px] leading-none">Menu</span>
          </button>
        </nav>

      </div>

      {/* Global Create Advert Modal */}
      <CreateAdvertModal
        isOpen={showCreateAdvertModal}
        onClose={() => setShowCreateAdvertModal(false)}
        currentUser={effectiveUser}
        onSuccess={(newAdv) => {
          setActiveTab('ad-network');
        }}
      />

      {/* Account Authentication & Domain Helper Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSessionLogin={handleSessionLogin}
      />

      {/* iOS PWA Instructions Modal */}
      <PwaInstallModal
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
      />

    </div>
  );
}
