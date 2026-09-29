import React from 'react';
import { 
  Menu, 
  Smartphone, 
  RefreshCw, 
  Download,
  Link2,
  KeyRound,
  Users,
  Rocket,
  Send,
  Eye,
  Terminal,
  CloudUpload,
  Sparkles,
  Globe2,
  LogIn,
  Crown,
  Sun,
  Moon
} from 'lucide-react';
import { User } from 'firebase/auth';
import { EngineStatusResponse } from '../types';
import { NavTabId } from './Sidebar';
import { isUserAdmin } from '../lib/firebase';
import { AccountSwitcher } from './AccountSwitcher';

interface HeaderProps {
  statusData: EngineStatusResponse | null;
  activeTab: NavTabId;
  currentUser: User | null;
  onGoogleLogin: () => void;
  onOpenSidebar: () => void;
  onRefresh: () => void;
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

const TAB_TITLES: Record<NavTabId, { title: string; subtitle: string; icon: any }> = {
  landing: { title: 'WhatsApp Promoters & Ad Network', subtitle: 'Broadcast viral ads across thousands of pooled groups', icon: Sparkles },
  'ad-network': { title: 'Community Ad Network Pool', subtitle: 'Automated campaign distribution & group pool', icon: Globe2 },
  connect: { title: 'Connect Account', subtitle: 'Pair via QR code or 8-digit code', icon: Link2 },
  'api-keys': { title: 'Developer API & Keys', subtitle: 'Connect external apps, websites & webhooks', icon: KeyRound },
  groups: { title: 'Group Manager', subtitle: 'Manage joined WhatsApp groups, tagging & VCF', icon: Users },
  campaign: { title: 'Campaign Engine', subtitle: 'Automated multi-group & recurring message dispatch', icon: Rocket },
  broadcast: { title: 'Story Broadcast', subtitle: 'Publish status updates to all contacts', icon: Send },
  visibility: { title: 'Story Viewer & Reacts', subtitle: 'Auto-view contact stories & send reactions', icon: Eye },
  logs: { title: 'Audit Logs & Telemetry', subtitle: 'Real-time WebSocket & event stream', icon: Terminal },
  deploy: { title: 'Render Deployment', subtitle: 'Deploy 24/7 cloud instance with free tier', icon: CloudUpload },
  admin: { title: 'Admin Management Portal', subtitle: 'User management, lines, campaign oversight & platform toggles', icon: Crown },
};

export const Header: React.FC<HeaderProps> = ({ 
  statusData, 
  activeTab,
  currentUser,
  onGoogleLogin,
  onOpenSidebar,
  onRefresh,
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
  const isConnected = statusData?.status === 'connected';
  const isConnecting = statusData?.status === 'connecting';
  const currentTab = TAB_TITLES[activeTab] || TAB_TITLES.landing;
  const CurrentIcon = currentTab.icon;
  const isAdmin = isUserAdmin(currentUser);

  return (
    <header className="border-b border-[#202c33] bg-[#111b21]/95 backdrop-blur-md sticky top-0 z-30 px-2 sm:px-6 py-2 sm:py-2.5 w-full max-w-full">
      <div className="flex items-center justify-between gap-1.5 sm:gap-4 max-w-7xl mx-auto w-full min-w-0">
        
        {/* Left: Mobile-Enhanced Hamburger Button + Active Tab Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={onOpenSidebar}
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] sm:min-w-[40px] rounded-xl bg-[#0b141a] hover:bg-[#1f2c34] active:scale-95 text-slate-200 hover:text-white border border-[#202c33] transition-all cursor-pointer relative shadow-sm shrink-0"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5 text-emerald-400" />
            {isConnected && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0b141a]" />
            )}
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 items-center justify-center text-emerald-400 hidden xs:flex shrink-0">
              <CurrentIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm md:text-base font-bold text-white tracking-tight leading-tight flex items-center gap-1.5 min-w-0">
                <span className="truncate">{currentTab.title}</span>
                {isAdmin && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase shrink-0 hidden sm:inline-flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5 text-amber-400" /> Admin
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-slate-400 hidden md:block truncate">
                {currentTab.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions, Account Switcher, Auth & Refresh (Zero-Overlap Responsive Cluster) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* Multi-Account Switcher (Header Pill) */}
          {statusData?.accounts && statusData.accounts.length > 0 && onSelectAccount && onAddAccount && (
            <div className="shrink-0">
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

          {/* Google Auth Status / Login */}
          {!currentUser ? (
            <button
              onClick={onGoogleLogin}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-white text-xs font-bold transition-all shadow cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-1.5 sm:px-2.5 py-1 rounded-xl bg-[#0b141a] border border-[#202c33] shrink-0" title={currentUser.email || ''}>
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full border border-emerald-500/30 shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                  {currentUser.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-xs text-white font-medium hidden md:inline truncate max-w-[80px]">
                {currentUser.displayName || currentUser.email?.split('@')[0]}
              </span>
            </div>
          )}

          {/* PWA Install Button — ONLY SHOWN IF NOT ALREADY INSTALLED */}
          {onInstallClick && !isInstalled && (
            <button
              onClick={onInstallClick}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer shadow-sm shrink-0"
              title="Install WhatsApp Engine Mobile App (PWA)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Install App</span>
              <Download className="w-3 h-3 md:hidden text-emerald-400" />
            </button>
          )}

          {/* Single Connection Status Pill (if no multi-account switcher is shown) */}
          {(!statusData?.accounts || statusData.accounts.length === 0) && (
            <div 
              onClick={onOpenSidebar}
              className="cursor-pointer shrink-0"
              title="Click to view connection & stats"
            >
              {isConnected ? (
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  <span className="hidden sm:inline">Online</span>
                  <span className="font-mono text-slate-200 bg-emerald-950/70 px-1 py-0.2 rounded text-[10px]">
                    +{statusData?.phone ? statusData.phone.slice(-4) : 'OK'}
                  </span>
                </div>
              ) : isConnecting ? (
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0"></span>
                  <span className="text-[10px] sm:text-xs">Pairing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                  <span className="text-[10px] sm:text-xs">Offline</span>
                </div>
              )}
            </div>
          )}

          {/* Theme Toggle Button (Light / Dark Mode) */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-[#0b141a] hover:bg-[#1f2c34] active:scale-95 text-slate-300 hover:text-amber-400 border border-[#202c33] transition-colors cursor-pointer shrink-0"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          )}

          {/* Quick Refresh Status Button */}
          <button
            onClick={onRefresh}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-[#0b141a] hover:bg-[#1f2c34] active:scale-95 text-slate-400 hover:text-white border border-[#202c33] transition-colors cursor-pointer shrink-0"
            title="Refresh Engine State"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>
    </header>
  );
};
