import React, { useState, useEffect, useCallback } from 'react';
import { 
  Crown, 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  Settings2, 
  Smartphone, 
  Rocket, 
  Terminal, 
  CloudUpload, 
  Check, 
  X, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Filter, 
  Send, 
  LogOut, 
  KeyRound, 
  Eye, 
  Play, 
  Pause, 
  Trash2, 
  ExternalLink,
  Radio,
  Clock,
  Sparkles,
  ChevronRight,
  Database
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  EngineStatusResponse, 
  ConnectedAccount, 
  PlatformSettings, 
  AdminUserItem, 
  ScheduledCampaign, 
  CampaignProgress, 
  GroupItem, 
  ContactItem 
} from '../types';

interface AdminPortalProps {
  currentUser: User | null;
  statusData: EngineStatusResponse | null;
  onRefreshStatus: () => void;
  onOpenRenderDeploy?: () => void;
}

type AdminSubTab = 'overview' | 'users' | 'accounts' | 'campaigns' | 'groups_contacts' | 'settings';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser,
  statusData,
  onRefreshStatus,
  onOpenRenderDeploy
}) => {
  const [subTab, setSubTab] = useState<AdminSubTab>('overview');
  const [settings, setSettings] = useState<PlatformSettings>(() => statusData?.settings || {
    showRenderDeployToUsers: false,
    showAuditLogsToUsers: false,
    showApiKeysToUsers: false,
    allowPublicRegistration: true,
    maintenanceMode: false,
    antiDisconnectKeepAlive: true,
    supportContact: 'support@whatsapppromoters.net'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);

  // Users State
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Accounts State
  const [adminAccounts, setAdminAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Campaigns State
  const [adminCampaigns, setAdminCampaigns] = useState<{
    scheduledCampaigns: ScheduledCampaign[];
    currentCampaign?: CampaignProgress;
  }>({ scheduledCampaigns: [] });
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Inspector & Direct Sender State
  const [inspectAccountId, setInspectAccountId] = useState<string>('');
  const [inspectGroups, setInspectGroups] = useState<GroupItem[]>([]);
  const [inspectContacts, setInspectContacts] = useState<ContactItem[]>([]);
  const [loadingInspector, setLoadingInspector] = useState(false);
  const [directRecipient, setDirectRecipient] = useState('');
  const [directMessageText, setDirectMessageText] = useState('');
  const [sendingDirect, setSendingDirect] = useState(false);
  const [directSendResult, setDirectSendResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Load platform settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettings(data.settings);
      }
    } catch (e) {
      console.warn('Fetch admin settings note:', e);
    }
  }, []);

  // Load users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Error fetching admin users:', e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Load accounts
  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch('/api/admin/accounts');
      if (res.ok) {
        const data = await res.json();
        setAdminAccounts(data.accounts || []);
        if (data.accounts?.length > 0 && !inspectAccountId) {
          setInspectAccountId(data.accounts[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching admin accounts:', e);
    } finally {
      setLoadingAccounts(false);
    }
  }, [inspectAccountId]);

  // Load campaigns
  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch('/api/admin/campaigns');
      if (res.ok) {
        const data = await res.json();
        setAdminCampaigns({
          scheduledCampaigns: data.scheduledCampaigns || [],
          currentCampaign: data.currentCampaign
        });
      }
    } catch (e) {
      console.error('Error fetching admin campaigns:', e);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  // Inspect specific account groups and contacts
  const fetchInspectorData = useCallback(async (accId: string) => {
    if (!accId) return;
    setLoadingInspector(true);
    try {
      const [grpRes, contRes] = await Promise.all([
        fetch(`/api/admin/accounts/${accId}/groups`),
        fetch(`/api/admin/accounts/${accId}/contacts`)
      ]);
      if (grpRes.ok) {
        const gData = await grpRes.json();
        setInspectGroups(gData.groups || []);
      }
      if (contRes.ok) {
        const cData = await contRes.json();
        setInspectContacts(cData.contacts || []);
      }
    } catch (e) {
      console.warn('Error fetching account groups/contacts:', e);
    } finally {
      setLoadingInspector(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchUsers();
    fetchAccounts();
    fetchCampaigns();
  }, [fetchSettings, fetchUsers, fetchAccounts, fetchCampaigns]);

  useEffect(() => {
    if (inspectAccountId) {
      fetchInspectorData(inspectAccountId);
    }
  }, [inspectAccountId, fetchInspectorData]);

  // Save Settings
  const handleSaveSettings = async (newSettings: PlatformSettings) => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setSettingsSavedNotice(true);
        setTimeout(() => setSettingsSavedNotice(false), 3000);
        onRefreshStatus();
      }
    } catch (e) {
      console.error('Save settings error:', e);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Toggle user ban
  const handleToggleBan = async (user: AdminUserItem, shouldBan: boolean) => {
    setActionLoading(user.uid || user.email);
    try {
      const res = await fetch('/api/admin/users/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          ban: shouldBan,
          reason: banReasonInput || (shouldBan ? 'Suspended by admin for terms compliance' : undefined)
        })
      });
      if (res.ok) {
        setBanReasonInput('');
        await fetchUsers();
      }
    } catch (e) {
      console.error('Ban action error:', e);
    } finally {
      setActionLoading(null);
    }
  };

  // Disconnect an account
  const handleDisconnectAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to forcibly disconnect this WhatsApp line from the cloud server?')) return;
    setActionLoading(accountId);
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/disconnect`, { method: 'POST' });
      if (res.ok) {
        await fetchAccounts();
        onRefreshStatus();
      }
    } catch (e) {
      console.error('Disconnect account error:', e);
    } finally {
      setActionLoading(null);
    }
  };

  // Campaign action
  const handleCampaignAction = async (campaignId: string, action: 'pause' | 'resume' | 'delete') => {
    setActionLoading(campaignId);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        await fetchCampaigns();
      }
    } catch (e) {
      console.error('Campaign action error:', e);
    } finally {
      setActionLoading(null);
    }
  };

  // Direct Send from user line
  const handleSendDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectAccountId || !directRecipient.trim() || !directMessageText.trim()) return;
    setSendingDirect(true);
    setDirectSendResult(null);
    try {
      const res = await fetch(`/api/admin/accounts/${inspectAccountId}/send-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: directRecipient.trim(),
          message: directMessageText.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDirectSendResult({ success: true, msg: `Message sent via selected line (ID: ${data.messageId || 'OK'})` });
        setDirectMessageText('');
      } else {
        setDirectSendResult({ success: false, msg: data.error || 'Failed to dispatch message.' });
      }
    } catch (err: any) {
      setDirectSendResult({ success: false, msg: err.message || 'Network error' });
    } finally {
      setSendingDirect(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true;
    const term = userSearch.toLowerCase();
    return (
      u.email?.toLowerCase().includes(term) ||
      u.displayName?.toLowerCase().includes(term) ||
      u.uid?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner & Title */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#111b21] via-[#1a2730] to-[#0b141a] border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-950/40">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Admin Management Portal</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Full platform governance: user control, account isolation, campaign oversight & visibility toggles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchSettings();
                fetchUsers();
                fetchAccounts();
                fetchCampaigns();
                onRefreshStatus();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b141a] hover:bg-[#1f2c34] active:scale-95 text-slate-200 text-xs font-semibold border border-[#202c33] transition-all cursor-pointer shadow"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Refresh All</span>
            </button>

            {onOpenRenderDeploy && (
              <button
                onClick={onOpenRenderDeploy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-bold transition-all shadow cursor-pointer"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>Render Deployment</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-5 border-t border-[#202c33]/60 mt-5 scrollbar-none">
          {[
            { id: 'overview' as AdminSubTab, label: 'Platform Health & Engine', icon: Radio },
            { id: 'users' as AdminSubTab, label: `User Management (${users.length})`, icon: Users },
            { id: 'accounts' as AdminSubTab, label: `WhatsApp Lines (${adminAccounts.length})`, icon: Smartphone },
            { id: 'campaigns' as AdminSubTab, label: `Campaigns (${adminCampaigns.scheduledCampaigns.length})`, icon: Rocket },
            { id: 'groups_contacts' as AdminSubTab, label: 'Groups & Contacts Inspector', icon: Database },
            { id: 'settings' as AdminSubTab, label: 'Feature Flags & Visibility', icon: Settings2 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-[#0b141a]/60 text-slate-400 hover:text-slate-200 hover:bg-[#111b21] border border-[#202c33]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBTAB 1: OVERVIEW & ENGINE DIAGNOSTICS */}
      {subTab === 'overview' && (
        <div className="space-y-5">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Registered Promoters</span>
              <p className="text-2xl font-black text-white mt-1">{users.length}</p>
              <p className="text-[10px] text-emerald-400 mt-0.5">● {users.filter(u => !u.isBanned).length} in good standing</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active WhatsApp Lines</span>
              <p className="text-2xl font-black text-white mt-1">{adminAccounts.length}</p>
              <p className="text-[10px] text-emerald-400 mt-0.5">
                ● {adminAccounts.filter(a => a.status === 'connected').length} connected & ready
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Campaigns</span>
              <p className="text-2xl font-black text-white mt-1">{adminCampaigns.scheduledCampaigns.length}</p>
              <p className="text-[10px] text-emerald-400 mt-0.5">
                ● {adminCampaigns.scheduledCampaigns.filter(c => c.enabled).length} scheduled / auto-running
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">24/7 Cloud Anti-Disconnect</span>
              <p className="text-lg font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Active
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">15s ping • Multi-Device safe</p>
            </div>
          </div>

          {/* Technical Engine State (Centralized here away from regular users) */}
          <div className="p-5 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-4">
            <div className="flex items-center justify-between border-b border-[#202c33] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Central Engine Diagnostics & Architecture</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-[#0b141a] px-2 py-0.5 rounded border border-[#202c33]">
                Node.js Multi-Tenant Baileys
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Cloud Server Status</span>
                <p className="text-white font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Running on Port 3000 (Express + Vite)
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Session Persistence</span>
                <p className="text-white font-medium font-mono text-[11px] truncate">
                  ./session_auth (multi-device creds retained)
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0b141a] border border-[#202c33] space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Firestore Sync</span>
                <p className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Connected (`campaigns`, `adverts`, `users`)
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs text-slate-300 space-y-1 leading-relaxed">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Administrator Governance Note:
              </p>
              <p className="text-[11px] text-slate-400">
                All raw telemetry, websocket status codes, and terminal traces are restricted to this Admin Portal. Regular users enjoy a streamlined, friendly experience without intimidating technical jargon.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: USER MANAGEMENT */}
      {subTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search user by email, name or ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#111b21] border border-[#202c33] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                Showing <strong className="text-white">{filteredUsers.length}</strong> user(s)
              </span>
              <button
                onClick={fetchUsers}
                disabled={loadingUsers}
                className="p-2 rounded-xl bg-[#111b21] hover:bg-[#1f2c34] text-slate-300 border border-[#202c33] cursor-pointer"
                title="Refresh user list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#202c33] bg-[#111b21]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b141a] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#202c33]">
                <tr>
                  <th className="py-3 px-4">User / Promoter</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Connected Lines</th>
                  <th className="py-3 px-4">Campaigns</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202c33]/60 text-slate-300">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No registered users found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const isBanned = !!u.isBanned;
                    const isSuperAdmin = u.isAdmin;
                    return (
                      <tr key={u.uid || u.email} className="hover:bg-[#1f2c34]/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {u.photoURL ? (
                              <img src={u.photoURL} alt="Avatar" className="w-7 h-7 rounded-full border border-[#202c33]" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                                {u.email?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-white leading-tight">{u.displayName || 'Promoter'}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {isSuperAdmin ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase inline-flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5 text-amber-400" /> Admin
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold capitalize">
                              {u.role || 'promoter'}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-200">
                          {u.connectedAccountsCount || 0} line(s)
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-200">
                          {u.campaignsCount || 0} campaign(s)
                        </td>

                        <td className="py-3 px-4">
                          {isBanned ? (
                            <div className="space-y-0.5">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold uppercase inline-flex items-center gap-1">
                                <ShieldAlert className="w-2.5 h-2.5" /> Suspended
                              </span>
                              {u.bannedReason && (
                                <p className="text-[9px] text-rose-400 truncate max-w-[140px]">{u.bannedReason}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase inline-flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> Active
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {!isSuperAdmin && (
                            <div className="flex items-center justify-end gap-2">
                              {isBanned ? (
                                <button
                                  onClick={() => handleToggleBan(u, false)}
                                  disabled={actionLoading === (u.uid || u.email)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  Unban User
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    const reason = prompt(`Enter reason to suspend ${u.email}:`, 'Platform terms and automated spam policy violation.');
                                    if (reason !== null) {
                                      setBanReasonInput(reason);
                                      handleToggleBan(u, true);
                                    }
                                  }}
                                  disabled={actionLoading === (u.uid || u.email)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  Suspend User
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: WHATSAPP LINES / ACCOUNTS ACROSS USERS */}
      {subTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">All Multi-WhatsApp Lines in Cloud</h3>
              <p className="text-xs text-slate-400">Admin can view connection health and remotely disconnect any user line.</p>
            </div>
            <button
              onClick={fetchAccounts}
              disabled={loadingAccounts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111b21] hover:bg-[#1f2c34] text-slate-200 border border-[#202c33] text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAccounts ? 'animate-spin' : ''}`} />
              <span>Refresh Lines</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {adminAccounts.map((acc: any) => {
              const isConnected = acc.status === 'connected';
              const isConnecting = acc.status === 'connecting';

              return (
                <div key={acc.id} className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0b141a] border border-[#202c33] flex items-center justify-center text-slate-300 font-mono font-bold text-sm">
                        {acc.phone ? acc.phone.slice(-2) : '#'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{acc.label}</h4>
                          {acc.isDefault && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-emerald-400">
                          {acc.phone ? `+${acc.phone}` : 'Unpaired'}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                      isConnected
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : isConnecting
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}>
                      {acc.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#0b141a] p-2.5 rounded-xl border border-[#202c33]">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Assigned User / Owner</span>
                      <span className="text-slate-300 font-mono truncate block">
                        {acc.userEmail || acc.userId || 'System Instance'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Last Connected</span>
                      <span className="text-slate-300 font-mono truncate block">
                        {acc.lastConnectedAt ? new Date(acc.lastConnectedAt).toLocaleTimeString() : 'Never'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => {
                        setInspectAccountId(acc.id);
                        setSubTab('groups_contacts');
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect Groups & Contacts</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {isConnected && (
                      <button
                        onClick={() => handleDisconnectAccount(acc.id)}
                        disabled={actionLoading === acc.id}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Disconnect Line
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 4: CAMPAIGN OVERSIGHT */}
      {subTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Active & Scheduled User Campaigns</h3>
              <p className="text-xs text-slate-400">Monitor all automated recurring dispatches across all users.</p>
            </div>
            <button
              onClick={fetchCampaigns}
              disabled={loadingCampaigns}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111b21] hover:bg-[#1f2c34] text-slate-200 border border-[#202c33] text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCampaigns ? 'animate-spin' : ''}`} />
              <span>Refresh Campaigns</span>
            </button>
          </div>

          {adminCampaigns.scheduledCampaigns.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#111b21] border border-[#202c33] text-slate-500 text-xs">
              No scheduled or recurring campaigns currently registered on the server.
            </div>
          ) : (
            <div className="space-y-3">
              {adminCampaigns.scheduledCampaigns.map(sc => {
                const intervalMinutes = sc.repeatIntervalMinutes || (sc.repeatIntervalHours ? sc.repeatIntervalHours * 60 : 120);
                const intervalDisplay = intervalMinutes < 60 ? `${intervalMinutes} min` : `${(intervalMinutes / 60).toFixed(1).replace('.0', '')} hr`;

                return (
                  <div key={sc.id} className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{sc.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                            sc.enabled
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {sc.enabled ? 'Active / Recurring' : 'Paused'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          Owner: {sc.userEmail || sc.userId || 'Anonymous'} • Repeat: every {intervalDisplay}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {sc.enabled ? (
                          <button
                            onClick={() => handleCampaignAction(sc.id, 'pause')}
                            disabled={actionLoading === sc.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer"
                          >
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCampaignAction(sc.id, 'resume')}
                            disabled={actionLoading === sc.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            <span>Resume</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (confirm(`Delete campaign "${sc.name}"?`)) {
                              handleCampaignAction(sc.id, 'delete');
                            }
                          }}
                          disabled={actionLoading === sc.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs text-slate-300 line-clamp-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">Template Message Preview:</span>
                      {sc.templateText}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>Targets: {sc.targetGroupJids?.length || 0} group(s)</span>
                      <span>•</span>
                      <span>Next Run: {sc.nextRunAt ? new Date(sc.nextRunAt).toLocaleTimeString() : 'N/A'}</span>
                      <span>•</span>
                      <span>Runs Finished: {sc.currentIteration || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 5: GROUPS & CONTACTS INSPECTOR & DIRECT SENDER */}
      {subTab === 'groups_contacts' && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Inspect User Groups & Direct Line Dispatch</h3>
                <p className="text-xs text-slate-400">View WhatsApp groups and contacts for any connected account, or send direct announcements.</p>
              </div>

              {/* Select Account Picker */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-300 font-semibold">Select Line:</label>
                <select
                  value={inspectAccountId}
                  onChange={e => setInspectAccountId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#0b141a] border border-[#202c33] text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
                >
                  {adminAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({a.phone ? `+${a.phone}` : 'Unpaired'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Direct Message Tool */}
            <form onSubmit={handleSendDirect} className="pt-3 border-t border-[#202c33]/60 space-y-3">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3 h-3 text-amber-400" />
                <span>Admin Direct Broadcast Tool (Dispatch Via Selected Line)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Destination (Phone Number or Group JID)
                  </label>
                  <input
                    type="text"
                    required
                    value={directRecipient}
                    onChange={e => setDirectRecipient(e.target.value)}
                    placeholder="e.g. 2347043537401 or 120363024849202@g.us"
                    className="w-full px-3 py-2 rounded-xl bg-[#0b141a] border border-[#202c33] text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Message Content (Supports Spintax {`{hi|hello}`})
                  </label>
                  <input
                    type="text"
                    required
                    value={directMessageText}
                    onChange={e => setDirectMessageText(e.target.value)}
                    placeholder="Official Announcement: {Hello|Greetings}..."
                    className="w-full px-3 py-2 rounded-xl bg-[#0b141a] border border-[#202c33] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {directSendResult ? (
                  <span className={`text-xs font-semibold flex items-center gap-1 ${directSendResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {directSendResult.success ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {directSendResult.msg}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">Sends directly through the active Baileys socket.</span>
                )}

                <button
                  type="submit"
                  disabled={sendingDirect}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingDirect ? 'Dispatching...' : 'Send Message'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Joined Groups List */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#202c33] space-y-3">
            <div className="flex items-center justify-between border-b border-[#202c33] pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Joined WhatsApp Groups ({inspectGroups.length})</span>
              </span>
              <button
                onClick={() => fetchInspectorData(inspectAccountId)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingInspector ? 'animate-spin' : ''}`} />
                <span>Reload</span>
              </button>
            </div>

            {inspectGroups.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                {loadingInspector ? 'Loading groups from WhatsApp line...' : 'No groups found or account is not currently connected.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {inspectGroups.map(g => (
                  <div key={g.id} className="p-2.5 rounded-xl bg-[#0b141a] border border-[#202c33] space-y-1">
                    <p className="text-xs font-bold text-white truncate">{g.subject}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{g.size} members</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDirectRecipient(g.id);
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                        className="text-amber-400 hover:underline cursor-pointer"
                      >
                        Target
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 6: FEATURE FLAGS & VISIBILITY TOGGLES */}
      {subTab === 'settings' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-[#202c33] space-y-6">
          <div className="border-b border-[#202c33] pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Public Visibility & Feature Switches</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Control which technical or administrative tabs are visible to standard users.
              </p>
            </div>

            {settingsSavedNotice && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Settings Saved & Applied</span>
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Toggle 1: Render Deployment Tab */}
            <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] flex items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <CloudUpload className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">Render Deployment Tab Visible to Public Users</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When turned OFF (default), the Render cloud deployment guide is hidden from normal users and only accessible by you in the Admin Portal.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = { ...settings, showRenderDeployToUsers: !settings.showRenderDeployToUsers };
                  setSettings(updated);
                  handleSaveSettings(updated);
                }}
                disabled={isSavingSettings}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showRenderDeployToUsers ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.showRenderDeployToUsers ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Audit Logs Tab */}
            <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] flex items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">Live Audit Logs & WebSocket Telemetry Visible to Users</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When turned OFF (default), raw server event logs and terminal traces are kept strictly in the Admin Portal to avoid technical jargon for normal users.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = { ...settings, showAuditLogsToUsers: !settings.showAuditLogsToUsers };
                  setSettings(updated);
                  handleSaveSettings(updated);
                }}
                disabled={isSavingSettings}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showAuditLogsToUsers ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.showAuditLogsToUsers ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3: Developer API Keys Tab */}
            <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] flex items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">Developer API Keys Tab Visible to Users</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Controls whether normal users see the REST API and Webhook keys tab in their left sidebar navigation.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = { ...settings, showApiKeysToUsers: !settings.showApiKeysToUsers };
                  setSettings(updated);
                  handleSaveSettings(updated);
                }}
                disabled={isSavingSettings}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showApiKeysToUsers ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.showApiKeysToUsers ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 4: Public User Registration */}
            <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] flex items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">Allow New Promoter Registrations</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Allow new users to sign in and register accounts on the platform.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = { ...settings, allowPublicRegistration: !settings.allowPublicRegistration };
                  setSettings(updated);
                  handleSaveSettings(updated);
                }}
                disabled={isSavingSettings}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.allowPublicRegistration ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.allowPublicRegistration ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Support Contact Email */}
            <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] space-y-2">
              <label className="block text-xs font-bold text-white">Platform Support & Dispute Contact</label>
              <div className="flex items-center gap-3">
                <input
                  type="email"
                  value={settings.supportContact || ''}
                  onChange={e => setSettings({ ...settings, supportContact: e.target.value })}
                  placeholder="support@whatsapppromoters.net"
                  className="flex-1 px-3 py-2 rounded-xl bg-[#111b21] border border-[#202c33] text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleSaveSettings(settings)}
                  disabled={isSavingSettings}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
