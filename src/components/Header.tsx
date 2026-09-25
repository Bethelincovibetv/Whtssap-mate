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
  Bot,
  Terminal,
  CloudUpload,
  Sparkles,
  Globe2,
  LogIn,
  Crown
} from 'lucide-react';
import { User } from 'firebase/auth';
import { EngineStatusResponse } from '../types';
import { NavTabId } from './Sidebar';
import { isUserAdmin } from '../lib/firebase';

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
}

const TAB_TITLES: Record<NavTabId, { title: string; subtitle: string; icon: any }> = {
  landing: { title: 'WhatsApp Promoters & Ad Network', subtitle: 'Broadcast viral ads across thousands of pooled groups', icon: Sparkles },
  'ad-network': { title: 'Community Ad Network Pool', subtitle: 'Automated campaign distribution & group pool', icon: Globe2 },
  connect: { title: 'Connect Account', subtitle: 'Pair via QR code or 8-digit code', icon: Link2 },
  'api-keys': { title: 'Developer API & Keys', subtitle: 'Connect external apps, websites & webhooks', icon: KeyRound },
  groups: { title: 'Group Manager', subtitle: 'Manage joined WhatsApp groups, tagging & VCF', icon: Users },
  campaign: { title: 'Campaign Engine', subtitle: 'Automated multi-group message dispatch', icon: Rocket },
  broadcast: { title: 'Story Broadcast', subtitle: 'Publish status updates to all contacts', icon: Send },
  visibility: { title: 'Story Viewer & Reacts', subtitle: 'Auto-view contact stories & send reactions', icon: Eye },
  ai: { title: 'AI Auto-Responder', subtitle: 'Powered by Google Gemini 2.5 Flash', icon: Bot },
  logs: { title: 'Audit Logs & Telemetry', subtitle: 'Real-time WebSocket & event stream', icon: Terminal },
  deploy: { title: 'Render Deployment', subtitle: 'Deploy 24/7 cloud instance with free tier', icon: CloudUpload },
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
  isInstalled
}) => {
  const isConnected = statusData?.status === 'connected';
  const isConnecting = statusData?.status === 'connecting';
  const currentTab = TAB_TITLES[activeTab] || TAB_TITLES.landing;
  const CurrentIcon = currentTab.icon;
  const isAdmin = isUserAdmin(currentUser);

  return (
    <header className="border-b border-[#202c33] bg-[#111b21]/90 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        
        {/* Left: Sidebar Hamburger Button + Active Tab Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#0b141a] hover:bg-[#1f2c34] text-slate-300 hover:text-white border border-[#202c33] transition-all cursor-pointer relative shadow-sm"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5 text-emerald-400" />
            {isConnected && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0b141a]" />
            )}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hidden xs:flex">
              <CurrentIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight flex items-center gap-2">
                <span>{currentTab.title}</span>
                {isAdmin && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Admin
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-xs md:max-w-md">
                {currentTab.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right: User Auth, PWA Install, Connection Status, Refresh */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Google Auth Status / Login */}
          {!currentUser ? (
            <button
              onClick={onGoogleLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition-all shadow cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0b141a] border border-[#202c33]">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full border border-emerald-500/30" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {currentUser.email?.[0].toUpperCase()}
                </div>
              )}
              <span className="text-xs text-white font-medium hidden md:inline truncate max-w-[100px]">
                {currentUser.displayName || currentUser.email?.split('@')[0]}
              </span>
            </div>
          )}

          {/* PWA Install Button */}
          {onInstallClick && (
            <button
              onClick={onInstallClick}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                isInstalled 
                  ? 'bg-slate-800/80 text-slate-400 border border-slate-700/50' 
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30'
              }`}
              title={isInstalled ? 'App already installed on device' : 'Install WhatsApp Engine Mobile App (PWA)'}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isInstalled ? 'Installed' : 'Install App'}</span>
              {!isInstalled && <Download className="w-3 h-3 md:hidden text-emerald-400" />}
            </button>
          )}

          {/* Connection Status Pill */}
          <div 
            onClick={onOpenSidebar}
            className="cursor-pointer"
            title="Click to view connection & stats"
          >
            {isConnected ? (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm shadow-emerald-950/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="hidden sm:inline">Connected</span>
                <span className="font-mono text-slate-200 bg-emerald-950/70 px-1.5 py-0.2 rounded text-[11px]">
                  +{statusData?.phone ? statusData.phone.slice(-6) : 'OK'}
                </span>
              </div>
            ) : isConnecting ? (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span className="text-[11px] sm:text-xs">Pairing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span className="text-[11px] sm:text-xs">Offline</span>
              </div>
            )}
          </div>

          {/* Quick Refresh Status Button */}
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-[#0b141a] hover:bg-[#1f2c34] text-slate-400 hover:text-white border border-[#202c33] transition-colors cursor-pointer"
            title="Refresh Engine State"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>
    </header>
  );
};
