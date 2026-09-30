import React, { useState } from 'react';
import { 
  Link2, 
  KeyRound, 
  Users, 
  Rocket, 
  Send, 
  Eye, 
  Terminal, 
  CloudUpload,
  LogOut,
  X,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Radio,
  Sparkles,
  Download,
  ShieldCheck,
  Globe2,
  Crown,
  LogIn,
  Lock,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers
} from 'lucide-react';
import { User } from 'firebase/auth';
import { EngineStatusResponse } from '../types';
import { isUserAdmin, ADMIN_EMAIL } from '../lib/firebase';
import { AccountSwitcher } from './AccountSwitcher';

export type NavTabId = 'landing' | 'ad-network' | 'connect' | 'api-keys' | 'groups' | 'campaign' | 'broadcast' | 'visibility' | 'logs' | 'deploy' | 'admin';

interface SidebarProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  statusData: EngineStatusResponse | null;
  currentUser: User | null;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
  logsCount: number;
  onInstallClick?: () => void;
  isInstallable?: boolean;
  isInstalled?: boolean;
  onSelectAccount?: (accountId: string) => void;
  onAddAccount?: (label: string) => Promise<void>;
  onDisconnectAccount?: (accountId: string) => void;
  onRemoveAccount?: (accountId: string) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  statusData,
  currentUser,
  onGoogleLogin,
  onGoogleLogout,
  isOpen,
  onClose,
  onLogout,
  isLoggingOut,
  logsCount,
  onInstallClick,
  isInstallable,
  isInstalled,
  onSelectAccount,
  onAddAccount,
  onDisconnectAccount,
  onRemoveAccount,
  theme = 'dark',
  onToggleTheme
}) => {
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState<boolean>(false);
  const isConnected = statusData?.status === 'connected';
  const isConnecting = statusData?.status === 'connecting';
  const isAdmin = isUserAdmin(currentUser);

  const stats = statusData?.stats || {
    statusesViewed: 0,
    reactionsSent: 0,
    aiRepliesSent: 0,
    broadcastsSent: 0,
    campaignMessagesSent: 0,
    startedAt: new Date().toISOString()
  };

  const totalEventsCount = (stats.statusesViewed || 0) + (stats.reactionsSent || 0) + (stats.campaignMessagesSent || 0) + (stats.broadcastsSent || 0);

  // Base friendly items for all users with colourful mobile app icon styles
  interface NavItemDef {
    id: NavTabId;
    label: string;
    icon: any;
    desc: string;
    iconGradient: string;
    badge?: string;
    badgeColor?: string;
    count?: number;
  }

  const userNavItems: NavItemDef[] = [
    { 
      id: 'landing', 
      label: 'Home & Ad Network', 
      icon: Sparkles, 
      desc: 'Live dashboard & network stats',
      iconGradient: 'from-emerald-500 to-teal-400 text-white shadow-emerald-500/20',
      badge: 'LIVE',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    },
    { 
      id: 'ad-network', 
      label: 'Community Ad Pool', 
      icon: Globe2, 
      desc: 'Pooled groups & sponsor pitches',
      iconGradient: 'from-amber-500 to-orange-500 text-white shadow-amber-500/20',
      badge: 'POOL',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    },
    { 
      id: 'connect', 
      label: 'Connect WhatsApp Line', 
      icon: Link2, 
      desc: 'Pair via QR or 8-digit code',
      iconGradient: 'from-cyan-500 to-blue-500 text-white shadow-cyan-500/20'
    },
    { 
      id: 'groups', 
      label: 'Group Manager & VCF', 
      icon: Users, 
      desc: 'Search, tag & export real contacts',
      iconGradient: 'from-indigo-500 to-violet-600 text-white shadow-indigo-500/20'
    },
    { 
      id: 'campaign', 
      label: 'Campaign & Auto-Poster', 
      icon: Rocket, 
      desc: '24/7 scheduled group broadcaster',
      iconGradient: 'from-rose-500 to-pink-500 text-white shadow-rose-500/20',
      badge: statusData?.campaign?.status === 'running' ? 'Active' : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
    },
    { 
      id: 'broadcast', 
      label: 'Story Broadcast Engine', 
      icon: Send, 
      desc: 'Auto-post stories across contacts',
      iconGradient: 'from-purple-500 to-fuchsia-600 text-white shadow-purple-500/20'
    },
    { 
      id: 'visibility', 
      label: 'Story Viewer & Reacts', 
      icon: Eye, 
      desc: 'Auto-view & instant emoji reacts',
      iconGradient: 'from-sky-400 to-blue-600 text-white shadow-blue-500/20'
    },
  ];

  // Optional technical items (Controlled by Admin Platform Settings)
  const showRenderDeploy = isAdmin || !!statusData?.settings?.showRenderDeployToUsers;
  const showAuditLogs = isAdmin || !!statusData?.settings?.showAuditLogsToUsers;
  const showApiKeys = isAdmin || !!statusData?.settings?.showApiKeysToUsers;

  const optionalItems: NavItemDef[] = [];

  if (showApiKeys) {
    optionalItems.push({ 
      id: 'api-keys', 
      label: 'Developer API & Keys', 
      icon: KeyRound, 
      desc: 'Integrate external apps & webhooks',
      iconGradient: 'from-teal-500 to-emerald-700 text-white shadow-teal-500/20',
      badge: 'REST API',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    });
  }

  if (showAuditLogs) {
    optionalItems.push({ 
      id: 'logs', 
      label: 'Audit Telemetry Logs', 
      icon: Terminal, 
      desc: 'Real-time telemetry & events',
      iconGradient: 'from-slate-600 to-zinc-800 text-white shadow-slate-500/20',
      count: logsCount 
    });
  }

  if (showRenderDeploy) {
    optionalItems.push({ 
      id: 'deploy', 
      label: 'Render 24/7 Cloud Deploy', 
      icon: CloudUpload, 
      desc: 'Cloud hosting setup instructions',
      iconGradient: 'from-blue-600 to-cyan-700 text-white shadow-blue-500/20'
    });
  }

  // Admin Management Portal item (Visible strictly to authenticated Super Admin)
  const adminItems: NavItemDef[] = isAdmin ? [
    {
      id: 'admin',
      label: 'Admin Control Portal',
      icon: Crown,
      desc: 'Platform governance & users',
      iconGradient: 'from-amber-400 via-amber-500 to-yellow-600 text-white shadow-amber-500/30',
      badge: 'ADMIN',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
    }
  ] : [];

  const navItems: NavItemDef[] = [...adminItems, ...userNavItems, ...optionalItems];

  const handleSelectTab = (tab: NavTabId) => {
    if (!currentUser && tab !== 'landing' && tab !== 'deploy') {
      onGoogleLogin();
      return;
    }
    setActiveTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-80 bg-[#111b21] border-r border-[#202c33] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top Header & Brand */}
        <div className="p-4 sm:p-5 border-b border-[#202c33] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#128C7E] via-[#075E54] to-[#25D366] flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-500/30">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.599 2.679-.702c.974.553 1.769.82 2.781.821 3.18 0 5.767-2.587 5.768-5.766.001-3.182-2.585-5.768-5.769-5.768zm3.364 8.163c-.144.405-.837.774-1.17.824-.312.045-.698.077-2.222-.556-1.95-.811-3.21-2.779-3.307-2.909-.096-.13-.787-1.047-.787-1.996 0-.949.498-1.416.675-1.611.178-.195.388-.244.518-.244.13 0 .26.001.373.006.12.006.28-.046.438.334.162.388.553 1.349.601 1.448.049.098.081.213.016.342-.065.13-.098.211-.195.324-.097.114-.205.254-.293.342-.098.098-.2.204-.086.399.114.195.506.835 1.086 1.352.748.666 1.378.873 1.573.971.195.097.308.081.422-.049.114-.13.487-.568.617-.763.13-.195.26-.162.438-.097.178.065 1.134.535 1.329.633.195.098.324.146.373.227.048.081.048.471-.096.876z"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.39A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2a8.17 8.17 0 01-4.322-1.229l-.31-.184-2.96.825.834-2.887-.202-.323A8.17 8.17 0 1112 20.2z"/>
                </svg>
              </div>
              {isConnected && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-[#111b21]"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white">WhatsApp Ad Net</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono font-semibold border border-emerald-500/20">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                {isConnected ? `+${statusData?.phone || 'Online'}` : 'Promoters & Ads'}
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#202c33] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User / Firebase Profile Bar */}
        <div className="px-4 py-2.5 bg-[#0b141a] border-b border-[#202c33] flex items-center justify-between">
          {currentUser ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 truncate">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="User" className="w-6 h-6 rounded-full border border-emerald-500/40" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {currentUser.email?.[0].toUpperCase()}
                  </div>
                )}
                <div className="truncate">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold text-white truncate max-w-[110px]">{currentUser.displayName || currentUser.email?.split('@')[0]}</p>
                    {isAdmin && (
                      <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                        <Crown className="w-2.5 h-2.5" /> Admin
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate max-w-[130px]">{currentUser.email}</p>
                </div>
              </div>

              <button
                onClick={onGoogleLogout}
                className="text-[10px] text-slate-400 hover:text-rose-400 px-2 py-1 rounded bg-[#111b21] hover:bg-[#202c33] transition-all cursor-pointer"
                title="Log out from Firebase"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-400">Firebase Cloud Sync</span>
              <button
                onClick={onGoogleLogin}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer shadow"
              >
                <LogIn className="w-3 h-3" />
                <span>Account Sign In</span>
              </button>
            </div>
          )}
        </div>

        {/* Minimizable / Collapsible Analysis & Status Section */}
        <div className="border-b border-[#202c33] bg-[#0b141a]/60 transition-all">
          {/* Collapsible Header Toggle */}
          <button
            type="button"
            onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#111b21] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                isConnected 
                  ? 'bg-emerald-400 animate-pulse ring-2 ring-emerald-500/30' 
                  : isConnecting 
                  ? 'bg-amber-400 animate-ping' 
                  : 'bg-rose-500'
              }`} />
              <span className="text-xs font-semibold text-slate-200">
                {isConnected ? 'Line Active' : isConnecting ? 'Connecting...' : 'Ready to Pair'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#111b21] border border-[#202c33] text-slate-400 font-mono">
                {totalEventsCount} events
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <span>{isAnalysisExpanded ? 'Collapse' : 'Expand'}</span>
              {isAnalysisExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>

          {/* Expanded Analysis Details */}
          {isAnalysisExpanded && (
            <div className="px-4 pb-3 pt-1 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
              {/* Mini Stat Badges */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="bg-[#111b21] p-1.5 rounded-xl border border-[#202c33]" title="Stories Viewed">
                  <p className="text-[11px] text-blue-400 font-mono font-bold leading-none">{stats.statusesViewed}</p>
                  <p className="text-[8px] text-slate-400 uppercase mt-0.5">Views</p>
                </div>
                <div className="bg-[#111b21] p-1.5 rounded-xl border border-[#202c33]" title="Reactions Sent">
                  <p className="text-[11px] text-amber-400 font-mono font-bold leading-none">{stats.reactionsSent}</p>
                  <p className="text-[8px] text-slate-400 uppercase mt-0.5">Reacts</p>
                </div>
                <div className="bg-[#111b21] p-1.5 rounded-xl border border-[#202c33]" title="Group Messages">
                  <p className="text-[11px] text-emerald-400 font-mono font-bold leading-none">{stats.campaignMessagesSent}</p>
                  <p className="text-[8px] text-slate-400 uppercase mt-0.5">Groups</p>
                </div>
                <div className="bg-[#111b21] p-1.5 rounded-xl border border-[#202c33]" title="Stories Broadcasted">
                  <p className="text-[11px] text-purple-400 font-mono font-bold leading-none">{stats.broadcastsSent}</p>
                  <p className="text-[8px] text-slate-400 uppercase mt-0.5">Stories</p>
                </div>
              </div>

              {/* Sidebar Account Switcher */}
              {statusData?.accounts && statusData.accounts.length > 0 && onSelectAccount && onAddAccount && (
                <div className="pt-1 flex justify-center">
                  <AccountSwitcher
                    accounts={statusData.accounts}
                    activeAccountId={statusData.activeAccountId || statusData.accounts[0]?.id || 'primary'}
                    onSelectAccount={onSelectAccount}
                    onAddAccount={onAddAccount}
                    onDisconnectAccount={onDisconnectAccount || (() => {})}
                    onRemoveAccount={onRemoveAccount || (() => {})}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Items (Scrollable) */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Navigation Menu</span>
            <span className="text-[9px] text-emerald-400 font-normal">Fast Access</span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left text-xs font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-950/40 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-[#1f2c34]/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Colourful Gradient Icon Container */}
                  <div className={`p-2 rounded-xl bg-gradient-to-tr ${item.iconGradient} shadow-sm transition-transform group-hover:scale-105 shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate leading-tight font-semibold text-slate-100 group-hover:text-white">{item.label}</p>
                    <p className="text-[10px] text-slate-400 truncate font-normal leading-tight mt-0.5">{item.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {!currentUser && item.id !== 'landing' && item.id !== 'deploy' && (
                    <span className="p-1 rounded-md bg-[#0b141a] text-slate-400 border border-[#202c33]" title="Sign in required">
                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                    </span>
                  )}
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase border ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom Sidebar Action Center */}
        <div className="p-3 border-t border-[#202c33] bg-[#0b141a]/60 space-y-2">
          {/* PWA Install Button — Only shown if not already installed */}
          {onInstallClick && !isInstalled && (
            <button
              onClick={() => {
                onInstallClick();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-emerald-950/40"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Install Mobile App</span>
              </div>
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Theme Toggle Button (Light / Dark Mode) */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#111b21] hover:bg-[#1f2c34] active:scale-95 border border-[#202c33] text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
                <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">{theme}</span>
            </button>
          )}

          {/* Disconnect WhatsApp Button */}
          {isConnected && (
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? 'Disconnecting...' : 'Disconnect Line'}</span>
            </button>
          )}

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1">
            <span>24/7 Cloud Automation</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active & Protected
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
